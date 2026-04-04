import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Linking,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleMapView } from "@/components/google-map-view";
import { NativeMapView } from "@/components/native-map-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT } from "@/constants/brand";
import {
  TECH_STATUS_LABELS,
  type Technician,
} from "@/lib/nvc-types";
import { Image, ActivityIndicator, RefreshControl } from "react-native";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const STATUS_SORT: Record<string, number> = { busy: 0, en_route: 1, online: 2, on_break: 3, offline: 4 };

const STATUS_COLOR: Record<string, string> = {
  busy:     "#F59E0B",
  en_route: "#8B5CF6",
  online:   "#22C55E",
  on_break: "#3B82F6",
  offline:  "#9CA3AF",
};

const STATUS_FILTERS = ["all", "busy", "en_route", "online", "on_break", "offline"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_LABELS: Record<string, string> = {
  all: "All", busy: "On Job", en_route: "En Route",
  online: "Available", on_break: "On Break", offline: "Offline",
};

// ─── Grid Card Component ──────────────────────────────────────────────────────

function TechGridCard({
  tech,
  onPress,
  onCall,
  onMessage,
  cardWidth,
}: {
  tech: Technician;
  onPress: () => void;
  onCall: () => void;
  onMessage: () => void;
  cardWidth: number;
}) {
  const status = tech.status as string;
  const color = STATUS_COLOR[status] ?? "#9CA3AF";
  const label = TECH_STATUS_LABELS[status] ?? status;
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const primarySkill = tech.skills[0] ?? "";
  const secondarySkill = tech.skills[1] ?? "";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        { width: cardWidth, opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.97 }] : [] },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Top accent bar */}
      <View style={[styles.gridCardAccent, { backgroundColor: color }] as ViewStyle[]} />

      {/* Avatar + Status dot */}
      <View style={styles.gridAvatarWrap}>
        <View style={[styles.gridAvatar, { backgroundColor: color + "22" }] as ViewStyle[]}>
          <Text style={[styles.gridAvatarText, { color }] as TextStyle[]}>{initials}</Text>
        </View>
        <View style={[styles.gridStatusDot, { backgroundColor: color, borderColor: WIDGET_SURFACE_LIGHT }] as ViewStyle[]} />
      </View>

      {/* Name */}
      <Text style={styles.gridName} numberOfLines={1}>{tech.name}</Text>

      {/* Status pill */}
      <View style={[styles.gridStatusPill, { backgroundColor: color + "18", borderColor: color + "40" }] as ViewStyle[]}>
        <View style={[styles.gridPillDot, { backgroundColor: color }] as ViewStyle[]} />
        <Text style={[styles.gridStatusText, { color }] as TextStyle[]} numberOfLines={1}>{label}</Text>
      </View>

      {/* Skills chips */}
      {(primarySkill || secondarySkill) ? (
        <View style={styles.gridSkillsRow}>
          {primarySkill ? (
            <View style={styles.gridSkillChip}>
              <Text style={styles.gridSkillText} numberOfLines={1}>{primarySkill}</Text>
            </View>
          ) : null}
          {secondarySkill ? (
            <View style={styles.gridSkillChip}>
              <Text style={styles.gridSkillText} numberOfLines={1}>{secondarySkill}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Active job address */}
      {tech.activeTaskAddress ? (
        <Text style={styles.gridAddress} numberOfLines={2}>{tech.activeTaskAddress}</Text>
      ) : (
        <Text style={styles.gridAddressMuted}>No active job</Text>
      )}

      {/* Stats row */}
      <View style={styles.gridStats}>
        <View style={styles.gridStat}>
          <IconSymbol name="checkmark.circle.fill" size={10} color="#22C55E" />
          <Text style={styles.gridStatText}>{tech.todayJobs}</Text>
        </View>
        <View style={styles.gridStatDivider} />
        <View style={styles.gridStat}>
          <IconSymbol name="car.fill" size={10} color="#9CA3AF" />
          <Text style={styles.gridStatText}>{tech.todayDistanceKm.toFixed(0)}km</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.gridActions}>
        <Pressable
          style={({ pressed }) => [
            styles.gridActionBtn,
            { backgroundColor: "#22C55E15", borderColor: "#22C55E40", opacity: pressed ? 0.6 : 1 },
          ] as ViewStyle[]}
          onPress={(e) => { e.stopPropagation(); onCall(); }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <IconSymbol name="phone.fill" size={13} color="#22C55E" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.gridActionBtn,
            { backgroundColor: color + "15", borderColor: color + "40", opacity: pressed ? 0.6 : 1 },
          ] as ViewStyle[]}
          onPress={(e) => { e.stopPropagation(); onMessage(); }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <IconSymbol name="message.fill" size={13} color={color} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.gridActionBtn,
            { backgroundColor: NVC_BLUE + "15", borderColor: NVC_BLUE + "40", opacity: pressed ? 0.6 : 1, flex: 1 },
          ] as ViewStyle[]}
          onPress={onPress}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <IconSymbol name="chevron.right" size={13} color={NVC_BLUE} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const { tenantId } = useTenant();

  // Responsive columns: 2 on narrow mobile, 3 on wide mobile/tablet, 4 on desktop
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const CARD_GAP = 10;
  const HORIZONTAL_PADDING = 12;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns;

  // ── Real API query ───────────────────────────────────────────────────────────────
  const { data: apiTechs, isLoading: apiLoading, refetch } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 30_000 },
  );

  // ── Normalize API technicians to local Technician shape ─────────────────────────
  const normalizedApiTechs: Technician[] = useMemo(() => {
    if (!apiTechs) return [];
    return (apiTechs as any[]).map((t) => ({
      id: t.id,
      name: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
      phone: t.phone ?? "",
      email: t.email ?? "",
      status: (t.status ?? "offline") as Technician["status"],
      latitude: parseFloat(t.lastLatitude ?? "0"),
      longitude: parseFloat(t.lastLongitude ?? "0"),
      transportType: "car" as const,
      skills: Array.isArray(t.skills) ? t.skills : [],
      photoUrl: t.photoUrl,
      activeTaskId: t.activeTaskId,
      activeTaskAddress: t.activeTaskAddress,
      todayJobs: t.todayJobs ?? 0,
      todayDistanceKm: t.todayDistanceKm ?? 0,
    }));
  }, [apiTechs]);

  const allTechs = normalizedApiTechs;

  const sorted = useMemo(() =>
    [...allTechs].sort((a, b) => {
      const oa = STATUS_SORT[a.status as string] ?? 99;
      const ob = STATUS_SORT[b.status as string] ?? 99;
      return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
    }), [allTechs]);

  // ── Advanced search + status filter ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((t) => {
      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      // Search filter: name, address, tag/skill
      if (!q) return true;
      const matchName = t.name.toLowerCase().includes(q);
      const matchAddress = (t.activeTaskAddress ?? "").toLowerCase().includes(q);
      const matchSkill = t.skills.some((s) => s.toLowerCase().includes(q));
      const matchPhone = t.phone.toLowerCase().includes(q);
      return matchName || matchAddress || matchSkill || matchPhone;
    });
  }, [sorted, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allTechs.length };
    STATUS_FILTERS.forEach((s) => { if (s !== "all") c[s] = allTechs.filter((t) => t.status === s).length; });
    return c;
  }, [allTechs]);

  const activeCount = (counts.busy ?? 0) + (counts.en_route ?? 0);

  const handleCall = useCallback((tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${tech.phone}`);
  }, []);

  const handleMessage = useCallback((tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tech.activeTaskId) router.push(`/messages/${tech.activeTaskId}` as any);
    else Linking.openURL(`sms:${tech.phone}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Technician }) => (
    <TechGridCard
      tech={item}
      cardWidth={cardWidth}
      onPress={() => router.push(`/agent/${item.id}` as any)}
      onCall={() => handleCall(item)}
      onMessage={() => handleMessage(item)}
    />
  ), [cardWidth, router, handleCall, handleMessage]);

  // On mobile, default to card grid (not list/map split) — the split layout is wider than the phone screen
  const [viewMode, setViewMode] = useState<"list" | "card">(Platform.OS === "web" ? "list" : "card");
  // On mobile, start with the left panel closed so the map is visible
  const [leftOpen, setLeftOpen] = useState(Platform.OS === "web");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const selectedTech = selectedTechId ? allTechs.find((t) => t.id === selectedTechId) ?? null : null;
  const mapTechs = allTechs
    .filter((t) => t.status !== "offline")
    .map((t) => ({ id: t.id, name: t.name, latitude: t.latitude, longitude: t.longitude, status: t.status, transportType: t.transportType }));

  return (
    <View style={{ flex: 1, backgroundColor: "#EFF2F7" }}>
      {/* ── Top Bar ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: NVC_BLUE }] as ViewStyle[]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => setLeftOpen(!leftOpen)} style={{ padding: 4 }}>
            <IconSymbol name="sidebar.left" size={20} color="#fff" />
          </Pressable>
          <Image source={NVC_LOGO_DARK as any} style={styles.logo as any} resizeMode="contain" />
          <Text style={styles.headerTitle}>Field Team</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* List / Card view toggle */}
          <View style={{ flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
            <Pressable
              style={({ pressed }) => [{ width: 32, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: viewMode === "list" ? "rgba(255,255,255,0.25)" : "transparent", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => setViewMode("list")}
            >
              <IconSymbol name="list.bullet" size={14} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ width: 32, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: viewMode === "card" ? "rgba(255,255,255,0.25)" : "transparent", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => setViewMode("card")}
            >
              <IconSymbol name="square.grid.3x3.fill" size={14} color="#fff" />
            </Pressable>
          </View>
          <View style={[styles.filterCount, { backgroundColor: "rgba(255,255,255,0.2)" }] as ViewStyle[]}>
            <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{activeCount} active</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/agent/new" as any); }}
          >
            <IconSymbol name="plus" size={14} color="#fff" />
            <Text style={styles.headerBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Body: Map + Panels ── */}
      {viewMode === "card" ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          key={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: HORIZONTAL_PADDING, gap: CARD_GAP }}
          columnWrapperStyle={numColumns > 1 ? { gap: CARD_GAP } : undefined}
          refreshControl={
            <RefreshControl refreshing={apiLoading} onRefresh={refetch} tintColor={NVC_BLUE} />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              {/* Compact map strip — shows all technician locations at a glance */}
              {Platform.OS !== "web" && (
                <View style={{ height: 180, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
                  <NativeMapView
                    technicians={mapTechs}
                    tasks={[]}
                    height={180}
                    center={{ lat: 49.8951, lng: -97.1384 }}
                    zoom={11}
                  />
                  <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
                    <Text style={{ fontSize: 10, color: "#fff", fontFamily: "Inter_600SemiBold" }}>LIVE · {mapTechs.length} online</Text>
                  </View>
                </View>
              )}
              <View style={[styles.searchBar, searchFocused && styles.searchBarFocused, { marginBottom: 8 }] as ViewStyle[]}>
                <IconSymbol name="magnifyingglass" size={14} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search technicians..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <IconSymbol name="xmark" size={12} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterList] as ViewStyle[]}>
                {(STATUS_FILTERS as unknown as StatusFilter[]).map((item) => {
                  const isActive = statusFilter === item;
                  const dotColor = item === "all" ? NVC_BLUE : (STATUS_COLOR[item] ?? NVC_BLUE);
                  const count = counts[item] ?? 0;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.filterTab, { backgroundColor: isActive ? NVC_BLUE : "#F1F5F9", borderColor: isActive ? NVC_BLUE : "#E2E8F0" }] as ViewStyle[]}
                      onPress={() => setStatusFilter(item)}
                    >
                      {item !== "all" && <View style={[styles.filterDot, { backgroundColor: dotColor }] as ViewStyle[]} />}
                      <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "#374151" }] as TextStyle[]}>{FILTER_LABELS[item]}</Text>
                      {count > 0 && (
                        <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#E2E8F0" }] as ViewStyle[]}>
                          <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "#374151" }] as TextStyle[]}>{count}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconSymbol name="person.2.fill" size={28} color="#C0C8D8" />
              <Text style={styles.emptyTitle}>No technicians found</Text>
            </View>
          }
          renderItem={renderItem}
        />
      ) : (
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Left Panel */}
        {leftOpen && (
          <View style={styles.leftPanel}>
            {/* Search */}
            <View style={[styles.searchBar, searchFocused && styles.searchBarFocused, { margin: 8 }] as ViewStyle[]}>
              <IconSymbol name="magnifyingglass" size={14} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search technicians..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <IconSymbol name="xmark" size={12} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
            {/* Compact filter strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 6 }}>
              {(STATUS_FILTERS as unknown as StatusFilter[]).map((item) => {
                const isActive = statusFilter === item;
                const dotColor = item === "all" ? NVC_BLUE : (STATUS_COLOR[item] ?? NVC_BLUE);
                const count = counts[item] ?? 0;
                return (
                  <Pressable
                    key={item}
                    style={[{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: isActive ? NVC_BLUE : "#F1F5F9", borderColor: isActive ? NVC_BLUE : "#E2E8F0" }] as ViewStyle[]}
                    onPress={() => setStatusFilter(item)}
                  >
                    {item !== "all" && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isActive ? "#fff" : dotColor }} />}
                    <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: isActive ? "#fff" : "#374151" }}>{FILTER_LABELS[item]}</Text>
                    {count > 0 && (
                      <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#E2E8F0", minWidth: 16, alignItems: "center" }}>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: isActive ? "#fff" : "#374151" }}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            {/* Tech list */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={apiLoading} onRefresh={refetch} tintColor={NVC_BLUE} />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <IconSymbol name="person.2.fill" size={28} color="#C0C8D8" />
                  <Text style={styles.emptyTitle}>No technicians found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const color = STATUS_COLOR[item.status as string] ?? "#9CA3AF";
                const isSelected = selectedTechId === item.id;
                const initials = item.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                const statusLabel = FILTER_LABELS[item.status as string] ?? item.status;
                return (
                  <Pressable
                    style={[{
                      flexDirection: "row", alignItems: "center",
                      paddingVertical: 7, paddingRight: 10,
                      borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
                      backgroundColor: isSelected ? "#EFF6FF" : "#fff",
                    }] as ViewStyle[]}
                    onPress={() => setSelectedTechId(isSelected ? null : item.id)}
                  >
                    {/* Left accent bar */}
                    <View style={{ width: 3, alignSelf: "stretch", backgroundColor: color, borderRadius: 2, marginRight: 8, marginLeft: 0 }} />
                    {/* Avatar circle */}
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color + "22", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color, letterSpacing: 0.3 }}>{initials}</Text>
                    </View>
                    {/* Name + status */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0F172A", lineHeight: 16 }} numberOfLines={1}>{item.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
                        <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color, lineHeight: 14 }} numberOfLines={1}>
                          {statusLabel}{item.activeTaskAddress ? ` · ${item.activeTaskAddress}` : ""}
                        </Text>
                      </View>
                    </View>
                    {/* Call button */}
                    <Pressable onPress={() => handleCall(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                      <IconSymbol name="phone.fill" size={13} color="#22C55E" />
                    </Pressable>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Map fills remaining space */}
        <View style={{ flex: 1, position: "relative" }}>
          <GoogleMapView
            technicians={mapTechs as any}
            tasks={[]}
            style={{ flex: 1 }}
          />
          {/* FAB: Add technician */}
          <Pressable
            style={styles.fab}
            onPress={() => router.push("/agent/new" as any)}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Right detail panel */}
        {selectedTech && (
          <View style={styles.rightPanel}>
            <View style={styles.rightPanelHeader}>
              <Text style={styles.rightPanelName} numberOfLines={1}>{selectedTech.name}</Text>
              <Pressable onPress={() => setSelectedTechId(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconSymbol name="xmark" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, color: STATUS_COLOR[selectedTech.status as string] ?? "#9CA3AF", fontFamily: "Inter_600SemiBold", marginBottom: 12 }}>
              {FILTER_LABELS[selectedTech.status as string] ?? selectedTech.status}
            </Text>
            {selectedTech.activeTaskAddress ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>CURRENT JOB</Text>
                <Text style={{ fontSize: 13, color: "#111827", lineHeight: 18 }}>{selectedTech.activeTaskAddress}</Text>
              </View>
            ) : null}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>TODAY</Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>{selectedTech.todayJobs} jobs · {selectedTech.todayDistanceKm.toFixed(0)} km</Text>
            </View>
            {selectedTech.skills.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>SKILLS</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {selectedTech.skills.map((s) => (
                    <View key={s} style={{ backgroundColor: "#EFF6FF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: NVC_BLUE }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable
                style={{ flex: 1, backgroundColor: "#22C55E", borderRadius: 8, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}
                onPress={() => handleCall(selectedTech)}
              >
                <IconSymbol name="phone.fill" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Call</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, backgroundColor: NVC_BLUE, borderRadius: 8, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}
                onPress={() => router.push(`/agent/${selectedTech.id}` as any)}
              >
                <IconSymbol name="person.fill" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Profile</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create<{
  // Header
  header: ViewStyle; headerLeft: ViewStyle; logo: ViewStyle;
  headerLabel: TextStyle; headerTitle: TextStyle;
  headerRight: ViewStyle; headerBtn: ViewStyle; headerBtnText: TextStyle;
  // Search
  searchSection: ViewStyle; searchBar: ViewStyle; searchBarFocused: ViewStyle;
  searchInput: TextStyle; clearBtn: ViewStyle;
  // Filter bar
  filterBar: ViewStyle; filterList: ViewStyle; filterTab: ViewStyle;
  filterDot: ViewStyle; filterTabText: TextStyle; filterCount: ViewStyle; filterCountText: TextStyle;
  // Results bar
  resultsBar: ViewStyle; resultsText: TextStyle; clearFiltersText: TextStyle;
  // Grid
  gridContent: ViewStyle; gridRow: ViewStyle;
  // Grid Card
  gridCard: ViewStyle; gridCardAccent: ViewStyle;
  gridAvatarWrap: ViewStyle; gridAvatar: ViewStyle; gridAvatarText: TextStyle;
  gridStatusDot: ViewStyle; gridName: TextStyle; gridStatusPill: ViewStyle;
  gridPillDot: ViewStyle; gridStatusText: TextStyle;
  // Map-first layout
  leftPanel: ViewStyle; leftPanelHeader: ViewStyle; leftPanelTitle: TextStyle;
  leftPanelToggle: ViewStyle; listRow: ViewStyle; listRowSelected: ViewStyle;
  listDot: ViewStyle; listName: TextStyle; listSub: TextStyle;
  rightPanel: ViewStyle; rightPanelHeader: ViewStyle; rightPanelName: TextStyle;
  fab: ViewStyle;
  gridSkillsRow: ViewStyle; gridSkillChip: ViewStyle; gridSkillText: TextStyle;
  gridAddress: TextStyle; gridAddressMuted: TextStyle;
  gridStats: ViewStyle; gridStat: ViewStyle; gridStatDivider: ViewStyle; gridStatText: TextStyle;
  gridActions: ViewStyle; gridActionBtn: ViewStyle;
  // Empty
  empty: ViewStyle; emptyIcon: ViewStyle; emptyTitle: TextStyle;
  emptyAction: ViewStyle; emptyActionText: TextStyle;
}>({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 34, height: 34, borderRadius: 9 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, letterSpacing: -0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerStat: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    minHeight: 40,
    shadowColor: NVC_ORANGE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  mapBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    minHeight: 40,
  },
  headerBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Search
  searchSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 11,
    minHeight: 46,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 10, elevation: 4,
  },
  searchBarFocused: { borderColor: NVC_ORANGE, shadowOpacity: 0.22 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1E2A" },
  clearBtn: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#C0C8D8",
    alignItems: "center", justifyContent: "center",
  },

  // Filter bar
  filterBar: { backgroundColor: NVC_BLUE, paddingBottom: 12 },
  filterList: { paddingHorizontal: 14, paddingTop: 6, gap: 6 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, gap: 5,
    minHeight: 32,
  },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Results bar
  resultsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  resultsText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748B" },
  clearFiltersText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: NVC_BLUE },

  // Grid
  gridContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 40, gap: 10 },
  gridRow: { gap: 10 },

  // Grid Card
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    paddingBottom: 12,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  gridCardAccent: { height: 3, width: "100%" },
  gridAvatarWrap: {
    alignSelf: "center", marginTop: 16, marginBottom: 8,
    position: "relative",
  },
  gridAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  gridAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  gridStatusDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2.5,
  },
  gridName: {
    fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A",
    textAlign: "center", paddingHorizontal: 8, letterSpacing: -0.2,
  },
  gridStatusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "center", marginTop: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5,
  },
  gridPillDot: { width: 5, height: 5, borderRadius: 2.5 },
  gridStatusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  gridSkillsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 4,
    paddingHorizontal: 10, marginTop: 8, justifyContent: "center",
  },
  gridSkillChip: {
    backgroundColor: "#F1F5F9", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, maxWidth: "100%",
  },
  gridSkillText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#475569" },
  gridAddress: {
    fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center",
    paddingHorizontal: 10, marginTop: 6, lineHeight: 15,
  },
  gridAddressMuted: {
    fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8", textAlign: "center",
    paddingHorizontal: 10, marginTop: 6, fontStyle: "italic",
  },
  gridStats: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 10, paddingHorizontal: 10,
  },
  gridStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  gridStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1" },
  gridStatText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#94A3B8" },
  gridActions: {
    flexDirection: "row", gap: 6, paddingHorizontal: 10, marginTop: 12,
  },
  gridActionBtn: {
    height: 34, borderRadius: 8, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flex: 1,
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 22, backgroundColor: "#F8FAFC",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#64748B", textAlign: "center", paddingHorizontal: 24 },
  emptyAction: {
    backgroundColor: NVC_BLUE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, marginTop: 4,
    shadowColor: NVC_BLUE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  emptyActionText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  // Map-first layout
  leftPanel: {
    width: 220, backgroundColor: "#fff",
    borderRightWidth: 1, borderRightColor: "#E2E8F0",
    flexDirection: "column",
  },
  leftPanelHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  leftPanelTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#1E293B" },
  leftPanelToggle: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  listRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  listRowSelected: { backgroundColor: "#EFF6FF" },
  listDot: { width: 9, height: 9, borderRadius: 4.5 },
  listName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0F172A" },
  listSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  rightPanel: {
    width: 248, backgroundColor: "#fff",
    borderLeftWidth: 1, borderLeftColor: "#E2E8F0",
    padding: 16,
  },
  rightPanelHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10,
  },
  rightPanelName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", flex: 1 },
  fab: {
    position: "absolute", bottom: 24, right: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: NVC_BLUE,
    alignItems: "center", justifyContent: "center",
    shadowColor: NVC_BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  headerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    minHeight: 40,
  },
});
