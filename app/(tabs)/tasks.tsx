import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";
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

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
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
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.cardBar, { backgroundColor: statusColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardCustomer, { color: colors.foreground }]} numberOfLines={1}>
            {task.customerName}
          </Text>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        </View>
        <Text style={[styles.cardAddress, { color: colors.muted }]} numberOfLines={1}>
          {task.jobAddress}
        </Text>
        <View style={styles.cardRow}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
          {task.technicianName ? (
            <Text style={[styles.cardTech, { color: colors.muted }]} numberOfLines={1}>
              {task.technicianName}
            </Text>
          ) : (
            <Text style={[styles.cardTech, { color: "#EF4444" }]}>Unassigned</Text>
          )}
        </View>
        <View style={styles.cardRow}>
          {task.orderRef && (
            <Text style={[styles.cardRef, { color: colors.muted }]}>{task.orderRef}</Text>
          )}
          <Text style={[styles.cardTime, { color: colors.muted }]}>{timeAgo}</Text>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} style={styles.cardChevron} />
    </Pressable>
  );
}

export default function TasksScreen() {
  const colors = useColors();
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

  return (
    <ScreenContainer edges={["left", "right"]}>
      <View style={[styles.header, { backgroundColor: NVC_BLUE, paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Work Orders</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/create-task")}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search orders, customers, technicians..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <IconSymbol name="xmark" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const isActive = filter === item.key;
          const count =
            item.key === "all"
              ? MOCK_TASKS.length
              : MOCK_TASKS.filter((t) => t.status === item.key).length;
          return (
            <Pressable
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? NVC_BLUE : colors.surface,
                  borderColor: isActive ? NVC_BLUE : colors.border,
                },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterTabText, { color: isActive ? "#fff" : colors.muted }]}>
                {item.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : colors.border },
                  ]}
                >
                  <Text style={[styles.filterCountText, { color: isActive ? "#fff" : colors.muted }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No work orders found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={() => router.push(`/task/${item.id}` as any)} />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 30, height: 30, borderRadius: 6 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterList: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  filterTabText: { fontSize: 13, fontWeight: "600" },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  filterCountText: { fontSize: 11, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardBar: { width: 5 },
  cardBody: { flex: 1, padding: 12, gap: 5 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardCustomer: { fontSize: 15, fontWeight: "700", flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  cardAddress: { fontSize: 12 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  cardTech: { fontSize: 12, flex: 1, textAlign: "right" },
  cardRef: { fontSize: 11 },
  cardTime: { fontSize: 11 },
  cardChevron: { alignSelf: "center", marginRight: 10 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "500" },
});
