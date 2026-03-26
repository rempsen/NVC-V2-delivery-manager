import React, { useState, useMemo } from "react";
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
import { Image } from "react-native";

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

// ─── Tech Card (Widget Style) ─────────────────────────────────────────────────

function TechCard({
  tech, onPress, onCall, onMessage,
}: {
  tech: Technician;
  onPress: () => void;
  onCall: () => void;
  onMessage: () => void;
}) {
  const status = tech.status as string;
  const color = STATUS_COLOR[status] ?? "#9CA3AF";
  const label = TECH_STATUS_LABELS[status] ?? status;
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Colored left accent */}
      <View style={[styles.cardAccent, { backgroundColor: color } as ViewStyle]} />

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + "20" } as ViewStyle]}>
        <Text style={[styles.avatarText, { color } as TextStyle]}>{initials}</Text>
        <View style={[styles.statusDot, { backgroundColor: color, borderColor: WIDGET_SURFACE_LIGHT } as ViewStyle]} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{tech.name}</Text>
          <View style={[styles.statusPill, { backgroundColor: color + "18", borderColor: color + "40" } as ViewStyle]}>
            <View style={[styles.pillDot, { backgroundColor: color } as ViewStyle]} />
            <Text style={[styles.statusPillText, { color } as TextStyle]}>{label}</Text>
          </View>
        </View>
        {tech.activeTaskAddress ? (
          <Text style={styles.metaText} numberOfLines={1}>
            {tech.activeTaskAddress}
          </Text>
        ) : (
          <Text style={styles.metaTextMuted}>No active job</Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <IconSymbol name="checkmark.circle.fill" size={11} color="#22C55E" />
            <Text style={styles.statText}>{tech.todayJobs} jobs</Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.stat}>
            <IconSymbol name="car.fill" size={11} color="#9CA3AF" />
            <Text style={styles.statText}>{tech.todayDistanceKm.toFixed(0)} km</Text>
          </View>
          <View style={styles.statDot} />
          <Text style={styles.statText} numberOfLines={1}>{tech.skills[0]}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#22C55E15", borderColor: "#22C55E30", opacity: pressed ? 0.6 : 1 }] as ViewStyle[]}
          onPress={(e) => { e.stopPropagation(); onCall(); }}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <IconSymbol name="phone.fill" size={14} color="#22C55E" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: color + "15", borderColor: color + "30", opacity: pressed ? 0.6 : 1 }] as ViewStyle[]}
          onPress={(e) => { e.stopPropagation(); onMessage(); }}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <IconSymbol name="message.fill" size={14} color={color} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const sorted = useMemo(() =>
    [...MOCK_TECHNICIANS].sort((a, b) => {
      const oa = STATUS_SORT[a.status as string] ?? 99;
      const ob = STATUS_SORT[b.status as string] ?? 99;
      return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
    }), []);

  const filtered = useMemo(() =>
    statusFilter === "all" ? sorted : sorted.filter((t) => t.status === statusFilter),
    [statusFilter, sorted]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: MOCK_TECHNICIANS.length };
    STATUS_FILTERS.forEach((s) => { if (s !== "all") c[s] = MOCK_TECHNICIANS.filter((t) => t.status === s).length; });
    return c;
  }, []);

  const activeCount = (counts.busy ?? 0) + (counts.en_route ?? 0);

  const handleCall = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${tech.phone}`);
  };

  const handleMessage = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tech.activeTaskId) router.push(`/messages/${tech.activeTaskId}` as any);
    else Linking.openURL(`sms:${tech.phone}`);
  };

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 } as ViewStyle]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.logo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360</Text>
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
            <Text style={styles.mapBtnText}>Add</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => router.push("/dispatcher" as any)}
          >
            <IconSymbol name="map.fill" size={14} color="#fff" />
            <Text style={styles.mapBtnText}>Live Map</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Status Filter Bar ── */}
      <View style={styles.filterBar}>
        <FlatList
          data={STATUS_FILTERS as unknown as StatusFilter[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = statusFilter === item;
            const dotColor = item === "all" ? "#fff" : (STATUS_COLOR[item] ?? "#fff");
            const count = counts[item] ?? 0;
            return (
              <Pressable
                style={[
                  styles.filterTab,
                  { backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" },
                ] as ViewStyle[]}
                onPress={() => setStatusFilter(item)}
              >
                {item !== "all" && <View style={[styles.filterDot, { backgroundColor: dotColor } as ViewStyle]} />}
                <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "rgba(255,255,255,0.65)" } as TextStyle]}>
                  {FILTER_LABELS[item]}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)" } as ViewStyle]}>
                    <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "rgba(255,255,255,0.7)" } as TextStyle]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* ── Tech List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <IconSymbol name="person.2.fill" size={32} color="#C0C8D8" />
            </View>
            <Text style={styles.emptyTitle}>No technicians in this status</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TechCard
            tech={item}
            onPress={() => router.push(`/agent/${item.id}` as any)}
            onCall={() => handleCall(item)}
            onMessage={() => handleMessage(item)}
          />
        )}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  header: ViewStyle; headerLeft: ViewStyle; logo: ViewStyle;
  headerLabel: TextStyle; headerTitle: TextStyle; headerRight: ViewStyle;
  headerStat: TextStyle; addBtn: ViewStyle; mapBtn: ViewStyle; mapBtnText: TextStyle;
  filterBar: ViewStyle; filterList: ViewStyle; filterTab: ViewStyle;
  filterDot: ViewStyle; filterTabText: TextStyle; filterCount: ViewStyle;
  filterCountText: TextStyle; listContent: ViewStyle;
  card: ViewStyle; cardAccent: ViewStyle; avatar: ViewStyle;
  avatarText: TextStyle; statusDot: ViewStyle; info: ViewStyle;
  nameRow: ViewStyle; name: TextStyle; statusPill: ViewStyle;
  pillDot: ViewStyle; statusPillText: TextStyle; metaText: TextStyle;
  metaTextMuted: TextStyle; statsRow: ViewStyle; stat: ViewStyle;
  statDot: ViewStyle; statText: TextStyle; actions: ViewStyle;
  actionBtn: ViewStyle; empty: ViewStyle; emptyIcon: ViewStyle; emptyTitle: TextStyle;
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
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#E85D04", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16,
  },
  mapBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16,
  },
  mapBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Filter bar
  filterBar: { backgroundColor: "#1A5FA8", paddingBottom: 8 },
  filterList: { paddingHorizontal: 14, paddingTop: 8, gap: 6 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, gap: 4,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabText: { fontSize: 11, fontWeight: "600" },
  filterCount: { paddingHorizontal: 5, borderRadius: 7, minWidth: 16, alignItems: "center" },
  filterCountText: { fontSize: 10, fontWeight: "700" },

  // List
  listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 32 },

  // Card
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WIDGET_SURFACE_LIGHT, borderRadius: 14,
    marginBottom: 8, overflow: "hidden",
    paddingVertical: 10, paddingRight: 10, gap: 10,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardAccent: { width: 4, alignSelf: "stretch" },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  statusDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
  },

  // Info
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 13, fontWeight: "700", flex: 1, color: "#1A1E2A" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, flexShrink: 0,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  metaText: { fontSize: 11, color: "#6B7280" },
  metaTextMuted: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#D1D5DB" },
  statText: { fontSize: 10, color: "#9CA3AF" },

  // Actions
  actions: { gap: 6, flexShrink: 0 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 9, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WIDGET_SURFACE_LIGHT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
});
