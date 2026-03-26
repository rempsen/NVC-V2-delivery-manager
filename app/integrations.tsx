import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Switch, StyleSheet,
  Alert, Linking, Platform, TextInput, Modal, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "disconnected" | "coming_soon";

interface Integration {
  id: string;
  /** Server-side integration key (may differ from UI id) */
  serverKey?: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  icon: any;
  color: string;
  features: string[];
  authType?: "oauth" | "api_key" | "credentials" | "apple_contacts" | "none";
  authLabel?: string;
  docsUrl?: string;
  connectedMeta?: string; // e.g., email address shown when connected
}

// ─── Integration Catalog ──────────────────────────────────────────────────────

const INITIAL_INTEGRATIONS: Integration[] = [
  // ── Calendar ──
  {
    id: "google-calendar",
    serverKey: "google_calendar",
    name: "Google Calendar",
    description: "Sync work orders to technician Google Calendars. New tasks appear automatically with OAuth authorization.",
    category: "Calendar",
    status: "disconnected",
    icon: "calendar.badge.clock" as const,
    color: "#EF4444",
    authType: "oauth",
    authLabel: "Sign in with Google",
    features: [
      "OAuth 2.0 authorization — no passwords stored",
      "Auto-create calendar events for new tasks",
      "Two-way sync — calendar changes update work orders",
      "Technician availability from calendar",
      "Customer appointment reminders",
    ],
    docsUrl: "https://developers.google.com/calendar",
  },
  {
    id: "microsoft-calendar",
    serverKey: "microsoft",
    name: "Microsoft 365 Calendar",
    description: "Integrate with Outlook Calendar via Microsoft OAuth for enterprise scheduling and Teams meeting links.",
    category: "Calendar",
    status: "disconnected",
    icon: "calendar" as const,
    color: "#0078D4",
    authType: "oauth",
    authLabel: "Sign in with Microsoft",
    features: [
      "Microsoft OAuth 2.0 authorization",
      "Outlook Calendar event creation",
      "Teams meeting links for remote jobs",
      "Shared calendar visibility for dispatchers",
      "Exchange email notifications",
    ],
    docsUrl: "https://learn.microsoft.com/en-us/graph/",
  },
  // ── Storage ──
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Store field documentation, photos, and dispatch reports directly in Google Drive folders.",
    category: "Storage",
    status: "disconnected",
    icon: "folder.fill" as const,
    color: "#34A853",
    authType: "oauth",
    authLabel: "Connect Google Drive",
    features: [
      "Auto-upload field photos to job folders",
      "Store dispatch reports as PDFs",
      "Share documents with customers via link",
      "Organized by job number and date",
    ],
    docsUrl: "https://developers.google.com/drive",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Store and share field documentation in Microsoft OneDrive with automatic folder organization.",
    category: "Storage",
    status: "disconnected",
    icon: "cloud.fill" as const,
    color: "#0078D4",
    authType: "oauth",
    authLabel: "Connect OneDrive",
    features: [
      "Microsoft OAuth 2.0 authorization",
      "Auto-upload job photos and reports",
      "SharePoint integration for enterprise",
      "Shared folders per technician",
    ],
    docsUrl: "https://learn.microsoft.com/en-us/onedrive/developer/",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Sync field documentation and dispatch records to Dropbox for easy access and sharing.",
    category: "Storage",
    status: "disconnected",
    icon: "archivebox.fill" as const,
    color: "#0061FF",
    authType: "oauth",
    authLabel: "Connect Dropbox",
    features: [
      "Auto-sync job photos to Dropbox",
      "Shared team folders for dispatchers",
      "Customer-facing shared links",
      "Version history for documents",
    ],
    docsUrl: "https://www.dropbox.com/developers",
  },
  {
    id: "box",
    name: "Box",
    description: "Enterprise-grade document storage for field and dispatch documentation with Box.",
    category: "Storage",
    status: "disconnected",
    icon: "doc.fill" as const,
    color: "#0061D5",
    authType: "oauth",
    authLabel: "Connect Box",
    features: [
      "Enterprise security and compliance",
      "Auto-organize by job and customer",
      "E-signature integration",
      "Audit trail for all documents",
    ],
    docsUrl: "https://developer.box.com/",
  },
  // ── Accounting ──
  {
    id: "quickbooks",
    serverKey: "quickbooks",
    name: "QuickBooks",
    description: "Sync invoices, payments, and customer records automatically with QuickBooks Online.",
    category: "Accounting",
    status: "disconnected",
    icon: "dollarsign.circle.fill" as const,
    color: "#22C55E",
    authType: "oauth",
    authLabel: "Connect QuickBooks",
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
    serverKey: "xero",
    name: "Xero",
    description: "Connect your Xero account to automatically sync financial data and invoices.",
    category: "Accounting",
    status: "disconnected",
    icon: "chart.bar.fill" as const,
    color: "#3B82F6",
    authType: "oauth",
    authLabel: "Connect Xero",
    features: [
      "Automatic invoice generation",
      "Customer and contact sync",
      "Expense tracking per job",
      "Tax code mapping",
    ],
    docsUrl: "https://developer.xero.com/",
  },
  // ── Payments ──
  {
    id: "stripe",
    name: "Stripe Payments",
    description: "Accept credit card payments and capture signatures directly in the field.",
    category: "Payments",
    status: "disconnected",
    icon: "creditcard.fill" as const,
    color: "#6366F1",
    authType: "api_key",
    authLabel: "Enter Stripe API Key",
    features: [
      "In-app card payment capture",
      "Digital signature + payment receipt",
      "Automatic invoice payment links via SMS",
      "Refund management",
    ],
    docsUrl: "https://stripe.com/docs",
  },
  {
    id: "csv-export",
    name: "CSV / XLS Export",
    description: "Export work orders, invoices, and customer records as CSV or Excel files at any time.",
    category: "Payments",
    status: "connected",
    icon: "tablecells.fill" as const,
    color: "#16A34A",
    authType: "none",
    features: [
      "Export work orders to CSV or XLS",
      "Export customer list with all CRM fields",
      "Export invoices and payment history",
      "Scheduled auto-export (daily/weekly)",
    ],
  },
  // ── Communications ──
  {
    id: "twilio",
    name: "Twilio SMS",
    description: "Send branded SMS notifications and tracking links. Configure phone numbers and manage SMS routing.",
    category: "Communications",
    status: "connected",
    icon: "message.fill" as const,
    color: "#EF4444",
    authType: "api_key",
    authLabel: "Twilio API Key",
    features: [
      "Pick and configure SMS phone numbers",
      "Automated SMS on dispatch, en route, arrival",
      "Branded tracking link in SMS",
      "Two-way SMS messaging",
      "Custom sender name per client",
    ],
    docsUrl: "https://www.twilio.com/docs",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send job updates and communicate with customers and technicians via WhatsApp Business API.",
    category: "Communications",
    status: "disconnected",
    icon: "bubble.left.and.bubble.right.fill" as const,
    color: "#25D366",
    authType: "api_key",
    authLabel: "WhatsApp Business API Key",
    features: [
      "Send job status updates via WhatsApp",
      "Two-way customer messaging",
      "Rich media — photos, PDFs, location",
      "Technician-to-dispatcher chat",
      "Automated message templates",
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    id: "home-numbers",
    name: "Phone Number Manager",
    description: "Manage home numbers, local DIDs, and toll-free numbers for your dispatch operation.",
    category: "Communications",
    status: "disconnected",
    icon: "phone.fill" as const,
    color: "#8B5CF6",
    authType: "credentials",
    authLabel: "Configure Numbers",
    features: [
      "Add and manage local phone numbers",
      "Toll-free number provisioning",
      "Call routing rules per technician",
      "Voicemail-to-email transcription",
      "Call recording for compliance",
    ],
  },
  // ── Field Documentation ──
  {
    id: "companycam",
    serverKey: "companycam",
    name: "CompanyCam",
    description: "Attach CompanyCam photo projects directly to work orders for visual job documentation.",
    category: "Field Documentation",
    status: "disconnected",
    icon: "camera.fill" as const,
    color: "#8B5CF6",
    authType: "oauth",
    authLabel: "Connect CompanyCam",
    features: [
      "Link photo projects to work orders",
      "Before/after photo documentation",
      "GPS-tagged photos on job record",
      "Share photo reports with customers",
    ],
    docsUrl: "https://companycam.com/",
  },
  // ── Contacts ──
  {
    id: "apple-contacts",
    serverKey: "apple_contacts",
    name: "Apple Contacts",
    description: "Sync your iCloud contacts or import/export vCard files to keep your customer list up to date.",
    category: "Contacts",
    status: "disconnected",
    icon: "person.crop.circle.fill" as const,
    color: "#6366F1",
    authType: "apple_contacts",
    authLabel: "Connect iCloud",
    features: [
      "Import contacts from iCloud CardDAV",
      "Import/export vCard (.vcf) files",
      "Auto-create customers from contacts",
      "Export NVC360 customers as vCard",
    ],
    docsUrl: "https://support.apple.com/en-ca/guide/icloud/mmfc854d9604/icloud",
  },
  // ── Dispatch ──
  {
    id: "nvc360",
    name: "NVC360 Dispatch",
    description: "Core NVC360 dispatch platform for advanced routing and agent management.",
    category: "Dispatch",
    status: "connected",
    icon: "map.fill" as const,
    color: NVC_ORANGE,
    authType: "api_key",
    authLabel: "NVC360 API Key",
    features: [
      "Real-time agent GPS tracking",
      "Route optimization",
      "Task assignment and status sync",
      "Webhook event notifications",
    ],
    docsUrl: "https://nvc360api.docs.apiary.io/",
  },
];

const CATEGORIES = ["All", "Calendar", "Accounting", "Field Documentation", "Contacts", "Communications", "Storage", "Payments", "Dispatch"];

// ─── OAuth Modal ──────────────────────────────────────────────────────────────

function OAuthModal({
  integration,
  visible,
  onClose,
  onConnect,
  tenantId,
}: {
  integration: Integration | null;
  visible: boolean;
  onClose: () => void;
  onConnect: (id: string) => void;
  tenantId: number;
}) {
  const colors = useColors();
  const [apiKey, setApiKey] = useState("");
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getAuthUrlQuery = trpc.integrations.getAuthUrl.useQuery(
    { tenantId, integrationKey: (integration?.serverKey ?? "") as any },
    { enabled: false } // only fetch on demand
  );

  const connectAppleMutation = trpc.integrations.connectAppleContacts.useMutation();
  const disconnectMutation = trpc.integrations.disconnect.useMutation();

  if (!integration) return null;

  const isOAuth = integration.authType === "oauth";
  const isApiKey = integration.authType === "api_key";
  const isCredentials = integration.authType === "credentials";
  const isApple = integration.authType === "apple_contacts";

  const handleConnect = async () => {
    if (isOAuth && integration.serverKey) {
      setLoading(true);
      try {
        const result = await getAuthUrlQuery.refetch();
        const url = result.data?.url;
        if (url) {
          await Linking.openURL(url);
          onConnect(integration.id);
          onClose();
        } else {
          Alert.alert("Configuration Required", `To connect ${integration.name}, please configure the OAuth credentials in your server environment variables (${integration.serverKey.toUpperCase()}_CLIENT_ID and ${integration.serverKey.toUpperCase()}_CLIENT_SECRET).`);
        }
      } catch {
        Alert.alert("Error", `Could not get authorization URL for ${integration.name}. Check server configuration.`);
      } finally {
        setLoading(false);
      }
    } else if (isApple) {
      if (!appleId.trim() || !applePassword.trim()) {
        Alert.alert("Required", "Please enter your Apple ID and app-specific password.");
        return;
      }
      setLoading(true);
      try {
        await connectAppleMutation.mutateAsync({ tenantId, appleId, appSpecificPassword: applePassword });
        onConnect(integration.id);
        onClose();
      } catch (err: any) {
        Alert.alert("Connection Failed", err.message ?? "Could not connect to iCloud. Check your Apple ID and app-specific password.");
      } finally {
        setLoading(false);
      }
    } else if (isApiKey || isCredentials) {
      if (!apiKey.trim()) {
        Alert.alert("Required", "Please enter your API key or credentials.");
        return;
      }
      onConnect(integration.id);
      onClose();
    } else {
      onConnect(integration.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <View style={[styles.modalIconWrap, { backgroundColor: integration.color + "18" }]}>
          <IconSymbol name={integration.icon} size={32} color={integration.color} />
        </View>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>Connect {integration.name}</Text>
        <Text style={[styles.modalDesc, { color: colors.muted }]}>{integration.description}</Text>

        {(isApiKey || isCredentials) && (
          <View style={[styles.apiKeyInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <IconSymbol name="key.fill" size={16} color={colors.muted} />
            <TextInput
              style={[styles.apiKeyText, { color: colors.foreground }]}
              placeholder={integration.authLabel ?? "Enter API key"}
              placeholderTextColor={colors.muted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {isApple && (
          <>
            <View style={[styles.apiKeyInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="person.fill" size={16} color={colors.muted} />
              <TextInput
                style={[styles.apiKeyText, { color: colors.foreground }]}
                placeholder="Apple ID (email)"
                placeholderTextColor={colors.muted}
                value={appleId}
                onChangeText={setAppleId}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.apiKeyInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="lock.fill" size={16} color={colors.muted} />
              <TextInput
                style={[styles.apiKeyText, { color: colors.foreground }]}
                placeholder="App-specific password"
                placeholderTextColor={colors.muted}
                value={applePassword}
                onChangeText={setApplePassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.oauthInfo, { backgroundColor: "#6366F110", borderColor: "#6366F130" }]}>
              <IconSymbol name="info.circle.fill" size={16} color="#6366F1" />
              <Text style={[styles.oauthInfoText, { color: "#6366F1" }]}>
                Use an app-specific password from appleid.apple.com — not your main Apple ID password.
              </Text>
            </View>
          </>
        )}

        {isOAuth && (
          <View style={[styles.oauthInfo, { backgroundColor: integration.color + "10", borderColor: integration.color + "30" }]}>
            <IconSymbol name="lock.shield.fill" size={16} color={integration.color} />
            <Text style={[styles.oauthInfoText, { color: integration.color }]}>
              Secure OAuth 2.0 — your credentials are never stored by NVC360
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.modalConnectBtn,
            { backgroundColor: integration.color, opacity: pressed || loading ? 0.88 : 1 },
          ]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <IconSymbol name={isOAuth ? "arrow.up.right.square.fill" : "checkmark.circle.fill"} size={18} color="#fff" />
              <Text style={styles.modalConnectText}>
                {isOAuth ? integration.authLabel : "Connect"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.modalCancelBtn} onPress={onClose}>
          <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  tenantId,
}: {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  tenantId: number;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const isConnected = integration.status === "connected";
  const isComingSoon = integration.status === "coming_soon";
  const statusColor = isConnected ? "#22C55E" : isComingSoon ? "#F59E0B" : "#9CA3AF";
  const statusLabel = isConnected ? "Connected" : isComingSoon ? "Coming Soon" : "Not Connected";

  return (
    <>
      <View style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: isConnected ? integration.color + "40" : colors.border },
      ]}>
        <Pressable
          style={({ pressed }) => [styles.cardHeader, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => setExpanded((v) => !v)}
        >
          <View style={[styles.cardIcon, { backgroundColor: integration.color + "15" }]}>
            <IconSymbol name={integration.icon} size={22} color={integration.color} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardNameRow}>
              <Text style={[styles.cardName, { color: colors.foreground }]}>{integration.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                {isConnected && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            {integration.connectedMeta && isConnected && (
              <Text style={[styles.connectedMeta, { color: integration.color }]}>{integration.connectedMeta}</Text>
            )}
            <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={expanded ? 0 : 2}>
              {integration.description}
            </Text>
          </View>
          <IconSymbol name={expanded ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
        </Pressable>

        {expanded && (
          <View style={[styles.cardExpanded, { borderTopColor: colors.border }]}>
            <Text style={[styles.featuresTitle, { color: colors.foreground }]}>Features</Text>
            {integration.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <IconSymbol name="checkmark.circle.fill" size={13} color={integration.color} />
                <Text style={[styles.featureText, { color: colors.muted }]}>{f}</Text>
              </View>
            ))}
            <View style={styles.cardActions}>
              {!isComingSoon && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isConnected ? "#EF444418" : integration.color,
                      borderColor: isConnected ? "#EF4444" : integration.color,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (isConnected) {
                      Alert.alert("Disconnect", `Disconnect ${integration.name}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Disconnect", style: "destructive", onPress: () => onDisconnect(integration.id) },
                      ]);
                    } else {
                      setModalVisible(true);
                    }
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: isConnected ? "#EF4444" : "#fff" }]}>
                    {isConnected ? "Disconnect" : "Connect"}
                  </Text>
                </Pressable>
              )}
              {integration.docsUrl && (
                <Pressable
                  style={({ pressed }) => [styles.docsBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => Linking.openURL(integration.docsUrl!)}
                >
                  <IconSymbol name="arrow.up.right.square" size={14} color={colors.muted} />
                  <Text style={[styles.docsBtnText, { color: colors.muted }]}>Docs</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      <OAuthModal
        integration={integration}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConnect={onConnect}
        tenantId={tenantId}
      />
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntegrationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const tenantId: number = (user as any)?.tenantId ?? 1;

  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [activeCategory, setActiveCategory] = useState("All");

  // Load real integration statuses from the database
  const { data: dbIntegrations, refetch } = trpc.integrations.list.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onSuccess: () => refetch(),
  });

  // Merge DB statuses into local integration list
  useEffect(() => {
    if (!dbIntegrations) return;
    setIntegrations((prev) =>
      prev.map((integration) => {
        const serverKey = integration.serverKey ?? integration.id;
        const dbRecord = (dbIntegrations as any[]).find(
          (r) => r.integrationKey === serverKey
        );
        if (!dbRecord) return integration;
        const config = dbRecord.config
          ? (typeof dbRecord.config === "string" ? JSON.parse(dbRecord.config) : dbRecord.config)
          : {};
        return {
          ...integration,
          status: dbRecord.isConnected ? "connected" : "disconnected",
          connectedMeta: config.email ?? config.appleId ?? config.orgName ?? undefined,
        };
      })
    );
  }, [dbIntegrations]);

  const connected = integrations.filter((i) => i.status === "connected").length;

  const filtered = activeCategory === "All"
    ? integrations
    : integrations.filter((i) => i.category === activeCategory);

  const handleConnect = useCallback((id: string) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: "connected" } : i));
    // Refresh from DB after a short delay to pick up the OAuth callback result
    setTimeout(() => refetch(), 2000);
  }, [refetch]);

  const handleDisconnect = useCallback(async (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    const serverKey = integration?.serverKey ?? id;
    try {
      await disconnectMutation.mutateAsync({ tenantId, integrationKey: serverKey });
      setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: "disconnected", connectedMeta: undefined } : i));
    } catch {
      setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: "disconnected", connectedMeta: undefined } : i));
    }
  }, [integrations, tenantId, disconnectMutation]);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader
        title="Integrations"
        subtitle={`${connected} of ${integrations.length} connected`}
        showBack
      />

      {/* ── Category Tabs ── */}
      <View style={[styles.tabsWrap, { backgroundColor: NVC_BLUE }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: "Connected", value: connected, color: "#22C55E" },
            { label: "Available", value: integrations.length - connected, color: "#9CA3AF" },
            { label: "Categories", value: CATEGORIES.length - 1, color: NVC_BLUE },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Integration Cards ── */}
        <View style={styles.cardsSection}>
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              tenantId={tenantId}
            />
          ))}
        </View>
      </ScrollView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // Tabs
  tabsWrap: { paddingBottom: 2 },
  tabs: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  tabTextActive: { color: NVC_BLUE },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 3,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  // Cards
  cardsSection: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  card: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  cardName: { fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  connectedMeta: { fontSize: 11, fontWeight: "600", marginBottom: 3 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  cardExpanded: { borderTopWidth: 0.5, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  featuresTitle: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { fontSize: 12, flex: 1, lineHeight: 17 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  docsBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 10 },
  docsBtnText: { fontSize: 12, fontWeight: "600" },

  // OAuth Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    alignItems: "center",
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, marginBottom: 20 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  modalDesc: { fontSize: 13, lineHeight: 19, textAlign: "center", marginBottom: 20 },
  apiKeyInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    width: "100%", marginBottom: 12,
  },
  apiKeyText: { flex: 1, fontSize: 14 },
  oauthInfo: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    width: "100%", marginBottom: 16,
  },
  oauthInfoText: { fontSize: 12, flex: 1, fontWeight: "600" },
  modalConnectBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    width: "100%", paddingVertical: 14, borderRadius: 14, justifyContent: "center", marginBottom: 10,
  },
  modalConnectText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  modalCancelBtn: { paddingVertical: 10 },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
});
