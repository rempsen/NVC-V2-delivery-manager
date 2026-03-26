import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView, Linking,
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

const STORAGE_KEY = "nvc360_mapbox_api";

export default function MapboxApiScreen() {
  const colors = useColors();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [showKey, setShowKey] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [styleUrl, setStyleUrl] = useState("mapbox://styles/mapbox/streets-v12");
  const [defaultLat, setDefaultLat] = useState("49.8951");
  const [defaultLng, setDefaultLng] = useState("-97.1384");
  const [defaultZoom, setDefaultZoom] = useState("11");

  // Load server-configured token first, then fall back to AsyncStorage override
  const { data: serverConfig } = trpc.system.getPublicConfig.useQuery(undefined, {
    staleTime: Infinity,
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const config = JSON.parse(stored);
          setApiKey(config.apiKey ?? "");
          setStyleUrl(config.styleUrl ?? "mapbox://styles/mapbox/streets-v12");
          setDefaultLat(config.defaultLat ?? "49.8951");
          setDefaultLng(config.defaultLng ?? "-97.1384");
          setDefaultZoom(config.defaultZoom ?? "11");
        } else if (serverConfig?.mapboxAccessToken) {
          // Pre-populate from server env var (read-only display)
          setApiKey(serverConfig.mapboxAccessToken);
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    };
    if (serverConfig !== undefined) {
      loadConfig();
    }
  }, [serverConfig]);

  // If server has a token and no local override, show it as pre-configured
  const isServerConfigured = !!(serverConfig?.mapboxAccessToken && !apiKey.startsWith("pk.") === false);
  const isConfigured = apiKey.startsWith("pk.") && apiKey.length > 20;

  const handleTest = async () => {
    const keyToTest = apiKey.trim() || serverConfig?.mapboxAccessToken;
    if (!keyToTest) {
      Alert.alert("API Key Required", "Please enter your Mapbox public token first.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTesting(true);
    setTestStatus("idle");
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/Winnipeg.json?access_token=${keyToTest}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          setTestStatus("success");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Connection Successful ✓", "Your Mapbox API key is valid and working. Live maps are active.");
        } else {
          setTestStatus("error");
          Alert.alert("Invalid Response", "The API key returned an unexpected response.");
        }
      } else {
        setTestStatus("error");
        const err = await res.json().catch(() => ({}));
        Alert.alert("Connection Failed", (err as any).message ?? `HTTP ${res.status}: Invalid API key or insufficient permissions.`);
      }
    } catch {
      setTestStatus("error");
      Alert.alert("Network Error", "Could not reach Mapbox servers. Check your internet connection.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Required", "Please enter your Mapbox public token.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const config = { apiKey: apiKey.trim(), styleUrl, defaultLat, defaultLng, defaultZoom };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Mapbox configuration saved. Maps will use your API key.", [
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
        <NVCHeader title="Mapbox API" showBack />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Configured status banner */}
          {isConfigured && (
            <View style={[styles.configuredBanner, { backgroundColor: "#22C55E12", borderColor: "#22C55E30" }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#22C55E" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.configuredTitle, { color: "#22C55E" }]}>Mapbox Configured</Text>
                <Text style={[styles.configuredSub, { color: "#22C55E" }]}>
                  Live fleet maps, technician tracking, and customer ETA pages are active.
                </Text>
              </View>
            </View>
          )}

          {/* Info */}
          <View style={[styles.infoBanner, { backgroundColor: NVC_BLUE + "12", borderColor: NVC_BLUE + "30" }]}>
            <IconSymbol name="map.fill" size={18} color={NVC_BLUE} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.infoText, { color: NVC_BLUE }]}>
                Mapbox powers the live fleet map, technician tracking, and customer ETA pages.
              </Text>
              <Pressable onPress={() => Linking.openURL("https://account.mapbox.com/access-tokens/")}>
                <Text style={[styles.infoLink, { color: NVC_BLUE }]}>
                  Manage tokens at account.mapbox.com →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* API Key */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>API Key</Text>
            {!loaded ? (
              <ActivityIndicator color={NVC_BLUE} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>PUBLIC ACCESS TOKEN</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: isConfigured ? "#22C55E50" : colors.border }]}>
                  <TextInput
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ..."
                    placeholderTextColor={colors.muted + "60"}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.foreground }]}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                    <IconSymbol name={showKey ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  Use a public token (starts with "pk.") — never share your secret token
                </Text>
              </View>
            )}

            {/* Status indicator */}
            {testStatus !== "idle" && (
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: testStatus === "success" ? "#22C55E10" : "#EF444410",
                  borderColor: testStatus === "success" ? "#22C55E30" : "#EF444430",
                },
              ]}>
                <IconSymbol
                  name={testStatus === "success" ? "checkmark.circle.fill" : "xmark.circle.fill"}
                  size={16}
                  color={testStatus === "success" ? "#22C55E" : "#EF4444"}
                />
                <Text style={{ color: testStatus === "success" ? "#22C55E" : "#EF4444", fontSize: 13, fontWeight: "600" }}>
                  {testStatus === "success" ? "API key verified — live maps active" : "API key invalid or connection failed"}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleTest}
              disabled={testing}
              style={({ pressed }) => [
                styles.testBtn,
                { borderColor: NVC_BLUE },
                pressed && { opacity: 0.7 },
              ]}
            >
              {testing ? (
                <ActivityIndicator color={NVC_BLUE} size="small" />
              ) : (
                <>
                  <IconSymbol name="wifi" size={16} color={NVC_BLUE} />
                  <Text style={[styles.testBtnText, { color: NVC_BLUE }]}>Test Connection</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Map Style */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Map Style</Text>
            {[
              { label: "Streets (Default)", value: "mapbox://styles/mapbox/streets-v12" },
              { label: "Light", value: "mapbox://styles/mapbox/light-v11" },
              { label: "Dark", value: "mapbox://styles/mapbox/dark-v11" },
              { label: "Satellite Streets", value: "mapbox://styles/mapbox/satellite-streets-v12" },
              { label: "Navigation Day", value: "mapbox://styles/mapbox/navigation-day-v1" },
            ].map((style) => (
              <Pressable
                key={style.value}
                onPress={() => setStyleUrl(style.value)}
                style={[styles.styleOption, { borderBottomColor: colors.border }]}
              >
                <View style={[
                  styles.styleRadio,
                  {
                    borderColor: styleUrl === style.value ? NVC_BLUE : colors.border,
                    backgroundColor: styleUrl === style.value ? NVC_BLUE : "transparent",
                  },
                ]} />
                <Text style={[styles.styleLabel, { color: colors.foreground }]}>{style.label}</Text>
                {styleUrl === style.value && (
                  <View style={[styles.activeTag, { backgroundColor: NVC_BLUE + "15" }]}>
                    <Text style={{ color: NVC_BLUE, fontSize: 11, fontWeight: "700" }}>Active</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Default Location */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Default Map Center</Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              The map will open centered on this location when no active jobs are visible.
            </Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>LATITUDE</Text>
                  <TextInput
                    value={defaultLat}
                    onChangeText={setDefaultLat}
                    placeholder="49.8951"
                    placeholderTextColor={colors.muted + "60"}
                    keyboardType="decimal-pad"
                    style={[styles.inputSimple, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>LONGITUDE</Text>
                  <TextInput
                    value={defaultLng}
                    onChangeText={setDefaultLng}
                    placeholder="-97.1384"
                    placeholderTextColor={colors.muted + "60"}
                    keyboardType="decimal-pad"
                    style={[styles.inputSimple, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>DEFAULT ZOOM (1–22)</Text>
              <TextInput
                value={defaultZoom}
                onChangeText={setDefaultZoom}
                placeholder="11"
                placeholderTextColor={colors.muted + "60"}
                keyboardType="number-pad"
                style={[styles.inputSimple, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              />
            </View>
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
                <Text style={styles.saveBtnText}>Save Mapbox Settings</Text>
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
  configuredBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  configuredTitle: { fontSize: 14, fontWeight: "700" },
  configuredSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  infoLink: { fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardSub: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  eyeBtn: { padding: 6 },
  inputSimple: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 48 },
  hint: { fontSize: 11, lineHeight: 15 },
  row: { flexDirection: "row", gap: 10 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 8,
  },
  testBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginTop: 8,
  },
  testBtnText: { fontSize: 15, fontWeight: "700" },
  styleOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 0.5,
  },
  styleRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  styleLabel: { flex: 1, fontSize: 14 },
  activeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
