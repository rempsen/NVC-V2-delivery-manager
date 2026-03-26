import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: string;
  text: string;
  sender: "dispatcher" | "technician" | "system";
  senderName?: string;
  timestamp: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, myRole }: { message: Message; myRole: string }) {
  const colors = useColors();
  const isMe = message.sender === myRole || (myRole === "dispatcher" && message.sender === "dispatcher");
  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isMe && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <IconSymbol name="person.fill" size={14} color={colors.primary} />
        </View>
      )}
      <View style={styles.bubbleContent}>
        {!isMe && message.senderName && (
          <Text style={[styles.senderName, { color: colors.muted }]}>{message.senderName}</Text>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: NVC_BLUE }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
            {message.text}
          </Text>
        </View>
        <Text style={[styles.bubbleTime, { color: colors.muted }]}>{formatTime(message.timestamp)}</Text>
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const colors = useColors();
  const { tenantId } = useTenant();
  const { user: authUser } = useAuth();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const taskIdNum = Number(taskId);

  // ── Live DB queries ────────────────────────────────────────────────────────
  const { data: rawTask } = trpc.tasks.getById.useQuery(
    { id: taskIdNum, tenantId: tenantId ?? 0 },
    { enabled: !!taskId && tenantId !== null, staleTime: 15_000 },
  );
  const { data: rawTechs } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 60_000 },
  );
  const {
    data: rawMessages,
    refetch: refetchMessages,
    isLoading: messagesLoading,
  } = trpc.messages.list.useQuery(
    { taskId: taskIdNum, tenantId: tenantId ?? 0 },
    { enabled: !!taskId && tenantId !== null, refetchInterval: 10_000 },
  );

  // ── Send mutation ──────────────────────────────────────────────────────────
  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setInputText("");
      refetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    },
    onError: () => {
      // Message failed — keep input so user can retry
    },
  });

  // ── Mark read ──────────────────────────────────────────────────────────────
  const markReadMutation = trpc.messages.markRead.useMutation();
  useEffect(() => {
    if (taskIdNum) markReadMutation.mutate({ taskId: taskIdNum });
  }, [taskIdNum]);

  // ── Normalize messages ─────────────────────────────────────────────────────
  const messages: Message[] = (rawMessages as any[] ?? []).map((m) => ({
    id: String(m.id),
    text: m.content ?? m.text ?? "",
    sender: (m.senderType ?? m.sender ?? "system") as Message["sender"],
    senderName: m.senderName ?? undefined,
    timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
  }));

  const task = rawTask
    ? {
        id: (rawTask as any).id,
        customerName: (rawTask as any).customerName ?? "",
        technicianId: (rawTask as any).technicianId ?? undefined,
        orderRef: (rawTask as any).orderRef ?? `WO-${(rawTask as any).id}`,
      }
    : undefined;

  const technician = task?.technicianId && rawTechs
    ? (() => {
        const row = (rawTechs as any[]).find((r) => (r.tech?.id ?? r.id) === task.technicianId);
        if (!row) return null;
        const t = row.tech ?? row;
        const u = row.user ?? {};
        return { id: t.id, name: (u.name ?? t.name ?? "Technician").trim() };
      })()
    : null;

  // Determine my role for bubble alignment
  const myRole = (authUser as any)?.role ?? "dispatcher";

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !task || !tenantId) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate({
      tenantId,
      taskId: task.id,
      senderType: myRole === "technician" ? "technician" : "dispatcher",
      senderId: (authUser as any)?.id ?? undefined,
      senderName: (authUser as any)?.name ?? "Dispatcher",
      content: inputText.trim(),
      attachmentType: "none",
    });
  }, [inputText, task, tenantId, myRole, authUser, sendMutation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }, [messages.length]);

  const headerTitle = technician?.name ?? task?.customerName ?? "Messages";
  const headerSub = task ? `Work Order ${task.orderRef}` : "In-App Messaging";

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader title={headerTitle} subtitle={headerSub} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {messagesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading messages…</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="message.fill" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No messages yet.</Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>
              Send the first message to start the conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} myRole={myRole} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() && !sendMutation.isPending ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  listContent: { padding: 16, gap: 12, paddingBottom: 8 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubbleContent: { maxWidth: "75%", gap: 3 },
  senderName: { fontSize: 11, fontWeight: "600", marginLeft: 4, marginBottom: 2 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginHorizontal: 4 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
