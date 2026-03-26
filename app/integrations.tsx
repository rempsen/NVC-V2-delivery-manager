import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "disconnected" | "coming_soon";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  icon: any;
  color: string;
  features: string[];
  docsUrl?: string;
}

// ─── Integration Data ─────────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync invoices, payments, and customer records automatically with QuickBooks Online.",
    category: "Accounting",
    status: "disconnected",
    icon: "dollarsign.circle.fill" as const,
    color: "#22C55E",
    features: [
      "Auto-create invoices from completed work orders",
      "Sync customer records bidirectionally",
      "Export job costs and labour hours",
      "Real-time payment status updates",
    ],
    docsUrl: "https://developer.intuit.com/",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Connect your Xero account to automatically sync financial data and invoices.",
    category: "Accounting",
    status: "disconnected",
    icon: "chart.bar.fill" as const,
    color: "#3B82F6",
    features: [
      "Automatic invoice generation",
      "Customer and contact sync",
      "Expense tracking per job",
      "Tax code mapping",
    ],
    docsUrl: "https://developer.xero.com/",
  },
  {
    id: "companycam",
    name: "CompanyCam",
    description: "Attach CompanyCam photo projects directly to work orders for visual job documentation.",
    category: "Field Documentation",
    status: "disconnected",
    icon: "camera.fill" as const,
    color: "#8B5CF6",
    features: [
      "Link photo projects to work orders",
      "Before/after photo documentation",
      "GPS-tagged photos on job record",
      "Share photo reports with customers",
    ],
    docsUrl: "https://companycam.com/",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync work orders to technician Google Calendars. New tasks appear automatically.",
    category: "Calendar",
    status: "disconnected",
    icon: "calendar.badge.clock" as const,
    color: "#EF4444",
    features: [
      "Auto-create calendar events for new tasks",
      "Two-way sync — calendar changes update work orders",
      "Technician availability from calendar",
      "Customer appointment reminders",
    ],
    docsUrl: "https://developers.google.com/calendar",
  },
  {
    id: "office365",
    name: "Office 365 Calendar",
    description: "Integrate with Microsoft Outlook Calendar for enterprise scheduling and task sync.",
    category: "Calendar",
    status: "disconnected",
    icon: "envelope.fill" as const,
    color: "#F59E0B",
    features: [
      "Outlook Calendar event creation",
      "Teams meeting links for remote jobs",
      "Shared calendar visibility for dispatchers",
      "Exchange email notifications",
    ],
    docsUrl: "https://learn.microsoft.com/en-us/graph/",
  },
  {
    id: "tookan",
    name: "Tookan",
    description: "Connect to the Tookan dispatch platform for advanced routing and agent management.",
    category: "Dispatch",
    status: "connected",
    icon: "map.fill" as const,
    color: "#E85D04",
    features: [
      "Real-time agent GPS tracking",
      "Route optimization",
      "Task assignment and status sync",
      "Webhook event notifications",
    ],
    docsUrl: "https://tookanapi.docs.apiary.io/",
  },
  {
    id: "stripe",
    name: "Stripe Payments",
    description: "Accept credit card payments and capture signatures directly in the field.",
    category: "Payments",
    status: "disconnected",
    icon: "creditcard.fill" as const,
    color: "#6366F1",
    features: [
      "In-app card payment capture",
      "Digital signature + payment receipt",
      "Automatic invoice payment links via SMS",
      "Refund management",
    ],
    docsUrl: "https://stripe.com/docs",
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    description: "Send branded SMS notifications and tracking links to customers at each job milestone.",
    category: "Communications",
    status: "connected",
    icon: "message.fill" as const,
    color: "#EF4444",
    features: [
      "Automated SMS on dispatch, en route, arrival",
      "Branded tracking link in SMS",
      "Two-way SMS messaging",
      "Custom sender name per client",
    ],
    docsUrl: "https://www.twilio.com/docs",
  },
];

const CATEGORIES = ["All", "Accounting", "Calendar", "Field Documentation", "Dispatch", "Payments", "Communications"];

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  onToggle,
}: {
  integration: Integration;
  onToggle: (id: string, newStatus: IntegrationStatus) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const isConnected = integration.status === "connected";
  const isComingSoon = integration.status === "coming_soon";

  const statusColor = isConnected ? "#22C55E" : isComingSoon ? "#F59E0B" : colors.muted;
  const statusLabel = isConnected ? "Connected" : isComingSoon ? "Coming Soon" : "Not Connected";

  return (
    <View style={[styles.integrationCard, { backgroundColor: colors.surface, borderColor: isConnected ? integration.color + "40" : colors.border }]}>
      <Pressable
        style={({ pressed }) => [styles.integrationCardHeader, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={[styles.integrationIcon, { backgroundColor: integration.color + "15" }]}>
          <IconSymbol name={integration.icon} size={22} color={integration.color} />
        </View>
        <View style={styles.integrationInfo}>
          <View style={styles.integrationNameRow}>
            <Text style={[styles.integrationName, { color: colors.foreground }]}>{integration.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              {isConnected && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.integrationDesc, { color: colors.muted }]} numberOfLines={expanded ? 0 : 2}>
            {integration.description}
          </Text>
        </View>
        <IconSymbol
          name={expanded ? "chevron.up" : "chevron.down"}
          size={14}
          color={colors.muted}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.integrationExpanded, { borderTopColor: colors.border }]}>
          <Text style={[styles.featuresTitle, { color: colors.foreground }]}>Features</Text>
          {integration.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={integration.color} />
              <Text style={[styles.featureText, { color: colors.muted }]}>{feature}</Text>
            </View>
          ))}

          <View style={styles.integrationActions}>
            {!isComingSoon && (
              <Pressable
                style={({ pressed }) => [
                  styles.connectBtn,
                  {
                    backgroundColor: isConnected ? "#EF444420" : integration.color,
                    borderColor: isConnected ? "#EF4444" : integration.color,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (isConnected) {
                    Alert.alert(
                      "Disconnect Integration",
                      `Are you sure you want to disconnect ${integration.name}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Disconnect",
                          style: "destructive",
                          onPress: () => onToggle(integration.id, "disconnected"),
                        },
                      ],
                    );
                  } else {
                    Alert.alert(
                      `Connect ${integration.name}`,
                      `You'll be redirected to authorize NVC360 to connect with ${integration.name}.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Connect",
                          onPress: () => onToggle(integration.id, "connected"),
                        },
                      ],
                    );
                  }
                }}
              >
                <Text
                  style={[
                    styles.connectBtnText,
                    { color: isConnected ? "#EF4444" : "#fff" },
                  ]}
                >
                  {isConnected ? "Disconnect" : "Connect"}
                </Text>
              </Pressable>
            )}
            {integration.docsUrl && (
              <Pressable
                style={({ pressed }) => [
                  styles.docsBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => Linking.openURL(integration.docsUrl!)}
              >
                <IconSymbol name="doc.text.fill" size={13} color={colors.muted} />
                <Text style={[styles.docsBtnText, { color: colors.muted }]}>Docs</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function IntegrationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filteredIntegrations = integrations.filter(
    (i) => categoryFilter === "All" || i.category === categoryFilter,
  );

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  const handleToggle = (id: string, newStatus: IntegrationStatus) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)),
    );
    if (Platform.OS !== "web") {
      if (newStatus === "connected") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Integrations</Text>
          <Text style={styles.headerSub}>{connectedCount} of {integrations.length} connected</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip,
              {
                backgroundColor: categoryFilter === cat ? colors.primary + "20" : "transparent",
                borderBottomColor: categoryFilter === cat ? colors.primary : "transparent",
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: categoryFilter === cat ? colors.primary : colors.muted },
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Export Section */}
        <View style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.exportCardLeft}>
            <IconSymbol name="arrow.up.doc.fill" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.exportTitle, { color: colors.foreground }]}>Data Export</Text>
              <Text style={[styles.exportDesc, { color: colors.muted }]}>
                Export tasks, customers, and reports as CSV or PDF
              </Text>
            </View>
          </View>
          <View style={styles.exportBtns}>
            <Pressable
              style={({ pressed }) => [
                styles.exportBtn,
                { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => Alert.alert("Export", "CSV export will be sent to your email.")}
            >
              <Text style={[styles.exportBtnText, { color: colors.primary }]}>CSV</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.exportBtn,
                { backgroundColor: "#EF444415", borderColor: "#EF444430", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => Alert.alert("Export", "PDF report will be generated and sent to your email.")}
            >
              <Text style={[styles.exportBtnText, { color: "#EF4444" }]}>PDF</Text>
            </Pressable>
          </View>
        </View>

        {/* API Key */}
        <View style={[styles.apiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.apiCardLeft}>
            <IconSymbol name="key.fill" size={18} color="#F59E0B" />
            <View>
              <Text style={[styles.apiTitle, { color: colors.foreground }]}>NVC360 API Key</Text>
              <Text style={[styles.apiKey, { color: colors.muted }]}>nvc_••••••••••••••••••••••••••••••</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.apiCopyBtn,
              { backgroundColor: "#F59E0B15", opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => Alert.alert("API Key", "API key copied to clipboard.")}
          >
            <IconSymbol name="doc.on.doc.fill" size={14} color="#F59E0B" />
          </Pressable>
        </View>

        {/* Integrations List */}
        <View style={styles.integrationsList}>
          {filteredIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onToggle={handleToggle}
            />
          ))}
        </View>
      </ScrollView>
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
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  categoryScroll: { borderBottomWidth: 1 },
  categoryContent: { paddingHorizontal: 16, gap: 0 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 4,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  exportCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  exportCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  exportTitle: { fontSize: 14, fontWeight: "700" },
  exportDesc: { fontSize: 12, marginTop: 1 },
  exportBtns: { flexDirection: "row", gap: 8 },
  exportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportBtnText: { fontSize: 12, fontWeight: "700" },
  apiCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  apiCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  apiTitle: { fontSize: 14, fontWeight: "700" },
  apiKey: { fontSize: 12, fontFamily: "monospace", marginTop: 2 },
  apiCopyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationsList: { gap: 10 },
  integrationCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  integrationCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationInfo: { flex: 1, gap: 4 },
  integrationNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  integrationName: { fontSize: 15, fontWeight: "700", flex: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: "700" },
  integrationDesc: { fontSize: 13, lineHeight: 18 },
  integrationExpanded: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  featuresTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { fontSize: 13, lineHeight: 18, flex: 1 },
  integrationActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  connectBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  connectBtnText: { fontSize: 14, fontWeight: "700" },
  docsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  docsBtnText: { fontSize: 13, fontWeight: "600" },
});
