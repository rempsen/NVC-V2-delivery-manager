import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, Switch, Alert,
  ViewStyle, TextStyle,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";

// ─── Default Data ─────────────────────────────────────────────────────────────

const RULE_COLORS = ["#1E6FBF", "#DC2626", "#16A34A", "#7C3AED", "#F59E0B", "#EC4899", "#06B6D4"];

type BillingRule = {
  id: number;
  name: string;
  base: number;
  perHour: number;
  active: boolean;
  color: string;
  overtimeAfterHours?: number;
  overtimeMultiplier?: number;
};

const DEFAULT_RULES: BillingRule[] = [
  { id: 1, name: "Standard Service Call", base: 125, perHour: 85, active: true, color: "#1E6FBF", overtimeAfterHours: 8, overtimeMultiplier: 1.5 },
  { id: 2, name: "Emergency / After-Hours", base: 200, perHour: 145, active: true, color: "#DC2626", overtimeAfterHours: 4, overtimeMultiplier: 2.0 },
  { id: 3, name: "Preventive Maintenance", base: 95, perHour: 75, active: true, color: "#16A34A" },
  { id: 4, name: "Installation", base: 150, perHour: 95, active: false, color: "#7C3AED" },
  { id: 5, name: "Inspection", base: 80, perHour: 65, active: true, color: "#F59E0B" },
];

type PricingModel = { id: string; label: string; description: string; active: boolean };

const DEFAULT_MODELS: PricingModel[] = [
  { id: "flat", label: "Flat Rate", description: "Fixed price per job type regardless of time", active: true },
  { id: "hourly", label: "Hourly", description: "Base call-out fee + per-hour billing", active: true },
  { id: "per_km", label: "Per Kilometre", description: "Travel distance surcharge on top of job rate", active: false },
  { id: "tiered", label: "Tiered Pricing", description: "Volume discounts for repeat customers", active: false },
];

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: BillingRule;
  onToggle: (id: number, val: boolean) => void;
  onEdit: (rule: BillingRule) => void;
  onDelete: (id: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
      <View style={[styles.ruleAccent, { backgroundColor: rule.color }] as ViewStyle[]} />
      <View style={styles.ruleBody}>
        <View style={styles.ruleTop}>
          <Text style={[styles.ruleName, { color: colors.foreground }] as TextStyle[]}>{rule.name}</Text>
          <View style={styles.ruleTopRight}>
            <Pressable
              onPress={() => onEdit(rule)}
              style={({ pressed }) => [styles.ruleActionBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            >
              <IconSymbol name="pencil" size={12} color={NVC_BLUE} />
            </Pressable>
            <Pressable
              onPress={() => onDelete(rule.id)}
              style={({ pressed }) => [styles.ruleActionBtn, { backgroundColor: "#EF444415", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
            >
              <IconSymbol name="trash.fill" size={12} color="#EF4444" />
            </Pressable>
            <Switch
              value={rule.active}
              onValueChange={(v) => onToggle(rule.id, v)}
              trackColor={{ false: colors.border, true: rule.color }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
        <View style={styles.rulePricing}>
          <View style={styles.rulePriceChip}>
            <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>Base</Text>
            <Text style={[styles.rulePriceValue, { color: rule.color }] as TextStyle[]}>${rule.base}</Text>
          </View>
          <View style={[styles.ruleDivider, { backgroundColor: colors.border }] as ViewStyle[]} />
          <View style={styles.rulePriceChip}>
            <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>Per Hour</Text>
            <Text style={[styles.rulePriceValue, { color: rule.color }] as TextStyle[]}>${rule.perHour}</Text>
          </View>
          {rule.overtimeAfterHours && (
            <>
              <View style={[styles.ruleDivider, { backgroundColor: colors.border }] as ViewStyle[]} />
              <View style={styles.rulePriceChip}>
                <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>OT After</Text>
                <Text style={[styles.rulePriceValue, { color: rule.color }] as TextStyle[]}>{rule.overtimeAfterHours}h</Text>
              </View>
              <View style={[styles.ruleDivider, { backgroundColor: colors.border }] as ViewStyle[]} />
              <View style={styles.rulePriceChip}>
                <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>OT Rate</Text>
                <Text style={[styles.rulePriceValue, { color: rule.color }] as TextStyle[]}>×{rule.overtimeMultiplier}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Rule Edit Modal ──────────────────────────────────────────────────────────

function RuleEditModal({
  rule,
  visible,
  onClose,
  onSave,
}: {
  rule: BillingRule | null;
  visible: boolean;
  onClose: () => void;
  onSave: (r: BillingRule) => void;
}) {
  const colors = useColors();
  const isNew = rule === null || rule.id === -1;
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [perHour, setPerHour] = useState("");
  const [color, setColor] = useState(RULE_COLORS[0]);
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  const [overtimeAfter, setOvertimeAfter] = useState("8");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");

  React.useEffect(() => {
    if (rule && rule.id !== -1) {
      setName(rule.name);
      setBase(rule.base.toString());
      setPerHour(rule.perHour.toString());
      setColor(rule.color);
      setOvertimeEnabled(!!rule.overtimeAfterHours);
      setOvertimeAfter(rule.overtimeAfterHours?.toString() ?? "8");
      setOvertimeMultiplier(rule.overtimeMultiplier?.toString() ?? "1.5");
    } else {
      setName(""); setBase(""); setPerHour(""); setColor(RULE_COLORS[0]);
      setOvertimeEnabled(false); setOvertimeAfter("8"); setOvertimeMultiplier("1.5");
    }
  }, [rule]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert("Required", "Rule name is required."); return; }
    const b = parseFloat(base) || 0;
    const ph = parseFloat(perHour) || 0;
    onSave({
      id: rule?.id === -1 ? Date.now() : rule!.id,
      name: name.trim(),
      base: b,
      perHour: ph,
      active: rule?.active ?? true,
      color,
      overtimeAfterHours: overtimeEnabled ? parseFloat(overtimeAfter) || 8 : undefined,
      overtimeMultiplier: overtimeEnabled ? parseFloat(overtimeMultiplier) || 1.5 : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={[styles.modalCard, { backgroundColor: colors.surface }] as ViewStyle[]} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalHandle, { backgroundColor: colors.border }] as ViewStyle[]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }] as TextStyle[]}>
            {isNew ? "New Billing Rule" : "Edit Billing Rule"}
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>RULE NAME</Text>
          <TextInput value={name} onChangeText={setName} autoFocus
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
            placeholder="e.g. Weekend Premium" placeholderTextColor={colors.muted + "80"} />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>BASE RATE ($)</Text>
              <TextInput value={base} onChangeText={setBase} keyboardType="decimal-pad"
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                placeholder="125" placeholderTextColor={colors.muted + "80"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>PER HOUR ($)</Text>
              <TextInput value={perHour} onChangeText={setPerHour} keyboardType="decimal-pad"
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                placeholder="85" placeholderTextColor={colors.muted + "80"} />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }] as TextStyle[]}>Overtime rules</Text>
              <Text style={[styles.toggleSub, { color: colors.muted }] as TextStyle[]}>Apply multiplier after threshold</Text>
            </View>
            <Switch value={overtimeEnabled} onValueChange={setOvertimeEnabled}
              trackColor={{ false: colors.border, true: NVC_BLUE }} thumbColor="#fff" />
          </View>

          {overtimeEnabled && (
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>OVERTIME AFTER (hrs)</Text>
                <TextInput value={overtimeAfter} onChangeText={setOvertimeAfter} keyboardType="decimal-pad"
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                  placeholder="8" placeholderTextColor={colors.muted + "80"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>MULTIPLIER (×)</Text>
                <TextInput value={overtimeMultiplier} onChangeText={setOvertimeMultiplier} keyboardType="decimal-pad"
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                  placeholder="1.5" placeholderTextColor={colors.muted + "80"} />
              </View>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>COLOUR</Text>
          <View style={styles.colorRow}>
            {RULE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: "#fff" }] as ViewStyle[]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{isNew ? "Create Rule" : "Save Changes"}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PricingLogicScreen() {
  const colors = useColors();
  const [rules, setRules] = useState<BillingRule[]>(DEFAULT_RULES);
  const [models, setModels] = useState<PricingModel[]>(DEFAULT_MODELS);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);

  const handleToggleRule = (id: number, val: boolean) =>
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: val } : r));

  const handleDeleteRule = (id: number) => {
    Alert.alert("Delete Rule", "Remove this billing rule?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setRules((prev) => prev.filter((r) => r.id !== id)) },
    ]);
  };

  const handleSaveRule = (updated: BillingRule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === updated.id);
      return exists ? prev.map((r) => r.id === updated.id ? updated : r) : [...prev, updated];
    });
  };

  const activeRules = rules.filter((r) => r.active).length;
  const avgBase = rules.length ? Math.round(rules.reduce((s, r) => s + r.base, 0) / rules.length) : 0;
  const avgHourly = rules.length ? Math.round(rules.reduce((s, r) => s + r.perHour, 0) / rules.length) : 0;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title="Pricing Logic"
        subtitle="Billing Rules · Rate Models · Overtime"
        showBack
        rightElement={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
            onPress={() => { setEditingRule({ id: -1, name: "", base: 0, perHour: 0, active: true, color: RULE_COLORS[0] }); setRuleModalVisible(true); }}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: "Active Rules", value: activeRules.toString(), color: NVC_BLUE },
            { label: "Avg Base Rate", value: `$${avgBase}`, color: "#16A34A" },
            { label: "Avg Hourly", value: `$${avgHourly}/hr`, color: NVC_ORANGE },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }] as ViewStyle[]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Pricing Models ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Pricing Models</Text>
          <View style={[styles.modelsCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
            {models.map((model, i) => (
              <View
                key={model.id}
                style={[
                  styles.modelRow,
                  i < models.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                ] as ViewStyle[]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modelName, { color: colors.foreground }] as TextStyle[]}>{model.label}</Text>
                  <Text style={[styles.modelDesc, { color: colors.muted }] as TextStyle[]}>{model.description}</Text>
                </View>
                <Switch
                  value={model.active}
                  onValueChange={(v) => setModels((prev) => prev.map((m) => m.id === model.id ? { ...m, active: v } : m))}
                  trackColor={{ false: colors.border, true: NVC_BLUE }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* ── Billing Rules ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Billing Rules</Text>
            <Pressable
              style={({ pressed }) => [styles.addRuleBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => { setEditingRule({ id: -1, name: "", base: 0, perHour: 0, active: true, color: RULE_COLORS[0] }); setRuleModalVisible(true); }}
            >
              <IconSymbol name="plus" size={12} color={NVC_BLUE} />
              <Text style={[styles.addRuleBtnText, { color: NVC_BLUE }] as TextStyle[]}>Add Rule</Text>
            </Pressable>
          </View>
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggleRule}
              onEdit={(r) => { setEditingRule(r); setRuleModalVisible(true); }}
              onDelete={handleDeleteRule}
            />
          ))}
        </View>

        {/* ── Travel & Distance ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Travel & Distance</Text>
          <View style={[styles.modelsCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
            {[
              { label: "Free radius", value: "25 km" },
              { label: "Rate beyond free radius", value: "$1.20 / km" },
              { label: "Minimum travel charge", value: "$15.00" },
            ].map((item, i, arr) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.modelRow,
                  i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  { opacity: pressed ? 0.7 : 1 },
                ] as ViewStyle[]}
                onPress={() => Alert.alert("Travel Setting", `Edit "${item.label}" to customise your distance pricing.`)}
              >
                <Text style={[styles.modelName, { color: colors.foreground }] as TextStyle[]}>{item.label}</Text>
                <View style={styles.travelValueRow}>
                  <Text style={[styles.travelValue, { color: NVC_BLUE }] as TextStyle[]}>{item.value}</Text>
                  <IconSymbol name="chevron.right" size={12} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      <RuleEditModal
        rule={editingRule}
        visible={ruleModalVisible}
        onClose={() => setRuleModalVisible(false)}
        onSave={handleSaveRule}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 14, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "600", textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  modelsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  modelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  modelName: { fontSize: 13, fontWeight: "600" },
  modelDesc: { fontSize: 11, marginTop: 2 },
  travelValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  travelValue: { fontSize: 13, fontWeight: "600" },
  addRuleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addRuleBtnText: { fontSize: 12, fontWeight: "700" },
  ruleCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
  },
  ruleAccent: { width: 4, alignSelf: "stretch" },
  ruleBody: { flex: 1, padding: 12, gap: 8 },
  ruleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ruleName: { fontSize: 13, fontWeight: "700", flex: 1 },
  ruleTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  ruleActionBtn: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rulePricing: { flexDirection: "row", alignItems: "center", gap: 8 },
  rulePriceChip: { alignItems: "center", gap: 1 },
  rulePriceLabel: { fontSize: 9, fontWeight: "600" },
  rulePriceValue: { fontSize: 14, fontWeight: "800" },
  ruleDivider: { width: 1, height: 24 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  rowInputs: { flexDirection: "row", gap: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 11, marginTop: 1 },
  colorRow: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 8 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 8 },
  cancelText: { fontSize: 14, fontWeight: "500" },
});
