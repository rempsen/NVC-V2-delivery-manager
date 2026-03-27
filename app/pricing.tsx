import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert,
  ViewStyle, TextStyle, Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, WIDGET_SURFACE_LIGHT } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

// (MOCK_BILLING_RULES removed — now loaded from DB via tRPC pricing.list);

const PLAN_TIERS = [
  {
    name: "Starter", price: 49, period: "mo", color: "#3B82F6",
    features: ["Up to 3 technicians", "50 work orders/mo", "Basic reporting", "SMS notifications"],
    current: false,
  },
  {
    name: "Professional", price: 149, period: "mo", color: NVC_BLUE,
    features: ["Up to 15 technicians", "Unlimited work orders", "Advanced analytics", "GPS tracking", "Customer portal"],
    current: true,
  },
  {
    name: "Enterprise", price: 399, period: "mo", color: "#7C3AED",
    features: ["Unlimited technicians", "White-label branding", "API access", "Dedicated support", "Custom integrations"],
    current: false,
  },
];

// ─── Billing Rule Card ────────────────────────────────────────────────────────

function BillingRuleCard({ rule, onToggle, color }: {
  rule: DbRule;
  onToggle: (id: number, val: boolean) => void;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.ruleCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
      <View style={[styles.ruleAccent, { backgroundColor: color }] as ViewStyle[]} />
      <View style={styles.ruleBody}>
        <View style={styles.ruleTop}>
          <Text style={[styles.ruleName, { color: colors.foreground }] as TextStyle[]}>{rule.name}</Text>
          <Switch
            value={rule.isDefault ?? false}
            onValueChange={(v) => onToggle(rule.id, v)}
            trackColor={{ false: colors.border, true: color }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.rulePricing}>
          <View style={styles.rulePriceChip}>
            <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>Base</Text>
            <Text style={[styles.rulePriceValue, { color }] as TextStyle[]}>${getRuleBaseRate(rule)}</Text>
          </View>
          <View style={[styles.ruleDivider, { backgroundColor: colors.border }] as ViewStyle[]} />
          <View style={styles.rulePriceChip}>
            <Text style={[styles.rulePriceLabel, { color: colors.muted }] as TextStyle[]}>Per Hour</Text>
            <Text style={[styles.rulePriceValue, { color }] as TextStyle[]}>${getRuleHourlyRate(rule)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Plan Tier Card ───────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: typeof PLAN_TIERS[0] }) {
  const colors = useColors();
  return (
    <View style={[
      styles.planCard,
      { backgroundColor: plan.current ? plan.color : colors.surface,
        borderColor: plan.current ? plan.color : colors.border,
        borderWidth: plan.current ? 2 : 1 },
    ] as ViewStyle[]}>
      {plan.current && (
        <View style={styles.planCurrentBadge}>
          <Text style={styles.planCurrentText}>Current Plan</Text>
        </View>
      )}
      <Text style={[styles.planName, { color: plan.current ? "#fff" : colors.foreground }] as TextStyle[]}>
        {plan.name}
      </Text>
      <View style={styles.planPriceRow}>
        <Text style={[styles.planPrice, { color: plan.current ? "#fff" : plan.color }] as TextStyle[]}>
          ${plan.price}
        </Text>
        <Text style={[styles.planPeriod, { color: plan.current ? "rgba(255,255,255,0.7)" : colors.muted }] as TextStyle[]}>
          /{plan.period}
        </Text>
      </View>
      {plan.features.map((f) => (
        <View key={f} style={styles.planFeatureRow}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={14}
            color={plan.current ? "rgba(255,255,255,0.9)" : plan.color}
          />
          <Text style={[styles.planFeature, { color: plan.current ? "rgba(255,255,255,0.85)" : colors.muted }] as TextStyle[]}>
            {f}
          </Text>
        </View>
      ))}
      {!plan.current && (
        <Pressable
          style={({ pressed }) => [
            styles.planUpgradeBtn,
            { backgroundColor: plan.color, opacity: pressed ? 0.85 : 1 },
          ] as ViewStyle[]}
          onPress={() => Alert.alert("Upgrade", `Contact NVC360 to upgrade to ${plan.name}.`)}
        >
          <Text style={styles.planUpgradeText}>Upgrade</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const RULE_COLORS = ["#1E6FBF", "#DC2626", "#16A34A", "#7C3AED", "#F59E0B", "#EC4899", "#06B6D4"];

// ─── Rule type from DB ────────────────────────────────────────────────────────
type DbRule = { id: number; name: string; model: string; flatRateCents?: number | null; hourlyBaseRateCents?: number | null; isDefault?: boolean | null };
function getRuleBaseRate(r: DbRule) { return r.flatRateCents != null ? r.flatRateCents / 100 : r.hourlyBaseRateCents != null ? r.hourlyBaseRateCents / 100 : 0; }
function getRuleHourlyRate(r: DbRule) { return r.hourlyBaseRateCents != null ? r.hourlyBaseRateCents / 100 : 0; }

export default function PricingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { tenantId } = useTenant();

  // ── Live DB data ────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: rawRules = [], isLoading } = trpc.pricing.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: !!tenantId },
  );
  const rules: DbRule[] = rawRules as DbRule[];

  const createMutation = trpc.pricing.create.useMutation({
    onSuccess: () => { utils.pricing.list.invalidate(); setRuleModalVisible(false); },
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to create rule."),
  });
  const updateMutation = trpc.pricing.update.useMutation({
    onSuccess: () => { utils.pricing.list.invalidate(); setRuleModalVisible(false); },
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to update rule."),
  });

  // ── Rule Editor Modal ──
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<DbRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleBase, setRuleBase] = useState("");
  const [rulePerHour, setRulePerHour] = useState("");
  const [ruleColor, setRuleColor] = useState(RULE_COLORS[0]);

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleName("");
    setRuleBase("");
    setRulePerHour("");
    setRuleColor(RULE_COLORS[0]);
    setRuleModalVisible(true);
  };

  const openEditRule = (rule: DbRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleBase(getRuleBaseRate(rule).toString());
    setRulePerHour(getRuleHourlyRate(rule).toString());
    setRuleColor(RULE_COLORS[rules.indexOf(rule) % RULE_COLORS.length]);
    setRuleModalVisible(true);
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) { Alert.alert("Required", "Please enter a rule name."); return; }
    const baseCents = Math.round((parseFloat(ruleBase) || 0) * 100);
    const hourCents = Math.round((parseFloat(rulePerHour) || 0) * 100);
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, tenantId: tenantId ?? 0, name: ruleName.trim(), flatRateCents: baseCents, hourlyBaseRateCents: hourCents });
    } else {
      createMutation.mutate({ tenantId: tenantId ?? 0, name: ruleName.trim(), model: "hourly", flatRateCents: baseCents, hourlyBaseRateCents: hourCents });
    }
  };

  const handleToggle = (_id: number, _val: boolean) => {
    // Toggle is a visual-only affordance; full enable/disable requires a dedicated DB field
    Alert.alert("Coming Soon", "Rule enable/disable will be available in a future update.");
  };

  const handleDeleteRule = (id: number) => {
    Alert.alert("Delete Rule", "Are you sure you want to delete this billing rule?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => updateMutation.mutate({ id, tenantId: tenantId ?? 0, name: "__deleted__" }) },
    ]);
  };

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title="Pricing & Billing"
        subtitle="Rules · Plans · Invoicing"
        showBack
        rightElement={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
            onPress={openCreateRule}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: "Total Rules", value: rules.length.toString(), color: NVC_BLUE },
            { label: "Avg Base Rate", value: rules.length > 0 ? "$" + Math.round(rules.reduce((s, r) => s + getRuleBaseRate(r), 0) / rules.length) : "$0", color: "#16A34A" },
            { label: "Invoices / Mo", value: "47", color: NVC_ORANGE },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }] as ViewStyle[]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Billing Rules ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Billing Rules</Text>
          {rules.map((rule) => (
            <View key={rule.id} style={{ position: "relative" }}>
              <BillingRuleCard rule={rule} onToggle={handleToggle} color={RULE_COLORS[rules.indexOf(rule) % RULE_COLORS.length]} />
              <View style={[styles.ruleActions]}>
                <Pressable
                  onPress={() => openEditRule(rule)}
                  style={({ pressed }) => [styles.ruleActionBtn, { backgroundColor: NVC_BLUE + "15", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                >
                  <IconSymbol name="pencil" size={13} color={NVC_BLUE} />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteRule(rule.id)}
                  style={({ pressed }) => [styles.ruleActionBtn, { backgroundColor: "#EF444415", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
                >
                  <IconSymbol name="trash.fill" size={13} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* ── Subscription Plans ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Subscription Plans</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plansRow}>
            {PLAN_TIERS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </ScrollView>
        </View>

        {/* ── Invoice Settings ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Invoice Settings</Text>
          <View style={[styles.invoiceCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
            {[
              { label: "Auto-generate invoices", value: "On job completion" },
              { label: "Payment terms", value: "Net 30" },
              { label: "Tax rate", value: "5% GST" },
              { label: "Invoice prefix", value: "NVC-2026-" },
              { label: "Send to customer", value: "Email + SMS" },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[
                  styles.invoiceRow,
                  i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                ] as ViewStyle[]}
              >
                <Text style={[styles.invoiceLabel, { color: colors.foreground }] as TextStyle[]}>{item.label}</Text>
                <Text style={[styles.invoiceValue, { color: NVC_BLUE }] as TextStyle[]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
      <BottomNavBar />

      {/* ── Rule Editor Modal ── */}
      <Modal visible={ruleModalVisible} transparent animationType="slide" onRequestClose={() => setRuleModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setRuleModalVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.ruleModal, { backgroundColor: colors.surface }] as ViewStyle[]}>
            <View style={[styles.ruleModalHandle, { backgroundColor: colors.border }] as ViewStyle[]} />
            <Text style={[styles.ruleModalTitle, { color: colors.foreground }] as TextStyle[]}>
              {editingRule ? "Edit Billing Rule" : "New Billing Rule"}
            </Text>
            <Text style={[styles.ruleModalLabel, { color: colors.muted }] as TextStyle[]}>RULE NAME</Text>
            <TextInput
              value={ruleName}
              onChangeText={setRuleName}
              placeholder="e.g. Weekend Premium"
              placeholderTextColor={colors.muted + "80"}
              style={[styles.ruleModalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
              returnKeyType="next"
              autoFocus
            />
            <View style={styles.ruleModalRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ruleModalLabel, { color: colors.muted }] as TextStyle[]}>BASE RATE ($)</Text>
                <TextInput
                  value={ruleBase}
                  onChangeText={setRuleBase}
                  placeholder="125"
                  placeholderTextColor={colors.muted + "80"}
                  keyboardType="decimal-pad"
                  style={[styles.ruleModalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ruleModalLabel, { color: colors.muted }] as TextStyle[]}>PER HOUR ($)</Text>
                <TextInput
                  value={rulePerHour}
                  onChangeText={setRulePerHour}
                  placeholder="85"
                  placeholderTextColor={colors.muted + "80"}
                  keyboardType="decimal-pad"
                  style={[styles.ruleModalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                />
              </View>
            </View>
            <Text style={[styles.ruleModalLabel, { color: colors.muted }] as TextStyle[]}>COLOUR</Text>
            <View style={styles.ruleColorRow}>
              {RULE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setRuleColor(c)}
                  style={[styles.ruleColorSwatch, { backgroundColor: c, borderWidth: ruleColor === c ? 3 : 0, borderColor: "#fff" }] as ViewStyle[]}
                />
              ))}
            </View>
            <Pressable
              onPress={handleSaveRule}
              style={({ pressed }) => [styles.ruleModalSaveBtn, { backgroundColor: ruleColor, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
            >
              <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
              <Text style={styles.ruleModalSaveBtnText}>{editingRule ? "Save Changes" : "Create Rule"}</Text>
            </Pressable>
            <Pressable onPress={() => setRuleModalVisible(false)} style={styles.ruleModalCancelBtn}>
              <Text style={[styles.ruleModalCancelText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  scroll: ViewStyle; addBtn: ViewStyle;
  statsRow: ViewStyle; statCard: ViewStyle; statValue: TextStyle; statLabel: TextStyle;
  section: ViewStyle; sectionTitle: TextStyle;
  ruleCard: ViewStyle; ruleAccent: ViewStyle; ruleBody: ViewStyle;
  ruleTop: ViewStyle; ruleName: TextStyle;
  rulePricing: ViewStyle; rulePriceChip: ViewStyle; ruleDivider: ViewStyle;
  rulePriceLabel: TextStyle; rulePriceValue: TextStyle;
  planCard: ViewStyle; planCurrentBadge: ViewStyle; planCurrentText: TextStyle;
  planName: TextStyle; planPriceRow: ViewStyle; planPrice: TextStyle; planPeriod: TextStyle;
  planFeatureRow: ViewStyle; planFeature: TextStyle;
  planUpgradeBtn: ViewStyle; planUpgradeText: TextStyle;
  plansRow: ViewStyle;
  invoiceCard: ViewStyle; invoiceRow: ViewStyle; invoiceLabel: TextStyle; invoiceValue: TextStyle;
  ruleActions: ViewStyle; ruleActionBtn: ViewStyle;
  ruleModal: ViewStyle; ruleModalHandle: ViewStyle; ruleModalTitle: TextStyle; ruleModalLabel: TextStyle;
  ruleModalInput: TextStyle; ruleModalRow: ViewStyle; ruleColorRow: ViewStyle; ruleColorSwatch: ViewStyle;
  ruleModalSaveBtn: ViewStyle; ruleModalSaveBtnText: TextStyle; ruleModalCancelBtn: ViewStyle; ruleModalCancelText: TextStyle;
}>({
  scroll: { paddingBottom: 40 },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: NVC_ORANGE, alignItems: "center", justifyContent: "center",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_500Medium", textAlign: "center" },

  // Section
  section: { paddingHorizontal: 14, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },

  // Billing Rule Card
  ruleCard: {
    flexDirection: "row", borderRadius: 14, marginBottom: 10, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  ruleAccent: { width: 4 },
  ruleBody: { flex: 1, padding: 14, gap: 10 },
  ruleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ruleName: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  rulePricing: { flexDirection: "row", alignItems: "center", gap: 12 },
  rulePriceChip: { alignItems: "center", gap: 2 },
  ruleDivider: { width: 1, height: 28 },
  rulePriceLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  rulePriceValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // Plan Cards
  plansRow: { gap: 12, paddingBottom: 4 },
  planCard: {
    width: 200, borderRadius: 16, padding: 16, gap: 8,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  planCurrentBadge: {
    backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 2,
  },
  planCurrentText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  planName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  planPriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  planPrice: { fontSize: 28, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeature: { fontSize: 12, flex: 1 },
  planUpgradeBtn: {
    marginTop: 8, paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  planUpgradeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },

  // Invoice Settings
  invoiceCard: {
    borderRadius: 14, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  invoiceLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  invoiceValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Rule action buttons (edit/delete)
  ruleActions: { flexDirection: "row", gap: 6, justifyContent: "flex-end", paddingHorizontal: 14, paddingBottom: 4, marginTop: -6 },
  ruleActionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Rule Editor Modal
  ruleModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 6 },
  ruleModalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  ruleModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  ruleModalLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 8 },
  ruleModalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginTop: 4 },
  ruleModalRow: { flexDirection: "row", gap: 12, marginTop: 0 },
  ruleColorRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  ruleColorSwatch: { width: 32, height: 32, borderRadius: 16 },
  ruleModalSaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  ruleModalSaveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  ruleModalCancelBtn: { alignItems: "center", paddingVertical: 12 },
  ruleModalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
