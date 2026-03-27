/**
 * Notification Inbox Screen
 *
 * Shows the last 50 push/SMS/email notifications for the current user.
 * Accessible from the bell icon in the agent-home header.
 * Supports mark-as-read (individual + all).
 */
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";
import { useColors } from "@/hooks/use-colors";

// ─── Notification type → icon / color ────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  job_assigned:    { icon: "briefcase.fill",           color: NVC_BLUE,    label: "Job Assigned" },
  job_started:     { icon: "car.fill",                 color: "#8B5CF6",   label: "En Route" },
  job_arrived:     { icon: "mappin.circle.fill",       color: NVC_ORANGE,  label: "Arrived" },
  job_completed:   { icon: "checkmark.circle.fill",    color: "#22C55E",   label: "Completed" },
  job_failed:      { icon: "xmark.circle.fill",        color: "#EF4444",   label: "Failed" },
  sms_sent:        { icon: "message.fill",             color: "#06B6D4",   label: "SMS Sent" },
  email_sent:      { icon: "envelope.fill",            color: "#6366F1",   label: "Email Sent" },
  push_sent:       { icon: "bell.fill",                color: NVC_ORANGE,  label: "Push" },
  payment:         { icon: "creditcard.fill",          color: "#22C55E",   label: "Payment" },
  message:         { icon: "bubble.left.fill",         color: NVC_BLUE,    label: "Message" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: "bell.fill", color: NVC_BLUE, label: type };
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ─── Notification Row ─────────────────────────────────────────────────────────

interface NotifItem {
  id: number;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  deepLink?: string | null;
  entityType?: string | null;
  entityId?: number | null;
}

function NotifRow({
  item,
  onPress,
}: {
  item: NotifItem;
  onPress: (item: NotifItem) => void;
}) {
  const colors = useColors();
  const meta = getTypeMeta(item.type);
  const isUnread = !item.readAt;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: isUnread ? "#EFF6FF" : colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
      onPress={() => onPress(item)}
    >
      {/* Left icon */}
      <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
        <IconSymbol name={meta.icon as any} size={20} color={meta.color} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTopRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground }, isUnread && styles.rowTitleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowTime, { color: colors.muted }]}>
            {relativeTime(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.rowBody, { color: colors.muted }]} numberOfLines={2}>
          {item.body}
        </Text>
        {isUnread && <View style={styles.unreadDot} />}
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { tenantId, userId } = useTenant();

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery(
    { tenantId: tenantId ?? 0, userId: userId ?? 0, limit: 50 },
    { enabled: tenantId !== null && userId !== null, staleTime: 15_000 },
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const notifications: NotifItem[] = useMemo(() => {
    if (!data) return [];
    return (data as any[]).map((n) => ({
      id: n.id,
      type: n.type ?? "push_sent",
      title: n.title ?? "Notification",
      body: n.body ?? "",
      readAt: n.readAt ?? null,
      createdAt: n.createdAt ?? n.sentAt ?? new Date().toISOString(),
      deepLink: n.deepLink,
      entityType: n.entityType,
      entityId: n.entityId,
    }));
  }, [data]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const handlePress = useCallback((item: NotifItem) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mark as read
    if (!item.readAt && userId) {
      markReadMutation.mutate({ id: item.id, userId });
    }
    // Navigate to deep link if available
    if (item.deepLink) {
      router.push(item.deepLink as any);
    }
  }, [markReadMutation, userId, router]);

  const handleMarkAllRead = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tenantId && userId) {
      markAllReadMutation.mutate({ tenantId, userId });
    }
  }, [markAllReadMutation, tenantId, userId]);

  const renderItem = useCallback(({ item }: { item: NotifItem }) => (
    <NotifRow item={item} onPress={handlePress} />
  ), [handlePress]);

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={18} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.7 }]}
            onPress={handleMarkAllRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.markAllBtn} />
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading notifications…</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: NVC_BLUE + "18" }]}>
            <IconSymbol name="bell.fill" size={36} color={NVC_BLUE} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
          <Text style={[styles.emptyBody, { color: colors.muted }]}>
            New job assignments, SMS confirmations, and status updates will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={NVC_BLUE}
              colors={[NVC_BLUE]}
            />
          }
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: NVC_BLUE,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  backText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: NVC_ORANGE,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  markAllBtn: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  markAllText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    position: "relative",
  },
  rowTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 8,
  },
  rowTitleBold: {
    fontFamily: "Inter_700Bold",
  },
  rowTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
  rowBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NVC_ORANGE,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
});
