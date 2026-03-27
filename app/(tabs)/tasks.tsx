import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
  TextStyle,
  ScrollView,
  useWindowDimensions,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

const FILTERS: { key: "all" | TaskStatus; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "assigned",   label: "Assigned" },
  { key: "en_route",   label: "En Route" },
  { key: "on_site",    label: "On Site" },
  { key: "completed",  label: "Done" },
  { key: "failed",     label: "Failed" },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low", medium: "Med", high: "High", urgent: "Urgent",
};

// ─── Task Grid Card ───────────────────────────────────────────────────────────

function TaskGridCard({
  task,
  onPress,
  cardWidth,
}: {
  task: Task;
  onPress: () => void;
  cardWidth: number;
}) {
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

  // Customer initials for avatar
  const initials = task.customerName
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        { width: cardWidth, opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.97 }] : [] },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Top accent bar */}
      <View style={[styles.gridCardAccent, { backgroundColor: statusColor }] as ViewStyle[]} />

      <View style={styles.gridCardBody}>
        {/* Avatar + priority badge row */}
        <View style={styles.gridCardTopRow}>
          <View style={[styles.gridAvatar, { backgroundColor: statusColor + "18" }] as ViewStyle[]}>
            <Text style={[styles.gridAvatarText, { color: statusColor }] as TextStyle[]}>{initials}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20", borderColor: priorityColor + "40" }] as ViewStyle[]}>
            <Text style={[styles.priorityBadgeText, { color: priorityColor }] as TextStyle[]}>
              {PRIORITY_LABELS[task.priority] ?? task.priority}
            </Text>
          </View>
        </View>

        {/* Customer name */}
        <Text style={styles.gridCustomer} numberOfLines={2}>{task.customerName}</Text>

        {/* Address */}
        <View style={styles.gridAddressRow}>
          <IconSymbol name="location.fill" size={10} color="#9CA3AF" />
          <Text style={styles.gridAddress} numberOfLines={2}>{task.jobAddress}</Text>
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: statusColor + "18" }] as ViewStyle[]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }] as ViewStyle[]} />
          <Text style={[styles.statusPillText, { color: statusColor }] as TextStyle[]}>
            {STATUS_LABELS[task.status]}
          </Text>
        </View>

        {/* Technician */}
        <Text
          style={task.technicianName ? styles.gridTech : styles.gridTechUnassigned}
          numberOfLines={1}
        >
          {task.technicianName ?? "Unassigned"}
        </Text>

        {/* Scheduled date if set */}
        {task.scheduledAt && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <IconSymbol name="calendar" size={10} color="#6366F1" />
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#6366F1" }}>
              {new Date(task.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        )}

        {/* Footer: ref + time */}
        <View style={styles.gridFooter}>
          {task.orderRef ? (
            <Text style={styles.gridRef}>{task.orderRef}</Text>
          ) : (
            <View />
          )}
          <Text style={styles.gridTime}>{timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const { tenantId, isDemo } = useTenant();
  const [exportLoading, setExportLoading] = useState(false);

  // ── Export queries (lazy, triggered on demand) ──────────────────────────────
  const exportCsvQuery = trpc.export.workOrdersCsv.useQuery(
    { tenantId: tenantId ?? 0, status: filter === "all" ? undefined : filter },
    { enabled: false },
  );
  const exportPdfQuery = trpc.export.workOrdersPdf.useQuery(
    { tenantId: tenantId ?? 0, status: filter === "all" ? undefined : filter },
    { enabled: false },
  );

  const handleExport = useCallback(async (format: "csv" | "pdf") => {
    if (isDemo) { Alert.alert("Demo Mode", "Export is available with a live account."); return; }
    setExportLoading(true);
    try {
      const result = format === "csv"
        ? await exportCsvQuery.refetch()
        : await exportPdfQuery.refetch();
      const data = result.data;
      if (!data) throw new Error("No data returned");
      if (Platform.OS === "web") {
        if (format === "csv") {
          const blob = new Blob([(data as any).csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = (data as any).filename; a.click();
          URL.revokeObjectURL(url);
        } else {
          const byteChars = atob((data as any).pdfBase64);
          const bytes = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        }
      } else {
        Alert.alert("Export Ready", `${format.toUpperCase()} export generated. File: ${(data as any).filename}`);
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not generate export.");
    } finally {
      setExportLoading(false);
    }
  }, [isDemo, filter, exportCsvQuery, exportPdfQuery]);

  // Responsive columns: 2 on narrow mobile, 3 on wide/tablet, 4 on desktop
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const CARD_GAP = 10;
  const H_PAD = 12;
  const cardWidth = (width - H_PAD * 2 - CARD_GAP * (numColumns - 1)) / numColumns;

  // ── Real API query ──────────────────────────────────────────────────────────
  const { data: apiTasks, isLoading: apiLoading, refetch } = trpc.tasks.list.useQuery(
    { tenantId: tenantId ?? 0, status: filter === "all" ? undefined : filter },
    { enabled: !isDemo && tenantId !== null, staleTime: 30_000 },
  );

  // ── Normalize API tasks ─────────────────────────────────────────────────────
  const normalizedApiTasks: Task[] = useMemo(() => {
    if (!apiTasks) return [];
    return (apiTasks as any[]).map((t) => ({
      id: t.id,
      jobHash: t.jobHash ?? "",
      status: t.status as TaskStatus,
      priority: t.priority ?? "normal",
      customerName: t.customerName ?? "",
      customerPhone: t.customerPhone ?? "",
      customerEmail: t.customerEmail,
      jobAddress: t.jobAddress ?? "",
      jobLatitude: parseFloat(t.jobLatitude ?? "0"),
      jobLongitude: parseFloat(t.jobLongitude ?? "0"),
      pickupAddress: t.pickupAddress,
      description: t.description,
      orderRef: t.orderRef,
      technicianId: t.technicianId,
      technicianName: t.technicianName,
      technicianPhone: t.technicianPhone,
      customFields: t.customFields,
      scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString() : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    }));
  }, [apiTasks]);

  const allTasks = isDemo ? MOCK_TASKS : normalizedApiTasks;

  const filtered = useMemo(() => {
    let list = allTasks;
    if (isDemo && filter !== "all") list = list.filter((t) => t.status === filter);
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
  }, [allTasks, filter, search, isDemo]);

  const countFor = useCallback(
    (key: "all" | TaskStatus) =>
      key === "all" ? allTasks.length : allTasks.filter((t) => t.status === key).length,
    [allTasks],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskGridCard
        task={item}
        cardWidth={cardWidth}
        onPress={() => router.push(`/task/${item.id}` as any)}
      />
    ),
    [cardWidth, router],
  );

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 } as ViewStyle]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360 2.0</Text>
            <Text style={styles.headerTitle}>Work Orders</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{allTasks.length} total</Text>
          {exportLoading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.75 }] as ViewStyle[]}
                onPress={() => handleExport("csv")}
              >
                <IconSymbol name="square.and.arrow.down" size={13} color="#fff" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.exportBtn, { backgroundColor: "#DC2626" }, pressed && { opacity: 0.75 }] as ViewStyle[]}
                onPress={() => handleExport("pdf")}
              >
                <IconSymbol name="doc.fill" size={13} color="#fff" />
                <Text style={styles.exportBtnText}>PDF</Text>
              </Pressable>
            </>
          )}
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => router.push("/create-task")}
          >
            <IconSymbol name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>New Order</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={[styles.searchSection, { backgroundColor: "#1A5FA8" }] as ViewStyle[]}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused] as ViewStyle[]}>
          <IconSymbol name="magnifyingglass" size={15} color={search ? NVC_BLUE : "#9CA3AF"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customers, technicians..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={styles.clearBtn}>
                <IconSymbol name="xmark" size={10} color="#fff" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FILTERS.map((item) => {
            const isActive = filter === item.key;
            const count = countFor(item.key);
            return (
              <Pressable
                key={item.key}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                  },
                ] as ViewStyle[]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }] as TextStyle[]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)" }] as ViewStyle[]}>
                    <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }] as TextStyle[]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results bar ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "order" : "orders"}
          {search ? ` matching "${search}"` : ""}
        </Text>
        {(search || filter !== "all") && (
          <Pressable onPress={() => { setSearch(""); setFilter("all"); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </Pressable>
        )}
      </View>

      {/* ── Loading ── */}
      {!isDemo && apiLoading && (
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <ActivityIndicator size="small" color={NVC_BLUE} />
        </View>
      )}

      {/* ── Task Grid ── */}
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
            <RefreshControl refreshing={apiLoading} onRefresh={() => refetch()} tintColor={NVC_BLUE} />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <IconSymbol name="doc.text.fill" size={32} color="#C0C8D8" />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? "No matching orders" : filter !== "all" ? `No ${filter.replace("_", " ")} orders` : "No work orders yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search ? "Try a different search term" : filter !== "all" ? "Try a different status filter" : "Create your first work order to get started"}
            </Text>
            {!search && filter === "all" && (
              <Pressable
                style={({ pressed }) => [{ marginTop: 16, backgroundColor: NVC_BLUE, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, opacity: pressed ? 0.8 : 1, flexDirection: "row", alignItems: "center", gap: 6 }]}
                onPress={() => router.push("/create-task")}
              >
                <IconSymbol name="plus" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>Create Work Order</Text>
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

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 34, height: 34, borderRadius: 9 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, letterSpacing: -0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerCount: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, minHeight: 40,
    shadowColor: NVC_ORANGE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },

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
  clearBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#C0C8D8", alignItems: "center", justifyContent: "center" },

  // Filter bar
  filterBar: { backgroundColor: NVC_BLUE, paddingBottom: 12 },
  filterList: { paddingHorizontal: 14, paddingTop: 6, gap: 6 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, gap: 5, minHeight: 30,
  },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Results bar
  resultsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F1F5F9",
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  gridCardAccent: { height: 3, width: "100%" },
  gridCardBody: { padding: 12, gap: 6 },
  gridCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  gridAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  gridAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  priorityBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1.5,
  },
  priorityBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  gridCustomer: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A", letterSpacing: -0.2, lineHeight: 19 },
  gridAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  gridAddress: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", flex: 1, lineHeight: 16 },
  statusPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4, alignSelf: "flex-start",
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  gridTech: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#64748B" },
  gridTechUnassigned: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#DC2626" },
  gridFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  gridRef: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#94A3B8" },
  gridTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8" },

  // Empty state
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#1E293B", letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#94A3B8" },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#10B981", borderRadius: 8,
    paddingHorizontal: 11, paddingVertical: 8, minHeight: 34,
  } as ViewStyle,
  exportBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" } as TextStyle,
});
