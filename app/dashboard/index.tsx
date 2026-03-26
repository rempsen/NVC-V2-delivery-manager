/**
 * NVC360 Desktop Dispatcher Dashboard — v4
 * Full-width web-optimized layout: sidebar + 6 sections
 * Sections: Dashboard, Work Orders, Technicians (full CRUD), Customers (full CRM), Map, Reports
 * Route: /dashboard
 */
import React, { useState, useMemo, useCallback } from "react";
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
import { MOCK_CUSTOMERS, type Customer } from "@/app/(tabs)/customers";

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

type SidebarSection = "dashboard" | "workorders" | "technicians" | "customers" | "map" | "reports";

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
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);
  const positions: Record<number, { x: number; y: number }> = {
    1: { x: 48, y: 42 }, 2: { x: 36, y: 58 }, 3: { x: 62, y: 30 },
    4: { x: 28, y: 70 }, 5: { x: 55, y: 68 }, 6: { x: 44, y: 52 },
    7: { x: 70, y: 45 }, 8: { x: 32, y: 38 }, 9: { x: 22, y: 55 }, 10: { x: 58, y: 55 },
  };
  const statusColor: Record<string, string> = {
    online: "#22C55E", busy: "#F59E0B", offline: "#6B7280", on_break: "#3B82F6", en_route: "#8B5CF6",
  };
  const activeId = hoveredId ?? selectedId;
  const activeTech = activeId ? technicians.find((t) => t.id === activeId) : null;

  return (
    <View style={styles.mapPanel}>
      {/* Dark map base */}
      <View style={StyleSheet.absoluteFillObject as any}>
        {/* Grid lines */}
        {[15, 30, 45, 60, 75, 90].map((pct) => (
          <View key={`h${pct}`} style={[styles.mapGridH, { top: `${pct}%` as any }]} />
        ))}
        {[15, 30, 45, 60, 75, 90].map((pct) => (
          <View key={`v${pct}`} style={[styles.mapGridV, { left: `${pct}%` as any }]} />
        ))}
        {/* Heat zones */}
        {HEAT_ZONES.map((hz, i) => (
          <View
            key={i}
            style={[styles.heatZone, {
              left: `${hz.x}%` as any,
              top: `${hz.y}%` as any,
              width: hz.r,
              height: hz.r,
              marginLeft: -hz.r / 2,
              marginTop: -hz.r / 2,
              backgroundColor: hz.color + "18",
              borderColor: hz.color + "35",
            }]}
          />
        ))}
        {/* Roads */}
        <View style={[styles.mapRoad, { top: "33%", height: 6 }]} />
        <View style={[styles.mapRoad, { top: "58%", height: 4 }]} />
        <View style={[styles.mapRoad, { top: "72%", height: 3 }]} />
        <View style={[styles.mapRoadV, { left: "38%", width: 6 }]} />
        <View style={[styles.mapRoadV, { left: "63%", width: 4 }]} />
        {/* Route preview line */}
        <View style={[styles.routePreview, { top: "33%", left: "38%", width: 120, transform: [{ rotate: "22deg" }] }]} />
      </View>

      {/* City label */}
      <View style={styles.mapCityLabel}>
        <View style={[styles.liveDot, { backgroundColor: "#22C55E", marginRight: 4 }]} />
        <Text style={styles.mapCityText}>Winnipeg, MB · LIVE</Text>
      </View>

      {/* Technician pins */}
      {technicians.map((tech) => {
        const pos = positions[tech.id] ?? { x: 50, y: 50 };
        const color = statusColor[tech.status] ?? "#6B7280";
        const isSelected = selectedId === tech.id;
        const isHovered = hoveredId === tech.id;
        const isActive = isSelected || isHovered;
        const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
        return (
          <Pressable
            key={tech.id}
            // @ts-ignore
            onHoverIn={() => setHoveredId(tech.id)}
            onHoverOut={() => setHoveredId(null)}
            style={[{
              position: "absolute",
              left: `${pos.x}%` as any,
              top: `${pos.y}%` as any,
              zIndex: isActive ? 20 : 1,
              alignItems: "center",
            }] as ViewStyle[]}
            onPress={() => onSelect(tech.id)}
          >
            {/* Halo ring */}
            {isActive && (
              <View style={[styles.techHalo, { borderColor: color, width: 46, height: 46, borderRadius: 23, marginLeft: -23, marginTop: -23 }]} />
            )}
            {/* Status pulse ring */}
            {tech.status !== "offline" && (
              <View style={[styles.techPulse, { backgroundColor: color + "30", width: 38, height: 38, borderRadius: 19, marginLeft: -19, marginTop: -19 }]} />
            )}
            {/* Pin */}
            <View style={[styles.techPin, {
              borderColor: isActive ? "#fff" : color,
              backgroundColor: color,
              width: 30, height: 30, borderRadius: 15,
              marginLeft: -15, marginTop: -15,
              borderWidth: isActive ? 2.5 : 1.5,
              shadowColor: color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.7 : 0.4,
              shadowRadius: isActive ? 8 : 4,
              elevation: isActive ? 8 : 3,
            }]}>
              <Text style={[styles.techPinInitials, { fontSize: 9, fontWeight: "800" }]}>{initials}</Text>
            </View>
            {/* Hover/selected card */}
            {isActive && activeTech && (
              <View style={[styles.techHoverCard, { backgroundColor: "rgba(10,20,40,0.92)", borderColor: color + "60" }]}>
                <Text style={[styles.techHoverName]}>{activeTech.name}</Text>
                <Text style={[styles.techHoverDetail]}>{TECH_STATUS_LABELS[activeTech.status] ?? activeTech.status} · {activeTech.todayJobs} jobs</Text>
                {activeTech.activeTaskAddress && (
                  <Text style={[styles.techHoverAddr]} numberOfLines={1}>{activeTech.activeTaskAddress}</Text>
                )}
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Legend */}
      <View style={styles.mapLegend}>
        {[{ label: "On Job", color: "#F59E0B" }, { label: "En Route", color: "#8B5CF6" }, { label: "Available", color: "#22C55E" }].map((l) => (
          <View key={l.label} style={styles.mapLegendItem}>
            <View style={[styles.mapLegendDot, { backgroundColor: l.color }]} />
            <Text style={styles.mapLegendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Attribution */}
      <View style={styles.mapAttr}>
        <Text style={styles.mapAttrText}>Simulated · Mapbox integration pending</Text>
      </View>
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

const AI_INSIGHTS = [
  { id: 1, type: "risk" as const, icon: "exclamationmark.triangle.fill", color: "#DC2626", text: "1 job at risk of SLA breach (traffic impact on Route 90)", action: "View Job" },
  { id: 2, type: "warn" as const, icon: "person.2.fill", color: "#F59E0B", text: "2 technicians underutilized — available for reassignment", action: "Assign" },
  { id: 3, type: "info" as const, icon: "map.fill", color: "#3B8FDF", text: "Route optimization could save ~18 min across 3 active jobs", action: "Optimize" },
  { id: 4, type: "success" as const, icon: "checkmark.circle.fill", color: "#22C55E", text: "Completion rate 94% today — above 90% target", action: null },
];

function AIInsightsPanel() {
  const colors = useColors();
  const [dismissed, setDismissed] = React.useState<number[]>([]);
  const visible = AI_INSIGHTS.filter((i) => !dismissed.includes(i.id));

  if (visible.length === 0) return null;

  return (
    <View style={[styles.aiPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.aiPanelHeader}>
        <View style={styles.aiPanelTitleRow}>
          <View style={[styles.aiPanelDot, { backgroundColor: "#3B8FDF" }]} />
          <Text style={[styles.aiPanelTitle, { color: colors.foreground }] as TextStyle[]}>AI Operational Insights</Text>
          <View style={[styles.aiBadge, { backgroundColor: NVC_BLUE + "15" }]}>
            <Text style={[styles.aiBadgeText, { color: NVC_BLUE }] as TextStyle[]}>{visible.length} active</Text>
          </View>
        </View>
      </View>
      <View style={styles.aiInsightsList}>
        {visible.map((insight) => (
          <View key={insight.id} style={[styles.aiInsightRow, { borderLeftColor: insight.color, backgroundColor: insight.color + "06" }]}>
            <IconSymbol name={insight.icon as any} size={14} color={insight.color} />
            <Text style={[styles.aiInsightText, { color: colors.foreground }] as TextStyle[]} numberOfLines={1}>{insight.text}</Text>
            <View style={{ flex: 1 }} />
            {insight.action && (
              <Pressable style={[styles.aiActionBtn, { backgroundColor: insight.color + "18", borderColor: insight.color + "40" }] as ViewStyle[]}>
                <Text style={[styles.aiActionText, { color: insight.color }] as TextStyle[]}>{insight.action}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.aiDismissBtn, { opacity: pressed ? 0.5 : 0.7 }] as ViewStyle[]}
              onPress={() => setDismissed((d) => [...d, insight.id])}
            >
              <IconSymbol name="xmark" size={10} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Dashboard Section (Mission Control) ─────────────────────────────────────

function DashboardSection({ tasks, technicians, customers, onSelectTech, selectedTechId }: {
  tasks: Task[];
  technicians: Technician[];
  customers: Customer[];
  onSelectTech: (id: number) => void;
  selectedTechId: number | null;
}) {
  const colors = useColors();
  const router = useRouter();

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
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Spark data (simulated 7-day trend)
  const sparkActive = [2, 4, 3, 5, 3, 4, active];
  const sparkCompleted = [8, 11, 9, 13, 10, 12, completed];
  const sparkTechs = [6, 7, 8, 7, 9, 8, onlineCount];
  const sparkClients = [18, 19, 20, 21, 20, 22, activeCustomers];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>

      {/* ── Command Strip ── */}
      <View style={[styles.commandStrip, { backgroundColor: NVC_BLUE_DARK, borderColor: "rgba(255,255,255,0.1)" }]}>
        {[
          { label: "Jobs Today", value: tasks.length, icon: "paperplane.fill", color: "#60A5FA" },
          { label: "SLA Risk", value: slaAtRisk, icon: "exclamationmark.triangle.fill", color: slaAtRisk > 0 ? "#F87171" : "#4ADE80" },
          { label: "Revenue Today", value: "$4,280", icon: "dollarsign.circle.fill", color: "#34D399" },
          { label: "Active Techs", value: onlineCount, icon: "person.2.fill", color: "#A78BFA" },
          { label: "Alerts", value: AI_INSIGHTS.filter((i) => i.type === "risk" || i.type === "warn").length, icon: "bell.fill", color: "#FBBF24" },
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

      {/* ── Dense KPI Cards ── */}
      <View style={styles.statsRow}>
        <StatCard label="Active Jobs" value={active} gradient={["#C2410C", "#EA580C"]} icon="bolt.fill"
          trend={{ pct: "12%", up: true }} sparkData={sparkActive} sub="+2 vs yesterday" />
        <StatCard label="Completed" value={completed} gradient={["#15803D", "#16A34A"]} icon="checkmark.circle.fill"
          trend={{ pct: "8%", up: true }} sparkData={sparkCompleted} sub="94% rate · on track" />
        <StatCard label="Unassigned" value={unassigned} gradient={["#B91C1C", "#DC2626"]} icon="exclamationmark.triangle.fill"
          trend={{ pct: "1", up: false }} sub={unassigned > 0 ? "Needs attention" : "All assigned"} />
        <StatCard label="Online Techs" value={onlineCount} gradient={["#1D4ED8", "#2563EB"]} icon="person.2.fill"
          trend={{ pct: "5%", up: true }} sparkData={sparkTechs} sub={`${onJob} on job · ${enRoute} en route`} />
        <StatCard label="En Route" value={enRoute} gradient={["#6D28D9", "#7C3AED"]} icon="car.fill"
          sub="Active dispatches" />
        <StatCard label="Active Clients" value={activeCustomers} gradient={["#0E7490", "#0891B2"]} icon="building.2.fill"
          trend={{ pct: "3%", up: true }} sparkData={sparkClients} sub={`${customers.length} total`} />
      </View>

      {/* ── AI Insights ── */}
      <AIInsightsPanel />

      {/* ── Two-column layout ── */}
      <View style={styles.twoCol}>
        {/* Left: Map (larger) + Recent Work Orders */}
        <View style={styles.leftCol}>
          {/* Command Map */}
          <View style={[styles.card, { backgroundColor: "#0d1b2a", borderColor: "rgba(255,255,255,0.1)" }]}>
            <View style={[styles.cardHeader, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.cardTitle, { color: "#fff" }] as TextStyle[]}>Live Fleet Map</Text>
                <View style={[styles.liveBadge, { backgroundColor: "#22C55E25" }]}>
                  <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.liveBadgeText, { color: "#22C55E" }] as TextStyle[]}>LIVE</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <View style={[styles.mapControlBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={styles.mapControlText}>{technicians.filter((t) => t.status !== "offline").length} active</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.mapControlBtn, { backgroundColor: pressed ? NVC_BLUE : NVC_BLUE + "80" }] as ViewStyle[]}
                  onPress={() => router.push("/dashboard" as any)}
                >
                  <Text style={[styles.mapControlText, { color: "#fff" }]}>Full Map →</Text>
                </Pressable>
              </View>
            </View>
            <FleetMapPanel technicians={sortedTechs} selectedId={selectedTechId} onSelect={onSelectTech} />
          </View>

          {/* Recent Work Orders */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.foreground }] as TextStyle[]}>Recent Work Orders</Text>
                <Text style={[styles.cardSubtitle, { color: colors.muted }] as TextStyle[]}>Last 8 · sorted by time</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.seeAllBtn, { backgroundColor: NVC_BLUE + "12", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                onPress={() => {}}
              >
                <Text style={[{ color: NVC_BLUE, fontSize: 12, fontWeight: "700" }] as TextStyle[]}>See All</Text>
              </Pressable>
            </View>
            {recentTasks.map((task) => (
              <WorkOrderRow key={task.id} task={task} onPress={() => router.push(`/task/${task.id}` as any)} />
            ))}
          </View>
        </View>

        {/* Right: Quick Actions + Live Field Team Roster */}
        <View style={styles.rightCol}>
          {/* Quick Actions */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }] as TextStyle[]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {[
                { label: "New Order", icon: "plus.circle.fill", color: NVC_ORANGE, route: "/create-task" },
                { label: "Add Customer", icon: "person.badge.plus", color: NVC_BLUE, route: null },
                { label: "Send Alert", icon: "bell.fill", color: "#F59E0B", route: null },
                { label: "Export", icon: "arrow.up.doc.fill", color: "#22C55E", route: null },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  style={({ pressed }) => [
                    styles.quickActionBtn,
                    { backgroundColor: action.color + "12", borderColor: action.color + "35", opacity: pressed ? 0.7 : 1 },
                  ] as ViewStyle[]}
                  onPress={() => action.route && router.push(action.route as any)}
                >
                  <IconSymbol name={action.icon as any} size={18} color={action.color} />
                  <Text style={[styles.quickActionLabel, { color: action.color }] as TextStyle[]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Live Field Team Roster */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.foreground }] as TextStyle[]}>Field Team</Text>
                <Text style={[styles.cardSubtitle, { color: colors.muted }] as TextStyle[]}>
                  {onlineCount} active · {technicians.length} total
                </Text>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: "#22C55E15" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.liveBadgeText, { color: "#22C55E" }] as TextStyle[]}>LIVE</Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {sortedTechs.map((tech) => {
                const sc = TECH_STATUS_COLORS[tech.status] ?? "#6B7280";
                const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const utilPct = tech.status === "busy" ? 100 : (tech.status as string) === "en_route" ? 75 : tech.status === "online" ? 30 : 0;
                const distToNext = tech.todayDistanceKm > 0 ? `${(tech.todayDistanceKm * 0.3).toFixed(1)} km` : "—";
                return (
                  <Pressable
                    key={tech.id}
                    style={({ pressed }) => [
                      styles.techRow,
                      {
                        backgroundColor: selectedTechId === tech.id ? NVC_BLUE + "10" : pressed ? colors.background : "transparent",
                        borderLeftColor: selectedTechId === tech.id ? NVC_BLUE : sc,
                        borderBottomColor: colors.border,
                      },
                    ] as ViewStyle[]}
                    onPress={() => onSelectTech(tech.id)}
                  >
                    {/* Avatar with pulse */}
                    <View style={{ position: "relative" }}>
                      {tech.status !== "offline" && (
                        <View style={[styles.techAvatarPulse, { backgroundColor: sc + "30", width: 38, height: 38, borderRadius: 19 }]} />
                      )}
                      <View style={[styles.techAvatar, { backgroundColor: sc + "20", borderColor: sc + "50", borderWidth: 1.5 }]}>
                        <Text style={[styles.techAvatarText, { color: sc }] as TextStyle[]}>{initials}</Text>
                      </View>
                      <View style={[styles.techStatusDot, { backgroundColor: sc, borderColor: colors.surface }]} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.techName, { color: colors.foreground }] as TextStyle[]}>{tech.name}</Text>
                      <Text style={[styles.techDetail, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
                        {tech.activeTaskAddress ?? "No active job"}
                      </Text>
                      {/* Utilization bar */}
                      <View style={styles.utilRow}>
                        <View style={[styles.utilBar, { backgroundColor: colors.border }]}>
                          <View style={[styles.utilFill, { width: `${utilPct}%` as any, backgroundColor: sc }]} />
                        </View>
                        <Text style={[styles.utilText, { color: colors.muted }] as TextStyle[]}>{utilPct}%</Text>
                        <Text style={[styles.distText, { color: colors.muted }] as TextStyle[]}>· {distToNext}</Text>
                      </View>
                    </View>

                    {/* Status + quick actions */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[styles.techStatusPill, { backgroundColor: sc + "18", borderWidth: 1, borderColor: sc + "40" }]}>
                        <Text style={[styles.techStatusPillText, { color: sc }] as TextStyle[]}>
                          {TECH_STATUS_LABELS[tech.status] ?? tech.status}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable style={[styles.techQuickBtn, { backgroundColor: NVC_BLUE + "15" }] as ViewStyle[]}>
                          <IconSymbol name="paperplane.fill" size={10} color={NVC_BLUE} />
                        </Pressable>
                        <Pressable
                          style={[styles.techQuickBtn, { backgroundColor: "#22C55E15" }] as ViewStyle[]}
                          onPress={() => router.push(`/agent/${tech.id}` as any)}
                        >
                          <IconSymbol name="arrow.right" size={10} color="#22C55E" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
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
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Customer["status"] | "all">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => customers.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.company.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [customers, search, statusFilter]);

  const handleSave = useCallback((data: EditableCustomer) => {
    if (editingCustomer) {
      setCustomers((prev) => prev.map((c) => c.id === editingCustomer.id ? {
        ...c,
        company: data.company,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        status: data.status,
        mailingAddress: data.mailingAddress,
        city: data.mailingCity,
        province: data.mailingProvince,
        postalCode: data.mailingPostal,
        physicalAddress: data.sameAddress ? data.mailingAddress : data.physicalAddress,
        terms: data.terms,
        tags: data.tags,
        notes: data.notes,
      } : c));
    } else {
      const newCustomer: Customer = {
        id: Date.now(),
        company: data.company,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        status: data.status,
        mailingAddress: data.mailingAddress,
        city: data.mailingCity,
        province: data.mailingProvince,
        postalCode: data.mailingPostal,
        country: "Canada",
        physicalAddress: data.sameAddress ? data.mailingAddress : data.physicalAddress,
        terms: data.terms,
        tags: data.tags,
        notes: data.notes,
        totalJobs: 0,
        totalRevenue: 0,
        lastJobDate: "",
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCustomer, ...prev]);
    }
    setModalVisible(false);
    setEditingCustomer(null);
  }, [editingCustomer]);

  const handleDelete = useCallback(() => {
    if (!editingCustomer) return;
    Alert.alert("Delete Customer", `Remove ${editingCustomer.company}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          setCustomers((prev) => prev.filter((c) => c.id !== editingCustomer.id));
          setModalVisible(false);
          setEditingCustomer(null);
        },
      },
    ]);
  }, [editingCustomer]);

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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DesktopDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);

  const tasksQuery = trpc.tasks.list.useQuery(
    { tenantId: DEMO_TENANT_ID },
    { refetchInterval: 30_000, staleTime: 15_000 },
  );
  const techniciansQuery = trpc.technicians.list.useQuery(
    { tenantId: DEMO_TENANT_ID },
    { refetchInterval: 30_000, staleTime: 15_000 },
  );

  const liveTasks: Task[] = useMemo(() => {
    if (tasksQuery.data && tasksQuery.data.length > 0) {
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
    return MOCK_TASKS;
  }, [tasksQuery.data]);

  const liveTechnicians: Technician[] = useMemo(() => {
    if (techniciansQuery.data && techniciansQuery.data.length > 0) {
      return techniciansQuery.data.map((t: any) => ({
        id: t.id, name: t.name ?? "Technician", phone: t.phone ?? "", email: t.email ?? "",
        status: (t.status as any) ?? "offline", latitude: t.lat ?? 49.8951,
        longitude: t.lng ?? -97.1384, transportType: (t.transportType ?? "car") as any,
        skills: t.skills ?? [], photoUrl: t.photoUrl ?? undefined,
        activeTaskId: t.activeTaskId ?? undefined, activeTaskAddress: t.activeTaskAddress ?? undefined,
        todayJobs: t.todayJobs ?? 0, todayDistanceKm: t.todayDistanceKm ?? 0,
      }));
    }
    return MOCK_TECHNICIANS;
  }, [techniciansQuery.data]);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardSection
            tasks={liveTasks}
            technicians={liveTechnicians}
            customers={MOCK_CUSTOMERS}
            onSelectTech={setSelectedTechId}
            selectedTechId={selectedTechId}
          />
        );
      case "workorders":
        return <WorkOrdersSection tasks={liveTasks} />;
      case "technicians":
        return <TechniciansSection technicians={liveTechnicians} />;
      case "customers":
        return <CustomersSection />;
      case "map":
        return (
          <View style={{ flex: 1, padding: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 16 }] as TextStyle[]}>Live Fleet Map</Text>
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", minHeight: 500 }}>
              <FleetMapPanel technicians={liveTechnicians} selectedId={selectedTechId} onSelect={setSelectedTechId} />
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
            <Pressable style={({ pressed }) => [styles.topBarBtn, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}>
              <IconSymbol name="bell.fill" size={18} color={colors.muted} />
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
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,

  // Stat cards
  statsRow: { flexDirection: "row", gap: 12 } as ViewStyle,
  statCard: {
    flex: 1, borderRadius: 16, padding: 16, minWidth: 120,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 4,
  } as ViewStyle,
  statIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 10,
  } as ViewStyle,
  statValue: { fontSize: 26, fontWeight: "800", color: "#fff" } as TextStyle,
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
    paddingHorizontal: 16, paddingVertical: 14,
  } as ViewStyle,
  cardTitle: { fontSize: 14, fontWeight: "700" } as TextStyle,
  cardSubtitle: { fontSize: 12 } as TextStyle,
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 } as ViewStyle,
  liveDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  liveBadgeText: { fontSize: 10, fontWeight: "700" } as TextStyle,

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
  woRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 1, minHeight: 60 } as ViewStyle,
  woStatusBar: { width: 4 } as ViewStyle,
  woMain: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 } as ViewStyle,
  woTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 } as ViewStyle,
  woOrderRef: { fontSize: 10, fontWeight: "600" } as TextStyle,
  woPriorityBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 } as ViewStyle,
  woPriorityText: { fontSize: 9, fontWeight: "700" } as TextStyle,
  woStatusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 } as ViewStyle,
  woStatusText: { fontSize: 9, fontWeight: "600" } as TextStyle,
  woCustomer: { fontSize: 13, fontWeight: "600" } as TextStyle,
  woAddress: { fontSize: 11, marginTop: 1 } as TextStyle,
  woTech: { fontSize: 11, marginTop: 2 } as TextStyle,
  woTime: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, gap: 4 } as ViewStyle,
  woTimeText: { fontSize: 11 } as TextStyle,

  // Quick actions
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
  quickActionBtn: {
    flex: 1, minWidth: 80, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 6,
  } as ViewStyle,
  quickActionLabel: { fontSize: 11, fontWeight: "600" } as TextStyle,

  // Tech rows (dashboard)
  techRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderLeftWidth: 3,
  } as ViewStyle,
  techAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", position: "relative" } as ViewStyle,
  techAvatarText: { fontSize: 12, fontWeight: "700" } as TextStyle,
  techStatusDot: { position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: "#fff" } as ViewStyle,
  techName: { fontSize: 13, fontWeight: "600" } as TextStyle,
  techDetail: { fontSize: 11, marginTop: 1 } as TextStyle,
  techStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 } as ViewStyle,
  techStatusPillText: { fontSize: 10, fontWeight: "600" } as TextStyle,

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } as ViewStyle,
  sectionTitle: { fontSize: 20, fontWeight: "800" } as TextStyle,
  sectionSubtitle: { fontSize: 13, marginTop: 2 } as TextStyle,

  // KPI row
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 16 } as ViewStyle,
  kpiCard: {
    flex: 1, borderRadius: 12, borderWidth: 1, padding: 14,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  } as ViewStyle,
  kpiValue: { fontSize: 24, fontWeight: "800" } as TextStyle,
  kpiLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 } as TextStyle,

  // Search
  searchRow: { marginBottom: 10 } as ViewStyle,
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 13, outlineStyle: "none" } as any,
  filterScroll: { marginBottom: 12 } as ViewStyle,
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, marginRight: 6,
  } as ViewStyle,
  filterChipText: { fontSize: 12, fontWeight: "600" } as TextStyle,

  // Table
  tableCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: "hidden" } as ViewStyle,
  tableHeader: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 } as ViewStyle,
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 } as TextStyle,
  tableRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: "center" } as ViewStyle,
  tableCell: { flex: 1, fontSize: 13 } as any,
  tableCellRef: { fontWeight: "700" } as TextStyle,
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" } as ViewStyle,
  statusPillText: { fontSize: 11, fontWeight: "600" } as TextStyle,
  emptyState: { alignItems: "center", justifyContent: "center", padding: 48 } as ViewStyle,
  emptyText: { fontSize: 14, marginTop: 12 } as TextStyle,

  // Customer table extras
  customerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" } as ViewStyle,
  customerAvatarText: { fontSize: 12, fontWeight: "700" } as TextStyle,

  // Tech table extras
  techTableAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" } as ViewStyle,
  techTableAvatarText: { fontSize: 11, fontWeight: "700" } as TextStyle,

  // Action icon button
  actionIconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" } as ViewStyle,

  // Buttons
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  } as ViewStyle,
  primaryBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" } as TextStyle,
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  cancelBtnText: { fontSize: 13, fontWeight: "600" } as TextStyle,
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9 } as ViewStyle,
  dangerBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" } as TextStyle,

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  modalContainer: {
    width: "90%", maxWidth: 680, maxHeight: "88%",
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 20,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
  } as ViewStyle,
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#fff" } as TextStyle,
  modalSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 } as TextStyle,
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" } as ViewStyle,
  modalTabs: { flexDirection: "row", borderBottomWidth: 1 } as ViewStyle,
  modalTab: { flex: 1, alignItems: "center", paddingVertical: 12 } as ViewStyle,
  modalTabText: { fontSize: 12 } as TextStyle,
  modalBody: { flex: 1, maxHeight: 420 } as ViewStyle,
  modalSection: { padding: 20, gap: 0 } as ViewStyle,
  modalSectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10, marginTop: 4 } as TextStyle,
  modalSectionDivider: { height: 1, marginVertical: 16 } as ViewStyle,
  modalRow2: { flexDirection: "row", gap: 12 } as ViewStyle,
  modalRow3: { flexDirection: "row", gap: 8 } as ViewStyle,
  modalField: { flex: 1, marginBottom: 12 } as ViewStyle,
  modalFieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.3 } as TextStyle,
  modalFieldInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, outlineStyle: "none",
  } as any,
  modalSwitchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  } as ViewStyle,
  modalFooter: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1,
  } as ViewStyle,

  // Chip buttons
  chipBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 } as ViewStyle,
  chipBtnText: { fontSize: 12, fontWeight: "600" } as TextStyle,

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
