/**
 * NVC360 Desktop Dispatcher Dashboard
 * Full-width web-optimized layout: sidebar + map + work orders + team panel
 * Route: /dashboard
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  MOCK_TASKS,
  MOCK_TECHNICIANS,
  STATUS_COLORS,
  STATUS_LABELS,
  TECH_STATUS_COLORS,
  TECH_STATUS_LABELS,
  PRIORITY_COLORS,
  type Task,
  type TaskStatus,
  type Technician,
} from "@/lib/nvc-types";
import { NVC_BLUE, NVC_BLUE_DARK, NVC_ORANGE, NVC_LOGO_DARK, STATUS_SORT_ORDER } from "@/constants/brand";
import { trpc } from "@/lib/trpc";

// Default demo tenant ID — in production this comes from auth context
const DEMO_TENANT_ID = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarSection = "dashboard" | "workorders" | "technicians" | "map" | "reports" | "settings";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: SidebarSection; label: string; icon: any; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: "house.fill" },
  { id: "workorders", label: "Work Orders", icon: "paperplane.fill", badge: 2 },
  { id: "technicians", label: "Technicians", icon: "person.2.fill" },
  { id: "map", label: "Live Map", icon: "map.fill" },
  { id: "reports", label: "Reports", icon: "chart.bar.fill" },
  { id: "settings", label: "Settings", icon: "gear" },
];

function Sidebar({
  active,
  onSelect,
}: {
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sidebar, { backgroundColor: NVC_BLUE_DARK, borderRightColor: "rgba(255,255,255,0.1)" }]}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <Image source={NVC_LOGO_DARK} style={styles.sidebarLogoImg} resizeMode="contain" />
        <View>
          <Text style={styles.sidebarBrand}>NVC360</Text>
          <Text style={styles.sidebarBrandSub}>Dispatch</Text>
        </View>
      </View>

      {/* Nav items */}
      <View style={styles.sidebarNav}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.sidebarItem,
                isActive && styles.sidebarItemActive,
                pressed && !isActive && { backgroundColor: "rgba(255,255,255,0.08)" },
              ]}
              onPress={() => onSelect(item.id)}
            >
              <IconSymbol name={item.icon} size={18} color={isActive ? "#fff" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.sidebarItemLabel, isActive && { color: "#fff", fontWeight: "700" }]}>
                {item.label}
              </Text>
              {item.badge ? (
                <View style={styles.sidebarBadge}>
                  <Text style={styles.sidebarBadgeText}>{item.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* User footer */}
      <View style={[styles.sidebarFooter, { borderTopColor: "rgba(255,255,255,0.1)" }]}>
        <View style={[styles.sidebarAvatar, { backgroundColor: NVC_ORANGE }]}>
          <Text style={styles.sidebarAvatarText}>D</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sidebarUserName}>Dan Rosenblat</Text>
          <Text style={styles.sidebarUserRole}>Dispatcher · Admin</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Fleet Map (Simulated) ────────────────────────────────────────────────────

function FleetMapPanel({
  technicians,
  selectedId,
  onSelect,
}: {
  technicians: Technician[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const colors = useColors();

  // Map grid positions for each technician (normalized 0-100%)
  const positions: Record<number, { x: number; y: number }> = {
    1: { x: 48, y: 42 },
    2: { x: 36, y: 58 },
    3: { x: 62, y: 30 },
    4: { x: 28, y: 70 },
    5: { x: 55, y: 68 },
    6: { x: 44, y: 52 },
    7: { x: 70, y: 45 },
    8: { x: 32, y: 38 },
    9: { x: 22, y: 55 },
    10: { x: 58, y: 55 },
  };

  const statusDot: Record<string, string> = {
    online: "#22C55E",
    busy: "#F59E0B",
    offline: "#6B7280",
    on_break: "#3B82F6",
    en_route: "#8B5CF6",
  };

  return (
    <View style={[styles.mapPanel, { backgroundColor: "#0d1b2a" }]}>
      {/* Grid lines */}
      {[20, 40, 60, 80].map((pct) => (
        <View key={`h${pct}`} style={[styles.mapGridH, { top: `${pct}%` as any }]} />
      ))}
      {[20, 40, 60, 80].map((pct) => (
        <View key={`v${pct}`} style={[styles.mapGridV, { left: `${pct}%` as any }]} />
      ))}

      {/* Roads */}
      <View style={[styles.mapRoad, { top: "35%", height: 5 }]} />
      <View style={[styles.mapRoad, { top: "60%", height: 3 }]} />
      <View style={[styles.mapRoadV, { left: "40%", width: 5 }]} />
      <View style={[styles.mapRoadV, { left: "65%", width: 3 }]} />

      {/* City label */}
      <View style={styles.mapCityLabel}>
        <Text style={styles.mapCityText}>Winnipeg, MB</Text>
      </View>

      {/* Technician pins */}
      {technicians.map((tech) => {
        const pos = positions[tech.id] ?? { x: 50, y: 50 };
        const color = statusDot[tech.status] ?? "#6B7280";
        const isSelected = selectedId === tech.id;
        const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
        return (
          <Pressable
            key={tech.id}
            style={({ pressed }) => [
              styles.techPin,
              {
                left: `${pos.x}%` as any,
                top: `${pos.y}%` as any,
                borderColor: isSelected ? "#fff" : color,
                backgroundColor: color + "22",
                transform: [{ scale: pressed ? 0.9 : isSelected ? 1.15 : 1 }],
              },
            ]}
            onPress={() => onSelect(tech.id)}
          >
            <View style={[styles.techPinDot, { backgroundColor: color }]}>
              <Text style={styles.techPinInitials}>{initials}</Text>
            </View>
            {isSelected && (
              <View style={[styles.techPinLabel, { backgroundColor: NVC_BLUE }]}>
                <Text style={styles.techPinLabelText}>{tech.name.split(" ")[0]}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Map attribution */}
      <View style={styles.mapAttr}>
        <Text style={styles.mapAttrText}>Live GPS · Simulated · Mapbox integration pending</Text>
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  gradient,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  gradient: [string, string];
  icon: any;
  sub?: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Pressable
      // @ts-ignore — web-only hover events
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.statCard, {
        backgroundColor: gradient[0],
        transform: hovered && Platform.OS === "web" ? [{ translateY: -4 }] : [],
        shadowOpacity: hovered && Platform.OS === "web" ? 0.25 : 0.12,
        shadowRadius: hovered && Platform.OS === "web" ? 20 : 10,
      }]}
    >
      {/* Subtle gradient overlay using a second View */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[1], opacity: 0.45, borderRadius: 16 }]} />
      <View style={styles.statIcon}>
        <IconSymbol name={icon} size={18} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Pressable>
  );
}

// ─── Work Order Row ───────────────────────────────────────────────────────────

function WorkOrderRow({
  task,
  onPress,
}: {
  task: Task;
  onPress: () => void;
}) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.woRow,
        { backgroundColor: pressed ? colors.surface : colors.background, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
    >
      {/* Status bar */}
      <View style={[styles.woStatusBar, { backgroundColor: statusColor }]} />

      {/* Main content */}
      <View style={styles.woMain}>
        <View style={styles.woTopRow}>
          <Text style={[styles.woOrderRef, { color: colors.muted }]}>{task.orderRef ?? `WO-${task.id}`}</Text>
          <View style={[styles.woPriorityBadge, { backgroundColor: priorityColor + "20" }]}>
            <Text style={[styles.woPriorityText, { color: priorityColor }]}>{task.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.woStatusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.woStatusText, { color: statusColor }]}>{STATUS_LABELS[task.status]}</Text>
          </View>
        </View>
        <Text style={[styles.woCustomer, { color: colors.foreground }]}>{task.customerName}</Text>
        <Text style={[styles.woAddress, { color: colors.muted }]} numberOfLines={1}>{task.jobAddress}</Text>
        {task.technicianName && (
          <Text style={[styles.woTech, { color: NVC_BLUE }]}>
            ↳ {task.technicianName}
          </Text>
        )}
      </View>

      {/* Time */}
      <View style={styles.woTime}>
        <Text style={[styles.woTimeText, { color: colors.muted }]}>
          {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        <IconSymbol name="chevron.right" size={14} color={colors.muted} />
      </View>
    </Pressable>
  );
}

// ─── Tech Row ─────────────────────────────────────────────────────────────────

function TechRow({
  tech,
  isSelected,
  onPress,
}: {
  tech: Technician;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const statusColor = TECH_STATUS_COLORS[tech.status] ?? "#6B7280";
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.techRow,
        {
          backgroundColor: isSelected ? NVC_BLUE + "15" : pressed ? colors.surface : "transparent",
          borderLeftColor: isSelected ? NVC_BLUE : statusColor,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.techAvatar, { backgroundColor: statusColor + "25" }]}>
        <Text style={[styles.techAvatarText, { color: statusColor }]}>{initials}</Text>
        <View style={[styles.techStatusDot, { backgroundColor: statusColor }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.techName, { color: colors.foreground }]}>{tech.name}</Text>
        <Text style={[styles.techDetail, { color: colors.muted }]} numberOfLines={1}>
          {tech.activeTaskAddress ?? "No active job"}
        </Text>
      </View>
      <View style={[styles.techStatusPill, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.techStatusPillText, { color: statusColor }]}>
          {TECH_STATUS_LABELS[tech.status] ?? tech.status}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────

function DashboardSection({ tasks, technicians, onSelectTech, selectedTechId }: {
  tasks: Task[];
  technicians: Technician[];
  onSelectTech: (id: number) => void;
  selectedTechId: number | null;
}) {
  const colors = useColors();
  const router = useRouter();

  const active = tasks.filter((t) => ["on_site", "en_route", "assigned"].includes(t.status)).length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const unassigned = tasks.filter((t) => t.status === "unassigned").length;
  const onlineCount = technicians.filter((t) => t.status !== "offline").length;
  const enRoute = technicians.filter((t) => (t.status as any) === "en_route").length;
  const onJob = technicians.filter((t) => t.status === "busy").length;

  const sortedTechs = [...technicians].sort(
    (a, b) => (STATUS_SORT_ORDER[a.status] ?? 5) - (STATUS_SORT_ORDER[b.status] ?? 5),
  );

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 24 }}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Active Jobs" value={active} gradient={["#E85D04", "#F97316"]} icon="bolt.fill" sub="↑ 2 from yesterday" />
        <StatCard label="Completed Today" value={completed} gradient={["#16A34A", "#22C55E"]} icon="checkmark.circle.fill" sub="On track" />
        <StatCard label="Unassigned" value={unassigned} gradient={["#DC2626", "#EF4444"]} icon="exclamationmark.triangle.fill" sub="Needs attention" />
        <StatCard label="Online Techs" value={onlineCount} gradient={["#1E6FBF", "#3B8FDF"]} icon="person.2.fill" sub={`${onJob} on job`} />
        <StatCard label="En Route" value={enRoute} gradient={["#7C3AED", "#9B5CF6"]} icon="car.fill" />
        <StatCard label="Avg Response" value="14m" gradient={["#0891B2", "#06B6D4"]} icon="clock.fill" sub="Target: 20m" />
      </View>

      {/* Two-column layout */}
      <View style={styles.twoCol}>
        {/* Left: Map + Recent Work Orders */}
        <View style={styles.leftCol}>
          {/* Map */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Live Fleet Map</Text>
              <View style={[styles.liveBadge, { backgroundColor: "#22C55E20" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.liveBadgeText, { color: "#22C55E" }]}>LIVE</Text>
              </View>
            </View>
            <FleetMapPanel
              technicians={sortedTechs}
              selectedId={selectedTechId}
              onSelect={onSelectTech}
            />
          </View>

          {/* Recent Work Orders */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Recent Work Orders</Text>
              <Pressable
                style={({ pressed }) => [styles.seeAllBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.seeAllText, { color: NVC_BLUE }]}>See All</Text>
              </Pressable>
            </View>
            {recentTasks.map((task) => (
              <WorkOrderRow
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}` as any)}
              />
            ))}
          </View>
        </View>

        {/* Right: Team Panel */}
        <View style={styles.rightCol}>
          {/* Quick Actions */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {[
                { label: "New Order", icon: "plus.circle.fill", color: NVC_ORANGE },
                { label: "Assign Job", icon: "person.fill", color: NVC_BLUE },
                { label: "Send Alert", icon: "bell.fill", color: "#F59E0B" },
                { label: "Export", icon: "arrow.up.doc.fill", color: "#22C55E" },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  style={({ pressed }) => [
                    styles.quickActionBtn,
                    { backgroundColor: action.color + "15", borderColor: action.color + "30", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <IconSymbol name={action.icon as any} size={20} color={action.color} />
                  <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Field Team */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Field Team</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {onlineCount} active · {technicians.length} total
              </Text>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {sortedTechs.map((tech) => (
                <TechRow
                  key={tech.id}
                  tech={tech}
                  isSelected={selectedTechId === tech.id}
                  onPress={() => onSelectTech(tech.id)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Work Orders Section ──────────────────────────────────────────────────────

function WorkOrdersSection({ tasks }: { tasks: Task[] }) {
  const colors = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filters: { key: TaskStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unassigned", label: "Unassigned" },
    { key: "assigned", label: "Assigned" },
    { key: "en_route", label: "En Route" },
    { key: "on_site", label: "On Site" },
    { key: "completed", label: "Completed" },
  ];

  const filtered = tasks.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const matchesSearch =
      !search ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.jobAddress.toLowerCase().includes(search.toLowerCase()) ||
      (t.orderRef ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={{ flex: 1, padding: 24 }}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Work Orders</Text>
        <Pressable
          style={({ pressed }) => [
            styles.newOrderBtn,
            { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push("/create-task" as any)}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.newOrderBtnText}>New Order</Text>
        </Pressable>
      </View>

      {/* Search + Filters */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search orders, customers, addresses..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filters.map((f) => {
          const isActive = filter === f.key;
          const count = f.key === "all" ? tasks.length : tasks.filter((t) => t.status === f.key).length;
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
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }]}>
                {f.label} {count > 0 ? `(${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Table */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Table header */}
        <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE + "10" }]}>
          {["Order Ref", "Customer", "Address", "Technician", "Status", "Priority", "Time"].map((col) => (
            <Text key={col} style={[styles.tableHeaderCell, { color: NVC_BLUE }]}>{col}</Text>
          ))}
        </View>

        <ScrollView>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No work orders match your filter.</Text>
            </View>
          ) : (
            filtered.map((task) => {
              const statusColor = STATUS_COLORS[task.status];
              const priorityColor = PRIORITY_COLORS[task.priority];
              return (
                <Pressable
                  key={task.id}
                  style={({ pressed }) => [
                    styles.tableRow,
                    { borderBottomColor: colors.border, backgroundColor: pressed ? NVC_BLUE + "08" : "transparent" },
                  ]}
                  onPress={() => router.push(`/task/${task.id}` as any)}
                >
                  <Text style={[styles.tableCell, styles.tableCellRef, { color: NVC_BLUE }]}>
                    {task.orderRef ?? `WO-${task.id}`}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.foreground }]} numberOfLines={1}>
                    {task.customerName}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.muted }]} numberOfLines={1}>
                    {task.jobAddress.split(",")[0]}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.muted }]} numberOfLines={1}>
                    {task.technicianName ?? "—"}
                  </Text>
                  <View style={styles.tableCell}>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }]}>
                        {STATUS_LABELS[task.status]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tableCell}>
                    <View style={[styles.statusPill, { backgroundColor: priorityColor + "20" }]}>
                      <Text style={[styles.statusPillText, { color: priorityColor }]}>
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.muted }]}>
                    {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Technicians Section ──────────────────────────────────────────────────────

function TechniciansSection({ technicians }: { technicians: Technician[] }) {
  const colors = useColors();
  const router = useRouter();
  const sorted = [...technicians].sort(
    (a, b) => (STATUS_SORT_ORDER[a.status] ?? 5) - (STATUS_SORT_ORDER[b.status] ?? 5),
  );

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Field Team</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          {technicians.filter((t) => t.status !== "offline").length} active · {technicians.length} total
        </Text>
      </View>

      <View style={styles.techGrid}>
        {sorted.map((tech) => {
          const statusColor = TECH_STATUS_COLORS[tech.status] ?? "#6B7280";
          const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          return (
            <Pressable
              key={tech.id}
              style={({ pressed }) => [
                styles.techCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: statusColor,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => router.push(`/agent/${tech.id}` as any)}
            >
              <View style={styles.techCardTop}>
                <View style={[styles.techCardAvatar, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.techCardInitials, { color: statusColor }]}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.techCardName, { color: colors.foreground }]}>{tech.name}</Text>
                  <Text style={[styles.techCardSkills, { color: colors.muted }]} numberOfLines={1}>
                    {tech.skills.join(" · ")}
                  </Text>
                </View>
                <View style={[styles.techCardStatus, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.techCardStatusText, { color: statusColor }]}>
                    {TECH_STATUS_LABELS[tech.status] ?? tech.status}
                  </Text>
                </View>
              </View>
              <View style={[styles.techCardDivider, { backgroundColor: colors.border }]} />
              <View style={styles.techCardStats}>
                <View style={styles.techCardStat}>
                  <Text style={[styles.techCardStatValue, { color: colors.foreground }]}>{tech.todayJobs}</Text>
                  <Text style={[styles.techCardStatLabel, { color: colors.muted }]}>Jobs</Text>
                </View>
                <View style={styles.techCardStat}>
                  <Text style={[styles.techCardStatValue, { color: colors.foreground }]}>{tech.todayDistanceKm}km</Text>
                  <Text style={[styles.techCardStatLabel, { color: colors.muted }]}>Distance</Text>
                </View>
                <View style={styles.techCardStat}>
                  <Text style={[styles.techCardStatValue, { color: colors.foreground }]}>{tech.transportType}</Text>
                  <Text style={[styles.techCardStatLabel, { color: colors.muted }]}>Vehicle</Text>
                </View>
              </View>
              {tech.activeTaskAddress && (
                <Text style={[styles.techCardAddress, { color: NVC_BLUE }]} numberOfLines={1}>
                  ↳ {tech.activeTaskAddress}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DesktopDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);

  // ── Live tRPC data with 30s auto-refresh ──────────────────────────────────────
  const tasksQuery = trpc.tasks.list.useQuery(
    { tenantId: DEMO_TENANT_ID },
    { refetchInterval: 30_000, staleTime: 15_000 },
  );
  const techniciansQuery = trpc.technicians.list.useQuery(
    { tenantId: DEMO_TENANT_ID },
    { refetchInterval: 30_000, staleTime: 15_000 },
  );

  // Map API data to local types, fall back to mock data while loading
  const liveTasks: Task[] = useMemo(() => {
    if (tasksQuery.data && tasksQuery.data.length > 0) {
      return tasksQuery.data.map((t: any) => ({
        id: t.id,
        jobHash: t.jobHash ?? `job-${t.id}`,
        status: (t.status as TaskStatus) ?? "unassigned",
        priority: t.priority ?? "medium",
        customerName: t.customerName ?? "—",
        customerPhone: t.customerPhone ?? "",
        customerEmail: t.customerEmail ?? "",
        jobAddress: t.address ?? t.jobAddress ?? "",
        jobLatitude: t.lat ?? t.jobLatitude ?? 49.8951,
        jobLongitude: t.lng ?? t.jobLongitude ?? -97.1384,
        technicianId: t.technicianId ?? undefined,
        technicianName: t.technicianName ?? undefined,
        orderRef: t.orderRef ?? `WO-${t.id}`,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString() : undefined,
      }));
    }
    return MOCK_TASKS;
  }, [tasksQuery.data]);

  const liveTechnicians: Technician[] = useMemo(() => {
    if (techniciansQuery.data && techniciansQuery.data.length > 0) {
      return techniciansQuery.data.map((t: any) => ({
        id: t.id,
        name: t.name ?? "Technician",
        phone: t.phone ?? "",
        email: t.email ?? "",
        status: (t.status as any) ?? "offline",
        latitude: t.lat ?? t.latitude ?? 49.8951,
        longitude: t.lng ?? t.longitude ?? -97.1384,
        transportType: (t.transportType ?? "car") as any,
        skills: t.skills ?? [],
        photoUrl: t.photoUrl ?? undefined,
        activeTaskId: t.activeTaskId ?? undefined,
        activeTaskAddress: t.activeTaskAddress ?? undefined,
        todayJobs: t.todayJobs ?? t.jobsToday ?? 0,
        todayDistanceKm: t.todayDistanceKm ?? t.distanceKm ?? 0,
      }));
    }
    return MOCK_TECHNICIANS;
  }, [techniciansQuery.data]);

  const isLoading = tasksQuery.isLoading || techniciansQuery.isLoading;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardSection
            tasks={liveTasks}
            technicians={liveTechnicians}
            onSelectTech={setSelectedTechId}
            selectedTechId={selectedTechId}
          />
        );
      case "workorders":
        return <WorkOrdersSection tasks={liveTasks} />;
      case "technicians":
        return <TechniciansSection technicians={liveTechnicians} />;
      case "map":
        return (
          <View style={{ flex: 1, padding: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 16 }]}>Live Fleet Map</Text>
            <View style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
              <FleetMapPanel
                technicians={liveTechnicians}
                selectedId={selectedTechId}
                onSelect={setSelectedTechId}
              />
            </View>
          </View>
        );
      case "reports":
        return (
          <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
            <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
            <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 16 }]}>Reports coming soon</Text>
          </View>
        );
      case "settings":
        return (
          <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
            <IconSymbol name="gear" size={48} color={colors.muted} />
            <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 16 }]}>Settings</Text>
            <Pressable
              style={({ pressed }) => [styles.newOrderBtn, { backgroundColor: NVC_BLUE, marginTop: 16, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/(tabs)/settings" as any)}
            >
              <Text style={styles.newOrderBtnText}>Open App Settings</Text>
            </Pressable>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Sidebar active={activeSection} onSelect={setActiveSection} />

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Top bar — white floating bar */}
        <View style={[styles.topBar, {
          backgroundColor: colors.surface,
          borderBottomColor: "transparent",
          shadowColor: "#1E3A5F",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }]}>
          <View>
            <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? "Dashboard"}
            </Text>
            <Text style={[styles.topBarSub, { color: colors.muted }]}>
              {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              style={({ pressed }) => [styles.topBarBtn, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="bell.fill" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.newOrderBtn,
                { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/create-task" as any)}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <Text style={styles.newOrderBtnText}>New Order</Text>
            </Pressable>
          </View>
        </View>

        {/* Section content */}
        {renderContent()}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },

  // Sidebar
  sidebar: {
    width: 220,
    flexDirection: "column",
    borderRightWidth: 1,
  },
  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sidebarLogoImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  sidebarBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  sidebarBrandSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sidebarNav: {
    flex: 1,
    paddingTop: 8,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  sidebarItemLabel: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  sidebarBadge: {
    backgroundColor: NVC_ORANGE,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  sidebarBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  sidebarFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  sidebarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  sidebarUserName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  sidebarUserRole: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
  },

  // Main content
  mainContent: {
    flex: 1,
    flexDirection: "column",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  topBarSub: {
    fontSize: 12,
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 130,
    borderRadius: 16,
    padding: 18,
    gap: 6,
    // Shadow for floating effect
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    // Smooth hover transition on web
    transitionDuration: Platform.OS === "web" ? "200ms" : undefined,
    transitionProperty: Platform.OS === "web" ? "transform, box-shadow" : undefined,
  } as any,
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
  statSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  // Two-column layout
  twoCol: {
    flexDirection: "row",
    gap: 16,
    flex: 1,
  },
  leftCol: {
    flex: 2,
    gap: 16,
  },
  rightCol: {
    flex: 1,
    gap: 16,
    minWidth: 260,
  },

  // Cards — white floating panels
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    // No border — shadow provides depth
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  seeAllBtn: {},
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Map
  mapPanel: {
    height: 240,
    position: "relative",
    overflow: "hidden",
  },
  mapGridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mapGridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mapRoad: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#1e3a5f",
  },
  mapRoadV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#1e3a5f",
  },
  mapCityLabel: {
    position: "absolute",
    top: 8,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mapCityText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  techPin: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -16,
    marginTop: -16,
  },
  techPinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  techPinInitials: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
  },
  techPinLabel: {
    position: "absolute",
    top: -22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    left: -10,
  },
  techPinLabelText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "600",
  },
  mapAttr: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapAttrText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
  },

  // Work Order rows
  woRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 12,
    borderBottomWidth: 1,
  },
  woStatusBar: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 10,
  },
  woMain: {
    flex: 1,
    gap: 2,
  },
  woTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  woOrderRef: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  woPriorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  woPriorityText: {
    fontSize: 9,
    fontWeight: "700",
  },
  woStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  woStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  woCustomer: {
    fontSize: 13,
    fontWeight: "600",
  },
  woAddress: {
    fontSize: 11,
  },
  woTech: {
    fontSize: 11,
    fontWeight: "500",
  },
  woTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  woTimeText: {
    fontSize: 11,
  },

  // Tech rows
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
  },
  techAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  techAvatarText: {
    fontSize: 12,
    fontWeight: "700",
  },
  techStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  techName: {
    fontSize: 12,
    fontWeight: "600",
  },
  techDetail: {
    fontSize: 10,
  },
  techStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  techStatusPillText: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Quick actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  newOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newOrderBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  // Search
  searchRow: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    // outline removed — not valid in React Native
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Table
  tableCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  tableCellRef: {
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },

  // Tech grid cards
  techGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  techCard: {
    width: "calc(33.33% - 8px)" as any,
    minWidth: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
  },
  techCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  techCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  techCardInitials: {
    fontSize: 14,
    fontWeight: "700",
  },
  techCardName: {
    fontSize: 13,
    fontWeight: "700",
  },
  techCardSkills: {
    fontSize: 11,
  },
  techCardStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  techCardStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  techCardDivider: {
    height: 1,
  },
  techCardStats: {
    flexDirection: "row",
    gap: 16,
  },
  techCardStat: {
    alignItems: "center",
  },
  techCardStatValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  techCardStatLabel: {
    fontSize: 10,
  },
  techCardAddress: {
    fontSize: 11,
    fontWeight: "500",
  },
});
