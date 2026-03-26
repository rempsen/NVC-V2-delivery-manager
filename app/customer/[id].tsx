import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  Alert, Switch, ViewStyle, TextStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { type Customer } from "@/app/(tabs)/customers";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableCustomer = Omit<Customer, "id" | "totalJobs" | "totalRevenue" | "lastJobDate" | "createdAt">;

const BLANK_CUSTOMER: EditableCustomer = {
  company: "", contactName: "", email: "", phone: "",
  mailingAddress: "", physicalAddress: "",
  city: "Winnipeg", province: "MB", postalCode: "", country: "Canada",
  industry: "", status: "active", terms: "Net 30", notes: "", tags: [],
};

const INDUSTRY_OPTIONS = [
  "Construction", "HVAC", "Plumbing", "Electrical", "Roofing", "Flooring",
  "Glass & Glazing", "Property Management", "Retail", "Logistics", "Healthcare",
  "Hospitality", "Manufacturing", "Other",
];

const TERMS_OPTIONS = ["COD", "Net 15", "Net 30", "Net 45", "Net 60", "Prepaid"];

const STATUS_OPTIONS: { value: Customer["status"]; label: string; color: string }[] = [
  { value: "active",   label: "Active",   color: "#16A34A" },
  { value: "vip",      label: "VIP",      color: "#F59E0B" },
  { value: "prospect", label: "Prospect", color: "#3B82F6" },
  { value: "inactive", label: "Inactive", color: "#9CA3AF" },
];

const COMMON_TAGS = [
  "VIP", "Commercial", "Residential", "Priority", "Contract",
  "Seasonal", "Emergency", "Multi-Unit", "Recurring", "Fleet",
  "On Hold", "Specialty", "Certified Required",
];

// ─── Form Field ───────────────────────────────────────────────────────────────

function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, required,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; required?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>
        {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
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
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false}
        returnKeyType={multiline ? "default" : "next"}
      />
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, iconColor, children }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface }] as ViewStyle[]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + "18" }] as ViewStyle[]}>
          <IconSymbol name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { tenantId } = useTenant();
  const isNew = id === "new";

  // ── Live DB query ─────────────────────────────────────────────────────────────
  const { data: rawCustomer } = trpc.customers.getById.useQuery(
    { id: Number(id), tenantId: tenantId ?? 0 },
    { enabled: !isNew && tenantId !== null && Number(id) > 0, staleTime: 60_000 },
  );

  const existing: Customer | null = useMemo(() => {
    if (isNew || !rawCustomer) return null;
    const c = rawCustomer as any;
    return {
      id: c.id,
      company: c.company ?? "",
      contactName: c.contactName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      mailingAddress: [c.mailingStreet, c.mailingCity, c.mailingProvince].filter(Boolean).join(", "),
      physicalAddress: [c.physicalStreet, c.physicalCity, c.physicalProvince].filter(Boolean).join(", "),
      city: c.mailingCity ?? "Winnipeg",
      province: c.mailingProvince ?? "MB",
      postalCode: c.mailingPostalCode ?? "",
      country: c.mailingCountry ?? "Canada",
      industry: c.industry ?? "",
      status: c.status ?? "active",
      terms: c.paymentTerms ?? "Net 30",
      notes: c.notes ?? "",
      tags: c.tags ? (typeof c.tags === "string" ? c.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : c.tags) : [],
      totalJobs: c.jobCount ?? 0,
      totalRevenue: (c.totalRevenueCents ?? 0) / 100,
      lastJobDate: c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    } as Customer;
  }, [id, isNew, rawCustomer]);

  const [form, setForm] = useState<EditableCustomer>(BLANK_CUSTOMER);

  // Populate form when existing customer loads
  useEffect(() => {
    if (existing) {
      setForm({
        company: existing.company, contactName: existing.contactName,
        email: existing.email, phone: existing.phone,
        mailingAddress: existing.mailingAddress, physicalAddress: existing.physicalAddress,
        city: existing.city, province: existing.province,
        postalCode: existing.postalCode, country: existing.country,
        industry: existing.industry, status: existing.status,
        terms: existing.terms, notes: existing.notes, tags: [...existing.tags],
      });
      setSameAddress(existing.mailingAddress === existing.physicalAddress);
    }
  }, [existing]);

  const [sameAddress, setSameAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Mutations ────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Customer Created", `${form.company} has been added to your customer database.`,
        [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to create customer."),
    onSettled: () => setSaving(false),
  });
  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Customer Updated", `${form.company} has been updated.`,
        [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to update customer."),
    onSettled: () => setSaving(false),
  });
  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message ?? "Failed to delete customer."),
  });

  const update = (key: keyof EditableCustomer, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleSave = useCallback(() => {
    if (!form.company.trim()) {
      Alert.alert("Required", "Company name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      tenantId: tenantId ?? 0,
      company: form.company.trim(),
      contactName: form.contactName?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      mailingStreet: form.mailingAddress?.trim() || undefined,
      mailingCity: form.city?.trim() || undefined,
      mailingProvince: form.province?.trim() || undefined,
      mailingPostalCode: form.postalCode?.trim() || undefined,
      mailingCountry: form.country?.trim() || "Canada",
      physicalStreet: sameAddress ? (form.mailingAddress?.trim() || undefined) : (form.physicalAddress?.trim() || undefined),
      physicalCity: sameAddress ? (form.city?.trim() || undefined) : undefined,
      physicalProvince: sameAddress ? (form.province?.trim() || undefined) : undefined,
      sameAsMailing: sameAddress,
      industry: form.industry?.trim() || undefined,
      status: form.status,
      paymentTerms: form.terms?.toLowerCase().replace(" ", "_") || "net_30",
      tags: form.tags.length > 0 ? form.tags.join(",") : undefined,
      notes: form.notes?.trim() || undefined,
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: Number(id), ...payload });
    }
  }, [form, isNew, id, tenantId, sameAddress, createMutation, updateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Customer", `Permanently delete ${form.company}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: Number(id), tenantId: tenantId ?? 0 }),
      },
    ]);
  }, [form.company, id, tenantId, deleteMutation]);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title={isNew ? "New Customer" : form.company || "Edit Customer"}
        subtitle={isNew ? "Create CRM Record" : `ID #${id} · ${form.industry || "No industry"}`}
        showBack
        rightElement={
          !isNew ? (
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={handleDelete}
            >
              <IconSymbol name="trash.fill" size={16} color="#EF4444" />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Stats (existing customers only) ── */}
        {!isNew && existing && (
          <View style={styles.statsRow}>
            {[
              { label: "Total Jobs", value: existing.totalJobs.toString(), color: NVC_BLUE },
              { label: "Revenue", value: "$" + existing.totalRevenue.toLocaleString(), color: "#16A34A" },
              { label: "Last Job", value: existing.lastJobDate, color: NVC_ORANGE },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }] as ViewStyle[]}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Status ── */}
        <View style={[styles.statusRow, { backgroundColor: colors.surface }] as ViewStyle[]}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.statusChip,
                {
                  backgroundColor: form.status === opt.value ? opt.color : opt.color + "15",
                  borderColor: opt.color,
                },
              ] as ViewStyle[]}
              onPress={() => update("status", opt.value)}
            >
              <Text style={[styles.statusChipText, { color: form.status === opt.value ? "#fff" : opt.color }] as TextStyle[]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Company Info ── */}
        <SectionCard title="Company Information" icon="building.2.fill" iconColor="#3B82F6">
          <FormField label="Company Name" value={form.company} onChangeText={(v) => update("company", v)} required />
          <FormField label="Primary Contact" value={form.contactName} onChangeText={(v) => update("contactName", v)} required />
          <FormField label="Email Address" value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" />
          <FormField label="Phone Number" value={form.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" />

          {/* Industry Picker */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>Industry</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {INDUSTRY_OPTIONS.map((ind) => (
                <Pressable
                  key={ind}
                  style={[
                    styles.chip,
                    { backgroundColor: form.industry === ind ? NVC_BLUE : NVC_BLUE + "12", borderColor: NVC_BLUE },
                  ] as ViewStyle[]}
                  onPress={() => update("industry", ind)}
                >
                  <Text style={[styles.chipText, { color: form.industry === ind ? "#fff" : NVC_BLUE }] as TextStyle[]}>
                    {ind}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SectionCard>

        {/* ── Addresses ── */}
        <SectionCard title="Addresses" icon="mappin.and.ellipse" iconColor={NVC_ORANGE}>
          <FormField label="Mailing Address" value={form.mailingAddress} onChangeText={(v) => update("mailingAddress", v)} />
          <View style={[styles.sameAddressRow, { borderColor: colors.border }] as ViewStyle[]}>
            <Text style={[styles.sameAddressLabel, { color: colors.muted }] as TextStyle[]}>
              Physical address same as mailing
            </Text>
            <Switch
              value={sameAddress}
              onValueChange={(v) => {
                setSameAddress(v);
                if (v) update("physicalAddress", form.mailingAddress);
              }}
              trackColor={{ false: colors.border, true: NVC_BLUE }}
              thumbColor="#fff"
            />
          </View>
          {!sameAddress && (
            <FormField label="Physical Address" value={form.physicalAddress} onChangeText={(v) => update("physicalAddress", v)} />
          )}
          <View style={styles.addressRow}>
            <View style={styles.addressCity}>
              <FormField label="City" value={form.city} onChangeText={(v) => update("city", v)} />
            </View>
            <View style={styles.addressProvince}>
              <FormField label="Province" value={form.province} onChangeText={(v) => update("province", v)} />
            </View>
          </View>
          <View style={styles.addressRow}>
            <View style={styles.addressCity}>
              <FormField label="Postal Code" value={form.postalCode} onChangeText={(v) => update("postalCode", v)} />
            </View>
            <View style={styles.addressProvince}>
              <FormField label="Country" value={form.country} onChangeText={(v) => update("country", v)} />
            </View>
          </View>
        </SectionCard>

        {/* ── Terms & Billing ── */}
        <SectionCard title="Terms & Billing" icon="dollarsign.circle.fill" iconColor="#16A34A">
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }] as TextStyle[]}>Payment Terms</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {TERMS_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.chip,
                    { backgroundColor: form.terms === t ? "#16A34A" : "#16A34A18", borderColor: "#16A34A" },
                  ] as ViewStyle[]}
                  onPress={() => update("terms", t)}
                >
                  <Text style={[styles.chipText, { color: form.terms === t ? "#fff" : "#16A34A" }] as TextStyle[]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SectionCard>

        {/* ── Tags ── */}
        <SectionCard title="Tags & Classification" icon="tag.fill" iconColor="#8B5CF6">
          <View style={styles.tagsGrid}>
            {COMMON_TAGS.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: active ? "#8B5CF6" : "#8B5CF618", borderColor: "#8B5CF6" },
                  ] as ViewStyle[]}
                  onPress={() => toggleTag(tag)}
                >
                  {active && <IconSymbol name="checkmark" size={11} color="#fff" />}
                  <Text style={[styles.tagChipText, { color: active ? "#fff" : "#8B5CF6" }] as TextStyle[]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Notes ── */}
        <SectionCard title="Notes" icon="note.text" iconColor="#F59E0B">
          <FormField
            label="Internal Notes"
            value={form.notes}
            onChangeText={(v) => update("notes", v)}
            placeholder="Add internal notes about this customer..."
            multiline
          />
        </SectionCard>

        {/* ── Save / Delete Buttons ── */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.88 : 1 }] as ViewStyle[]}
            onPress={handleSave}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{isNew ? "Create Customer" : "Save Changes"}</Text>
          </Pressable>
          {!isNew && (
            <Pressable
              style={({ pressed }) => [styles.deleteFullBtn, { opacity: pressed ? 0.88 : 1 }] as ViewStyle[]}
              onPress={handleDelete}
            >
              <IconSymbol name="trash.fill" size={16} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Delete Customer</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 60 },
  deleteBtn: { padding: 6 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 3,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500" },

  // Status
  statusRow: {
    flexDirection: "row", gap: 8, marginHorizontal: 14, marginTop: 14,
    borderRadius: 14, padding: 12,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statusChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", borderWidth: 1,
  },
  statusChipText: { fontSize: 12, fontWeight: "700" },

  // Section Card
  sectionCard: {
    marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 14,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "700" },

  // Form Fields
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 6, letterSpacing: 0.3 },
  fieldInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 42,
  },
  fieldMultiline: { minHeight: 90, textAlignVertical: "top" },

  // Address
  sameAddressRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5, marginBottom: 12,
  },
  sameAddressLabel: { fontSize: 13, fontWeight: "500" },
  addressRow: { flexDirection: "row", gap: 10 },
  addressCity: { flex: 2 },
  addressProvince: { flex: 1 },

  // Chips
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },

  // Tags
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  tagChipText: { fontSize: 12, fontWeight: "600" },

  // Actions
  actions: { marginHorizontal: 14, marginTop: 20, gap: 10 },
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
