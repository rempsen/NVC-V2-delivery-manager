import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, ViewStyle, TextStyle, Alert, Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsSettings {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
  sendOnEnRoute: boolean;
  sendOnArrival: boolean;
  sendOnComplete: boolean;
  sendOnFailed: boolean;
  customMessage: string;
}

const DEFAULT_SETTINGS: SmsSettings = {
  accountSid: "",
  authToken: "",
  phoneNumber: "",
  enabled: true,
  sendOnEnRoute: true,
  sendOnArrival: false,
  sendOnComplete: true,
  sendOnFailed: false,
  customMessage: "Hi {customer_name}, your technician {tech_name} is {status} for job #{order_ref}.",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmsTwilioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenantId } = useTenant();

  const [settings, setSettings] = useState<SmsSettings>(DEFAULT_SETTINGS);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);

  // Load tenant SMS config from server
  const { isLoading, data: publicConfig } = trpc.system.getPublicConfig.useQuery(undefined);
  React.useEffect(() => {
    if ((publicConfig as any)?.twilioConfigured) {
      setSettings(prev => ({ ...prev, enabled: true }));
    }
  }, [publicConfig]);

  const updateTenantMutation = trpc.tenants.update.useMutation();
  const sendTestSmsMutation = trpc.notifications.sendTestSms.useMutation({
    onSuccess: () => {
      setTesting(false);
      setShowTestModal(false);
      Alert.alert("Test Sent", `Test SMS sent to ${testPhone}. Check your phone.`);
    },
    onError: (err: any) => {
      setTesting(false);
      Alert.alert("Test Failed", err?.message ?? "Could not send test SMS. Check your credentials.");
    },
  });

  const handleSave = useCallback(async () => {
    if (!settings.accountSid || !settings.authToken || !settings.phoneNumber) {
      Alert.alert("Missing Fields", "Please fill in Account SID, Auth Token, and Phone Number.");
      return;
    }
    setSaving(true);
    try {
      // Store Twilio credentials in the branding JSON blob (tenant-level config)
      await updateTenantMutation.mutateAsync({
        id: tenantId ?? 0,
        branding: {
          twilioAccountSid: settings.accountSid,
          twilioAuthToken: settings.authToken,
          twilioPhoneNumber: settings.phoneNumber,
          smsEnabled: settings.enabled,
          sendOnEnRoute: settings.sendOnEnRoute,
          sendOnArrival: settings.sendOnArrival,
          sendOnComplete: settings.sendOnComplete,
          sendOnFailed: settings.sendOnFailed,
          smsTemplate: settings.customMessage,
        },
      });
      Alert.alert("Saved", "Twilio SMS credentials saved successfully.");
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message ?? "Could not save credentials.");
    } finally {
      setSaving(false);
    }
  }, [settings, tenantId, updateTenantMutation]);

  const handleSendTest = useCallback(() => {
    if (!testPhone.trim()) {
      Alert.alert("Phone Required", "Enter a phone number to send the test to.");
      return;
    }
    setTesting(true);
    sendTestSmsMutation.mutate({ phone: testPhone, tenantId: tenantId ?? 0 } as any);
  }, [testPhone, tenantId, sendTestSmsMutation]);

  const update = (key: keyof SmsSettings, value: any) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }] as ViewStyle[]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SMS (Twilio)</Text>
          <Text style={styles.headerSubtitle}>Automated customer notifications</Text>
        </View>
        <View style={[styles.statusBadge, settings.accountSid ? styles.statusConnected : styles.statusDisconnected] as ViewStyle[]}>
          <Text style={styles.statusText}>{settings.accountSid ? "Configured" : "Not Set"}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconSymbol name="info.circle.fill" size={16} color="#3B82F6" />
          <Text style={styles.infoText}>
            NVC360 sends automated SMS to customers when technicians are en route, on-site, or complete a job. Powered by Twilio.
          </Text>
        </View>

        {/* Credentials */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Twilio Credentials</Text>
          <Text style={styles.cardSubtitle}>
            Get these from{" "}
            <Text style={styles.link}>console.twilio.com</Text>
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account SID</Text>
            <TextInput
              style={styles.input}
              value={settings.accountSid}
              onChangeText={v => update("accountSid", v)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Auth Token</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }] as TextStyle[]}
                value={settings.authToken}
                onChangeText={v => update("authToken", v)}
                placeholder="Your auth token"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showAuthToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
                onPress={() => setShowAuthToken(p => !p)}
              >
                <IconSymbol name={showAuthToken ? "eye.slash.fill" : "eye.fill"} size={18} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Twilio Phone Number</Text>
            <TextInput
              style={styles.input}
              value={settings.phoneNumber}
              onChangeText={v => update("phoneNumber", v)}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldHint}>Must be a Twilio-purchased number in E.164 format</Text>
          </View>
        </View>

        {/* Notification Triggers */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send SMS When</Text>
          {([
            { key: "sendOnEnRoute", label: "Technician is en route", icon: "car.fill" },
            { key: "sendOnArrival", label: "Technician arrives on-site", icon: "mappin.circle.fill" },
            { key: "sendOnComplete", label: "Job is completed", icon: "checkmark.circle.fill" },
            { key: "sendOnFailed", label: "Job is marked failed", icon: "xmark.circle.fill" },
          ] as { key: keyof SmsSettings; label: string; icon: string }[]).map(item => (
            <View key={item.key} style={styles.toggleRow}>
              <IconSymbol name={item.icon as any} size={18} color={NVC_BLUE} />
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                value={settings[item.key] as boolean}
                onValueChange={v => update(item.key, v)}
                trackColor={{ false: "#E5E7EB", true: NVC_BLUE }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Message Template */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message Template</Text>
          <Text style={styles.cardSubtitle}>
            Available variables: {"{customer_name}"}, {"{tech_name}"}, {"{status}"}, {"{order_ref}"}, {"{eta}"}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea] as TextStyle[]}
            value={settings.customMessage}
            onChangeText={v => update("customMessage", v)}
            multiline
            numberOfLines={4}
            placeholder="Enter SMS message template..."
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.charCount}>{settings.customMessage.length} / 160 characters</Text>
        </View>

        {/* Test SMS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test SMS</Text>
          <Text style={styles.cardSubtitle}>Send a test message to verify your configuration</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }] as TextStyle[]}
              value={testPhone}
              onChangeText={setTestPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Pressable
              style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
              onPress={handleSendTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.testBtnText}>Send Test</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Twilio Settings</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: NVC_BLUE, paddingHorizontal: 16, paddingBottom: 16,
  } as ViewStyle,
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  headerCenter: { flex: 1 } as ViewStyle,
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 } as TextStyle,
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  } as ViewStyle,
  statusConnected: { backgroundColor: "#10B981" } as ViewStyle,
  statusDisconnected: { backgroundColor: "#6B7280" } as ViewStyle,
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  infoBanner: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderLeftColor: "#3B82F6",
  } as ViewStyle,
  infoText: { flex: 1, fontSize: 13, color: "#1E40AF", lineHeight: 19 } as TextStyle,
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12,
  } as ViewStyle,
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" } as TextStyle,
  cardSubtitle: { fontSize: 12, color: "#6B7280", marginTop: -6 } as TextStyle,
  link: { color: NVC_BLUE, textDecorationLine: "underline" } as TextStyle,
  field: { gap: 6 } as ViewStyle,
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" } as TextStyle,
  fieldHint: { fontSize: 11, color: "#9CA3AF" } as TextStyle,
  input: {
    borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: "#111827", backgroundColor: "#F9FAFB",
  } as TextStyle,
  textArea: { minHeight: 90, textAlignVertical: "top" } as TextStyle,
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right" } as TextStyle,
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" } as ViewStyle,
  eyeBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F3F4F6", borderRadius: 10,
  } as ViewStyle,
  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 4,
  } as ViewStyle,
  toggleLabel: { flex: 1, fontSize: 14, color: "#374151" } as TextStyle,
  testBtn: {
    backgroundColor: "#10B981", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  testBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" } as TextStyle,
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: NVC_BLUE, borderRadius: 14,
    paddingVertical: 14, marginTop: 4,
  } as ViewStyle,
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" } as TextStyle,
});
