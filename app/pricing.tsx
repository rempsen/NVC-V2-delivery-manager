import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert,
  ViewStyle, TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, WIDGET_SURFACE_LIGHT } from "@/constants/brand";

// ─── Mock Pricing Data ────────────────────────────────────────────────────────

const BILLING_RULES = [
  { id: 1, name: "Standard Service Call", base: 125, perHour: 85, active: true, color: "#1E6FBF" },
  { id: 2, name: "Emergency / After-Hours", base: 200, perHour: 145, active: true, color: "#DC2626" },
  { id: 3, name: "Preventive Maintenance", base: 95, perHour: 75, active: true, color: "#16A34A" },
  { id: 4, name: "Installation", base: 150, perHour: 95, active: false, color: "#7C3AED" },
];

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

function BillingRuleCard({ rule, onToggle }: {
  rule: typeof BILLING_RULES[0];
  onToggle: (id: number, val: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.ruleCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
      <View style={[styles.ruleAccent, { backgroundColor: rule.color }] as ViewStyle[]} />
      <View style={styles.ruleBody}>
        <View style={styles.ruleTop}>
          <Text style={[styles.ruleName, { color: colors.foreground }] as TextStyle[]}>{rule.name}</Text>
          <Switch
            value={rule.active}
            onValueChange={(v) => onToggle(rule.id, v)}
            trackColor={{ false: colors.border, true: rule.color }}
            thumbColor="#fff"
          />
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

export default function PricingScreen() {
  const router = useRouter();
  const colors = useColors();
  const [rules, setRules] = useState(BILLING_RULES);

  const handleToggle = (id: number, val: boolean) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: val } : r));
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
            onPress={() => Alert.alert("Add Rule", "Billing rule editor coming soon.")}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: "Active Rules", value: rules.filter((r) => r.active).length.toString(), color: NVC_BLUE },
            { label: "Avg Base Rate", value: "$" + Math.round(rules.reduce((s, r) => s + r.base, 0) / rules.length), color: "#16A34A" },
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
            <BillingRuleCard key={rule.id} rule={rule} onToggle={handleToggle} />
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
  statValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "500", textAlign: "center" },

  // Section
  section: { paddingHorizontal: 14, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },

  // Billing Rule Card
  ruleCard: {
    flexDirection: "row", borderRadius: 14, marginBottom: 10, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  ruleAccent: { width: 4 },
  ruleBody: { flex: 1, padding: 14, gap: 10 },
  ruleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ruleName: { fontSize: 14, fontWeight: "700", flex: 1, marginRight: 8 },
  rulePricing: { flexDirection: "row", alignItems: "center", gap: 12 },
  rulePriceChip: { alignItems: "center", gap: 2 },
  ruleDivider: { width: 1, height: 28 },
  rulePriceLabel: { fontSize: 10, fontWeight: "500" },
  rulePriceValue: { fontSize: 18, fontWeight: "800" },

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
  planCurrentText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  planName: { fontSize: 16, fontWeight: "800" },
  planPriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  planPrice: { fontSize: 28, fontWeight: "800" },
  planPeriod: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeature: { fontSize: 12, flex: 1 },
  planUpgradeBtn: {
    marginTop: 8, paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  planUpgradeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Invoice Settings
  invoiceCard: {
    borderRadius: 14, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  invoiceLabel: { fontSize: 14, fontWeight: "500" },
  invoiceValue: { fontSize: 13, fontWeight: "600" },
});
