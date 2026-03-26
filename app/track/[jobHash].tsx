import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NativeMapView } from "@/components/native-map-view";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Mock Tracking Data ───────────────────────────────────────────────────────

const MOCK_TRACKING = {
  jobHash: "JH-2026-8821",
  customerName: "Sarah Mitchell",
  jobAddress: "742 Evergreen Terrace, Winnipeg, MB",
  technician: {
    name: "Marcus Johnson",
    phone: "+1-204-555-0101",
    vehicle: "White Ford Transit Van",
    rating: 4.9,
    completedJobs: 312,
    latitude: 49.8901,
    longitude: -97.1601,
  },
  status: "en_route" as "dispatched" | "en_route" | "arrived" | "completed",
  etaMinutes: 12,
  dispatchedAt: "2:30 PM",
  companyName: "Arctic HVAC Services",
  companyColor: "#1E6FBF",
  companyLogo: "A",
  serviceName: "HVAC Service Call",
};

type TrackStatus = "dispatched" | "en_route" | "arrived" | "completed";

const STATUS_STEPS: { key: TrackStatus; label: string; icon: any }[] = [
  { key: "dispatched", label: "Dispatched", icon: "checkmark.circle.fill" },
  { key: "en_route", label: "On the Way", icon: "car.fill" },
  { key: "arrived", label: "Arrived", icon: "location.fill" },
  { key: "completed", label: "Completed", icon: "star.fill" },
];

interface ChatMessage {
  id: string;
  text: string;
  sender: "customer" | "technician";
  timestamp: Date;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    text: "Hi! I'm on my way to your address. I should arrive in about 12 minutes.",
    sender: "technician",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
];

// ─── Map Component (Simulated) ────────────────────────────────────────────────

function TrackingMap({
  techLat,
  techLng,
  status,
  companyColor,
}: {
  techLat: number;
  techLng: number;
  status: TrackStatus;
  companyColor: string;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const isActive = status === "en_route" || status === "dispatched";

  return (
    <View style={[styles.mapContainer, { backgroundColor: "#0d1b2a" }]}>
      {/* Grid */}
      {[...Array(5)].map((_, i) => (
        <View key={`h${i}`} style={[styles.mapGridH, { top: `${(i + 1) * 16}%` as any }]} />
      ))}
      {[...Array(7)].map((_, i) => (
        <View key={`v${i}`} style={[styles.mapGridV, { left: `${(i + 1) * 13}%` as any }]} />
      ))}

      {/* Roads */}
      <View style={[styles.mapRoad, { top: "40%", backgroundColor: "#1e3a5f", height: 6 }]} />
      <View style={[styles.mapRoad, { top: "65%", backgroundColor: "#1e3a5f", height: 4 }]} />
      <View style={[styles.mapRoadV, { left: "35%", backgroundColor: "#1e3a5f", width: 6 }]} />
      <View style={[styles.mapRoadV, { left: "70%", backgroundColor: "#1e3a5f", width: 4 }]} />

      {/* Destination Pin */}
      <View style={[styles.destinationPin, { right: "22%", top: "30%" }]}>
        <View style={[styles.destinationPinHead, { backgroundColor: "#EF4444" }]}>
          <IconSymbol name="house.fill" size={12} color="#fff" />
        </View>
        <View style={[styles.destinationPinTail, { backgroundColor: "#EF4444" }]} />
      </View>

      {/* Technician Marker */}
      {isActive && (
        <View style={[styles.techMarker, { left: "40%", top: "55%" }]}>
          <Animated.View
            style={[
              styles.techMarkerPulse,
              {
                backgroundColor: companyColor + "40",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={[styles.techMarkerDot, { backgroundColor: companyColor }]}>
            <IconSymbol name="car.fill" size={12} color="#fff" />
          </View>
        </View>
      )}

      {/* Arrived marker */}
      {status === "arrived" && (
        <View style={[styles.techMarker, { right: "25%", top: "32%" }]}>
          <View style={[styles.techMarkerDot, { backgroundColor: "#22C55E" }]}>
            <IconSymbol name="checkmark" size={12} color="#fff" />
          </View>
        </View>
      )}

      {/* Route line (simulated) */}
      {isActive && (
        <View
          style={[
            styles.routeLine,
            { left: "43%", top: "43%", width: 80, backgroundColor: companyColor + "80" },
          ]}
        />
      )}

      {/* Map attribution */}
      <View style={styles.mapAttribution}>
        <Text style={styles.mapAttributionText}>Live GPS · Updates every 10s</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerTrackingScreen() {
  const { jobHash } = useLocalSearchParams<{ jobHash: string }>();
  const colors = useColors();

  const [tracking, setTracking] = useState(MOCK_TRACKING);
  const [etaMinutes, setEtaMinutes] = useState(MOCK_TRACKING.etaMinutes);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [messageText, setMessageText] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Simulate ETA countdown
  useEffect(() => {
    if (tracking.status !== "en_route") return;
    const interval = setInterval(() => {
      setEtaMinutes((prev) => {
        if (prev <= 1) {
          setTracking((t) => ({ ...t, status: "arrived" }));
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 10000); // Every 10s in real app, faster for demo
    return () => clearInterval(interval);
  }, [tracking.status]);

  // Simulate incoming message
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showChat) {
        setUnreadCount((c) => c + 1);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "I'm about 2 streets away now. See you shortly!",
          sender: "technician",
          timestamp: new Date(),
        },
      ]);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: messageText.trim(),
        sender: "customer",
        timestamp: new Date(),
      },
    ]);
    setMessageText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === tracking.status);
  const companyColor = tracking.companyColor;

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      {/* Branded Header */}
      <View style={[styles.header, { backgroundColor: companyColor }]}>
        <View style={[styles.companyLogoCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.companyLogoText}>{tracking.companyLogo}</Text>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerCompany}>{tracking.companyName}</Text>
          <Text style={styles.headerService}>{tracking.serviceName}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.chatHeaderBtn,
            { backgroundColor: "rgba(255,255,255,0.2)", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => {
            setShowChat((v) => !v);
            setUnreadCount(0);
          }}
        >
          <IconSymbol name="message.fill" size={18} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showChat ? (
        /* ── CHAT VIEW ── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.chatHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowChat(false)}>
              <IconSymbol name="chevron.left" size={20} color={colors.primary} />
            </Pressable>
            <Text style={[styles.chatHeaderTitle, { color: colors.foreground }]}>
              Chat with {tracking.technician.name.split(" ")[0]}
            </Text>
            <View style={[styles.chatOnlineDot, { backgroundColor: "#22C55E" }]} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMe = item.sender === "customer";
              return (
                <View
                  style={[
                    styles.chatBubbleRow,
                    isMe ? styles.chatBubbleRight : styles.chatBubbleLeft,
                  ]}
                >
                  {!isMe && (
                    <View style={[styles.chatAvatar, { backgroundColor: companyColor + "20" }]}>
                      <Text style={[styles.chatAvatarText, { color: companyColor }]}>
                        {tracking.technician.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.chatBubbleContent}>
                    <View
                      style={[
                        styles.chatBubble,
                        isMe
                          ? { backgroundColor: companyColor }
                          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
                        {item.text}
                      </Text>
                    </View>
                    <Text style={[styles.chatBubbleTime, { color: colors.muted }]}>
                      {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.chatInputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.chatInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Message your technician..."
              placeholderTextColor={colors.muted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <Pressable
              style={({ pressed }) => [
                styles.chatSendBtn,
                { backgroundColor: messageText.trim() ? companyColor : colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleSendMessage}
            >
              <IconSymbol name="paperplane.fill" size={16} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* ── TRACKING VIEW ── */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* ETA Banner */}
          {tracking.status === "en_route" && (
            <View style={[styles.etaBanner, { backgroundColor: companyColor }]}>
              <View style={styles.etaLeft}>
                <Text style={styles.etaMinutes}>{etaMinutes}</Text>
                <Text style={styles.etaUnit}>min</Text>
              </View>
              <View style={styles.etaCenter}>
                <Text style={styles.etaTitle}>Your technician is on the way</Text>
                <Text style={styles.etaAddress} numberOfLines={1}>{tracking.jobAddress}</Text>
              </View>
              <View style={[styles.etaLiveBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <View style={[styles.etaLiveDot, { backgroundColor: "#fff" }]} />
                <Text style={styles.etaLiveText}>LIVE</Text>
              </View>
            </View>
          )}
          {tracking.status === "arrived" && (
            <View style={[styles.etaBanner, { backgroundColor: "#22C55E" }]}>
              <IconSymbol name="checkmark.circle.fill" size={28} color="#fff" />
              <View style={styles.etaCenter}>
                <Text style={styles.etaTitle}>Your technician has arrived!</Text>
                <Text style={styles.etaAddress}>They are at your location</Text>
              </View>
            </View>
          )}
          {tracking.status === "dispatched" && (
            <View style={[styles.etaBanner, { backgroundColor: "#3B82F6" }]}>
              <IconSymbol name="clock.fill" size={24} color="#fff" />
              <View style={styles.etaCenter}>
                <Text style={styles.etaTitle}>Technician dispatched</Text>
                <Text style={styles.etaAddress}>Preparing to head your way</Text>
              </View>
            </View>
          )}

          {/* Map — live on all platforms */}
          <NativeMapView
            technicians={[
              {
                id: 1,
                name: tracking.technician.name,
                latitude: tracking.technician.latitude,
                longitude: tracking.technician.longitude,
                status: tracking.status === "en_route" ? "en_route" : tracking.status === "arrived" ? "on_job" : "available",
                transportType: "van",
              },
            ]}
            destination={{
              lat: 49.8851,
              lng: -97.1484,
              label: tracking.jobAddress,
            }}
            center={{ lat: tracking.technician.latitude, lng: tracking.technician.longitude }}
            zoom={14}
            height={220}
          />

          {/* Status Steps */}
          <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {STATUS_STEPS.map((step, index) => {
              const isDone = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const stepColor = isDone || isCurrent ? companyColor : colors.border;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepCircle,
                        {
                          backgroundColor: isDone || isCurrent ? companyColor + "20" : colors.background,
                          borderColor: stepColor,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={step.icon}
                        size={14}
                        color={isDone || isCurrent ? companyColor : colors.border}
                      />
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          { backgroundColor: isDone ? companyColor : colors.border },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isCurrent ? companyColor : isDone ? colors.foreground : colors.muted,
                        fontWeight: isCurrent ? "700" : "500",
                      },
                    ]}
                  >
                    {step.label}
                    {isCurrent && tracking.status === "en_route" && ` · ${etaMinutes} min`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Technician Card */}
          <View style={[styles.techCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.techCardAvatar, { backgroundColor: companyColor + "20" }]}>
              <Text style={[styles.techCardInitial, { color: companyColor }]}>
                {tracking.technician.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.techCardInfo}>
              <Text style={[styles.techCardName, { color: colors.foreground }]}>
                {tracking.technician.name}
              </Text>
              <View style={styles.techCardRatingRow}>
                <IconSymbol name="star.fill" size={12} color="#F59E0B" />
                <Text style={[styles.techCardRating, { color: colors.foreground }]}>
                  {tracking.technician.rating}
                </Text>
                <Text style={[styles.techCardJobs, { color: colors.muted }]}>
                  · {tracking.technician.completedJobs} jobs
                </Text>
              </View>
              <Text style={[styles.techCardVehicle, { color: colors.muted }]}>
                {tracking.technician.vehicle}
              </Text>
            </View>
            <View style={styles.techCardActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.techContactBtn,
                  { backgroundColor: "#22C55E20", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => Linking.openURL(`tel:${tracking.technician.phone}`)}
              >
                <IconSymbol name="phone.fill" size={18} color="#22C55E" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.techContactBtn,
                  { backgroundColor: "#3B82F620", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => Linking.openURL(`sms:${tracking.technician.phone}`)}
              >
                <IconSymbol name="message.fill" size={18} color="#3B82F6" />
              </Pressable>
            </View>
          </View>

          {/* In-App Chat CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.chatCTA,
              { backgroundColor: companyColor, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              setShowChat(true);
              setUnreadCount(0);
            }}
          >
            <IconSymbol name="message.fill" size={18} color="#fff" />
            <Text style={styles.chatCTAText}>Message {tracking.technician.name.split(" ")[0]}</Text>
            {unreadCount > 0 && (
              <View style={styles.chatCTABadge}>
                <Text style={styles.chatCTABadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </Pressable>

          {/* Job Details */}
          <View style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.jobCardTitle, { color: colors.foreground }]}>Job Details</Text>
            <View style={styles.jobCardRow}>
              <IconSymbol name="location.fill" size={14} color={colors.muted} />
              <Text style={[styles.jobCardText, { color: colors.muted }]}>{tracking.jobAddress}</Text>
            </View>
            <View style={styles.jobCardRow}>
              <IconSymbol name="clock.fill" size={14} color={colors.muted} />
              <Text style={[styles.jobCardText, { color: colors.muted }]}>
                Dispatched at {tracking.dispatchedAt}
              </Text>
            </View>
            <View style={styles.jobCardRow}>
              <IconSymbol name="wrench.fill" size={14} color={colors.muted} />
              <Text style={[styles.jobCardText, { color: colors.muted }]}>{tracking.serviceName}</Text>
            </View>
          </View>

          {/* Powered by NVC360 */}
          <View style={styles.poweredBy}>
            <Text style={[styles.poweredByText, { color: colors.muted }]}>
              Powered by NVC360 · Real-time field service tracking
            </Text>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  companyLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerCenter: { flex: 1 },
  headerCompany: { fontSize: 15, fontWeight: "800", color: "#fff" },
  headerService: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  chatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  scroll: { paddingBottom: 40 },
  etaBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  etaLeft: { alignItems: "center", minWidth: 50 },
  etaMinutes: { fontSize: 36, fontWeight: "900", color: "#fff", lineHeight: 40 },
  etaUnit: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  etaCenter: { flex: 1 },
  etaTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  etaAddress: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  etaLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  etaLiveDot: { width: 6, height: 6, borderRadius: 3 },
  etaLiveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  mapContainer: {
    height: 240,
    position: "relative",
    overflow: "hidden",
  },
  mapGridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  mapGridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  mapRoad: { position: "absolute", left: 0, right: 0 },
  mapRoadV: { position: "absolute", top: 0, bottom: 0 },
  destinationPin: { position: "absolute", alignItems: "center" },
  destinationPinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  destinationPinTail: { width: 3, height: 8 },
  techMarker: { position: "absolute", alignItems: "center", justifyContent: "center" },
  techMarkerPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  techMarkerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  routeLine: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "-30deg" }],
  },
  mapAttribution: {
    position: "absolute",
    bottom: 8,
    right: 10,
  },
  mapAttributionText: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
  stepsCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 44 },
  stepLeft: { alignItems: "center", width: 28 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { width: 2, flex: 1, minHeight: 16, marginTop: 2 },
  stepLabel: { fontSize: 14, lineHeight: 28 },
  techCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  techCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  techCardInitial: { fontSize: 22, fontWeight: "800" },
  techCardInfo: { flex: 1, gap: 3 },
  techCardName: { fontSize: 16, fontWeight: "700" },
  techCardRatingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  techCardRating: { fontSize: 13, fontWeight: "700" },
  techCardJobs: { fontSize: 12 },
  techCardVehicle: { fontSize: 12 },
  techCardActions: { flexDirection: "row", gap: 8 },
  techContactBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  chatCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  chatCTAText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  chatCTABadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chatCTABadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  jobCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  jobCardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  jobCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  jobCardText: { fontSize: 13, flex: 1, lineHeight: 18 },
  poweredBy: { alignItems: "center", paddingTop: 16 },
  poweredByText: { fontSize: 11 },
  // Chat
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  chatHeaderTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  chatOnlineDot: { width: 8, height: 8, borderRadius: 4 },
  chatList: { padding: 16, gap: 12, paddingBottom: 8 },
  chatBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  chatBubbleLeft: { justifyContent: "flex-start" },
  chatBubbleRight: { justifyContent: "flex-end" },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: { fontSize: 12, fontWeight: "800" },
  chatBubbleContent: { maxWidth: "75%", gap: 3 },
  chatBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  chatBubbleText: { fontSize: 15, lineHeight: 21 },
  chatBubbleTime: { fontSize: 11, marginHorizontal: 4 },
  chatInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
