import React, { useState, useCallback } from "react";
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
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT,
} from "@/constants/brand";
import {
  MOCK_TASKS, MOCK_TECHNICIANS,
  STATUS_COLORS, STATUS_LABELS, TECH_STATUS_COLORS, TECH_STATUS_LABELS,
  type Task, type Technician,
} from "@/lib/nvc-types";

// ─── Create New Sheet ─────────────────────────────────────────────────────────

const CREATE_OPTIONS = [
  { label: "Work Order", icon: "doc.badge.plus", color: "#E85D04", route: "/create-task" },
  { label: "Photo Log", icon: "camera.fill", color: "#8B5CF6", route: "/create-task" },
  { label: "Time Log", icon: "clock.fill", color: "#22C55E", route: "/create-task" },
  { label: "Field Note", icon: "pencil", color: "#F59E0B", route: "/create-task" },
  { label: "Message", icon: "message.fill", color: "#06B6D4", route: "/messages/new" },
  { label: "Invoice", icon: "dollarsign.circle.fill", color: "#10B981", route: "/create-task" },
];

function CreateNewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
              ] as ViewStyle[]}
              onPress={() => { onClose(); router.push(opt.route as any); }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: opt.color + "25" }] as ViewStyle[]}>
                <IconSymbol name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <Text style={[styles.sheetOptionLabel, { color: colors.foreground }] as TextStyle[]}>{opt.label}</Text>
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

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, icon, onPress }: {
  label: string; value?: number | string; color: string; icon: any; onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: color, opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }] },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Subtle inner highlight */}
      <View style={[StyleSheet.absoluteFillObject, styles.metricHighlight]} />
      <View style={styles.metricIconWrap}>
        <IconSymbol name={icon} size={15} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={styles.metricValue}>{value ?? ""}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Map Widget ───────────────────────────────────────────────────────────────

function MapWidget({ onPress }: { onPress: () => void }) {
  const techsOnMap = MOCK_TECHNICIANS.filter((t) => t.status !== "offline");
  return (
    <Pressable
      style={({ pressed }) => [styles.mapWidget, pressed && { opacity: 0.92 }] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Simulated map background */}
      <View style={styles.mapBg}>
        {/* Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <View key={`h${v}`} style={[styles.mapGridH, { top: `${v * 100}%` as any }]} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <View key={`v${v}`} style={[styles.mapGridV, { left: `${v * 100}%` as any }]} />
        ))}
        {/* Road lines */}
        <View style={[styles.mapRoad, { top: "35%", width: "100%" }]} />
        <View style={[styles.mapRoad, { top: "65%", width: "70%", left: "15%" }]} />
        <View style={[styles.mapRoadV, { left: "30%", height: "100%" }]} />
        <View style={[styles.mapRoadV, { left: "65%", height: "80%", top: "10%" }]} />
        {/* Tech pins */}
        {techsOnMap.slice(0, 6).map((tech, i) => {
          const positions = [
            { top: "28%", left: "22%" }, { top: "55%", left: "58%" },
            { top: "38%", left: "72%" }, { top: "70%", left: "35%" },
            { top: "20%", left: "48%" }, { top: "60%", left: "15%" },
          ];
          const pos = positions[i] ?? { top: "50%", left: "50%" };
          const color = TECH_STATUS_COLORS[tech.status] ?? "#9CA3AF";
          const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          return (
            <View key={tech.id} style={[styles.mapPin, pos as any]}>
              <View style={[styles.mapPinBubble, { backgroundColor: color }]}>
                <Text style={styles.mapPinText}>{initials}</Text>
              </View>
              <View style={[styles.mapPinTail, { borderTopColor: color }]} />
            </View>
          );
        })}
      </View>
      {/* Overlay: LIVE badge + CTA */}
      <View style={styles.mapOverlayTop}>
        <View style={styles.mapLiveBadge}>
          <View style={styles.mapLiveDot} />
          <Text style={styles.mapLiveText}>LIVE</Text>
        </View>
        <Text style={styles.mapTechCount}>{techsOnMap.length} active</Text>
      </View>
      <View style={styles.mapOverlayBottom}>
        <Text style={styles.mapCta}>Live GPS · Simulated · Tap for full map</Text>
        <View style={styles.mapExpandBtn}>
          <IconSymbol name="arrow.up.left.and.arrow.down.right" size={12} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const statusColor = STATUS_COLORS[task.status];
  return (
    <Pressable
      style={({ pressed }) => [styles.taskRow, pressed && { opacity: 0.82 }] as ViewStyle[]}
      onPress={onPress}
    >
      <View style={[styles.taskBar, { backgroundColor: statusColor }] as ViewStyle[]} />
      <View style={styles.taskBody}>
        <View style={styles.taskTop}>
          <Text style={styles.taskCustomer} numberOfLines={1}>{task.customerName}</Text>
          <View style={[styles.taskBadge, { backgroundColor: statusColor + "20" }] as ViewStyle[]}>
            <Text style={[styles.taskBadgeText, { color: statusColor }] as TextStyle[]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.taskAddr} numberOfLines={1}>{task.jobAddress}</Text>
        {task.technicianName && (
          <Text style={styles.taskTech} numberOfLines={1}>
            <Text style={{ color: statusColor }}>● </Text>{task.technicianName}
          </Text>
        )}
      </View>
      <IconSymbol name="chevron.right" size={14} color="#C0C8D8" style={{ alignSelf: "center", marginRight: 10 }} />
    </Pressable>
  );
}

// ─── Tech Chip ────────────────────────────────────────────────────────────────

function TechChip({ tech, onPress }: { tech: Technician; onPress: () => void }) {
  const statusColor = TECH_STATUS_COLORS[tech.status];
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Pressable
      style={({ pressed }) => [styles.techChip, pressed && { opacity: 0.8 }] as ViewStyle[]}
      onPress={onPress}
    >
      <View style={[styles.techAvatar, { backgroundColor: statusColor + "20" }] as ViewStyle[]}>
        <Text style={[styles.techInitials, { color: statusColor }] as TextStyle[]}>{initials}</Text>
        <View style={[styles.techDot, { backgroundColor: statusColor }] as ViewStyle[]} />
      </View>
      <Text style={styles.techName} numberOfLines={1}>{tech.name.split(" ")[0]}</Text>
      <Text style={[styles.techStatus, { color: statusColor }] as TextStyle[]} numberOfLines={1}>
        {TECH_STATUS_LABELS[tech.status]}
      </Text>
    </Pressable>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
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
  const avgResponse = 14;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const onlineTeam = technicians.filter((t) => t.status !== "offline");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const QUICK_ACTIONS = [
    { label: "Dispatcher", icon: "map.fill", route: "/dispatcher", color: "#3B82F6" },
    { label: "Technicians", icon: "person.2.fill", route: "/agents", color: "#8B5CF6" },
    { label: "Integrations", icon: "arrow.triangle.2.circlepath", route: "/integrations", color: "#22C55E" },
    { label: "Super Admin", icon: "building.2.fill", route: "/super-admin", color: "#E85D04" },
    { label: "Track Demo", icon: "location.fill", route: "/track/JH-2026-8821", color: "#06B6D4" },
    { label: "Settings", icon: "gearshape.fill", route: "/(tabs)/settings", color: "#F59E0B" },
  ];

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }] as ViewStyle[]}>
          <View style={styles.headerLeft}>
            <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
            <View>
              <Text style={styles.headerGreeting}>Good morning, Dan</Text>
              <Text style={styles.headerTitle}>NVC360 Dispatch</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
              onPress={() => router.push("/notification-settings" as any)}
            >
              <IconSymbol name="bell.fill" size={19} color="#fff" />
              <View style={styles.notifBadge} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
              onPress={() => setCreateSheetVisible(true)}
            >
              <IconSymbol name="plus" size={14} color="#fff" />
              <Text style={styles.createBtnText}>New</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 6-up Metrics Grid ── */}
        <View style={styles.metricsSection}>
          <View style={styles.metricsGrid}>
            <MetricCard label="Active Jobs" value={activeTasks.length} color="#E85D04" icon="bolt.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Completed" value={completedToday} color="#16A34A" icon="checkmark.circle.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Unassigned" value={unassigned} color="#DC2626" icon="exclamationmark.triangle.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label="Online Techs" value={onlineTechs} color="#1E6FBF" icon="person.2.fill" onPress={() => router.push("/agents")} />
            <MetricCard label="En Route" value={enRoute} color="#7C3AED" icon="car.fill" onPress={() => router.push("/tasks")} />
            <MetricCard label={`${avgResponse}m Avg`} value="⏱" color="#0EA5A0" icon="timer" onPress={() => {}} />
          </View>
        </View>

        {/* ── Live Map Widget ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Live Fleet Map</Text>
            <Pressable onPress={() => router.push("/dispatcher" as any)}>
              <Text style={styles.seeAll}>Full Map →</Text>
            </Pressable>
          </View>
          <MapWidget onPress={() => router.push("/dispatcher" as any)} />
        </View>

        {/* ── Quick Actions — 2×3 grid, never cut off ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.quickAction,
                  { backgroundColor: action.color + "12", borderColor: action.color + "30",
                    opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ] as ViewStyle[]}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.color + "20" }] as ViewStyle[]}>
                  <IconSymbol name={action.icon as any} size={20} color={action.color} />
                </View>
                <Text style={[styles.quickLabel, { color: action.color }] as TextStyle[]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Field Team ── */}
        {onlineTeam.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Field Team</Text>
              <Pressable onPress={() => router.push("/agents")}>
                <Text style={styles.seeAll}>See All →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.techRow}>
              {onlineTeam.map((tech) => (
                <TechChip key={tech.id} tech={tech} onPress={() => router.push(`/agent/${tech.id}` as any)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recent Work Orders ── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Work Orders</Text>
            <Pressable onPress={() => router.push("/tasks")}>
              <Text style={styles.seeAll}>See All →</Text>
            </Pressable>
          </View>
          {recentTasks.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => router.push(`/task/${task.id}` as any)} />
          ))}
        </View>
      </ScrollView>

      <CreateNewSheet visible={createSheetVisible} onClose={() => setCreateSheetVisible(false)} />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  scrollContent: ViewStyle; header: ViewStyle; headerLeft: ViewStyle;
  headerLogo: ViewStyle; headerGreeting: TextStyle; headerTitle: TextStyle;
  headerRight: ViewStyle; notifBtn: ViewStyle; notifBadge: ViewStyle;
  createBtn: ViewStyle; createBtnText: TextStyle;
  metricsSection: ViewStyle; metricsGrid: ViewStyle;
  metricCard: ViewStyle; metricHighlight: ViewStyle; metricIconWrap: ViewStyle;
  metricValue: TextStyle; metricLabel: TextStyle;
  mapWidget: ViewStyle; mapBg: ViewStyle; mapGridH: ViewStyle; mapGridV: ViewStyle;
  mapRoad: ViewStyle; mapRoadV: ViewStyle;
  mapPin: ViewStyle; mapPinBubble: ViewStyle; mapPinText: TextStyle; mapPinTail: ViewStyle;
  mapOverlayTop: ViewStyle; mapLiveBadge: ViewStyle; mapLiveDot: ViewStyle;
  mapLiveText: TextStyle; mapTechCount: TextStyle;
  mapOverlayBottom: ViewStyle; mapCta: TextStyle; mapExpandBtn: ViewStyle;
  section: ViewStyle; lastSection: ViewStyle; sectionHeaderRow: ViewStyle;
  sectionTitle: TextStyle; seeAll: TextStyle;
  quickGrid: ViewStyle; quickAction: ViewStyle; quickIconWrap: ViewStyle; quickLabel: TextStyle;
  techRow: ViewStyle; techChip: ViewStyle; techAvatar: ViewStyle;
  techInitials: TextStyle; techDot: ViewStyle; techName: TextStyle; techStatus: TextStyle;
  taskRow: ViewStyle; taskBar: ViewStyle; taskBody: ViewStyle; taskTop: ViewStyle;
  taskCustomer: TextStyle; taskBadge: ViewStyle; taskBadgeText: TextStyle;
  taskAddr: TextStyle; taskTech: TextStyle;
  sheetOverlay: ViewStyle; sheet: ViewStyle; sheetHandle: ViewStyle;
  sheetTitle: TextStyle; sheetGrid: ViewStyle; sheetOption: ViewStyle;
  sheetOptionIcon: ViewStyle; sheetOptionLabel: TextStyle;
  sheetCancel: ViewStyle; sheetCancelText: TextStyle;
}>({
  scrollContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 26, height: 26 },
  headerGreeting: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifBtn: { padding: 6, position: "relative" },
  notifBadge: {
    position: "absolute", top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: NVC_ORANGE, borderWidth: 1.5, borderColor: NVC_BLUE,
  },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Metrics
  metricsSection: { paddingHorizontal: 14, paddingTop: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: {
    width: "31%", flexGrow: 1, borderRadius: 14, padding: 12,
    alignItems: "flex-start", gap: 4, minHeight: 90, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  metricHighlight: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  metricIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  metricValue: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  metricLabel: { fontSize: 10, fontWeight: "500", color: "rgba(255,255,255,0.82)", lineHeight: 13 },

  // Map
  mapWidget: {
    height: 200, borderRadius: 16, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 6,
  },
  mapBg: { flex: 1, backgroundColor: "#D4E8F0", position: "relative" },
  mapGridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  mapGridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  mapRoad: { position: "absolute", height: 5, backgroundColor: "#fff", opacity: 0.7 },
  mapRoadV: { position: "absolute", width: 5, backgroundColor: "#fff", opacity: 0.7 },
  mapPin: { position: "absolute", alignItems: "center" },
  mapPinBubble: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  mapPinText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  mapPinTail: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent" },
  mapOverlayTop: {
    position: "absolute", top: 10, left: 10, right: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  mapLiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
  },
  mapLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  mapLiveText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  mapTechCount: {
    fontSize: 11, fontWeight: "700", color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  mapOverlayBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 12, paddingVertical: 8,
  },
  mapCta: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontStyle: "italic" },
  mapExpandBtn: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  // Sections
  section: { paddingHorizontal: 14, paddingTop: 18 },
  lastSection: { paddingBottom: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A1E2A" },
  seeAll: { fontSize: 12, fontWeight: "600", color: NVC_BLUE },

  // Quick Actions — 2×3 grid
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    width: "30%", flexGrow: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 7,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },

  // Tech Chips
  techRow: { paddingBottom: 4, gap: 8 },
  techChip: {
    alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14,
    backgroundColor: WIDGET_SURFACE_LIGHT, gap: 4, minWidth: 70,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  techAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  techInitials: { fontSize: 12, fontWeight: "800" },
  techDot: { position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: WIDGET_SURFACE_LIGHT },
  techName: { fontSize: 10, fontWeight: "700", color: "#1A1E2A" },
  techStatus: { fontSize: 9, fontWeight: "600" },

  // Task Rows
  taskRow: {
    flexDirection: "row", borderRadius: 13, marginBottom: 8, overflow: "hidden",
    backgroundColor: WIDGET_SURFACE_LIGHT,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09, shadowRadius: 10, elevation: 3,
  },
  taskBar: { width: 4 },
  taskBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 3 },
  taskTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskCustomer: { fontSize: 13, fontWeight: "700", flex: 1, marginRight: 6, color: "#1A1E2A" },
  taskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  taskBadgeText: { fontSize: 10, fontWeight: "700" },
  taskAddr: { fontSize: 11, color: "#6B7280" },
  taskTech: { fontSize: 11, color: "#6B7280" },

  // Create Sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  sheetOption: { width: "30%", alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  sheetOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetOptionLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  sheetCancel: { marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  sheetCancelText: { fontSize: 15, fontWeight: "700" },
});
