import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  Alert, Linking, Platform, ViewStyle, TextStyle, Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import {
  MOCK_TECHNICIANS, MOCK_TASKS, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, type Technician, type TaskStatus,
} from "@/lib/nvc-types";

// ─── Extended Technician Profile Types ───────────────────────────────────────

interface TechProfile {
  // Personal
  firstName: string; lastName: string;
  dateOfBirth: string; homeAddress: string;
  city: string; province: string; postalCode: string;
  emergencyContact: string; emergencyPhone: string;
  // Admin
  employeeId: string; hireDate: string; employmentType: string;
  department: string; hourlyRate: string; overtimeRate: string;
  // Tax & Billing
  sinNumber: string; taxExempt: boolean;
  bankName: string; bankTransit: string; bankAccount: string;
  // Skills & Competencies
  skills: string[]; certifications: string[];
  industries: string[]; departments: string[];
  // Safety & Medical
  safetyTraining: string[]; medicalNotes: string;
  firstAidExpiry: string; whmisExpiry: string;
  // Notes
  notes: string;
}

const BLANK_PROFILE: TechProfile = {
  firstName: "", lastName: "", dateOfBirth: "", homeAddress: "",
  city: "Winnipeg", province: "MB", postalCode: "", emergencyContact: "", emergencyPhone: "",
  employeeId: "", hireDate: "", employmentType: "Full-Time", department: "",
  hourlyRate: "", overtimeRate: "", sinNumber: "", taxExempt: false,
  bankName: "", bankTransit: "", bankAccount: "",
  skills: [], certifications: [], industries: [], departments: [],
  safetyTraining: [], medicalNotes: "", firstAidExpiry: "", whmisExpiry: "",
  notes: "",
};

const SKILL_OPTIONS = [
  "HVAC", "Plumbing", "Electrical", "Roofing", "Flooring", "Carpentry",
  "Welding", "Painting", "Glazing", "Concrete", "Landscaping", "Insulation",
  "Drywall", "Tile & Stone", "Cabinetry", "Framing", "Masonry", "Demolition",
];

const CERT_OPTIONS = [
  "Red Seal", "Journeyman", "Master Electrician", "Gas Fitter A", "Gas Fitter B",
  "HVAC Technician", "Plumber", "Roofer", "Crane Operator", "Forklift",
  "Fall Arrest", "Confined Space", "First Aid Level 1", "First Aid Level 2",
  "WHMIS 2015", "TDG", "CSTS-09", "OSSA", "NCSO",
];

const INDUSTRY_OPTIONS = [
  "Construction", "HVAC", "Plumbing", "Electrical", "Roofing", "Flooring",
  "Glass & Glazing", "Property Management", "Retail", "Logistics", "Healthcare",
  "Hospitality", "Manufacturing", "Industrial", "Commercial", "Residential",
];

const DEPT_OPTIONS = [
  "Field Operations", "Installation", "Maintenance", "Emergency Response",
  "Commercial", "Residential", "Industrial", "Management", "Apprentice",
];

const SAFETY_OPTIONS = [
  "Fall Arrest", "WHMIS 2015", "First Aid Level 1", "First Aid Level 2",
  "Confined Space Entry", "TDG", "CSTS-09", "OSSA", "Asbestos Awareness",
  "Silica Awareness", "Ladder Safety", "PPE Training", "Fire Safety",
];

const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Seasonal", "Apprentice"];

const STATUS_DOT: Record<string, string> = {
  online: "#22C55E", busy: "#F59E0B", offline: "#94A3B8", on_break: "#3B82F6",
};

// ─── Tab Types ────────────────────────────────────────────────────────────────

type TabId = "overview" | "personal" | "admin" | "skills" | "safety";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: "person.crop.circle.fill" },
  { id: "personal", label: "Personal", icon: "house.fill" },
  { id: "admin",    label: "Admin",    icon: "briefcase.fill" },
  { id: "skills",   label: "Skills",   icon: "wrench.fill" },
  { id: "safety",   label: "Safety",   icon: "shield.fill" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; secureTextEntry?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
          multiline && styles.fieldMultiline,
        ] as TextStyle[]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType ?? "default"}
        secureTextEntry={secureTextEntry}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false}
        returnKeyType={multiline ? "default" : "next"}
      />
    </View>
  );
}

function SectionCard({ title, icon, iconColor, children }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + "18" }] as ViewStyle[]}>
          <IconSymbol name={icon} size={15} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MultiSelectGrid({ options, selected, onToggle, color }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; color: string;
}) {
  return (
    <View style={styles.tagsGrid}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            style={[
              styles.tagChip,
              { backgroundColor: active ? color : color + "15", borderColor: color },
            ] as ViewStyle[]}
            onPress={() => onToggle(opt)}
          >
            {active && <IconSymbol name="checkmark" size={10} color="#fff" />}
            <Text style={[styles.tagChipText, { color: active ? "#fff" : color }] as TextStyle[]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const isNew = id === "new";

  const technician = useMemo(
    () => (isNew ? null : MOCK_TECHNICIANS.find((t) => t.id === Number(id))),
    [id, isNew]
  );

  const techTasks = useMemo(
    () => MOCK_TASKS.filter((t) => t.technicianId === Number(id)),
    [id]
  );

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<TechProfile>(BLANK_PROFILE);
  const [editMode, setEditMode] = useState(isNew);

  const update = (key: keyof TechProfile, value: any) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: keyof TechProfile, value: string) => {
    const arr = profile[key] as string[];
    update(key, arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  if (!isNew && !technician) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.muted }}>Technician not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const dotColor = technician ? (STATUS_DOT[technician.status] ?? "#94A3B8") : "#22C55E";
  const displayName = isNew
    ? "New Technician"
    : technician!.name;

  const handleCall = () => {
    if (!technician) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${technician.phone}`);
  };

  const handleSave = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      isNew ? "Technician Created" : "Profile Saved",
      isNew ? "New technician has been added to your team." : `${displayName}'s profile has been updated.`,
      [{ text: "OK", onPress: () => { if (isNew) router.back(); else setEditMode(false); } }]
    );
  };

  const handleDelete = () => {
    Alert.alert("Delete Technician", `Permanently remove ${displayName} from your team?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          router.back();
        },
      },
    ]);
  };

  // ── Overview Tab ──
  const renderOverview = () => (
    <>
      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: NVC_BLUE }] as ViewStyle[]}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroInitials}>
            {technician ? technician.name.split(" ").map((n) => n[0]).join("") : "NT"}
          </Text>
          <View style={[styles.heroDot, { backgroundColor: dotColor }] as ViewStyle[]} />
        </View>
        <Text style={styles.heroName}>{displayName}</Text>
        <Text style={styles.heroRole}>{technician?.skills?.[0] ?? "Field Technician"}</Text>
        <Text style={styles.heroAddress}>{technician?.activeTaskAddress ?? "Winnipeg, MB"}</Text>
        <View style={styles.heroActions}>
          <Pressable
            style={({ pressed }) => [styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.2)", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={handleCall}
          >
            <IconSymbol name="phone.fill" size={16} color="#fff" />
            <Text style={styles.heroBtnText}>Call</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.2)", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={() => Linking.openURL(`sms:${technician?.phone ?? ""}`)}
          >
            <IconSymbol name="message.fill" size={16} color="#fff" />
            <Text style={styles.heroBtnText}>SMS</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.heroBtn, { backgroundColor: NVC_ORANGE, opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            onPress={() => setEditMode(true)}
          >
            <IconSymbol name="pencil" size={16} color="#fff" />
            <Text style={styles.heroBtnText}>Edit</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Jobs Today", value: techTasks.filter((t) => t.status !== "completed").length.toString(), color: NVC_BLUE },
          { label: "Completed", value: techTasks.filter((t) => t.status === "completed").length.toString(), color: "#16A34A" },
          { label: "Total Jobs", value: technician?.todayJobs?.toString() ?? "—", color: "#F59E0B" },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }] as ViewStyle[]}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Active Jobs */}
      {techTasks.length > 0 && (
        <SectionCard title="Current Jobs" icon="doc.text.fill" iconColor={NVC_BLUE}>
          {techTasks.slice(0, 3).map((task) => (
            <Pressable
              key={task.id}
              style={({ pressed }) => [
                styles.jobRow,
                { borderBottomColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ] as ViewStyle[]}
              onPress={() => router.push(`/task/${task.id}` as any)}
            >
              <View style={[styles.jobPriorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }] as ViewStyle[]} />
              <View style={styles.jobInfo}>
                <Text style={[styles.jobTitle, { color: colors.foreground }] as TextStyle[]} numberOfLines={1}>
                  {task.customerName}
                </Text>
                <Text style={[styles.jobAddress, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
                  {task.jobAddress}
                </Text>
              </View>
              <View style={[styles.jobStatus, { backgroundColor: STATUS_COLORS[task.status] + "20" }] as ViewStyle[]}>
                <Text style={[styles.jobStatusText, { color: STATUS_COLORS[task.status] }] as TextStyle[]}>
                  {STATUS_LABELS[task.status]}
                </Text>
              </View>
            </Pressable>
          ))}
        </SectionCard>
      )}

      {/* Quick Info */}
      <SectionCard title="Quick Info" icon="info.circle.fill" iconColor="#8B5CF6">
        {[
          { label: "Phone", value: technician?.phone ?? "—", icon: "phone.fill", color: "#16A34A" },
          { label: "Email", value: technician?.email ?? "—", icon: "envelope.fill", color: "#3B82F6" },
          { label: "Transport", value: technician?.transportType ?? "—", icon: "car.fill", color: NVC_ORANGE },
          { label: "Status", value: technician?.status ?? "—", icon: "circle.fill", color: dotColor },
        ].map((item) => (
          <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }] as ViewStyle[]}>
            <View style={[styles.infoIcon, { backgroundColor: item.color + "18" }] as ViewStyle[]}>
              <IconSymbol name={item.icon as any} size={14} color={item.color} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.muted }] as TextStyle[]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }] as TextStyle[]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  );

  // ── Personal Tab ──
  const renderPersonal = () => (
    <>
      <SectionCard title="Personal Information" icon="person.fill" iconColor="#3B82F6">
        <View style={styles.nameRow}>
          <View style={styles.nameField}><FormField label="First Name" value={profile.firstName} onChangeText={(v) => update("firstName", v)} /></View>
          <View style={styles.nameField}><FormField label="Last Name" value={profile.lastName} onChangeText={(v) => update("lastName", v)} /></View>
        </View>
        <FormField label="Date of Birth" value={profile.dateOfBirth} onChangeText={(v) => update("dateOfBirth", v)} placeholder="YYYY-MM-DD" />
        <FormField label="Home Address" value={profile.homeAddress} onChangeText={(v) => update("homeAddress", v)} />
        <View style={styles.nameRow}>
          <View style={styles.nameField}><FormField label="City" value={profile.city} onChangeText={(v) => update("city", v)} /></View>
          <View style={styles.nameField}><FormField label="Province" value={profile.province} onChangeText={(v) => update("province", v)} /></View>
        </View>
        <FormField label="Postal Code" value={profile.postalCode} onChangeText={(v) => update("postalCode", v)} />
      </SectionCard>
      <SectionCard title="Emergency Contact" icon="phone.badge.plus" iconColor="#EF4444">
        <FormField label="Contact Name" value={profile.emergencyContact} onChangeText={(v) => update("emergencyContact", v)} />
        <FormField label="Contact Phone" value={profile.emergencyPhone} onChangeText={(v) => update("emergencyPhone", v)} keyboardType="phone-pad" />
      </SectionCard>
    </>
  );

  // ── Admin Tab ──
  const renderAdmin = () => (
    <>
      <SectionCard title="Employment Details" icon="briefcase.fill" iconColor={NVC_BLUE}>
        <FormField label="Employee ID" value={profile.employeeId} onChangeText={(v) => update("employeeId", v)} />
        <FormField label="Hire Date" value={profile.hireDate} onChangeText={(v) => update("hireDate", v)} placeholder="YYYY-MM-DD" />
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>Employment Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EMPLOYMENT_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.chip,
                  { backgroundColor: profile.employmentType === t ? NVC_BLUE : NVC_BLUE + "12", borderColor: NVC_BLUE },
                ] as ViewStyle[]}
                onPress={() => update("employmentType", t)}
              >
                <Text style={[styles.chipText, { color: profile.employmentType === t ? "#fff" : NVC_BLUE }] as TextStyle[]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <FormField label="Hourly Rate ($)" value={profile.hourlyRate} onChangeText={(v) => update("hourlyRate", v)} keyboardType="decimal-pad" />
          </View>
          <View style={styles.nameField}>
            <FormField label="Overtime Rate ($)" value={profile.overtimeRate} onChangeText={(v) => update("overtimeRate", v)} keyboardType="decimal-pad" />
          </View>
        </View>
      </SectionCard>
      <SectionCard title="Tax Information" icon="dollarsign.circle.fill" iconColor="#16A34A">
        <FormField label="SIN / Tax ID" value={profile.sinNumber} onChangeText={(v) => update("sinNumber", v)} secureTextEntry placeholder="•••-•••-•••" />
        <View style={[styles.switchRow, { borderColor: colors.border }] as ViewStyle[]}>
          <Text style={[styles.switchLabel, { color: colors.foreground }] as TextStyle[]}>Tax Exempt</Text>
          <Switch
            value={profile.taxExempt}
            onValueChange={(v) => update("taxExempt", v)}
            trackColor={{ false: colors.border, true: "#16A34A" }}
            thumbColor="#fff"
          />
        </View>
      </SectionCard>
      <SectionCard title="Banking / Direct Deposit" icon="creditcard.fill" iconColor="#8B5CF6">
        <FormField label="Bank Name" value={profile.bankName} onChangeText={(v) => update("bankName", v)} />
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <FormField label="Transit #" value={profile.bankTransit} onChangeText={(v) => update("bankTransit", v)} keyboardType="number-pad" />
          </View>
          <View style={styles.nameField}>
            <FormField label="Account #" value={profile.bankAccount} onChangeText={(v) => update("bankAccount", v)} keyboardType="number-pad" secureTextEntry />
          </View>
        </View>
      </SectionCard>
    </>
  );

  // ── Skills Tab ──
  const renderSkills = () => (
    <>
      <SectionCard title="Core Skills" icon="wrench.fill" iconColor={NVC_ORANGE}>
        <MultiSelectGrid options={SKILL_OPTIONS} selected={profile.skills} onToggle={(v) => toggleArray("skills", v)} color={NVC_ORANGE} />
      </SectionCard>
      <SectionCard title="Certifications & Licences" icon="rosette" iconColor="#F59E0B">
        <MultiSelectGrid options={CERT_OPTIONS} selected={profile.certifications} onToggle={(v) => toggleArray("certifications", v)} color="#F59E0B" />
      </SectionCard>
      <SectionCard title="Industries" icon="building.2.fill" iconColor="#3B82F6">
        <MultiSelectGrid options={INDUSTRY_OPTIONS} selected={profile.industries} onToggle={(v) => toggleArray("industries", v)} color="#3B82F6" />
      </SectionCard>
      <SectionCard title="Departments" icon="person.3.fill" iconColor="#8B5CF6">
        <MultiSelectGrid options={DEPT_OPTIONS} selected={profile.departments} onToggle={(v) => toggleArray("departments", v)} color="#8B5CF6" />
      </SectionCard>
      <SectionCard title="Notes" icon="note.text" iconColor="#6B7280">
        <FormField label="Internal Notes" value={profile.notes} onChangeText={(v) => update("notes", v)} multiline placeholder="Add notes about this technician..." />
      </SectionCard>
    </>
  );

  // ── Safety Tab ──
  const renderSafety = () => (
    <>
      <SectionCard title="Safety Training" icon="shield.fill" iconColor="#EF4444">
        <MultiSelectGrid options={SAFETY_OPTIONS} selected={profile.safetyTraining} onToggle={(v) => toggleArray("safetyTraining", v)} color="#EF4444" />
      </SectionCard>
      <SectionCard title="Certification Expiry" icon="calendar.badge.clock" iconColor="#F59E0B">
        <FormField label="First Aid Expiry" value={profile.firstAidExpiry} onChangeText={(v) => update("firstAidExpiry", v)} placeholder="YYYY-MM-DD" />
        <FormField label="WHMIS Expiry" value={profile.whmisExpiry} onChangeText={(v) => update("whmisExpiry", v)} placeholder="YYYY-MM-DD" />
      </SectionCard>
      <SectionCard title="Medical Notes" icon="stethoscope" iconColor="#16A34A">
        <FormField label="Medical / Accommodation Notes" value={profile.medicalNotes} onChangeText={(v) => update("medicalNotes", v)} multiline placeholder="Allergies, restrictions, accommodations..." />
      </SectionCard>
    </>
  );

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title={displayName}
        subtitle={isNew ? "New Technician" : (technician?.skills?.[0] ?? "Field Technician")}
        showBack
        rightElement={
          !isNew ? (
            <View style={styles.headerActions}>
              {!editMode && (
                <Pressable
                  style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                  onPress={() => setEditMode(true)}
                >
                  <IconSymbol name="pencil" size={15} color="#fff" />
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.deleteHeaderBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                onPress={handleDelete}
              >
                <IconSymbol name="trash.fill" size={15} color="#EF4444" />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      {/* ── Tab Bar ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.tabBarWrap, { backgroundColor: NVC_BLUE }] as ViewStyle[]}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive] as ViewStyle[]}
              onPress={() => setActiveTab(tab.id)}
            >
              <IconSymbol name={tab.icon} size={14} color={isActive ? NVC_BLUE : "rgba(255,255,255,0.7)"} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive] as TextStyle[]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "personal" && renderPersonal()}
        {activeTab === "admin" && renderAdmin()}
        {activeTab === "skills" && renderSkills()}
        {activeTab === "safety" && renderSafety()}

        {/* ── Save Button (edit/create tabs) ── */}
        {(editMode || isNew) && activeTab !== "overview" && (
          <View style={styles.saveWrap}>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.88 : 1 }] as ViewStyle[]}
              onPress={handleSave}
            >
              <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{isNew ? "Create Technician" : "Save Changes"}</Text>
            </Pressable>
            {!isNew && (
              <Pressable
                style={({ pressed }) => [styles.deleteFullBtn, { opacity: pressed ? 0.88 : 1 }] as ViewStyle[]}
                onPress={handleDelete}
              >
                <IconSymbol name="trash.fill" size={15} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Remove from Team</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 60 },

  // Header
  headerActions: { flexDirection: "row", gap: 6 },
  editBtn: { padding: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8 },
  deleteHeaderBtn: { padding: 6 },

  // Tab Bar
  tabBarWrap: { maxHeight: 52 },
  tabBar: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  tabTextActive: { color: NVC_BLUE },

  // Hero Card
  heroCard: {
    marginHorizontal: 14, marginTop: 14, borderRadius: 18, padding: 20, alignItems: "center",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 6,
  },
  heroAvatar: { position: "relative", marginBottom: 10 },
  heroInitials: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.22)",
    fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center", lineHeight: 72,
  },
  heroDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: NVC_BLUE,
  },
  heroName: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 2 },
  heroRole: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 2 },
  heroAddress: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 14 },
  heroActions: { flexDirection: "row", gap: 10 },
  heroBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  heroBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 3,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500" },

  // Section Card
  sectionCard: {
    marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 14,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 13, fontWeight: "700" },

  // Job Row
  jobRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, gap: 10 },
  jobPriorityDot: { width: 8, height: 8, borderRadius: 4 },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 13, fontWeight: "600" },
  jobAddress: { fontSize: 11, marginTop: 1 },
  jobStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  jobStatusText: { fontSize: 10, fontWeight: "700" },

  // Info Row
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, gap: 10 },
  infoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: "600", marginBottom: 1 },
  infoValue: { fontSize: 13, fontWeight: "500" },

  // Form
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 6, letterSpacing: 0.3 },
  fieldInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 42,
  },
  fieldMultiline: { minHeight: 90, textAlignVertical: "top" },
  nameRow: { flexDirection: "row", gap: 10 },
  nameField: { flex: 1 },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderTopWidth: 0.5,
  },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  tagChipText: { fontSize: 11, fontWeight: "600" },

  // Save
  saveWrap: { marginHorizontal: 14, marginTop: 20, gap: 10 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14,
    shadowColor: NVC_BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  deleteFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "#EF4444",
    backgroundColor: "#EF444410",
  },
  deleteBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
});
