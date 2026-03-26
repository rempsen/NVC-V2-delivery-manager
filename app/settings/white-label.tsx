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
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nvc360_white_label";

const PRESET_COLORS = [
  { label: "NVC Blue", value: "#1E6FBF" },
  { label: "NVC Orange", value: "#F97316" },
  { label: "Midnight", value: "#1E293B" },
  { label: "Emerald", value: "#059669" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Rose", value: "#E11D48" },
  { label: "Amber", value: "#D97706" },
  { label: "Teal", value: "#0D9488" },
];

function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  hint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted + "60"}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
            minHeight: 48,
          },
        ]}
        returnKeyType="next"
      />
      {hint && <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>}
    </View>
  );
}

export default function WhiteLabelScreen() {
  const colors = useColors();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [brandName, setBrandName] = useState("NVC360");
  const [senderName, setSenderName] = useState("NVC360 Dispatch");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1E6FBF");
  const [accentColor, setAccentColor] = useState("#F97316");
  const [customDomain, setCustomDomain] = useState("");
  const [supportEmail, setSupportEmail] = useState("support@nvc360.com");
  const [footerText, setFooterText] = useState("Powered by NVC360");
  const [hideNvcBranding, setHideNvcBranding] = useState(false);

  const handleSave = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const config = {
        brandName, senderName, logoUrl, faviconUrl,
        primaryColor, accentColor, customDomain,
        supportEmail, footerText, hideNvcBranding,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "White-label branding updated successfully.", [
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
        <NVCHeader title="White-Label Branding" showBack />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Preview Banner */}
          <View style={[styles.previewBanner, { backgroundColor: primaryColor }]}>
            <View style={styles.previewLeft}>
              <View style={[styles.previewLogoBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <IconSymbol name="building.2.fill" size={20} color="#fff" />
              </View>
              <Text style={styles.previewBrandName}>{brandName || "Your Brand"}</Text>
            </View>
            <Text style={styles.previewTag}>Preview</Text>
          </View>

          {/* Brand Identity */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Brand Identity</Text>
            <SettingsField
              label="Brand / Company Name"
              value={brandName}
              onChangeText={setBrandName}
              placeholder="Your Company Name"
              hint="Shown in app headers, emails, and customer-facing pages"
            />
            <SettingsField
              label="SMS Sender Name"
              value={senderName}
              onChangeText={setSenderName}
              placeholder="YourBrand Dispatch"
              hint="Shown as the sender in outgoing SMS messages (max 11 chars for alphanumeric)"
            />
            <SettingsField
              label="Logo URL"
              value={logoUrl}
              onChangeText={setLogoUrl}
              placeholder="https://yourcompany.com/logo.png"
              keyboardType="url"
              hint="Direct link to your logo image (PNG or SVG, transparent background recommended)"
            />
            <SettingsField
              label="Favicon URL"
              value={faviconUrl}
              onChangeText={setFaviconUrl}
              placeholder="https://yourcompany.com/favicon.ico"
              keyboardType="url"
              hint="32×32 or 64×64 icon for browser tabs"
            />
          </View>

          {/* Colors */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Brand Colors</Text>
            <Text style={[styles.colorSectionLabel, { color: colors.muted }]}>PRIMARY COLOR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setPrimaryColor(c.value)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value },
                    primaryColor === c.value && styles.colorSwatchSelected,
                  ]}
                >
                  {primaryColor === c.value && (
                    <IconSymbol name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
            <SettingsField
              label="Custom Primary Color (Hex)"
              value={primaryColor}
              onChangeText={setPrimaryColor}
              placeholder="#1E6FBF"
              hint="Used for headers, buttons, and primary UI elements"
            />
            <Text style={[styles.colorSectionLabel, { color: colors.muted }]}>ACCENT COLOR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setAccentColor(c.value)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value },
                    accentColor === c.value && styles.colorSwatchSelected,
                  ]}
                >
                  {accentColor === c.value && (
                    <IconSymbol name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
            <SettingsField
              label="Custom Accent Color (Hex)"
              value={accentColor}
              onChangeText={setAccentColor}
              placeholder="#F97316"
              hint="Used for CTAs, badges, and highlights"
            />
          </View>

          {/* Domain & Comms */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Domain & Communications</Text>
            <SettingsField
              label="Custom Domain"
              value={customDomain}
              onChangeText={setCustomDomain}
              placeholder="app.yourcompany.com"
              keyboardType="url"
              hint="Point your domain to NVC360 servers (CNAME setup required)"
            />
            <SettingsField
              label="Support Email"
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="support@yourcompany.com"
              keyboardType="email-address"
              hint="Shown in customer-facing emails and tracking pages"
            />
            <SettingsField
              label="Footer Text"
              value={footerText}
              onChangeText={setFooterText}
              placeholder="Powered by Your Company"
              hint="Shown at the bottom of customer-facing pages and emails"
            />
          </View>

          {/* NVC Branding toggle */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>NVC360 Branding</Text>
            <Pressable
              onPress={() => setHideNvcBranding(!hideNvcBranding)}
              style={styles.toggleRow}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                  Hide "Powered by NVC360"
                </Text>
                <Text style={[styles.toggleSub, { color: colors.muted }]}>
                  Remove NVC360 branding from customer-facing pages (Professional plan required)
                </Text>
              </View>
              <View style={[
                styles.toggleSwitch,
                { backgroundColor: hideNvcBranding ? NVC_BLUE : colors.border },
              ]}>
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: hideNvcBranding ? 20 : 2 }] },
                ]} />
              </View>
            </Pressable>
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
                <Text style={styles.saveBtnText}>Save Branding</Text>
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
  previewBanner: {
    borderRadius: 14, padding: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  previewLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewLogoBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  previewBrandName: { fontSize: 16, fontWeight: "800", color: "#fff" },
  previewTag: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  hint: { fontSize: 11, lineHeight: 15 },
  colorSectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 4, marginBottom: 8 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  colorSwatchSelected: {
    borderWidth: 3, borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 12, lineHeight: 16 },
  toggleSwitch: {
    width: 44, height: 26, borderRadius: 13,
    justifyContent: "center", padding: 2,
  },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
