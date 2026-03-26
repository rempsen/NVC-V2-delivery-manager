import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_BLUE_DARK, NVC_ORANGE, NVC_LOGO_DARK, STATUS_COLORS as BRAND_STATUS_COLORS } from "@/constants/brand";
import {
  MOCK_TASKS,
  MOCK_TECHNICIANS,
  STATUS_COLORS,
  STATUS_LABELS,
  TECH_STATUS_COLORS,
  TECH_STATUS_LABELS,
  type Task,
  type Technician,
} from "@/lib/nvc-types";

// ─── Create New Sheet ─────────────────────────────────────────────────────────

const CREATE_OPTIONS = [
  { label: "Work Order", icon: "doc.badge.plus", color: "#E85D04", route: "/create-task" },
  { label: "Report", icon: "chart.bar.doc.horizontal", color: "#3B82F6", route: "/create-task" },
  { label: "Photo Log", icon: "camera.fill", color: "#8B5CF6", route: "/create-task" },
  { label: "Time Log", icon: "clock.fill", color: "#22C55E", route: "/create-task" },
  { label: "Field Note", icon: "note.text", color: "#F59E0B", route: "/create-task" },
  { label: "Internal Message", icon: "bubble.left.fill", color: "#06B6D4", route: "/messages/new" },
  { label: "Accounting Message", icon: "dollarsign.circle.fill", color: "#10B981", route: "/messages/new" },
];

function CreateNewSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Create New</Text>
        <View style={styles.sheetGrid}>
          {CREATE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              style={({ pressed }) => [
                styles.sheetOption,
                { backgroundColor: opt.color + "15", borderColor: opt.color + "30", opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => {
                onClose();
                router.push(opt.route as any);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: opt.color + "25" }]}>
                <IconSymbol name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <Text style={[styles.sheetOptionLabel, { color: colors.foreground }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <TouchableOpacity style={[styles.sheetCancel, { backgroundColor: colors.border }]} onPress={onClose}>
          <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Compact Metric Card (6-up grid) ─────────────────────────────────────────

function MetricCard({
  label,
  value,
  color,
  icon,
  isCreateNew,
  onPress,
}: {
  label: string;
  value?: number | string;
  color: string;
  icon: any;
  isCreateNew?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricCard,
        isCreateNew
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        { opacity: pressed ? 0.82 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.metricIcon, { backgroundColor: isCreateNew ? "rgba(255,255,255,0.25)" : color + "20" }]}>
        <IconSymbol name={icon} size={16} color={isCreateNew ? "#fff" : color} />
      </View>
      {isCreateNew ? (
        <Text style={[styles.metricCreateLabel, { color: "#fff" }]}>{label}</Text>
      ) : (
        <>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ─── Compact Task Row ─────────────────────────────────────────────────────────

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[task.status];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskRow,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.taskStatusBar, { backgroundColor: statusColor }]} />
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskCustomer, { color: colors.foreground }]} numberOfLines={1}>
            {task.customerName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
        </View>
        <Text style={[styles.taskAddress, { color: colors.muted }]} numberOfLines={1}>
          {task.jobAddress}
        </Text>
        {task.technicianName && (
          <Text style={[styles.taskTech, { color: colors.muted }]}>
            <Text style={{ color: colors.primary }}>● </Text>
            {task.technicianName}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Tech Chip ────────────────────────────────────────────────────────────────

function TechChip({ tech, onPress }: { tech: Technician; onPress: () => void }) {
  const colors = useColors();
  const statusColor = TECH_STATUS_COLORS[tech.status];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.techChip,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.techAvatar, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.techInitial, { color: colors.primary }]}>
          {tech.name.charAt(0)}
        </Text>
      </View>
      <View style={[styles.techStatusDot, { backgroundColor: statusColor }]} />
      <Text style={[styles.techChipName, { color: colors.foreground }]} numberOfLines={1}>
        {tech.name.split(" ")[0]}
      </Text>
      <Text style={[styles.techChipStatus, { color: statusColor }]}>
        {TECH_STATUS_LABELS[tech.status]}
      </Text>
    </Pressable>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);

  const tasks = MOCK_TASKS;
  const technicians = MOCK_TECHNICIANS;

  const activeTasks = tasks.filter((t) => ["assigned", "en_route", "on_site"].includes(t.status));
  const completedToday = tasks.filter((t) => t.status === "completed").length;
  const unassigned = tasks.filter((t) => t.status === "unassigned").length;
  const onlineTechs = technicians.filter((t) => t.status !== "offline").length;
  const enRoute = tasks.filter((t) => t.status === "en_route").length;

  // Show only 4 most recent tasks, no order ref
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const onlineTeam = technicians.filter((t) => t.status !== "offline");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  // Header top padding: push below Dynamic Island / notch
  const headerTopPadding = Math.max(insets.top + 8, 52);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header — pushed below notch/Dynamic Island ── */}
        <View style={[styles.header, { backgroundColor: NVC_BLUE, paddingTop: headerTopPadding }]}>
          <View style={styles.headerLeft}>
            <Image source={NVC_LOGO_DARK} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.headerGreeting}>Good morning, Dan</Text>
              <Text style={styles.headerTitle}>NVC360 Dispatch</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {}}
            >
              <IconSymbol name="bell.fill" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.createBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setCreateSheetVisible(true)}
            >
              <IconSymbol name="plus" size={15} color="#fff" />
              <Text style={styles.createBtnText}>New Order</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 6-up Compact Metrics Grid ── */}
        <View style={styles.section}>
          <View style={styles.metricsGrid}>
            <MetricCard label="Active Jobs" value={activeTasks.length} color="#F59E0B" icon="bolt.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Completed" value={completedToday} color="#22C55E" icon="checkmark.circle.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Unassigned" value={unassigned} color="#EF4444" icon="exclamationmark.triangle.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Online Techs" value={onlineTechs} color="#3B82F6" icon="person.2.fill" onPress={() => router.push("/agents")} />
            <MetricCard label="En Route" value={enRoute} color="#8B5CF6" icon="car.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Create New" color="#E85D04" icon="plus.circle.fill" isCreateNew onPress={() => setCreateSheetVisible(true)} />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContent}>
              {[
                { label: "Dispatcher", icon: "map.fill", route: "/dispatcher", color: "#3B82F6" },
                { label: "Technicians", icon: "person.2.fill", route: "/agents", color: "#8B5CF6" },
                { label: "Integrations", icon: "arrow.triangle.2.circlepath", route: "/integrations", color: "#22C55E" },
                { label: "Super Admin", icon: "building.2.fill", route: "/super-admin", color: "#E85D04" },
                { label: "Track Demo", icon: "location.fill", route: "/track/JH-2026-8821", color: "#06B6D4" },
                { label: "Settings", icon: "gearshape.fill", route: "/settings", color: "#F59E0B" },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  style={({ pressed }) => [
                    styles.quickAction,
                    { backgroundColor: action.color + "15", borderColor: action.color + "35", opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() => router.push(action.route as any)}
                >
                  <IconSymbol name={action.icon as any} size={18} color={action.color} />
                  <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Online Team ── */}
        {onlineTeam.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Field Team</Text>
            <Pressable onPress={() => router.push("/agents")}>
              <Text style={[styles.seeAll, { color: NVC_BLUE }]}>See All</Text>
            </Pressable>
          </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {onlineTeam.map((tech) => (
                <TechChip
                  key={tech.id}
                  tech={tech}
                  onPress={() => router.push(`/agent/${tech.id}` as any)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recent Work Orders (4 items, no WO number) ── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Work Orders</Text>
            <Pressable onPress={() => router.push("/tasks")}>
              <Text style={[styles.seeAll, { color: NVC_BLUE }]}>See All</Text>
            </Pressable>
          </View>
          {recentTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Create New Bottom Sheet ── */}
      <CreateNewSheet visible={createSheetVisible} onClose={() => setCreateSheetVisible(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 6 },
  headerGreeting: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifBtn: { padding: 6 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 16 },
  lastSection: { paddingBottom: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  seeAll: { fontSize: 12, fontWeight: "600" },

  // 6-up Metrics Grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: {
    width: "31%",
    flexGrow: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 4,
    minHeight: 80,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricLabel: { fontSize: 10, fontWeight: "500" },
  metricCreateLabel: { fontSize: 11, fontWeight: "700", marginTop: 2 },

  // Quick Actions
  quickActionsRow: { marginTop: 10 },
  quickActionsContent: { paddingRight: 4, gap: 8 },
  quickAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    minWidth: 76,
  },
  quickActionLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  // Tech Chips
  techChip: {
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 7,
    minWidth: 66,
    gap: 2,
  },
  techAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { fontSize: 13, fontWeight: "700" },
  techStatusDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  techChipName: { fontSize: 10, fontWeight: "600" },
  techChipStatus: { fontSize: 9, fontWeight: "500" },

  // Compact Task Rows
  taskRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    overflow: "hidden",
  },
  taskStatusBar: { width: 3 },
  taskContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskCustomer: { fontSize: 13, fontWeight: "700", flex: 1, marginRight: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  taskAddress: { fontSize: 11 },
  taskTech: { fontSize: 11 },

  // Create New Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  sheetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  sheetOption: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOptionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  sheetCancel: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetCancelText: { fontSize: 15, fontWeight: "700" },
});
