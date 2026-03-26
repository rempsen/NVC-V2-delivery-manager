import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, Linking, StyleSheet, Alert, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import {
  MOCK_TASKS, MOCK_TECHNICIANS, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, formatDuration, getETA, type Task, type TaskStatus,
} from "@/lib/nvc-types";
// Map view removed from agent-facing task screen (fleet map is dispatcher-only)

const STATUS_FLOW: TaskStatus[] = ["unassigned", "assigned", "en_route", "on_site", "completed"];

function InfoRow({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <IconSymbol name={icon} size={16} color={color ?? colors.muted} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus | null>(null);

  const task = useMemo(() => MOCK_TASKS.find((t) => t.id === Number(id)), [id]);
  const technician = useMemo(
    () => (task?.technicianId ? MOCK_TECHNICIANS.find((t) => t.id === task.technicianId) : null),
    [task],
  );

  const currentStatus = status ?? task?.status ?? "unassigned";
  const eta = useMemo(() => {
    if (!technician || !task) return null;
    if (currentStatus === "on_site" || currentStatus === "completed") return null;
    return getETA(technician.latitude, technician.longitude, task.jobLatitude, task.jobLongitude);
  }, [technician, task, currentStatus]);

  if (!task) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.muted }}>Work order not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const statusColor = STATUS_COLORS[currentStatus];
  const priorityColor = PRIORITY_COLORS[task.priority];
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(currentStatus) + 1];
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);

  const handleAdvanceStatus = () => {
    if (!nextStatus) return;
    Alert.alert("Update Status", `Mark as "${STATUS_LABELS[nextStatus]}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStatus(nextStatus);
        },
      },
    ]);
  };

  const handleCall = (phone: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  const handleSMS = (phone: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`sms:${phone}`);
  };

  const handleShareTracking = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const trackingUrl = `https://track.nvc360.com/${task.jobHash}`;
    Alert.alert("Share Tracking Link", `Send to ${task.customerName}:\n\n${trackingUrl}`, [
      {
        text: "Send SMS",
        onPress: () =>
          Linking.openURL(`sms:${task.customerPhone}?body=Track your technician: ${trackingUrl}`),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader
        title={task.customerName}
        subtitle={task.orderRef ?? task.templateName}
        rightElement={
          <Pressable
            onPress={handleShareTracking}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusColor + "15", borderColor: statusColor + "40" },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[currentStatus]}</Text>
          {eta && (
            <View style={styles.etaBadge}>
              <IconSymbol name="clock.fill" size={12} color={statusColor} />
              <Text style={[styles.etaText, { color: statusColor }]}>ETA {eta} min</Text>
            </View>
          )}
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20" }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Job Progress</Text>
          <View style={styles.stepsRow}>
            {STATUS_FLOW.map((s, i) => {
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;
              const c = isDone || isActive ? STATUS_COLORS[s] : colors.border;
              return (
                <React.Fragment key={s}>
                  <View style={styles.stepContainer}>
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: isDone ? c : "transparent", borderColor: c },
                      ]}
                    >
                      {isDone && <IconSymbol name="checkmark" size={10} color="#fff" />}
                      {isActive && <View style={[styles.stepActiveDot, { backgroundColor: c }]} />}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: isActive ? c : isDone ? colors.muted : colors.border },
                      ]}
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </View>
                  {i < STATUS_FLOW.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: i < currentIdx ? STATUS_COLORS[s] : colors.border },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          {nextStatus && currentStatus !== "completed" && (
            <Pressable
              style={({ pressed }) => [
                styles.advanceBtn,
                { backgroundColor: statusColor, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleAdvanceStatus}
            >
              <IconSymbol name="chevron.right" size={16} color="#fff" />
              <Text style={styles.advanceBtnText}>Mark as {STATUS_LABELS[nextStatus]}</Text>
            </Pressable>
          )}
        </View>

        {/* Navigate to Job Address */}
        <Pressable
          style={({ pressed }) => [
            styles.navigateCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => {
            const encoded = encodeURIComponent(task.jobAddress);
            const url = Platform.OS === "ios" ? `maps://?q=${encoded}` : `geo:0,0?q=${encoded}`;
            Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${encoded}`));
          }}
        >
          <View style={styles.navigateIconWrap}>
            <IconSymbol name="location.fill" size={20} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.navigateLabel, { color: colors.muted }]}>Job Address</Text>
            <Text style={[styles.navigateAddress, { color: colors.foreground }]} numberOfLines={2}>{task.jobAddress}</Text>
          </View>
          <View style={styles.navigateArrow}>
            <IconSymbol name="arrow.up.right.square.fill" size={22} color="#6366F1" />
          </View>
        </Pressable>

        {/* Customer */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
          <InfoRow icon="person.fill" label="Name" value={task.customerName} color={colors.primary} />
          <InfoRow icon="location.fill" label="Job Address" value={task.jobAddress} />
          {task.description && (
            <InfoRow icon="doc.text.fill" label="Description" value={task.description} />
          )}
          <View style={styles.contactRow}>
            <Pressable
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleCall(task.customerPhone)}
            >
              <IconSymbol name="phone.fill" size={16} color="#22C55E" />
              <Text style={[styles.contactBtnText, { color: "#22C55E" }]}>Call</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: "#3B82F620", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleSMS(task.customerPhone)}
            >
              <IconSymbol name="message.fill" size={16} color="#3B82F6" />
              <Text style={[styles.contactBtnText, { color: "#3B82F6" }]}>SMS</Text>
            </Pressable>
          </View>
        </View>

        {/* Technician */}
        {technician ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Assigned Technician</Text>
            <View style={styles.techRow}>
              <View style={[styles.techAvatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.techInitial, { color: colors.primary }]}>
                  {technician.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.techInfo}>
                <Text style={[styles.techName, { color: colors.foreground }]}>{technician.name}</Text>
                <Text style={[styles.techSkills, { color: colors.muted }]}>
                  {technician.skills.join(" · ")}
                </Text>
              </View>
            </View>
            <View style={styles.contactRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => handleCall(technician.phone)}
              >
                <IconSymbol name="phone.fill" size={16} color="#22C55E" />
                <Text style={[styles.contactBtnText, { color: "#22C55E" }]}>Call Tech</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  { backgroundColor: colors.primary + "20", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push(`/messages/${task.id}` as any)}
              >
                <IconSymbol name="message.fill" size={16} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]}>In-App Chat</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Technician</Text>
            <View style={styles.unassignedRow}>
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
              <Text style={[styles.unassignedText, { color: colors.warning }]}>
                No technician assigned
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.assignBtn,
                { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push("/agents" as any)}
            >
              <IconSymbol name="person.badge.plus" size={16} color="#fff" />
              <Text style={styles.assignBtnText}>Assign Technician</Text>
            </Pressable>
          </View>
        )}

        {/* Time & Distance */}
        {(task.geoClockIn || task.timeOnSiteMin || task.distanceTraveledKm) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Time & Distance</Text>
            {task.geoClockIn && (
              <InfoRow
                icon="location.fill"
                label="Geo Clock-In"
                value={new Date(task.geoClockIn).toLocaleTimeString()}
                color="#22C55E"
              />
            )}
            {task.geoClockOut && (
              <InfoRow
                icon="location.fill"
                label="Geo Clock-Out"
                value={new Date(task.geoClockOut).toLocaleTimeString()}
                color="#EF4444"
              />
            )}
            {task.timeOnSiteMin != null && (
              <InfoRow
                icon="timer"
                label="Time on Site"
                value={formatDuration(task.timeOnSiteMin)}
                color="#8B5CF6"
              />
            )}
            {task.distanceTraveledKm != null && (
              <InfoRow
                icon="car.fill"
                label="Distance Traveled"
                value={`${task.distanceTraveledKm.toFixed(1)} km`}
                color="#3B82F6"
              />
            )}
            {task.totalCents != null && (
              <InfoRow
                icon="dollarsign.circle.fill"
                label="Job Total"
                value={`$${(task.totalCents / 100).toFixed(2)}`}
                color="#22C55E"
              />
            )}
          </View>
        )}

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: "#EF444420", opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() =>
              Alert.alert("Cancel Work Order", "Are you sure?", [
                { text: "No", style: "cancel" },
                {
                  text: "Cancel Order",
                  style: "destructive",
                  onPress: () => setStatus("cancelled"),
                },
              ])
            }
          >
            <IconSymbol name="xmark.circle.fill" size={16} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Cancel Order</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary + "20", opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => router.push(`/messages/${task.id}` as any)}
          >
            <IconSymbol name="message.fill" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Messages</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  headerRef: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  shareBtn: { padding: 4 },
  scroll: { paddingBottom: 40 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: "700", flex: 1 },
  etaBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  etaText: { fontSize: 12, fontWeight: "600" },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  card: {
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  stepsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepContainer: { alignItems: "center", gap: 4, flex: 1 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveDot: { width: 8, height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 9, fontWeight: "600", textAlign: "center" },
  stepLine: { height: 2, flex: 0.5, marginBottom: 14 },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  advanceBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Navigate card (replaces fleet map)
  navigateCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  navigateIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  navigateLabel: { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  navigateAddress: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  navigateArrow: { paddingLeft: 4 },
  trackingLinkText: { fontSize: 13, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "500", marginTop: 1 },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  contactBtnText: { fontSize: 13, fontWeight: "600" },
  techRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { fontSize: 18, fontWeight: "700" },
  techInfo: { flex: 1 },
  techName: { fontSize: 15, fontWeight: "700" },
  techSkills: { fontSize: 12, marginTop: 2 },
  unassignedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unassignedText: { fontSize: 14, fontWeight: "500" },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  assignBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
});
