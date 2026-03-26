import { useState, useCallback, useMemo } from "react";
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
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT,
} from "@/constants/brand";
import {
  STATUS_COLORS, STATUS_LABELS, TECH_STATUS_COLORS, TECH_STATUS_LABELS,
  type Task, type Technician, type TaskStatus,
} from "@/lib/nvc-types";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";
import { GoogleMapView } from "@/components/google-map-view";

const { width: SW } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";
const LEFT_PANEL_W = IS_WEB ? 300 : Math.min(SW * 0.78, 320);
const RIGHT_PANEL_W = IS_WEB ? 340 : Math.min(SW * 0.82, 360);

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

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

  const colleagues = selectedCategory ? (COLLEAGUES_BY_CATEGORY[selectedCategory] ?? []) : [];
  // Client list is empty until live customer data is wired in per-category
  const clients: { id: number; company: string; phone: string; industry: string }[] = [];

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
                      0 clients
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
                    <Text style={[styles.contactListSub, { color: colors.muted }]} numberOfLines={1}>{client.industry}</Text>
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

// ─── Map-First Dashboard Components ─────────────────────────────────────────

function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[mapStyles.statChip, { backgroundColor: color + "12", borderColor: color + "30" }]}>
      <StatusDot color={color} size={7} />
      <Text style={[mapStyles.statChipValue, { color }]}>{value}</Text>
      <Text style={[mapStyles.statChipLabel, { color: color + "CC" }]}>{label}</Text>
    </View>
  );
}

function TechListRow({ tech, selected, onPress }: { tech: Technician; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  const statusColor = TECH_STATUS_COLORS[tech.status] ?? "#9CA3AF";
  const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Pressable
      style={[mapStyles.listRow, { borderBottomColor: colors.border }, selected && { backgroundColor: NVC_BLUE + "10" }]}
      onPress={onPress}
    >
      <View style={[mapStyles.listAvatar, { backgroundColor: statusColor + "20" }]}>
        <Text style={[mapStyles.listAvatarText, { color: statusColor }]}>{initials}</Text>
        <View style={[mapStyles.listAvatarDot, { backgroundColor: statusColor }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mapStyles.listName, { color: colors.foreground }]} numberOfLines={1}>{tech.name}</Text>
        <Text style={[mapStyles.listSub, { color: statusColor }]} numberOfLines={1}>
          {TECH_STATUS_LABELS[tech.status]}{tech.activeTaskAddress ? ` · ${tech.activeTaskAddress}` : ""}
        </Text>
      </View>
      <Text style={[mapStyles.listMeta, { color: colors.muted }]}>{tech.todayJobs}j</Text>
    </Pressable>
  );
}

function JobListRow({ job, selected, onPress }: { job: Task; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[job.status] ?? "#9CA3AF";
  return (
    <Pressable
      style={[mapStyles.listRow, { borderBottomColor: colors.border }, selected && { backgroundColor: NVC_ORANGE + "10" }]}
      onPress={onPress}
    >
      <View style={[mapStyles.listStatusBar, { backgroundColor: statusColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[mapStyles.listName, { color: colors.foreground }]} numberOfLines={1}>{job.customerName}</Text>
        <Text style={[mapStyles.listSub, { color: colors.muted }]} numberOfLines={1}>{job.jobAddress}</Text>
        {job.technicianName && (
          <Text style={[mapStyles.listTech, { color: statusColor }]} numberOfLines={1}>● {job.technicianName}</Text>
        )}
      </View>
      <View style={[mapStyles.listBadge, { backgroundColor: statusColor + "20" }]}>
        <Text style={[mapStyles.listBadgeText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
      </View>
    </Pressable>
  );
}

type LeftTab = "techs" | "jobs";

function LeftPanel({
  visible, selectedTechId, selectedJobId, onSelectTech, onSelectJob, onClose,
  technicians: allTechs, tasks: allTasks,
}: {
  visible: boolean; selectedTechId: number | null; selectedJobId: number | null;
  onSelectTech: (id: number) => void; onSelectJob: (id: number) => void; onClose: () => void;
  technicians: Technician[]; tasks: Task[];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LeftTab>("techs");
  const [q, setQ] = useState("");
  const filteredTechs = useMemo(() => {
    const lq = q.toLowerCase();
    return allTechs.filter((t) => t.name.toLowerCase().includes(lq) || t.status.includes(lq));
  }, [q, allTechs]);
  const filteredJobs = useMemo(() => {
    const lq = q.toLowerCase();
    return allTasks
      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .filter((t) => t.customerName.toLowerCase().includes(lq) || t.jobAddress.toLowerCase().includes(lq));
  }, [q, allTasks]);
  if (!visible) return null;
  return (
    <View style={[mapStyles.leftPanel, { width: LEFT_PANEL_W, backgroundColor: IS_WEB ? "rgba(255,255,255,0.97)" : colors.surface, paddingTop: insets.top + 72, borderRightColor: colors.border }]}>
      <View style={[mapStyles.panelSearch, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={14} color={colors.muted} />
        <TextInput style={[mapStyles.panelSearchInput, { color: colors.foreground }]} placeholder="Search…" placeholderTextColor={colors.muted} value={q} onChangeText={setQ} />
        {q.length > 0 && <Pressable onPress={() => setQ("")}><IconSymbol name="xmark.circle.fill" size={14} color={colors.muted} /></Pressable>}
      </View>
      <View style={[mapStyles.panelTabs, { borderBottomColor: colors.border }]}>
        {(["techs", "jobs"] as LeftTab[]).map((t) => (
          <Pressable key={t} style={[mapStyles.panelTab, tab === t && { borderBottomColor: NVC_BLUE }]} onPress={() => setTab(t)}>
            <Text style={[mapStyles.panelTabText, { color: tab === t ? NVC_BLUE : colors.muted }]}>
              {t === "techs" ? `Techs (${filteredTechs.length})` : `Jobs (${filteredJobs.length})`}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {tab === "techs"
          ? filteredTechs.map((tech) => <TechListRow key={tech.id} tech={tech} selected={selectedTechId === tech.id} onPress={() => { haptic(); onSelectTech(tech.id); }} />)
          : filteredJobs.map((job) => <JobListRow key={job.id} job={job} selected={selectedJobId === job.id} onPress={() => { haptic(); onSelectJob(job.id); }} />)
        }
      </ScrollView>
    </View>
  );
}

function RightPanel({ tech, job, onClose, tasks: allTasks }: { tech: Technician | null; job: Task | null; onClose: () => void; tasks: Task[] }) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (!tech && !job) return null;
  return (
    <View style={[mapStyles.rightPanel, { width: RIGHT_PANEL_W, backgroundColor: IS_WEB ? "rgba(255,255,255,0.97)" : colors.surface, paddingTop: insets.top + 72, borderLeftColor: colors.border }]}>
      <Pressable style={({ pressed }) => [mapStyles.rightClose, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]} onPress={() => { haptic(); onClose(); }}>
        <IconSymbol name="xmark" size={14} color={colors.muted} />
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {tech && (
          <View style={mapStyles.detailContent}>
            {(() => {
              const statusColor = TECH_STATUS_COLORS[tech.status] ?? "#9CA3AF";
              const initials = tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const activeJob = allTasks.find((t) => t.id === tech.activeTaskId);
              return (
                <>
                  <View style={mapStyles.detailHeader}>
                    <View style={[mapStyles.detailAvatar, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[mapStyles.detailAvatarText, { color: statusColor }]}>{initials}</Text>
                      <View style={[mapStyles.detailAvatarDot, { backgroundColor: statusColor }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[mapStyles.detailName, { color: colors.foreground }]}>{tech.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <StatusDot color={statusColor} size={8} />
                        <Text style={[mapStyles.detailStatus, { color: statusColor }]}>{TECH_STATUS_LABELS[tech.status]}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={mapStyles.detailStats}>
                    {[{ v: String(tech.todayJobs), l: "Jobs Today" }, { v: tech.todayDistanceKm.toFixed(1), l: "km Today" }, { v: tech.transportType, l: "Vehicle" }].map((s) => (
                      <View key={s.l} style={[mapStyles.detailStat, { backgroundColor: colors.background }]}>
                        <Text style={[mapStyles.detailStatValue, { color: colors.foreground }]}>{s.v}</Text>
                        <Text style={[mapStyles.detailStatLabel, { color: colors.muted }]}>{s.l}</Text>
                      </View>
                    ))}
                  </View>
                  {activeJob && (
                    <View style={[mapStyles.detailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[mapStyles.detailCardTitle, { color: colors.muted }]}>ACTIVE JOB</Text>
                      <Text style={[mapStyles.detailCardMain, { color: colors.foreground }]}>{activeJob.customerName}</Text>
                      <Text style={[mapStyles.detailCardSub, { color: colors.muted }]} numberOfLines={2}>{activeJob.jobAddress}</Text>
                    </View>
                  )}
                  {tech.skills.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {tech.skills.map((s) => (
                        <View key={s} style={[mapStyles.skillChip, { backgroundColor: NVC_BLUE + "12", borderColor: NVC_BLUE + "30" }]}>
                          <Text style={[mapStyles.skillChipText, { color: NVC_BLUE }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={mapStyles.detailActions}>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: "#16A34A", opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => Linking.openURL(`tel:${tech.phone}`)}>
                      <IconSymbol name="phone.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>Call</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => Linking.openURL(`sms:${tech.phone}`)}>
                      <IconSymbol name="message.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>SMS</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: "#7C3AED", opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => { onClose(); router.push(`/agent/${tech.id}` as any); }}>
                      <IconSymbol name="person.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>Profile</Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        )}
        {job && !tech && (
          <View style={mapStyles.detailContent}>
            {(() => {
              const statusColor = STATUS_COLORS[job.status] ?? "#9CA3AF";
              return (
                <>
                  <View style={[mapStyles.detailBanner, { backgroundColor: statusColor + "15", borderColor: statusColor + "40" }]}>
                    <StatusDot color={statusColor} size={9} />
                    <Text style={[mapStyles.detailBannerText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
                    {job.orderRef && <Text style={[mapStyles.detailBannerRef, { color: colors.muted }]}>#{job.orderRef}</Text>}
                  </View>
                  {[{ title: "CUSTOMER", main: job.customerName, sub: job.customerPhone }, { title: "JOB ADDRESS", main: job.jobAddress, sub: null }, ...(job.technicianName ? [{ title: "ASSIGNED TECH", main: job.technicianName, sub: null }] : [])].map((c) => (
                    <View key={c.title} style={[mapStyles.detailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[mapStyles.detailCardTitle, { color: colors.muted }]}>{c.title}</Text>
                      <Text style={[mapStyles.detailCardMain, { color: colors.foreground }]}>{c.main}</Text>
                      {c.sub && <Text style={[mapStyles.detailCardSub, { color: colors.muted }]}>{c.sub}</Text>}
                    </View>
                  ))}
                  <View style={mapStyles.detailActions}>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: NVC_ORANGE, flex: 1, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => { onClose(); router.push(`/task/${job.id}` as any); }}>
                      <IconSymbol name="doc.text.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>View Job</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: "#16A34A", opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}>
                      <IconSymbol name="phone.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>Call</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [mapStyles.detailBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]} onPress={() => Linking.openURL(`sms:${job.customerPhone}`)}>
                      <IconSymbol name="message.fill" size={14} color="#fff" />
                      <Text style={mapStyles.detailBtnText}>SMS</Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statChipValue: { fontSize: 12, fontWeight: "800" },
  statChipLabel: { fontSize: 10, fontWeight: "600" },
  leftPanel: { position: "absolute", top: 0, left: 0, bottom: 0, zIndex: 50, borderRightWidth: 1, shadowColor: "#000", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  panelSearch: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 0, paddingHorizontal: 10, height: 38, borderRadius: 10, borderWidth: 1 },
  panelSearchInput: { flex: 1, fontSize: 13 },
  panelTabs: { flexDirection: "row", marginTop: 8, borderBottomWidth: 1 },
  panelTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  panelTabText: { fontSize: 12, fontWeight: "700" },
  listRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  listAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", position: "relative" },
  listAvatarText: { fontSize: 13, fontWeight: "800" },
  listAvatarDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: "#fff" },
  listStatusBar: { width: 3, height: 38, borderRadius: 2 },
  listName: { fontSize: 13, fontWeight: "700" },
  listSub: { fontSize: 11, marginTop: 1 },
  listTech: { fontSize: 11, marginTop: 1 },
  listMeta: { fontSize: 11 },
  listBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  listBadgeText: { fontSize: 10, fontWeight: "700" },
  rightPanel: { position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 50, borderLeftWidth: 1, shadowColor: "#000", shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  rightClose: { position: "absolute", top: 80, left: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, zIndex: 10 },
  detailContent: { padding: 16, gap: 12 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", position: "relative" },
  detailAvatarText: { fontSize: 18, fontWeight: "800" },
  detailAvatarDot: { position: "absolute", bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: "#fff" },
  detailName: { fontSize: 17, fontWeight: "800" },
  detailStatus: { fontSize: 12, fontWeight: "600" },
  detailStats: { flexDirection: "row", gap: 8 },
  detailStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 2 },
  detailStatValue: { fontSize: 15, fontWeight: "800" },
  detailStatLabel: { fontSize: 10 },
  detailCard: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 4 },
  detailCardTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  detailCardMain: { fontSize: 14, fontWeight: "700" },
  detailCardSub: { fontSize: 12 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  skillChipText: { fontSize: 11, fontWeight: "600" },
  detailActions: { flexDirection: "row", gap: 8 },
  detailBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 5 },
  detailBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  detailBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  detailBannerText: { fontSize: 13, fontWeight: "700", flex: 1 },
  detailBannerRef: { fontSize: 11 },
  mapCtrlWrap: { position: "absolute", bottom: 32, right: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4, zIndex: 60 },
  mapCtrlBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  mapCtrlDivider: { height: 1, marginHorizontal: 8 },
  liveBadge: { position: "absolute", bottom: 32, left: 16, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, zIndex: 60 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  liveText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 1 },
});

// ─── Legacy helper (kept for MetricCard usage below) ─────────────────────────
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

function MapWidget({ onPress, technicians: allTechs }: { onPress: () => void; technicians: Technician[] }) {
  const techsOnMap = allTechs.filter((t: Technician) => t.status !== "offline");
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
  const { tenantId } = useTenant();
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // ── Live DB queries ────────────────────────────────────────────────────────
  const { data: rawTasks, refetch: refetchTasks } = trpc.tasks.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 30_000, refetchInterval: 60_000 },
  );
  const { data: rawTechs, refetch: refetchTechs } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 30_000, refetchInterval: 60_000 },
  );

  const tasks: Task[] = useMemo(() => {
    if (!rawTasks) return [];
    return (rawTasks as any[]).map((t) => ({
      id: t.id, jobHash: t.jobHash ?? `job-${t.id}`,
      status: (t.status as TaskStatus) ?? "unassigned",
      priority: t.priority ?? "normal",
      customerName: t.customerName ?? "",
      customerPhone: t.customerPhone ?? "",
      customerEmail: t.customerEmail ?? "",
      jobAddress: t.jobAddress ?? "",
      jobLatitude: parseFloat(t.jobLatitude ?? "49.8951"),
      jobLongitude: parseFloat(t.jobLongitude ?? "-97.1384"),
      technicianId: t.technicianId ?? undefined,
      technicianName: t.technicianName ?? undefined,
      orderRef: t.orderRef ?? `WO-${t.id}`,
      description: t.description ?? undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString() : undefined,
    }));
  }, [rawTasks]);

  const technicians: Technician[] = useMemo(() => {
    if (!rawTechs) return [];
    return (rawTechs as any[]).map((row) => {
      const t = row.tech ?? row;
      const u = row.user ?? {};
      return {
        id: t.id,
        name: (u.name ?? t.name ?? "Technician").trim(),
        phone: u.phone ?? t.phone ?? "",
        email: u.email ?? t.email ?? "",
        status: (t.status ?? "offline") as Technician["status"],
        latitude: parseFloat(t.latitude ?? "49.8951"),
        longitude: parseFloat(t.longitude ?? "-97.1384"),
        transportType: (t.transportType ?? "car") as Technician["transportType"],
        skills: Array.isArray(t.skills) ? t.skills : [],
        photoUrl: t.photoUrl ?? undefined,
        activeTaskId: t.activeTaskId ?? undefined,
        activeTaskAddress: t.activeTaskAddress ?? undefined,
        todayJobs: t.todayJobs ?? 0,
        todayDistanceKm: t.todayDistanceKm ?? 0,
      };
    });
  }, [rawTechs]);

  const activeTasks = tasks.filter((t) => ["assigned", "en_route", "on_site"].includes(t.status));
  const completedToday = tasks.filter((t) => t.status === "completed").length;
  const unassigned = tasks.filter((t) => t.status === "unassigned").length;
  const onlineTechs = technicians.filter((t) => t.status !== "offline").length;
  const enRoute = tasks.filter((t) => t.status === "en_route").length;

  const selectedTech = selectedTechId ? technicians.find((t) => t.id === selectedTechId) ?? null : null;
  const selectedJob = selectedJobId ? tasks.find((t) => t.id === selectedJobId) ?? null : null;

  const mapTechs = technicians
    .filter((t) => t.status !== "offline")
    .map((t) => ({ id: t.id, name: t.name, latitude: t.latitude, longitude: t.longitude, status: t.status, transportType: t.transportType }));
  const mapTasks = activeTasks.map((t) => ({ id: t.id, jobLatitude: t.jobLatitude, jobLongitude: t.jobLongitude, status: t.status, customerName: t.customerName }));

  const handleSelectTech = useCallback((id: number) => {
    setSelectedTechId((prev) => (prev === id ? null : id));
    setSelectedJobId(null);
  }, []);
  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId((prev) => (prev === id ? null : id));
    setSelectedTechId(null);
  }, []);
  const handleCloseRight = useCallback(() => { setSelectedTechId(null); setSelectedJobId(null); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#EFF2F7" }}>
      {/* ── Floating Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12, backgroundColor: NVC_BLUE }]}>
        <View style={styles.topBarLeft}>
          <Pressable
            style={({ pressed }) => [styles.topBarIconBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={() => { haptic(); setLeftPanelOpen((v) => !v); }}
          >
            <IconSymbol name={leftPanelOpen ? "sidebar.left" : "sidebar.left"} size={18} color="#fff" />
          </Pressable>
          <View style={styles.topBarLogoWrap}>
            <Text style={styles.topBarLogoText}>NVC</Text>
            <View style={styles.topBarLogoDot} />
            <Text style={styles.topBarLogoText}>360</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topBarStats}>
          <StatChip label="Active" value={activeTasks.length} color="#F97316" />
          <StatChip label="Unassigned" value={unassigned} color="#EF4444" />
          <StatChip label="Online" value={onlineTechs} color="#22C55E" />
          <StatChip label="En Route" value={enRoute} color="#A855F7" />
          <StatChip label="Done" value={completedToday} color="#16A34A" />
        </ScrollView>
        <View style={styles.topBarRight}>
          <Pressable
            style={({ pressed }) => [styles.topBarIconBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={() => router.push("/notification-settings" as any)}
          >
            <IconSymbol name="bell.fill" size={16} color="#fff" />
            <View style={styles.notifBadge} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.createBtn, { opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
            onPress={() => { haptic(); setCreateSheetVisible(true); }}
          >
            <IconSymbol name="plus" size={12} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Full-Bleed Map ── */}
      <View style={{ flex: 1 }}>
        <GoogleMapView
          technicians={mapTechs}
          tasks={mapTasks}
          selectedId={selectedTechId}
          onSelectTech={handleSelectTech}
          center={{ lat: 49.8951, lng: -97.1384 }}
          zoom={12}
          style={{ width: "100%", height: "100%" }}
        />

        {/* ── Map Controls (bottom-right) ── */}
        <View style={[mapStyles.mapCtrlWrap, { backgroundColor: "rgba(255,255,255,0.95)", borderColor: "rgba(0,0,0,0.1)" }]}>
          <Pressable style={mapStyles.mapCtrlBtn} onPress={() => { haptic(); router.push("/dispatcher" as any); }}>
            <IconSymbol name="arrow.up.left.and.arrow.down.right" size={16} color={NVC_BLUE} />
          </Pressable>
          <View style={[mapStyles.mapCtrlDivider, { backgroundColor: "rgba(0,0,0,0.1)" }]} />
          <Pressable style={mapStyles.mapCtrlBtn} onPress={() => router.push("/tasks" as any)}>
            <IconSymbol name="list.bullet" size={16} color={NVC_BLUE} />
          </Pressable>
        </View>

        {/* ── Live Badge (bottom-left) ── */}
        <View style={mapStyles.liveBadge}>
          <View style={mapStyles.liveDot} />
          <Text style={mapStyles.liveText}>LIVE</Text>
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginLeft: 2 }}>{onlineTechs} active</Text>
        </View>

        {/* ── Left Panel ── */}
        <LeftPanel
          visible={leftPanelOpen}
          selectedTechId={selectedTechId}
          selectedJobId={selectedJobId}
          onSelectTech={handleSelectTech}
          onSelectJob={handleSelectJob}
          onClose={() => setLeftPanelOpen(false)}
          technicians={technicians}
          tasks={tasks}
        />

        {/* ── Right Detail Panel ── */}
        <RightPanel
          tech={selectedTech ?? null}
          job={selectedJob ?? null}
          onClose={handleCloseRight}
          tasks={tasks}
        />
      </View>

      <CreateNewSheet visible={createSheetVisible} onClose={() => setCreateSheetVisible(false)} />
      <ContactModal visible={contactModalVisible} onClose={() => setContactModalVisible(false)} />
    </View>
  );
}
// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  scrollContent: ViewStyle; header: ViewStyle; headerLeft: ViewStyle;
  headerLogo: ViewStyle; headerGreeting: TextStyle; headerTitle: TextStyle;
  headerRight: ViewStyle; notifBtn: ViewStyle; notifBadge: ViewStyle;
  createBtn: ViewStyle; createBtnText: TextStyle;
  topBar: ViewStyle; topBarLeft: ViewStyle; topBarRight: ViewStyle;
  topBarStats: ViewStyle; topBarIconBtn: ViewStyle;
  topBarLogoWrap: ViewStyle; topBarLogoText: TextStyle; topBarLogoDot: ViewStyle;
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
  // Map-first top bar
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8, zIndex: 100 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarStats: { gap: 6, paddingHorizontal: 4 },
  topBarIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  topBarLogoWrap: { flexDirection: "row", alignItems: "center", gap: 1 },
  topBarLogoText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  topBarLogoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: NVC_ORANGE, marginHorizontal: 1 },

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
