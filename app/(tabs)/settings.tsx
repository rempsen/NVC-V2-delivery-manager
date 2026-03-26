import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, Switch, StyleSheet,
  Linking, Alert, Image, ViewStyle, TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT } from "@/constants/brand";

// ─── Setting Row ──────────────────────────────────────────────────────────────

function SettingRow({
  icon, iconColor, label, value, onPress, rightElement, danger,
}: {
  icon: any; iconColor: string; label: string; value?: string;
  onPress?: () => void; rightElement?: React.ReactNode; danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, opacity: pressed && onPress ? 0.78 : 1 },
      ] as ViewStyle[]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "18" }] as ViewStyle[]}>
        <IconSymbol name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? "#EF4444" : colors.foreground }] as TextStyle[]}>
          {label}
        </Text>
        {value && <Text style={[styles.rowValue, { color: colors.muted }] as TextStyle[]}>{value}</Text>}
      </View>
      {rightElement ?? (onPress && <IconSymbol name="chevron.right" size={14} color={colors.muted} />)}
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.muted }] as TextStyle[]}>
      {title.toUpperCase()}
    </Text>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [geoClockEnabled, setGeoClockEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => router.replace("/login") },
    ]);
  };

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }] as ViewStyle[]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Card ── */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.92 : 1 }] as ViewStyle[]}
          onPress={() => {}}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>D</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Dan Rosenblat</Text>
            <Text style={styles.profileRole}>NVC360 Admin · Dispatcher</Text>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>Professional Plan</Text>
            </View>
          </View>
          <View style={styles.profileEdit}>
            <IconSymbol name="pencil" size={15} color="rgba(255,255,255,0.8)" />
          </View>
        </Pressable>

        {/* ── Company ── */}
        <SectionLabel title="Company" />
        <Group>
          <SettingRow icon="building.2.fill" iconColor="#3B82F6" label="Company Profile" value="NVC360" onPress={() => {}} />
          <SettingRow icon="person.badge.plus" iconColor="#8B5CF6" label="Manage Technicians" value="10 active" onPress={() => router.push("/agents")} />
          <SettingRow icon="doc.text.fill" iconColor="#22C55E" label="Workflow Templates" value="8 templates · 20 field types" onPress={() => router.push("/settings/workflow-templates" as any)} />
          <SettingRow icon="dollarsign.circle.fill" iconColor="#F59E0B" label="Pricing & Billing Rules" value="4 rules active" onPress={() => router.push("/pricing" as any)} />
          <SettingRow icon="tag.fill" iconColor={NVC_ORANGE} label="White-Label Branding" value="NVC360 theme" onPress={() => {}} />
        </Group>

        {/* ── Integrations ── */}
        <SectionLabel title="Integrations" />
        <Group>
          <SettingRow icon="arrow.triangle.2.circlepath" iconColor="#3B82F6" label="All Integrations" value="2 connected" onPress={() => router.push("/integrations" as any)} />
          <SettingRow icon="location.fill" iconColor={NVC_ORANGE} label="NVC360 Dispatch API" value="Connected" onPress={() => router.push("/integrations" as any)} />
          <SettingRow icon="message.fill" iconColor="#22C55E" label="SMS Provider (Twilio)" value="Configured" onPress={() => router.push("/integrations" as any)} />
          <SettingRow icon="envelope.fill" iconColor="#8B5CF6" label="Email (SMTP)" value="nvc360.com" onPress={() => {}} />
          <SettingRow icon="map.fill" iconColor="#F59E0B" label="Mapbox API Key" value="Configured" onPress={() => {}} />
        </Group>

        {/* ── Notifications ── */}
        <SectionLabel title="Notifications" />
        <Group>
          <SettingRow
            icon="bell.fill" iconColor={NVC_ORANGE} label="Push Notifications"
            rightElement={
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: NVC_BLUE }} thumbColor="#fff" />
            }
          />
          <SettingRow
            icon="message.fill" iconColor="#22C55E" label="SMS Milestone Alerts"
            rightElement={
              <Switch value={smsEnabled} onValueChange={setSmsEnabled}
                trackColor={{ false: colors.border, true: "#22C55E" }} thumbColor="#fff" />
            }
          />
          <SettingRow icon="bell.badge.fill" iconColor="#8B5CF6" label="Notification Settings" value="Configure milestones & templates" onPress={() => router.push("/notification-settings" as any)} />
        </Group>

        {/* ── Security ── */}
        <SectionLabel title="Security & Permissions" />
        <Group>
          <SettingRow icon="shield.fill" iconColor={NVC_ORANGE} label="Roles & Permissions" value="7 roles · 31 permissions" onPress={() => router.push("/permissions" as any)} />
          <SettingRow icon="key.fill" iconColor="#F59E0B" label="Login & Authentication" value="Google · Apple · Email" onPress={() => router.push("/login" as any)} />
        </Group>

        {/* ── Tracking ── */}
        <SectionLabel title="Tracking" />
        <Group>
          <SettingRow
            icon="location.fill" iconColor="#3B82F6" label="Geo Clock-In / Clock-Out" value="20m radius"
            rightElement={
              <Switch value={geoClockEnabled} onValueChange={setGeoClockEnabled}
                trackColor={{ false: colors.border, true: "#3B82F6" }} thumbColor="#fff" />
            }
          />
          <SettingRow icon="gauge.medium" iconColor="#8B5CF6" label="Distance Tracking" value="Auto (GPS)" onPress={() => {}} />
          <SettingRow icon="timer" iconColor="#F59E0B" label="Time-on-Site Tracking" value="Enabled" onPress={() => {}} />
        </Group>

        {/* ── Appearance ── */}
        <SectionLabel title="Appearance" />
        <Group>
          <SettingRow
            icon="moon.fill" iconColor="#6B7280" label="Dark Mode"
            rightElement={
              <Switch value={darkMode} onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: NVC_BLUE }} thumbColor="#fff" />
            }
          />
        </Group>

        {/* ── NVC360 Admin ── */}
        <SectionLabel title="NVC360 Admin" />
        <Group>
          <SettingRow icon="map.fill" iconColor={NVC_ORANGE} label="Dispatcher Dashboard" value="Live Fleet View" onPress={() => router.push("/dispatcher" as any)} />
          <SettingRow icon="building.2.fill" iconColor="#8B5CF6" label="Super Admin" value="Manage All Clients" onPress={() => router.push("/super-admin" as any)} />
          <SettingRow icon="location.fill" iconColor="#3B82F6" label="Customer Tracking Demo" value="SMS Link Preview" onPress={() => router.push("/track/JH-2026-8821" as any)} />
        </Group>

        {/* ── Support ── */}
        <SectionLabel title="Support" />
        <Group>
          <SettingRow icon="questionmark.circle.fill" iconColor="#3B82F6" label="Help & Documentation" onPress={() => Linking.openURL("https://www.nvc360.com")} />
          <SettingRow icon="info.circle.fill" iconColor="#6B7280" label="App Version" value="NVC360 2.0 (Build 1)" />
        </Group>

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <Group>
          <SettingRow icon="lock.fill" iconColor="#EF4444" label="Sign Out" danger onPress={handleLogout} />
        </Group>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }] as TextStyle[]}>NVC360 2.0 · Powered by NVC360.com</Text>
          <Text style={[styles.footerText, { color: colors.muted }] as TextStyle[]}>© 2026 NVC360. All rights reserved.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  header: ViewStyle; headerLeft: ViewStyle; headerLogo: ViewStyle; headerTitle: TextStyle;
  scroll: ViewStyle;
  profileCard: ViewStyle; profileAvatar: ViewStyle; profileInitial: TextStyle;
  profileInfo: ViewStyle; profileName: TextStyle; profileRole: TextStyle;
  profileBadge: ViewStyle; profileBadgeText: TextStyle; profileEdit: ViewStyle;
  sectionLabel: TextStyle; group: ViewStyle;
  row: ViewStyle; rowIcon: ViewStyle; rowContent: ViewStyle; rowLabel: TextStyle; rowValue: TextStyle;
  footer: ViewStyle; footerText: TextStyle;
}>({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 26, height: 26 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },

  scroll: { paddingBottom: 40 },

  // Profile Card
  profileCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 14, marginTop: 14, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
  },
  profileInitial: { fontSize: 20, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#fff" },
  profileRole: { fontSize: 12, color: "rgba(255,255,255,0.72)" },
  profileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2,
  },
  profileBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  profileEdit: { padding: 6 },

  // Section
  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 7,
  },
  group: {
    marginHorizontal: 14, borderRadius: 14, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },

  // Row
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)",
  },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "500" },
  rowValue: { fontSize: 12, marginTop: 1 },

  // Footer
  footer: { alignItems: "center", paddingTop: 20, gap: 4 },
  footerText: { fontSize: 11 },
});
