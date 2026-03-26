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
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientPlan = "starter" | "pro" | "enterprise";
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
    plan: "pro",
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
    plan: "pro",
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
    plan: "pro",
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
  pro: "#3B82F6",
  enterprise: "#8B5CF6",
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
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: Partial<ClientCompany>) => void;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("HVAC");
  const [plan, setPlan] = useState<ClientPlan>("pro");
  const [subdomain, setSubdomain] = useState("");

  if (!visible) return null;

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
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Company Name *</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Arctic HVAC Services"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Subdomain *</Text>
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
            {(["starter", "pro", "enterprise"] as ClientPlan[]).map((p) => (
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
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
                <Text style={[styles.planOptionPrice, { color: plan === p ? PLAN_COLORS[p] : colors.border }]}>
                  {p === "starter" ? "$99/mo" : p === "pro" ? "$299/mo" : "$799/mo"}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: name.trim() && subdomain.trim() ? colors.primary : colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => {
            if (!name.trim() || !subdomain.trim()) {
              Alert.alert("Required Fields", "Please fill in company name and subdomain.");
              return;
            }
            onCreate({ name, industry, plan, subdomain, status: "onboarding" });
            onClose();
          }}
        >
          <IconSymbol name="plus.circle.fill" size={16} color={name.trim() && subdomain.trim() ? "#fff" : colors.muted} />
          <Text style={[styles.createBtnText, { color: name.trim() && subdomain.trim() ? "#fff" : colors.muted }]}>
            Create Client
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [clients, setClients] = useState<ClientCompany[]>(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<ClientPlan | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

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
  const totalMRR = clients.reduce((sum, c) => sum + c.monthlyRevenue, 0);
  const totalTechs = clients.reduce((sum, c) => sum + c.technicianCount, 0);
  const totalActiveJobs = clients.reduce((sum, c) => sum + c.activeJobs, 0);
  const activeClients = clients.filter((c) => c.status === "active").length;

  const handleCreate = (data: Partial<ClientCompany>) => {
    const newClient: ClientCompany = {
      id: Date.now(),
      name: data.name ?? "New Client",
      industry: data.industry ?? "Other",
      plan: data.plan ?? "starter",
      status: "onboarding",
      technicianCount: 0,
      activeJobs: 0,
      monthlyRevenue: 0,
      createdAt: new Date().toISOString().split("T")[0],
      primaryColor: "#3B82F6",
      subdomain: data.subdomain ?? "new-client",
    };
    setClients((prev) => [newClient, ...prev]);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Client Created!", `${newClient.name} has been provisioned at ${newClient.subdomain}.nvc360.com`);
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
              ${totalMRR.toLocaleString()}
            </Text>
            <Text style={styles.platformStatLabel}>Total MRR</Text>
          </View>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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
          {(["all", "starter", "pro", "enterprise"] as const).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    planFilter === p
                      ? p === "all"
                        ? colors.primary
                        : PLAN_COLORS[p as ClientPlan]
                      : colors.surface,
                  borderColor:
                    planFilter === p
                      ? p === "all"
                        ? colors.primary
                        : PLAN_COLORS[p as ClientPlan]
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
                {p === "all" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
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
            <Text style={[styles.clientsListCount, { color: colors.muted }]}>
              {filteredClients.length} of {clients.length}
            </Text>
          </View>

          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/super-admin/client/${client.id}` as any);
              }}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.quickActionsTitle, { color: colors.foreground }]}>Platform Tools</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { label: "Template Library", icon: "doc.text.fill" as const, color: "#3B82F6" },
              { label: "Pricing Engine", icon: "dollarsign.circle.fill" as const, color: "#22C55E" },
              { label: "Usage Analytics", icon: "chart.bar.fill" as const, color: "#8B5CF6" },
              { label: "API Keys", icon: "key.fill" as const, color: "#F59E0B" },
              { label: "Billing", icon: "creditcard.fill" as const, color: "#EF4444" },
              { label: "Support", icon: "questionmark.circle.fill" as const, color: "#6B7280" },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.quickAction,
                  { backgroundColor: action.color + "15", borderColor: action.color + "30", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {}}
              >
                <IconSymbol name={action.icon} size={20} color={action.color} />
                <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <CreateClientModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
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
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  addClientBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  addClientBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  platformStats: { paddingVertical: 12 },
  platformStatsContent: { paddingHorizontal: 16, gap: 4 },
  platformStat: { alignItems: "center", paddingHorizontal: 16 },
  platformStatVal: { fontSize: 22, fontWeight: "800", color: "#fff" },
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
  filterChipText: { fontSize: 13, fontWeight: "600" },
  clientsList: { paddingHorizontal: 16 },
  clientsListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  clientsListTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
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
  clientAvatarText: { fontSize: 16, fontWeight: "800" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: "700" },
  clientIndustry: { fontSize: 12, marginTop: 1 },
  clientBadges: { gap: 4, alignItems: "flex-end" },
  planBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planText: { fontSize: 9, fontWeight: "800" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 9, fontWeight: "700", textTransform: "capitalize" },
  clientStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  clientStat: { flex: 1, alignItems: "center", gap: 2 },
  clientStatVal: { fontSize: 15, fontWeight: "800" },
  clientStatLabel: { fontSize: 9, fontWeight: "600" },
  clientStatDivider: { width: 1, height: 28 },
  clientChevron: { marginRight: 12 },
  quickActions: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  quickActionsTitle: { fontSize: 14, fontWeight: "700" },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  quickActionLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },
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
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "800" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 8 },
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
  industryText: { fontSize: 13, fontWeight: "600" },
  planRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  planOption: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  planOptionText: { fontSize: 13, fontWeight: "700" },
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
  createBtnText: { fontSize: 15, fontWeight: "800" },
});
