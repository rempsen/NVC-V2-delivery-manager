import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  MOCK_TECHNICIANS,
  MOCK_TASKS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  type Technician,
  type TaskStatus,
} from "@/lib/nvc-types";

const STATUS_DOT_COLORS: Record<string, string> = {
  online: "#22C55E",
  busy: "#F59E0B",
  offline: "#94A3B8",
};

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: color ?? colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const technician = useMemo(
    () => MOCK_TECHNICIANS.find((t) => t.id === Number(id)),
    [id],
  );

  const techTasks = useMemo(
    () => MOCK_TASKS.filter((t) => t.technicianId === Number(id)),
    [id],
  );

  const activeTasks = techTasks.filter((t) => t.status === "en_route" || t.status === "on_site");
  const completedToday = techTasks.filter((t) => t.status === "completed").length;

  if (!technician) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.muted }}>Technician not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const dotColor = STATUS_DOT_COLORS[technician.status] ?? "#94A3B8";

  const handleCall = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${technician.phone}`);
  };

  const handleSMS = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`sms:${technician.phone}`);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Technician Profile</Text>
        <Pressable
          style={({ pressed }) => [styles.chatBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.push(`/messages/${activeTasks[0]?.id ?? 0}` as any)}
        >
          <IconSymbol name="message.fill" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.profileInitial, { color: colors.primary }]}>
              {technician.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{technician.name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.statusText, { color: dotColor }]}>
                {technician.status.charAt(0).toUpperCase() + technician.status.slice(1)}
              </Text>
            </View>
            <Text style={[styles.profilePhone, { color: colors.muted }]}>{technician.phone}</Text>
          </View>
          <View style={styles.contactBtns}>
            <Pressable
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleCall}
            >
              <IconSymbol name="phone.fill" size={18} color="#22C55E" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: "#3B82F620", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleSMS}
            >
              <IconSymbol name="message.fill" size={18} color="#3B82F6" />
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Today's Jobs" value={String(technician.todayJobs)} />
          <StatCard label="Completed" value={String(completedToday)} color="#22C55E" />
          <StatCard label="Active" value={String(activeTasks.length)} color="#F59E0B" />
          <StatCard
            label="Distance"
            value={`${technician.todayDistanceKm?.toFixed(0) ?? 0}km`}
            color="#8B5CF6"
          />
        </View>

        {/* Skills */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Skills & Certifications</Text>
          <View style={styles.skillsWrap}>
            {technician.skills.map((skill) => (
              <View
                key={skill}
                style={[styles.skillBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
              >
                <Text style={[styles.skillText, { color: colors.primary }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Current Location</Text>
          <View style={[styles.mapMini, { backgroundColor: "#0f1f3d" }]}>
            <IconSymbol name="location.fill" size={24} color="#3B82F6" />
            <Text style={styles.mapMiniText}>
              {technician.latitude.toFixed(4)}, {technician.longitude.toFixed(4)}
            </Text>
            <Text style={styles.mapMiniNote}>Live GPS · Updated just now</Text>
          </View>
        </View>

        {/* Assigned Tasks */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Assigned Work Orders</Text>
          {techTasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>No work orders assigned.</Text>
          ) : (
            techTasks.map((task) => {
              const sc = STATUS_COLORS[task.status];
              const pc = PRIORITY_COLORS[task.priority];
              return (
                <Pressable
                  key={task.id}
                  style={({ pressed }) => [
                    styles.taskRow,
                    { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() => router.push(`/task/${task.id}` as any)}
                >
                  <View style={[styles.taskStatusDot, { backgroundColor: sc }]} />
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskCustomer, { color: colors.foreground }]}>
                      {task.customerName}
                    </Text>
                    <Text style={[styles.taskAddress, { color: colors.muted }]} numberOfLines={1}>
                      {task.jobAddress}
                    </Text>
                  </View>
                  <View style={styles.taskRight}>
                    <View style={[styles.taskPriorityBadge, { backgroundColor: pc + "20" }]}>
                      <Text style={[styles.taskPriorityText, { color: pc }]}>
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.taskStatus, { color: sc }]}>
                      {STATUS_LABELS[task.status]}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Send New Task */}
        <Pressable
          style={({ pressed }) => [
            styles.newTaskBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push("/create-task" as any)}
        >
          <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          <Text style={styles.newTaskBtnText}>Assign New Work Order</Text>
        </Pressable>
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#fff" },
  chatBtn: { padding: 4 },
  scroll: { paddingBottom: 40 },
  profileCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { fontSize: 24, fontWeight: "800" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  profilePhone: { fontSize: 13 },
  contactBtns: { flexDirection: "row", gap: 8 },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  card: {
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillText: { fontSize: 13, fontWeight: "600" },
  mapMini: {
    height: 100,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapMiniText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  mapMiniNote: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  emptyText: { fontSize: 14 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  taskStatusDot: { width: 8, height: 8, borderRadius: 4 },
  taskInfo: { flex: 1 },
  taskCustomer: { fontSize: 14, fontWeight: "600" },
  taskAddress: { fontSize: 12, marginTop: 1 },
  taskRight: { alignItems: "flex-end", gap: 3 },
  taskPriorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  taskPriorityText: { fontSize: 9, fontWeight: "800" },
  taskStatus: { fontSize: 11, fontWeight: "600" },
  newTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  newTaskBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
