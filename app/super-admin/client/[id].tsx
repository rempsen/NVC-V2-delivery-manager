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
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeRole = "company_admin" | "divisional_manager" | "dispatcher" | "field_technician" | "office_staff";
type EmployeeStatus = "active" | "invited" | "inactive";
type CustomerStatus = "active" | "inactive" | "vip";

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  department: string;
  jobsCompleted: number;
  joinedAt: string;
  avatarColor: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  totalJobs: number;
  lastJobDate: string;
  notes: string;
  avatarColor: string;
}

// ─── Mock Data per Client ─────────────────────────────────────────────────────

const CLIENT_DATA: Record<string, { name: string; industry: string; primaryColor: string; subdomain: string; plan: string }> = {
  "1": { name: "Arctic HVAC Services", industry: "HVAC", primaryColor: "#3B82F6", subdomain: "arctic-hvac", plan: "enterprise" },
  "2": { name: "Prairie Electric Co.", industry: "Electrical", primaryColor: "#F59E0B", subdomain: "prairie-electric", plan: "pro" },
  "3": { name: "Swift Couriers", industry: "Delivery", primaryColor: "#22C55E", subdomain: "swift-couriers", plan: "pro" },
  "4": { name: "HomeGuard Security", industry: "Security", primaryColor: "#8B5CF6", subdomain: "homeguard", plan: "starter" },
  "5": { name: "ClearView IT Solutions", industry: "IT Repair", primaryColor: "#EF4444", subdomain: "clearview-it", plan: "pro" },
  "6": { name: "Comfort Home Care", industry: "Home Care", primaryColor: "#E85D04", subdomain: "comfort-homecare", plan: "enterprise" },
};

const MOCK_EMPLOYEES: Employee[] = [
  { id: 1, name: "Sarah Mitchell", email: "sarah@client.com", phone: "+1 (204) 555-0101", role: "company_admin", status: "active", department: "Management", jobsCompleted: 0, joinedAt: "2025-01-15", avatarColor: "#3B82F6" },
  { id: 2, name: "James Kowalski", email: "james@client.com", phone: "+1 (204) 555-0102", role: "dispatcher", status: "active", department: "Operations", jobsCompleted: 0, joinedAt: "2025-02-01", avatarColor: "#22C55E" },
  { id: 3, name: "Marcus Thompson", email: "marcus@client.com", phone: "+1 (204) 555-0103", role: "field_technician", status: "active", department: "Field", jobsCompleted: 142, joinedAt: "2025-01-20", avatarColor: "#F59E0B" },
  { id: 4, name: "Priya Patel", email: "priya@client.com", phone: "+1 (204) 555-0104", role: "field_technician", status: "active", department: "Field", jobsCompleted: 98, joinedAt: "2025-03-10", avatarColor: "#8B5CF6" },
  { id: 5, name: "Derek Olsen", email: "derek@client.com", phone: "+1 (204) 555-0105", role: "divisional_manager", status: "active", department: "North Division", jobsCompleted: 0, joinedAt: "2025-01-18", avatarColor: "#EF4444" },
  { id: 6, name: "Aisha Nwosu", email: "aisha@client.com", phone: "+1 (204) 555-0106", role: "office_staff", status: "invited", department: "Admin", jobsCompleted: 0, joinedAt: "2026-03-20", avatarColor: "#E85D04" },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 1, name: "Robert & Linda Chen", email: "rchen@email.com", phone: "+1 (204) 555-1001", address: "142 Maple Ave, Winnipeg MB R3T 2K8", status: "vip", totalJobs: 12, lastJobDate: "2026-03-20", notes: "Prefers morning appointments. Has a dog.", avatarColor: "#3B82F6" },
  { id: 2, name: "Sunrise Properties Ltd.", email: "mgmt@sunrise.ca", phone: "+1 (204) 555-1002", address: "800 Portage Ave, Winnipeg MB R3G 0N4", status: "active", totalJobs: 34, lastJobDate: "2026-03-18", notes: "Commercial account. Multiple units.", avatarColor: "#22C55E" },
  { id: 3, name: "Thomas Bergmann", email: "tberg@gmail.com", phone: "+1 (204) 555-1003", address: "55 Osborne St, Winnipeg MB R3L 1Y7", status: "active", totalJobs: 3, lastJobDate: "2026-02-14", notes: "", avatarColor: "#F59E0B" },
  { id: 4, name: "Westgate Mall", email: "facilities@westgate.ca", phone: "+1 (204) 555-1004", address: "1600 Regent Ave W, Winnipeg MB R2C 3B3", status: "active", totalJobs: 8, lastJobDate: "2026-03-10", notes: "After-hours access only. Contact security desk.", avatarColor: "#8B5CF6" },
  { id: 5, name: "Maria Santos", email: "msantos@hotmail.com", phone: "+1 (204) 555-1005", address: "22 River Rd, Winnipeg MB R2M 3Z3", status: "inactive", totalJobs: 1, lastJobDate: "2025-11-05", notes: "Moved — address may be outdated.", avatarColor: "#EF4444" },
];

const ROLE_LABELS: Record<EmployeeRole, string> = {
  company_admin: "Admin",
  divisional_manager: "Manager",
  dispatcher: "Dispatcher",
  field_technician: "Technician",
  office_staff: "Office Staff",
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  company_admin: "#8B5CF6",
  divisional_manager: "#3B82F6",
  dispatcher: "#F59E0B",
  field_technician: "#22C55E",
  office_staff: "#6B7280",
};

const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  active: "#22C55E",
  inactive: "#6B7280",
  vip: "#F59E0B",
};

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({
  visible,
  onClose,
  onAdd,
  clientColor,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (emp: Employee) => void;
  clientColor: string;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<EmployeeRole>("field_technician");
  const [department, setDepartment] = useState("");

  if (!visible) return null;

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Required Fields", "Please enter name and email.");
      return;
    }
    const newEmp: Employee = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      status: "invited",
      department: department.trim() || "General",
      jobsCompleted: 0,
      joinedAt: new Date().toISOString().split("T")[0],
      avatarColor: clientColor,
    };
    onAdd(newEmp);
    setName(""); setEmail(""); setPhone(""); setDepartment("");
    setRole("field_technician");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Employee</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Full Name *</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={name} onChangeText={setName} placeholder="e.g. Marcus Thompson" placeholderTextColor={colors.muted} returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email *</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={email} onChangeText={setEmail} placeholder="employee@company.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Phone</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={phone} onChangeText={setPhone} placeholder="+1 (204) 555-0000" placeholderTextColor={colors.muted} keyboardType="phone-pad" returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Department</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={department} onChangeText={setDepartment} placeholder="e.g. Field, Operations, Admin" placeholderTextColor={colors.muted} returnKeyType="done" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Role</Text>
          <View style={styles.roleGrid}>
            {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((r) => (
              <Pressable
                key={r}
                style={[styles.roleOption, { backgroundColor: role === r ? ROLE_COLORS[r] + "20" : colors.background, borderColor: role === r ? ROLE_COLORS[r] : colors.border }]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleOptionText, { color: role === r ? ROLE_COLORS[r] : colors.muted }]}>{ROLE_LABELS[r]}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.inviteNote, { backgroundColor: clientColor + "15", borderColor: clientColor + "30" }]}>
            <IconSymbol name="envelope.fill" size={14} color={clientColor} />
            <Text style={[styles.inviteNoteText, { color: clientColor }]}>
              An invitation email will be sent to {email || "the employee"} to set up their account.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: clientColor, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAdd}
          >
            <IconSymbol name="person.badge.plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Send Invitation</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────

function AddCustomerModal({
  visible,
  onClose,
  onAdd,
  clientColor,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (cust: Customer) => void;
  clientColor: string;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("active");

  if (!visible) return null;

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required Fields", "Please enter customer name and phone.");
      return;
    }
    const newCust: Customer = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      status,
      totalJobs: 0,
      lastJobDate: "—",
      notes: notes.trim(),
      avatarColor: clientColor,
    };
    onAdd(newCust);
    setName(""); setEmail(""); setPhone(""); setAddress(""); setNotes("");
    setStatus("active");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Customer</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Customer Name *</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={name} onChangeText={setName} placeholder="e.g. Robert Chen or Sunrise Properties" placeholderTextColor={colors.muted} returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Phone *</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={phone} onChangeText={setPhone} placeholder="+1 (204) 555-0000" placeholderTextColor={colors.muted} keyboardType="phone-pad" returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={email} onChangeText={setEmail} placeholder="customer@email.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Service Address</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={address} onChangeText={setAddress} placeholder="123 Main St, City, Province" placeholderTextColor={colors.muted} returnKeyType="next" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Status</Text>
          <View style={styles.statusRow}>
            {(["active", "vip", "inactive"] as CustomerStatus[]).map((s) => (
              <Pressable
                key={s}
                style={[styles.statusOption, { backgroundColor: status === s ? CUSTOMER_STATUS_COLORS[s] + "20" : colors.background, borderColor: status === s ? CUSTOMER_STATUS_COLORS[s] : colors.border, flex: 1 }]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusOptionText, { color: status === s ? CUSTOMER_STATUS_COLORS[s] : colors.muted }]}>
                  {s === "vip" ? "⭐ VIP" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Notes</Text>
          <TextInput style={[styles.fieldInput, styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={notes} onChangeText={setNotes} placeholder="Access instructions, preferences, special requirements..." placeholderTextColor={colors.muted} multiline numberOfLines={3} returnKeyType="done" />

          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: clientColor, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAdd}
          >
            <IconSymbol name="person.badge.plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Customer</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────

function EmployeeRow({ emp, clientColor, onPress }: { emp: Employee; clientColor: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: emp.avatarColor + "20" }]}>
        <Text style={[styles.avatarText, { color: emp.avatarColor }]}>
          {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowTopLine}>
          <Text style={[styles.rowName, { color: colors.foreground }]}>{emp.name}</Text>
          {emp.status === "invited" && (
            <View style={[styles.invitedBadge, { backgroundColor: "#F59E0B20" }]}>
              <Text style={[styles.invitedText, { color: "#F59E0B" }]}>Invited</Text>
            </View>
          )}
        </View>
        <Text style={[styles.rowSub, { color: colors.muted }]}>{emp.email}</Text>
        <View style={styles.rowBottomLine}>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[emp.role] + "15" }]}>
            <Text style={[styles.roleText, { color: ROLE_COLORS[emp.role] }]}>{ROLE_LABELS[emp.role]}</Text>
          </View>
          <Text style={[styles.rowDept, { color: colors.muted }]}>{emp.department}</Text>
          {emp.role === "field_technician" && (
            <Text style={[styles.rowJobs, { color: colors.muted }]}>{emp.jobsCompleted} jobs</Text>
          )}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
    </Pressable>
  );
}

// ─── Customer Row ─────────────────────────────────────────────────────────────

function CustomerRow({ cust, onPress }: { cust: Customer; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: cust.avatarColor + "20" }]}>
        <Text style={[styles.avatarText, { color: cust.avatarColor }]}>
          {cust.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowTopLine}>
          <Text style={[styles.rowName, { color: colors.foreground }]}>{cust.name}</Text>
          <View style={[styles.custStatusBadge, { backgroundColor: CUSTOMER_STATUS_COLORS[cust.status] + "20" }]}>
            <Text style={[styles.custStatusText, { color: CUSTOMER_STATUS_COLORS[cust.status] }]}>
              {cust.status === "vip" ? "⭐ VIP" : cust.status.charAt(0).toUpperCase() + cust.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.rowSub, { color: colors.muted }]}>{cust.phone}</Text>
        <View style={styles.rowBottomLine}>
          <Text style={[styles.rowAddress, { color: colors.muted }]} numberOfLines={1}>{cust.address || "No address on file"}</Text>
        </View>
        <View style={styles.rowBottomLine}>
          <Text style={[styles.rowJobs, { color: colors.muted }]}>{cust.totalJobs} jobs</Text>
          {cust.lastJobDate !== "—" && (
            <Text style={[styles.rowJobs, { color: colors.muted }]}>· Last: {cust.lastJobDate}</Text>
          )}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
    </Pressable>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ client, employees, customers }: { client: typeof CLIENT_DATA["1"]; employees: Employee[]; customers: Customer[] }) {
  const colors = useColors();
  const activeEmps = employees.filter((e) => e.status === "active").length;
  const vipCustomers = customers.filter((c) => c.status === "vip").length;
  const totalJobs = customers.reduce((sum, c) => sum + c.totalJobs, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {[
          { label: "Employees", value: employees.length, sub: `${activeEmps} active`, color: client.primaryColor },
          { label: "Customers", value: customers.length, sub: `${vipCustomers} VIP`, color: "#F59E0B" },
          { label: "Total Jobs", value: totalJobs, sub: "all time", color: "#22C55E" },
          { label: "Plan", value: client.plan.toUpperCase(), sub: "current tier", color: "#8B5CF6" },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.foreground }]}>{stat.label}</Text>
            <Text style={[styles.statSub, { color: colors.muted }]}>{stat.sub}</Text>
          </View>
        ))}
      </View>

      {/* Company Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Company Details</Text>
        {[
          { label: "Industry", value: client.industry },
          { label: "Subdomain", value: `${client.subdomain}.nvc360.com` },
          { label: "Plan", value: client.plan.charAt(0).toUpperCase() + client.plan.slice(1) },
          { label: "Status", value: "Active" },
        ].map((item) => (
          <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Recent Employees */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Recent Employees</Text>
        {employees.slice(0, 3).map((emp) => (
          <View key={emp.id} style={[styles.miniRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.miniAvatar, { backgroundColor: emp.avatarColor + "20" }]}>
              <Text style={[styles.miniAvatarText, { color: emp.avatarColor }]}>{emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniName, { color: colors.foreground }]}>{emp.name}</Text>
              <Text style={[styles.miniSub, { color: colors.muted }]}>{ROLE_LABELS[emp.role]}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[emp.role] + "15" }]}>
              <Text style={[styles.roleText, { color: ROLE_COLORS[emp.role] }]}>{ROLE_LABELS[emp.role]}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Customers */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Recent Customers</Text>
        {customers.slice(0, 3).map((cust) => (
          <View key={cust.id} style={[styles.miniRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.miniAvatar, { backgroundColor: cust.avatarColor + "20" }]}>
              <Text style={[styles.miniAvatarText, { color: cust.avatarColor }]}>{cust.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniName, { color: colors.foreground }]}>{cust.name}</Text>
              <Text style={[styles.miniSub, { color: colors.muted }]}>{cust.totalJobs} jobs · {cust.phone}</Text>
            </View>
            <View style={[styles.custStatusBadge, { backgroundColor: CUSTOMER_STATUS_COLORS[cust.status] + "20" }]}>
              <Text style={[styles.custStatusText, { color: CUSTOMER_STATUS_COLORS[cust.status] }]}>
                {cust.status === "vip" ? "⭐ VIP" : cust.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const client = CLIENT_DATA[id ?? "1"] ?? CLIENT_DATA["1"];
  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "customers" | "settings">("overview");
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [empRoleFilter, setEmpRoleFilter] = useState<EmployeeRole | "all">("all");

  const filteredEmployees = employees.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.email.toLowerCase().includes(empSearch.toLowerCase());
    const matchRole = empRoleFilter === "all" || e.role === empRoleFilter;
    return matchSearch && matchRole;
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.phone.includes(custSearch) ||
    c.email.toLowerCase().includes(custSearch.toLowerCase())
  );

  const TABS = [
    { key: "overview", label: "Overview", icon: "chart.bar.fill" as const },
    { key: "employees", label: "Employees", icon: "person.2.fill" as const },
    { key: "customers", label: "Customers", icon: "person.crop.circle.fill" as const },
    { key: "settings", label: "Settings", icon: "gearshape.fill" as const },
  ];

  return (
    <ScreenContainer containerClassName="flex-1" safeAreaClassName="flex-1">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: client.primaryColor }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={18} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.headerAvatarText}>{client.name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
            <Text style={styles.headerSub}>{client.industry} · {client.subdomain}.nvc360.com</Text>
          </View>
        </View>
        {activeTab === "employees" && (
          <Pressable
            style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowAddEmployee(true)}
          >
            <IconSymbol name="person.badge.plus" size={16} color="#fff" />
          </Pressable>
        )}
        {activeTab === "customers" && (
          <Pressable
            style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowAddCustomer(true)}
          >
            <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: client.primaryColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <IconSymbol name={tab.icon} size={14} color={activeTab === tab.key ? client.primaryColor : colors.muted} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? client.primaryColor : colors.muted }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab client={client} employees={employees} customers={customers} />
      )}

      {activeTab === "employees" && (
        <View style={{ flex: 1 }}>
          {/* Search + Filter */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, margin: 12, marginBottom: 6 }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={empSearch}
              onChangeText={setEmpSearch}
              placeholder="Search employees..."
              placeholderTextColor={colors.muted}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            {(["all", ...Object.keys(ROLE_LABELS)] as (EmployeeRole | "all")[]).map((r) => (
              <Pressable
                key={r}
                style={[styles.filterChip, {
                  backgroundColor: empRoleFilter === r ? client.primaryColor + "20" : colors.surface,
                  borderColor: empRoleFilter === r ? client.primaryColor : colors.border,
                }]}
                onPress={() => setEmpRoleFilter(r)}
              >
                <Text style={[styles.filterChipText, { color: empRoleFilter === r ? client.primaryColor : colors.muted }]}>
                  {r === "all" ? "All Roles" : ROLE_LABELS[r as EmployeeRole]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            <Text style={[styles.listCount, { color: colors.muted }]}>{filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}</Text>
          </View>
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <EmployeeRow
                emp={item}
                clientColor={client.primaryColor}
                onPress={() =>
                  Alert.alert(
                    item.name,
                    `Role: ${ROLE_LABELS[item.role]}\nDepartment: ${item.department}\nEmail: ${item.email}\nPhone: ${item.phone || "—"}\nStatus: ${item.status}\nJobs Completed: ${item.jobsCompleted}\nJoined: ${item.joinedAt}`,
                    [
                      { text: "Close", style: "cancel" },
                      { text: "Edit Role", onPress: () => Alert.alert("Edit Role", "Role editor coming in next release.") },
                      item.status === "invited"
                        ? { text: "Resend Invite", onPress: () => Alert.alert("Invitation Resent", `A new invitation email has been sent to ${item.email}.`) }
                        : { text: "Deactivate", style: "destructive", onPress: () => setEmployees((prev) => prev.map((e) => e.id === item.id ? { ...e, status: "inactive" as EmployeeStatus } : e)) },
                    ]
                  )
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol name="person.2.fill" size={36} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Employees Found</Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>Tap + to add your first employee</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === "customers" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, margin: 12, marginBottom: 6 }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={custSearch}
              onChangeText={setCustSearch}
              placeholder="Search customers..."
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            <Text style={[styles.listCount, { color: colors.muted }]}>{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}</Text>
          </View>
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <CustomerRow
                cust={item}
                onPress={() =>
                  Alert.alert(
                    item.name,
                    `Phone: ${item.phone}\nEmail: ${item.email || "—"}\nAddress: ${item.address || "—"}\nStatus: ${item.status.toUpperCase()}\nTotal Jobs: ${item.totalJobs}\nLast Job: ${item.lastJobDate}\n\nNotes: ${item.notes || "None"}`,
                    [
                      { text: "Close", style: "cancel" },
                      { text: "Create Work Order", onPress: () => router.push("/create-task" as any) },
                      { text: "Edit", onPress: () => Alert.alert("Edit Customer", "Full customer editor coming in next release.") },
                    ]
                  )
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol name="person.crop.circle.fill" size={36} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Customers Found</Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>Tap + to add your first customer</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === "settings" && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Branding</Text>
            {[
              { label: "Company Name", value: client.name },
              { label: "Primary Color", value: client.primaryColor },
              { label: "Subdomain", value: `${client.subdomain}.nvc360.com` },
            ].map((item) => (
              <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Plan & Billing</Text>
            {[
              { label: "Current Plan", value: client.plan.charAt(0).toUpperCase() + client.plan.slice(1) },
              { label: "Billing Cycle", value: "Monthly" },
              { label: "Next Invoice", value: "Apr 1, 2026" },
            ].map((item) => (
              <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          {[
            { label: "Notification Settings", icon: "bell.fill" as const, color: "#3B82F6" },
            { label: "Workflow Templates", icon: "doc.text.fill" as const, color: "#22C55E" },
            { label: "Pricing Rules", icon: "dollarsign.circle.fill" as const, color: "#F59E0B" },
            { label: "Integrations", icon: "link" as const, color: "#8B5CF6" },
            { label: "Suspend Client", icon: "pause.circle.fill" as const, color: "#EF4444" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.settingsRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => Alert.alert(action.label, `${action.label} configuration for ${client.name}.`)}
            >
              <View style={[styles.settingsIcon, { backgroundColor: action.color + "15" }]}>
                <IconSymbol name={action.icon} size={16} color={action.color} />
              </View>
              <Text style={[styles.settingsLabel, { color: action.color === "#EF4444" ? action.color : colors.foreground }]}>{action.label}</Text>
              <IconSymbol name="chevron.right" size={14} color={colors.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Modals */}
      <AddEmployeeModal
        visible={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onAdd={(emp) => { setEmployees((prev) => [emp, ...prev]); setShowAddEmployee(false); Alert.alert("Employee Added", `${emp.name} has been added and an invitation email has been sent.`); }}
        clientColor={client.primaryColor}
      />
      <AddCustomerModal
        visible={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onAdd={(cust) => { setCustomers((prev) => [cust, ...prev]); setShowAddCustomer(false); Alert.alert("Customer Added", `${cust.name} has been added to the customer database.`); }}
        clientColor={client.primaryColor}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 1 },
  headerActionBtn: { padding: 6 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 11, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  listCount: { fontSize: 12, fontWeight: "600" },
  listRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  rowInfo: { flex: 1, gap: 3 },
  rowTopLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { fontSize: 14, fontWeight: "700", flex: 1 },
  rowSub: { fontSize: 12 },
  rowBottomLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowDept: { fontSize: 11 },
  rowJobs: { fontSize: 11 },
  rowAddress: { fontSize: 11, flex: 1 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "700" },
  invitedBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  invitedText: { fontSize: 10, fontWeight: "700" },
  custStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  custStatusText: { fontSize: 10, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 3 },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 13, fontWeight: "700" },
  statSub: { fontSize: 11 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 0 },
  infoCardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1 },
  infoLabel: { flex: 1, fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "600" },
  miniRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  miniAvatarText: { fontSize: 11, fontWeight: "800" },
  miniName: { fontSize: 13, fontWeight: "600" },
  miniSub: { fontSize: 11 },
  settingsRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  // Modal
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end", zIndex: 100 },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "90%", gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "800" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 4 },
  notesInput: { minHeight: 80, textAlignVertical: "top" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  roleOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  roleOptionText: { fontSize: 13, fontWeight: "700" },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  statusOption: { borderWidth: 1.5, borderRadius: 10, padding: 10, alignItems: "center" },
  statusOptionText: { fontSize: 13, fontWeight: "700" },
  inviteNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  inviteNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, gap: 8, marginTop: 8, marginBottom: 8 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
