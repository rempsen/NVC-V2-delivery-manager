/**
 * Agent Home Screen
 *
 * For field technicians: shows their assigned/active jobs,
 * today's stats, and quick access to task workflow.
 * No map of other agents — this is the agent-only view.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
  TextStyle,
  Linking,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";
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

// ─── Status ordering for agent view ──────────────────────────────────────────

const AGENT_STATUS_ORDER: Record<string, number> = {
  on_site: 0,
  en_route: 1,
  assigned: 2,
  unassigned: 3,
  completed: 4,
  failed: 5,
  cancelled: 6,
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconBg, { backgroundColor: color + "15" }]}>
        <IconSymbol name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const statusColor = STATUS_COLORS[task.status] ?? NVC_BLUE;
  const priorityColor = PRIORITY_COLORS[task.priority] ?? "#9CA3AF";
  const isActive = task.status === "on_site" || task.status === "en_route";

  const timeLabel = useMemo(() => {
    if (task.scheduledAt) {
      const d = new Date(task.scheduledAt);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    const diff = Date.now() - new Date(task.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }, [task.scheduledAt, task.createdAt]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.jobCard,
        isActive && styles.jobCardActive,
        pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Left accent bar */}
      <View style={[styles.jobAccent, { backgroundColor: statusColor }]} />

      <View style={styles.jobContent}>
        {/* Top row: customer + status */}
        <View style={styles.jobTopRow}>
          <Text style={styles.jobCustomer} numberOfLines={1}>{task.customerName}</Text>
          <View style={[styles.jobStatusPill, { backgroundColor: statusColor + "18" }]}>
            <View style={[styles.jobStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.jobStatusText, { color: statusColor }]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.jobAddressRow}>
          <IconSymbol name="location.fill" size={12} color="#9CA3AF" />
          <Text style={styles.jobAddress} numberOfLines={1}>{task.jobAddress}</Text>
        </View>

        {/* Bottom row: ref + priority + time */}
        <View style={styles.jobBottomRow}>
          {task.orderRef ? (
            <Text style={styles.jobRef}>{task.orderRef}</Text>
          ) : (
            <Text style={styles.jobRef}>#{task.id}</Text>
          )}
          <View style={[styles.jobPriorityBadge, { backgroundColor: priorityColor + "15" }]}>
            <Text style={[styles.jobPriorityText, { color: priorityColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.jobTime}>{timeLabel}</Text>
        </View>
      </View>

      {/* Chevron */}
      <View style={styles.jobChevron}>
        <IconSymbol name="chevron.right" size={14} color="#D1D5DB" />
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgentHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenantId, isDemo } = useTenant();
  const [refreshing, setRefreshing] = useState(false);

  // ── Real API query ───────────────────────────────────────────────────────────
  const { data: apiTasks, isLoading, refetch } = trpc.tasks.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: !isDemo && tenantId !== null, staleTime: 30_000 },
  );

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

  // Sort by priority: active jobs first
  const sortedTasks = useMemo(() =>
    [...allTasks].sort((a, b) => {
      const oa = AGENT_STATUS_ORDER[a.status] ?? 99;
      const ob = AGENT_STATUS_ORDER[b.status] ?? 99;
      return oa !== ob ? oa - ob : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [allTasks]);

  // Stats
  const stats = useMemo(() => ({
    active: allTasks.filter((t) => t.status === "on_site" || t.status === "en_route").length,
    assigned: allTasks.filter((t) => t.status === "assigned").length,
    completed: allTasks.filter((t) => t.status === "completed").length,
    total: allTasks.length,
  }), [allTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <JobCard
      task={item}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/agent-task/${item.id}` as any);
      }}
    />
  ), [router]);

  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Active" value={stats.active} color="#8B5CF6" icon="car.fill" />
        <StatCard label="Assigned" value={stats.assigned} color={NVC_BLUE} icon="briefcase.fill" />
        <StatCard label="Done Today" value={stats.completed} color="#22C55E" icon="checkmark.circle.fill" />
      </View>

      {/* Section label */}
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>My Jobs</Text>
        <Text style={styles.sectionCount}>{sortedTasks.length} total</Text>
      </View>
    </View>
  ), [stats, sortedTasks.length]);

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360 2.0</Text>
            <Text style={styles.headerTitle}>My Jobs</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/(tabs)" as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="house.fill" size={18} color="#fff" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/settings" as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="gearshape.fill" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Active Job Banner (if any) ── */}
      {stats.active > 0 && (
        <View style={styles.activeBanner}>
          <View style={styles.activeBannerDot} />
          <Text style={styles.activeBannerText}>
            {stats.active} active job{stats.active > 1 ? "s" : ""} in progress
          </Text>
          <Pressable
            style={({ pressed }) => [styles.activeBannerBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              const activeTask = sortedTasks.find(
                (t) => t.status === "on_site" || t.status === "en_route",
              );
              if (activeTask) router.push(`/agent-task/${activeTask.id}` as any);
            }}
          >
            <Text style={styles.activeBannerBtnText}>Open</Text>
            <IconSymbol name="chevron.right" size={12} color={NVC_BLUE} />
          </Pressable>
        </View>
      )}

      {/* ── Job List ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
          <Text style={styles.loadingText}>Loading your jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={NVC_BLUE}
              colors={[NVC_BLUE]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="checkmark.circle.fill" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No jobs assigned</Text>
              <Text style={styles.emptySubtitle}>
                Your dispatcher will assign jobs to you here.
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: NVC_BLUE,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as ViewStyle,
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  } as TextStyle,
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  } as TextStyle,
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Active banner
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: NVC_BLUE + "10",
    borderBottomWidth: 1,
    borderBottomColor: NVC_BLUE + "20",
    paddingHorizontal: 16,
    paddingVertical: 10,
  } as ViewStyle,
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  } as ViewStyle,
  activeBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  } as TextStyle,
  activeBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: NVC_BLUE + "15",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  } as ViewStyle,
  activeBannerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: NVC_BLUE,
  } as TextStyle,

  // List
  listContent: {
    paddingTop: 0,
  },
  listHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 14,
  } as ViewStyle,

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  } as ViewStyle,
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  } as ViewStyle,
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  } as TextStyle,
  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  } as TextStyle,

  // Section label
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  } as TextStyle,
  sectionCount: {
    fontSize: 12,
    color: "#9CA3AF",
  } as TextStyle,

  // Job card
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  jobCardActive: {
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#8B5CF620",
  } as ViewStyle,
  jobAccent: {
    width: 4,
    alignSelf: "stretch",
  } as ViewStyle,
  jobContent: {
    flex: 1,
    padding: 12,
    gap: 5,
  } as ViewStyle,
  jobTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  jobCustomer: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  } as TextStyle,
  jobStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  jobStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  } as ViewStyle,
  jobStatusText: {
    fontSize: 10,
    fontWeight: "700",
  } as TextStyle,
  jobAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  } as ViewStyle,
  jobAddress: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
  } as TextStyle,
  jobBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  } as ViewStyle,
  jobRef: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  } as TextStyle,
  jobPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  } as ViewStyle,
  jobPriorityText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  } as TextStyle,
  jobTime: {
    flex: 1,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  } as TextStyle,
  jobChevron: {
    paddingRight: 12,
    paddingLeft: 4,
  } as ViewStyle,

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  } as ViewStyle,
  loadingText: {
    fontSize: 14,
    color: "#9CA3AF",
  } as TextStyle,

  // Empty
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  } as TextStyle,
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  } as TextStyle,
});
