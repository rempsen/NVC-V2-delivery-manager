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
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";

// ─── Compact List Row ─────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  danger,
  rightElement,
  isFirst,
  isLast,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const colors = useColors();
  const accentColor = danger ? "#EF4444" : iconColor;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderTopLeftRadius: isFirst ? 14 : 0,
          borderTopRightRadius: isFirst ? 14 : 0,
          borderBottomLeftRadius: isLast ? 14 : 0,
          borderBottomRightRadius: isLast ? 14 : 0,
          opacity: pressed && onPress ? 0.82 : 1,
        },
      ] as ViewStyle[]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      {/* Icon badge */}
      <View style={[styles.rowIcon, { backgroundColor: accentColor + "18" }] as ViewStyle[]}>
        <IconSymbol name={icon} size={16} color={accentColor} />
      </View>

      {/* Label + value */}
      <View style={styles.rowContent}>
        <Text
          style={[styles.rowLabel, { color: danger ? "#EF4444" : colors.foreground }] as TextStyle[]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>

      {/* Right element (switch) or chevron */}
      {rightElement ? (
        <View style={styles.rowRight}>{rightElement}</View>
      ) : onPress ? (
        <View style={styles.rowRight}>
          <IconSymbol name="chevron.right" size={12} color={colors.muted} />
        </View>
      ) : null}

      {/* Separator line (not on last row) */}
      {!isLast && (
        <View style={[styles.rowSeparator, { backgroundColor: colors.border }] as ViewStyle[]} />
      )}
    </Pressable>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {children}
    </View>
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }] as ViewStyle[]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360 2.0</Text>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Card ── */}
        <Pressable
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: NVC_BLUE, opacity: pressed ? 0.92 : 1 },
          ] as ViewStyle[]}
          onPress={() => router.push("/settings/edit-profile" as any)}
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
        <SettingsSection>
          <SettingsRow isFirst icon="building.2.fill" iconColor="#3B82F6" label="Company Profile" value="NVC360" onPress={() => router.push("/settings/company-profile" as any)} />
          <SettingsRow icon="person.badge.plus" iconColor="#8B5CF6" label="Manage Technicians" value="10 active" onPress={() => router.push("/agents")} />
          <SettingsRow icon="doc.text.fill" iconColor="#22C55E" label="Workflow Templates" value="8 templates" onPress={() => router.push("/settings/workflow-templates" as any)} />
          <SettingsRow icon="dollarsign.circle.fill" iconColor="#F59E0B" label="Pricing & Billing" value="4 rules active" onPress={() => router.push("/pricing" as any)} />
          <SettingsRow isLast icon="tag.fill" iconColor={NVC_ORANGE} label="White-Label Branding" value="NVC360 theme" onPress={() => router.push("/settings/white-label" as any)} />
        </SettingsSection>

        {/* ── Integrations ── */}
        <SectionLabel title="Integrations" />
        <SettingsSection>
          <SettingsRow isFirst icon="arrow.triangle.2.circlepath" iconColor="#3B82F6" label="All Integrations" value="2 connected" onPress={() => router.push("/integrations" as any)} />
          <SettingsRow icon="location.fill" iconColor={NVC_ORANGE} label="Dispatch API" value="Connected" onPress={() => router.push("/settings/nvc360-api" as any)} />
          <SettingsRow icon="message.fill" iconColor="#22C55E" label="SMS (Twilio)" value="Configured" onPress={() => router.push("/settings/sms-twilio" as any)} />
          <SettingsRow icon="envelope.fill" iconColor="#8B5CF6" label="Email (SMTP)" value="nvc360.com" onPress={() => router.push("/settings/email-smtp" as any)} />
          <SettingsRow isLast icon="map.fill" iconColor="#F59E0B" label="Mapbox API" value="Configured" onPress={() => router.push("/settings/mapbox-api" as any)} />
        </SettingsSection>

        {/* ── Notifications ── */}
        <SectionLabel title="Notifications" />
        <SettingsSection>
          <SettingsRow
            isFirst
            icon="bell.fill" iconColor={NVC_ORANGE} label="Push Notifications"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: NVC_BLUE }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="message.fill" iconColor="#22C55E" label="SMS Alerts"
            rightElement={
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                trackColor={{ false: colors.border, true: "#22C55E" }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow isLast icon="bell.badge.fill" iconColor="#8B5CF6" label="Notification Settings" value="Milestones & templates" onPress={() => router.push("/notification-settings" as any)} />
        </SettingsSection>

        {/* ── Security ── */}
        <SectionLabel title="Security & Permissions" />
        <SettingsSection>
          <SettingsRow isFirst icon="shield.fill" iconColor={NVC_ORANGE} label="Roles & Permissions" value="7 roles · 31 perms" onPress={() => router.push("/permissions" as any)} />
          <SettingsRow isLast icon="key.fill" iconColor="#F59E0B" label="Authentication" value="Google · Apple · Email" onPress={() => router.push("/login" as any)} />
        </SettingsSection>

        {/* ── Tracking ── */}
        <SectionLabel title="Tracking" />
        <SettingsSection>
          <SettingsRow
            isFirst
            icon="location.fill" iconColor="#3B82F6" label="Geo Clock-In/Out" value="20m radius"
            rightElement={
              <Switch
                value={geoClockEnabled}
                onValueChange={setGeoClockEnabled}
                trackColor={{ false: colors.border, true: "#3B82F6" }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow icon="gauge.medium" iconColor="#8B5CF6" label="Distance Tracking" value="Auto (GPS)" onPress={() => router.push("/settings/tracking-settings" as any)} />
          <SettingsRow isLast icon="timer" iconColor="#F59E0B" label="Time-on-Site" value="Enabled" onPress={() => router.push("/settings/tracking-settings" as any)} />
        </SettingsSection>

        {/* ── Appearance ── */}
        <SectionLabel title="Appearance" />
        <SettingsSection>
          <SettingsRow
            isFirst isLast
            icon="moon.fill" iconColor="#6B7280" label="Dark Mode"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: NVC_BLUE }}
                thumbColor="#fff"
              />
            }
          />
        </SettingsSection>

        {/* ── NVC360 Admin ── */}
        <SectionLabel title="NVC360 Admin" />
        <SettingsSection>
          <SettingsRow isFirst icon="map.fill" iconColor={NVC_ORANGE} label="Dispatcher Dashboard" value="Live Fleet View" onPress={() => router.push("/dispatcher" as any)} />
          <SettingsRow icon="building.2.fill" iconColor="#8B5CF6" label="Super Admin" value="Manage All Clients" onPress={() => router.push("/super-admin" as any)} />
          <SettingsRow isLast icon="location.fill" iconColor="#3B82F6" label="Customer Tracking" value="SMS Link Preview" onPress={() => router.push("/track/JH-2026-8821" as any)} />
        </SettingsSection>

        {/* ── Support ── */}
        <SectionLabel title="Support" />
        <SettingsSection>
          <SettingsRow isFirst icon="questionmark.circle.fill" iconColor="#3B82F6" label="Help & Docs" onPress={() => Linking.openURL("https://www.nvc360.com")} />
          <SettingsRow icon="info.circle.fill" iconColor="#6B7280" label="About NVC360" value="v2.0.0" onPress={() => Alert.alert("NVC360 2.0", "Field Service Management Platform\nVersion 2.0.0\n\n© 2026 NVC360. All rights reserved.")} />
          <SettingsRow isLast icon="star.fill" iconColor="#F59E0B" label="Rate the App" onPress={() => Linking.openURL("https://www.nvc360.com")} />
        </SettingsSection>

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <SettingsSection>
          <SettingsRow isFirst isLast icon="lock.fill" iconColor="#EF4444" label="Sign Out" danger onPress={handleLogout} />
        </SettingsSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }] as TextStyle[]}>NVC360 2.0 · Powered by NVC360.com</Text>
          <Text style={[styles.footerText, { color: colors.muted }] as TextStyle[]}>© 2026 NVC360. All rights reserved.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 26, height: 26 },
  headerLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.65)", letterSpacing: 0.8, textTransform: "uppercase" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.2 },

  scroll: { paddingBottom: 52 },

  // Profile Card
  profileCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 14, marginTop: 14, borderRadius: 16, padding: 14, gap: 12,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 7,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
  },
  profileInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },
  profileRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)" },
  profileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 3,
  },
  profileBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  profileEdit: { padding: 6 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.0, textTransform: "uppercase",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },

  // Section container (groups rows with shared rounded corners)
  section: {
    marginHorizontal: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // Compact row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 52,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 1,
  },
  rowLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  rowValue: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  rowRight: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSeparator: {
    position: "absolute",
    bottom: 0,
    left: 58,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },

  // Footer
  footer: { alignItems: "center", paddingTop: 20, gap: 4 },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
