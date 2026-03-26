import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, Switch, Alert,
  ViewStyle, TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceSetting = {
  id: string;
  label: string;
  value: string;
  options?: string[];
  inputType?: "text" | "select" | "toggle";
};

// ─── Default Invoice Settings ─────────────────────────────────────────────────

const DEFAULT_INVOICE_SETTINGS: InvoiceSetting[] = [
  { id: "auto_generate", label: "Auto-generate invoices", value: "On job completion", options: ["On job completion", "Manual only", "On payment request", "Daily batch"] },
  { id: "payment_terms", label: "Payment terms", value: "Net 30", options: ["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 60"] },
  { id: "tax_rate", label: "Tax rate", value: "5% GST", inputType: "text" },
  { id: "invoice_prefix", label: "Invoice prefix", value: "NVC-2026-", inputType: "text" },
  { id: "send_method", label: "Send to customer", value: "Email + SMS", options: ["Email only", "SMS only", "Email + SMS", "Manual"] },
  { id: "late_fee", label: "Late fee", value: "1.5% / month", inputType: "text" },
  { id: "reminder_days", label: "Payment reminder", value: "3 days before due", options: ["1 day before due", "3 days before due", "7 days before due", "On due date", "Disabled"] },
];

// ─── Subscription Plans ───────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  price: number;
  period: string;
  color: string;
  features: string[];
  current: boolean;
  maxTechs: number | null;
};

const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter", name: "Starter", price: 49, period: "mo", color: "#3B82F6",
    features: ["Up to 3 technicians", "50 work orders/mo", "Basic reporting", "SMS notifications"],
    current: false, maxTechs: 3,
  },
  {
    id: "professional", name: "Professional", price: 149, period: "mo", color: NVC_BLUE,
    features: ["Up to 15 technicians", "Unlimited work orders", "Advanced analytics", "GPS tracking", "Customer portal"],
    current: true, maxTechs: 15,
  },
  {
    id: "enterprise", name: "Enterprise", price: 399, period: "mo", color: "#7C3AED",
    features: ["Unlimited technicians", "White-label branding", "API access", "Dedicated support", "Custom integrations"],
    current: false, maxTechs: null,
  },
];

// ─── Plan Edit Modal ──────────────────────────────────────────────────────────

function PlanEditModal({
  plan,
  visible,
  onClose,
  onSave,
}: {
  plan: Plan | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: Plan) => void;
}) {
  const colors = useColors();
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price.toString() ?? "");
  const [features, setFeatures] = useState(plan?.features.join("\n") ?? "");
  const [isCurrent, setIsCurrent] = useState(plan?.current ?? false);

  React.useEffect(() => {
    if (plan) {
      setName(plan.name);
      setPrice(plan.price.toString());
      setFeatures(plan.features.join("\n"));
      setIsCurrent(plan.current);
    }
  }, [plan]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert("Required", "Plan name is required."); return; }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) { Alert.alert("Invalid", "Enter a valid price."); return; }
    onSave({
      ...plan!,
      name: name.trim(),
      price: parsedPrice,
      features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      current: isCurrent,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }] as ViewStyle[]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }] as TextStyle[]}>Edit Plan</Text>

          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>PLAN NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
            placeholder="e.g. Professional"
            placeholderTextColor={colors.muted + "80"}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>MONTHLY PRICE ($/mo)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
            placeholder="149"
            placeholderTextColor={colors.muted + "80"}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>FEATURES (one per line)</Text>
          <TextInput
            value={features}
            onChangeText={setFeatures}
            multiline
            numberOfLines={5}
            style={[styles.fieldInput, styles.fieldInputMulti, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
            placeholder={"Up to 15 technicians\nUnlimited work orders\nGPS tracking"}
            placeholderTextColor={colors.muted + "80"}
          />

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.foreground }] as TextStyle[]}>Mark as current plan</Text>
            <Switch
              value={isCurrent}
              onValueChange={setIsCurrent}
              trackColor={{ false: colors.border, true: NVC_BLUE }}
              thumbColor="#fff"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
            onPress={handleSave}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save Plan</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Invoice Setting Edit Modal ───────────────────────────────────────────────

function InvoiceEditModal({
  setting,
  visible,
  onClose,
  onSave,
}: {
  setting: InvoiceSetting | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, value: string) => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState(setting?.value ?? "");

  React.useEffect(() => {
    if (setting) setValue(setting.value);
  }, [setting]);

  const hasOptions = setting?.options && setting.options.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }] as ViewStyle[]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }] as TextStyle[]}>{setting?.label}</Text>

          {hasOptions ? (
            <View style={styles.optionsList}>
              {setting!.options!.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.optionRow,
                    { backgroundColor: value === opt ? NVC_BLUE + "15" : colors.background, borderColor: value === opt ? NVC_BLUE : colors.border, opacity: pressed ? 0.8 : 1 },
                  ] as ViewStyle[]}
                  onPress={() => setValue(opt)}
                >
                  <Text style={[styles.optionText, { color: value === opt ? NVC_BLUE : colors.foreground }] as TextStyle[]}>{opt}</Text>
                  {value === opt && <IconSymbol name="checkmark.circle.fill" size={18} color={NVC_BLUE} />}
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>VALUE</Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }] as TextStyle[]}
                placeholder={setting?.value}
                placeholderTextColor={colors.muted + "80"}
                autoFocus
              />
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }] as ViewStyle[]}
            onPress={() => { onSave(setting!.id, value); onClose(); }}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.muted }] as TextStyle[]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const INVOICE_SETTINGS_KEY = "nvc360_invoice_settings";

export default function BillingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tenantId } = useTenant();

  // Load invoice settings from AsyncStorage (tenant-scoped key)
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSetting[]>(DEFAULT_INVOICE_SETTINGS);

  React.useEffect(() => {
    if (!tenantId) return;
    AsyncStorage.getItem(`${INVOICE_SETTINGS_KEY}_${tenantId}`).then((raw) => {
      if (raw) {
        try { setInvoiceSettings(JSON.parse(raw)); } catch {}
      }
    });
  }, [tenantId]);

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planModalVisible, setPlanModalVisible] = useState(false);

  const [editingSetting, setEditingSetting] = useState<InvoiceSetting | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  // Wire plan.current change to tenants.update
  const updateTenantMutation = trpc.tenants.update.useMutation({
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to update plan."),
  });

  const handleSavePlan = (updated: Plan) => {
    setPlans((prev) => prev.map((p) => ({
      ...p,
      current: p.id === updated.id ? updated.current : (updated.current ? false : p.current),
    })));
    // Persist the "current" plan flag to the tenant record
    if (updated.current && tenantId) {
      const planKey = updated.id as "starter" | "professional" | "enterprise";
      updateTenantMutation.mutate({ id: tenantId, plan: planKey });
    }
  };

  const handleSaveInvoiceSetting = (id: string, value: string) => {
    setInvoiceSettings((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, value } : s);
      if (tenantId) AsyncStorage.setItem(`${INVOICE_SETTINGS_KEY}_${tenantId}`, JSON.stringify(next));
      return next;
    });
  };

  // Summary stats
  const totalMRR = plans.reduce((sum, p) => sum + p.price, 0);
  const currentPlan = plans.find((p) => p.current);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader title="Billing" subtitle="Plans · Invoice Settings · Revenue" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { label: "Active Plan", value: currentPlan?.name ?? "—", color: NVC_BLUE },
            { label: "Plan Price", value: currentPlan ? `$${currentPlan.price}/mo` : "—", color: "#16A34A" },
            { label: "Total Plan Value", value: `$${totalMRR}/mo`, color: NVC_ORANGE },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }] as ViewStyle[]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Subscription Plans ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Subscription Plans</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }] as TextStyle[]}>Tap a plan to edit pricing</Text>
          </View>
          <View style={styles.plansGrid}>
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: plan.current ? plan.color : colors.surface,
                    borderColor: plan.current ? plan.color : colors.border,
                    borderWidth: plan.current ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ] as ViewStyle[]}
                onPress={() => { setEditingPlan(plan); setPlanModalVisible(true); }}
              >
                {plan.current && (
                  <View style={[styles.currentBadge, { backgroundColor: "rgba(255,255,255,0.25)" }] as ViewStyle[]}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
                <View style={styles.planEditIcon}>
                  <IconSymbol name="pencil" size={12} color={plan.current ? "rgba(255,255,255,0.7)" : colors.muted} />
                </View>
                <Text style={[styles.planName, { color: plan.current ? "#fff" : colors.foreground }] as TextStyle[]}>
                  {plan.name}
                </Text>
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: plan.current ? "#fff" : plan.color }] as TextStyle[]}>
                    ${plan.price}
                  </Text>
                  <Text style={[styles.planPeriod, { color: plan.current ? "rgba(255,255,255,0.7)" : colors.muted }] as TextStyle[]}>
                    /mo
                  </Text>
                </View>
                {plan.features.slice(0, 3).map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={11}
                      color={plan.current ? "rgba(255,255,255,0.8)" : plan.color}
                    />
                    <Text
                      style={[styles.featureText, { color: plan.current ? "rgba(255,255,255,0.8)" : colors.muted }] as TextStyle[]}
                      numberOfLines={1}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
                {plan.features.length > 3 && (
                  <Text style={[styles.featureMore, { color: plan.current ? "rgba(255,255,255,0.6)" : colors.muted }] as TextStyle[]}>
                    +{plan.features.length - 3} more
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Invoice Settings ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Invoice Settings</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }] as TextStyle[]}>Tap any row to edit</Text>
          </View>
          <View style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
            {invoiceSettings.map((item, i) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.invoiceRow,
                  i < invoiceSettings.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  { opacity: pressed ? 0.7 : 1 },
                ] as ViewStyle[]}
                onPress={() => { setEditingSetting(item); setInvoiceModalVisible(true); }}
              >
                <Text style={[styles.invoiceLabel, { color: colors.foreground }] as TextStyle[]}>{item.label}</Text>
                <View style={styles.invoiceValueRow}>
                  <Text style={[styles.invoiceValue, { color: NVC_BLUE }] as TextStyle[]}>{item.value}</Text>
                  <IconSymbol name="chevron.right" size={12} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Payment Methods ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Payment Methods</Text>
          <View style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
            {[
              { label: "Credit / Debit Card", icon: "creditcard.fill" as const, color: "#3B82F6", enabled: true },
              { label: "Bank Transfer (ACH)", icon: "building.columns.fill" as const, color: "#16A34A", enabled: true },
              { label: "Cash", icon: "dollarsign.circle.fill" as const, color: NVC_ORANGE, enabled: true },
              { label: "Cheque", icon: "doc.text.fill" as const, color: "#6B7280", enabled: false },
            ].map((method, i, arr) => (
              <View
                key={method.label}
                style={[
                  styles.invoiceRow,
                  i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                ] as ViewStyle[]}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: method.color + "18" }] as ViewStyle[]}>
                    <IconSymbol name={method.icon} size={14} color={method.color} />
                  </View>
                  <Text style={[styles.invoiceLabel, { color: colors.foreground }] as TextStyle[]}>{method.label}</Text>
                </View>
                <Switch
                  value={method.enabled}
                  onValueChange={() => Alert.alert("Payment Method", `Toggle ${method.label} in your Stripe dashboard.`)}
                  trackColor={{ false: colors.border, true: method.color }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      <PlanEditModal
        plan={editingPlan}
        visible={planModalVisible}
        onClose={() => setPlanModalVisible(false)}
        onSave={handleSavePlan}
      />
      <InvoiceEditModal
        setting={editingSetting}
        visible={invoiceModalVisible}
        onClose={() => setInvoiceModalVisible(false)}
        onSave={handleSaveInvoiceSetting}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  statsRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 14, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "600", textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionHint: { fontSize: 11 },
  // Plans grid — 3 equal columns
  plansGrid: { flexDirection: "row", gap: 10 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    minHeight: 160,
    position: "relative",
  },
  currentBadge: { position: "absolute", top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  currentBadgeText: { fontSize: 8, fontWeight: "800", color: "#fff" },
  planEditIcon: { position: "absolute", top: 8, right: 8 },
  planName: { fontSize: 12, fontWeight: "800", marginTop: 16 },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 1, marginBottom: 4 },
  planPrice: { fontSize: 20, fontWeight: "900" },
  planPeriod: { fontSize: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  featureText: { fontSize: 9, flex: 1 },
  featureMore: { fontSize: 9, marginTop: 2 },
  // Invoice
  invoiceCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  invoiceLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  invoiceValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  invoiceValue: { fontSize: 13, fontWeight: "600" },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  methodIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
    maxHeight: "85%",
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  fieldInputMulti: { height: 100, textAlignVertical: "top", paddingTop: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "500" },
  optionsList: { gap: 8, marginVertical: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: { fontSize: 14, fontWeight: "500" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 14, fontWeight: "500" },
});
