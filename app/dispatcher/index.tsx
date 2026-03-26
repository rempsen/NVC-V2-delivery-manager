import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Dimensions,
  ViewStyle,
  TextStyle,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import {
  MOCK_TASKS, MOCK_TECHNICIANS, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS,
  type Technician,
  type Task,
  type TaskStatus,
} from "@/lib/nvc-types";
import { GoogleMapView, type RoutePolyline } from "@/components/google-map-view";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Status column config ─────────────────────────────────────────────────────

type TeamColumn = {
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  statuses: string[];
};

const TEAM_COLUMNS: TeamColumn[] = [
  {
    key: "en_route",
    label: "En Route",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    statuses: ["en_route"],
  },
  {
    key: "on_site",
    label: "On Site",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    statuses: ["busy"],
  },
  {
    key: "available",
    label: "Available",
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    statuses: ["online", "on_break"],
  },
];

type TeamSortKey = "name" | "jobs" | "distance";
const TEAM_SORT_OPTIONS: { key: TeamSortKey; label: string }[] = [
  { key: "name",     label: "Name A–Z" },
  { key: "jobs",     label: "Most Jobs" },
  { key: "distance", label: "Distance" },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: {
  label: string; value: string | number; color: string; icon: any;
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

// ─── Team Member Mini Card ────────────────────────────────────────────────────

function TechMiniCard({
  tech,
  column,
  isSelected,
  onPress,
}: {
  tech: Technician;
  column: TeamColumn;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const activeTask = MOCK_TASKS.find(
    (t) => t.technicianId === tech.id && (t.status === "en_route" || t.status === "on_site"),
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.techMiniCard,
        {
          backgroundColor: isSelected ? column.bg : "#fff",
          borderColor: isSelected ? column.color : "#E5E7EB",
          opacity: pressed ? 0.85 : 1,
          transform: pressed ? [{ scale: 0.97 }] : [],
        },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.miniAvatar, { backgroundColor: column.color + "18" }] as ViewStyle[]}>
        <Text style={[styles.miniAvatarText, { color: column.color }] as TextStyle[]}>{initials}</Text>
        {/* Status dot */}
        <View style={[
          styles.miniStatusDot,
          { backgroundColor: column.color, borderColor: isSelected ? column.bg : "#fff" },
        ] as ViewStyle[]} />
      </View>
      {/* Name */}
      <Text style={styles.miniName} numberOfLines={1}>{tech.name.split(" ")[0]}</Text>
      {/* Job count */}
      <Text style={[styles.miniJobs, { color: column.color }] as TextStyle[]}>{tech.todayJobs} jobs</Text>
      {/* Active task address */}
      {activeTask && (
        <Text style={styles.miniAddress} numberOfLines={2}>{activeTask.jobAddress}</Text>
      )}
    </Pressable>
  );
}

// ─── 3-Column Team Panel ──────────────────────────────────────────────────────

function TeamPanel({
  selectedId,
  onSelect,
  sortKey,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  sortKey: TeamSortKey;
}) {
  const colors = useColors();

  const sortedTechs = useMemo(() => {
    return [...MOCK_TECHNICIANS].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "jobs") return b.todayJobs - a.todayJobs;
      if (sortKey === "distance") return b.todayDistanceKm - a.todayDistanceKm;
      return 0;
    });
  }, [sortKey]);

  return (
    <View style={styles.teamPanel}>
      {TEAM_COLUMNS.map((col) => {
        const members = sortedTechs.filter((t) => col.statuses.includes(t.status as string));
        return (
          <View key={col.key} style={[styles.teamColumn, { borderColor: col.border }] as ViewStyle[]}>
            {/* Column header */}
            <View style={[styles.teamColHeader, { backgroundColor: col.bg, borderBottomColor: col.border }] as ViewStyle[]}>
              <View style={[styles.teamColDot, { backgroundColor: col.color }] as ViewStyle[]} />
              <Text style={[styles.teamColLabel, { color: col.color }] as TextStyle[]}>{col.label}</Text>
              <View style={[styles.teamColCount, { backgroundColor: col.color + "20" }] as ViewStyle[]}>
                <Text style={[styles.teamColCountText, { color: col.color }] as TextStyle[]}>{members.length}</Text>
              </View>
            </View>
            {/* Members */}
            <ScrollView
              style={styles.teamColScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {members.length === 0 ? (
                <View style={styles.teamColEmpty}>
                  <Text style={styles.teamColEmptyText}>None</Text>
                </View>
              ) : (
                members.map((tech) => (
                  <TechMiniCard
                    key={tech.id}
                    tech={tech}
                    column={col}
                    isSelected={selectedId === tech.id}
                    onPress={() => onSelect(tech.id)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

// ─── Technician Detail Panel ──────────────────────────────────────────────────

function TechnicianDetailPanel({
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
    online: "#22C55E", busy: "#F59E0B", offline: "#94A3B8", on_break: "#3B82F6", en_route: "#8B5CF6",
  };
  const dotColor = STATUS_DOT[technician.status] ?? "#94A3B8";
  const activeTasks = MOCK_TASKS.filter(
    (t) => t.technicianId === technician.id && (t.status === "en_route" || t.status === "on_site"),
  );

  return (
    <View style={[styles.techPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.techPanelHeader}>
        <View style={[styles.techPanelAvatar, { backgroundColor: NVC_BLUE + "20" }]}>
          <Text style={[styles.techPanelInitial, { color: NVC_BLUE }]}>
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
          <View style={styles.closeBtnInner}>
            <IconSymbol name="xmark" size={12} color="#6B7280" />
          </View>
        </Pressable>
      </View>
      <View style={styles.techPanelStats}>
        {[
          { val: technician.todayJobs, label: "Jobs Today", color: NVC_BLUE },
          { val: `${technician.todayDistanceKm}km`, label: "Distance", color: "#22C55E" },
          { val: activeTasks.length, label: "Active", color: "#F59E0B" },
        ].map((s) => (
          <View key={s.label} style={[styles.techStat, { backgroundColor: colors.background }]}>
            <Text style={[styles.techStatVal, { color: s.color }]}>{s.val}</Text>
            <Text style={[styles.techStatLabel, { color: colors.muted }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      {activeTasks.length > 0 && (
        <View style={[styles.activeTaskCard, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
          <Text style={[styles.activeTaskLabel, { color: "#F59E0B" }]}>CURRENT JOB</Text>
          <Text style={[styles.activeTaskCustomer, { color: colors.foreground }]}>{activeTasks[0].customerName}</Text>
          <Text style={[styles.activeTaskAddress, { color: colors.muted }]} numberOfLines={1}>{activeTasks[0].jobAddress}</Text>
          <Text style={[styles.activeTaskStatus, { color: STATUS_COLORS[activeTasks[0].status] }]}>{STATUS_LABELS[activeTasks[0].status]}</Text>
        </View>
      )}
      <View style={styles.techPanelActions}>
        <Pressable
          style={({ pressed }) => [styles.techActionBtn, { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 }]}
          onPress={onMessage}
        >
          <IconSymbol name="message.fill" size={15} color="#22C55E" />
          <Text style={[styles.techActionText, { color: "#22C55E" }]}>Message</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.techActionBtn, { backgroundColor: NVC_BLUE + "20", opacity: pressed ? 0.7 : 1 }]}
          onPress={onViewTasks}
        >
          <IconSymbol name="list.bullet" size={15} color={NVC_BLUE} />
          <Text style={[styles.techActionText, { color: NVC_BLUE }]}>View Tasks</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Task Card (compact) ──────────────────────────────────────────────────────

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
  const sc = STATUS_COLORS[task.status];
  const pc = PRIORITY_COLORS[task.priority];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.taskCardAccent, { backgroundColor: sc }]} />
      <View style={styles.taskCardBody}>
        <View style={styles.taskCardTop}>
          <Text style={[styles.taskCustomer, { color: colors.foreground }]} numberOfLines={1}>{task.customerName}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: pc + "20" }]}>
            <Text style={[styles.priorityText, { color: pc }]}>{task.priority.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.taskAddress, { color: colors.muted }]} numberOfLines={1}>{task.jobAddress}</Text>
        <View style={styles.taskCardBottom}>
          <Text style={[styles.taskStatusText, { color: sc }]}>{STATUS_LABELS[task.status]}</Text>
          {task.technicianName && (
            <Text style={[styles.taskTech, { color: colors.muted }]}>· {task.technicianName}</Text>
          )}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={13} color={colors.muted} />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TASK_FILTERS: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "en_route", label: "En Route" },
  { key: "on_site", label: "On Site" },
  { key: "completed", label: "Done" },
];

// ─── ETA Refresh Interval ────────────────────────────────────────────────────
const ETA_REFRESH_MS = 60_000; // refresh ETAs every 60 seconds

// Technician route colors
const ROUTE_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#22C55E", "#06B6D4", "#EC4899", "#84CC16"];

export default function DispatcherDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamSort, setTeamSort] = useState<TeamSortKey>("name");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // ── Live ETA state ──────────────────────────────────────────────────────────
  const [etaData, setEtaData] = useState<Record<number, number>>({}); // techId → minutes
  const [routePolylines, setRoutePolylines] = useState<RoutePolyline[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [lastOptimized, setLastOptimized] = useState<Date | null>(null);
  // Active technicians (online/busy/en_route) with their active task locations
  const activeTechs = useMemo(() =>
    MOCK_TECHNICIANS.filter((t) => t.status === "busy" || (t.status as string) === "en_route" || t.status === "online"),
  []);

  const activeTechTasks = useMemo(() => {
    return activeTechs.map((tech) => {
      const task = MOCK_TASKS.find(
        (t) => t.technicianId === tech.id && (t.status === "en_route" || t.status === "on_site" || t.status === "assigned"),
      );
      return { tech, task };
    }).filter((x) => x.task !== undefined) as Array<{ tech: Technician; task: Task }>;
  }, [activeTechs]);

  // tRPC mutations
  const getEtasMutation = trpc.maps.getEtas.useQuery(
    {
      origins: activeTechTasks.map((x) => ({ lat: x.tech.latitude, lng: x.tech.longitude })),
      destinations: activeTechTasks.map((x) => ({ lat: x.task.jobLatitude, lng: x.task.jobLongitude })),
    },
    {
      enabled: Platform.OS === "web" && activeTechTasks.length > 0,
      staleTime: ETA_REFRESH_MS,
      refetchInterval: ETA_REFRESH_MS,
    },
  );

  const optimizeRoutesMutation = trpc.maps.optimizeRoutes.useMutation();

  // Process ETA query results
  useEffect(() => {
    if (!getEtasMutation.data) return;
    const { results } = getEtasMutation.data;
    const newEtaData: Record<number, number> = {};
    const newPolylines: RoutePolyline[] = [];

    activeTechTasks.forEach((x, idx) => {
      // Find the diagonal element: origin idx → destination idx (1:1 mapping)
      const el = results.find((r) => r.originIndex === idx && r.destinationIndex === idx);
      if (el && el.status === "OK") {
        const secs = el.durationInTrafficSeconds ?? el.durationSeconds;
        newEtaData[x.tech.id] = Math.round(secs / 60);

        // Build route polyline (straight-line; GoogleMapView will road-follow via Directions API)
        newPolylines.push({
          techId: x.tech.id,
          color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
          waypoints: [
            { lat: x.tech.latitude, lng: x.tech.longitude },
            { lat: x.task.jobLatitude, lng: x.task.jobLongitude },
          ],
        });
      }
    });

    setEtaData(newEtaData);
    setRoutePolylines(newPolylines);
  }, [getEtasMutation.data, activeTechTasks]);

  // Optimize routes handler — calls server-side Route Optimization API
  const handleOptimizeRoutes = useCallback(async () => {
    if (isOptimizing || activeTechTasks.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      // Group tasks by technician and optimize each tech's route
      const techTaskGroups = new Map<number, Array<{ taskId: number; lat: number; lng: number; address?: string }>>();
      activeTechTasks.forEach(({ tech, task }) => {
        if (!techTaskGroups.has(tech.id)) techTaskGroups.set(tech.id, []);
        techTaskGroups.get(tech.id)!.push({
          taskId: task.id,
          lat: task.jobLatitude,
          lng: task.jobLongitude,
          address: task.jobAddress,
        });
      });

      const newPolylines: RoutePolyline[] = [];
      const newEtaData: Record<number, number> = { ...etaData };

      let colorIdx = 0;
      for (const [techId, waypoints] of techTaskGroups) {
        const tech = MOCK_TECHNICIANS.find((t) => t.id === techId);
        if (!tech || waypoints.length === 0) continue;

        const result = await optimizeRoutesMutation.mutateAsync({
          origin: { lat: tech.latitude, lng: tech.longitude },
          waypoints,
        });

        // Build multi-stop polyline from optimized order
        const orderedWaypoints = [
          { lat: tech.latitude, lng: tech.longitude },
          ...result.orderedTasks.map((t) => ({ lat: t.lat, lng: t.lng })),
        ];

        newPolylines.push({
          techId,
          color: ROUTE_COLORS[colorIdx % ROUTE_COLORS.length],
          waypoints: orderedWaypoints,
        });

        // Update ETA for first stop
        if (result.orderedTasks.length > 0) {
          newEtaData[techId] = Math.round(result.orderedTasks[0].durationSeconds / 60);
        }

        colorIdx++;
      }

      setRoutePolylines(newPolylines);
      setEtaData(newEtaData);
      setLastOptimized(new Date());
    } catch (err) {
      setOptimizeError(err instanceof Error ? err.message : "Route optimization failed");
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, activeTechTasks, etaData, optimizeRoutesMutation]);

  const selectedTech = selectedTechId
    ? MOCK_TECHNICIANS.find((t) => t.id === selectedTechId) ?? null
    : null;

  const filteredTasks = useMemo(() => MOCK_TASKS.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.jobAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.technicianName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [statusFilter, searchQuery]);

  const activeCount = MOCK_TASKS.filter((t) => t.status === "en_route" || t.status === "on_site").length;
  const unassignedCount = MOCK_TASKS.filter((t) => t.status === "unassigned").length;
  const completedCount = MOCK_TASKS.filter((t) => t.status === "completed").length;
  const onlineTechs = MOCK_TECHNICIANS.filter((t) => t.status === "online" || t.status === "busy").length;

  // Map height: dominant — 55% of screen height, min 300, max 520
  const mapHeight = Math.min(Math.max(Math.round(SCREEN_HEIGHT * 0.55), 300), 520);

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title="Dispatcher Dashboard"
        subtitle="NVC360 · Live Operations"
        showBack={false}
        variant="blue"
        rightElement={
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/create-task" as any);
            }}
            style={({ pressed }) => [styles.newTaskBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="plus" size={14} color="#fff" />
            <Text style={styles.newTaskBtnText}>New Order</Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Stats Row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Active Jobs"  value={activeCount}          color="#F59E0B" icon="bolt.fill" />
          <StatCard label="Unassigned"   value={unassignedCount}      color="#EF4444" icon="exclamationmark.circle.fill" />
          <StatCard label="Completed"    value={completedCount}       color="#22C55E" icon="checkmark.circle.fill" />
          <StatCard label="Online Techs" value={onlineTechs}          color="#3B82F6" icon="person.fill" />
          <StatCard label="Total Today"  value={MOCK_TASKS.length}    color="#8B5CF6" icon="list.bullet" />
        </ScrollView>

        {/* ── Live Fleet Map (larger, near-square) ── */}
        <View style={styles.mapSection}>
          <View style={styles.mapSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Fleet</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* ETA loading indicator */}
              {getEtasMutation.isFetching && (
                <View style={[styles.liveBadge, { backgroundColor: "#3B82F620", borderColor: "#3B82F640" }]}>
                  <View style={[styles.liveDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={[styles.liveText, { color: "#3B82F6" }]}>UPDATING ETAs</Text>
                </View>
              )}
              {/* Optimize Routes button */}
              {Platform.OS === "web" && (
                <Pressable
                  style={({ pressed }) => [
                    styles.optimizeBtn,
                    { opacity: pressed || isOptimizing ? 0.7 : 1, backgroundColor: isOptimizing ? "#8B5CF620" : "#8B5CF610" },
                  ] as ViewStyle[]}
                  onPress={handleOptimizeRoutes}
                  disabled={isOptimizing}
                >
                  <IconSymbol name="arrow.triangle.turn.up.right.diamond.fill" size={12} color="#8B5CF6" />
                  <Text style={[styles.optimizeBtnText, { color: "#8B5CF6" }]}>
                    {isOptimizing ? "Optimizing…" : "Optimize Routes"}
                  </Text>
                </Pressable>
              )}
              <View style={[styles.liveBadge, { backgroundColor: "#22C55E20", borderColor: "#22C55E40" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.liveText, { color: "#22C55E" }]}>LIVE</Text>
              </View>
            </View>
          </View>
          {/* Last optimized timestamp */}
          {lastOptimized && (
            <Text style={[styles.lastOptimizedText, { color: colors.muted }]}>
              Routes optimized at {lastOptimized.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          {optimizeError && (
            <Text style={[styles.optimizeErrorText, { color: "#EF4444" }]}>{optimizeError}</Text>
          )}
          <View style={[styles.mapContainer, { height: mapHeight }]}>
            <GoogleMapView
              technicians={MOCK_TECHNICIANS.map((t) => ({
                id: t.id, name: t.name,
                latitude: t.latitude, longitude: t.longitude,
                status: t.status, transportType: t.transportType,
              }))}
              tasks={MOCK_TASKS.filter((t) => t.status !== "completed" && t.status !== "cancelled").map((t) => ({
                id: t.id,
                jobLatitude: t.jobLatitude,
                jobLongitude: t.jobLongitude,
                status: t.status,
                customerName: t.customerName,
                jobAddress: t.jobAddress,
              }))}
              selectedId={selectedTechId}
              onSelectTech={(id) => setSelectedTechId(selectedTechId === id ? null : id)}
              center={{ lat: 49.8951, lng: -97.1384 }}
              zoom={11}
              height={mapHeight}
              etaData={etaData}
              routePolylines={routePolylines}
            />
          </View>
        </View>

        {/* ── Field Team — 3-Column Panel ── */}
        <View style={styles.teamSection}>
          <View style={styles.teamSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Field Team</Text>
            {/* Sort button */}
            <Pressable
              style={({ pressed }) => [styles.sortBtn, { opacity: pressed ? 0.75 : 1 }] as ViewStyle[]}
              onPress={() => setSortMenuOpen(true)}
            >
              <IconSymbol name="arrow.up.arrow.down" size={11} color={NVC_BLUE} />
              <Text style={styles.sortBtnText}>
                {TEAM_SORT_OPTIONS.find((o) => o.key === teamSort)?.label ?? "Sort"}
              </Text>
              <IconSymbol name="chevron.down" size={10} color={NVC_BLUE} />
            </Pressable>
          </View>
          <TeamPanel
            selectedId={selectedTechId}
            onSelect={(id) => setSelectedTechId(selectedTechId === id ? null : id)}
            sortKey={teamSort}
          />
        </View>

        {/* ── Technician Detail Panel (shown when selected) ── */}
        {selectedTech && (
          <TechnicianDetailPanel
            technician={selectedTech}
            onClose={() => setSelectedTechId(null)}
            onMessage={() => router.push("/messages/1" as any)}
            onViewTasks={() => router.push(`/agent/${selectedTech.id}` as any)}
          />
        )}

        {/* ── Work Orders ── */}
        <View style={styles.taskSection}>
          <View style={styles.taskSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Work Orders</Text>
            <Text style={[styles.taskCount, { color: colors.muted }]}>{filteredTasks.length} showing</Text>
          </View>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={15} color={colors.muted} />
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

          {/* Status filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {TASK_FILTERS.map((f) => {
              const isActive = statusFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? NVC_BLUE : colors.surface,
                      borderColor: isActive ? NVC_BLUE : colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(f.key)}
                >
                  <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No work orders found</Text>
            </View>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}` as any)}
              />
            ))
          )}
        </View>

        {/* ── Integration Shortcuts ── */}
        <View style={[styles.integrationsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.integrationsTitle, { color: colors.foreground }]}>Integrations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { name: "QuickBooks", icon: "dollarsign.circle.fill" as const, color: "#22C55E" },
              { name: "Xero",       icon: "chart.bar.fill" as const,         color: "#3B82F6" },
              { name: "CompanyCam", icon: "camera.fill" as const,            color: "#8B5CF6" },
              { name: "Google Cal", icon: "calendar.badge.clock" as const,   color: "#EF4444" },
              { name: "Office 365", icon: "envelope.fill" as const,          color: "#F59E0B" },
            ].map((intg) => (
              <Pressable
                key={intg.name}
                style={({ pressed }) => [
                  styles.integrationChip,
                  { backgroundColor: intg.color + "15", borderColor: intg.color + "30", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push("/integrations" as any)}
              >
                <IconSymbol name={intg.icon} size={15} color={intg.color} />
                <Text style={[styles.integrationName, { color: intg.color }]}>{intg.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Persistent Bottom Nav ── */}
      <BottomNavBar />

      {/* ── Sort Menu Modal ── */}
      <Modal
        visible={sortMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortMenuOpen(false)}>
          <View style={styles.sortMenu}>
            <View style={styles.sortMenuHeader}>
              <Text style={styles.sortMenuTitle}>Sort Field Team By</Text>
              <Pressable onPress={() => setSortMenuOpen(false)}>
                <View style={styles.sortMenuClose}>
                  <IconSymbol name="xmark" size={11} color="#6B7280" />
                </View>
              </Pressable>
            </View>
            {TEAM_SORT_OPTIONS.map((opt) => {
              const isSelected = teamSort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.sortMenuItem,
                    isSelected && styles.sortMenuItemActive,
                    pressed && { opacity: 0.7 },
                  ] as ViewStyle[]}
                  onPress={() => {
                    setTeamSort(opt.key);
                    setSortMenuOpen(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.sortMenuItemText, isSelected && styles.sortMenuItemTextActive] as TextStyle[]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.sortMenuCheck}>
                      <IconSymbol name="checkmark" size={12} color={NVC_BLUE} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },

  // Header button
  newTaskBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  newTaskBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Stats
  statsScroll: { marginTop: 12 },
  statsContent: { paddingHorizontal: 16, gap: 10 },
  statCard: {
    width: 96, borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: "center", gap: 4,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  // Section shared
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: "800" },

  // Map
  mapSection: { margin: 16, marginTop: 14 },
  mapSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  optimizeBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 10, borderWidth: 1.5, borderColor: "#8B5CF640",
    paddingHorizontal: 10, paddingVertical: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  optimizeBtnText: { fontSize: 11, fontWeight: "700" as const },
  lastOptimizedText: { fontSize: 10, marginBottom: 6, marginTop: -4 },
  optimizeErrorText: { fontSize: 11, marginBottom: 6, marginTop: -4 },
  liveBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "800" },
  mapContainer: { borderRadius: 18, overflow: "hidden" },

  // Team panel
  teamSection: { marginHorizontal: 16, marginTop: 4, marginBottom: 12 },
  teamSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5,
    borderColor: NVC_BLUE + "40", paddingHorizontal: 10, paddingVertical: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sortBtnText: { fontSize: 11, fontWeight: "700", color: NVC_BLUE },
  teamPanel: { flexDirection: "row", gap: 8 },
  teamColumn: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
    minHeight: 180,
  },
  teamColHeader: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  teamColDot: { width: 7, height: 7, borderRadius: 3.5 },
  teamColLabel: { fontSize: 11, fontWeight: "800", flex: 1 },
  teamColCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  teamColCountText: { fontSize: 10, fontWeight: "800" },
  teamColScroll: { maxHeight: 260 },
  teamColEmpty: { alignItems: "center", paddingVertical: 20 },
  teamColEmptyText: { fontSize: 11, color: "#9CA3AF" },

  // Tech mini card
  techMiniCard: {
    margin: 6, marginBottom: 4, borderRadius: 10, borderWidth: 1.5,
    padding: 8, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  miniAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginBottom: 5, position: "relative",
  },
  miniAvatarText: { fontSize: 14, fontWeight: "800" },
  miniStatusDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 5.5, borderWidth: 2,
  },
  miniName: { fontSize: 11, fontWeight: "700", color: "#1A1E2A", textAlign: "center" },
  miniJobs: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  miniAddress: { fontSize: 9, color: "#9CA3AF", textAlign: "center", marginTop: 3, lineHeight: 12 },

  // Technician detail panel
  techPanel: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
  },
  techPanelHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  techPanelAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  techPanelInitial: { fontSize: 18, fontWeight: "800" },
  techPanelInfo: { flex: 1 },
  techPanelName: { fontSize: 15, fontWeight: "700" },
  techPanelStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  techPanelDot: { width: 7, height: 7, borderRadius: 3.5 },
  techPanelStatus: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  techPanelPhone: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeBtnInner: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  techPanelStats: { flexDirection: "row", gap: 8 },
  techStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 2 },
  techStatVal: { fontSize: 18, fontWeight: "800" },
  techStatLabel: { fontSize: 10, fontWeight: "600" },
  activeTaskCard: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 3 },
  activeTaskLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  activeTaskCustomer: { fontSize: 14, fontWeight: "700" },
  activeTaskAddress: { fontSize: 12 },
  activeTaskStatus: { fontSize: 12, fontWeight: "600" },
  techPanelActions: { flexDirection: "row", gap: 10 },
  techActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 6 },
  techActionText: { fontSize: 13, fontWeight: "700" },

  // Work orders
  taskSection: { marginHorizontal: 16, marginTop: 4 },
  taskSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  taskCount: { fontSize: 13 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1, marginRight: 6, minHeight: 26,
  },
  filterChipText: { fontSize: 11, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  taskCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: "hidden",
  },
  taskCardAccent: { width: 4, alignSelf: "stretch" },
  taskCardBody: { flex: 1, padding: 12, gap: 3 },
  taskCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskCustomer: { flex: 1, fontSize: 14, fontWeight: "700" },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: "800" },
  taskAddress: { fontSize: 12 },
  taskCardBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskStatusText: { fontSize: 12, fontWeight: "600" },
  taskTech: { fontSize: 12 },

  // Integrations
  integrationsCard: { margin: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  integrationsTitle: { fontSize: 14, fontWeight: "700" },
  integrationChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, marginRight: 10, gap: 6,
  },
  integrationName: { fontSize: 12, fontWeight: "700" },

  // Sort modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sortMenu: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  sortMenuHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB",
  },
  sortMenuTitle: { fontSize: 16, fontWeight: "800", color: "#1A1E2A" },
  sortMenuClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  sortMenuItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6",
  },
  sortMenuItemActive: { backgroundColor: NVC_BLUE + "08" },
  sortMenuItemText: { fontSize: 15, fontWeight: "500", color: "#374151", flex: 1 },
  sortMenuItemTextActive: { color: NVC_BLUE, fontWeight: "700" },
  sortMenuCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: NVC_BLUE + "15", alignItems: "center", justifyContent: "center" },
});
