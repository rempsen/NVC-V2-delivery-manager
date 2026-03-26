import { useState, useCallback } from "react";
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
  Linking,
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
import { MOCK_CUSTOMERS } from "@/app/(tabs)/customers";

// ─── Contact Data ─────────────────────────────────────────────────────────────

const OFFICE_PHONE = "+12045550100";
const OFFICE_NAME = "NVC360 Dispatch Office";

const COLLEAGUE_CATEGORIES = [
  { id: "accounting", label: "Accounting", icon: "dollarsign.circle.fill", color: "#10B981" },
  { id: "dispatch", label: "Dispatch", icon: "map.fill", color: "#3B82F6" },
  { id: "management", label: "Management", icon: "person.badge.key.fill", color: "#8B5CF6" },
  { id: "field", label: "Field Team", icon: "wrench.and.screwdriver.fill", color: "#E85D04" },
  { id: "support", label: "Support", icon: "headphones", color: "#06B6D4" },
];

const COLLEAGUES_BY_CATEGORY: Record<string, { id: number; name: string; phone: string; role: string }[]> = {
  accounting: [
    { id: 1, name: "Sarah Mitchell", phone: "+12045550201", role: "Senior Accountant" },
    { id: 2, name: "James Kowalski", phone: "+12045550202", role: "Accounts Payable" },
    { id: 3, name: "Linda Park", phone: "+12045550203", role: "Payroll" },
  ],
  dispatch: [
    { id: 4, name: "Marcus Johnson", phone: "+12045550204", role: "Lead Dispatcher" },
    { id: 5, name: "Priya Sharma", phone: "+12045550205", role: "Dispatcher" },
    { id: 6, name: "Rachel Kim", phone: "+12045550206", role: "Dispatcher" },
  ],
  management: [
    { id: 7, name: "Dan Rosenblat", phone: "+12045550207", role: "CEO / Founder" },
    { id: 8, name: "Tom Nguyen", phone: "+12045550208", role: "Operations Manager" },
  ],
  field: [
    { id: 9, name: "David Okafor", phone: "+12045550209", role: "Senior Technician" },
    { id: 10, name: "Carlos Rivera", phone: "+12045550210", role: "Technician" },
    { id: 11, name: "Aisha Williams", phone: "+12045550211", role: "Technician" },
  ],
  support: [
    { id: 12, name: "Grace Martin", phone: "+12045550212", role: "Customer Support" },
    { id: 13, name: "Noah Chen", phone: "+12045550213", role: "Technical Support" },
  ],
};

const CLIENT_CATEGORIES = [
  { id: "construction", label: "Construction", icon: "building.2.fill", color: "#E85D04" },
  { id: "mechanical", label: "Mechanical", icon: "wrench.and.screwdriver.fill", color: "#3B82F6" },
  { id: "property", label: "Property", icon: "house.fill", color: "#22C55E" },
  { id: "logistics", label: "Logistics", icon: "shippingbox.fill", color: "#8B5CF6" },
  { id: "retail", label: "Retail", icon: "bag.fill", color: "#F59E0B" },
];

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

// ─── Contact Modal ────────────────────────────────────────────────────────────

type ContactStep = "root" | "colleague-category" | "colleague-person" | "client-category" | "client-person";

function ContactModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [step, setStep] = useState<ContactStep>("root");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const reset = () => { setStep("root"); setSelectedCategory(""); };
  const handleClose = () => { reset(); onClose(); };

  // Derive client list by category (map industry → category)
  const clientsByCategory = (catId: string) => {
    const industryMap: Record<string, string[]> = {
      construction: ["Construction", "Roofing", "Glazing"],
      mechanical: ["Mechanical", "HVAC", "Plumbing"],
      property: ["Property Management", "Real Estate"],
      logistics: ["Logistics", "Transportation"],
      retail: ["Retail", "Hospitality"],
    };
    const industries = industryMap[catId] ?? [];
    return MOCK_CUSTOMERS.filter((c) =>
      industries.some((ind) => c.industry.toLowerCase().includes(ind.toLowerCase()))
    ).slice(0, 8);
  };

  const colleagues = selectedCategory ? (COLLEAGUES_BY_CATEGORY[selectedCategory] ?? []) : [];
  const clients = selectedCategory ? clientsByCategory(selectedCategory) : [];

  const callNumber = (phone: string) => Linking.openURL(`tel:${phone}`);
  const smsNumber = (phone: string) => Linking.openURL(`sms:${phone}`);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.sheetOverlay} onPress={handleClose} />
      <View style={[styles.contactSheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.contactSheetHeader}>
          {step !== "root" && (
            <Pressable
              style={({ pressed }) => [styles.contactBackBtn, { opacity: pressed ? 0.6 : 1 }] as ViewStyle[]}
              onPress={() => {
                if (step === "colleague-person") setStep("colleague-category");
                else if (step === "client-person") setStep("client-category");
                else setStep("root");
              }}
            >
              <IconSymbol name="chevron.left" size={16} color={NVC_BLUE} />
              <Text style={[styles.contactBackText, { color: NVC_BLUE }]}>Back</Text>
            </Pressable>
          )}
          <Text style={[styles.sheetTitle, { color: colors.foreground, flex: 1, textAlign: step === "root" ? "center" : "left" }]}>
            {step === "root" ? "Contact" :
             step === "colleague-category" ? "Choose Department" :
             step === "colleague-person" ? COLLEAGUE_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? "Colleagues" :
             step === "client-category" ? "Choose Industry" :
             CLIENT_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? "Clients"}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.contactCloseBtn, { opacity: pressed ? 0.6 : 1 }] as ViewStyle[]}
            onPress={handleClose}
          >
            <IconSymbol name="xmark" size={14} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
          {/* ── Root: 3 contact types ── */}
          {step === "root" && (
            <View style={styles.contactRootGrid}>
              {/* Office */}
              <View style={[styles.contactCard, { borderColor: NVC_BLUE + "30", backgroundColor: NVC_BLUE + "08" }]}>
                <View style={[styles.contactCardIcon, { backgroundColor: NVC_BLUE + "20" }]}>
                  <IconSymbol name="building.2.fill" size={26} color={NVC_BLUE} />
                </View>
                <Text style={[styles.contactCardTitle, { color: colors.foreground }]}>Office</Text>
                <Text style={[styles.contactCardSub, { color: colors.muted }]}>{OFFICE_NAME}</Text>
                <View style={styles.contactCardActions}>
                  <Pressable
                    style={({ pressed }) => [styles.contactActionBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                    onPress={() => callNumber(OFFICE_PHONE)}
                  >
                    <IconSymbol name="phone.fill" size={14} color="#fff" />
                    <Text style={styles.contactActionText}>Call</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.contactActionBtn, { backgroundColor: "#22C55E", opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                    onPress={() => smsNumber(OFFICE_PHONE)}
                  >
                    <IconSymbol name="message.fill" size={14} color="#fff" />
                    <Text style={styles.contactActionText}>SMS</Text>
                  </Pressable>
                </View>
              </View>

              {/* Colleague */}
              <Pressable
                style={({ pressed }) => [
                  styles.contactCard,
                  { borderColor: "#8B5CF6" + "30", backgroundColor: "#8B5CF6" + "08",
                    opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ] as ViewStyle[]}
                onPress={() => setStep("colleague-category")}
              >
                <View style={[styles.contactCardIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
                  <IconSymbol name="person.2.fill" size={26} color="#8B5CF6" />
                </View>
                <Text style={[styles.contactCardTitle, { color: colors.foreground }]}>Colleague</Text>
                <Text style={[styles.contactCardSub, { color: colors.muted }]}>Reach your team</Text>
                <View style={[styles.contactChevronRow]}>
                  <Text style={[styles.contactCardSub, { color: "#8B5CF6", fontWeight: "600" }]}>Choose department →</Text>
                </View>
              </Pressable>

              {/* Client */}
              <Pressable
                style={({ pressed }) => [
                  styles.contactCard,
                  { borderColor: "#E85D04" + "30", backgroundColor: "#E85D04" + "08",
                    opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ] as ViewStyle[]}
                onPress={() => setStep("client-category")}
              >
                <View style={[styles.contactCardIcon, { backgroundColor: "#E85D04" + "20" }]}>
                  <IconSymbol name="person.text.rectangle.fill" size={26} color="#E85D04" />
                </View>
                <Text style={[styles.contactCardTitle, { color: colors.foreground }]}>Client</Text>
                <Text style={[styles.contactCardSub, { color: colors.muted }]}>Reach your clients</Text>
                <View style={[styles.contactChevronRow]}>
                  <Text style={[styles.contactCardSub, { color: "#E85D04", fontWeight: "600" }]}>Choose industry →</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Colleague: category list ── */}
          {step === "colleague-category" && (
            <View style={styles.contactList}>
              {COLLEAGUE_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.contactListRow,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.border : colors.surface },
                  ] as ViewStyle[]}
                  onPress={() => { setSelectedCategory(cat.id); setStep("colleague-person"); }}
                >
                  <View style={[styles.contactListIcon, { backgroundColor: cat.color + "20" }]}>
                    <IconSymbol name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactListName, { color: colors.foreground }]}>{cat.label}</Text>
                    <Text style={[styles.contactListSub, { color: colors.muted }]}>
                      {(COLLEAGUES_BY_CATEGORY[cat.id] ?? []).length} people
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Colleague: person list ── */}
          {step === "colleague-person" && (
            <View style={styles.contactList}>
              {colleagues.map((person) => (
                <View key={person.id} style={[styles.contactListRow, { borderColor: colors.border }]}>
                  <View style={[styles.contactListIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#8B5CF6" }}>
                      {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactListName, { color: colors.foreground }]}>{person.name}</Text>
                    <Text style={[styles.contactListSub, { color: colors.muted }]}>{person.role}</Text>
                  </View>
                  <View style={styles.contactRowActions}>
                    <Pressable
                      style={({ pressed }) => [styles.contactRowBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={() => callNumber(person.phone)}
                    >
                      <IconSymbol name="phone.fill" size={13} color={NVC_BLUE} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.contactRowBtn, { backgroundColor: "#22C55E" + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={() => smsNumber(person.phone)}
                    >
                      <IconSymbol name="message.fill" size={13} color="#22C55E" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Client: category list ── */}
          {step === "client-category" && (
            <View style={styles.contactList}>
              {CLIENT_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.contactListRow,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.border : colors.surface },
                  ] as ViewStyle[]}
                  onPress={() => { setSelectedCategory(cat.id); setStep("client-person"); }}
                >
                  <View style={[styles.contactListIcon, { backgroundColor: cat.color + "20" }]}>
                    <IconSymbol name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactListName, { color: colors.foreground }]}>{cat.label}</Text>
                    <Text style={[styles.contactListSub, { color: colors.muted }]}>
                      {clientsByCategory(cat.id).length} clients
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Client: person list ── */}
          {step === "client-person" && (
            <View style={styles.contactList}>
              {clients.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Text style={[styles.contactListSub, { color: colors.muted }]}>No clients in this category yet.</Text>
                </View>
              ) : clients.map((client) => (
                <View key={client.id} style={[styles.contactListRow, { borderColor: colors.border }]}>
                  <View style={[styles.contactListIcon, { backgroundColor: "#E85D04" + "20" }]}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#E85D04" }}>
                      {client.company.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactListName, { color: colors.foreground }]} numberOfLines={1}>{client.company}</Text>
                    <Text style={[styles.contactListSub, { color: colors.muted }]} numberOfLines={1}>{client.contactName}</Text>
                  </View>
                  <View style={styles.contactRowActions}>
                    <Pressable
                      style={({ pressed }) => [styles.contactRowBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={() => callNumber(client.phone)}
                    >
                      <IconSymbol name="phone.fill" size={13} color={NVC_BLUE} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.contactRowBtn, { backgroundColor: "#22C55E" + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                      onPress={() => smsNumber(client.phone)}
                    >
                      <IconSymbol name="message.fill" size={13} color="#22C55E" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.sheetCancel, { backgroundColor: colors.border, marginTop: 12 }]} onPress={handleClose}>
          <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Close</Text>
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
      <View style={[StyleSheet.absoluteFillObject, styles.metricHighlight]} />
      {/* Icon: 20% smaller than before (was 28×28, now 22×22 wrap, was 15 icon now 12) */}
      <View style={styles.metricIconWrap}>
        <IconSymbol name={icon} size={12} color="rgba(255,255,255,0.9)" />
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
      <View style={styles.mapBg}>
        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <View key={`h${v}`} style={[styles.mapGridH, { top: `${v * 100}%` as any }]} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((v) => (
          <View key={`v${v}`} style={[styles.mapGridV, { left: `${v * 100}%` as any }]} />
        ))}
        <View style={[styles.mapRoad, { top: "35%", width: "100%" }]} />
        <View style={[styles.mapRoad, { top: "65%", width: "70%", left: "15%" }]} />
        <View style={[styles.mapRoadV, { left: "30%", height: "100%" }]} />
        <View style={[styles.mapRoadV, { left: "65%", height: "80%", top: "10%" }]} />
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
  const [contactModalVisible, setContactModalVisible] = useState(false);

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

  // Contact section: 3 buttons only
  const CONTACT_ACTIONS = [
    { label: "Office", icon: "building.2.fill", color: NVC_BLUE, onPress: () => setContactModalVisible(true) },
    { label: "Colleague", icon: "person.2.fill", color: "#8B5CF6", onPress: () => setContactModalVisible(true) },
    { label: "Client", icon: "person.text.rectangle.fill", color: "#E85D04", onPress: () => setContactModalVisible(true) },
  ];

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header — NVC logo below Dynamic Island ── */}
        {/* paddingTop = insets.top (Dynamic Island clearance) + extra 12px breathing room */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }] as ViewStyle[]}>
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
              <IconSymbol name="bell.fill" size={17} color="#fff" />
              <View style={styles.notifBadge} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
              onPress={() => setCreateSheetVisible(true)}
            >
              <IconSymbol name="plus" size={12} color="#fff" />
              <Text style={styles.createBtnText}>New</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 6-up Metrics Grid — icons 20% smaller ── */}
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

        {/* ── Live Map Widget — taller now that Quick Actions is smaller ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Live Fleet Map</Text>
            <Pressable onPress={() => router.push("/dispatcher" as any)}>
              <Text style={styles.seeAll}>Full Map →</Text>
            </Pressable>
          </View>
          <MapWidget onPress={() => router.push("/dispatcher" as any)} />
        </View>

        {/* ── Contact — 3 buttons, replaces Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactGrid}>
            {CONTACT_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.contactActionCard,
                  { backgroundColor: action.color + "12", borderColor: action.color + "30",
                    opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ] as ViewStyle[]}
                onPress={action.onPress}
              >
                <View style={[styles.contactActionIconWrap, { backgroundColor: action.color + "20" }] as ViewStyle[]}>
                  <IconSymbol name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={[styles.contactActionLabel, { color: action.color }] as TextStyle[]}>{action.label}</Text>
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
      <ContactModal visible={contactModalVisible} onClose={() => setContactModalVisible(false)} />
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
  contactGrid: ViewStyle; contactActionCard: ViewStyle; contactActionIconWrap: ViewStyle;
  contactActionLabel: TextStyle;
  contactSheet: ViewStyle; contactSheetHeader: ViewStyle; contactBackBtn: ViewStyle;
  contactBackText: TextStyle; contactCloseBtn: ViewStyle;
  contactRootGrid: ViewStyle; contactCard: ViewStyle; contactCardIcon: ViewStyle;
  contactCardTitle: TextStyle; contactCardSub: TextStyle; contactCardActions: ViewStyle;
  contactActionBtn: ViewStyle; contactActionText: TextStyle; contactChevronRow: ViewStyle;
  contactList: ViewStyle; contactListRow: ViewStyle; contactListIcon: ViewStyle;
  contactListName: TextStyle; contactListSub: TextStyle;
  contactRowActions: ViewStyle; contactRowBtn: ViewStyle;
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

  // Header — NVC logo sits below Dynamic Island
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 24, height: 24 },
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
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    minHeight: 36,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Metrics — icon wrap 20% smaller (28→22, icon 15→12)
  metricsSection: { paddingHorizontal: 14, paddingTop: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: {
    width: "31%", flexGrow: 1, borderRadius: 16, padding: 14,
    alignItems: "flex-start", gap: 5, minHeight: 96, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24, shadowRadius: 12, elevation: 7,
  },
  metricHighlight: { borderRadius: 14, backgroundColor: "rgba(255,255,255,0.10)" },
  metricIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  metricValue: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.6 },
  metricLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", lineHeight: 14 },

  // Map — taller (200→260) since Quick Actions section is now smaller
  mapWidget: {
    height: 260, borderRadius: 16, overflow: "hidden",
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
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1A1E2A", letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: "700", color: NVC_BLUE },

  // Contact — 3-button row
  contactGrid: { flexDirection: "row", gap: 10 },
  contactActionCard: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 20, borderRadius: 16, borderWidth: 1.5, gap: 10,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09, shadowRadius: 10, elevation: 3,
  },
  contactActionIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactActionLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },

  // Contact Modal
  contactSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    maxHeight: "80%",
  },
  contactSheetHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
  },
  contactBackBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 12 },
  contactBackText: { fontSize: 14, fontWeight: "600" },
  contactCloseBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  contactRootGrid: { gap: 12, paddingBottom: 4 },
  contactCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 6,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  contactCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  contactCardTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  contactCardSub: { fontSize: 12, fontWeight: "500" },
  contactCardActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  contactActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 10, minHeight: 44,
  },
  contactActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  contactChevronRow: { marginTop: 4 },
  contactList: { gap: 2, paddingBottom: 8 },
  contactListRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  contactListIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  contactListName: { fontSize: 14, fontWeight: "700" },
  contactListSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  contactRowActions: { flexDirection: "row", gap: 6 },
  contactRowBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },

  // Tech Chips
  techRow: { paddingBottom: 4, gap: 8 },
  techChip: {
    alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16,
    backgroundColor: WIDGET_SURFACE_LIGHT, gap: 5, minWidth: 76,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09, shadowRadius: 10, elevation: 3,
  },
  techAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  techInitials: { fontSize: 13, fontWeight: "800" },
  techDot: { position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: WIDGET_SURFACE_LIGHT },
  techName: { fontSize: 11, fontWeight: "700", color: "#1A1E2A" },
  techStatus: { fontSize: 10, fontWeight: "600" },

  // Task Rows
  taskRow: {
    flexDirection: "row", borderRadius: 14, marginBottom: 10, overflow: "hidden",
    backgroundColor: WIDGET_SURFACE_LIGHT,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
  },
  taskBar: { width: 4 },
  taskBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, gap: 4 },
  taskTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskCustomer: { fontSize: 14, fontWeight: "700", flex: 1, marginRight: 6, color: "#1A1E2A" },
  taskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  taskBadgeText: { fontSize: 11, fontWeight: "700" },
  taskAddr: { fontSize: 12, color: "#6B7280" },
  taskTech: { fontSize: 12, color: "#6B7280" },

  // Create Sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  sheetOption: { width: "30%", alignItems: "center", paddingVertical: 18, borderRadius: 16, borderWidth: 1.5, gap: 10 },
  sheetOptionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sheetOptionLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  sheetCancel: { marginTop: 16, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  sheetCancelText: { fontSize: 16, fontWeight: "700" },
});
