import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
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

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  color,
  icon,
  onPress,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: any;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

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
        {task.orderRef && (
          <Text style={[styles.taskRef, { color: colors.muted }]}>{task.orderRef}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Online Tech Chip ─────────────────────────────────────────────────────────

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
  const [refreshing, setRefreshing] = useState(false);

  const tasks = MOCK_TASKS;
  const technicians = MOCK_TECHNICIANS;

  const activeTasks = tasks.filter((t) => ["assigned", "en_route", "on_site"].includes(t.status));
  const completedToday = tasks.filter((t) => t.status === "completed").length;
  const unassigned = tasks.filter((t) => t.status === "unassigned").length;
  const onlineTechs = technicians.filter((t) => t.status !== "offline").length;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const onlineTeam = technicians.filter((t) => t.status !== "offline");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.headerGreeting}>Good morning</Text>
            <Text style={styles.headerTitle}>NVC360 Dispatch</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {}}
            >
              <IconSymbol name="bell.fill" size={22} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.createBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/create-task")}
            >
              <IconSymbol name="plus" size={18} color="#fff" />
              <Text style={styles.createBtnText}>New Order</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Metrics ── */}
        <View style={styles.section}>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Active Jobs"
              value={activeTasks.length}
              color="#F59E0B"
              icon="bolt.fill"
              onPress={() => router.push("/tasks")}
            />
            <MetricCard
              label="Completed"
              value={completedToday}
              color="#22C55E"
              icon="checkmark.circle.fill"
              onPress={() => router.push("/tasks")}
            />
            <MetricCard
              label="Unassigned"
              value={unassigned}
              color="#EF4444"
              icon="exclamationmark.triangle.fill"
              onPress={() => router.push("/tasks")}
            />
            <MetricCard
              label="Online Techs"
              value={onlineTechs}
              color="#3B82F6"
              icon="person.2.fill"
              onPress={() => router.push("/agents")}
            />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
            {[
              { label: "New Work Order", icon: "doc.badge.plus", route: "/create-task", color: colors.primary },
              { label: "Dispatcher", icon: "map.fill", route: "/dispatcher", color: "#3B82F6" },
              { label: "Technicians", icon: "person.2.fill", route: "/agents", color: "#8B5CF6" },
              { label: "Integrations", icon: "arrow.triangle.2.circlepath", route: "/integrations", color: "#22C55E" },
              { label: "Super Admin", icon: "building.2.fill", route: "/super-admin", color: "#8B5CF6" },
              { label: "Track Demo", icon: "location.fill", route: "/track/JH-2026-8821", color: "#E85D04" },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.quickAction,
                  { backgroundColor: action.color + "15", borderColor: action.color + "40", opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => router.push(action.route as any)}
              >
                <IconSymbol name={action.icon as any} size={22} color={action.color} />
                <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Online Team ── */}
        {onlineTeam.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Field Team</Text>
              <Pressable onPress={() => router.push("/agents")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
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

        {/* ── Recent Work Orders ── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Work Orders</Text>
            <Pressable onPress={() => router.push("/tasks")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 16,
  },
  headerGreeting: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn: { padding: 8 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E85D04",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  lastSection: { paddingBottom: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 28, fontWeight: "800" },
  metricLabel: { fontSize: 12, fontWeight: "500" },
  quickActions: { marginHorizontal: -4 },
  quickAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 4,
    gap: 6,
    minWidth: 90,
  },
  quickActionLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  techChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 80,
    gap: 4,
  },
  techAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { fontSize: 18, fontWeight: "700" },
  techStatusDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  techChipName: { fontSize: 12, fontWeight: "600" },
  techChipStatus: { fontSize: 10, fontWeight: "500" },
  taskRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  taskStatusBar: { width: 4 },
  taskContent: { flex: 1, padding: 12, gap: 3 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskCustomer: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  taskAddress: { fontSize: 12, marginTop: 1 },
  taskTech: { fontSize: 12, marginTop: 2 },
  taskRef: { fontSize: 11, marginTop: 1 },
});
