/**
 * NVC360 Desktop Dispatcher Dashboard — v4
 * Full-width web-optimized layout: sidebar + 6 sections
 * Sections: Dashboard, Work Orders, Technicians (full CRUD), Customers (full CRM), Map, Reports
 * Route: /dashboard
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Image,
  Switch,
  Modal,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
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
import { type Customer } from "@/app/(tabs)/customers";
import { useTenant } from "@/hooks/use-tenant";
import { GoogleMapView } from "@/components/google-map-view";
import { useLocationHub } from "@/hooks/use-location-hub";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_TENANT_ID = 1;

const INDUSTRY_OPTIONS = [
  "HVAC", "Plumbing", "Electrical", "Construction", "IT Services",
  "Property Management", "Landscaping", "Cleaning Services", "Logistics",
  "Retail", "Healthcare", "Security", "Flooring", "Roofing",
];

const TERMS_OPTIONS = ["COD", "Net 15", "Net 30", "Net 45", "Net 60", "Prepaid"];

const CUSTOMER_STATUS_OPTIONS: { key: Customer["status"]; label: string; color: string }[] = [
  { key: "active", label: "Active", color: "#16A34A" },
  { key: "vip", label: "VIP", color: "#7C3AED" },
  { key: "prospect", label: "Prospect", color: "#2563EB" },
  { key: "inactive", label: "Inactive", color: "#6B7280" },
];

const COMMON_TAGS = [
  "Commercial", "Residential", "Industrial", "Government", "Recurring",
  "Priority Client", "Net Terms", "Prepaid", "Warranty Active", "High Volume",
  "Seasonal", "New Client", "Referral",
];

const SKILL_OPTIONS = [
  "HVAC", "Plumbing", "Electrical", "Carpentry", "Welding",
  "Painting", "Flooring", "Roofing", "Landscaping", "IT Support",
  "Security Systems", "Appliance Repair", "Concrete", "Drywall",
  "Insulation", "Tile & Stone", "Glass & Glazing", "Elevator",
];

const CERT_OPTIONS = [
  "Red Seal", "Journeyman", "HVAC Certification", "Electrical License",
  "Plumbing License", "First Aid Level 1", "First Aid Level 2",
  "WHMIS 2018", "Fall Protection", "Confined Space", "Forklift",
  "Class 1 Driver", "Class 3 Driver", "Security License",
  "Gas Fitter A", "Gas Fitter B", "Refrigeration License",
  "Low Voltage License", "Fire Suppression",
];

const TRANSPORT_OPTIONS = ["car", "van", "truck", "bike", "foot"] as const;
const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Seasonal"];
const DEPARTMENT_OPTIONS = ["Field Operations", "HVAC", "Plumbing", "Electrical", "IT", "Logistics", "Management", "Admin", "Sales"];

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarSection = "dashboard" | "workorders" | "technicians" | "customers" | "calendar" | "map" | "reports";

interface EditableCustomer {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  status: Customer["status"];
  mailingAddress: string;
  mailingCity: string;
  mailingProvince: string;
  mailingPostal: string;
  sameAddress: boolean;
  physicalAddress: string;
  physicalCity: string;
  physicalProvince: string;
  physicalPostal: string;
  terms: string;
  tags: string[];
  notes: string;
}

interface EditableTechnician {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: string;
  transportType: string;
  skills: string[];
  certifications: string[];
  employeeId: string;
  hireDate: string;
  employmentType: string;
  department: string;
  hourlyRate: string;
  overtimeRate: string;
  homeAddress: string;
  city: string;
  province: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
}

const BLANK_CUSTOMER: EditableCustomer = {
  company: "", contactName: "", email: "", phone: "", industry: "",
  status: "active", mailingAddress: "", mailingCity: "", mailingProvince: "",
  mailingPostal: "", sameAddress: true, physicalAddress: "", physicalCity: "",
  physicalProvince: "", physicalPostal: "", terms: "Net 30", tags: [], notes: "",
};

const BLANK_TECH: EditableTechnician = {
  firstName: "", lastName: "", phone: "", email: "", status: "offline",
  transportType: "van", skills: [], certifications: [], employeeId: "",
  hireDate: "", employmentType: "Full-Time", department: "Field Operations",
  hourlyRate: "", overtimeRate: "", homeAddress: "", city: "", province: "",
  emergencyContact: "", emergencyPhone: "", notes: "",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: SidebarSection; label: string; icon: any; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: "house.fill" },
  { id: "workorders", label: "Work Orders", icon: "paperplane.fill", badge: 2 },
  { id: "technicians", label: "Technicians", icon: "person.2.fill" },
  { id: "customers", label: "Customers", icon: "building.2.fill" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "map", label: "Live Map", icon: "map.fill" },
  { id: "reports", label: "Reports", icon: "chart.bar.fill" },
];

function Sidebar({ active, onSelect }: { active: SidebarSection; onSelect: (s: SidebarSection) => void }) {
  const router = useRouter();
  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <Image source={NVC_LOGO_DARK as any} style={styles.sidebarLogoImg as any} resizeMode="contain" />
        <View>
          <Text style={styles.sidebarBrand}>NVC360</Text>
          <Text style={styles.sidebarBrandSub}>Dispatcher</Text>
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
              ] as ViewStyle[]}
              onPress={() => onSelect(item.id)}
            >
              <IconSymbol name={item.icon} size={18} color={isActive ? "#fff" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.sidebarItemLabel, isActive && { color: "#fff", fontWeight: "700" }] as TextStyle[]}>
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

      {/* Divider */}
      <View style={styles.sidebarDivider} />

      {/* Bottom nav */}
      <View style={styles.sidebarBottomNav}>
        {[
          { label: "Integrations", icon: "link", route: "/integrations" },
          { label: "Settings", icon: "gear", route: "/(tabs)/settings" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: "rgba(255,255,255,0.08)" }] as ViewStyle[]}
            onPress={() => router.push(item.route as any)}
          >
            <IconSymbol name={item.icon as any} size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.sidebarItemLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* User footer */}
      <View style={styles.sidebarFooter}>
        <View style={styles.sidebarAvatar}>
          <Text style={styles.sidebarAvatarText}>D</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sidebarUserName}>Dan Rosenblat</Text>
          <Text style={styles.sidebarUserRole}>Admin · Dispatcher</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Fleet Map (Command Layer) ───────────────────────────────────────────────

const HEAT_ZONES = [
  { x: 42, y: 38, r: 60, color: "#F97316" },
  { x: 58, y: 62, r: 45, color: "#3B8FDF" },
  { x: 28, y: 65, r: 35, color: "#22C55E" },
];

function FleetMapPanel({ technicians, selectedId, onSelect }: {
  technicians: Technician[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.mapPanel}>
      <GoogleMapView
        technicians={technicians.map((t) => ({
          id: t.id,
          name: t.name,
          latitude: t.latitude,
          longitude: t.longitude,
          status: t.status,
          transportType: (t as any).transportType,
        }))}
        selectedId={selectedId}
        onSelectTech={onSelect}
        center={{ lat: 49.8951, lng: -97.1384 }}
        zoom={11}
        height={340}
      />
    </View>
  );
}

// ─── Sparkline (SVG-free inline bars) ────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.sparklineRow}>
      {data.map((v, i) => (
        <View
          key={i}
          style={[styles.sparklineBar, {
            height: Math.max(3, (v / max) * 20),
            backgroundColor: i === data.length - 1 ? color : color + "55",
          }]}
        />
      ))}
    </View>
  );
}

// ─── Dense KPI Stat Card ──────────────────────────────────────────────────────

function StatCard({ label, value, gradient, icon, sub, trend, sparkData }: {
  label: string;
  value: string | number;
  gradient: [string, string];
  icon: any;
  sub?: string;
  trend?: { pct: string; up: boolean };
  sparkData?: number[];
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Pressable
      // @ts-ignore
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.statCard, {
        backgroundColor: gradient[0],
        transform: hovered && Platform.OS === "web" ? [{ translateY: -3 }] : [],
        shadowOpacity: hovered ? 0.32 : 0.18,
        shadowRadius: hovered ? 22 : 12,
        shadowColor: gradient[0],
      }] as ViewStyle[]}
    >
      {/* Gradient overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[1], opacity: 0.5, borderRadius: 14 }]} />
      {/* Inner highlight */}
      <View style={[StyleSheet.absoluteFillObject, {
        borderRadius: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.25)",
        borderLeftWidth: 1,
        borderLeftColor: "rgba(255,255,255,0.12)",
      }]} />

      {/* Top row: icon + trend */}
      <View style={styles.statTopRow}>
        <View style={styles.statIcon}>
          <IconSymbol name={icon} size={15} color="rgba(255,255,255,0.95)" />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.up ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]}>
            <Text style={styles.trendText}>{trend.up ? "▲" : "▼"} {trend.pct}</Text>
          </View>
        )}
      </View>

      {/* Value */}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>

      {/* Sparkline */}
      {sparkData && <MiniSparkline data={sparkData} color="rgba(255,255,255,0.8)" />}

      {/* Secondary context */}
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Pressable>
  );
}

// ─── Work Order Row (Interactive, with SLA countdown) ────────────────────────

function getSlaMinutes(createdAt: string, priority: string): number {
  const slaMap: Record<string, number> = { urgent: 60, high: 120, medium: 240, low: 480 };
  const slaMins = slaMap[priority] ?? 240;
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000;
  return Math.max(0, Math.round(slaMins - elapsed));
}

function WorkOrderRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
  const [hovered, setHovered] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const statusColor = STATUS_COLORS[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];
  const slaLeft = getSlaMinutes(task.createdAt, task.priority);
  const slaRisk = slaLeft < 30;
  const slaWarn = slaLeft < 60 && !slaRisk;

  return (
    <View>
      <Pressable
        // @ts-ignore
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[styles.woRow, {
          backgroundColor: hovered ? NVC_BLUE + "06" : "transparent",
          borderBottomColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: statusColor,
        }] as ViewStyle[]}
        onPress={() => { setExpanded((e) => !e); onPress(); }}
      >
        <View style={styles.woMain}>
          <View style={styles.woTopRow}>
            <Text style={[styles.woOrderRef, { color: NVC_BLUE, fontWeight: "700" }] as TextStyle[]}>{task.orderRef ?? `WO-${task.id}`}</Text>
            <View style={[styles.woPriorityBadge, { backgroundColor: priorityColor + "18", borderWidth: 1, borderColor: priorityColor + "40" }]}>
              <Text style={[styles.woPriorityText, { color: priorityColor, fontWeight: "700" }] as TextStyle[]}>{task.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.woStatusBadge, { backgroundColor: statusColor + "18", borderWidth: 1, borderColor: statusColor + "40" }]}>
              <View style={[styles.liveDot, { backgroundColor: statusColor, width: 5, height: 5 }]} />
              <Text style={[styles.woStatusText, { color: statusColor }] as TextStyle[]}>{STATUS_LABELS[task.status]}</Text>
            </View>
            {/* SLA countdown */}
            {task.status !== "completed" && (
              <View style={[styles.slaBadge, {
                backgroundColor: slaRisk ? "#DC262618" : slaWarn ? "#F59E0B18" : "#22C55E18",
                borderColor: slaRisk ? "#DC262640" : slaWarn ? "#F59E0B40" : "#22C55E40",
              }]}>
                <IconSymbol name="clock.fill" size={9} color={slaRisk ? "#DC2626" : slaWarn ? "#F59E0B" : "#22C55E"} />
                <Text style={[styles.slaText, { color: slaRisk ? "#DC2626" : slaWarn ? "#F59E0B" : "#22C55E" }] as TextStyle[]}>
                  {slaLeft > 0 ? `${slaLeft}m` : "OVERDUE"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.woBottomRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.woCustomer, { color: colors.foreground }] as TextStyle[]}>{task.customerName}</Text>
              <Text style={[styles.woAddress, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{task.jobAddress}</Text>
            </View>
            {task.technicianName && (
              <View style={styles.woTechChip}>
                <View style={[styles.liveDot, { backgroundColor: "#22C55E", width: 5, height: 5 }]} />
                <Text style={[styles.woTech, { color: NVC_BLUE }] as TextStyle[]}>{task.technicianName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.woActions}>
          <Text style={[styles.woTimeText, { color: colors.muted }] as TextStyle[]}>
            {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <View style={styles.woInlineActions}>
            <Pressable style={[styles.woActionBtn, { backgroundColor: NVC_BLUE + "15" }] as ViewStyle[]}>
              <IconSymbol name="person.badge.plus" size={11} color={NVC_BLUE} />
            </Pressable>
            <Pressable style={[styles.woActionBtn, { backgroundColor: "#F59E0B15" }] as ViewStyle[]}>
              <IconSymbol name="paperplane.fill" size={11} color="#F59E0B" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ─── AI Insights Panel ───────────────────────────────────────────────────────

// ─── Gemini AI Insights Panel ────────────────────────────────────────────────

const INSIGHT_TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  risk:           { icon: "exclamationmark.triangle.fill", color: "#DC2626" },
  alert:          { icon: "bell.fill",                     color: "#F59E0B" },
  recommendation: { icon: "lightbulb.fill",                color: "#3B8FDF" },
  summary:        { icon: "checkmark.circle.fill",         color: "#22C55E" },
};

function AIInsightsPanel() {
  const colors = useColors();
  const [dismissed, setDismissed] = React.useState<number[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(true);

  const briefingMutation = trpc.ai.operationalBriefing.useMutation();

  const handleRefresh = React.useCallback(() => {
    setDismissed([]);
    briefingMutation.mutate({ tenantId: DEMO_TENANT_ID });
  }, []);

  // Auto-fetch on mount
  React.useEffect(() => {
    briefingMutation.mutate({ tenantId: DEMO_TENANT_ID });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const briefing = briefingMutation.data;
  const isLoading = briefingMutation.isPending;
  const insights = briefing?.insights?.filter((_, i) => !dismissed.includes(i)) ?? [];

  return (
    <View style={[styles.aiPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={styles.aiPanelHeader}
        onPress={() => setIsExpanded((v) => !v)}
      >
        <View style={styles.aiPanelTitleRow}>
          <View style={[styles.aiPanelDot, { backgroundColor: isLoading ? "#F59E0B" : "#3B8FDF" }]} />
          <Text style={[styles.aiPanelTitle, { color: colors.foreground }] as TextStyle[]}>
            Gemini AI Insights
          </Text>
          {briefing && (
            <View style={[styles.aiBadge, { backgroundColor: NVC_BLUE + "15" }]}>
              <Text style={[styles.aiBadgeText, { color: NVC_BLUE }] as TextStyle[]}>
                {insights.length} active
              </Text>
            </View>
          )}
          {isLoading && (
            <View style={[styles.aiBadge, { backgroundColor: "#F59E0B15" }]}>
              <Text style={[styles.aiBadgeText, { color: "#F59E0B" }] as TextStyle[]}>Analyzing…</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            style={({ pressed }) => [styles.aiActionBtn, { backgroundColor: NVC_BLUE + "15", borderColor: NVC_BLUE + "30", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={handleRefresh}
          >
            <Text style={[styles.aiActionText, { color: NVC_BLUE }] as TextStyle[]}>↻ Refresh</Text>
          </Pressable>
        </View>
        {briefing?.headline && (
          <Text style={[styles.aiInsightText, { color: colors.muted, marginTop: 4, marginLeft: 18 }] as TextStyle[]} numberOfLines={2}>
            {briefing.headline}
          </Text>
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.aiInsightsList}>
          {isLoading && !briefing && (
            <View style={[styles.aiInsightRow, { borderLeftColor: "#F59E0B", backgroundColor: "#F59E0B06" }]}>
              <Text style={[styles.aiInsightText, { color: colors.muted }] as TextStyle[]}>
                Gemini is analyzing your live operations data…
              </Text>
            </View>
          )}
          {insights.map((insight, i) => {
            const cfg = INSIGHT_TYPE_CONFIG[insight.type] ?? INSIGHT_TYPE_CONFIG.summary;
            return (
              <View key={i} style={[styles.aiInsightRow, { borderLeftColor: cfg.color, backgroundColor: cfg.color + "06" }]}>
                <IconSymbol name={cfg.icon} size={14} color={cfg.color} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.aiInsightText, { color: colors.foreground, fontWeight: "600" }] as TextStyle[]} numberOfLines={1}>
                    {insight.title}
                  </Text>
                  <Text style={[styles.aiInsightText, { color: colors.muted, fontSize: 11 }] as TextStyle[]} numberOfLines={2}>
                    {insight.description}
                  </Text>
                </View>
                {insight.actionable && insight.action && (
                  <Pressable style={[styles.aiActionBtn, { backgroundColor: cfg.color + "18", borderColor: cfg.color + "40" }] as ViewStyle[]}>
                    <Text style={[styles.aiActionText, { color: cfg.color }] as TextStyle[]}>{insight.action}</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.aiDismissBtn, { opacity: pressed ? 0.5 : 0.7 }] as ViewStyle[]}
                  onPress={() => setDismissed((d) => [...d, i])}
                >
                  <IconSymbol name="xmark" size={10} color={colors.muted} />
                </Pressable>
              </View>
            );
          })}
          {briefing?.dispatchSuggestions && briefing.dispatchSuggestions.length > 0 && (
            <View style={[styles.aiInsightRow, { borderLeftColor: "#8B5CF6", backgroundColor: "#8B5CF606" }]}>
              <IconSymbol name="paperplane.fill" size={14} color="#8B5CF6" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiInsightText, { color: colors.foreground, fontWeight: "600" }] as TextStyle[]}>
                  {briefing.dispatchSuggestions.length} Smart Dispatch Suggestion{briefing.dispatchSuggestions.length > 1 ? "s" : ""}
                </Text>
                {briefing.dispatchSuggestions.slice(0, 2).map((s, i) => (
                  <Text key={i} style={[styles.aiInsightText, { color: colors.muted, fontSize: 11 }] as TextStyle[]} numberOfLines={1}>
                    Job #{s.taskId} → Tech #{s.suggestedTechId}: {s.reason}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {briefingMutation.isError && (
            <View style={[styles.aiInsightRow, { borderLeftColor: "#EF4444", backgroundColor: "#EF444406" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#EF4444" />
              <Text style={[styles.aiInsightText, { color: colors.muted }] as TextStyle[]}>
                AI analysis unavailable — check server connection
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Dashboard Section (Mission Control) ─────────────────────────────────────

function DashboardSection({ tasks, technicians, customers, tenantId, onSelectTech, selectedTechId, onAssignTask }: {
  tasks: Task[];
  technicians: Technician[];
  customers: Customer[];
  tenantId: number;
  onSelectTech: (id: number) => void;
  selectedTechId: number | null;
  onAssignTask?: (taskId: number, techId: number) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const [woSearch, setWoSearch] = useState("");
  const [woFilter, setWoFilter] = useState<TaskStatus | "all">("all");
  const [techFilter, setTechFilter] = useState<"all" | "online" | "busy" | "offline">("all");

  // Panel collapse state — persisted to localStorage
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try { return window.localStorage.getItem("nvc360_panel_left") === "1"; } catch { return false; }
    }
    return false;
  });
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try { return window.localStorage.getItem("nvc360_panel_right") === "1"; } catch { return false; }
    }
    return false;
  });

  // Persist panel state whenever it changes
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try { window.localStorage.setItem("nvc360_panel_left", leftCollapsed ? "1" : "0"); } catch { /* ignore */ }
    }
  }, [leftCollapsed]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try { window.localStorage.setItem("nvc360_panel_right", rightCollapsed ? "1" : "0"); } catch { /* ignore */ }
    }
  }, [rightCollapsed]);

  // Route optimization overlay
  const [showRoutes, setShowRoutes] = useState(false);

  // Drag-to-assign state (web only — uses HTML5 drag events)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverTechId, setDragOverTechId] = useState<number | null>(null);
  const [assignedOverrides, setAssignedOverrides] = useState<Record<number, number>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Unassign / reassign mutations
  const unassignMutation = trpc.tasks.unassign.useMutation({
    onSuccess: () => onAssignTask?.(-1, -1), // trigger refetch via parent
  });
  const [reassignModal, setReassignModal] = useState<{ taskId: number; taskLabel: string } | null>(null);

  // ETA ticker — re-renders every 30s
  const [now, setNow] = useState(() => new Date());
  // Route ETA auto-refresh key — incrementing forces useMemo to re-run and re-fetch Directions API
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      // Also bump the route refresh key every 30s when overlay is active
      if (showRoutes) setRouteRefreshKey((k) => k + 1);
    }, 30_000);
    return () => clearInterval(t);
  }, [showRoutes]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDrop = (techId: number) => {
    if (draggingTaskId === null) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    const tech = technicians.find((t) => t.id === techId);
    if (!task || !tech) { setDraggingTaskId(null); setDragOverTechId(null); return; }
    // Optimistic UI update
    setAssignedOverrides((prev) => ({ ...prev, [draggingTaskId]: techId }));
    showToast(`✓ ${task.customerName} assigned to ${tech.name}`);
    // Persist to database via tRPC mutation
    onAssignTask?.(draggingTaskId, techId);
    setDraggingTaskId(null);
    setDragOverTechId(null);
  };

  // ETA helper: minutes remaining until technician's active job scheduled time
  const getEtaMinutes = (tech: Technician): number | null => {
    const activeTask = tasks.find(
      (t) => t.technicianId === tech.id && (t.status === "en_route" || t.status === "on_site"),
    );
    if (!activeTask?.scheduledAt) return null;
    return Math.round((new Date(activeTask.scheduledAt).getTime() - now.getTime()) / 60_000);
  };

  const getEtaColor = (mins: number): string => {
    if (mins < 0) return "#EF4444";
    if (mins <= 5) return "#EF4444";
    if (mins <= 15) return "#F59E0B";
    return "#22C55E";
  };

  // Computed metrics
  const active = tasks.filter((t) => ["on_site", "en_route", "assigned"].includes(t.status)).length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const unassigned = tasks.filter((t) => t.status === "unassigned").length;
  const onlineCount = technicians.filter((t) => t.status !== "offline").length;
  const enRoute = technicians.filter((t) => (t.status as any) === "en_route").length;
  const onJob = technicians.filter((t) => t.status === "busy").length;
  const activeCustomers = customers.filter((c) => c.status === "active" || c.status === "vip").length;
  const slaAtRisk = tasks.filter((t) => t.status !== "completed" && getSlaMinutes(t.createdAt, t.priority) < 30).length;

  const sortedTechs = [...technicians].sort(
    (a, b) => (STATUS_SORT_ORDER[a.status] ?? 5) - (STATUS_SORT_ORDER[b.status] ?? 5),
  );

  // Distinct colors for up to 10 technicians' routes
  const ROUTE_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#84CC16","#F97316","#6366F1"];

  // Build route polylines: tech current location → each assigned job in order
  const computedRoutePolylines = useMemo(() => {
    if (!showRoutes) return [];
    return sortedTechs
      .filter((t) => t.status !== "offline")
      .map((tech, idx) => {
        const assignedJobs = tasks
          .filter((t) => t.technicianId === tech.id && ["assigned","en_route","on_site"].includes(t.status))
          .sort((a, b) => (a.scheduledAt && b.scheduledAt ? new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() : 0));
        if (assignedJobs.length === 0) return null;
        const waypoints: Array<{lat:number;lng:number}> = [
          { lat: tech.latitude, lng: tech.longitude },
          ...assignedJobs.map((j) => ({ lat: j.jobLatitude, lng: j.jobLongitude })),
        ];
        return { techId: tech.id, color: ROUTE_COLORS[idx % ROUTE_COLORS.length], waypoints };
      })
      .filter(Boolean) as import("@/components/google-map-view").RoutePolyline[];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoutes, sortedTechs, tasks, routeRefreshKey]);

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Spark data — real 7-day task counts from DB
  const { data: weeklyStats } = trpc.tasks.weeklyStats.useQuery(
    { tenantId },
    { staleTime: 5 * 60 * 1000 },
  );
  const sparkActive = weeklyStats ? weeklyStats.map((d) => d.active) : [0, 0, 0, 0, 0, 0, active];
  const sparkCompleted = weeklyStats ? weeklyStats.map((d) => d.completed) : [0, 0, 0, 0, 0, 0, completed];
  const sparkTechs = Array(7).fill(onlineCount) as number[];
  const sparkClients = Array(7).fill(activeCustomers) as number[];

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>

      {/* ── Top Command Strip ── */}
      <View style={[styles.commandStrip, { backgroundColor: NVC_BLUE_DARK, borderColor: "rgba(255,255,255,0.1)", flexShrink: 0 }]}>
        {[
          { label: "Jobs Today", value: tasks.length, icon: "paperplane.fill", color: "#60A5FA" },
          { label: "SLA Risk", value: slaAtRisk, icon: "exclamationmark.triangle.fill", color: slaAtRisk > 0 ? "#F87171" : "#4ADE80" },
          { label: "Revenue Today", value: "$4,280", icon: "dollarsign.circle.fill", color: "#34D399" },
          { label: "Active Techs", value: onlineCount, icon: "person.2.fill", color: "#A78BFA" },
          { label: "Completed", value: completed, icon: "checkmark.circle.fill", color: "#4ADE80" },
          { label: "Unassigned", value: unassigned, icon: "exclamationmark.triangle.fill", color: unassigned > 0 ? "#F87171" : "#4ADE80" },
        ].map((item) => (
          <View key={item.label} style={styles.commandStripItem}>
            <IconSymbol name={item.icon as any} size={12} color={item.color} />
            <Text style={[styles.commandStripValue, { color: item.color }] as TextStyle[]}>{item.value}</Text>
            <Text style={styles.commandStripLabel}>{item.label}</Text>
          </View>
        ))}
        <View style={styles.commandStripDivider} />
        <View style={styles.commandStripItem}>
          <View style={[styles.liveDot, { backgroundColor: "#4ADE80" }]} />
          <Text style={[styles.commandStripLabel, { color: "#4ADE80", fontWeight: "700" }]}>LIVE</Text>
        </View>
      </View>

      {/* ── 3-Panel Map-Dominant Layout ── */}
      <View style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}>

        {/* ── LEFT PANEL: Work Orders List ── */}
        <View style={[leftCollapsed ? styles.mapPanelCollapsed : styles.mapPanelLeft, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          {/* Panel header */}
          <View style={[styles.mapPanelHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE_DARK }]}>
            {!leftCollapsed && <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>WORK ORDERS</Text>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {!leftCollapsed && (
                <>
                  <View style={{ backgroundColor: NVC_ORANGE, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>{tasks.filter(t => t.status !== "completed").length}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, backgroundColor: NVC_ORANGE, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }] as ViewStyle[]}
                    onPress={() => router.push("/create-task" as any)}
                  >
                    <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>+ New</Text>
                  </Pressable>
                </>
              )}
              {/* Collapse toggle */}
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6, padding: 4 }] as ViewStyle[]}
                onPress={() => setLeftCollapsed((v) => !v)}
              >
                <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>{leftCollapsed ? "▶" : "◀"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Left panel body — hidden when collapsed */}
          {!leftCollapsed && (
            <>
              {/* Search */}
              <View style={[styles.mapPanelSearch, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={12} color={colors.muted} />
                <TextInput
                  style={[{ flex: 1, fontSize: 12, color: colors.foreground }] as TextStyle[]}
                  placeholder="Search orders..."
                  placeholderTextColor={colors.muted}
                  value={woSearch}
                  onChangeText={setWoSearch}
                />
              </View>

              {/* Status filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 8, paddingVertical: 6, flexShrink: 0 }}>
                {(["all", "unassigned", "assigned", "en_route", "on_site", "completed"] as const).map((s) => {
                  const isActive = woFilter === s;
                  const color = s === "all" ? NVC_BLUE : STATUS_COLORS[s as TaskStatus] ?? NVC_BLUE;
                  const label = s === "all" ? "All" : STATUS_LABELS[s as TaskStatus] ?? s;
                  const count = s === "all" ? tasks.length : tasks.filter(t => t.status === s).length;
                  return (
                    <Pressable
                      key={s}
                      style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, marginRight: 5, backgroundColor: isActive ? color : "transparent", borderColor: isActive ? color : color + "60" }] as ViewStyle[]}
                      onPress={() => setWoFilter(s)}
                    >
                      <Text style={[{ fontSize: 10, fontWeight: "700", color: isActive ? "#fff" : color }] as TextStyle[]}>{label} {count > 0 ? `(${count})` : ""}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Work order rows — draggable on web */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {tasks
                  .filter(t => {
                    const matchFilter = woFilter === "all" || t.status === woFilter;
                    const matchSearch = !woSearch || t.customerName.toLowerCase().includes(woSearch.toLowerCase()) || t.jobAddress.toLowerCase().includes(woSearch.toLowerCase());
                    return matchFilter && matchSearch;
                  })
                  .map((task) => {
                    const sc = STATUS_COLORS[task.status] ?? "#6B7280";
                    const pc = PRIORITY_COLORS[task.priority] ?? "#6B7280";
                    const isSelected = selectedTechId !== null && task.technicianId === selectedTechId;
                    const isDragging = draggingTaskId === task.id;
                    return (
                      <View
                        key={task.id}
                        // @ts-ignore — web-only drag events
                        draggable={Platform.OS === "web"}
                        onDragStart={Platform.OS === "web" ? () => setDraggingTaskId(task.id) : undefined}
                        onDragEnd={Platform.OS === "web" ? () => { setDraggingTaskId(null); setDragOverTechId(null); } : undefined}
                        style={[{
                          paddingHorizontal: 10, paddingVertical: 8,
                          borderLeftWidth: 3, borderLeftColor: sc,
                          borderBottomWidth: 1, borderBottomColor: colors.border,
                          backgroundColor: isDragging ? sc + "20" : isSelected ? sc + "10" : "transparent",
                          opacity: isDragging ? 0.6 : 1,
                          cursor: Platform.OS === "web" ? "grab" : undefined,
                        }] as any}
                      >
                        <Pressable onPress={() => router.push(`/task/${task.id}` as any)}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                            <Text style={[{ fontSize: 11, fontWeight: "700", color: NVC_BLUE }] as TextStyle[]} numberOfLines={1}>
                              {task.orderRef ?? `#${task.id}`}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              {Platform.OS === "web" && (
                                <Text style={{ fontSize: 9, color: colors.muted }}>⠿</Text>
                              )}
                              <View style={{ backgroundColor: pc + "20", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={[{ fontSize: 9, fontWeight: "800", color: pc }] as TextStyle[]}>{task.priority.toUpperCase()}</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={[{ fontSize: 12, fontWeight: "600", color: colors.foreground }] as TextStyle[]} numberOfLines={1}>{task.customerName}</Text>
                          <Text style={[{ fontSize: 10, color: colors.muted }] as TextStyle[]} numberOfLines={1}>{task.jobAddress}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                            <View style={{ backgroundColor: sc + "20", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={[{ fontSize: 9, fontWeight: "700", color: sc }] as TextStyle[]}>{STATUS_LABELS[task.status] ?? task.status}</Text>
                            </View>
                            {task.technicianName && (
                              <Text style={[{ fontSize: 10, color: colors.muted }] as TextStyle[]} numberOfLines={1}>· {task.technicianName}</Text>
                            )}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
              </ScrollView>
            </>
          )}
        </View>

        {/* ── CENTER PANEL: Full-height Live Map ── */}
        <View style={{ flex: 1, position: "relative" }}>
          {Platform.OS === "web" ? (
            <GoogleMapView
              technicians={sortedTechs.map((t) => ({ id: t.id, name: t.name, latitude: t.latitude, longitude: t.longitude, status: t.status, transportType: t.transportType }))}
              tasks={tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").map((t) => ({ id: t.id, jobLatitude: t.jobLatitude, jobLongitude: t.jobLongitude, status: t.status, customerName: t.customerName, jobAddress: t.jobAddress }))}
              selectedId={selectedTechId}
              onSelectTech={onSelectTech}
              height={0}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              etaData={Object.fromEntries(
                sortedTechs
                  .map((t) => [t.id, getEtaMinutes(t)] as [number, number | null])
                  .filter(([, v]) => v !== null) as [number, number][]
              )}
              routePolylines={computedRoutePolylines}
            />
          ) : (
            <FleetMapPanel technicians={sortedTechs} selectedId={selectedTechId} onSelect={onSelectTech} />
          )}

          {/* Map overlay: AI Insights pill */}
          <View style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 10, pointerEvents: "none" }}>
            <AIInsightsPanel />
          </View>

          {/* Map toolbar: Optimize Routes button */}
          {Platform.OS === "web" && (
            <View style={{ position: "absolute", bottom: 16, left: "50%", transform: [{ translateX: -80 }], zIndex: 20 }}>
              <Pressable
                style={({ pressed }) => ([
                  {
                    backgroundColor: showRoutes ? "#22C55E" : NVC_BLUE,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 20,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 6,
                    opacity: pressed ? 0.85 : 1,
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ] as ViewStyle[])}
                onPress={() => setShowRoutes((v) => !v)}
              >
                <IconSymbol name="map.fill" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                  {showRoutes ? "Hide Routes" : "Optimize Routes"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── RIGHT PANEL: Technician Roster ── */}
        <View
          style={[rightCollapsed ? styles.mapPanelCollapsed : styles.mapPanelRight, { backgroundColor: colors.surface, borderLeftColor: colors.border }]}
          // @ts-ignore — web-only drag events
          onDragOver={Platform.OS === "web" ? (e: any) => e.preventDefault() : undefined}
        >
          {/* Panel header */}
          <View style={[styles.mapPanelHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE_DARK }]}>
            {/* Collapse toggle */}
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6, padding: 4 }] as ViewStyle[]}
              onPress={() => setRightCollapsed((v) => !v)}
            >
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>{rightCollapsed ? "◀" : "▶"}</Text>
            </Pressable>
            {!rightCollapsed && (
              <>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>FIELD TEAM</Text>
                <View style={[styles.liveBadge, { backgroundColor: "#22C55E25" }]}>
                  <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.liveBadgeText, { color: "#22C55E" }] as TextStyle[]}>{onlineCount} live</Text>
                </View>
              </>
            )}
          </View>

          {/* Right panel body — hidden when collapsed */}
          {!rightCollapsed && (
            <>
              {/* Tech status filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 8, paddingVertical: 6, flexShrink: 0 }}>
                {(["all", "online", "busy", "offline"] as const).map((s) => {
                  const isActive = techFilter === s;
                  const color = s === "all" ? NVC_BLUE : s === "online" ? "#22C55E" : s === "busy" ? "#F59E0B" : "#6B7280";
                  const label = s === "all" ? "All" : s === "online" ? "Available" : s === "busy" ? "On Job" : "Offline";
                  const count = s === "all" ? technicians.length : technicians.filter(t => t.status === s).length;
                  return (
                    <Pressable
                      key={s}
                      style={[{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1.5, marginRight: 4, backgroundColor: isActive ? color : "transparent", borderColor: isActive ? color : color + "60" }] as ViewStyle[]}
                      onPress={() => setTechFilter(s)}
                    >
                      <Text style={[{ fontSize: 10, fontWeight: "700", color: isActive ? "#fff" : color }] as TextStyle[]}>{label} ({count})</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Drag-to-assign hint */}
              {draggingTaskId !== null && (
                <View style={{ backgroundColor: NVC_BLUE + "15", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: NVC_BLUE + "30" }}>
                  <Text style={[{ fontSize: 10, color: NVC_BLUE, fontWeight: "700", textAlign: "center" }] as TextStyle[]}>
                    Drop on a technician to assign
                  </Text>
                </View>
              )}

              {/* Tech roster */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {sortedTechs
                  .filter(t => techFilter === "all" || t.status === techFilter)
                  .map((tech) => {
                    const sc = TECH_STATUS_COLORS[tech.status] ?? "#6B7280";
                    const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                    const utilPct = tech.status === "busy" ? 100 : (tech.status as string) === "en_route" ? 75 : tech.status === "online" ? 30 : 0;
                    const activeTasks = tasks.filter(t => t.technicianId === tech.id && t.status !== "completed");
                    const etaMins = getEtaMinutes(tech);
                    const etaColor = etaMins !== null ? getEtaColor(etaMins) : null;
                    const isDropTarget = dragOverTechId === tech.id;
                    return (
                      <View
                        key={tech.id}
                        // @ts-ignore — web-only drag events
                        onDragOver={Platform.OS === "web" ? (e: any) => { e.preventDefault(); setDragOverTechId(tech.id); } : undefined}
                        onDragLeave={Platform.OS === "web" ? () => setDragOverTechId(null) : undefined}
                        onDrop={Platform.OS === "web" ? (e: any) => { e.preventDefault(); handleDrop(tech.id); } : undefined}
                        style={[{
                          paddingHorizontal: 10, paddingVertical: 8,
                          borderLeftWidth: 3, borderLeftColor: isDropTarget ? "#22C55E" : sc,
                          borderBottomWidth: 1, borderBottomColor: colors.border,
                          backgroundColor: isDropTarget ? "#22C55E15" : selectedTechId === tech.id ? sc + "12" : "transparent",
                          transition: Platform.OS === "web" ? "background-color 0.15s" : undefined,
                        }] as any}
                      >
                        <Pressable onPress={() => onSelectTech(tech.id)}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {/* Avatar */}
                            <View style={{ position: "relative" }}>
                              <View style={[styles.techAvatar, { backgroundColor: sc + "20", borderColor: sc + "50", borderWidth: 1.5, width: 32, height: 32, borderRadius: 16 }]}>
                                <Text style={[styles.techAvatarText, { color: sc, fontSize: 11 }] as TextStyle[]}>{initials}</Text>
                              </View>
                              <View style={[styles.techStatusDot, { backgroundColor: sc, borderColor: colors.surface, width: 8, height: 8, borderRadius: 4, bottom: -1, right: -1 }]} />
                            </View>
                            {/* Info */}
                            <View style={{ flex: 1, gap: 1 }}>
                              <Text style={[{ fontSize: 12, fontWeight: "700", color: colors.foreground }] as TextStyle[]} numberOfLines={1}>{tech.name}</Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={{ backgroundColor: sc + "18", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={[{ fontSize: 9, fontWeight: "700", color: sc }] as TextStyle[]}>{TECH_STATUS_LABELS[tech.status] ?? tech.status}</Text>
                                </View>
                                {/* ETA badge */}
                                {etaMins !== null && etaColor && (
                                  <View style={{ backgroundColor: etaColor + "20", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: etaColor + "50" }}>
                                    <Text style={[{ fontSize: 9, fontWeight: "800", color: etaColor }] as TextStyle[]}>
                                      {etaMins < 0 ? `${Math.abs(etaMins)}m late` : `${etaMins}m`}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            {/* Quick actions */}
                            <View style={{ flexDirection: "row", gap: 3 }}>
                              <Pressable
                                style={[styles.techQuickBtn, { backgroundColor: NVC_BLUE + "15" }] as ViewStyle[]}
                                onPress={() => router.push(`/messages/1` as any)}
                              >
                                <IconSymbol name="paperplane.fill" size={9} color={NVC_BLUE} />
                              </Pressable>
                              <Pressable
                                style={[styles.techQuickBtn, { backgroundColor: "#22C55E15" }] as ViewStyle[]}
                                onPress={() => router.push(`/agent/${tech.id}` as any)}
                              >
                                <IconSymbol name="arrow.right" size={9} color="#22C55E" />
                              </Pressable>
                            </View>
                          </View>
                          {/* Active job address */}
                          {tech.activeTaskAddress && (
                            <Text style={[{ fontSize: 10, color: colors.muted, marginTop: 3, marginLeft: 40 }] as TextStyle[]} numberOfLines={1}>
                              {tech.activeTaskAddress}
                            </Text>
                          )}
                          {/* Utilization bar */}
                          <View style={[styles.utilRow, { marginTop: 4, marginLeft: 40 }]}>
                            <View style={[styles.utilBar, { backgroundColor: colors.border, flex: 1 }]}>
                              <View style={[styles.utilFill, { width: `${utilPct}%` as any, backgroundColor: sc }]} />
                            </View>
                            <Text style={[styles.utilText, { color: colors.muted }] as TextStyle[]}>{utilPct}%</Text>
                          </View>
                          {/* Active job chips with unassign × and reassign buttons */}
                          {activeTasks.length > 0 && (
                            <View style={{ marginTop: 5, marginLeft: 40, gap: 3 }}>
                              {activeTasks.slice(0, 3).map((job) => (
                                <View
                                  key={job.id}
                                  style={[{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: NVC_BLUE + "10",
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 3,
                                    gap: 4,
                                    borderWidth: 1,
                                    borderColor: NVC_BLUE + "25",
                                  }] as ViewStyle[]}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={[{ fontSize: 9, fontWeight: "700", color: NVC_BLUE }] as TextStyle[]} numberOfLines={1}>
                                      {job.orderRef ?? `#${job.id}`}
                                    </Text>
                                    <Text style={[{ fontSize: 9, color: colors.muted }] as TextStyle[]} numberOfLines={1}>
                                      {job.customerName}
                                    </Text>
                                  </View>
                                  {/* Reassign button */}
                                  <Pressable
                                    style={({ pressed }) => ([{
                                      backgroundColor: pressed ? "#3B82F620" : "#3B82F610",
                                      borderRadius: 4,
                                      padding: 3,
                                    }] as ViewStyle[])}
                                    onPress={() => setReassignModal({ taskId: job.id, taskLabel: job.orderRef ?? `#${job.id}` })}
                                  >
                                    <IconSymbol name="arrow.right" size={8} color="#3B82F6" />
                                  </Pressable>
                                  {/* Unassign × button */}
                                  <Pressable
                                    style={({ pressed }) => ([{
                                      backgroundColor: pressed ? "#EF444420" : "#EF444410",
                                      borderRadius: 4,
                                      padding: 3,
                                    }] as ViewStyle[])}
                                    onPress={() => {
                                      unassignMutation.mutate({ taskId: job.id });
                                      showToast(`${job.orderRef ?? `#${job.id}`} unassigned`);
                                    }}
                                  >
                                    <Text style={[{ fontSize: 9, fontWeight: "800", color: "#EF4444", lineHeight: 10 }] as TextStyle[]}>×</Text>
                                  </Pressable>
                                </View>
                              ))}
                              {activeTasks.length > 3 && (
                                <Text style={[{ fontSize: 9, color: colors.muted, marginLeft: 2 }] as TextStyle[]}>+{activeTasks.length - 3} more</Text>
                              )}
                            </View>
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
              </ScrollView>
            </>
          )}
        </View>

      </View>

      {/* ── Reassign Modal ── */}
      {reassignModal && Platform.OS === "web" && (
        <View style={{
          position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center", justifyContent: "center", zIndex: 200,
        } as any}>
          <View style={{
            backgroundColor: colors.surface, borderRadius: 16, padding: 20,
            width: 320, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={[{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 4 }] as TextStyle[]}>
              Reassign {reassignModal.taskLabel}
            </Text>
            <Text style={[{ fontSize: 12, color: colors.muted, marginBottom: 14 }] as TextStyle[]}>
              Select a technician to reassign this job to:
            </Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {sortedTechs.map((tech) => (
                <Pressable
                  key={tech.id}
                  style={({ pressed }) => ([{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    paddingVertical: 10, paddingHorizontal: 12,
                    borderRadius: 10, marginBottom: 4,
                    backgroundColor: pressed ? NVC_BLUE + "18" : colors.background,
                    borderWidth: 1, borderColor: colors.border,
                  }] as ViewStyle[])}
                  onPress={() => {
                    if (onAssignTask) onAssignTask(reassignModal.taskId, tech.id);
                    showToast(`${reassignModal.taskLabel} reassigned to ${tech.name}`);
                    setReassignModal(null);
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: (TECH_STATUS_COLORS[tech.status] ?? "#6B7280") + "20",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={[{ fontSize: 11, fontWeight: "700", color: TECH_STATUS_COLORS[tech.status] ?? "#6B7280" }] as TextStyle[]}>
                      {tech.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 13, fontWeight: "600", color: colors.foreground }] as TextStyle[]}>{tech.name}</Text>
                    <Text style={[{ fontSize: 11, color: colors.muted }] as TextStyle[]}>{TECH_STATUS_LABELS[tech.status] ?? tech.status}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={({ pressed }) => ([{
                marginTop: 12, paddingVertical: 10, borderRadius: 10,
                backgroundColor: pressed ? colors.border : colors.background,
                alignItems: "center", borderWidth: 1, borderColor: colors.border,
              }] as ViewStyle[])}
              onPress={() => setReassignModal(null)}
            >
              <Text style={[{ fontSize: 13, fontWeight: "600", color: colors.muted }] as TextStyle[]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Assignment Toast ── */}
      {toastMsg && Platform.OS === "web" && (
        <View style={{
          position: "absolute", bottom: 24, left: "50%", transform: [{ translateX: -150 }],
          backgroundColor: "#1E3A5F", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
          zIndex: 999, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          flexDirection: "row", alignItems: "center", gap: 8, minWidth: 300,
        } as any}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>
          </View>
          <Text style={[{ color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 }] as TextStyle[]}>{toastMsg}</Text>
        </View>
      )}
    </View>
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
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Work Orders</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>
            {tasks.length} total · {tasks.filter((t) => t.status === "unassigned").length} unassigned
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
          onPress={() => router.push("/create-task" as any)}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>New Order</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }] as TextStyle[]}
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
              style={[styles.filterChip, { backgroundColor: isActive ? NVC_BLUE : colors.surface, borderColor: isActive ? NVC_BLUE : colors.border }] as ViewStyle[]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }] as TextStyle[]}>
                {f.label} {count > 0 ? `(${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE + "10" }]}>
          {["Order Ref", "Customer", "Address", "Technician", "Status", "Priority", "Time"].map((col) => (
            <Text key={col} style={[styles.tableHeaderCell, { color: NVC_BLUE }] as TextStyle[]}>{col}</Text>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="magnifyingglass" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }] as TextStyle[]}>No work orders match your filter.</Text>
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
                  ] as ViewStyle[]}
                  onPress={() => router.push(`/task/${task.id}` as any)}
                >
                  <Text style={[styles.tableCell, styles.tableCellRef, { color: NVC_BLUE }] as TextStyle[]}>{task.orderRef ?? `WO-${task.id}`}</Text>
                  <Text style={[styles.tableCell, { color: colors.foreground }] as TextStyle[]} numberOfLines={1}>{task.customerName}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{task.jobAddress.split(",")[0]}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{task.technicianName ?? "—"}</Text>
                  <View style={styles.tableCell as any}>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }] as TextStyle[]}>{STATUS_LABELS[task.status]}</Text>
                    </View>
                  </View>
                  <View style={styles.tableCell as any}>
                    <View style={[styles.statusPill, { backgroundColor: priorityColor + "20" }]}>
                      <Text style={[styles.statusPillText, { color: priorityColor }] as TextStyle[]}>{task.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]}>
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

// ─── Customer Add/Edit Modal ──────────────────────────────────────────────────

function CustomerModal({ visible, customer, onClose, onSave, onDelete }: {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: (data: EditableCustomer) => void;
  onDelete?: () => void;
}) {
  const colors = useColors();
  const isNew = !customer;
  const [form, setForm] = useState<EditableCustomer>(BLANK_CUSTOMER);
  const [tab, setTab] = useState<"info" | "address" | "billing" | "notes">("info");

  React.useEffect(() => {
    if (visible) {
      if (customer) {
        setForm({
          company: customer.company,
          contactName: customer.contactName,
          email: customer.email,
          phone: customer.phone,
          industry: customer.industry,
          status: customer.status,
          mailingAddress: customer.mailingAddress ?? "",
          mailingCity: customer.city ?? "",
          mailingProvince: customer.province ?? "",
          mailingPostal: customer.postalCode ?? "",
          sameAddress: true,
          physicalAddress: customer.physicalAddress ?? "",
          physicalCity: "",
          physicalProvince: "",
          physicalPostal: "",
          terms: customer.terms,
          tags: customer.tags ?? [],
          notes: customer.notes ?? "",
        });
      } else {
        setForm(BLANK_CUSTOMER);
      }
      setTab("info");
    }
  }, [visible, customer]);

  const update = (key: keyof EditableCustomer, val: any) => setForm((f) => ({ ...f, [key]: val }));
  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const modalTabs = [
    { id: "info" as const, label: "Company Info" },
    { id: "address" as const, label: "Addresses" },
    { id: "billing" as const, label: "Billing & Tags" },
    { id: "notes" as const, label: "Notes" },
  ];

  const Field = ({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
  }) => (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>{label}</Text>
      <TextInput
        style={[styles.modalFieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, height: multiline ? 80 : 40 }] as TextStyle[]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE }]}>
            <View>
              <Text style={styles.modalTitle}>{isNew ? "Add New Customer" : `Edit: ${customer?.company}`}</Text>
              <Text style={styles.modalSubtitle}>{isNew ? "Create a new CRM record" : "Update customer information"}</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]} onPress={onClose}>
              <IconSymbol name="xmark" size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={[styles.modalTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            {modalTabs.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.modalTab, tab === t.id && { borderBottomColor: NVC_BLUE, borderBottomWidth: 2 }] as ViewStyle[]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.modalTabText, { color: tab === t.id ? NVC_BLUE : colors.muted, fontWeight: tab === t.id ? "700" : "400" }] as TextStyle[]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {tab === "info" && (
              <View style={styles.modalSection}>
                <View style={styles.modalRow2}>
                  <Field label="Company Name *" value={form.company} onChange={(v) => update("company", v)} placeholder="Acme Corp" />
                  <Field label="Contact Name" value={form.contactName} onChange={(v) => update("contactName", v)} placeholder="John Smith" />
                </View>
                <View style={styles.modalRow2}>
                  <Field label="Email" value={form.email} onChange={(v) => update("email", v)} placeholder="contact@company.com" />
                  <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+1 (204) 555-0100" />
                </View>
                {/* Industry */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Industry</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 6, paddingVertical: 4 }}>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <Pressable
                        key={ind}
                        style={[styles.chipBtn, { backgroundColor: form.industry === ind ? NVC_BLUE : colors.surface, borderColor: form.industry === ind ? NVC_BLUE : colors.border }] as ViewStyle[]}
                        onPress={() => update("industry", ind)}
                      >
                        <Text style={[styles.chipBtnText, { color: form.industry === ind ? "#fff" : colors.muted }] as TextStyle[]}>{ind}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {/* Status */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Status</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {CUSTOMER_STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s.key}
                      style={[styles.chipBtn, { backgroundColor: form.status === s.key ? s.color : colors.surface, borderColor: form.status === s.key ? s.color : colors.border }] as ViewStyle[]}
                      onPress={() => update("status", s.key)}
                    >
                      <Text style={[styles.chipBtnText, { color: form.status === s.key ? "#fff" : colors.muted }] as TextStyle[]}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {tab === "address" && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Mailing Address</Text>
                <Field label="Street Address" value={form.mailingAddress} onChange={(v) => update("mailingAddress", v)} placeholder="123 Main St" />
                <View style={styles.modalRow3}>
                  <Field label="City" value={form.mailingCity} onChange={(v) => update("mailingCity", v)} placeholder="Winnipeg" />
                  <Field label="Province" value={form.mailingProvince} onChange={(v) => update("mailingProvince", v)} placeholder="MB" />
                  <Field label="Postal Code" value={form.mailingPostal} onChange={(v) => update("mailingPostal", v)} placeholder="R3C 1A1" />
                </View>
                <View style={[styles.modalSwitchRow, { borderColor: colors.border }]}>
                  <Text style={[{ color: colors.foreground, fontSize: 14, fontWeight: "600" }] as TextStyle[]}>Physical address same as mailing</Text>
                  <Switch value={form.sameAddress} onValueChange={(v) => update("sameAddress", v)} trackColor={{ true: NVC_BLUE }} />
                </View>
                {!form.sameAddress && (
                  <>
                    <Text style={[styles.modalSectionTitle, { color: colors.foreground, marginTop: 12 }] as TextStyle[]}>Physical Address</Text>
                    <Field label="Street Address" value={form.physicalAddress} onChange={(v) => update("physicalAddress", v)} placeholder="456 Oak Ave" />
                    <View style={styles.modalRow3}>
                      <Field label="City" value={form.physicalCity} onChange={(v) => update("physicalCity", v)} placeholder="Winnipeg" />
                      <Field label="Province" value={form.physicalProvince} onChange={(v) => update("physicalProvince", v)} placeholder="MB" />
                      <Field label="Postal Code" value={form.physicalPostal} onChange={(v) => update("physicalPostal", v)} placeholder="R3C 1A1" />
                    </View>
                  </>
                )}
              </View>
            )}

            {tab === "billing" && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Payment Terms</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {TERMS_OPTIONS.map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chipBtn, { backgroundColor: form.terms === t ? NVC_BLUE : colors.surface, borderColor: form.terms === t ? NVC_BLUE : colors.border }] as ViewStyle[]}
                      onPress={() => update("terms", t)}
                    >
                      <Text style={[styles.chipBtnText, { color: form.terms === t ? "#fff" : colors.muted }] as TextStyle[]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Tags</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {COMMON_TAGS.map((tag) => {
                    const selected = form.tags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.chipBtn, { backgroundColor: selected ? NVC_ORANGE + "20" : colors.surface, borderColor: selected ? NVC_ORANGE : colors.border }] as ViewStyle[]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text style={[styles.chipBtnText, { color: selected ? NVC_ORANGE : colors.muted }] as TextStyle[]}>{tag}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {tab === "notes" && (
              <View style={styles.modalSection}>
                <Field label="Internal Notes" value={form.notes} onChange={(v) => update("notes", v)} placeholder="Add any internal notes about this customer..." multiline />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {!isNew && onDelete && (
              <Pressable
                style={({ pressed }) => [styles.dangerBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                onPress={onDelete}
              >
                <IconSymbol name="trash.fill" size={14} color="#DC2626" />
                <Text style={styles.dangerBtnText}>Delete</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
              onPress={() => onSave(form)}
            >
              <IconSymbol name="checkmark" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>{isNew ? "Create Customer" : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Customers Section ────────────────────────────────────────────────────────

function CustomersSection() {
  const colors = useColors();
  const { tenantId: liveTenantId } = useTenant();
  const tenantId = liveTenantId ?? DEMO_TENANT_ID;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Customer["status"] | "all">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Live DB queries
  const { data: rawCustomers, refetch: refetchCustomers } = trpc.customers.list.useQuery(
    { tenantId },
    { staleTime: 30_000 },
  );
  const createCustomerMutation = trpc.customers.create.useMutation({ onSuccess: () => refetchCustomers() });
  const updateCustomerMutation = trpc.customers.update.useMutation({ onSuccess: () => refetchCustomers() });
  const deleteCustomerMutation = trpc.customers.delete.useMutation({ onSuccess: () => refetchCustomers() });

  const customers: Customer[] = useMemo(() => {
    if (!rawCustomers || rawCustomers.length === 0) return [];
    return (rawCustomers as any[]).map((c) => ({
      id: c.id,
      company: c.company ?? c.name ?? "—",
      contactName: c.contactName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      industry: c.industry ?? "General",
      status: c.status ?? "active",
      mailingAddress: c.mailingStreet ?? "",
      city: c.mailingCity ?? "",
      province: c.mailingProvince ?? "",
      postalCode: c.mailingPostalCode ?? "",
      country: c.mailingCountry ?? "Canada",
      physicalAddress: c.physicalStreet ?? "",
      terms: c.paymentTerms ?? "net_30",
      tags: c.tags ?? "",
      notes: c.notes ?? "",
      totalJobs: 0,
      totalRevenue: 0,
      lastJobDate: "",
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    }));
  }, [rawCustomers]);

  const filtered = useMemo(() => customers.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.company.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [customers, search, statusFilter]);

  const handleSave = useCallback((data: EditableCustomer) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({
        id: editingCustomer.id,
        tenantId,
        company: data.company,
        contactName: data.contactName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        industry: data.industry || undefined,
        status: data.status as any,
        mailingStreet: data.mailingAddress || undefined,
        mailingCity: data.mailingCity || undefined,
        mailingProvince: data.mailingProvince || undefined,
        mailingPostalCode: data.mailingPostal || undefined,
        physicalStreet: data.sameAddress ? data.mailingAddress : data.physicalAddress || undefined,
        paymentTerms: data.terms || undefined,
        tags: Array.isArray(data.tags) ? data.tags.join(",") : data.tags || undefined,
        notes: data.notes || undefined,
      });
    } else {
      createCustomerMutation.mutate({
        tenantId,
        company: data.company,
        contactName: data.contactName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        industry: data.industry || undefined,
        status: data.status as any,
        mailingStreet: data.mailingAddress || undefined,
        mailingCity: data.mailingCity || undefined,
        mailingProvince: data.mailingProvince || undefined,
        mailingPostalCode: data.mailingPostal || undefined,
        physicalStreet: data.sameAddress ? data.mailingAddress : data.physicalAddress || undefined,
        paymentTerms: data.terms || undefined,
        tags: Array.isArray(data.tags) ? data.tags.join(",") : data.tags || undefined,
        notes: data.notes || undefined,
      });
    }
    setModalVisible(false);
    setEditingCustomer(null);
  }, [editingCustomer, tenantId, createCustomerMutation, updateCustomerMutation]);

  const handleDelete = useCallback(() => {
    if (!editingCustomer) return;
    Alert.alert("Delete Customer", `Remove ${editingCustomer.company}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          deleteCustomerMutation.mutate({ id: editingCustomer.id, tenantId });
          setModalVisible(false);
          setEditingCustomer(null);
        },
      },
    ]);
  }, [editingCustomer, tenantId, deleteCustomerMutation]);

  const statusTabs: { key: Customer["status"] | "all"; label: string; color: string }[] = [
    { key: "all", label: "All", color: NVC_BLUE },
    { key: "vip", label: "VIP", color: "#7C3AED" },
    { key: "active", label: "Active", color: "#16A34A" },
    { key: "prospect", label: "Prospect", color: "#2563EB" },
    { key: "inactive", label: "Inactive", color: "#6B7280" },
  ];

  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);

  return (
    <View style={{ flex: 1, padding: 24 }}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Customers</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>
            {customers.filter((c) => c.status !== "inactive").length} active · {customers.length} total
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
          onPress={() => { setEditingCustomer(null); setModalVisible(true); }}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Customer</Text>
        </Pressable>
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {[
          { label: "Total Clients", value: customers.length.toString(), color: NVC_BLUE },
          { label: "Active / VIP", value: customers.filter((c) => c.status === "active" || c.status === "vip").length.toString(), color: "#16A34A" },
          { label: "Prospects", value: customers.filter((c) => c.status === "prospect").length.toString(), color: "#2563EB" },
          { label: "Total Revenue", value: `$${(totalRevenue / 1000).toFixed(0)}k`, color: NVC_ORANGE },
        ].map((kpi) => (
          <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiValue, { color: kpi.color }] as TextStyle[]}>{kpi.value}</Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }] as TextStyle[]}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }] as TextStyle[]}
            placeholder="Search company, contact, industry..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {statusTabs.map((t) => {
          const isActive = statusFilter === t.key;
          const count = t.key === "all" ? customers.length : customers.filter((c) => c.status === t.key).length;
          return (
            <Pressable
              key={t.key}
              style={[styles.filterChip, { backgroundColor: isActive ? t.color : colors.surface, borderColor: isActive ? t.color : colors.border }] as ViewStyle[]}
              onPress={() => setStatusFilter(t.key)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }] as TextStyle[]}>{t.label} ({count})</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Table */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE + "10" }]}>
          {["Company", "Contact", "Industry", "City", "Terms", "Status", "Jobs", "Revenue", "Actions"].map((col) => (
            <Text key={col} style={[styles.tableHeaderCell, { color: NVC_BLUE }] as TextStyle[]}>{col}</Text>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.2.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }] as TextStyle[]}>No customers match your search.</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, marginTop: 12, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                onPress={() => { setEditingCustomer(null); setModalVisible(true); }}
              >
                <IconSymbol name="plus" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Add First Customer</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((customer) => {
              const statusInfo = CUSTOMER_STATUS_OPTIONS.find((s) => s.key === customer.status);
              return (
                <Pressable
                  key={customer.id}
                  style={({ pressed }) => [
                    styles.tableRow,
                    { borderBottomColor: colors.border, backgroundColor: pressed ? NVC_BLUE + "08" : "transparent" },
                  ] as ViewStyle[]}
                  onPress={() => { setEditingCustomer(customer); setModalVisible(true); }}
                >
                  <View style={[styles.tableCell, { flexDirection: "row", alignItems: "center", gap: 8 }] as any}>
                    <View style={[styles.customerAvatar, { backgroundColor: NVC_BLUE + "20" }]}>
                      <Text style={[styles.customerAvatarText, { color: NVC_BLUE }] as TextStyle[]}>
                        {customer.company.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[{ color: colors.foreground, fontSize: 13, fontWeight: "600" }] as TextStyle[]} numberOfLines={1}>
                      {customer.company}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{customer.contactName}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{customer.industry}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>{customer.city ?? "—"}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]}>{customer.terms}</Text>
                  <View style={styles.tableCell as any}>
                    <View style={[styles.statusPill, { backgroundColor: (statusInfo?.color ?? "#6B7280") + "20" }]}>
                      <Text style={[styles.statusPillText, { color: statusInfo?.color ?? "#6B7280" }] as TextStyle[]}>
                        {statusInfo?.label ?? customer.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.foreground, fontWeight: "600" }] as TextStyle[]}>{customer.totalJobs ?? 0}</Text>
                  <Text style={[styles.tableCell, { color: "#16A34A", fontWeight: "600" }] as TextStyle[]}>
                    ${((customer.totalRevenue ?? 0) / 1000).toFixed(1)}k
                  </Text>
                  <View style={[styles.tableCell, { flexDirection: "row", gap: 6 }] as any}>
                    <Pressable
                      style={({ pressed }) => [styles.actionIconBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={() => { setEditingCustomer(customer); setModalVisible(true); }}
                    >
                      <IconSymbol name="pencil" size={13} color={NVC_BLUE} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      <CustomerModal
        visible={modalVisible}
        customer={editingCustomer}
        onClose={() => { setModalVisible(false); setEditingCustomer(null); }}
        onSave={handleSave}
        onDelete={editingCustomer ? handleDelete : undefined}
      />
    </View>
  );
}

// ─── Technician Add/Edit Modal ────────────────────────────────────────────────

function TechnicianModal({ visible, technician, onClose, onSave, onDelete }: {
  visible: boolean;
  technician: Technician | null;
  onClose: () => void;
  onSave: (data: EditableTechnician) => void;
  onDelete?: () => void;
}) {
  const colors = useColors();
  const isNew = !technician;
  const [form, setForm] = useState<EditableTechnician>(BLANK_TECH);
  const [tab, setTab] = useState<"personal" | "admin" | "skills" | "safety">("personal");

  React.useEffect(() => {
    if (visible) {
      if (technician) {
        const nameParts = technician.name.split(" ");
        setForm({
          firstName: nameParts[0] ?? "",
          lastName: nameParts.slice(1).join(" ") ?? "",
          phone: technician.phone,
          email: technician.email,
          status: technician.status,
          transportType: technician.transportType,
          skills: technician.skills ?? [],
          certifications: [],
          employeeId: `EMP-${technician.id}`,
          hireDate: "",
          employmentType: "Full-Time",
          department: "Field Operations",
          hourlyRate: "",
          overtimeRate: "",
          homeAddress: "",
          city: "",
          province: "",
          emergencyContact: "",
          emergencyPhone: "",
          notes: "",
        });
      } else {
        setForm(BLANK_TECH);
      }
      setTab("personal");
    }
  }, [visible, technician]);

  const update = (key: keyof EditableTechnician, val: any) => setForm((f) => ({ ...f, [key]: val }));
  const toggleSkill = (skill: string) => setForm((f) => ({
    ...f, skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
  }));
  const toggleCert = (cert: string) => setForm((f) => ({
    ...f, certifications: f.certifications.includes(cert) ? f.certifications.filter((c) => c !== cert) : [...f.certifications, cert],
  }));

  const modalTabs = [
    { id: "personal" as const, label: "Personal" },
    { id: "admin" as const, label: "Admin & Pay" },
    { id: "skills" as const, label: "Skills & Certs" },
    { id: "safety" as const, label: "Safety" },
  ];

  const Field = ({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
  }) => (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>{label}</Text>
      <TextInput
        style={[styles.modalFieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, height: multiline ? 80 : 40 }] as TextStyle[]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE }]}>
            <View>
              <Text style={styles.modalTitle}>{isNew ? "Add New Technician" : `Edit: ${technician?.name}`}</Text>
              <Text style={styles.modalSubtitle}>{isNew ? "Create a new field technician profile" : "Update technician information"}</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]} onPress={onClose}>
              <IconSymbol name="xmark" size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={[styles.modalTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            {modalTabs.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.modalTab, tab === t.id && { borderBottomColor: NVC_BLUE, borderBottomWidth: 2 }] as ViewStyle[]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.modalTabText, { color: tab === t.id ? NVC_BLUE : colors.muted, fontWeight: tab === t.id ? "700" : "400" }] as TextStyle[]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {tab === "personal" && (
              <View style={styles.modalSection}>
                <View style={styles.modalRow2}>
                  <Field label="First Name *" value={form.firstName} onChange={(v) => update("firstName", v)} placeholder="Marcus" />
                  <Field label="Last Name *" value={form.lastName} onChange={(v) => update("lastName", v)} placeholder="Johnson" />
                </View>
                <View style={styles.modalRow2}>
                  <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+1 (204) 555-0100" />
                  <Field label="Email" value={form.email} onChange={(v) => update("email", v)} placeholder="tech@company.com" />
                </View>
                <Field label="Home Address" value={form.homeAddress} onChange={(v) => update("homeAddress", v)} placeholder="123 Elm St" />
                <View style={styles.modalRow2}>
                  <Field label="City" value={form.city} onChange={(v) => update("city", v)} placeholder="Winnipeg" />
                  <Field label="Province" value={form.province} onChange={(v) => update("province", v)} placeholder="MB" />
                </View>
                <View style={styles.modalRow2}>
                  <Field label="Emergency Contact" value={form.emergencyContact} onChange={(v) => update("emergencyContact", v)} placeholder="Jane Johnson" />
                  <Field label="Emergency Phone" value={form.emergencyPhone} onChange={(v) => update("emergencyPhone", v)} placeholder="+1 (204) 555-0200" />
                </View>
                {/* Status */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Status</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {Object.entries(TECH_STATUS_COLORS).map(([key, color]) => (
                    <Pressable
                      key={key}
                      style={[styles.chipBtn, { backgroundColor: form.status === key ? color : colors.surface, borderColor: form.status === key ? color : colors.border }] as ViewStyle[]}
                      onPress={() => update("status", key)}
                    >
                      <Text style={[styles.chipBtnText, { color: form.status === key ? "#fff" : colors.muted }] as TextStyle[]}>
                        {TECH_STATUS_LABELS[key] ?? key}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {/* Transport */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Transport Type</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {TRANSPORT_OPTIONS.map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chipBtn, { backgroundColor: form.transportType === t ? NVC_BLUE : colors.surface, borderColor: form.transportType === t ? NVC_BLUE : colors.border }] as ViewStyle[]}
                      onPress={() => update("transportType", t)}
                    >
                      <Text style={[styles.chipBtnText, { color: form.transportType === t ? "#fff" : colors.muted }] as TextStyle[]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {tab === "admin" && (
              <View style={styles.modalSection}>
                <View style={styles.modalRow2}>
                  <Field label="Employee ID" value={form.employeeId} onChange={(v) => update("employeeId", v)} placeholder="EMP-001" />
                  <Field label="Hire Date" value={form.hireDate} onChange={(v) => update("hireDate", v)} placeholder="2024-01-15" />
                </View>
                {/* Employment type */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Employment Type</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chipBtn, { backgroundColor: form.employmentType === t ? NVC_BLUE : colors.surface, borderColor: form.employmentType === t ? NVC_BLUE : colors.border }] as ViewStyle[]}
                      onPress={() => update("employmentType", t)}
                    >
                      <Text style={[styles.chipBtnText, { color: form.employmentType === t ? "#fff" : colors.muted }] as TextStyle[]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                {/* Department */}
                <Text style={[styles.modalFieldLabel, { color: colors.muted }] as TextStyle[]}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 6, paddingVertical: 4 }}>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <Pressable
                        key={d}
                        style={[styles.chipBtn, { backgroundColor: form.department === d ? NVC_BLUE : colors.surface, borderColor: form.department === d ? NVC_BLUE : colors.border }] as ViewStyle[]}
                        onPress={() => update("department", d)}
                      >
                        <Text style={[styles.chipBtnText, { color: form.department === d ? "#fff" : colors.muted }] as TextStyle[]}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.modalRow2}>
                  <Field label="Hourly Rate ($/hr)" value={form.hourlyRate} onChange={(v) => update("hourlyRate", v)} placeholder="35.00" />
                  <Field label="Overtime Rate ($/hr)" value={form.overtimeRate} onChange={(v) => update("overtimeRate", v)} placeholder="52.50" />
                </View>
                <View style={[styles.modalSectionDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Notes</Text>
                <Field label="Admin Notes" value={form.notes} onChange={(v) => update("notes", v)} placeholder="Internal notes..." multiline />
              </View>
            )}

            {tab === "skills" && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Trade Skills ({form.skills.length} selected)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {SKILL_OPTIONS.map((skill) => {
                    const selected = form.skills.includes(skill);
                    return (
                      <Pressable
                        key={skill}
                        style={[styles.chipBtn, { backgroundColor: selected ? NVC_BLUE + "20" : colors.surface, borderColor: selected ? NVC_BLUE : colors.border }] as ViewStyle[]}
                        onPress={() => toggleSkill(skill)}
                      >
                        {selected && <IconSymbol name="checkmark" size={10} color={NVC_BLUE} />}
                        <Text style={[styles.chipBtnText, { color: selected ? NVC_BLUE : colors.muted }] as TextStyle[]}>{skill}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Certifications ({form.certifications.length} selected)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {CERT_OPTIONS.map((cert) => {
                    const selected = form.certifications.includes(cert);
                    return (
                      <Pressable
                        key={cert}
                        style={[styles.chipBtn, { backgroundColor: selected ? NVC_ORANGE + "20" : colors.surface, borderColor: selected ? NVC_ORANGE : colors.border }] as ViewStyle[]}
                        onPress={() => toggleCert(cert)}
                      >
                        {selected && <IconSymbol name="checkmark" size={10} color={NVC_ORANGE} />}
                        <Text style={[styles.chipBtnText, { color: selected ? NVC_ORANGE : colors.muted }] as TextStyle[]}>{cert}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {tab === "safety" && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.foreground }] as TextStyle[]}>Safety Training</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {["WHMIS 2018", "Fall Protection", "Confined Space Entry", "Forklift Operator", "First Aid Level 1",
                    "First Aid Level 2", "CPR Certified", "Fire Safety", "Ladder Safety", "Electrical Safety",
                    "Chemical Handling", "Workplace Violence", "Ergonomics"].map((course) => {
                    const selected = form.certifications.includes(course);
                    return (
                      <Pressable
                        key={course}
                        style={[styles.chipBtn, { backgroundColor: selected ? "#16A34A20" : colors.surface, borderColor: selected ? "#16A34A" : colors.border }] as ViewStyle[]}
                        onPress={() => toggleCert(course)}
                      >
                        {selected && <IconSymbol name="checkmark" size={10} color="#16A34A" />}
                        <Text style={[styles.chipBtnText, { color: selected ? "#16A34A" : colors.muted }] as TextStyle[]}>{course}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.modalRow2}>
                  <Field label="First Aid Expiry" value={""} onChange={() => {}} placeholder="2026-06-01" />
                  <Field label="WHMIS Expiry" value={""} onChange={() => {}} placeholder="2026-12-01" />
                </View>
                <Field label="Medical / Accommodation Notes" value={form.notes} onChange={(v) => update("notes", v)} placeholder="Any relevant medical notes..." multiline />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {!isNew && onDelete && (
              <Pressable style={({ pressed }) => [styles.dangerBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]} onPress={onDelete}>
                <IconSymbol name="trash.fill" size={14} color="#DC2626" />
                <Text style={styles.dangerBtnText}>Delete</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
              onPress={() => onSave(form)}
            >
              <IconSymbol name="checkmark" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>{isNew ? "Create Technician" : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Technicians Section ──────────────────────────────────────────────────────

function TechniciansSection({ technicians: initialTechs }: { technicians: Technician[] }) {
  const colors = useColors();
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...technicians].sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 5) - (STATUS_SORT_ORDER[b.status] ?? 5));
    return sorted.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.skills.some((s) => s.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [technicians, search, statusFilter]);

  const handleSave = useCallback((data: EditableTechnician) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    if (editingTech) {
      setTechnicians((prev) => prev.map((t) => t.id === editingTech.id ? {
        ...t,
        name: fullName,
        phone: data.phone,
        email: data.email,
        status: data.status as any,
        transportType: data.transportType as any,
        skills: data.skills,
      } : t));
    } else {
      const newTech: Technician = {
        id: Date.now(),
        name: fullName,
        phone: data.phone,
        email: data.email,
        status: data.status as any,
        latitude: 49.8951,
        longitude: -97.1384,
        transportType: data.transportType as any,
        skills: data.skills,
        todayJobs: 0,
        todayDistanceKm: 0,
      };
      setTechnicians((prev) => [newTech, ...prev]);
    }
    setModalVisible(false);
    setEditingTech(null);
  }, [editingTech]);

  const handleDelete = useCallback(() => {
    if (!editingTech) return;
    Alert.alert("Delete Technician", `Remove ${editingTech.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          setTechnicians((prev) => prev.filter((t) => t.id !== editingTech.id));
          setModalVisible(false);
          setEditingTech(null);
        },
      },
    ]);
  }, [editingTech]);

  const statusTabs = [
    { key: "all", label: "All", color: NVC_BLUE },
    { key: "busy", label: "On Job", color: "#F59E0B" },
    { key: "en_route", label: "En Route", color: "#8B5CF6" },
    { key: "online", label: "Available", color: "#22C55E" },
    { key: "on_break", label: "On Break", color: "#3B82F6" },
    { key: "offline", label: "Offline", color: "#6B7280" },
  ];

  const onlineCount = technicians.filter((t) => t.status !== "offline").length;

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Field Team</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>
            {onlineCount} active · {technicians.length} total
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
          onPress={() => { setEditingTech(null); setModalVisible(true); }}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Technician</Text>
        </Pressable>
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {[
          { label: "Total Team", value: technicians.length.toString(), color: NVC_BLUE },
          { label: "On Job", value: technicians.filter((t) => t.status === "busy").length.toString(), color: "#F59E0B" },
          { label: "En Route", value: technicians.filter((t) => (t.status as any) === "en_route").length.toString(), color: "#8B5CF6" },
          { label: "Available", value: technicians.filter((t) => t.status === "online").length.toString(), color: "#22C55E" },
        ].map((kpi) => (
          <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiValue, { color: kpi.color }] as TextStyle[]}>{kpi.value}</Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }] as TextStyle[]}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }] as TextStyle[]}
            placeholder="Search by name or skill..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {statusTabs.map((t) => {
          const isActive = statusFilter === t.key;
          const count = t.key === "all" ? technicians.length : technicians.filter((tech) => tech.status === t.key).length;
          return (
            <Pressable
              key={t.key}
              style={[styles.filterChip, { backgroundColor: isActive ? t.color : colors.surface, borderColor: isActive ? t.color : colors.border }] as ViewStyle[]}
              onPress={() => setStatusFilter(t.key)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }] as TextStyle[]}>{t.label} ({count})</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Table */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: NVC_BLUE + "10" }]}>
          {["Technician", "Phone", "Skills", "Transport", "Jobs Today", "Distance", "Status", "Actions"].map((col) => (
            <Text key={col} style={[styles.tableHeaderCell, { color: NVC_BLUE }] as TextStyle[]}>{col}</Text>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.2.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }] as TextStyle[]}>No technicians match your search.</Text>
            </View>
          ) : (
            filtered.map((tech) => {
              const statusColor = TECH_STATUS_COLORS[tech.status] ?? "#6B7280";
              const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return (
                <Pressable
                  key={tech.id}
                  style={({ pressed }) => [
                    styles.tableRow,
                    { borderBottomColor: colors.border, backgroundColor: pressed ? NVC_BLUE + "08" : "transparent", borderLeftWidth: 3, borderLeftColor: statusColor },
                  ] as ViewStyle[]}
                  onPress={() => router.push(`/agent/${tech.id}` as any)}
                >
                  <View style={[styles.tableCell, { flexDirection: "row", alignItems: "center", gap: 8 }] as any}>
                    <View style={[styles.techTableAvatar, { backgroundColor: statusColor + "25" }]}>
                      <Text style={[styles.techTableAvatarText, { color: statusColor }] as TextStyle[]}>{initials}</Text>
                    </View>
                    <View>
                      <Text style={[{ color: colors.foreground, fontSize: 13, fontWeight: "600" }] as TextStyle[]}>{tech.name}</Text>
                      <Text style={[{ color: colors.muted, fontSize: 11 }] as TextStyle[]} numberOfLines={1}>{tech.email}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]}>{tech.phone}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
                    {tech.skills.slice(0, 2).join(", ")}{tech.skills.length > 2 ? ` +${tech.skills.length - 2}` : ""}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]}>{tech.transportType}</Text>
                  <Text style={[styles.tableCell, { color: colors.foreground, fontWeight: "600" }] as TextStyle[]}>{tech.todayJobs}</Text>
                  <Text style={[styles.tableCell, { color: colors.muted }] as TextStyle[]}>{tech.todayDistanceKm} km</Text>
                  <View style={styles.tableCell as any}>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }] as TextStyle[]}>
                        {TECH_STATUS_LABELS[tech.status] ?? tech.status}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flexDirection: "row", gap: 6 }] as any}>
                    <Pressable
                      style={({ pressed }) => [styles.actionIconBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={(e) => { e.stopPropagation?.(); setEditingTech(tech); setModalVisible(true); }}
                    >
                      <IconSymbol name="pencil" size={13} color={NVC_BLUE} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionIconBtn, { backgroundColor: "#16A34A15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={(e) => { e.stopPropagation?.(); router.push(`/agent/${tech.id}` as any); }}
                    >
                      <IconSymbol name="eye.fill" size={13} color="#16A34A" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      <TechnicianModal
        visible={modalVisible}
        technician={editingTech}
        onClose={() => { setModalVisible(false); setEditingTech(null); }}
        onSave={handleSave}
        onDelete={editingTech ? handleDelete : undefined}
      />
    </View>
  );
}

// ─── Calendar Section ────────────────────────────────────────────────────────

const CALENDAR_EVENT_COLORS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#E85D04", "#EC4899", "#14B8A6",
];

const EVENT_TYPE_OPTIONS = [
  { key: "work_order" as const, label: "Work Order", color: "#3B82F6" },
  { key: "event" as const, label: "Event", color: "#22C55E" },
  { key: "task" as const, label: "Task", color: "#F59E0B" },
  { key: "note" as const, label: "Note", color: "#8B5CF6" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarEvent {
  id: number;
  type: "note" | "task" | "event" | "work_order";
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  endTime?: string;
  color?: string;
  isCompleted?: boolean;
  taskId?: number;
}

function CalendarSection() {
  const colors = useColors();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(
    today.toISOString().split("T")[0]
  );
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    type: "event" as CalendarEvent["type"],
    title: "",
    description: "",
    time: "",
    endTime: "",
    color: CALENDAR_EVENT_COLORS[0],
  });

  // Date range for the visible month
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const dateFrom = monthStart.toISOString().split("T")[0];
  const dateTo = monthEnd.toISOString().split("T")[0];

  const { data: rawEvents, refetch } = trpc.calendar.list.useQuery(
    { tenantId: DEMO_TENANT_ID, dateFrom, dateTo },
    { staleTime: 30_000 }
  );

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { refetch(); setShowEventForm(false); resetForm(); },
  });
  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => { refetch(); setEditingEvent(null); },
  });
  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => { refetch(); setEditingEvent(null); },
  });

  const events: CalendarEvent[] = useMemo(() => {
    if (!rawEvents) return [];
    return (rawEvents as any[]).map((e) => ({
      id: e.id,
      type: e.type as CalendarEvent["type"],
      title: e.title,
      description: e.description,
      date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
      time: e.time,
      endTime: e.endTime,
      color: e.color ?? "#3B82F6",
      isCompleted: e.isCompleted ?? false,
      taskId: e.taskId,
    }));
  }, [rawEvents]);

  const resetForm = () => setNewEvent({
    type: "event", title: "", description: "", time: "", endTime: "",
    color: CALENDAR_EVENT_COLORS[0],
  });

  // Build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
  const calendarCells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const eventsOnDate = (dateStr: string) =>
    events.filter((e) => e.date === dateStr);

  const selectedEvents = eventsOnDate(selectedDate);

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-CA", {
    month: "long", year: "numeric",
  });

  const handleSaveEvent = () => {
    if (!newEvent.title.trim()) return;
    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        tenantId: DEMO_TENANT_ID,
        title: newEvent.title,
        description: newEvent.description || undefined,
        time: newEvent.time || undefined,
        endTime: newEvent.endTime || undefined,
        color: newEvent.color,
      });
    } else {
      createMutation.mutate({
        tenantId: DEMO_TENANT_ID,
        type: newEvent.type,
        title: newEvent.title,
        description: newEvent.description || undefined,
        date: selectedDate,
        time: newEvent.time || undefined,
        endTime: newEvent.endTime || undefined,
        color: newEvent.color,
      });
    }
  };

  const handleEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setNewEvent({
      type: ev.type,
      title: ev.title,
      description: ev.description ?? "",
      time: ev.time ?? "",
      endTime: ev.endTime ?? "",
      color: ev.color ?? CALENDAR_EVENT_COLORS[0],
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    deleteMutation.mutate({ id: ev.id, tenantId: DEMO_TENANT_ID });
  };

  const handleToggleComplete = (ev: CalendarEvent) => {
    updateMutation.mutate({
      id: ev.id,
      tenantId: DEMO_TENANT_ID,
      isCompleted: !ev.isCompleted,
    });
  };

  return (
    <View style={{ flex: 1, padding: 24, flexDirection: "row", gap: 20 }}>
      {/* ── Left: Calendar Grid ── */}
      <View style={{ flex: 1, minWidth: 360 }}>
        {/* Month Navigation */}
        <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>
              {monthName}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>
              {events.length} event{events.length !== 1 ? "s" : ""} this month
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={({ pressed }) => [styles.topBarBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else setCurrentMonth(m => m - 1);
              }}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.topBarBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => {
                setCurrentYear(today.getFullYear());
                setCurrentMonth(today.getMonth());
                setSelectedDate(today.toISOString().split("T")[0]);
              }}
            >
              <Text style={{ fontSize: 12, color: NVC_BLUE, fontWeight: "600" }}>Today</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.topBarBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else setCurrentMonth(m => m + 1);
              }}
            >
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Day-of-week headers */}
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {DAYS_OF_WEEK.map((d) => (
            <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar cells */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={{ width: "14.28%", aspectRatio: 1 }} />;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsOnDate(dateStr);
            const isToday = dateStr === today.toISOString().split("T")[0];
            const isSelected = dateStr === selectedDate;
            return (
              <Pressable
                key={dateStr}
                style={({ pressed }) => [{
                  width: "14.28%",
                  aspectRatio: 1,
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: 6,
                  borderRadius: 10,
                  backgroundColor: isSelected ? NVC_BLUE + "18" : isToday ? NVC_ORANGE + "12" : "transparent",
                  borderWidth: isSelected ? 1.5 : isToday ? 1 : 0,
                  borderColor: isSelected ? NVC_BLUE : isToday ? NVC_ORANGE : "transparent",
                  opacity: pressed ? 0.75 : 1,
                }] as ViewStyle[]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={[{
                  fontSize: 13,
                  fontWeight: isToday || isSelected ? "700" : "400",
                  color: isSelected ? NVC_BLUE : isToday ? NVC_ORANGE : colors.foreground,
                }] as TextStyle[]}>{day}</Text>
                {/* Event dots */}
                <View style={{ flexDirection: "row", gap: 2, marginTop: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ev.color ?? NVC_BLUE }} />
                  ))}
                  {dayEvents.length > 3 && (
                    <Text style={{ fontSize: 8, color: colors.muted }}>+{dayEvents.length - 3}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Right: Day Detail + Event Form ── */}
      <View style={{ width: 320, gap: 16 }}>
        {/* Selected day header */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[{ fontSize: 15, fontWeight: "700", color: colors.foreground }] as TextStyle[]}>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
              onPress={() => { setEditingEvent(null); resetForm(); setShowEventForm(true); }}
            >
              <IconSymbol name="plus" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>Add</Text>
            </Pressable>
          </View>

          {/* Event list for selected day */}
          {selectedEvents.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <IconSymbol name="calendar" size={28} color={colors.border} />
              <Text style={[{ color: colors.muted, fontSize: 13, marginTop: 8 }] as TextStyle[]}>No events on this day</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {selectedEvents.map((ev) => (
                <View
                  key={ev.id}
                  style={[{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: (ev.color ?? NVC_BLUE) + "10",
                    borderLeftWidth: 3,
                    borderLeftColor: ev.color ?? NVC_BLUE,
                    opacity: ev.isCompleted ? 0.6 : 1,
                  }] as ViewStyle[]}
                >
                  <Pressable
                    style={[{
                      width: 18, height: 18, borderRadius: 9,
                      borderWidth: 1.5, borderColor: ev.color ?? NVC_BLUE,
                      backgroundColor: ev.isCompleted ? (ev.color ?? NVC_BLUE) : "transparent",
                      alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }] as ViewStyle[]}
                    onPress={() => handleToggleComplete(ev)}
                  >
                    {ev.isCompleted && <IconSymbol name="checkmark" size={10} color="#fff" />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[{
                      fontSize: 13, fontWeight: "600",
                      color: colors.foreground,
                      textDecorationLine: ev.isCompleted ? "line-through" : "none",
                    }] as TextStyle[]}>{ev.title}</Text>
                    {ev.time && (
                      <Text style={[{ fontSize: 11, color: colors.muted, marginTop: 2 }] as TextStyle[]}>
                        {ev.time}{ev.endTime ? ` – ${ev.endTime}` : ""}
                      </Text>
                    )}
                    {ev.description && (
                      <Text style={[{ fontSize: 11, color: colors.muted, marginTop: 2 }] as TextStyle[]} numberOfLines={2}>
                        {ev.description}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Pressable
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }] as ViewStyle[]}
                      onPress={() => handleEditEvent(ev)}
                    >
                      <IconSymbol name="pencil" size={14} color={colors.muted} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }] as ViewStyle[]}
                      onPress={() => handleDeleteEvent(ev)}
                    >
                      <IconSymbol name="trash" size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Event creation / editing form */}
        {showEventForm && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[{ fontSize: 14, fontWeight: "700", color: colors.foreground }] as TextStyle[]}>
                {editingEvent ? "Edit Event" : "New Event"}
              </Text>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }] as ViewStyle[]}
                onPress={() => { setShowEventForm(false); setEditingEvent(null); resetForm(); }}
              >
                <IconSymbol name="xmark" size={16} color={colors.muted} />
              </Pressable>
            </View>

            {/* Type selector */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.chipBtn, {
                    backgroundColor: newEvent.type === opt.key ? opt.color : colors.background,
                    borderColor: newEvent.type === opt.key ? opt.color : colors.border,
                  }] as ViewStyle[]}
                  onPress={() => setNewEvent((f) => ({ ...f, type: opt.key }))}
                >
                  <Text style={[styles.chipBtnText, { color: newEvent.type === opt.key ? "#fff" : colors.muted }] as TextStyle[]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Title */}
            <TextInput
              style={[styles.modalFieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginBottom: 8 }] as TextStyle[]}
              placeholder="Title *"
              placeholderTextColor={colors.muted}
              value={newEvent.title}
              onChangeText={(v) => setNewEvent((f) => ({ ...f, title: v }))}
              returnKeyType="done"
            />

            {/* Time row */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[styles.modalFieldInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }] as TextStyle[]}
                placeholder="Start time (e.g. 09:00)"
                placeholderTextColor={colors.muted}
                value={newEvent.time}
                onChangeText={(v) => setNewEvent((f) => ({ ...f, time: v }))}
                returnKeyType="done"
              />
              <TextInput
                style={[styles.modalFieldInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }] as TextStyle[]}
                placeholder="End time (e.g. 10:00)"
                placeholderTextColor={colors.muted}
                value={newEvent.endTime}
                onChangeText={(v) => setNewEvent((f) => ({ ...f, endTime: v }))}
                returnKeyType="done"
              />
            </View>

            {/* Description */}
            <TextInput
              style={[styles.modalFieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, height: 64, marginBottom: 10 }] as TextStyle[]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.muted}
              value={newEvent.description}
              onChangeText={(v) => setNewEvent((f) => ({ ...f, description: v }))}
              multiline
              textAlignVertical="top"
            />

            {/* Color picker */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {CALENDAR_EVENT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: c,
                    borderWidth: newEvent.color === c ? 2.5 : 0,
                    borderColor: "#fff",
                    shadowColor: newEvent.color === c ? c : "transparent",
                    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
                  }] as ViewStyle[]}
                  onPress={() => setNewEvent((f) => ({ ...f, color: c }))}
                />
              ))}
            </View>

            {/* Save button */}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.8 : 1, justifyContent: "center" }] as ViewStyle[]}
              onPress={handleSaveEvent}
            >
              <Text style={styles.primaryBtnText}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingEvent ? "Update Event" : "Save Event"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DesktopDashboard() {
  const colors = useColors();
  const router = useRouter();
  const { tenantId: liveTenantId } = useTenant();
  const tenantId = liveTenantId ?? DEMO_TENANT_ID;
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  // Real-time WebSocket position overrides (techId → {lat, lng})
  const [wsPositions, setWsPositions] = useState<Record<number, { lat: number; lng: number }>>({});

  // Subscribe to real-time location updates — updates fleet map instantly
  useLocationHub({
    tenantId: tenantId,
    enabled: Platform.OS === "web",
    onLocationUpdate: useCallback((techId: number, lat: number, lng: number) => {
      setWsPositions((prev) => ({ ...prev, [techId]: { lat, lng } }));
    }, []),
  });

  const tasksQuery = trpc.tasks.list.useQuery(
    { tenantId: tenantId },
    { refetchInterval: 60_000, staleTime: 30_000 },
  );
  const techniciansQuery = trpc.technicians.list.useQuery(
    { tenantId: tenantId },
    { refetchInterval: 60_000, staleTime: 30_000 },
  );
  const customersQuery = trpc.customers.list.useQuery(
    { tenantId: tenantId },
    { refetchInterval: 60_000, staleTime: 30_000 },
  );

  // Notification history panel state
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "assigned" | "unassigned" | "failed">("all");
  const [readNotifIds, setReadNotifIds] = useState<Set<number>>(new Set());
  const notifHistoryQuery = trpc.notifications.dispatchHistory.useQuery(
    { tenantId: tenantId, limit: 20 },
    { refetchInterval: 30_000, staleTime: 15_000 },
  );
  const notifHistory: Array<{ id: number; title: string; body: string | null; createdAt: Date | string; entityId: number | null; pushStatus: string | null }> = useMemo(() => {
    return (notifHistoryQuery.data ?? []) as any[];
  }, [notifHistoryQuery.data]);
  const filteredNotifHistory = useMemo(() => {
    if (notifFilter === "all") return notifHistory;
    if (notifFilter === "assigned") return notifHistory.filter((n) => n.title?.toLowerCase().includes("assigned") || n.body?.toLowerCase().includes("assigned"));
    if (notifFilter === "unassigned") return notifHistory.filter((n) => n.pushStatus === null || n.pushStatus === "no_token");
    if (notifFilter === "failed") return notifHistory.filter((n) => n.pushStatus === "failed");
    return notifHistory;
  }, [notifHistory, notifFilter]);
  const unreadNotifCount = notifHistory.filter((n) => !readNotifIds.has(n.id) && !(n as any).readAt).length;
  const markAllRead = () => setReadNotifIds(new Set(notifHistory.map((n) => n.id)));

  // Drag-to-assign mutation — persists to DB then refetches
  // Map live customers to the Customer type used by DashboardSection
  const liveCustomers: Customer[] = useMemo(() => {
    if (!customersQuery.data || customersQuery.data.length === 0) return [];
    return (customersQuery.data as any[]).map((c) => ({
      id: c.id,
      company: c.company ?? c.name ?? "—",
      contactName: c.contactName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      industry: c.industry ?? "General",
      status: c.status ?? "active",
      mailingAddress: c.mailingStreet ?? "",
      city: c.mailingCity ?? "",
      province: c.mailingProvince ?? "",
      postalCode: c.mailingPostalCode ?? "",
      country: c.mailingCountry ?? "Canada",
      physicalAddress: c.physicalStreet ?? "",
      terms: c.paymentTerms ?? "net_30",
      tags: c.tags ?? "",
      notes: c.notes ?? "",
      totalJobs: 0,
      openJobs: 0,
      totalRevenue: 0,
      lastJobDate: "",
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    }));
  }, [customersQuery.data]);

  const assignMutation = trpc.tasks.assign.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      techniciansQuery.refetch();
    },
  });

  const liveTasks: Task[] = useMemo(() => {
    if (tasksQuery.data) {
      return tasksQuery.data.map((t: any) => ({
        id: t.id, jobHash: t.jobHash ?? `job-${t.id}`, status: (t.status as TaskStatus) ?? "unassigned",
        priority: t.priority ?? "medium", customerName: t.customerName ?? "—",
        customerPhone: t.customerPhone ?? "", customerEmail: t.customerEmail ?? "",
        jobAddress: t.address ?? t.jobAddress ?? "", jobLatitude: t.lat ?? 49.8951,
        jobLongitude: t.lng ?? -97.1384, technicianId: t.technicianId ?? undefined,
        technicianName: t.technicianName ?? undefined, orderRef: t.orderRef ?? `WO-${t.id}`,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString() : undefined,
      }));
    }
    return [];
  }, [tasksQuery.data]);

  const liveTechnicians: Technician[] = useMemo(() => {
    const base = (() => {
      if (techniciansQuery.data && techniciansQuery.data.length > 0) {
        return techniciansQuery.data.map((row: any) => {
          // getTechniciansByTenant returns { tech: {...}, user: {...} } nested objects
          const t = row.tech ?? row;
          const u = row.user ?? {};
          const firstName = t.firstName ?? u.firstName ?? "";
          const lastName = t.lastName ?? u.lastName ?? "";
          const fullName = `${firstName} ${lastName}`.trim() || t.name || "Technician";
          return {
            id: t.id,
            name: fullName,
            phone: t.phone ?? u.phone ?? "",
            email: t.email ?? u.email ?? "",
            status: (t.status as any) ?? "offline",
            latitude: t.latitude ? parseFloat(t.latitude) : 49.8951,
            longitude: t.longitude ? parseFloat(t.longitude) : -97.1384,
            transportType: (t.transportType ?? "car") as any,
            skills: Array.isArray(t.skills) ? t.skills : [],
            photoUrl: t.photoUrl ?? undefined,
            activeTaskId: t.activeTaskId ?? undefined,
            activeTaskAddress: t.activeTaskAddress ?? undefined,
            todayJobs: t.todayJobs ?? 0,
            todayDistanceKm: t.todayDistanceKm ?? 0,
          };
        });
      }
      return [];
    })();
    // Apply real-time WebSocket position overrides on top of DB data
    return base.map((tech) => {
      const wsPos = wsPositions[tech.id];
      return wsPos ? { ...tech, latitude: wsPos.lat, longitude: wsPos.lng } : tech;
    });
  }, [techniciansQuery.data, wsPositions]);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardSection
            tasks={liveTasks}
            technicians={liveTechnicians}
            customers={liveCustomers}
            tenantId={tenantId}
            onSelectTech={setSelectedTechId}
            selectedTechId={selectedTechId}
            onAssignTask={(taskId, techId) => assignMutation.mutate({ taskId, technicianId: techId, tenantId: tenantId })}
          />
        );
      case "workorders":
        return <WorkOrdersSection tasks={liveTasks} />;
      case "technicians":
        return <TechniciansSection technicians={liveTechnicians} />;
      case "customers":
        return <CustomersSection />;
      case "calendar":
        return <CalendarSection />;
      case "map":
        return (
          <View style={{ flex: 1, padding: 24 }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Live Fleet Map</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>
                  {liveTechnicians.filter((t) => t.status !== "offline").length} active technicians · {liveTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length} open jobs
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", minHeight: 560, marginTop: 16 }}>
              {Platform.OS === "web" ? (
                <GoogleMapView
                  technicians={liveTechnicians.map((t) => ({ id: t.id, name: t.name, latitude: t.latitude, longitude: t.longitude, status: t.status, transportType: t.transportType }))}
                  tasks={liveTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").map((t) => ({ id: t.id, jobLatitude: t.jobLatitude, jobLongitude: t.jobLongitude, status: t.status, customerName: t.customerName, jobAddress: t.jobAddress }))}
                  selectedId={selectedTechId}
                  onSelectTech={setSelectedTechId}
                  height={560}
                />
              ) : (
                <FleetMapPanel technicians={liveTechnicians} selectedId={selectedTechId} onSelect={setSelectedTechId} />
              )}
            </View>
          </View>
        );
      case "reports":
        return (
          <View style={{ flex: 1, padding: 24 }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Reports</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }] as TextStyle[]}>Analytics and performance insights</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                onPress={() => router.push("/integrations" as any)}
              >
                <IconSymbol name="arrow.up.doc.fill" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Export Data</Text>
              </Pressable>
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Jobs This Month" value={liveTasks.length * 4} gradient={["#1E6FBF", "#3B8FDF"]} icon="paperplane.fill" sub="↑ 12% vs last month" />
              <StatCard label="Completion Rate" value="94%" gradient={["#16A34A", "#22C55E"]} icon="checkmark.circle.fill" sub="Target: 90%" />
              <StatCard label="Avg Response" value="14m" gradient={["#0891B2", "#06B6D4"]} icon="clock.fill" sub="Target: 20m" />
              <StatCard label="Revenue MTD" value="$42k" gradient={["#E85D04", "#F97316"]} icon="dollarsign.circle.fill" sub="↑ 8% vs last month" />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 20, padding: 32, alignItems: "center" }]}>
              <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
              <Text style={[{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginTop: 16 }] as TextStyle[]}>Detailed Reports Coming Soon</Text>
              <Text style={[{ color: colors.muted, fontSize: 14, marginTop: 8, textAlign: "center" }] as TextStyle[]}>
                Connect QuickBooks or Xero in Integrations to unlock financial reports.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_BLUE, marginTop: 20, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                onPress={() => router.push("/integrations" as any)}
              >
                <Text style={styles.primaryBtnText}>Go to Integrations</Text>
              </Pressable>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Sidebar active={activeSection} onSelect={setActiveSection} />

      <View style={styles.mainContent}>
        {/* Top bar */}
        <View style={[styles.topBar, {
          backgroundColor: colors.surface,
          shadowColor: "#1E3A5F",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }]}>
          <View>
            <Text style={[styles.topBarTitle, { color: colors.foreground }] as TextStyle[]}>
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? "Dashboard"}
            </Text>
            <Text style={[styles.topBarSub, { color: colors.muted }] as TextStyle[]}>
              {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              style={({ pressed }) => [styles.topBarBtn, {
                backgroundColor: showNotifPanel ? NVC_BLUE + "18" : colors.background,
                opacity: pressed ? 0.7 : 1,
              }] as ViewStyle[]}
              onPress={() => setShowNotifPanel((v) => !v)}
            >
              <IconSymbol name="bell.fill" size={18} color={showNotifPanel ? NVC_BLUE : colors.muted} />
              {unreadNotifCount > 0 && (
                <View style={{
                  position: "absolute", top: 4, right: 4,
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: NVC_ORANGE, alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
              onPress={() => router.push("/create-task" as any)}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>New Order</Text>
            </Pressable>
          </View>
        </View>

        {renderContent()}
      </View>

      {/* ── Notification History Slide-Over Panel ── */}
      {showNotifPanel && Platform.OS === "web" && (
        <View style={{
          position: "absolute", top: 0, right: 0, bottom: 0,
          width: 360, backgroundColor: colors.surface,
          borderLeftWidth: 1, borderLeftColor: colors.border,
          zIndex: 300, shadowColor: "#000", shadowOpacity: 0.18,
          shadowRadius: 24, shadowOffset: { width: -4, height: 0 },
        } as any}>
          {/* Panel header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <IconSymbol name="bell.fill" size={18} color={NVC_BLUE} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground } as TextStyle}>
                Dispatch Notifications
              </Text>
              {unreadNotifCount > 0 && (
                <View style={{
                  paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
                  backgroundColor: NVC_ORANGE,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" } as TextStyle}>
                    {unreadNotifCount} new
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {unreadNotifCount > 0 && (
                <Pressable
                  style={({ pressed }) => [{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    backgroundColor: NVC_BLUE + (pressed ? "cc" : "18"),
                    borderWidth: 1, borderColor: NVC_BLUE + "44",
                  }] as ViewStyle[]}
                  onPress={markAllRead}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: NVC_BLUE } as TextStyle}>
                    Mark all read
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [{ padding: 6, borderRadius: 8, opacity: pressed ? 0.6 : 1, backgroundColor: colors.background }] as ViewStyle[]}
                onPress={() => setShowNotifPanel(false)}
              >
                <Text style={{ fontSize: 16, color: colors.muted, fontWeight: "600" } as TextStyle}>×</Text>
              </Pressable>
            </View>
          </View>

          {/* Filter chips */}
          <View style={{
            flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: "wrap",
          }}>
            {(["all", "assigned", "unassigned", "failed"] as const).map((f) => (
              <Pressable
                key={f}
                style={({ pressed }) => ([{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: notifFilter === f ? NVC_BLUE : colors.background,
                  borderWidth: 1, borderColor: notifFilter === f ? NVC_BLUE : colors.border,
                  opacity: pressed ? 0.75 : 1,
                }] as ViewStyle[])}
                onPress={() => setNotifFilter(f)}
              >
                <Text style={{
                  fontSize: 11, fontWeight: "600", textTransform: "capitalize",
                  color: notifFilter === f ? "#fff" : colors.muted,
                } as TextStyle}>
                  {f === "all" ? `All (${notifHistory.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notification list */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {filteredNotifHistory.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <IconSymbol name="bell.fill" size={32} color={colors.border} />
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 12, textAlign: "center" } as TextStyle}>
                  {notifHistory.length === 0
                    ? `No dispatch notifications yet.\nThey will appear here after you assign jobs.`
                    : `No notifications match the "${notifFilter}" filter.`}
                </Text>
              </View>
            ) : (
              filteredNotifHistory.map((notif) => {
                const isRead = readNotifIds.has(notif.id) || !!(notif as any).readAt;
                const ts = notif.createdAt ? new Date(notif.createdAt) : null;
                const timeStr = ts ? ts.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }) : "";
                const dateStr = ts ? ts.toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "";
                const statusColor = notif.pushStatus === "sent" ? "#22C55E" : notif.pushStatus === "failed" ? "#EF4444" : "#9CA3AF";
                return (
                  <Pressable
                    key={notif.id}
                    style={({ pressed }) => ([{
                      backgroundColor: pressed ? NVC_BLUE + "10" : isRead ? colors.background : NVC_BLUE + "08",
                      borderRadius: 12, padding: 14, marginBottom: 8,
                      borderWidth: 1, borderColor: isRead ? colors.border : NVC_BLUE + "30",
                      flexDirection: "row", gap: 12, alignItems: "flex-start",
                    }] as ViewStyle[])}
                    onPress={() => {
                      setReadNotifIds((prev) => new Set([...prev, notif.id]));
                      if (notif.entityId) router.push(`/task/${notif.entityId}` as any);
                    }}
                  >
                    {/* Unread dot */}
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: isRead ? colors.border : NVC_BLUE,
                      marginTop: 5, flexShrink: 0,
                    }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: isRead ? "500" : "700", color: colors.foreground } as TextStyle}>
                        {notif.title}
                      </Text>
                      {notif.body ? (
                        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 } as TextStyle}>
                          {notif.body}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.muted } as TextStyle}>
                          {dateStr} · {timeStr}
                        </Text>
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                          backgroundColor: statusColor + "20",
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "600", color: statusColor } as TextStyle}>
                            {notif.pushStatus === "sent" ? "Delivered" : notif.pushStatus === "failed" ? "Failed" : "No token"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={12} color={colors.muted} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Footer: mark all read + refresh */}
          {notifHistory.length > 0 && (
            <View style={{
              paddingHorizontal: 16, paddingVertical: 12,
              borderTopWidth: 1, borderTopColor: colors.border,
              flexDirection: "row", gap: 8,
            }}>
              <Pressable
                style={({ pressed }) => ([{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                  backgroundColor: pressed ? NVC_BLUE + "18" : NVC_BLUE + "10",
                  borderWidth: 1, borderColor: NVC_BLUE + "40",
                }] as ViewStyle[])}
                onPress={markAllRead}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: NVC_BLUE } as TextStyle}>
                  ✓ Mark all read
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ([{
                  paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: "center",
                  backgroundColor: pressed ? colors.border : colors.background,
                  borderWidth: 1, borderColor: colors.border,
                }] as ViewStyle[])}
                onPress={() => notifHistoryQuery.refetch()}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted } as TextStyle}>↻</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" } as ViewStyle,

  // Sidebar
  sidebar: {
    width: 224,
    flexDirection: "column",
    backgroundColor: NVC_BLUE_DARK,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  } as ViewStyle,
  sidebarLogo: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
  } as ViewStyle,
  sidebarLogoImg: { width: 32, height: 32 } as ViewStyle,
  sidebarBrand: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: 0.3 } as TextStyle,
  sidebarBrandSub: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "500", letterSpacing: 0.5 } as TextStyle,
  sidebarNav: { paddingTop: 8, paddingHorizontal: 8 } as ViewStyle,
  sidebarItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 2,
  } as ViewStyle,
  sidebarItemActive: { backgroundColor: "rgba(255,255,255,0.15)" } as ViewStyle,
  sidebarItemLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "500", flex: 1 } as TextStyle,
  sidebarBadge: {
    backgroundColor: NVC_ORANGE, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  } as ViewStyle,
  sidebarBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" } as TextStyle,
  sidebarDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 16, marginVertical: 8 } as ViewStyle,
  sidebarBottomNav: { paddingHorizontal: 8 } as ViewStyle,
  sidebarFooter: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 16, marginTop: "auto",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
  } as ViewStyle,
  sidebarAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: NVC_ORANGE, alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  sidebarAvatarText: { fontSize: 13, fontWeight: "700", color: "#fff" } as TextStyle,
  sidebarUserName: { fontSize: 12, fontWeight: "700", color: "#fff" } as TextStyle,
  sidebarUserRole: { fontSize: 10, color: "rgba(255,255,255,0.5)" } as TextStyle,

  // Main content
  mainContent: { flex: 1, flexDirection: "column" } as ViewStyle,
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 14, zIndex: 10,
  } as ViewStyle,
  topBarTitle: { fontSize: 18, fontWeight: "800" } as TextStyle,
  topBarSub: { fontSize: 12, marginTop: 1 } as TextStyle,
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 10 } as ViewStyle,
  topBarBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,

  // Stat cards
  statsRow: { flexDirection: "row", gap: 12 } as ViewStyle,
  statCard: {
    flex: 1, borderRadius: 16, padding: 20, minWidth: 120,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 6,
  } as ViewStyle,
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  } as ViewStyle,
  statValue: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 } as TextStyle,
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginTop: 2 } as TextStyle,
  statSub: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 4 } as TextStyle,

  // Two-column layout
  twoCol: { flexDirection: "row", gap: 16 } as ViewStyle,
  leftCol: { flex: 2, gap: 16 } as ViewStyle,
  rightCol: { flex: 1, gap: 16 } as ViewStyle,

  // Cards
  card: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  } as ViewStyle,
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
  } as ViewStyle,
  cardTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.1 } as TextStyle,
  cardSubtitle: { fontSize: 12 } as TextStyle,
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 } as ViewStyle,
  liveDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  liveBadgeText: { fontSize: 10, fontWeight: "700" } as TextStyle,

  // 3-Panel Map Layout
  mapPanelCollapsed: {
    width: 32,
    flexDirection: "column",
    overflow: "hidden",
  } as ViewStyle,
  mapPanelLeft: {
    width: 240,
    flexDirection: "column",
    borderRightWidth: 1,
  } as ViewStyle,
  mapPanelRight: {
    width: 220,
    flexDirection: "column",
    borderLeftWidth: 1,
  } as ViewStyle,
  mapPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  mapPanelSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    flexShrink: 0,
  } as ViewStyle,

  // Map
  mapPanel: {
    height: 220, backgroundColor: "#0d1b2a", position: "relative", overflow: "hidden",
  } as ViewStyle,
  mapGridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.05)" } as ViewStyle,
  mapGridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.05)" } as ViewStyle,
  mapRoad: { position: "absolute", left: 0, right: 0, backgroundColor: "rgba(255,255,255,0.12)" } as ViewStyle,
  mapRoadV: { position: "absolute", top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.12)" } as ViewStyle,
  mapCityLabel: { position: "absolute", top: 10, left: 12, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 } as ViewStyle,
  mapCityText: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600" } as TextStyle,
  techPin: {
    position: "absolute", width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    marginLeft: -17, marginTop: -17,
  } as ViewStyle,
  techPinDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" } as ViewStyle,
  techPinInitials: { fontSize: 9, fontWeight: "800", color: "#fff" } as TextStyle,
  techPinLabel: {
    position: "absolute", top: 36, left: "50%", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, zIndex: 20,
  } as ViewStyle,
  techPinLabelText: { fontSize: 9, color: "#fff", fontWeight: "700" } as TextStyle,
  mapAttr: { position: "absolute", bottom: 6, right: 8 } as ViewStyle,
  mapAttrText: { fontSize: 9, color: "rgba(255,255,255,0.4)" } as TextStyle,

  // Work order rows
  woRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 1, minHeight: 68 } as ViewStyle,
  woStatusBar: { width: 4 } as ViewStyle,
  woMain: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 } as ViewStyle,
  woTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 } as ViewStyle,
  woOrderRef: { fontSize: 10, fontWeight: "600" } as TextStyle,
  woPriorityBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 } as ViewStyle,
  woPriorityText: { fontSize: 9, fontWeight: "700" } as TextStyle,
  woStatusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 } as ViewStyle,
  woStatusText: { fontSize: 9, fontWeight: "600" } as TextStyle,
  woCustomer: { fontSize: 14, fontWeight: "700" } as TextStyle,
  woAddress: { fontSize: 12, marginTop: 2 } as TextStyle,
  woTech: { fontSize: 11, marginTop: 2 } as TextStyle,
  woTime: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, gap: 4 } as ViewStyle,
  woTimeText: { fontSize: 11 } as TextStyle,

  // Quick actions
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
  quickActionBtn: {
    flex: 1, minWidth: 80, alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, gap: 8,
  } as ViewStyle,
  quickActionLabel: { fontSize: 12, fontWeight: "700" } as TextStyle,

  // Tech rows (dashboard)
  techRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderLeftWidth: 3,
  } as ViewStyle,
  techAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" } as ViewStyle,
  techAvatarText: { fontSize: 12, fontWeight: "700" } as TextStyle,
  techStatusDot: { position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: "#fff" } as ViewStyle,
  techName: { fontSize: 14, fontWeight: "700" } as TextStyle,
  techDetail: { fontSize: 12, marginTop: 2 } as TextStyle,
  techStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 } as ViewStyle,
  techStatusPillText: { fontSize: 10, fontWeight: "600" } as TextStyle,

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } as ViewStyle,
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 } as TextStyle,
  sectionSubtitle: { fontSize: 14, marginTop: 3 } as TextStyle,

  // KPI row
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 16 } as ViewStyle,
  kpiCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 16,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  } as ViewStyle,
  kpiValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 } as TextStyle,
  kpiLabel: { fontSize: 12, fontWeight: "600", marginTop: 3 } as TextStyle,

  // Search
  searchRow: { marginBottom: 8 } as ViewStyle,
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    minHeight: 40,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14, outlineStyle: "none" } as any,
  filterScroll: { marginBottom: 8 } as ViewStyle,
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    borderWidth: 1.5, marginRight: 6, minHeight: 26,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 4,
  } as ViewStyle,
  filterChipText: { fontSize: 11, fontWeight: "700" } as TextStyle,

  // Table
  tableCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: "hidden" } as ViewStyle,
  tableHeader: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 } as ViewStyle,
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 } as TextStyle,
  tableRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, alignItems: "center", minHeight: 56 } as ViewStyle,
  tableCell: { flex: 1, fontSize: 14 } as any,
  tableCellRef: { fontWeight: "700" } as TextStyle,
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" } as ViewStyle,
  statusPillText: { fontSize: 12, fontWeight: "700" } as TextStyle,
  emptyState: { alignItems: "center", justifyContent: "center", padding: 48 } as ViewStyle,
  emptyText: { fontSize: 14, marginTop: 12 } as TextStyle,

  // Customer table extras
  customerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" } as ViewStyle,
  customerAvatarText: { fontSize: 12, fontWeight: "700" } as TextStyle,

  // Tech table extras
  techTableAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" } as ViewStyle,
  techTableAvatarText: { fontSize: 11, fontWeight: "700" } as TextStyle,

  // Action icon button
  actionIconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" } as ViewStyle,

  // Buttons — Apple HIG 44pt minimum touch target
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10,
    minHeight: 44,
  } as ViewStyle,
  primaryBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.1 } as TextStyle,
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, minHeight: 44 } as ViewStyle,
  cancelBtnText: { fontSize: 14, fontWeight: "600", letterSpacing: 0.1 } as TextStyle,
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44 } as ViewStyle,
  dangerBtnText: { fontSize: 14, fontWeight: "600", color: "#DC2626" } as TextStyle,

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  modalContainer: {
    width: "90%", maxWidth: 700, maxHeight: "90%",
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.28, shadowRadius: 48, elevation: 24,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 20,
  } as ViewStyle,
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.2 } as TextStyle,
  modalSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 } as TextStyle,
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" } as ViewStyle,
  modalTabs: { flexDirection: "row", borderBottomWidth: 1 } as ViewStyle,
  modalTab: { flex: 1, alignItems: "center", paddingVertical: 14 } as ViewStyle,
  modalTabText: { fontSize: 13, fontWeight: "500" } as TextStyle,
  modalBody: { flex: 1, maxHeight: 460 } as ViewStyle,
  modalSection: { padding: 24, gap: 0 } as ViewStyle,
  modalSectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 12, marginTop: 8, letterSpacing: 0.1 } as TextStyle,
  modalSectionDivider: { height: 1, marginVertical: 16 } as ViewStyle,
  modalRow2: { flexDirection: "row", gap: 16 } as ViewStyle,
  modalRow3: { flexDirection: "row", gap: 8 } as ViewStyle,
  modalField: { flex: 1, marginBottom: 16 } as ViewStyle,
  modalFieldLabel: { fontSize: 11, fontWeight: "700", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 } as TextStyle,
  modalFieldInput: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, outlineStyle: "none", minHeight: 44,
  } as any,
  modalSwitchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 14,
    minHeight: 52,
  } as ViewStyle,
  modalFooter: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 24, paddingVertical: 18, borderTopWidth: 1,
  } as ViewStyle,

  // Chip buttons
  chipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 } as ViewStyle,
  chipBtnText: { fontSize: 13, fontWeight: "600" } as TextStyle,

  // ─── Mission Control additions ────────────────────────────────────────────
  commandStrip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 0 } as ViewStyle,
  commandStripItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 4 } as ViewStyle,
  commandStripValue: { fontSize: 15, fontWeight: "800" } as TextStyle,
  commandStripLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: "500" } as TextStyle,
  commandStripDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 4 } as ViewStyle,

  sparklineRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 22, marginTop: 6 } as ViewStyle,
  sparklineBar: { width: 4, borderRadius: 2 } as ViewStyle,

  statTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } as ViewStyle,
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 } as ViewStyle,
  trendText: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.9)" } as TextStyle,

  heatZone: { position: "absolute", borderRadius: 999, borderWidth: 1 } as ViewStyle,
  routePreview: { position: "absolute", height: 2, backgroundColor: "rgba(59,143,223,0.5)", borderRadius: 1 } as ViewStyle,
  techHalo: { position: "absolute", borderWidth: 2, borderStyle: "dashed" } as ViewStyle,
  techPulse: { position: "absolute" } as ViewStyle,
  techHoverCard: { position: "absolute", top: 34, left: -60, width: 140, borderRadius: 8, borderWidth: 1, padding: 8, zIndex: 30 } as ViewStyle,
  techHoverName: { fontSize: 11, fontWeight: "700", color: "#fff", marginBottom: 2 } as TextStyle,
  techHoverDetail: { fontSize: 10, color: "rgba(255,255,255,0.65)" } as TextStyle,
  techHoverAddr: { fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 } as TextStyle,
  mapLegend: { position: "absolute", bottom: 32, right: 10, flexDirection: "row", gap: 10, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 } as ViewStyle,
  mapLegendItem: { flexDirection: "row", alignItems: "center", gap: 4 } as ViewStyle,
  mapLegendDot: { width: 7, height: 7, borderRadius: 4 } as ViewStyle,
  mapLegendText: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500" } as TextStyle,
  mapControlBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 } as ViewStyle,
  mapControlText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "600" } as TextStyle,

  aiPanel: { borderRadius: 12, borderWidth: 1, overflow: "hidden" } as ViewStyle,
  aiPanelHeader: { paddingHorizontal: 16, paddingVertical: 10 } as ViewStyle,
  aiPanelTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 } as ViewStyle,
  aiPanelDot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
  aiPanelTitle: { fontSize: 13, fontWeight: "700", flex: 1 } as TextStyle,
  aiBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 } as ViewStyle,
  aiBadgeText: { fontSize: 10, fontWeight: "700" } as TextStyle,
  aiInsightsList: { paddingHorizontal: 12, paddingBottom: 10, gap: 6 } as ViewStyle,
  aiInsightRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderLeftWidth: 3 } as ViewStyle,
  aiInsightText: { fontSize: 12, flex: 1, fontWeight: "500" } as TextStyle,
  aiActionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 } as ViewStyle,
  aiActionText: { fontSize: 11, fontWeight: "700" } as TextStyle,
  aiDismissBtn: { padding: 4 } as ViewStyle,

  slaBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 } as ViewStyle,
  slaText: { fontSize: 10, fontWeight: "700" } as TextStyle,
  woBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 } as ViewStyle,
  woActions: { alignItems: "flex-end", gap: 4, paddingLeft: 8 } as ViewStyle,
  woInlineActions: { flexDirection: "row", gap: 4 } as ViewStyle,
  woActionBtn: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" } as ViewStyle,
  woTechChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "rgba(30,111,191,0.1)", borderRadius: 10 } as ViewStyle,

  seeAllBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 } as ViewStyle,
  techAvatarPulse: { position: "absolute" } as ViewStyle,
  utilRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 } as ViewStyle,
  utilBar: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" } as ViewStyle,
  utilFill: { height: 3, borderRadius: 2 } as ViewStyle,
  utilText: { fontSize: 9, fontWeight: "600", width: 24 } as TextStyle,
  distText: { fontSize: 9, color: "#9BA1A6" } as TextStyle,
  techQuickBtn: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" } as ViewStyle,
});
