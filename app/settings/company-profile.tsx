import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE } from "@/constants/brand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

const STORAGE_KEY = "nvc360_company_profile";

const TIMEZONES = [
  "America/Winnipeg",
  "America/Toronto",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const INDUSTRIES = [
  "Field Service",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Construction",
  "Delivery & Logistics",
  "IT Services",
  "Cleaning Services",
  "Landscaping",
  "Property Management",
  "Healthcare",
  "Other",
];

function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  required?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label}
        {required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted + "60"}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
            minHeight: multiline ? 80 : 48,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
        returnKeyType={multiline ? undefined : "next"}
      />
    </View>
  );
}

function PickerField({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: open ? NVC_BLUE : colors.border }]}
      >
        <Text style={[styles.pickerBtnText, { color: value ? colors.foreground : colors.muted }]}>
          {value || `Select ${label}`}
        </Text>
        <IconSymbol name={open ? "chevron.up" : "chevron.down"} size={16} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => { onSelect(opt); setOpen(false); }}
              style={[
                styles.pickerOption,
                { borderBottomColor: colors.border },
                value === opt && { backgroundColor: NVC_BLUE + "12" },
              ]}
            >
              <Text style={[styles.pickerOptionText, { color: value === opt ? NVC_BLUE : colors.foreground }]}>
                {opt}
              </Text>
              {value === opt && <IconSymbol name="checkmark" size={14} color={NVC_BLUE} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CompanyProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tenantId } = useTenant();
  const updateOwnMutation = trpc.tenants.updateOwn.useMutation();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("NVC360");
  const [tagline, setTagline] = useState("Field Service Management Platform");
  const [phone, setPhone] = useState("+1 (204) 555-0100");
  const [email, setEmail] = useState("admin@nvc360.com");
  const [website, setWebsite] = useState("https://www.nvc360.com");
  const [address, setAddress] = useState("123 Main Street");
  const [city, setCity] = useState("Winnipeg");
  const [province, setProvince] = useState("MB");
  const [postalCode, setPostalCode] = useState("R3C 0A1");
  const [country, setCountry] = useState("Canada");
  const [timezone, setTimezone] = useState("America/Winnipeg");
  const [industry, setIndustry] = useState("Field Service");
  const [taxId, setTaxId] = useState("");

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert("Required", "Company name is required.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const profile = {
        companyName, tagline, phone, email, website,
        address, city, province, postalCode, country,
        timezone, industry, taxId,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      // Persist company name and contact info to the live DB
      if (tenantId) {
        await updateOwnMutation.mutateAsync({
          tenantId,
          companyName: companyName.trim(),
          emailDomain: email.trim() || undefined,
          branding: { tagline, phone, website, address, city, province, postalCode, country, timezone, industry, taxId },
        });
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Company profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <NVCHeader title="Company Profile" showBack />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Identity */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Company Identity</Text>

            {/* Avatar placeholder */}
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: NVC_BLUE + "20" }]}>
                <IconSymbol name="building.2.fill" size={32} color={NVC_BLUE} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.avatarLabel, { color: colors.foreground }]}>{companyName}</Text>
                <Pressable
                  style={[styles.uploadBtn, { borderColor: colors.border }]}
                  onPress={() => Alert.alert("Upload Logo", "Logo upload requires camera/gallery permissions. This will be enabled in the production build.")}
                >
                  <IconSymbol name="arrow.up.doc.fill" size={14} color={NVC_BLUE} />
                  <Text style={[styles.uploadBtnText, { color: NVC_BLUE }]}>Upload Logo</Text>
                </Pressable>
              </View>
            </View>

            <SettingsField label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="NVC360" required />
            <SettingsField label="Tagline / Description" value={tagline} onChangeText={setTagline} placeholder="What does your company do?" multiline />
            <PickerField label="Industry" value={industry} options={INDUSTRIES} onSelect={setIndustry} />
            <SettingsField label="Tax ID / Business Number" value={taxId} onChangeText={setTaxId} placeholder="123456789" />
          </View>

          {/* Contact */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Contact Information</Text>
            <SettingsField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 (204) 555-0000" keyboardType="phone-pad" />
            <SettingsField label="Email Address" value={email} onChangeText={setEmail} placeholder="admin@yourcompany.com" keyboardType="email-address" />
            <SettingsField label="Website" value={website} onChangeText={setWebsite} placeholder="https://www.yourcompany.com" keyboardType="url" />
          </View>

          {/* Address */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Business Address</Text>
            <SettingsField label="Street Address" value={address} onChangeText={setAddress} placeholder="123 Main Street" />
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <SettingsField label="City" value={city} onChangeText={setCity} placeholder="Winnipeg" />
              </View>
              <View style={{ flex: 1 }}>
                <SettingsField label="Province / State" value={province} onChangeText={setProvince} placeholder="MB" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SettingsField label="Postal Code" value={postalCode} onChangeText={setPostalCode} placeholder="R3C 0A1" />
              </View>
              <View style={{ flex: 1 }}>
                <SettingsField label="Country" value={country} onChangeText={setCountry} placeholder="Canada" />
              </View>
            </View>
          </View>

          {/* Regional */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Regional Settings</Text>
            <PickerField label="Time Zone" value={timezone} options={TIMEZONES} onSelect={setTimezone} />
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: NVC_BLUE },
              pressed && { opacity: 0.85 },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Company Profile</Text>
              </>
            )}
          </Pressable>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarLabel: { fontSize: 16, fontWeight: "700" },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start",
  },
  uploadBtnText: { fontSize: 12, fontWeight: "600" },
  pickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 48,
  },
  pickerBtnText: { fontSize: 15, flex: 1 },
  pickerDropdown: {
    borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  pickerOptionText: { fontSize: 14 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
