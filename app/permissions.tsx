import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTenant } from "@/hooks/use-tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleTier = "nvc360_platform" | "client_company";

interface Permission {
  id: string;
  label: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  tier: RoleTier;
  color: string;
  icon: any;
  description: string;
  permissions: Record<string, boolean>;
  isSystem: boolean; // system roles cannot be deleted
}

// ─── Permission Definitions ───────────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  // Platform (NVC360 only)
  { id: "platform.manage_clients", label: "Manage All Clients", description: "Create, edit, suspend, and delete client companies", category: "Platform" },
  { id: "platform.view_all_data", label: "View All Client Data", description: "Access any client's tasks, employees, and records", category: "Platform" },
  { id: "platform.billing", label: "Platform Billing", description: "Manage subscription plans and billing for all clients", category: "Platform" },
  { id: "platform.system_config", label: "System Configuration", description: "Configure platform-wide settings, integrations, and infrastructure", category: "Platform" },
  { id: "platform.template_library", label: "Global Template Library", description: "Create and publish templates available to all clients", category: "Platform" },
  // Company
  { id: "company.manage_employees", label: "Manage Employees", description: "Add, edit, and remove employees from the company", category: "Company" },
  { id: "company.manage_roles", label: "Manage Roles & Permissions", description: "Create and edit roles, assign permissions", category: "Company" },
  { id: "company.branding", label: "Company Branding", description: "Edit company logo, colors, and white-label settings", category: "Company" },
  { id: "company.billing", label: "Company Billing", description: "View and manage the company's subscription and invoices", category: "Company" },
  { id: "company.integrations", label: "Integrations", description: "Connect and configure third-party integrations", category: "Company" },
  { id: "company.export_data", label: "Export Data", description: "Export tasks, customer records, and reports", category: "Company" },
  { id: "company.notification_settings", label: "Notification Settings", description: "Configure SMS and email notification milestones", category: "Company" },
  // Tasks & Work Orders
  { id: "tasks.create", label: "Create Work Orders", description: "Create new tasks and work orders", category: "Tasks" },
  { id: "tasks.assign", label: "Assign Technicians", description: "Assign and reassign technicians to tasks", category: "Tasks" },
  { id: "tasks.view_all", label: "View All Tasks", description: "See all tasks across the company (not just own)", category: "Tasks" },
  { id: "tasks.edit", label: "Edit Tasks", description: "Modify task details, addresses, and custom fields", category: "Tasks" },
  { id: "tasks.delete", label: "Delete Tasks", description: "Permanently delete tasks and records", category: "Tasks" },
  { id: "tasks.view_pricing", label: "View Pricing", description: "See pricing, rates, and billing information on tasks", category: "Tasks" },
  { id: "tasks.approve_completion", label: "Approve Completions", description: "Review and approve technician task completions", category: "Tasks" },
  // Field
  { id: "field.execute_tasks", label: "Execute Work Orders", description: "Complete checklists, capture photos, signatures, and payments", category: "Field" },
  { id: "field.clock_in_out", label: "Clock In / Clock Out", description: "Geo-clock in and out of job sites", category: "Field" },
  { id: "field.add_field_notes", label: "Add Field Notes", description: "Log notes and follow-up items on job records", category: "Field" },
  { id: "field.capture_payment", label: "Capture Payments", description: "Process payments and capture signatures in the field", category: "Field" },
  // Customers
  { id: "customers.view", label: "View Customer Records", description: "Access the customer database", category: "Customers" },
  { id: "customers.create", label: "Add Customers", description: "Add new customer records", category: "Customers" },
  { id: "customers.edit", label: "Edit Customers", description: "Modify customer contact and billing info", category: "Customers" },
  { id: "customers.delete", label: "Delete Customers", description: "Remove customer records from the database", category: "Customers" },
  // Reports
  { id: "reports.view", label: "View Reports", description: "Access analytics and performance reports", category: "Reports" },
  { id: "reports.export", label: "Export Reports", description: "Download reports as CSV or PDF", category: "Reports" },
  { id: "reports.financial", label: "Financial Reports", description: "View revenue, invoicing, and payment reports", category: "Reports" },
  // Messaging
  { id: "messaging.send", label: "Send Messages", description: "Send in-app messages to technicians", category: "Messaging" },
  { id: "messaging.view_all", label: "View All Conversations", description: "See all message threads (not just own)", category: "Messaging" },
];

// ─── Default Roles ────────────────────────────────────────────────────────────

const buildPermissions = (ids: string[]): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  for (const p of ALL_PERMISSIONS) {
    result[p.id] = ids.includes(p.id);
  }
  return result;
};

const DEFAULT_ROLES: Role[] = [
  // NVC360 Platform Roles
  {
    id: "nvc_super_admin",
    name: "NVC360 Super Admin",
    tier: "nvc360_platform",
    color: "#E85D04",
    icon: "shield.fill" as const,
    description: "Full control over the entire NVC360 platform, all clients, billing, and system configuration.",
    isSystem: true,
    permissions: buildPermissions(ALL_PERMISSIONS.map((p) => p.id)), // all permissions
  },
  {
    id: "nvc_project_manager",
    name: "NVC360 Project Manager",
    tier: "nvc360_platform",
    color: "#8B5CF6",
    icon: "person.crop.circle.badge.checkmark" as const,
    description: "Manages assigned client accounts, their databases, records, and user setup.",
    isSystem: true,
    permissions: buildPermissions([
      "platform.manage_clients", "platform.view_all_data", "platform.template_library",
      "company.manage_employees", "company.branding", "company.notification_settings",
      "tasks.view_all", "tasks.create", "tasks.assign", "tasks.edit",
      "customers.view", "customers.create", "customers.edit",
      "reports.view", "reports.export",
      "messaging.send", "messaging.view_all",
    ]),
  },
  {
    id: "nvc_support",
    name: "NVC360 Support",
    tier: "nvc360_platform",
    color: "#3B82F6",
    icon: "questionmark.circle.fill" as const,
    description: "Read-only access to client data for support and troubleshooting purposes.",
    isSystem: true,
    permissions: buildPermissions([
      "platform.view_all_data",
      "tasks.view_all", "customers.view",
      "reports.view", "messaging.view_all",
    ]),
  },
  // Client Company Roles
  {
    id: "company_admin",
    name: "Company Admin",
    tier: "client_company",
    color: "#22C55E",
    icon: "building.2.fill" as const,
    description: "Full control over the company: employees, tasks, customers, billing, branding, and integrations.",
    isSystem: true,
    permissions: buildPermissions([
      "company.manage_employees", "company.manage_roles", "company.branding",
      "company.billing", "company.integrations", "company.export_data", "company.notification_settings",
      "tasks.create", "tasks.assign", "tasks.view_all", "tasks.edit", "tasks.delete",
      "tasks.view_pricing", "tasks.approve_completion",
      "field.execute_tasks", "field.clock_in_out", "field.add_field_notes", "field.capture_payment",
      "customers.view", "customers.create", "customers.edit", "customers.delete",
      "reports.view", "reports.export", "reports.financial",
      "messaging.send", "messaging.view_all",
    ]),
  },
  {
    id: "divisional_manager",
    name: "Divisional Manager",
    tier: "client_company",
    color: "#06B6D4",
    icon: "person.2.fill" as const,
    description: "Manages their division's jobs, employees, and performance. Cannot access billing or company-wide settings.",
    isSystem: true,
    permissions: buildPermissions([
      "company.manage_employees", "company.notification_settings",
      "tasks.create", "tasks.assign", "tasks.view_all", "tasks.edit", "tasks.view_pricing", "tasks.approve_completion",
      "field.execute_tasks", "field.clock_in_out", "field.add_field_notes",
      "customers.view", "customers.create", "customers.edit",
      "reports.view", "reports.export",
      "messaging.send", "messaging.view_all",
    ]),
  },
  {
    id: "dispatcher",
    name: "Dispatcher",
    tier: "client_company",
    color: "#F59E0B",
    icon: "map.fill" as const,
    description: "Creates and assigns work orders, monitors the live fleet, and communicates with technicians.",
    isSystem: true,
    permissions: buildPermissions([
      "tasks.create", "tasks.assign", "tasks.view_all", "tasks.edit",
      "customers.view", "customers.create", "customers.edit",
      "reports.view",
      "messaging.send", "messaging.view_all",
    ]),
  },
  {
    id: "field_technician",
    name: "Field Technician",
    tier: "client_company",
    color: "#6366F1",
    icon: "wrench.fill" as const,
    description: "Sees and executes their own assigned tasks. Cannot view other technicians' jobs or financial data.",
    isSystem: true,
    permissions: buildPermissions([
      "tasks.view_all", // filtered to own tasks in UI
      "field.execute_tasks", "field.clock_in_out", "field.add_field_notes", "field.capture_payment",
      "customers.view",
      "messaging.send",
    ]),
  },
  {
    id: "office_staff",
    name: "Office Staff",
    tier: "client_company",
    color: "#6B7280",
    icon: "person.fill" as const,
    description: "View-only access to tasks and reports. Cannot execute field work or access financial data.",
    isSystem: true,
    permissions: buildPermissions([
      "tasks.view_all",
      "customers.view",
      "reports.view",
      "messaging.send",
    ]),
  },
];

const PERMISSION_CATEGORIES = ["Platform", "Company", "Tasks", "Field", "Customers", "Reports", "Messaging"];

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  onEdit,
  onSelect,
  selected,
}: {
  role: Role;
  onEdit: (role: Role) => void;
  onSelect: (role: Role) => void;
  selected: boolean;
}) {
  const colors = useColors();
  const enabledCount = Object.values(role.permissions).filter(Boolean).length;
  const totalCount = ALL_PERMISSIONS.length;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.roleCard,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? role.color : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => onSelect(role)}
    >
      <View style={[styles.roleIconWrap, { backgroundColor: role.color + "15" }]}>
        <IconSymbol name={role.icon} size={22} color={role.color} />
      </View>
      <View style={styles.roleInfo}>
        <View style={styles.roleNameRow}>
          <Text style={[styles.roleName, { color: colors.foreground }]}>{role.name}</Text>
          {role.isSystem && (
            <View style={[styles.systemBadge, { backgroundColor: colors.muted + "20" }]}>
              <Text style={[styles.systemBadgeText, { color: colors.muted }]}>System</Text>
            </View>
          )}
        </View>
        <Text style={[styles.roleDesc, { color: colors.muted }]} numberOfLines={2}>
          {role.description}
        </Text>
        <View style={styles.roleStats}>
          <View style={[styles.permBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.permBarFill,
                { backgroundColor: role.color, width: `${(enabledCount / totalCount) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={[styles.permCount, { color: colors.muted }]}>
            {enabledCount}/{totalCount} permissions
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: role.color + "15", opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => onEdit(role)}
      >
        <IconSymbol name="pencil" size={14} color={role.color} />
      </Pressable>
    </Pressable>
  );
}

// ─── Permission Editor Modal ──────────────────────────────────────────────────

function PermissionEditor({
  role,
  onClose,
  onSave,
}: {
  role: Role;
  onClose: () => void;
  onSave: (role: Role) => void;
}) {
  const colors = useColors();
  const [permissions, setPermissions] = useState({ ...role.permissions });
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filteredPerms = ALL_PERMISSIONS.filter(
    (p) => categoryFilter === "All" || p.category === categoryFilter,
  );

  const togglePermission = (id: string) => {
    if (role.isSystem && role.id === "nvc_super_admin") {
      Alert.alert("Locked", "The NVC360 Super Admin role cannot be modified.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPermissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={[styles.editorOverlay, { backgroundColor: colors.background }]}>
      {/* Editor Header */}
      <View style={[styles.editorHeader, { backgroundColor: role.color }]}>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4 }]}
          onPress={onClose}
        >
          <IconSymbol name="xmark" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.editorTitle}>{role.name}</Text>
          <Text style={styles.editorSub}>
            {Object.values(permissions).filter(Boolean).length} permissions enabled
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.editorSaveBtn,
            { backgroundColor: "rgba(255,255,255,0.25)", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => {
            onSave({ ...role, permissions });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Saved", `${role.name} permissions updated.`);
            onClose();
          }}
        >
          <Text style={styles.editorSaveBtnText}>Save</Text>
        </Pressable>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.editorCategoryScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}
      >
        {["All", ...PERMISSION_CATEGORIES].map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.editorCategoryChip,
              { backgroundColor: categoryFilter === cat ? role.color + "20" : "transparent" },
            ]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text style={[styles.editorCategoryText, { color: categoryFilter === cat ? role.color : colors.muted }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Permission List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
        {filteredPerms.map((perm) => (
          <Pressable
            key={perm.id}
            style={({ pressed }) => [
              styles.permRow,
              {
                backgroundColor: permissions[perm.id] ? role.color + "10" : colors.surface,
                borderColor: permissions[perm.id] ? role.color + "40" : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => togglePermission(perm.id)}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.permLabel, { color: colors.foreground }]}>{perm.label}</Text>
              <Text style={[styles.permDesc, { color: colors.muted }]}>{perm.description}</Text>
              <View style={[styles.permCategoryBadge, { backgroundColor: colors.border + "80" }]}>
                <Text style={[styles.permCategoryText, { color: colors.muted }]}>{perm.category}</Text>
              </View>
            </View>
            <Switch
              value={permissions[perm.id] ?? false}
              onValueChange={() => togglePermission(perm.id)}
              trackColor={{ false: colors.border, true: role.color }}
              thumbColor="#fff"
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ROLES_STORAGE_KEY = "nvc360_role_permissions";

export default function PermissionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tenantId } = useTenant();
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [tierFilter, setTierFilter] = useState<"all" | RoleTier>("all");

  // Load persisted role permissions from AsyncStorage on mount
  React.useEffect(() => {
    if (!tenantId) return;
    AsyncStorage.getItem(`${ROLES_STORAGE_KEY}_${tenantId}`).then((raw) => {
      if (raw) {
        try {
          const saved: Role[] = JSON.parse(raw);
          // Merge saved permissions into DEFAULT_ROLES so system roles stay current
          setRoles((prev) => {
            const savedMap = new Map(saved.map((r) => [r.id, r]));
            const merged = prev.map((r) => savedMap.has(r.id) ? { ...r, permissions: savedMap.get(r.id)!.permissions } : r);
            // Add any custom (non-system) roles from storage
            const customRoles = saved.filter((r) => !r.isSystem && !prev.find((p) => p.id === r.id));
            return [...merged, ...customRoles];
          });
        } catch {}
      }
    });
  }, [tenantId]);

  const persistRoles = (updated: Role[]) => {
    if (tenantId) AsyncStorage.setItem(`${ROLES_STORAGE_KEY}_${tenantId}`, JSON.stringify(updated));
  };

  const filteredRoles = roles.filter(
    (r) => tierFilter === "all" || r.tier === tierFilter,
  );

  const nvcRoles = filteredRoles.filter((r) => r.tier === "nvc360_platform");
  const clientRoles = filteredRoles.filter((r) => r.tier === "client_company");

  const handleSaveRole = (updated: Role) => {
    setRoles((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      persistRoles(next);
      return next;
    });
  };

  // ── Create Role Modal ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleTier, setNewRoleTier] = useState<RoleTier>("client_company");
  const ROLE_COLORS = ["#1E6FBF", "#16A34A", "#DC2626", "#7C3AED", "#F59E0B", "#EC4899"];
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      Alert.alert("Required", "Please enter a role name.");
      return;
    }
    const newRole: Role = {
      id: `custom_${Date.now()}`,
      name: newRoleName.trim(),
      tier: newRoleTier,
      color: newRoleColor,
      icon: "person.fill",
      description: newRoleDesc.trim() || `Custom role: ${newRoleName.trim()}`,
      permissions: buildPermissions([]),
      isSystem: false,
    };
    setRoles((prev) => {
      const next = [...prev, newRole];
      persistRoles(next);
      return next;
    });
    setNewRoleName("");
    setNewRoleDesc("");
    setCreateModalVisible(false);
    setEditingRole(newRole);
  };

  if (editingRole) {
    return (
      <PermissionEditor
        role={editingRole}
        onClose={() => setEditingRole(null)}
        onSave={handleSaveRole}
      />
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader
        title="Roles & Permissions"
        subtitle={`${roles.length} roles · ${ALL_PERMISSIONS.length} permissions`}
        rightElement={
          <Pressable
            onPress={() => setCreateModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
          </Pressable>
        }
      />

      {/* Tier Filter */}
      <View style={[styles.tierFilter, { borderBottomColor: colors.border }]}>
        {([["all", "All Roles"], ["nvc360_platform", "NVC360 Platform"], ["client_company", "Client Company"]] as const).map(([val, label]) => (
          <Pressable
            key={val}
            style={[
              styles.tierChip,
              { borderBottomColor: tierFilter === val ? colors.primary : "transparent" },
            ]}
            onPress={() => setTierFilter(val)}
          >
            <Text style={[styles.tierChipText, { color: tierFilter === val ? colors.primary : colors.muted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
          <Text style={[styles.infoBannerText, { color: colors.muted }]}>
            Tap any role to view its permissions. Tap the edit icon to customize what each role can access. System roles can be customized but not deleted.
          </Text>
        </View>

        {/* NVC360 Platform Roles */}
        {(tierFilter === "all" || tierFilter === "nvc360_platform") && nvcRoles.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#E85D04" }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>NVC360 Platform Roles</Text>
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{nvcRoles.length} roles</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.muted }]}>
              These roles are for NVC360 employees managing the platform and client accounts. They operate above any individual client company.
            </Text>
            {nvcRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole?.id === role.id}
                onSelect={setSelectedRole}
                onEdit={setEditingRole}
              />
            ))}
          </>
        )}

        {/* Client Company Roles */}
        {(tierFilter === "all" || tierFilter === "client_company") && clientRoles.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: tierFilter === "all" ? 16 : 0 }]}>
              <View style={[styles.sectionDot, { backgroundColor: "#22C55E" }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Client Company Roles</Text>
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{clientRoles.length} roles</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.muted }]}>
              These roles are assigned to employees within each client company. Each client can customize permissions for their own roles.
            </Text>
            {clientRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole?.id === role.id}
                onSelect={setSelectedRole}
                onEdit={setEditingRole}
              />
            ))}
          </>
        )}

        {/* Selected Role Detail */}
        {selectedRole && (
          <View style={[styles.roleDetail, { backgroundColor: selectedRole.color + "10", borderColor: selectedRole.color + "30" }]}>
            <Text style={[styles.roleDetailTitle, { color: selectedRole.color }]}>
              {selectedRole.name} — Permission Summary
            </Text>
            {PERMISSION_CATEGORIES.map((cat) => {
              const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat);
              const enabled = catPerms.filter((p) => selectedRole.permissions[p.id]).length;
              if (enabled === 0) return null;
              return (
                <View key={cat} style={styles.roleDetailRow}>
                  <Text style={[styles.roleDetailCat, { color: colors.foreground }]}>{cat}</Text>
                  <Text style={[styles.roleDetailCount, { color: selectedRole.color }]}>
                    {enabled}/{catPerms.length}
                  </Text>
                  <View style={[styles.roleDetailBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.roleDetailBarFill,
                        { backgroundColor: selectedRole.color, width: `${(enabled / catPerms.length) * 100}%` as any },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
            <Pressable
              style={({ pressed }) => [
                styles.editFullBtn,
                { backgroundColor: selectedRole.color, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setEditingRole(selectedRole)}
            >
              <IconSymbol name="pencil" size={14} color="#fff" />
              <Text style={styles.editFullBtnText}>Edit Permissions</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
      <BottomNavBar />

      {/* ── Create Role Modal ── */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setCreateModalVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.createModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.createModalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.createModalTitle, { color: colors.foreground }]}>Create Custom Role</Text>
            <Text style={[styles.createModalSub, { color: colors.muted }]}>Define a new role and then set its permissions in the editor.</Text>

            <Text style={[styles.createLabel, { color: colors.muted }]}>ROLE NAME</Text>
            <TextInput
              value={newRoleName}
              onChangeText={setNewRoleName}
              placeholder="e.g. Senior Technician"
              placeholderTextColor={colors.muted + "80"}
              style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              returnKeyType="next"
              autoFocus
            />

            <Text style={[styles.createLabel, { color: colors.muted }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              value={newRoleDesc}
              onChangeText={setNewRoleDesc}
              placeholder="What does this role do?"
              placeholderTextColor={colors.muted + "80"}
              style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              returnKeyType="done"
            />

            <Text style={[styles.createLabel, { color: colors.muted }]}>TIER</Text>
            <View style={styles.createTierRow}>
              {(["client_company", "nvc360_platform"] as RoleTier[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewRoleTier(t)}
                  style={[styles.createTierChip, { backgroundColor: newRoleTier === t ? NVC_BLUE : colors.background, borderColor: newRoleTier === t ? NVC_BLUE : colors.border }]}
                >
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: newRoleTier === t ? "#fff" : colors.foreground }}>
                    {t === "client_company" ? "Client Company" : "NVC360 Platform"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.createLabel, { color: colors.muted }]}>COLOUR</Text>
            <View style={styles.createColorRow}>
              {ROLE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewRoleColor(c)}
                  style={[styles.createColorSwatch, { backgroundColor: c, borderWidth: newRoleColor === c ? 3 : 0, borderColor: "#fff" }]}
                />
              ))}
            </View>

            <Pressable
              onPress={handleCreateRole}
              style={({ pressed }) => [styles.createBtn, { backgroundColor: newRoleColor, opacity: pressed ? 0.85 : 1 }]}
            >
              <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Create Role &amp; Set Permissions</Text>
            </Pressable>
            <Pressable onPress={() => setCreateModalVisible(false)} style={styles.createCancelBtn}>
              <Text style={[styles.createCancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const NVC_BLUE = "#1E6FBF";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  addRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addRoleBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  tierFilter: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tierChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tierChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBannerText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { fontSize: 12 },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  roleCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  roleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleInfo: { flex: 1, gap: 6 },
  roleNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleName: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  systemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  systemBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  roleDesc: { fontSize: 12, lineHeight: 17 },
  roleStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  permBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  permBarFill: { height: "100%", borderRadius: 2 },
  permCount: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleDetail: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  roleDetailTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  roleDetailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleDetailCat: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 80 },
  roleDetailCount: { fontSize: 12, fontFamily: "Inter_700Bold", width: 30, textAlign: "right" },
  roleDetailBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  roleDetailBarFill: { height: "100%", borderRadius: 3 },
  editFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  editFullBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  // Editor
  editorOverlay: { flex: 1 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  editorTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  editorSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  editorSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editorSaveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  editorCategoryScroll: { borderBottomWidth: 1, paddingVertical: 4 },
  editorCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  editorCategoryText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  permLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  permDesc: { fontSize: 12, lineHeight: 16 },
  permCategoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  permCategoryText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  // Create Role Modal
  createModal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 6,
  },
  createModalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  createModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  createModalSub: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  createLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 8 },
  createInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 15, marginTop: 4,
  },
  createTierRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  createTierChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  createColorRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  createColorSwatch: { width: 32, height: 32, borderRadius: 16 },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 12,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  createCancelBtn: { alignItems: "center", paddingVertical: 12 },
  createCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
