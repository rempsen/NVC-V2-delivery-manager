import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Image,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  NVC_BLUE,
  NVC_ORANGE,
  NVC_LOGO_DARK,
  WIDGET_SURFACE_LIGHT,
} from "@/constants/brand";
import {
  MOCK_TASKS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  type Task,
  type TaskStatus,
} from "@/lib/nvc-types";

const FILTERS: { key: "all" | TaskStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "assigned", label: "Assigned" },
  { key: "en_route", label: "En Route" },
  { key: "on_site", label: "On Site" },
  { key: "completed", label: "Done" },
  { key: "failed", label: "Failed" },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
};

const SHADOW: ViewStyle = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const statusColor = STATUS_COLORS[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(task.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [task.createdAt]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Colored left accent bar */}
      <View style={[styles.cardBar, { backgroundColor: statusColor } as ViewStyle]} />

      <View style={styles.cardBody}>
        {/* Top row: customer name + priority badge */}
        <View style={styles.cardRow}>
          <Text style={styles.cardCustomer} numberOfLines={1}>
            {task.customerName}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20", borderColor: priorityColor + "40" } as ViewStyle]}>
            <Text style={[styles.priorityBadgeText, { color: priorityColor } as TextStyle]}>
              {PRIORITY_LABELS[task.priority] ?? task.priority}
            </Text>
          </View>
        </View>

        {/* Address */}
        <Text style={styles.cardAddress} numberOfLines={1}>
          {task.jobAddress}
        </Text>

        {/* Status pill + technician */}
        <View style={styles.cardRow}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "18" } as ViewStyle]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor } as ViewStyle]} />
            <Text style={[styles.statusPillText, { color: statusColor } as TextStyle]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
          {task.technicianName ? (
            <Text style={styles.cardTech} numberOfLines={1}>
              {task.technicianName}
            </Text>
          ) : (
            <Text style={styles.cardTechUnassigned}>Unassigned</Text>
          )}
        </View>

        {/* Bottom row: order ref + time */}
        <View style={styles.cardRow}>
          {task.orderRef ? (
            <Text style={styles.cardRef}>{task.orderRef}</Text>
          ) : (
            <View />
          )}
          <Text style={styles.cardTime}>{timeAgo}</Text>
        </View>
      </View>

      <View style={styles.cardChevronWrap}>
        <IconSymbol name="chevron.right" size={15} color="#C0C8D8" />
      </View>
    </Pressable>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = MOCK_TASKS;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.customerName.toLowerCase().includes(q) ||
          t.jobAddress.toLowerCase().includes(q) ||
          (t.orderRef?.toLowerCase().includes(q) ?? false) ||
          (t.technicianName?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [filter, search]);

  const countFor = (key: "all" | TaskStatus) =>
    key === "all" ? MOCK_TASKS.length : MOCK_TASKS.filter((t) => t.status === key).length;

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 } as ViewStyle]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360</Text>
            <Text style={styles.headerTitle}>Work Orders</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
          onPress={() => router.push("/create-task")}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customers, technicians..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol name="xmark" size={15} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const isActive = filter === item.key;
          const count = countFor(item.key);
          return (
            <Pressable
              style={[
                styles.filterTab,
                isActive ? styles.filterTabActive : styles.filterTabInactive,
              ] as ViewStyle[]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "#6B7280" } as TextStyle]}>
                {item.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isActive ? "rgba(255,255,255,0.28)" : "#E5E7EB" } as ViewStyle,
                  ]}
                >
                  <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "#6B7280" } as TextStyle]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* ── Task List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <IconSymbol name="doc.text.fill" size={32} color="#C0C8D8" />
            </View>
            <Text style={styles.emptyTitle}>No work orders found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={() => router.push(`/task/${item.id}` as any)} />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create<{
  header: ViewStyle;
  headerLeft: ViewStyle;
  headerLogo: ViewStyle;
  headerLabel: TextStyle;
  headerTitle: TextStyle;
  addBtn: ViewStyle;
  searchWrapper: ViewStyle;
  searchBar: ViewStyle;
  searchInput: TextStyle;
  filterList: ViewStyle;
  filterTab: ViewStyle;
  filterTabActive: ViewStyle;
  filterTabInactive: ViewStyle;
  filterTabText: TextStyle;
  filterCount: ViewStyle;
  filterCountText: TextStyle;
  listContent: ViewStyle;
  card: ViewStyle;
  cardBar: ViewStyle;
  cardBody: ViewStyle;
  cardRow: ViewStyle;
  cardCustomer: TextStyle;
  priorityBadge: ViewStyle;
  priorityBadgeText: TextStyle;
  cardAddress: TextStyle;
  statusPill: ViewStyle;
  statusDot: ViewStyle;
  statusPillText: TextStyle;
  cardTech: TextStyle;
  cardTechUnassigned: TextStyle;
  cardRef: TextStyle;
  cardTime: TextStyle;
  cardChevronWrap: ViewStyle;
  empty: ViewStyle;
  emptyIcon: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
}>({
  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 7 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", letterSpacing: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 1 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NVC_ORANGE,
  },

  // ── Search
  searchWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WIDGET_SURFACE_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 10,
    minHeight: 44,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1A1E2A" },

  // ── Filter Tabs
  filterList: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6, gap: 7 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    minHeight: 36,
  },
  filterTabActive: { backgroundColor: NVC_BLUE },
  filterTabInactive: {
    backgroundColor: WIDGET_SURFACE_LIGHT,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterTabText: { fontSize: 13, fontWeight: "700" },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  filterCountText: { fontSize: 11, fontWeight: "700" },

  // ── Task Cards
  listContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: WIDGET_SURFACE_LIGHT,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
  },
  cardBar: { width: 5 },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardCustomer: { fontSize: 15, fontWeight: "800", flex: 1, marginRight: 8, color: "#1A1E2A", letterSpacing: -0.1 },

  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  priorityBadgeText: { fontSize: 11, fontWeight: "700" },

  cardAddress: { fontSize: 13, color: "#6B7280" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 12, fontWeight: "700" },

  cardTech: { fontSize: 13, flex: 1, textAlign: "right", color: "#6B7280" },
  cardTechUnassigned: { fontSize: 13, flex: 1, textAlign: "right", color: "#EF4444" },
  cardRef: { fontSize: 12, color: "#9CA3AF" },
  cardTime: { fontSize: 12, color: "#9CA3AF" },
  cardChevronWrap: { alignSelf: "center", marginRight: 12 },

  // Empty state
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: WIDGET_SURFACE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF" },
});
