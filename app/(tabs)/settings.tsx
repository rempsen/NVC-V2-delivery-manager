import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

function SettingRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed && onPress ? 0.75 : 1 },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "20" }]}>
        <IconSymbol name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.foreground }]}>{label}</Text>
        {value && <Text style={[styles.rowValue, { color: colors.muted }]}>{value}</Text>}
      </View>
      {rightElement ?? (onPress && <IconSymbol name="chevron.right" size={16} color={colors.muted} />)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.muted }]}>{title.toUpperCase()}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [geoClockEnabled, setGeoClockEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => {} },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>D</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Dan Rosenblat</Text>
            <Text style={styles.profileRole}>NVC360 Admin · Dispatcher</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editProfileBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => {}}
          >
            <IconSymbol name="pencil" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Company */}
        <SectionHeader title="Company" />
        <View style={styles.group}>
          <SettingRow
            icon="building.2.fill"
            iconColor="#3B82F6"
            label="Company Profile"
            value="NVC360"
            onPress={() => {}}
          />
          <SettingRow
            icon="person.badge.plus"
            iconColor="#8B5CF6"
            label="Manage Technicians"
            onPress={() => router.push("/agents")}
          />
          <SettingRow
            icon="doc.text.fill"
            iconColor="#22C55E"
            label="Workflow Templates"
            onPress={() => router.push("/templates" as any)}
          />
          <SettingRow
            icon="dollarsign.circle.fill"
            iconColor="#F59E0B"
            label="Pricing & Billing Rules"
            onPress={() => router.push("/pricing" as any)}
          />
          <SettingRow
            icon="tag.fill"
            iconColor="#E85D04"
            label="White-Label Branding"
            onPress={() => {}}
          />
        </View>

        {/* Integrations */}
        <SectionHeader title="Integrations" />
        <View style={styles.group}>
          <SettingRow
            icon="arrow.triangle.2.circlepath"
            iconColor="#3B82F6"
            label="All Integrations"
            value="2 connected"
            onPress={() => router.push("/integrations" as any)}
          />
          <SettingRow
            icon="location.fill"
            iconColor="#E85D04"
            label="Tookan API"
            value="Connected"
            onPress={() => router.push("/integrations" as any)}
          />
          <SettingRow
            icon="message.fill"
            iconColor="#22C55E"
            label="SMS Provider (Twilio)"
            value="Configured"
            onPress={() => router.push("/integrations" as any)}
          />
          <SettingRow
            icon="envelope.fill"
            iconColor="#8B5CF6"
            label="Email (SMTP)"
            value="nvc360.com"
            onPress={() => {}}
          />
          <SettingRow
            icon="map.fill"
            iconColor="#F59E0B"
            label="Mapbox API Key"
            value="Configured"
            onPress={() => {}}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.group}>
          <SettingRow
            icon="bell.fill"
            iconColor="#E85D04"
            label="Push Notifications"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            icon="message.fill"
            iconColor="#22C55E"
            label="SMS Milestone Alerts"
            rightElement={
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            icon="bell.badge.fill"
            iconColor="#8B5CF6"
            label="Notification Settings"
            value="Configure milestones & templates"
            onPress={() => router.push("/notification-settings" as any)}
          />
        </View>

        {/* Security & Permissions */}
        <SectionHeader title="Security & Permissions" />
        <View style={styles.group}>
          <SettingRow
            icon="shield.fill"
            iconColor="#E85D04"
            label="Roles & Permissions"
            value="7 roles · 31 permissions"
            onPress={() => router.push("/permissions" as any)}
          />
          <SettingRow
            icon="key.fill"
            iconColor="#F59E0B"
            label="Login & Authentication"
            value="Google · Apple · Email"
            onPress={() => router.push("/login" as any)}
          />
        </View>

        {/* Geo & Tracking */}
        <SectionHeader title="Tracking" />
        <View style={styles.group}>
          <SettingRow
            icon="location.fill"
            iconColor="#3B82F6"
            label="Geo Clock-In / Clock-Out"
            value="20m radius"
            rightElement={
              <Switch
                value={geoClockEnabled}
                onValueChange={setGeoClockEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            icon="gauge.medium"
            iconColor="#8B5CF6"
            label="Distance Tracking"
            value="Auto (GPS)"
            onPress={() => {}}
          />
          <SettingRow
            icon="timer"
            iconColor="#F59E0B"
            label="Time-on-Site Tracking"
            value="Enabled"
            onPress={() => {}}
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <View style={styles.group}>
          <SettingRow
            icon="eye.fill"
            iconColor="#6B7280"
            label="Dark Mode"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.group}>
          <SettingRow
            icon="questionmark.circle.fill"
            iconColor="#3B82F6"
            label="Help & Documentation"
            onPress={() => Linking.openURL("https://www.nvc360.com")}
          />
          <SettingRow
            icon="info.circle.fill"
            iconColor="#6B7280"
            label="App Version"
            value="NVC360 2.0 (Build 1)"
          />
        </View>

        {/* NVC360 Admin */}
        <SectionHeader title="NVC360 Admin" />
        <View style={styles.group}>
          <SettingRow
            icon="map.fill"
            iconColor="#E85D04"
            label="Dispatcher Dashboard"
            value="Live Fleet View"
            onPress={() => router.push("/dispatcher" as any)}
          />
          <SettingRow
            icon="building.2.fill"
            iconColor="#8B5CF6"
            label="Super Admin"
            value="Manage All Clients"
            onPress={() => router.push("/super-admin" as any)}
          />
          <SettingRow
            icon="location.fill"
            iconColor="#3B82F6"
            label="Customer Tracking Demo"
            value="SMS Link Preview"
            onPress={() => router.push("/track/JH-2026-8821" as any)}
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.group}>
          <SettingRow
            icon="lock.fill"
            iconColor="#EF4444"
            label="Sign Out"
            danger
            onPress={handleLogout}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            NVC360 2.0 · Powered by NVC360.com
          </Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            © 2026 NVC360. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  scroll: { paddingBottom: 40 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { fontSize: 22, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#fff" },
  profileRole: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  editProfileBtn: { padding: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  group: { marginHorizontal: 16, borderRadius: 14, overflow: "hidden", gap: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 0,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowValue: { fontSize: 12, marginTop: 1 },
  footer: { alignItems: "center", paddingTop: 24, gap: 4 },
  footerText: { fontSize: 12 },
});
