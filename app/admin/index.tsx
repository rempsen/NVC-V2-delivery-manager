/**
 * NVC Super Admin Dashboard
 *
 * Accessible only to users with role: super_admin | nvc_manager
 * Provides full cross-tenant visibility: all merchants, users, tasks, and platform stats.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = "overview" | "merchants" | "users" | "tasks";

type Merchant = {
  id: number;
  companyName: string;
  slug: string;
  plan: string;
  isActive: boolean;
  suspended: boolean;
  agentCount: number;
  taskCount: number;
  completedTaskCount: number;
  [key: string]: unknown;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    starter: "#6B7280",
    professional: "#3B82F6",
    enterprise: "#8B5CF6",
  };
  return (
    <View style={[styles.badge, { backgroundColor: colors[plan] ?? "#6B7280" }]}>
      <Text style={styles.badgeText}>{plan.toUpperCase()}</Text>
    </View>
  );
}

function StatusDot({ active, suspended }: { active: boolean; suspended: boolean }) {
  const color = suspended ? "#EF4444" : active ? "#22C55E" : "#9CA3AF";
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = trpc.admin.getPlatformStats.useQuery();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={styles.loadingText}>Loading platform stats…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total Merchants" value={stats?.totalMerchants ?? 0} color="#0a7ea4" />
        <StatCard label="Active Merchants" value={stats?.activeMerchants ?? 0} color="#22C55E" />
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} color="#8B5CF6" />
        <StatCard label="Total Tasks" value={stats?.totalTasks ?? 0} color="#F59E0B" />
        <StatCard label="Completed Tasks" value={stats?.completedTasks ?? 0} color="#3B82F6" />
        <StatCard
          label="Completion Rate"
          value={
            stats && stats.totalTasks > 0
              ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`
              : "—"
          }
          color="#10B981"
        />
      </View>
    </ScrollView>
  );
}

// ─── Merchants Tab ────────────────────────────────────────────────────────────

function MerchantsTab() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.admin.listMerchants.useQuery({
    page,
    limit: 20,
    search: search.length > 1 ? search : undefined,
    plan: selectedPlan as any,
    status: selectedStatus as any,
  });

  const suspendMutation = trpc.admin.suspendMerchant.useMutation({
    onSuccess: () => refetch(),
  });

  const reactivateMutation = trpc.admin.reactivateMerchant.useMutation({
    onSuccess: () => refetch(),
  });

  const impersonateMutation = trpc.admin.impersonateMerchant.useMutation({
    onSuccess: (result) => {
      Alert.alert(
        "Impersonation Active",
        `You are now viewing ${result.companyName} as an admin. Token expires in 1 hour.`,
        [{ text: "OK" }],
      );
    },
  });

  const handleSuspend = (merchant: Merchant) => {
    Alert.alert(
      "Suspend Merchant",
      `Are you sure you want to suspend "${merchant.companyName}"? All their users will lose access immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            setActionLoading(merchant.id);
            await suspendMutation.mutateAsync({ tenantId: merchant.id });
            setActionLoading(null);
          },
        },
      ],
    );
  };

  const handleReactivate = async (merchant: Merchant) => {
    setActionLoading(merchant.id);
    await reactivateMutation.mutateAsync({ tenantId: merchant.id });
    setActionLoading(null);
  };

  const handleImpersonate = async (merchant: Merchant) => {
    setActionLoading(merchant.id);
    await impersonateMutation.mutateAsync({ tenantId: merchant.id });
    setActionLoading(null);
  };

  const plans = ["starter", "professional", "enterprise"];
  const statuses = ["active", "suspended", "inactive"];

  return (
    <View style={styles.tabContent}>
      {/* Search + Filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search merchants…"
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          returnKeyType="search"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {plans.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, selectedPlan === p && styles.chipActive]}
            onPress={() => { setSelectedPlan(selectedPlan === p ? undefined : p); setPage(1); }}
          >
            <Text style={[styles.chipText, selectedPlan === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, selectedStatus === s && styles.chipActive]}
            onPress={() => { setSelectedStatus(selectedStatus === s ? undefined : s); setPage(1); }}
          >
            <Text style={[styles.chipText, selectedStatus === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        <ScrollView>
          {(data?.merchants ?? []).map((merchant) => (
            <View key={merchant.id} style={styles.merchantCard}>
              <View style={styles.merchantHeader}>
                <View style={styles.merchantTitleRow}>
                  <StatusDot active={merchant.isActive} suspended={merchant.suspended} />
                  <Text style={styles.merchantName}>{merchant.companyName}</Text>
                  <PlanBadge plan={merchant.plan} />
                </View>
                <Text style={styles.merchantSlug}>/{merchant.slug}</Text>
              </View>

              <View style={styles.merchantStats}>
                <Text style={styles.merchantStat}>👥 {merchant.agentCount} agents</Text>
                <Text style={styles.merchantStat}>📋 {merchant.taskCount} tasks</Text>
                <Text style={styles.merchantStat}>✅ {merchant.completedTaskCount} done</Text>
              </View>

              {actionLoading === merchant.id ? (
                <ActivityIndicator size="small" color="#0a7ea4" style={{ marginTop: 8 }} />
              ) : (
                <View style={styles.merchantActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() => handleImpersonate(merchant)}
                  >
                    <Text style={styles.actionBtnTextPrimary}>View as Merchant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() => router.push(`/admin/merchant/${merchant.id}` as any)}
                  >
                    <Text style={styles.actionBtnTextSecondary}>Edit Settings</Text>
                  </TouchableOpacity>
                  {merchant.suspended ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSuccess]}
                      onPress={() => handleReactivate(merchant)}
                    >
                      <Text style={styles.actionBtnTextSuccess}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => handleSuspend(merchant)}
                    >
                      <Text style={styles.actionBtnTextDanger}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Text style={styles.pageBtnText}>← Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {page} of {data?.totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, page === data?.totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => p + 1)}
                disabled={page === data?.totalPages}
              >
                <Text style={styles.pageBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Create Merchant Tab ──────────────────────────────────────────────────────

function CreateMerchantTab() {
  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    industry: "other" as const,
    plan: "starter" as const,
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.admin.createMerchant.useMutation({
    onSuccess: (result) => {
      setSuccess(`Merchant "${result.companyName}" created successfully (ID: ${result.tenantId})`);
      setForm({ companyName: "", slug: "", industry: "other", plan: "starter", ownerName: "", ownerEmail: "", ownerPassword: "" });
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const industries = ["hvac", "construction", "delivery", "home_repair", "it_repair", "telecom", "home_fitness", "elder_care", "electrical", "plumbing", "flooring", "other"];
  const plans = ["starter", "professional", "enterprise"];

  const handleCreate = () => {
    if (!form.companyName || !form.slug || !form.ownerName || !form.ownerEmail || !form.ownerPassword) {
      setError("All fields are required.");
      return;
    }
    createMutation.mutate(form as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Create New Merchant</Text>

      {success && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>Company Name *</Text>
      <TextInput
        style={styles.input}
        value={form.companyName}
        onChangeText={(t) => setForm((f) => ({ ...f, companyName: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }))}
        placeholder="Acme Field Services"
      />

      <Text style={styles.fieldLabel}>URL Slug * (lowercase, hyphens only)</Text>
      <TextInput
        style={styles.input}
        value={form.slug}
        onChangeText={(t) => setForm((f) => ({ ...f, slug: t.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
        placeholder="acme-field-services"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Industry</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {industries.map((ind) => (
          <TouchableOpacity
            key={ind}
            style={[styles.chip, form.industry === ind && styles.chipActive]}
            onPress={() => setForm((f) => ({ ...f, industry: ind as any }))}
          >
            <Text style={[styles.chipText, form.industry === ind && styles.chipTextActive]}>{ind}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.fieldLabel}>Plan</Text>
      <View style={styles.filterChips}>
        {plans.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, form.plan === p && styles.chipActive]}
            onPress={() => setForm((f) => ({ ...f, plan: p as any }))}
          >
            <Text style={[styles.chipText, form.plan === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Merchant Manager Account</Text>

      <Text style={styles.fieldLabel}>Manager Name *</Text>
      <TextInput
        style={styles.input}
        value={form.ownerName}
        onChangeText={(t) => setForm((f) => ({ ...f, ownerName: t }))}
        placeholder="Jane Smith"
      />

      <Text style={styles.fieldLabel}>Manager Email *</Text>
      <TextInput
        style={styles.input}
        value={form.ownerEmail}
        onChangeText={(t) => setForm((f) => ({ ...f, ownerEmail: t }))}
        placeholder="jane@acme.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Temporary Password *</Text>
      <TextInput
        style={styles.input}
        value={form.ownerPassword}
        onChangeText={(t) => setForm((f) => ({ ...f, ownerPassword: t }))}
        placeholder="Min 8 characters"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.createBtn, createMutation.isPending && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.createBtnText}>Create Merchant Account</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NVCAdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const colors = useColors();

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "merchants", label: "Merchants" },
    { id: "users", label: "Users" },
    { id: "tasks", label: "All Tasks" },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>NVC360 Admin</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Super Admin Console</Text>
        </View>
        <View style={styles.nvcBadge}>
          <Text style={styles.nvcBadgeText}>NVC</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive, { color: activeTab === tab.id ? "#0a7ea4" : colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.flex1}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "merchants" && <MerchantsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "tasks" && <TasksTab />}
      </View>
    </ScreenContainer>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.admin.listAllUsers.useQuery({
    page,
    limit: 30,
    search: search.length > 1 ? search : undefined,
  });

  return (
    <View style={styles.tabContent}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search users by name or email…"
        value={search}
        onChangeText={(t) => { setSearch(t); setPage(1); }}
        returnKeyType="search"
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        <ScrollView>
          {(data?.users ?? []).map((user) => (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: roleColor(user.role) }]}>
                  <Text style={styles.roleBadgeText}>{user.role}</Text>
                </View>
                <Text style={styles.tenantId}>Tenant #{user.tenantId}</Text>
              </View>
            </View>
          ))}
          {(data?.totalPages ?? 0) > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <Text style={styles.pageBtnText}>← Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page} of {data?.totalPages}</Text>
              <TouchableOpacity style={[styles.pageBtn, page === data?.totalPages && styles.pageBtnDisabled]} onPress={() => setPage((p) => p + 1)} disabled={page === data?.totalPages}>
                <Text style={styles.pageBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const { data, isLoading } = trpc.admin.listAllTasks.useQuery({
    page,
    limit: 30,
    status: status as any,
  });

  const statuses = ["unassigned", "assigned", "en_route", "on_site", "completed", "failed", "cancelled"];

  return (
    <View style={styles.tabContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, status === s && styles.chipActive]}
            onPress={() => { setStatus(status === s ? undefined : s); setPage(1); }}
          >
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        <ScrollView>
          {(data?.tasks ?? []).map((task: any) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskCustomer}>{task.customerName}</Text>
                <Text style={styles.taskAddress} numberOfLines={1}>{task.jobAddress}</Text>
              </View>
              <View style={styles.taskMeta}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(task.status) }]}>
                  <Text style={styles.statusBadgeText}>{task.status}</Text>
                </View>
                <Text style={styles.tenantId}>Tenant #{task.tenantId}</Text>
              </View>
            </View>
          ))}
          {(data?.totalPages ?? 0) > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <Text style={styles.pageBtnText}>← Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page} of {data?.totalPages}</Text>
              <TouchableOpacity style={[styles.pageBtn, page === data?.totalPages && styles.pageBtnDisabled]} onPress={() => setPage((p) => p + 1)} disabled={page === data?.totalPages}>
                <Text style={styles.pageBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleColor(role: string): string {
  const map: Record<string, string> = {
    manager: "#8B5CF6",
    dispatcher: "#3B82F6",
    technician: "#10B981",
    admin: "#EF4444",
  };
  return map[role] ?? "#6B7280";
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    unassigned: "#6B7280",
    assigned: "#3B82F6",
    en_route: "#F59E0B",
    on_site: "#8B5CF6",
    completed: "#22C55E",
    failed: "#EF4444",
    cancelled: "#9CA3AF",
  };
  return map[status] ?? "#6B7280";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  nvcBadge: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nvcBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0a7ea4",
  },
  tabText: { fontSize: 13, fontWeight: "500" },
  tabTextActive: { fontWeight: "700" },
  tabContent: { padding: 16, flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { marginTop: 12, color: "#687076", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, color: "#11181C" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: "#11181C" },
  statLabel: { fontSize: 12, color: "#687076", marginTop: 4 },
  filterRow: { marginBottom: 8 },
  searchInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChips: { flexDirection: "row", marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  chipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  merchantCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  merchantHeader: { marginBottom: 8 },
  merchantTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  merchantName: { fontSize: 16, fontWeight: "700", color: "#11181C", flex: 1 },
  merchantSlug: { fontSize: 12, color: "#687076" },
  merchantStats: { flexDirection: "row", gap: 16, marginBottom: 12 },
  merchantStat: { fontSize: 13, color: "#374151" },
  merchantActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  actionBtnSecondary: { backgroundColor: "#fff", borderColor: "#D1D5DB" },
  actionBtnDanger: { backgroundColor: "#fff", borderColor: "#EF4444" },
  actionBtnSuccess: { backgroundColor: "#fff", borderColor: "#22C55E" },
  actionBtnTextPrimary: { color: "#fff", fontSize: 12, fontWeight: "600" },
  actionBtnTextSecondary: { color: "#374151", fontSize: 12, fontWeight: "600" },
  actionBtnTextDanger: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  actionBtnTextSuccess: { color: "#22C55E", fontSize: 12, fontWeight: "600" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0a7ea4",
  },
  pageBtnDisabled: { backgroundColor: "#D1D5DB" },
  pageBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  pageInfo: { color: "#687076", fontSize: 13 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  userEmail: { fontSize: 13, color: "#687076", marginTop: 2 },
  userMeta: { alignItems: "flex-end", gap: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tenantId: { fontSize: 11, color: "#9CA3AF" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskInfo: { flex: 1, paddingRight: 12 },
  taskCustomer: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  taskAddress: { fontSize: 13, color: "#687076", marginTop: 2 },
  taskMeta: { alignItems: "flex-end", gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#11181C",
  },
  createBtn: {
    backgroundColor: "#0a7ea4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  successBanner: {
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  successText: { color: "#166534", fontSize: 14 },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#991B1B", fontSize: 14 },
});
