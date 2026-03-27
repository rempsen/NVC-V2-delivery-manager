import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientPlan = "starter" | "professional" | "enterprise";
type ClientStatus = "active" | "trial" | "suspended" | "onboarding";

interface ClientCompany {
  id: number;
  name: string;
  industry: string;
  plan: ClientPlan;
  status: ClientStatus;
  technicianCount: number;
  activeJobs: number;
  monthlyRevenue: number;
  createdAt: string;
  primaryColor: string;
  subdomain: string;
}

// ─── Mock Clients ─────────────────────────────────────────────────────────────

const MOCK_CLIENTS: ClientCompany[] = [
  {
    id: 1,
    name: "Arctic HVAC Services",
    industry: "HVAC",
    plan: "enterprise",
    status: "active",
    technicianCount: 24,
    activeJobs: 8,
    monthlyRevenue: 4200,
    createdAt: "2025-01-15",
    primaryColor: "#3B82F6",
    subdomain: "arctic-hvac",
  },
  {
    id: 2,
    name: "Prairie Electric Co.",
    industry: "Electrical",
    plan: "professional",
    status: "active",
    technicianCount: 12,
    activeJobs: 4,
    monthlyRevenue: 1800,
    createdAt: "2025-03-01",
    primaryColor: "#F59E0B",
    subdomain: "prairie-electric",
  },
  {
    id: 3,
    name: "Swift Couriers",
    industry: "Delivery",
    plan: "professional",
    status: "active",
    technicianCount: 31,
    activeJobs: 15,
    monthlyRevenue: 2400,
    createdAt: "2025-02-10",
    primaryColor: "#22C55E",
    subdomain: "swift-couriers",
  },
  {
    id: 4,
    name: "HomeGuard Security",
    industry: "Security",
    plan: "starter",
    status: "trial",
    technicianCount: 6,
    activeJobs: 2,
    monthlyRevenue: 0,
    createdAt: "2026-03-01",
    primaryColor: "#8B5CF6",
    subdomain: "homeguard",
  },
  {
    id: 5,
    name: "ClearView IT Solutions",
    industry: "IT Repair",
    plan: "professional",
    status: "active",
    technicianCount: 9,
    activeJobs: 3,
    monthlyRevenue: 1350,
    createdAt: "2025-06-20",
    primaryColor: "#EF4444",
    subdomain: "clearview-it",
  },
  {
    id: 6,
    name: "Comfort Home Care",
    industry: "Home Care",
    plan: "enterprise",
    status: "active",
    technicianCount: 48,
    activeJobs: 22,
    monthlyRevenue: 7200,
    createdAt: "2024-11-01",
    primaryColor: "#E85D04",
    subdomain: "comfort-homecare",
  },
];

const PLAN_COLORS: Record<ClientPlan, string> = {
  starter: "#6B7280",
  professional: "#3B82F6",
  enterprise: "#8B5CF6",
};

const PLAN_DISPLAY: Record<ClientPlan, string> = {
  starter: "Starter — $99/mo",
  professional: "Professional — $299/mo",
  enterprise: "Enterprise — $799/mo",
};

const STATUS_COLORS: Record<ClientStatus, string> = {
  active: "#22C55E",
  trial: "#F59E0B",
  suspended: "#EF4444",
  onboarding: "#3B82F6",
};

const INDUSTRIES = [
  "HVAC", "Electrical", "Plumbing", "Construction", "Delivery",
  "IT Repair", "Telecom", "Home Care", "Security", "Flooring",
  "Landscaping", "Cleaning", "Pest Control", "Other",
];

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client, onPress }: { client: ClientCompany; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.clientCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      {/* Color bar */}
      <View style={[styles.clientColorBar, { backgroundColor: client.primaryColor }]} />
      <View style={styles.clientCardContent}>
        <View style={styles.clientCardTop}>
          <View style={[styles.clientAvatar, { backgroundColor: client.primaryColor + "20" }]}>
            <Text style={[styles.clientAvatarText, { color: client.primaryColor }]}>
              {client.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: colors.foreground }]} numberOfLines={1}>
              {client.name}
            </Text>
            <Text style={[styles.clientIndustry, { color: colors.muted }]}>{client.industry}</Text>
          </View>
          <View style={styles.clientBadges}>
            <View style={[styles.planBadge, { backgroundColor: PLAN_COLORS[client.plan] + "20" }]}>
              <Text style={[styles.planText, { color: PLAN_COLORS[client.plan] }]}>
                {client.plan.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[client.status] + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[client.status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[client.status] }]}>
                {client.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.clientStats}>
          <View style={styles.clientStat}>
            <Text style={[styles.clientStatVal, { color: colors.foreground }]}>
              {client.technicianCount}
            </Text>
            <Text style={[styles.clientStatLabel, { color: colors.muted }]}>Techs</Text>
          </View>
          <View style={[styles.clientStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.clientStat}>
            <Text style={[styles.clientStatVal, { color: "#F59E0B" }]}>{client.activeJobs}</Text>
            <Text style={[styles.clientStatLabel, { color: colors.muted }]}>Active</Text>
          </View>
          <View style={[styles.clientStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.clientStat}>
            <Text style={[styles.clientStatVal, { color: "#22C55E" }]}>
              ${client.monthlyRevenue.toLocaleString()}
            </Text>
            <Text style={[styles.clientStatLabel, { color: colors.muted }]}>MRR</Text>
          </View>
          <View style={[styles.clientStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.clientStat}>
            <Text style={[styles.clientStatLabel, { color: colors.muted }]}>
              {client.subdomain}.nvc360.com
            </Text>
          </View>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} style={styles.clientChevron} />
    </Pressable>
  );
}

// ─── Create Client Modal ──────────────────────────────────────────────────────

function CreateClientModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("HVAC");
  const [plan, setPlan] = useState<ClientPlan>("starter");
  const [subdomain, setSubdomain] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createMerchantMutation = trpc.admin.createMerchant.useMutation();

  const handleSubmit = async () => {
    if (!name.trim() || !subdomain.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      Alert.alert("Required Fields", "Please fill in all required fields including owner details.");
      return;
    }
    if (ownerPassword.length < 8) {
      Alert.alert("Password Too Short", "Owner password must be at least 8 characters.");
      return;
    }
    const industryKey = INDUSTRY_DISPLAY_TO_KEY[industry] ?? "other";
    setLoading(true);
    try {
      await createMerchantMutation.mutateAsync({
        companyName: name.trim(),
        slug: subdomain.trim(),
        industry: industryKey as any,
        plan: plan as any,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.toLowerCase().trim(),
        ownerPassword: ownerPassword,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Company Created!", `${name} has been added to the platform. The owner can log in with ${ownerEmail}.`);
      // Reset form
      setName(""); setSubdomain(""); setOwnerName(""); setOwnerEmail(""); setOwnerPassword("");
      setIndustry("HVAC"); setPlan("starter");
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create company. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const isValid = name.trim() && subdomain.trim() && ownerName.trim() && ownerEmail.trim() && ownerPassword.length >= 8;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Client Company</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Company Info */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Company Name *</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={name}
            onChangeText={(v) => { setName(v); if (!subdomain) setSubdomain(v.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")); }}
            placeholder="e.g. Arctic HVAC Services"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Subdomain / Slug *</Text>
          <View style={[styles.subdomainRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.subdomainInput, { color: colors.foreground }]}
              value={subdomain}
              onChangeText={(v) => setSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="company-name"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
            <Text style={[styles.subdomainSuffix, { color: colors.muted }]}>.nvc360.com</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Industry</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.industryScroll}>
            {INDUSTRIES.map((ind) => (
              <Pressable
                key={ind}
                style={[
                  styles.industryChip,
                  {
                    backgroundColor: industry === ind ? colors.primary + "20" : colors.background,
                    borderColor: industry === ind ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setIndustry(ind)}
              >
                <Text style={[styles.industryText, { color: industry === ind ? colors.primary : colors.muted }]}>
                  {ind}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Plan</Text>
          <View style={styles.planRow}>
            {(["starter", "professional", "enterprise"] as ClientPlan[]).map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.planOption,
                  {
                    backgroundColor: plan === p ? PLAN_COLORS[p] + "20" : colors.background,
                    borderColor: plan === p ? PLAN_COLORS[p] : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => setPlan(p)}
              >
                <Text style={[styles.planOptionText, { color: plan === p ? PLAN_COLORS[p] : colors.muted }]}>
                  {p === "professional" ? "Pro" : p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
                <Text style={[styles.planOptionPrice, { color: plan === p ? PLAN_COLORS[p] : colors.border }]}>
                  {p === "starter" ? "$99/mo" : p === "professional" ? "$299/mo" : "$799/mo"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Owner / First Admin Account */}
          <View style={[styles.ownerSection, { borderColor: colors.border }]}>
            <Text style={[styles.ownerSectionTitle, { color: colors.foreground }]}>Owner / Admin Account</Text>
            <Text style={[styles.ownerSectionSub, { color: colors.muted }]}>This person will be the company admin and can log in immediately.</Text>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Full Name *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Jane Smith"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              placeholder="admin@company.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Temporary Password * (min 8 chars)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={ownerPassword}
              onChangeText={setOwnerPassword}
              placeholder="Minimum 8 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: isValid ? colors.primary : colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <IconSymbol name="plus.circle.fill" size={16} color={isValid ? "#fff" : colors.muted} />
          }
          <Text style={[styles.createBtnText, { color: isValid ? "#fff" : colors.muted }]}>
            {loading ? "Creating..." : "Create Company"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "tenant.suspend":      { label: "Suspended",   color: "#EF4444" },
  "tenant.unsuspend":    { label: "Unsuspended",  color: "#22C55E" },
  "tenant.impersonate":  { label: "Impersonated", color: "#F59E0B" },
  "tenant.create":       { label: "Created",      color: "#3B82F6" },
  "tenant.update":       { label: "Updated",      color: "#8B5CF6" },
  "user.create":         { label: "User Created", color: "#3B82F6" },
  "user.login":          { label: "Login",        color: "#6B7280" },
};

function AuditLogTab() {
  const colors = useColors();
  const { data, isLoading, refetch } = trpc.auditLogs.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: true },
  );
  const rows = data?.rows ?? [];

  return (
    <View style={{ flex: 1 }}>
      <View style={[auditStyles.header, { borderBottomColor: colors.border }]}>
        <Text style={[auditStyles.title, { color: colors.foreground }]}>Audit Log</Text>
        <Pressable
          style={({ pressed }) => [auditStyles.refreshBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => refetch()}
        >
          <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
          <Text style={[auditStyles.refreshText, { color: colors.primary }]}>Refresh</Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!isLoading && rows.length === 0 && (
        <View style={{ padding: 32, alignItems: "center" }}>
          <Text style={[auditStyles.emptyText, { color: colors.muted }]}>
            No audit events recorded yet.
          </Text>
          <Text style={[auditStyles.emptySubText, { color: colors.muted }]}>
            Actions like suspend, unsuspend, and impersonate will appear here.
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {rows.map((row: any) => {
          const actionMeta = ACTION_LABELS[row.action] ?? { label: row.action, color: "#6B7280" };
          const ts = row.createdAt ? new Date(row.createdAt) : null;
          const timeStr = ts
            ? ts.toLocaleDateString("en-CA") + " " + ts.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })
            : "";
          return (
            <View
              key={row.id}
              style={[auditStyles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[auditStyles.actionBadge, { backgroundColor: actionMeta.color + "20" }]}>
                <Text style={[auditStyles.actionBadgeText, { color: actionMeta.color }]}>
                  {actionMeta.label}
                </Text>
              </View>
              <View style={auditStyles.rowBody}>
                <Text style={[auditStyles.rowActor, { color: colors.foreground }]} numberOfLines={1}>
                  {row.actorEmail}
                </Text>
                {row.targetId && (
                  <Text style={[auditStyles.rowTarget, { color: colors.muted }]} numberOfLines={1}>
                    {row.targetType ?? "target"} #{row.targetId}
                    {row.metadata?.tenantName ? ` — ${row.metadata.tenantName}` : ""}
                  </Text>
                )}
              </View>
              <Text style={[auditStyles.rowTime, { color: colors.muted }]}>{timeStr}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const auditStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  refreshText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  emptySubText: { fontSize: 13, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 88,
    alignItems: "center",
  },
  actionBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  rowBody: { flex: 1 },
  rowActor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowTarget: { fontSize: 11, marginTop: 2 },
  rowTime: { fontSize: 10 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

// Map DB tenant industry enum to display-friendly string
const INDUSTRY_DISPLAY_TO_KEY: Record<string, string> = {
  "HVAC": "hvac", "Construction": "construction", "Delivery": "delivery",
  "Home Repair": "home_repair", "IT Repair": "it_repair", "Telecom": "telecom",
  "Fitness": "home_fitness", "Elder Care": "elder_care", "Electrical": "electrical",
  "Plumbing": "plumbing", "Flooring": "flooring", "Security": "other",
  "Landscaping": "other", "Cleaning": "other", "Pest Control": "other", "Home Care": "elder_care", "Other": "other",
};

const INDUSTRY_DISPLAY: Record<string, string> = {
  hvac: "HVAC", construction: "Construction", delivery: "Delivery",
  home_repair: "Home Repair", it_repair: "IT Repair", telecom: "Telecom",
  home_fitness: "Fitness", elder_care: "Elder Care", electrical: "Electrical",
  plumbing: "Plumbing", flooring: "Flooring", other: "Other",
};

type SuperAdminTab = "clients" | "audit";

export default function SuperAdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<ClientPlan | "all" | "pro">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [clientViewMode, setClientViewMode] = useState<"list" | "card">("list");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Live DB queries — use listWithStats for real active job / user / tech counts
  const { data: tenantsData, isLoading, refetch } = trpc.tenants.listWithStats.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });


  const toggleSuspendMutation = trpc.tenants.toggleSuspend.useMutation({
    onSuccess: () => { refetch(); setActionLoadingId(null); },
    onError: (err) => { Alert.alert("Error", err.message); setActionLoadingId(null); },
  });

  const impersonateMutation = trpc.tenants.impersonate.useMutation({
    onSuccess: (result) => {
      setActionLoadingId(null);
      Alert.alert(
        "Viewing as Merchant",
        `You are now viewing ${result.tenantName}. Navigate to the main dashboard to see their data.`,
        [
          { text: "Go to Dashboard", onPress: () => router.push("/(tabs)" as any) },
          { text: "Stay Here", style: "cancel" },
        ],
      );
    },
    onError: (err) => { Alert.alert("Error", err.message); setActionLoadingId(null); },
  });

  // Map DB tenant rows to ClientCompany shape for the existing UI
  const clients: ClientCompany[] = (tenantsData ?? []).map((t: any) => ({
    id: t.id,
    name: t.companyName,
    industry: INDUSTRY_DISPLAY[t.industry] ?? t.industry,
    plan: (t.plan === "pro" ? "professional" : t.plan) as ClientPlan,
    status: t.isActive ? (t.suspended ? "suspended" : "active") : "onboarding",
    technicianCount: t.totalTechnicians ?? 0,
    activeJobs: t.activeJobs ?? 0,
    monthlyRevenue: 0,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "",
    primaryColor: (t.branding as any)?.primaryColor ?? "#3B82F6",
    subdomain: t.slug,
    suspended: t.suspended ?? false,
  }));

  const filteredClients = clients.filter((c) => {
    const matchesPlan = planFilter === "all" || c.plan === planFilter;
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlan && matchesSearch;
  });

  // Platform metrics
  const totalTechs = clients.reduce((sum, c) => sum + c.technicianCount, 0);
  const totalActiveJobs = clients.reduce((sum, c) => sum + c.activeJobs, 0);
  const activeClients = clients.filter((c) => c.status === "active").length;


  const handleSuspend = (client: ClientCompany) => {
    const isSuspended = (client as any).suspended;
    Alert.alert(
      isSuspended ? "Unsuspend Client" : "Suspend Client",
      isSuspended
        ? `Restore access for "${client.name}"?`
        : `Suspend "${client.name}"? All their users will lose access immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isSuspended ? "Unsuspend" : "Suspend",
          style: isSuspended ? "default" : "destructive",
          onPress: () => {
            setActionLoadingId(client.id);
            toggleSuspendMutation.mutate({ id: client.id, suspended: !isSuspended });
          },
        },
      ],
    );
  };

  const handleImpersonate = (client: ClientCompany) => {
    setActionLoadingId(client.id);
    impersonateMutation.mutate({ tenantId: client.id });
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader
        title="NVC360 Super Admin"
        subtitle="Platform Management"
        showBack={false}
        variant="blue"
        rightElement={
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
          >
            <IconSymbol name="plus" size={22} color="#fff" />
          </Pressable>
        }
      />

      {/* Platform Stats */}
      <View style={[styles.platformStats, { backgroundColor: "#0a0a0a" }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformStatsContent}>
          <View style={styles.platformStat}>
            <Text style={styles.platformStatVal}>{clients.length}</Text>
            <Text style={styles.platformStatLabel}>Total Clients</Text>
          </View>
          <View style={[styles.platformStatDivider, { backgroundColor: "#333" }]} />
          <View style={styles.platformStat}>
            <Text style={[styles.platformStatVal, { color: "#22C55E" }]}>{activeClients}</Text>
            <Text style={styles.platformStatLabel}>Active</Text>
          </View>
          <View style={[styles.platformStatDivider, { backgroundColor: "#333" }]} />
          <View style={styles.platformStat}>
            <Text style={[styles.platformStatVal, { color: "#3B82F6" }]}>{totalTechs}</Text>
            <Text style={styles.platformStatLabel}>Technicians</Text>
          </View>
          <View style={[styles.platformStatDivider, { backgroundColor: "#333" }]} />
          <View style={styles.platformStat}>
            <Text style={[styles.platformStatVal, { color: "#F59E0B" }]}>{totalActiveJobs}</Text>
            <Text style={styles.platformStatLabel}>Live Jobs</Text>
          </View>
          <View style={[styles.platformStatDivider, { backgroundColor: "#333" }]} />
          <View style={styles.platformStat}>
            <Text style={[styles.platformStatVal, { color: "#22C55E" }]}>
              {clients.filter((c) => c.status === "suspended").length}
            </Text>
            <Text style={styles.platformStatLabel}>Suspended</Text>
          </View>
        </ScrollView>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["clients", "audit"] as SuperAdminTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === "clients" ? "Clients" : "Audit Log"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Audit Log Tab */}
      {activeTab === "audit" && <AuditLogTab />}

      {/* Clients Tab */}
      {activeTab === "clients" && (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Platform Tools — at top */}
        <View style={[styles.quickActions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.quickActionsTitle, { color: colors.foreground }]}>Platform Tools</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { label: "Templates", icon: "doc.text.fill" as const, color: "#3B82F6", route: "/settings/workflow-templates" },
              { label: "Pricing", icon: "dollarsign.circle.fill" as const, color: "#22C55E", route: "/super-admin/pricing-logic" },
              { label: "Analytics", icon: "chart.bar.fill" as const, color: "#8B5CF6", route: "/super-admin/analytics" },
              { label: "API Keys", icon: "key.fill" as const, color: "#F59E0B", route: "/integrations" },
              { label: "Billing", icon: "creditcard.fill" as const, color: "#EF4444", route: "/super-admin/billing" },
              { label: "Support", icon: "questionmark.circle.fill" as const, color: "#6B7280", route: "https://nvc360.com/support/" },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.quickAction,
                  { backgroundColor: action.color + "18", borderColor: action.color + "35", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  if (action.route?.startsWith("http")) {
                    const { Linking } = require("react-native");
                    Linking.openURL(action.route);
                  } else if (action.route) {
                    router.push(action.route as any);
                  }
                }}
              >
                <IconSymbol name={action.icon} size={22} color={action.color} />
                <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search clients, industries, subdomains..."
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

        {/* Plan Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(["all", "starter", "professional", "enterprise"] as const).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
              planFilter === p
                        ? p === "all"
                          ? colors.primary
                          : PLAN_COLORS[p as ClientPlan] ?? "#3B82F6"
                        : colors.surface,
                  borderColor:
                    planFilter === p
                      ? p === "all"
                        ? colors.primary
                        : PLAN_COLORS[p as ClientPlan] ?? "#3B82F6"
                      : colors.border,
                },
              ]}
              onPress={() => setPlanFilter(p)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: planFilter === p ? "#fff" : colors.muted },
                ]}
              >
                {p === "all" ? "All Plans" : p === "professional" ? "Pro" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Clients List */}
        <View style={styles.clientsList}>
          <View style={styles.clientsListHeader}>
            <Text style={[styles.clientsListTitle, { color: colors.foreground }]}>
              Client Companies
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.clientsListCount, { color: colors.muted }]}>
                {filteredClients.length} of {clients.length}
              </Text>
              {/* List / Card toggle */}
              <View style={[styles.viewToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  style={[styles.viewToggleBtn, clientViewMode === "list" && { backgroundColor: colors.primary }]}
                  onPress={() => setClientViewMode("list")}
                >
                  <IconSymbol name="list.bullet" size={14} color={clientViewMode === "list" ? "#fff" : colors.muted} />
                </Pressable>
                <Pressable
                  style={[styles.viewToggleBtn, clientViewMode === "card" && { backgroundColor: colors.primary }]}
                  onPress={() => setClientViewMode("card")}
                >
                  <IconSymbol name="square.grid.3x3.fill" size={14} color={clientViewMode === "card" ? "#fff" : colors.muted} />
                </Pressable>
              </View>
            </View>
          </View>

          {clientViewMode === "list" ? (
            filteredClients.map((client) => (
              <View key={client.id}>
                <ClientCard
                  client={client}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/super-admin/client/${client.id}` as any);
                  }}
                />
                {/* Action buttons row */}
                <View style={[styles.clientActions, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Pressable
                    style={({ pressed }) => [styles.clientActionBtn, { backgroundColor: colors.primary + "15", opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => handleImpersonate(client)}
                    disabled={actionLoadingId === client.id}
                  >
                    {actionLoadingId === client.id
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Text style={[styles.clientActionBtnText, { color: colors.primary }]}>View as Merchant</Text>
                    }
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.clientActionBtn,
                      { backgroundColor: (client as any).suspended ? "#22C55E20" : "#EF444420", opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => handleSuspend(client)}
                    disabled={actionLoadingId === client.id}
                  >
                    <Text style={[styles.clientActionBtnText, { color: (client as any).suspended ? "#22C55E" : "#EF4444" }]}>
                      {(client as any).suspended ? "Unsuspend" : "Suspend"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.clientsCardGrid}>
              {filteredClients.map((client) => (
                <Pressable
                  key={client.id}
                  style={({ pressed }) => [
                    styles.clientGridCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/super-admin/client/${client.id}` as any);
                  }}
                >
                  <View style={[styles.clientGridColorBar, { backgroundColor: client.primaryColor }]} />
                  <View style={[styles.clientGridAvatar, { backgroundColor: client.primaryColor + "20" }]}>
                    <Text style={[styles.clientGridAvatarText, { color: client.primaryColor }]}>
                      {client.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={[styles.clientGridName, { color: colors.foreground }]} numberOfLines={2}>
                    {client.name}
                  </Text>
                  <Text style={[styles.clientGridIndustry, { color: colors.muted }]} numberOfLines={1}>
                    {client.industry}
                  </Text>
                  <View style={[styles.planBadge, { backgroundColor: PLAN_COLORS[client.plan] + "20", alignSelf: "center", marginTop: 4 }]}>
                    <Text style={[styles.planText, { color: PLAN_COLORS[client.plan] }]}>
                      {client.plan.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientGridStats}>
                    <Text style={[styles.clientGridStatVal, { color: colors.foreground }]}>{client.technicianCount}</Text>
                    <Text style={[styles.clientGridStatLabel, { color: colors.muted }]}>Techs</Text>
                  </View>
                  <View style={styles.clientGridStats}>
                    <Text style={[styles.clientGridStatVal, { color: "#22C55E" }]}>${client.monthlyRevenue.toLocaleString()}</Text>
                    <Text style={[styles.clientGridStatLabel, { color: colors.muted }]}>MRR</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      )}

      <CreateClientModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.bottomBarBtn, { backgroundColor: "#3B82F620", opacity: pressed ? 0.7 : 1 }]}
          onPress={() => setShowCreate(true)}
        >
          <IconSymbol name="building.2.fill" size={18} color="#3B82F6" />
          <Text style={[styles.bottomBarBtnText, { color: "#3B82F6" }]}>New Company</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.bottomBarBtn, { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.push("/super-admin/create-user" as any)}
        >
          <IconSymbol name="person.badge.plus" size={18} color="#22C55E" />
          <Text style={[styles.bottomBarBtnText, { color: "#22C55E" }]}>New User</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.bottomBarBtn, { backgroundColor: "#F59E0B20", opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            if (clients.length === 0) { Alert.alert("No Companies", "Create a company first, then manage it from the list."); return; }
            router.push(`/super-admin/client/${clients[0].id}` as any);
          }}
        >
          <IconSymbol name="gearshape.fill" size={18} color="#F59E0B" />
          <Text style={[styles.bottomBarBtnText, { color: "#F59E0B" }]}>Manage</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.bottomBarBtn, { backgroundColor: "#8B5CF620", opacity: pressed ? 0.7 : 1 }]}
          onPress={() => setActiveTab("audit")}
        >
          <IconSymbol name="doc.text.fill" size={18} color="#8B5CF6" />
          <Text style={[styles.bottomBarBtnText, { color: "#8B5CF6" }]}>Audit Log</Text>
        </Pressable>
      </View>
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  addClientBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  addClientBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  platformStats: { paddingVertical: 12 },
  platformStatsContent: { paddingHorizontal: 16, gap: 4 },
  platformStat: { alignItems: "center", paddingHorizontal: 16 },
  platformStatVal: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  platformStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  platformStatDivider: { width: 1, height: 36, alignSelf: "center" },
  scroll: { paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    margin: 16,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clientsList: { paddingHorizontal: 16 },
  clientsListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  clientsListTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  clientsListCount: { fontSize: 13 },
  clientCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  clientColorBar: { width: 4, alignSelf: "stretch" },
  clientCardContent: { flex: 1, padding: 12, gap: 10 },
  clientCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clientIndustry: { fontSize: 12, marginTop: 1 },
  clientBadges: { gap: 4, alignItems: "flex-end" },
  planBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  clientStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  clientStat: { flex: 1, alignItems: "center", gap: 2 },
  clientStatVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  clientStatLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  clientStatDivider: { width: 1, height: 28 },
  clientChevron: { marginRight: 12 },
  quickActions: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  quickActionsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAction: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: 6,
  },
  quickActionLabel: { fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 11 },
  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
    gap: 12,
  },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 8 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 4,
  },
  subdomainRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 4,
  },
  subdomainInput: { flex: 1, fontSize: 15 },
  subdomainSuffix: { fontSize: 13 },
  industryScroll: { marginBottom: 4 },
  industryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  industryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  planOption: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  planOptionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  planOptionPrice: { fontSize: 11 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  // View toggle
  viewToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  viewToggleBtn: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // Card grid for clients
  clientsCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  clientGridCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  clientGridColorBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  clientGridAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  clientGridAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  clientGridName: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  clientGridIndustry: { fontSize: 11, textAlign: "center" },
  clientGridStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  clientGridStatVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  clientGridStatLabel: { fontSize: 10, color: "#9BA1A6" },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 4,
  },
  tabBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Client action buttons
  clientActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: 14,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  clientActionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  clientActionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Bottom action bar
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  bottomBarBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  bottomBarBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  // Owner section in create modal
  ownerSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  ownerSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  ownerSectionSub: { fontSize: 12, marginBottom: 4 },
});