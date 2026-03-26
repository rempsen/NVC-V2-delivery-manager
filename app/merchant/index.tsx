/**
 * Merchant Manager Dashboard
 *
 * Accessible to users with role: manager (within their own tenant)
 * Scoped to the merchant's own data — cannot see other tenants.
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
  Alert,
  Switch,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type MerchantTab = "team" | "customers" | "settings";

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ tenantId }: { tenantId: number }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    phone: "",
    role: "technician" as "technician" | "dispatcher" | "manager",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: agents, isLoading, refetch } = trpc.technicians.list.useQuery({ tenantId });

  const createMutation = trpc.technicians.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
      setNewAgent({ name: "", email: "", phone: "", role: "technician", password: "" });
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const roles: Array<"technician" | "dispatcher" | "manager"> = ["technician", "dispatcher", "manager"];

  const roleColors: Record<string, string> = {
    technician: "#10B981",
    dispatcher: "#3B82F6",
    manager: "#8B5CF6",
  };

  const handleCreate = () => {
    if (!newAgent.name || !newAgent.email || !newAgent.password) {
      setFormError("Name, email, and password are required.");
      return;
    }
    createMutation.mutate({ tenantId, ...newAgent } as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddForm((v) => !v)}
        >
          <Text style={styles.addBtnText}>{showAddForm ? "Cancel" : "+ Add Member"}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Team Member</Text>
          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput style={styles.input} value={newAgent.name} onChangeText={(t) => setNewAgent((f) => ({ ...f, name: t }))} placeholder="Alex Johnson" />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput style={styles.input} value={newAgent.email} onChangeText={(t) => setNewAgent((f) => ({ ...f, email: t }))} placeholder="alex@company.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput style={styles.input} value={newAgent.phone} onChangeText={(t) => setNewAgent((f) => ({ ...f, phone: t }))} placeholder="+1 204 555 0100" keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, newAgent.role === r && { backgroundColor: roleColors[r], borderColor: roleColors[r] }]}
                onPress={() => setNewAgent((f) => ({ ...f, role: r }))}
              >
                <Text style={[styles.roleChipText, newAgent.role === r && styles.roleChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Temporary Password *</Text>
          <TextInput style={styles.input} value={newAgent.password} onChangeText={(t) => setNewAgent((f) => ({ ...f, password: t }))} placeholder="Min 8 characters" secureTextEntry />

          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Add Team Member</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        (agents ?? []).map((agent: any) => (
          <View key={agent.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{(agent.name ?? "?")[0].toUpperCase()}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{agent.name}</Text>
              <Text style={styles.memberEmail}>{agent.email}</Text>
              {agent.phone && <Text style={styles.memberPhone}>{agent.phone}</Text>}
            </View>
            <View style={[styles.rolePill, { backgroundColor: roleColors[agent.role] ?? "#6B7280" }]}>
              <Text style={styles.rolePillText}>{agent.role}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab({ tenantId }: { tenantId: number }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: customers, isLoading, refetch } = trpc.customers.list.useQuery({ tenantId });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "" });
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const filtered = (customers ?? []).filter((c: any) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm((v) => !v)}>
          <Text style={styles.addBtnText}>{showAddForm ? "Cancel" : "+ Add Customer"}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Customer</Text>
          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput style={styles.input} value={newCustomer.name} onChangeText={(t) => setNewCustomer((f) => ({ ...f, name: t }))} placeholder="Jane Doe" />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput style={styles.input} value={newCustomer.email} onChangeText={(t) => setNewCustomer((f) => ({ ...f, email: t }))} placeholder="jane@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Phone *</Text>
          <TextInput style={styles.input} value={newCustomer.phone} onChangeText={(t) => setNewCustomer((f) => ({ ...f, phone: t }))} placeholder="+1 204 555 0100" keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput style={styles.input} value={newCustomer.address} onChangeText={(t) => setNewCustomer((f) => ({ ...f, address: t }))} placeholder="123 Main St, Winnipeg, MB" />

          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
            onPress={() => {
              if (!newCustomer.name || !newCustomer.phone) { setFormError("Name and phone are required."); return; }
              createMutation.mutate({ tenantId, ...newCustomer } as any);
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Add Customer</Text>}
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={[styles.input, { marginBottom: 12 }]}
        placeholder="Search customers…"
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        filtered.map((customer: any) => (
          <View key={customer.id} style={styles.customerCard}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{(customer.name ?? "?")[0].toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              {customer.email && <Text style={styles.customerEmail}>{customer.email}</Text>}
              <Text style={styles.customerPhone}>{customer.phone}</Text>
              {customer.address && <Text style={styles.customerAddress} numberOfLines={1}>{customer.address}</Text>}
            </View>
            <View style={styles.customerTaskCount}>
              <Text style={styles.customerTaskCountNum}>{customer.taskCount ?? 0}</Text>
              <Text style={styles.customerTaskCountLabel}>jobs</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ tenantId }: { tenantId: number }) {
  const [autoAllocation, setAutoAllocation] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateMutation = trpc.admin.updateMerchantSettings.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ tenantId, autoAllocation });
  };

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        {
          label: "Auto-Allocation",
          description: "Automatically assign new tasks to the nearest available technician",
          control: (
            <Switch
              value={autoAllocation}
              onValueChange={setAutoAllocation}
              trackColor={{ false: "#D1D5DB", true: "#0a7ea4" }}
              thumbColor="#fff"
            />
          ),
        },
      ],
    },
    {
      title: "Notification Templates",
      items: [
        { label: "Pick-up & Delivery", description: "SMS/email template for delivery jobs", control: <Text style={styles.configureLink}>Configure →</Text> },
        { label: "Appointment", description: "SMS/email template for appointment bookings", control: <Text style={styles.configureLink}>Configure →</Text> },
        { label: "Field Workforce", description: "SMS/email template for field service jobs", control: <Text style={styles.configureLink}>Configure →</Text> },
      ],
    },
    {
      title: "Integrations",
      items: [
        { label: "QuickBooks", description: "Sync invoices and customers", control: <Text style={styles.configureLink}>Connect →</Text> },
        { label: "Google Calendar", description: "Sync scheduled jobs to calendar", control: <Text style={styles.configureLink}>Connect →</Text> },
        { label: "CompanyCam", description: "Attach job photos to projects", control: <Text style={styles.configureLink}>Connect →</Text> },
      ],
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {saved && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Settings saved successfully.</Text>
        </View>
      )}

      {settingsSections.map((section) => (
        <View key={section.title} style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>{section.title}</Text>
          {section.items.map((item, i) => (
            <View key={item.label} style={[styles.settingsRow, i < section.items.length - 1 && styles.settingsRowBorder]}>
              <View style={styles.settingsRowInfo}>
                <Text style={styles.settingsRowLabel}>{item.label}</Text>
                <Text style={styles.settingsRowDesc}>{item.description}</Text>
              </View>
              {item.control}
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, updateMutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Save Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MerchantManagerScreen() {
  const [activeTab, setActiveTab] = useState<MerchantTab>("team");
  const colors = useColors();

  // In production, tenantId comes from the authenticated user's session
  // For now we use a placeholder that will be replaced by the auth context
  const tenantId = 1;

  const tabs: { id: MerchantTab; label: string; icon: string }[] = [
    { id: "team", label: "Team", icon: "👥" },
    { id: "customers", label: "Customers", icon: "🏠" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Merchant Manager</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Manage your team and customers</Text>
        </View>
        <View style={styles.merchantBadge}>
          <Text style={styles.merchantBadgeText}>MGR</Text>
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
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive, { color: activeTab === tab.id ? "#0a7ea4" : colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.flex1}>
        {activeTab === "team" && <TeamTab tenantId={tenantId} />}
        {activeTab === "customers" && <CustomersTab tenantId={tenantId} />}
        {activeTab === "settings" && <SettingsTab tenantId={tenantId} />}
      </View>
    </ScreenContainer>
  );
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
  merchantBadge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  merchantBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0a7ea4",
  },
  tabIcon: { fontSize: 16 },
  tabText: { fontSize: 12, fontWeight: "500" },
  tabTextActive: { fontWeight: "700" },
  tabContent: { padding: 16 },
  centered: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#11181C" },
  addBtn: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  formCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#11181C", marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#11181C",
  },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  roleChipText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  roleChipTextActive: { color: "#fff" },
  submitBtn: {
    backgroundColor: "#0a7ea4",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "700", color: "#11181C" },
  memberEmail: { fontSize: 13, color: "#687076", marginTop: 2 },
  memberPhone: { fontSize: 13, color: "#687076" },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "700", color: "#11181C" },
  customerEmail: { fontSize: 13, color: "#687076", marginTop: 2 },
  customerPhone: { fontSize: 13, color: "#687076" },
  customerAddress: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  customerTaskCount: { alignItems: "center" },
  customerTaskCountNum: { fontSize: 20, fontWeight: "800", color: "#0a7ea4" },
  customerTaskCountLabel: { fontSize: 11, color: "#9CA3AF" },
  settingsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    overflow: "hidden",
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#687076",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingsRowInfo: { flex: 1, paddingRight: 12 },
  settingsRowLabel: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  settingsRowDesc: { fontSize: 13, color: "#687076", marginTop: 2 },
  configureLink: { fontSize: 14, color: "#0a7ea4", fontWeight: "600" },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#991B1B", fontSize: 13 },
  successBanner: {
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  successText: { color: "#166534", fontSize: 14 },
});
