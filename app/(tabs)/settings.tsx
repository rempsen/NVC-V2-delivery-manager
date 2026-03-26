import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, Switch, StyleSheet,
  Linking, Alert, Image, ViewStyle, TextStyle, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT } from "@/constants/brand";

// ─── Grid Tile ────────────────────────────────────────────────────────────────

function GridTile({
  icon,
  iconColor,
  label,
  value,
  onPress,
  danger,
  rightElement,
  tileWidth,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  tileWidth: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { width: tileWidth, backgroundColor: colors.surface, opacity: pressed && onPress ? 0.82 : 1 },
      ] as ViewStyle[]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      {/* Icon */}
      <View style={[styles.tileIcon, { backgroundColor: (danger ? "#EF4444" : iconColor) + "18" }] as ViewStyle[]}>
        <IconSymbol name={icon} size={20} color={danger ? "#EF4444" : iconColor} />
      </View>
      {/* Label */}
      <Text
        style={[styles.tileLabel, { color: danger ? "#EF4444" : colors.foreground }] as TextStyle[]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {/* Value or switch */}
      {rightElement ? (
        <View style={styles.tileSwitchWrap}>{rightElement}</View>
      ) : value ? (
        <Text style={[styles.tileValue, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {/* Chevron for navigable tiles */}
      {onPress && !rightElement && (
        <View style={styles.tileChevron}>
          <IconSymbol name="chevron.right" size={11} color={colors.muted} />
        </View>
      )}
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

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [geoClockEnabled, setGeoClockEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Responsive: 2 cols on narrow, 3 on wide mobile/tablet, 4 on desktop
  const numCols = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const H_PAD = 14;
  const GAP = 10;
  const tileWidth = (width - H_PAD * 2 - GAP * (numCols - 1)) / numCols;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => router.replace("/login") },
    ]);
  };

  // Helper to render a row of tiles
  const TileGrid = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.tileGrid, { gap: GAP, paddingHorizontal: H_PAD }] as ViewStyle[]}>
      {children}
    </View>
  );

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }] as ViewStyle[]}>
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
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="building.2.fill" iconColor="#3B82F6" label="Company Profile" value="NVC360" onPress={() => {}} />
          <GridTile tileWidth={tileWidth} icon="person.badge.plus" iconColor="#8B5CF6" label="Manage Technicians" value="10 active" onPress={() => router.push("/agents")} />
          <GridTile tileWidth={tileWidth} icon="doc.text.fill" iconColor="#22C55E" label="Workflow Templates" value="8 templates" onPress={() => router.push("/settings/workflow-templates" as any)} />
          <GridTile tileWidth={tileWidth} icon="dollarsign.circle.fill" iconColor="#F59E0B" label="Pricing & Billing" value="4 rules active" onPress={() => router.push("/pricing" as any)} />
          <GridTile tileWidth={tileWidth} icon="tag.fill" iconColor={NVC_ORANGE} label="White-Label Branding" value="NVC360 theme" onPress={() => {}} />
        </TileGrid>

        {/* ── Integrations ── */}
        <SectionLabel title="Integrations" />
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="arrow.triangle.2.circlepath" iconColor="#3B82F6" label="All Integrations" value="2 connected" onPress={() => router.push("/integrations" as any)} />
          <GridTile tileWidth={tileWidth} icon="location.fill" iconColor={NVC_ORANGE} label="Dispatch API" value="Connected" onPress={() => router.push("/integrations" as any)} />
          <GridTile tileWidth={tileWidth} icon="message.fill" iconColor="#22C55E" label="SMS (Twilio)" value="Configured" onPress={() => router.push("/integrations" as any)} />
          <GridTile tileWidth={tileWidth} icon="envelope.fill" iconColor="#8B5CF6" label="Email (SMTP)" value="nvc360.com" onPress={() => {}} />
          <GridTile tileWidth={tileWidth} icon="map.fill" iconColor="#F59E0B" label="Mapbox API" value="Configured" onPress={() => {}} />
        </TileGrid>

        {/* ── Notifications ── */}
        <SectionLabel title="Notifications" />
        <TileGrid>
          <GridTile
            tileWidth={tileWidth}
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
          <GridTile
            tileWidth={tileWidth}
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
          <GridTile tileWidth={tileWidth} icon="bell.badge.fill" iconColor="#8B5CF6" label="Notification Settings" value="Milestones & templates" onPress={() => router.push("/notification-settings" as any)} />
        </TileGrid>

        {/* ── Security ── */}
        <SectionLabel title="Security & Permissions" />
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="shield.fill" iconColor={NVC_ORANGE} label="Roles & Permissions" value="7 roles · 31 perms" onPress={() => router.push("/permissions" as any)} />
          <GridTile tileWidth={tileWidth} icon="key.fill" iconColor="#F59E0B" label="Authentication" value="Google · Apple · Email" onPress={() => router.push("/login" as any)} />
        </TileGrid>

        {/* ── Tracking ── */}
        <SectionLabel title="Tracking" />
        <TileGrid>
          <GridTile
            tileWidth={tileWidth}
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
          <GridTile tileWidth={tileWidth} icon="gauge.medium" iconColor="#8B5CF6" label="Distance Tracking" value="Auto (GPS)" onPress={() => {}} />
          <GridTile tileWidth={tileWidth} icon="timer" iconColor="#F59E0B" label="Time-on-Site" value="Enabled" onPress={() => {}} />
        </TileGrid>

        {/* ── Appearance ── */}
        <SectionLabel title="Appearance" />
        <TileGrid>
          <GridTile
            tileWidth={tileWidth}
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
        </TileGrid>

        {/* ── NVC360 Admin ── */}
        <SectionLabel title="NVC360 Admin" />
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="map.fill" iconColor={NVC_ORANGE} label="Dispatcher Dashboard" value="Live Fleet View" onPress={() => router.push("/dispatcher" as any)} />
          <GridTile tileWidth={tileWidth} icon="building.2.fill" iconColor="#8B5CF6" label="Super Admin" value="Manage All Clients" onPress={() => router.push("/super-admin" as any)} />
          <GridTile tileWidth={tileWidth} icon="location.fill" iconColor="#3B82F6" label="Customer Tracking" value="SMS Link Preview" onPress={() => router.push("/track/JH-2026-8821" as any)} />
        </TileGrid>

        {/* ── Support ── */}
        <SectionLabel title="Support" />
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="questionmark.circle.fill" iconColor="#3B82F6" label="Help & Docs" onPress={() => Linking.openURL("https://www.nvc360.com")} />
          <GridTile tileWidth={tileWidth} icon="info.circle.fill" iconColor="#6B7280" label="App Version" value="NVC360 2.0 (Build 1)" />
        </TileGrid>

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <TileGrid>
          <GridTile tileWidth={tileWidth} icon="lock.fill" iconColor="#EF4444" label="Sign Out" danger onPress={handleLogout} />
        </TileGrid>

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
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerLogo: { width: 26, height: 26 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", letterSpacing: 0.5 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },

  scroll: { paddingBottom: 48 },

  // Profile Card
  profileCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 14, marginTop: 14, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
  },
  profileInitial: { fontSize: 22, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  profileRole: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  profileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 3,
  },
  profileBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  profileEdit: { padding: 6 },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: "700", letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8,
  },

  // Tile grid
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // Individual tile
  tile: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: "flex-start",
    gap: 6,
    minHeight: 100,
    shadowColor: "#0A1929",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  tileIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  tileLabel: { fontSize: 13, fontWeight: "700", lineHeight: 17 },
  tileValue: { fontSize: 11, lineHeight: 14 },
  tileSwitchWrap: { marginTop: 2 },
  tileChevron: { position: "absolute", top: 10, right: 10 },

  // Footer
  footer: { alignItems: "center", paddingTop: 20, gap: 4 },
  footerText: { fontSize: 11 },
});
