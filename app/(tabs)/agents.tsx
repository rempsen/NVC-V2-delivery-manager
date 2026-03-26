import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Linking,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  MOCK_TECHNICIANS,
  TECH_STATUS_COLORS,
  TECH_STATUS_LABELS,
  type Technician,
} from "@/lib/nvc-types";

// ─── Constants ────────────────────────────────────────────────────────────────

// Royal-to-sky blue: sits between #1D4ED8 (royal) and #38BDF8 (sky)
const HEADER_BG = "#1E6FBF";
const HEADER_BG_DARK = "#1A5FA8";

// Status sort order: On Job first, En Route, Available, On Break, Offline last
const STATUS_SORT_ORDER: Record<string, number> = {
  busy: 0,
  en_route: 1,
  online: 2,
  on_break: 3,
  offline: 4,
};

// Muted background tints for each status (for the card left-border accent + subtle bg)
const STATUS_BG_TINTS: Record<string, string> = {
  busy:     "#F59E0B",   // amber
  en_route: "#8B5CF6",   // purple
  online:   "#22C55E",   // green
  on_break: "#3B82F6",   // blue
  offline:  "#6B7280",   // gray
};

const STATUS_FILTERS = ["all", "busy", "en_route", "online", "on_break", "offline"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  busy: "On Job",
  en_route: "En Route",
  online: "Available",
  on_break: "On Break",
  offline: "Offline",
};

// ─── Compact Tech Row ─────────────────────────────────────────────────────────

function TechRow({
  tech,
  onPress,
  onCall,
  onMessage,
}: {
  tech: Technician;
  onPress: () => void;
  onCall: () => void;
  onMessage: () => void;
}) {
  const colors = useColors();
  const status = tech.status as string;
  const statusColor = STATUS_BG_TINTS[status] ?? "#6B7280";
  const statusLabel = TECH_STATUS_LABELS[status] ?? status;
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: statusColor,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: statusColor + "22" }]}>
        <Text style={[styles.avatarText, { color: statusColor }]}>{initials}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor, borderColor: colors.surface }]} />
      </View>

      {/* Name + location */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{tech.name}</Text>
          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: statusColor + "22", borderColor: statusColor + "55" }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {tech.activeTaskAddress ? (
            <Text style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
              <Text style={{ color: statusColor }}>● </Text>
              {tech.activeTaskAddress}
            </Text>
          ) : (
            <Text style={[styles.metaText, { color: colors.muted }]}>No active job</Text>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <IconSymbol name="checkmark.circle.fill" size={10} color="#22C55E" />
            <Text style={[styles.statText, { color: colors.muted }]}>{tech.todayJobs}j</Text>
          </View>
          <Text style={[styles.statDivider, { color: colors.border }]}>·</Text>
          <View style={styles.stat}>
            <IconSymbol name="car.fill" size={10} color={colors.muted} />
            <Text style={[styles.statText, { color: colors.muted }]}>{tech.todayDistanceKm.toFixed(0)}km</Text>
          </View>
          <Text style={[styles.statDivider, { color: colors.border }]}>·</Text>
          <Text style={[styles.statText, { color: colors.muted }]} numberOfLines={1}>{tech.skills[0]}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: "#22C55E18", borderColor: "#22C55E33", opacity: pressed ? 0.65 : 1 },
          ]}
          onPress={(e) => { e.stopPropagation(); onCall(); }}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <IconSymbol name="phone.fill" size={13} color="#22C55E" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: statusColor + "18", borderColor: statusColor + "33", opacity: pressed ? 0.65 : 1 },
          ]}
          onPress={(e) => { e.stopPropagation(); onMessage(); }}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <IconSymbol name="message.fill" size={13} color={statusColor} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Sort by status priority, then by name within each group
  const sorted = useMemo(() => {
    return [...MOCK_TECHNICIANS].sort((a, b) => {
      const orderA = STATUS_SORT_ORDER[a.status as string] ?? 99;
      const orderB = STATUS_SORT_ORDER[b.status as string] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return sorted;
    return sorted.filter((t) => t.status === statusFilter);
  }, [statusFilter, sorted]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: MOCK_TECHNICIANS.length };
    STATUS_FILTERS.forEach((s) => {
      if (s !== "all") c[s] = MOCK_TECHNICIANS.filter((t) => t.status === s).length;
    });
    return c;
  }, []);

  const activeCount = (counts.busy ?? 0) + (counts.en_route ?? 0);

  const handleCall = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${tech.phone}`);
  };

  const handleMessage = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tech.activeTaskId) {
      router.push(`/messages/${tech.activeTaskId}` as any);
    } else {
      Linking.openURL(`sms:${tech.phone}`);
    }
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: HEADER_BG, paddingTop: insets.top + 6 },
        ]}
      >
        <View style={styles.headerLeft}>
          {/* NVC Logo */}
          <Image
            source={require("@/assets/images/nvc-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Field Team</Text>
            <Text style={styles.headerSub}>
              {activeCount} active · {counts.all} total
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.mapBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/dispatcher" as any)}
        >
          <IconSymbol name="map.fill" size={15} color="#fff" />
          <Text style={styles.mapBtnText}>Live Map</Text>
        </Pressable>
      </View>

      {/* ── Status Filter Tabs ── */}
      <View style={[styles.filterBar, { backgroundColor: HEADER_BG_DARK }]}>
        <FlatList
          data={STATUS_FILTERS as unknown as StatusFilter[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = statusFilter === item;
            const dotColor = item === "all" ? "#fff" : (STATUS_BG_TINTS[item] ?? "#fff");
            const count = counts[item] ?? 0;
            return (
              <Pressable
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)",
                  },
                ]}
                onPress={() => setStatusFilter(item)}
              >
                {item !== "all" && (
                  <View style={[styles.filterDot, { backgroundColor: dotColor }]} />
                )}
                <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }]}>
                  {FILTER_LABELS[item]}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.filterCount,
                    { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)" },
                  ]}>
                    <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* ── Technician List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="person.2.fill" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No technicians in this status</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TechRow
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

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 1 },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  mapBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Filter bar
  filterBar: {
    paddingBottom: 8,
  },
  filterList: { paddingHorizontal: 14, paddingTop: 8, gap: 6 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabText: { fontSize: 11, fontWeight: "600" },
  filterCount: {
    paddingHorizontal: 5,
    paddingVertical: 0,
    borderRadius: 7,
    minWidth: 16,
    alignItems: "center",
  },
  filterCountText: { fontSize: 10, fontWeight: "700" },

  // List
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 },

  // Compact row card
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,          // colored status accent on left edge
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 10,
    marginBottom: 6,
    gap: 9,
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },

  // Info block
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 13, fontWeight: "700", flex: 1 },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusPillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, flex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { fontSize: 10 },
  statDivider: { fontSize: 10 },

  // Action buttons
  actions: { gap: 5, flexShrink: 0 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "500" },
});
