import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

interface Message {
  id: string;
  text: string;
  sender: "dispatcher" | "technician";
  timestamp: Date;
  read: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hi, I'm on my way to the job site. Should arrive in about 15 minutes.",
    sender: "technician",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    read: true,
  },
  {
    id: "2",
    text: "Great! The customer has been notified. Please call them when you're 5 minutes away.",
    sender: "dispatcher",
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    read: true,
  },
  {
    id: "3",
    text: "Arrived on site. Starting the inspection now.",
    sender: "technician",
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    read: true,
  },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: Message }) {
  const colors = useColors();
  const isMe = message.sender === "dispatcher";
  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isMe && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <IconSymbol name="person.fill" size={14} color={colors.primary} />
        </View>
      )}
      <View style={styles.bubbleContent}>
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
  const router = useRouter();
  const { tenantId } = useTenant();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // ── Live DB queries ────────────────────────────────────────────────────────
  const { data: rawTask } = trpc.tasks.getById.useQuery(
    { id: Number(taskId), tenantId: tenantId ?? 0 },
    { enabled: !!taskId && tenantId !== null, staleTime: 30_000 },
  );
  const { data: rawTechs } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 60_000 },
  );

  const task = rawTask
    ? {
        id: (rawTask as any).id,
        customerName: (rawTask as any).customerName ?? "",
        technicianId: (rawTask as any).technicianId ?? undefined,
        technicianName: (rawTask as any).technicianName ?? undefined,
        orderRef: (rawTask as any).orderRef ?? `WO-${(rawTask as any).id}`,
      }
    : undefined;

  const technician = task?.technicianId && rawTechs
    ? (() => {
        const row = (rawTechs as any[]).find((r) => (r.tech?.id ?? r.id) === task.technicianId);
        if (!row) return null;
        const t = row.tech ?? row;
        const u = row.user ?? {};
        return { id: t.id, name: (u.name ?? t.name ?? "Technician").trim(), phone: u.phone ?? t.phone ?? "" };
      })()
    : null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "dispatcher",
      timestamp: new Date(),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
  }, []);

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader title={technician?.name ?? "Technician"} subtitle="In-App Messaging" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
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
                backgroundColor: inputText.trim() ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  listContent: { padding: 16, gap: 12, paddingBottom: 8 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleContent: { maxWidth: "75%", gap: 3 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginHorizontal: 4 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
