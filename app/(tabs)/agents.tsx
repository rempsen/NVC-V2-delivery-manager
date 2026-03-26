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
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT } from "@/constants/brand";
import {
  MOCK_TECHNICIANS,
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
  const { tenantId, isDemo } = useTenant();

  // Responsive columns: 2 on narrow mobile, 3 on wide mobile/tablet, 4 on desktop
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const CARD_GAP = 10;
  const HORIZONTAL_PADDING = 12;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns;

  // ── Real API query ───────────────────────────────────────────────────────────────
  const { data: apiTechs, isLoading: apiLoading, refetch } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: !isDemo && tenantId !== null, staleTime: 30_000 },
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

  const allTechs = isDemo ? MOCK_TECHNICIANS : normalizedApiTechs;

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

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 } as ViewStyle]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.logo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360 2.0</Text>
            <Text style={styles.headerTitle}>Field Team</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerStat}>{activeCount} active</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/agent/new" as any);
            }}
          >
            <IconSymbol name="plus" size={14} color="#fff" />
            <Text style={styles.headerBtnText}>Add</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => router.push("/dispatcher" as any)}
          >
            <IconSymbol name="map.fill" size={14} color="#fff" />
            <Text style={styles.headerBtnText}>Live Map</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={[styles.searchSection, { backgroundColor: "#1A5FA8" }] as ViewStyle[]}>
        <View style={[
          styles.searchBar,
          searchFocused && styles.searchBarFocused,
        ] as ViewStyle[]}>
          <IconSymbol name="magnifyingglass" size={15} color={searchQuery ? NVC_BLUE : "#9CA3AF"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skill, address, phone..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.clearBtn}>
                <IconSymbol name="xmark" size={10} color="#fff" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Status Filter Bar ── */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {(STATUS_FILTERS as unknown as StatusFilter[]).map((item) => {
            const isActive = statusFilter === item;
            const dotColor = item === "all" ? "#fff" : (STATUS_COLOR[item] ?? "#fff");
            const count = counts[item] ?? 0;
            return (
              <Pressable
                key={item}
                style={[
                  styles.filterTab,
                  { backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" },
                ] as ViewStyle[]}
                onPress={() => setStatusFilter(item)}
              >
                {item !== "all" && <View style={[styles.filterDot, { backgroundColor: dotColor }] as ViewStyle[]} />}
                <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }] as TextStyle[]}>
                  {FILTER_LABELS[item]}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)" }] as ViewStyle[]}>
                    <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }] as TextStyle[]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results count ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "technician" : "technicians"}
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </Text>
        {(searchQuery || statusFilter !== "all") && (
          <Pressable
            onPress={() => { setSearchQuery(""); setStatusFilter("all"); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </Pressable>
        )}
      </View>

      {/* ── Tech Grid ── */}
      <FlatList
        key={numColumns}
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemo ? (
            <RefreshControl
              refreshing={apiLoading}
              onRefresh={refetch}
              tintColor={NVC_BLUE}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <IconSymbol name="person.2.fill" size={32} color="#C0C8D8" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? `No technicians match "${searchQuery}"` : "No technicians in this status"}
            </Text>
            {(searchQuery || statusFilter !== "all") && (
              <Pressable
                style={styles.emptyAction}
                onPress={() => { setSearchQuery(""); setStatusFilter("all"); }}
              >
                <Text style={styles.emptyActionText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  // Header
  header: ViewStyle; headerLeft: ViewStyle; logo: ViewStyle;
  headerLabel: TextStyle; headerTitle: TextStyle; headerRight: ViewStyle;
  headerStat: TextStyle; addBtn: ViewStyle; mapBtn: ViewStyle; headerBtnText: TextStyle;
  // Search
  searchSection: ViewStyle; searchBar: ViewStyle; searchBarFocused: ViewStyle;
  searchInput: TextStyle; clearBtn: ViewStyle;
  // Filter bar
  filterBar: ViewStyle; filterList: ViewStyle; filterTab: ViewStyle;
  filterDot: ViewStyle; filterTabText: TextStyle; filterCount: ViewStyle;
  filterCountText: TextStyle;
  // Results bar
  resultsBar: ViewStyle; resultsText: TextStyle; clearFiltersText: TextStyle;
  // Grid
  gridContent: ViewStyle; gridRow: ViewStyle;
  // Grid Card
  gridCard: ViewStyle; gridCardAccent: ViewStyle;
  gridAvatarWrap: ViewStyle; gridAvatar: ViewStyle; gridAvatarText: TextStyle;
  gridStatusDot: ViewStyle; gridName: TextStyle;
  gridStatusPill: ViewStyle; gridPillDot: ViewStyle; gridStatusText: TextStyle;
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
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 32, height: 32, borderRadius: 7 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", letterSpacing: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerStat: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E85D04", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    minHeight: 36,
  },
  mapBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    minHeight: 36,
  },
  headerBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Search
  searchSection: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 14, paddingVertical: 10,
    minHeight: 44,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  searchBarFocused: { borderColor: NVC_BLUE, shadowOpacity: 0.2 },
  searchInput: { flex: 1, fontSize: 14, color: "#1A1E2A" },
  clearBtn: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#9CA3AF",
    alignItems: "center", justifyContent: "center",
  },

  // Filter bar
  filterBar: { backgroundColor: "#1A5FA8", paddingBottom: 10 },
  filterList: { paddingHorizontal: 14, paddingTop: 4, gap: 6 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, gap: 5,
    minHeight: 34,
  },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterTabText: { fontSize: 12, fontWeight: "700" },
  filterCount: { paddingHorizontal: 6, borderRadius: 8, minWidth: 18, alignItems: "center" },
  filterCountText: { fontSize: 11, fontWeight: "700" },

  // Results bar
  resultsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#EFF2F7",
  },
  resultsText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  clearFiltersText: { fontSize: 12, color: NVC_BLUE, fontWeight: "700" },

  // Grid
  gridContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32, gap: 10 },
  gridRow: { gap: 10 },

  // Grid Card
  gridCard: {
    backgroundColor: WIDGET_SURFACE_LIGHT,
    borderRadius: 16,
    overflow: "hidden",
    paddingBottom: 10,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
  },
  gridCardAccent: { height: 4, width: "100%" },
  gridAvatarWrap: {
    alignSelf: "center", marginTop: 14, marginBottom: 8,
    position: "relative",
  },
  gridAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  gridAvatarText: { fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  gridStatusDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 6.5, borderWidth: 2,
  },
  gridName: {
    fontSize: 13, fontWeight: "800", color: "#1A1E2A",
    textAlign: "center", paddingHorizontal: 8, letterSpacing: -0.2,
  },
  gridStatusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "center", marginTop: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5,
  },
  gridPillDot: { width: 5, height: 5, borderRadius: 2.5 },
  gridStatusText: { fontSize: 10, fontWeight: "700" },
  gridSkillsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 4,
    paddingHorizontal: 8, marginTop: 7, justifyContent: "center",
  },
  gridSkillChip: {
    backgroundColor: "#EFF2F7", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, maxWidth: "100%",
  },
  gridSkillText: { fontSize: 9, fontWeight: "600", color: "#374151" },
  gridAddress: {
    fontSize: 10, color: "#6B7280", textAlign: "center",
    paddingHorizontal: 8, marginTop: 6, lineHeight: 14,
  },
  gridAddressMuted: {
    fontSize: 10, color: "#9CA3AF", textAlign: "center",
    paddingHorizontal: 8, marginTop: 6, fontStyle: "italic",
  },
  gridStats: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 8, paddingHorizontal: 8,
  },
  gridStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  gridStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" },
  gridStatText: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },
  gridActions: {
    flexDirection: "row", gap: 6, paddingHorizontal: 8, marginTop: 10,
  },
  gridActionBtn: {
    height: 32, borderRadius: 8, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flex: 1,
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WIDGET_SURFACE_LIGHT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#6B7280", textAlign: "center", paddingHorizontal: 24 },
  emptyAction: {
    backgroundColor: NVC_BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4,
  },
  emptyActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
