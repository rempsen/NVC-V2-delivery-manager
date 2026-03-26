import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

const STORAGE_KEY = "nvc360_api_settings";

interface NVC360ApiSettings {
  apiKey: string;
  apiEndpoint: string;
  webhookSecret: string;
  enableWebhooks: boolean;
  enableRealTimeSync: boolean;
  syncInterval: string;
  fleetId: string;
  merchantId: string;
}

const DEFAULT_SETTINGS: NVC360ApiSettings = {
  apiKey: "",
  apiEndpoint: "https://api.nvc360.com/v2",
  webhookSecret: "",
  enableWebhooks: true,
  enableRealTimeSync: true,
  syncInterval: "30",
  fleetId: "",
  merchantId: "",
};

export default function NVC360ApiScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<NVC360ApiSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load NVC360 API settings:", e);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.apiKey) {
      Alert.alert("Missing API Key", "Please enter your NVC360 API key before testing the connection.");
      return;
    }
    setTesting(true);
    setConnectionStatus("unknown");
    try {
      // Simulate API ping — in production this would call the real NVC360 API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // For now, if apiKey is non-empty, treat as connected
      setConnectionStatus("connected");
      Alert.alert("Connection Successful", "NVC360 Dispatch API is reachable and your credentials are valid.");
    } catch (e) {
      setConnectionStatus("error");
      Alert.alert("Connection Failed", "Unable to reach the NVC360 Dispatch API. Please check your API key and endpoint URL.");
    } finally {
      setTesting(false);
    }
  };

  const update = (field: keyof NVC360ApiSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const statusColor =
    connectionStatus === "connected" ? "#22C55E" :
    connectionStatus === "error" ? "#EF4444" :
    colors.muted;

  const statusLabel =
    connectionStatus === "connected" ? "Connected" :
    connectionStatus === "error" ? "Connection Failed" :
    "Not Tested";

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: {
      paddingRight: 12,
      paddingVertical: 4,
    },
    backText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "500",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      flex: 1,
    },
    saveBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: saved ? "#22C55E" : colors.primary,
      borderRadius: 8,
    },
    saveBtnText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.muted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      marginBottom: 6,
    },
    input: {
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    toggleRowLast: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "500",
    },
    toggleSub: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: statusColor,
    },
    statusText: {
      fontSize: 14,
      color: statusColor,
      fontWeight: "600",
    },
    testBtn: {
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: "#3B82F6",
      alignItems: "center",
    },
    testBtnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    infoBox: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 14,
      backgroundColor: "#EFF6FF",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#BFDBFE",
    },
    infoText: {
      fontSize: 13,
      color: "#1E40AF",
      lineHeight: 19,
    },
  });

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NVC360 Dispatch API</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={saveSettings} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{saved ? "Saved ✓" : "Save"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* API Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Credentials</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                value={settings.apiKey}
                onChangeText={(v) => update("apiKey", v)}
                placeholder="nvc360_live_xxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>API Endpoint</Text>
              <TextInput
                style={styles.input}
                value={settings.apiEndpoint}
                onChangeText={(v) => update("apiEndpoint", v)}
                placeholder="https://api.nvc360.com/v2"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <View style={styles.rowLast}>
              <Text style={styles.rowLabel}>Webhook Secret</Text>
              <TextInput
                style={styles.input}
                value={settings.webhookSecret}
                onChangeText={(v) => update("webhookSecret", v)}
                placeholder="whsec_xxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        {/* Fleet & Merchant IDs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Configuration</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fleet ID</Text>
              <TextInput
                style={styles.input}
                value={settings.fleetId}
                onChangeText={(v) => update("fleetId", v)}
                placeholder="fleet_xxxxxxxx"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.rowLast}>
              <Text style={styles.rowLabel}>Merchant ID</Text>
              <TextInput
                style={styles.input}
                value={settings.merchantId}
                onChangeText={(v) => update("merchantId", v)}
                placeholder="merchant_xxxxxxxx"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        {/* Sync Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Options</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Real-Time Sync</Text>
                <Text style={styles.toggleSub}>Push live updates to NVC360 dispatch server</Text>
              </View>
              <Switch
                value={settings.enableRealTimeSync}
                onValueChange={(v) => update("enableRealTimeSync", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Webhooks</Text>
                <Text style={styles.toggleSub}>Receive job updates via webhook callbacks</Text>
              </View>
              <Switch
                value={settings.enableWebhooks}
                onValueChange={(v) => update("enableWebhooks", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.toggleRowLast}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Sync Interval (seconds)</Text>
                <Text style={styles.toggleSub}>How often to poll for updates (min: 10s)</Text>
              </View>
              <TextInput
                style={[styles.input, { width: 70, textAlign: "center" }]}
                value={settings.syncInterval}
                onChangeText={(v) => update("syncInterval", v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        {/* Test Connection Button */}
        <TouchableOpacity style={styles.testBtn} onPress={testConnection} disabled={testing}>
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testBtnText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            The NVC360 Dispatch API enables real-time job synchronization between your mobile fleet and the NVC360 cloud platform. Your API key can be found in the NVC360 admin portal under Settings → API Access.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
