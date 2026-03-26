import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, Switch,
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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

const STORAGE_KEY = "nvc360_tracking_settings";

const GPS_MODES = [
  { id: "high", label: "High Accuracy", sub: "Uses GPS + cell towers. Best precision, higher battery use.", icon: "location.fill" as const, color: "#22C55E" },
  { id: "balanced", label: "Balanced", sub: "GPS with power optimization. Recommended for most use cases.", icon: "location.circle.fill" as const, color: NVC_BLUE },
  { id: "low_power", label: "Low Power", sub: "Cell towers only. Saves battery, less precise.", icon: "battery.25" as const, color: NVC_ORANGE },
];

const DISTANCE_UNITS = [
  { id: "km", label: "Kilometres (km)" },
  { id: "mi", label: "Miles (mi)" },
];

const UPDATE_INTERVALS = [
  { id: "5", label: "Every 5 seconds" },
  { id: "10", label: "Every 10 seconds" },
  { id: "30", label: "Every 30 seconds" },
  { id: "60", label: "Every minute" },
];

const MIN_THRESHOLDS = [
  { id: "1", label: "1 minute" },
  { id: "5", label: "5 minutes" },
  { id: "10", label: "10 minutes" },
  { id: "15", label: "15 minutes" },
  { id: "30", label: "30 minutes" },
];

const ALERT_THRESHOLDS = [
  { id: "30", label: "30 minutes" },
  { id: "60", label: "1 hour" },
  { id: "90", label: "1.5 hours" },
  { id: "120", label: "2 hours" },
  { id: "180", label: "3 hours" },
  { id: "240", label: "4 hours" },
];

function RadioGroup({
  options,
  value,
  onSelect,
}: {
  options: { id: string; label: string; sub?: string; icon?: any; color?: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onSelect(opt.id)}
          style={[
            styles.radioRow,
            {
              backgroundColor: value === opt.id ? NVC_BLUE + "08" : colors.background,
              borderColor: value === opt.id ? NVC_BLUE : colors.border,
            },
          ]}
        >
          {opt.icon && (
            <View style={[styles.radioIcon, { backgroundColor: (opt.color ?? NVC_BLUE) + "15" }]}>
              <IconSymbol name={opt.icon} size={18} color={opt.color ?? NVC_BLUE} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.radioLabel, { color: colors.foreground }]}>{opt.label}</Text>
            {opt.sub && <Text style={[styles.radioSub, { color: colors.muted }]}>{opt.sub}</Text>}
          </View>
          <View style={[
            styles.radioCircle,
            {
              borderColor: value === opt.id ? NVC_BLUE : colors.border,
              backgroundColor: value === opt.id ? NVC_BLUE : "transparent",
            },
          ]}>
            {value === opt.id && <View style={styles.radioInner} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onSelect,
}: {
  options: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onSelect(opt.id)}
          style={[
            styles.chip,
            {
              backgroundColor: value === opt.id ? NVC_BLUE : colors.background,
              borderColor: value === opt.id ? NVC_BLUE : colors.border,
            },
          ]}
        >
          <Text style={[styles.chipText, { color: value === opt.id ? "#fff" : colors.foreground }]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onValueChange,
  color,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  color?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.toggleSub, { color: colors.muted }]}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: color ?? NVC_BLUE }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function TrackingSettingsScreen() {
  const { tenantId } = useTenant();
  const updateOwnMutation = trpc.tenants.updateOwn.useMutation();
  const colors = useColors();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Distance Tracking
  const [distanceEnabled, setDistanceEnabled] = useState(true);
  const [gpsMode, setGpsMode] = useState("balanced");
  const [distanceUnit, setDistanceUnit] = useState("km");
  const [updateInterval, setUpdateInterval] = useState("10");
  const [minMovement, setMinMovement] = useState(true);
  const [minMovementMeters, setMinMovementMeters] = useState("50");
  const [showDistanceOnTask, setShowDistanceOnTask] = useState(true);
  const [includeInInvoice, setIncludeInInvoice] = useState(true);

  // Time-on-Site
  const [timeOnSiteEnabled, setTimeOnSiteEnabled] = useState(true);
  const [autoStartOnArrival, setAutoStartOnArrival] = useState(true);
  const [autoStopOnComplete, setAutoStopOnComplete] = useState(true);
  const [minThreshold, setMinThreshold] = useState("5");
  const [alertThreshold, setAlertThreshold] = useState("120");
  const [alertDispatcher, setAlertDispatcher] = useState(true);
  const [alertTech, setAlertTech] = useState(false);
  const [showOnCustomerPage, setShowOnCustomerPage] = useState(false);

  const handleSave = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const config = {
        distanceEnabled, gpsMode, distanceUnit, updateInterval,
        minMovement, minMovementMeters, showDistanceOnTask, includeInInvoice,
        timeOnSiteEnabled, autoStartOnArrival, autoStopOnComplete,
        minThreshold, alertThreshold, alertDispatcher, alertTech, showOnCustomerPage,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // Persist tracking settings to the live DB under branding.tracking
      if (tenantId) {
        await updateOwnMutation.mutateAsync({
          tenantId,
          branding: { tracking: config },
        });
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Tracking settings updated successfully.", [
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
      <NVCHeader title="Tracking Settings" showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Distance Tracking ── */}
        <View style={[styles.sectionHeader, { backgroundColor: NVC_BLUE }]}>
          <IconSymbol name="gauge.medium" size={18} color="#fff" />
          <Text style={styles.sectionTitle}>Distance Tracking</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Enable Distance Tracking"
            sub="Automatically record kilometres/miles driven per job"
            value={distanceEnabled}
            onValueChange={setDistanceEnabled}
          />
        </View>

        {distanceEnabled && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>GPS Mode</Text>
              <RadioGroup options={GPS_MODES} value={gpsMode} onSelect={setGpsMode} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Distance Unit</Text>
              <ChipGroup options={DISTANCE_UNITS} value={distanceUnit} onSelect={setDistanceUnit} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Location Update Interval</Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                How often the app records a new GPS position while a job is active.
              </Text>
              <ChipGroup options={UPDATE_INTERVALS} value={updateInterval} onSelect={setUpdateInterval} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Display & Billing</Text>
              <ToggleRow
                label="Show Distance on Task Detail"
                sub="Display km/mi driven on the work order screen"
                value={showDistanceOnTask}
                onValueChange={setShowDistanceOnTask}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToggleRow
                label="Include Distance in Invoice"
                sub="Add distance charges to auto-generated invoices"
                value={includeInInvoice}
                onValueChange={setIncludeInInvoice}
              />
            </View>
          </>
        )}

        {/* ── Time-on-Site ── */}
        <View style={[styles.sectionHeader, { backgroundColor: NVC_ORANGE }]}>
          <IconSymbol name="timer" size={18} color="#fff" />
          <Text style={styles.sectionTitle}>Time-on-Site</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Enable Time-on-Site Tracking"
            sub="Record how long technicians spend at each job location"
            value={timeOnSiteEnabled}
            onValueChange={setTimeOnSiteEnabled}
            color={NVC_ORANGE}
          />
        </View>

        {timeOnSiteEnabled && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Automation</Text>
              <ToggleRow
                label="Auto-Start on Arrival"
                sub="Timer starts automatically when technician geo-clocks in"
                value={autoStartOnArrival}
                onValueChange={setAutoStartOnArrival}
                color={NVC_ORANGE}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToggleRow
                label="Auto-Stop on Job Complete"
                sub="Timer stops when technician marks the job as complete"
                value={autoStopOnComplete}
                onValueChange={setAutoStopOnComplete}
                color={NVC_ORANGE}
              />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Minimum Time Threshold</Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                Ignore visits shorter than this duration (prevents accidental clock-ins).
              </Text>
              <ChipGroup options={MIN_THRESHOLDS} value={minThreshold} onSelect={setMinThreshold} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Overtime Alert</Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                Send an alert when a technician has been on-site longer than expected.
              </Text>
              <ChipGroup options={ALERT_THRESHOLDS} value={alertThreshold} onSelect={setAlertThreshold} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Alert Recipients</Text>
              <ToggleRow
                label="Notify Dispatcher"
                sub="Send push notification to the dispatcher when threshold is exceeded"
                value={alertDispatcher}
                onValueChange={setAlertDispatcher}
                color={NVC_ORANGE}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToggleRow
                label="Notify Technician"
                sub="Send reminder to the technician themselves"
                value={alertTech}
                onValueChange={setAlertTech}
                color={NVC_ORANGE}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToggleRow
                label="Show on Customer Tracking Page"
                sub="Display time-on-site to customers on the live tracking link"
                value={showOnCustomerPage}
                onValueChange={setShowOnCustomerPage}
                color={NVC_ORANGE}
              />
            </View>
          </>
        )}

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
              <Text style={styles.saveBtnText}>Save Tracking Settings</Text>
            </>
          )}
        </Pressable>
        <View style={{ height: 32 }} />
      </ScrollView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, lineHeight: 16 },
  divider: { height: 0.5, marginVertical: 4 },
  radioRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, padding: 12, borderWidth: 1.5,
  },
  radioIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  radioLabel: { fontSize: 14, fontWeight: "600" },
  radioSub: { fontSize: 12, lineHeight: 16 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 12, lineHeight: 16 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
