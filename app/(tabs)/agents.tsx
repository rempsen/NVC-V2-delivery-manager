import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  MOCK_TECHNICIANS,
  TECH_STATUS_COLORS,
  TECH_STATUS_LABELS,
  type Technician,
} from "@/lib/nvc-types";

const STATUS_FILTERS = ["all", "online", "busy", "on_break", "offline"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function TechCard({
  tech,
  onPress,
  onCall,
  onMessage,
}: {
  tech: Technician;
  onPress: () => void;
  onCall: () => void;
  onMessage: () => void;
}) {
  const colors = useColors();
  const statusColor = TECH_STATUS_COLORS[tech.status];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor, borderColor: colors.surface }]} />
      </View>

      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={[styles.name, { color: colors.foreground }]}>{tech.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {TECH_STATUS_LABELS[tech.status]}
            </Text>
          </View>
        </View>

        {tech.activeTaskAddress ? (
          <Text style={[styles.activeTask, { color: colors.muted }]} numberOfLines={1}>
            <Text style={{ color: colors.primary }}>● </Text>
            {tech.activeTaskAddress}
          </Text>
        ) : (
          <Text style={[styles.noTask, { color: colors.muted }]}>No active job</Text>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <IconSymbol name="checkmark.circle.fill" size={12} color="#22C55E" />
            <Text style={[styles.statText, { color: colors.muted }]}>{tech.todayJobs} jobs</Text>
          </View>
          <View style={styles.stat}>
            <IconSymbol name="car.fill" size={12} color={colors.muted} />
            <Text style={[styles.statText, { color: colors.muted }]}>{tech.todayDistanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.stat}>
            <IconSymbol name="wrench.fill" size={12} color={colors.muted} />
            <Text style={[styles.statText, { color: colors.muted }]}>{tech.skills[0]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 }]}
          onPress={onCall}
        >
          <IconSymbol name="phone.fill" size={16} color="#22C55E" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary + "20", opacity: pressed ? 0.7 : 1 }]}
          onPress={onMessage}
        >
          <IconSymbol name="message.fill" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AgentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return MOCK_TECHNICIANS;
    return MOCK_TECHNICIANS.filter((t) => t.status === statusFilter);
  }, [statusFilter]);

  const counts = useMemo(() => ({
    all: MOCK_TECHNICIANS.length,
    online: MOCK_TECHNICIANS.filter((t) => t.status === "online").length,
    busy: MOCK_TECHNICIANS.filter((t) => t.status === "busy").length,
    on_break: MOCK_TECHNICIANS.filter((t) => t.status === "on_break").length,
    offline: MOCK_TECHNICIANS.filter((t) => t.status === "offline").length,
  }), []);

  const handleCall = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${tech.phone}`);
  };

  const handleMessage = (tech: Technician) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tech.activeTaskId) {
      router.push(`/messages/${tech.activeTaskId}` as any);
    } else {
      Linking.openURL(`sms:${tech.phone}`);
    }
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerTitle}>Field Team</Text>
          <Text style={styles.headerSub}>
            {counts.online + counts.busy} active · {counts.all} total
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.mapBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/dispatcher-map" as any)}
        >
          <IconSymbol name="map.fill" size={18} color="#fff" />
          <Text style={styles.mapBtnText}>Live Map</Text>
        </Pressable>
      </View>

      <FlatList
        data={STATUS_FILTERS as unknown as StatusFilter[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const isActive = statusFilter === item;
          const count = counts[item];
          const dotColor = item === "all" ? colors.primary : (TECH_STATUS_COLORS[item] ?? colors.muted);
          return (
            <Pressable
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(item)}
            >
              {item !== "all" && (
                <View style={[styles.filterDot, { backgroundColor: isActive ? "#fff" : dotColor }]} />
              )}
              <Text style={[styles.filterTabText, { color: isActive ? "#fff" : colors.muted }]}>
                {item === "all" ? "All" : TECH_STATUS_LABELS[item]}
              </Text>
              <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : colors.border }]}>
                <Text style={[styles.filterCountText, { color: isActive ? "#fff" : colors.muted }]}>{count}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No technicians found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TechCard
            tech={item}
            onPress={() => router.push(`/agent/${item.id}` as any)}
            onCall={() => handleCall(item)}
            onMessage={() => handleMessage(item)}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  mapBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  filterList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterTabText: { fontSize: 13, fontWeight: "600" },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  filterCountText: { fontSize: 11, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  info: { flex: 1, gap: 4 },
  infoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "700", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  activeTask: { fontSize: 12 },
  noTask: { fontSize: 12 },
  stats: { flexDirection: "row", gap: 10, marginTop: 2 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { fontSize: 11 },
  actions: { gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "500" },
});
