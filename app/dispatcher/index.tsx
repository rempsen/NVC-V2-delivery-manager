import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  FlatList,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  MOCK_TASKS,
  MOCK_TECHNICIANS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  type Technician,
  type Task,
  type TaskStatus,
} from "@/lib/nvc-types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_WIDE = SCREEN_WIDTH >= 768;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: any;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Fleet Map (Simulated) ────────────────────────────────────────────────────

function FleetMap({
  technicians,
  selectedId,
  onSelect,
}: {
  technicians: Technician[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const colors = useColors();
  const STATUS_DOT: Record<string, string> = {
    online: "#22C55E",
    busy: "#F59E0B",
    offline: "#94A3B8",
    on_break: "#3B82F6",
  };

  // Simulate a map using a dark background with technician pins
  return (
    <View style={[styles.mapContainer, { backgroundColor: "#0d1b2a" }]}>
      {/* Map grid lines */}
      {[...Array(6)].map((_, i) => (
        <View
          key={`h${i}`}
          style={[styles.mapGridH, { top: `${(i + 1) * 14}%` as any, borderColor: "#ffffff08" }]}
        />
      ))}
      {[...Array(8)].map((_, i) => (
        <View
          key={`v${i}`}
          style={[styles.mapGridV, { left: `${(i + 1) * 11}%` as any, borderColor: "#ffffff08" }]}
        />
      ))}

      {/* Road lines */}
      <View style={[styles.mapRoad, { top: "35%", backgroundColor: "#1e3a5f" }]} />
      <View style={[styles.mapRoad, { top: "60%", backgroundColor: "#1e3a5f" }]} />
      <View style={[styles.mapRoadV, { left: "30%", backgroundColor: "#1e3a5f" }]} />
      <View style={[styles.mapRoadV, { left: "65%", backgroundColor: "#1e3a5f" }]} />

      {/* Technician pins */}
      {technicians.map((tech) => {
        // Normalize lat/lng to screen position (Winnipeg area: ~49.8-49.9 lat, -97.1 to -97.2 lng)
        const x = ((tech.longitude + 97.25) / 0.25) * 80 + 5;
        const y = ((tech.latitude - 49.85) / 0.1) * 70 + 10;
        const dotColor = STATUS_DOT[tech.status] ?? "#94A3B8";
        const isSelected = selectedId === tech.id;

        return (
          <Pressable
            key={tech.id}
            style={[
              styles.techPin,
              {
                left: `${Math.max(5, Math.min(90, x))}%` as any,
                top: `${Math.max(5, Math.min(85, y))}%` as any,
                backgroundColor: isSelected ? dotColor : dotColor + "CC",
                borderColor: isSelected ? "#fff" : "transparent",
                borderWidth: isSelected ? 2 : 0,
                transform: [{ scale: isSelected ? 1.3 : 1 }],
              },
            ]}
            onPress={() => onSelect(tech.id)}
          >
            <Text style={styles.techPinText}>{tech.name.charAt(0)}</Text>
          </Pressable>
        );
      })}

      {/* Map label */}
      <View style={styles.mapLabel}>
        <IconSymbol name="map.fill" size={12} color="rgba(255,255,255,0.4)" />
        <Text style={styles.mapLabelText}>Live Fleet Map · Winnipeg, MB</Text>
      </View>

      {/* Legend */}
      <View style={[styles.mapLegend, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status.replace("_", " ")}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Technician Panel ─────────────────────────────────────────────────────────

function TechnicianPanel({
  technician,
  onClose,
  onMessage,
  onViewTasks,
}: {
  technician: Technician;
  onClose: () => void;
  onMessage: () => void;
  onViewTasks: () => void;
}) {
  const colors = useColors();
  const STATUS_DOT: Record<string, string> = {
    online: "#22C55E",
    busy: "#F59E0B",
    offline: "#94A3B8",
    on_break: "#3B82F6",
  };
  const dotColor = STATUS_DOT[technician.status] ?? "#94A3B8";
  const activeTasks = MOCK_TASKS.filter(
    (t) => t.technicianId === technician.id && (t.status === "en_route" || t.status === "on_site"),
  );

  return (
    <View style={[styles.techPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.techPanelHeader}>
        <View style={[styles.techPanelAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.techPanelInitial, { color: colors.primary }]}>
            {technician.name.charAt(0)}
          </Text>
        </View>
        <View style={styles.techPanelInfo}>
          <Text style={[styles.techPanelName, { color: colors.foreground }]}>{technician.name}</Text>
          <View style={styles.techPanelStatusRow}>
            <View style={[styles.techPanelDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.techPanelStatus, { color: dotColor }]}>
              {technician.status.replace("_", " ")}
            </Text>
          </View>
          <Text style={[styles.techPanelPhone, { color: colors.muted }]}>{technician.phone}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onClose}
        >
          <IconSymbol name="xmark" size={16} color={colors.muted} />
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.techPanelStats}>
        <View style={[styles.techStat, { backgroundColor: colors.background }]}>
          <Text style={[styles.techStatVal, { color: colors.primary }]}>{technician.todayJobs}</Text>
          <Text style={[styles.techStatLabel, { color: colors.muted }]}>Jobs Today</Text>
        </View>
        <View style={[styles.techStat, { backgroundColor: colors.background }]}>
          <Text style={[styles.techStatVal, { color: "#22C55E" }]}>{technician.todayDistanceKm}km</Text>
          <Text style={[styles.techStatLabel, { color: colors.muted }]}>Distance</Text>
        </View>
        <View style={[styles.techStat, { backgroundColor: colors.background }]}>
          <Text style={[styles.techStatVal, { color: "#F59E0B" }]}>{activeTasks.length}</Text>
          <Text style={[styles.techStatLabel, { color: colors.muted }]}>Active</Text>
        </View>
      </View>

      {/* Active Task */}
      {activeTasks.length > 0 && (
        <View style={[styles.activeTaskCard, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
          <Text style={[styles.activeTaskLabel, { color: "#F59E0B" }]}>CURRENT JOB</Text>
          <Text style={[styles.activeTaskCustomer, { color: colors.foreground }]}>
            {activeTasks[0].customerName}
          </Text>
          <Text style={[styles.activeTaskAddress, { color: colors.muted }]} numberOfLines={1}>
            {activeTasks[0].jobAddress}
          </Text>
          <Text style={[styles.activeTaskStatus, { color: STATUS_COLORS[activeTasks[0].status] }]}>
            {STATUS_LABELS[activeTasks[0].status]}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.techPanelActions}>
        <Pressable
          style={({ pressed }) => [
            styles.techActionBtn,
            { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onMessage}
        >
          <IconSymbol name="message.fill" size={16} color="#22C55E" />
          <Text style={[styles.techActionText, { color: "#22C55E" }]}>Message</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.techActionBtn,
            { backgroundColor: colors.primary + "20", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onViewTasks}
        >
          <IconSymbol name="list.bullet" size={16} color={colors.primary} />
          <Text style={[styles.techActionText, { color: colors.primary }]}>View Tasks</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
  const sc = STATUS_COLORS[task.status];
  const pc = PRIORITY_COLORS[task.priority];
  const hasFlaggedNote = false; // Would come from real data

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskRow,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.taskStatusBar, { backgroundColor: sc }]} />
      <View style={styles.taskRowContent}>
        <View style={styles.taskRowTop}>
          <Text style={[styles.taskCustomer, { color: colors.foreground }]} numberOfLines={1}>
            {task.customerName}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: pc + "20" }]}>
            <Text style={[styles.priorityText, { color: pc }]}>{task.priority.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.taskAddress, { color: colors.muted }]} numberOfLines={1}>
          {task.jobAddress}
        </Text>
        <View style={styles.taskRowBottom}>
          <Text style={[styles.taskStatusText, { color: sc }]}>{STATUS_LABELS[task.status]}</Text>
          {task.technicianName && (
            <Text style={[styles.taskTech, { color: colors.muted }]}>· {task.technicianName}</Text>
          )}
          {hasFlaggedNote && (
            <View style={[styles.flaggedBadge, { backgroundColor: "#EF444420" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={10} color="#EF4444" />
              <Text style={[styles.flaggedText, { color: "#EF4444" }]}>Note</Text>
            </View>
          )}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "en_route", label: "En Route" },
  { key: "on_site", label: "On Site" },
  { key: "completed", label: "Done" },
];

export default function DispatcherDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTask, setShowCreateTask] = useState(false);

  const selectedTech = selectedTechId
    ? MOCK_TECHNICIANS.find((t) => t.id === selectedTechId) ?? null
    : null;

  const filteredTasks = MOCK_TASKS.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.jobAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.technicianName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const activeCount = MOCK_TASKS.filter(
    (t) => t.status === "en_route" || t.status === "on_site",
  ).length;
  const unassignedCount = MOCK_TASKS.filter((t) => t.status === "unassigned").length;
  const completedCount = MOCK_TASKS.filter((t) => t.status === "completed").length;
  const onlineTechs = MOCK_TECHNICIANS.filter(
    (t) => t.status === "online" || t.status === "busy",
  ).length;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dispatcher Dashboard</Text>
          <Text style={styles.headerSub}>NVC360 · Live Operations</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.newTaskBtn,
            { backgroundColor: "rgba(255,255,255,0.2)", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.push("/create-task" as any)}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.newTaskBtnText}>New Order</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Active Jobs" value={activeCount} color="#F59E0B" icon="bolt.fill" />
          <StatCard label="Unassigned" value={unassignedCount} color="#EF4444" icon="exclamationmark.circle.fill" />
          <StatCard label="Completed" value={completedCount} color="#22C55E" icon="checkmark.circle.fill" />
          <StatCard label="Online Techs" value={onlineTechs} color="#3B82F6" icon="person.fill.checkmark" />
          <StatCard label="Total Today" value={MOCK_TASKS.length} color="#8B5CF6" icon="list.bullet" />
        </ScrollView>

        {/* Fleet Map */}
        <View style={styles.mapSection}>
          <View style={styles.mapSectionHeader}>
            <Text style={[styles.mapSectionTitle, { color: colors.foreground }]}>Live Fleet</Text>
            <View style={styles.mapSectionRight}>
              <View style={[styles.liveBadge, { backgroundColor: "#22C55E20", borderColor: "#22C55E40" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.liveText, { color: "#22C55E" }]}>LIVE</Text>
              </View>
            </View>
          </View>
          <FleetMap
            technicians={MOCK_TECHNICIANS}
            selectedId={selectedTechId}
            onSelect={(id) => setSelectedTechId(selectedTechId === id ? null : id)}
          />
          {/* Technician chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.techChipScroll}>
            {MOCK_TECHNICIANS.map((tech) => {
              const isSelected = selectedTechId === tech.id;
              const dotColors: Record<string, string> = {
                online: "#22C55E",
                busy: "#F59E0B",
                offline: "#94A3B8",
                on_break: "#3B82F6",
              };
              const dc = dotColors[tech.status] ?? "#94A3B8";
              return (
                <Pressable
                  key={tech.id}
                  style={[
                    styles.techChip,
                    {
                      backgroundColor: isSelected ? colors.primary + "20" : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTechId(isSelected ? null : tech.id)}
                >
                  <View style={[styles.techChipDot, { backgroundColor: dc }]} />
                  <Text style={[styles.techChipName, { color: isSelected ? colors.primary : colors.foreground }]}>
                    {tech.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Technician Panel */}
        {selectedTech && (
          <TechnicianPanel
            technician={selectedTech}
            onClose={() => setSelectedTechId(null)}
            onMessage={() => router.push(`/messages/1` as any)}
            onViewTasks={() => router.push(`/agent/${selectedTech.id}` as any)}
          />
        )}

        {/* Task List */}
        <View style={styles.taskListSection}>
          <View style={styles.taskListHeader}>
            <Text style={[styles.taskListTitle, { color: colors.foreground }]}>Work Orders</Text>
            <Text style={[styles.taskListCount, { color: colors.muted }]}>
              {filteredTasks.length} showing
            </Text>
          </View>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search by customer, address, or technician..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* Status Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {STATUS_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: statusFilter === f.key ? colors.primary : colors.surface,
                    borderColor: statusFilter === f.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: statusFilter === f.key ? "#fff" : colors.muted },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Tasks */}
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No work orders found</Text>
            </View>
          ) : (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}` as any)}
              />
            ))
          )}
        </View>

        {/* Integration Shortcuts */}
        <View style={[styles.integrationsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.integrationsTitle, { color: colors.foreground }]}>Integrations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { name: "QuickBooks", icon: "dollarsign.circle.fill" as const, color: "#22C55E" },
              { name: "Xero", icon: "chart.bar.fill" as const, color: "#3B82F6" },
              { name: "CompanyCam", icon: "camera.fill" as const, color: "#8B5CF6" },
              { name: "Google Cal", icon: "calendar.badge.clock" as const, color: "#EF4444" },
              { name: "Office 365", icon: "envelope.fill" as const, color: "#F59E0B" },
            ].map((intg) => (
              <Pressable
                key={intg.name}
                style={({ pressed }) => [
                  styles.integrationChip,
                  { backgroundColor: intg.color + "15", borderColor: intg.color + "30", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {}}
              >
                <IconSymbol name={intg.icon} size={16} color={intg.color} />
                <Text style={[styles.integrationName, { color: intg.color }]}>{intg.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  newTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  newTaskBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  scroll: { paddingBottom: 40 },
  statsScroll: { marginTop: 12 },
  statsContent: { paddingHorizontal: 16, gap: 10 },
  statCard: {
    width: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  mapSection: { margin: 16, marginTop: 12 },
  mapSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mapSectionTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  mapSectionRight: { flexDirection: "row", gap: 8 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "800" },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  mapGridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
  },
  mapGridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    borderLeftWidth: 1,
  },
  mapRoad: { position: "absolute", left: 0, right: 0, height: 4 },
  mapRoadV: { position: "absolute", top: 0, bottom: 0, width: 4 },
  techPin: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -14,
    marginTop: -14,
  },
  techPinText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  mapLabel: {
    position: "absolute",
    bottom: 8,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapLabelText: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
  mapLegend: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: "rgba(255,255,255,0.6)", fontSize: 9 },
  techChipScroll: { marginTop: 10 },
  techChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  techChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  techChipName: { fontSize: 13, fontWeight: "600" },
  techPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  techPanelHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  techPanelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  techPanelInitial: { fontSize: 18, fontWeight: "800" },
  techPanelInfo: { flex: 1 },
  techPanelName: { fontSize: 15, fontWeight: "700" },
  techPanelStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  techPanelDot: { width: 7, height: 7, borderRadius: 3.5 },
  techPanelStatus: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  techPanelPhone: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 4 },
  techPanelStats: { flexDirection: "row", gap: 8 },
  techStat: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  techStatVal: { fontSize: 18, fontWeight: "800" },
  techStatLabel: { fontSize: 10, fontWeight: "600" },
  activeTaskCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  activeTaskLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  activeTaskCustomer: { fontSize: 14, fontWeight: "700" },
  activeTaskAddress: { fontSize: 12 },
  activeTaskStatus: { fontSize: 12, fontWeight: "600" },
  techPanelActions: { flexDirection: "row", gap: 10 },
  techActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  techActionText: { fontSize: 13, fontWeight: "700" },
  taskListSection: { marginHorizontal: 16, marginTop: 4 },
  taskListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  taskListTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  taskListCount: { fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  taskStatusBar: { width: 4, alignSelf: "stretch" },
  taskRowContent: { flex: 1, padding: 12, gap: 3 },
  taskRowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskCustomer: { flex: 1, fontSize: 14, fontWeight: "700" },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: "800" },
  taskAddress: { fontSize: 12 },
  taskRowBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskStatusText: { fontSize: 12, fontWeight: "600" },
  taskTech: { fontSize: 12 },
  flaggedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  flaggedText: { fontSize: 9, fontWeight: "700" },
  integrationsCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  integrationsTitle: { fontSize: 14, fontWeight: "700" },
  integrationChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    gap: 6,
  },
  integrationName: { fontSize: 12, fontWeight: "700" },
});
