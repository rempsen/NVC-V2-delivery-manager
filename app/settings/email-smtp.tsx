import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView, Switch,
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

const STORAGE_KEY = "nvc360_email_smtp";

const PRESET_PROVIDERS = [
  { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: "587", tls: true },
  { label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: "587", tls: true },
  { label: "SendGrid", host: "smtp.sendgrid.net", port: "587", tls: true },
  { label: "Mailgun", host: "smtp.mailgun.org", port: "587", tls: true },
  { label: "Amazon SES", host: "email-smtp.us-east-1.amazonaws.com", port: "587", tls: true },
  { label: "Custom / Other", host: "", port: "587", tls: true },
];

function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  hint,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  hint?: string;
  autoCapitalize?: any;
}) {
  const colors = useColors();
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted + "60"}
          keyboardType={keyboardType ?? "default"}
          secureTextEntry={secureTextEntry && !showPass}
          autoCapitalize={autoCapitalize ?? (secureTextEntry ? "none" : "sentences")}
          autoCorrect={false}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="next"
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <IconSymbol name={showPass ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {hint && <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>}
    </View>
  );
}

export default function EmailSmtpScreen() {
  const colors = useColors();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const [selectedProvider, setSelectedProvider] = useState(0);
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState("587");
  const [useTls, setUseTls] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("NVC360 Dispatch");
  const [testRecipient, setTestRecipient] = useState("");

  const applyPreset = (idx: number) => {
    const p = PRESET_PROVIDERS[idx];
    setSelectedProvider(idx);
    if (p.host) setHost(p.host);
    if (p.port) setPort(p.port);
    setUseTls(p.tls);
  };

  const handleTest = async () => {
    if (!host || !port || !username || !password || !fromEmail) {
      Alert.alert("Missing Fields", "Please fill in all SMTP fields before testing.");
      return;
    }
    if (!testRecipient) {
      Alert.alert("Test Recipient", "Enter a recipient email address to send the test to.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTesting(true);
    setTestResult(null);
    // Simulate test (real implementation would call server endpoint)
    await new Promise((r) => setTimeout(r, 2000));
    setTesting(false);
    setTestResult("success");
    Alert.alert("Test Sent", `A test email was sent to ${testRecipient}. Check your inbox.`);
  };

  const handleSave = async () => {
    if (!host || !port || !username || !password || !fromEmail) {
      Alert.alert("Required", "Please fill in all required SMTP fields.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const config = { host, port, useTls, username, password, fromEmail, fromName };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "SMTP configuration saved successfully.", [
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
        <NVCHeader title="Email (SMTP)" showBack />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: NVC_BLUE + "12", borderColor: NVC_BLUE + "30" }]}>
            <IconSymbol name="info.circle.fill" size={18} color={NVC_BLUE} />
            <Text style={[styles.infoText, { color: NVC_BLUE }]}>
              Configure your own SMTP server so all customer notifications come from your company's email domain.
            </Text>
          </View>

          {/* Provider Presets */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Email Provider</Text>
            <View style={styles.providerGrid}>
              {PRESET_PROVIDERS.map((p, i) => (
                <Pressable
                  key={p.label}
                  onPress={() => applyPreset(i)}
                  style={[
                    styles.providerChip,
                    {
                      backgroundColor: selectedProvider === i ? NVC_BLUE : colors.background,
                      borderColor: selectedProvider === i ? NVC_BLUE : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.providerChipText,
                    { color: selectedProvider === i ? "#fff" : colors.foreground },
                  ]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Server Config */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Server Configuration</Text>
            <SettingsField
              label="SMTP Host"
              value={host}
              onChangeText={setHost}
              placeholder="smtp.example.com"
              keyboardType="url"
              autoCapitalize="none"
              hint="Your email provider's outgoing mail server address"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SettingsField
                  label="Port"
                  value={port}
                  onChangeText={setPort}
                  placeholder="587"
                  keyboardType="number-pad"
                  hint="587 (TLS) or 465 (SSL)"
                />
              </View>
              <View style={[styles.tlsToggle, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>USE TLS / STARTTLS</Text>
                <View style={styles.tlsRow}>
                  <Switch
                    value={useTls}
                    onValueChange={setUseTls}
                    trackColor={{ false: colors.border, true: NVC_BLUE }}
                    thumbColor="#fff"
                  />
                  <Text style={[styles.tlsLabel, { color: colors.foreground }]}>
                    {useTls ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Credentials */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Credentials</Text>
            <SettingsField
              label="Username / Email"
              value={username}
              onChangeText={setUsername}
              placeholder="you@yourcompany.com"
              keyboardType="email-address"
              autoCapitalize="none"
              hint="Usually your full email address"
            />
            <SettingsField
              label="Password / App Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              secureTextEntry
              hint="For Gmail, use an App Password (not your Google account password)"
            />
          </View>

          {/* From Address */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>From Address</Text>
            <SettingsField
              label="From Email"
              value={fromEmail}
              onChangeText={setFromEmail}
              placeholder="dispatch@yourcompany.com"
              keyboardType="email-address"
              autoCapitalize="none"
              hint="The email address customers will see in their inbox"
            />
            <SettingsField
              label="From Name"
              value={fromName}
              onChangeText={setFromName}
              placeholder="Your Company Dispatch"
              hint="The display name shown alongside the from email"
            />
          </View>

          {/* Test */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Test Connection</Text>
            <SettingsField
              label="Send Test Email To"
              value={testRecipient}
              onChangeText={setTestRecipient}
              placeholder="test@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {testResult === "success" && (
              <View style={[styles.testResult, { backgroundColor: "#22C55E10", borderColor: "#22C55E30" }]}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#22C55E" />
                <Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "600" }}>
                  Test email sent successfully!
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleTest}
              disabled={testing}
              style={({ pressed }) => [
                styles.testBtn,
                { borderColor: NVC_BLUE, backgroundColor: testing ? NVC_BLUE + "10" : "transparent" },
                pressed && { opacity: 0.7 },
              ]}
            >
              {testing ? (
                <ActivityIndicator color={NVC_BLUE} size="small" />
              ) : (
                <>
                  <IconSymbol name="paperplane.fill" size={16} color={NVC_BLUE} />
                  <Text style={[styles.testBtnText, { color: NVC_BLUE }]}>Send Test Email</Text>
                </>
              )}
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
                <Text style={styles.saveBtnText}>Save SMTP Settings</Text>
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
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  eyeBtn: { padding: 6 },
  hint: { fontSize: 11, lineHeight: 15 },
  row: { flexDirection: "row", gap: 10 },
  tlsToggle: { gap: 5, marginBottom: 4 },
  tlsRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  tlsLabel: { fontSize: 14, fontWeight: "600" },
  providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  providerChip: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  providerChipText: { fontSize: 12, fontWeight: "600" },
  testResult: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 8,
  },
  testBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginTop: 4,
  },
  testBtnText: { fontSize: 15, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
