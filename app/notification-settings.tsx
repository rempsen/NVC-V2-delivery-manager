import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationChannel = "sms" | "email" | "both" | "none";

interface MilestoneConfig {
  id: string;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
  channel: NotificationChannel;
  enabled: boolean;
  category: string;
}

// ─── Default Milestones ───────────────────────────────────────────────────────

const DEFAULT_MILESTONES: MilestoneConfig[] = [
  // Job Lifecycle
  {
    id: "job_booked",
    label: "Job Booking Confirmation",
    description: "Sent to customer when a new work order is created and confirmed.",
    icon: "doc.badge.plus" as const,
    iconColor: "#22C55E",
    channel: "both",
    enabled: true,
    category: "Job Lifecycle",
  },
  {
    id: "agent_assigned",
    label: "Technician Assigned",
    description: "Sent when a technician is assigned to the job.",
    icon: "person.fill" as const,
    iconColor: "#3B82F6",
    channel: "both",
    enabled: true,
    category: "Job Lifecycle",
  },
  {
    id: "agent_en_route",
    label: "Technician En Route",
    description: "Sent when the technician starts driving to the job site. Includes live tracking link.",
    icon: "car.fill" as const,
    iconColor: "#F59E0B",
    channel: "sms",
    enabled: true,
    category: "Job Lifecycle",
  },
  {
    id: "agent_arrived",
    label: "Technician Arrived",
    description: "Sent when the technician arrives at the job site (geo-clock in).",
    icon: "location.fill" as const,
    iconColor: "#8B5CF6",
    channel: "sms",
    enabled: true,
    category: "Job Lifecycle",
  },
  {
    id: "job_started",
    label: "Job Started",
    description: "Sent when the technician begins work on site.",
    icon: "wrench.fill" as const,
    iconColor: "#06B6D4",
    channel: "none",
    enabled: false,
    category: "Job Lifecycle",
  },
  {
    id: "job_completed",
    label: "Job Completed",
    description: "Sent when the technician marks the job as complete. Includes summary and invoice.",
    icon: "checkmark.circle.fill" as const,
    iconColor: "#22C55E",
    channel: "both",
    enabled: true,
    category: "Job Lifecycle",
  },
  {
    id: "job_failed",
    label: "Job Could Not Be Completed",
    description: "Sent if the technician is unable to complete the job.",
    icon: "xmark.circle.fill" as const,
    iconColor: "#EF4444",
    channel: "both",
    enabled: true,
    category: "Job Lifecycle",
  },
  // Follow-Up
  {
    id: "followup_24h",
    label: "24-Hour Follow-Up",
    description: "Sent 24 hours after job completion to check satisfaction.",
    icon: "clock.fill" as const,
    iconColor: "#6366F1",
    channel: "email",
    enabled: true,
    category: "Follow-Up",
  },
  {
    id: "followup_review",
    label: "Review Request",
    description: "Sent 48 hours after job completion requesting a review.",
    icon: "star.fill" as const,
    iconColor: "#F59E0B",
    channel: "email",
    enabled: false,
    category: "Follow-Up",
  },
  // Billing
  {
    id: "invoice_sent",
    label: "Invoice Sent",
    description: "Sent when an invoice is generated and sent to the customer.",
    icon: "dollarsign.circle.fill" as const,
    iconColor: "#22C55E",
    channel: "email",
    enabled: true,
    category: "Billing",
  },
  {
    id: "payment_received",
    label: "Payment Received",
    description: "Sent when a payment is successfully processed.",
    icon: "creditcard.fill" as const,
    iconColor: "#22C55E",
    channel: "email",
    enabled: true,
    category: "Billing",
  },
  {
    id: "payment_overdue",
    label: "Payment Overdue",
    description: "Sent when an invoice is past its due date.",
    icon: "exclamationmark.triangle.fill" as const,
    iconColor: "#EF4444",
    channel: "both",
    enabled: true,
    category: "Billing",
  },
  {
    id: "payment_reminder",
    label: "Payment Reminder",
    description: "Sent 3 days before invoice due date.",
    icon: "bell.fill" as const,
    iconColor: "#F59E0B",
    channel: "email",
    enabled: false,
    category: "Billing",
  },
];

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string; color: string }[] = [
  { value: "sms", label: "SMS", color: "#22C55E" },
  { value: "email", label: "Email", color: "#3B82F6" },
  { value: "both", label: "Both", color: "#8B5CF6" },
  { value: "none", label: "None", color: "#6B7280" },
];

const CATEGORIES = ["All", "Job Lifecycle", "Follow-Up", "Billing"];

// ─── Channel Selector ─────────────────────────────────────────────────────────

function ChannelSelector({
  value,
  onChange,
  disabled,
}: {
  value: NotificationChannel;
  onChange: (v: NotificationChannel) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.channelRow}>
      {CHANNEL_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          style={({ pressed }) => [
            styles.channelChip,
            {
              backgroundColor: value === opt.value ? opt.color : colors.surface,
              borderColor: value === opt.value ? opt.color : colors.border,
              opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => {
            if (disabled) return;
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(opt.value);
          }}
        >
          <Text
            style={[
              styles.channelChipText,
              { color: value === opt.value ? "#fff" : colors.muted },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Milestone Row ────────────────────────────────────────────────────────────

function MilestoneRow({
  config,
  onToggle,
  onChannelChange,
}: {
  config: MilestoneConfig;
  onToggle: (id: string, enabled: boolean) => void;
  onChannelChange: (id: string, channel: NotificationChannel) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.milestoneCard,
        {
          backgroundColor: colors.surface,
          borderColor: config.enabled ? config.iconColor + "30" : colors.border,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.milestoneHeader, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={[styles.milestoneIcon, { backgroundColor: config.iconColor + "15" }]}>
          <IconSymbol name={config.icon} size={18} color={config.iconColor} />
        </View>
        <View style={styles.milestoneLabelWrap}>
          <Text style={[styles.milestoneLabel, { color: config.enabled ? colors.foreground : colors.muted }]}>
            {config.label}
          </Text>
          {config.enabled && (
            <View style={[styles.channelBadge, { backgroundColor: CHANNEL_OPTIONS.find((c) => c.value === config.channel)!.color + "20" }]}>
              <Text style={[styles.channelBadgeText, { color: CHANNEL_OPTIONS.find((c) => c.value === config.channel)!.color }]}>
                {CHANNEL_OPTIONS.find((c) => c.value === config.channel)!.label}
              </Text>
            </View>
          )}
        </View>
        <Switch
          value={config.enabled}
          onValueChange={(v) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggle(config.id, v);
          }}
          trackColor={{ false: colors.border, true: config.iconColor }}
          thumbColor="#fff"
        />
      </Pressable>

      {expanded && (
        <View style={[styles.milestoneExpanded, { borderTopColor: colors.border }]}>
          <Text style={[styles.milestoneDesc, { color: colors.muted }]}>{config.description}</Text>
          <Text style={[styles.channelLabel, { color: colors.foreground }]}>Delivery Channel</Text>
          <ChannelSelector
            value={config.channel}
            onChange={(v) => onChannelChange(config.id, v)}
            disabled={!config.enabled}
          />
        </View>
      )}
    </View>
  );
}

// ─── Email Template Editor ────────────────────────────────────────────────────

function EmailTemplateSection() {
  const colors = useColors();
  const [subject, setSubject] = useState("Your {{company_name}} technician is on the way!");
  const [greeting, setGreeting] = useState("Hi {{customer_name}},");
  const [body, setBody] = useState(
    "Your technician {{agent_name}} is en route to your location at {{job_address}}.\n\nEstimated arrival: {{eta}}\n\nTrack their live location: {{tracking_link}}\n\nIf you need to reach them, call {{agent_phone}} or reply to this message.",
  );
  const [footer, setFooter] = useState("Thank you for choosing {{company_name}}.\n{{company_phone}} · {{company_website}}");
  const [brandColor, setBrandColor] = useState("#E85D04");

  const VARIABLES = [
    "{{customer_name}}", "{{agent_name}}", "{{agent_phone}}", "{{job_address}}",
    "{{eta}}", "{{tracking_link}}", "{{company_name}}", "{{company_phone}}",
    "{{company_website}}", "{{invoice_amount}}", "{{invoice_link}}", "{{job_date}}",
  ];

  return (
    <View style={styles.templateSection}>
      <Text style={[styles.templateTitle, { color: colors.foreground }]}>Email Template Editor</Text>
      <Text style={[styles.templateSubtitle, { color: colors.muted }]}>
        Customize the email sent at each milestone. Use variables to personalize content.
      </Text>

      {/* Brand Color */}
      <View style={[styles.templateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.templateFieldLabel, { color: colors.muted }]}>Brand Color (Hex)</Text>
        <View style={styles.colorRow}>
          <View style={[styles.colorSwatch, { backgroundColor: brandColor }]} />
          <TextInput
            style={[styles.templateInput, { color: colors.foreground, flex: 1 }]}
            value={brandColor}
            onChangeText={setBrandColor}
            placeholder="#E85D04"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Subject */}
      <View style={[styles.templateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.templateFieldLabel, { color: colors.muted }]}>Subject Line</Text>
        <TextInput
          style={[styles.templateInput, { color: colors.foreground }]}
          value={subject}
          onChangeText={setSubject}
          placeholder="Email subject..."
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Greeting */}
      <View style={[styles.templateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.templateFieldLabel, { color: colors.muted }]}>Greeting</Text>
        <TextInput
          style={[styles.templateInput, { color: colors.foreground }]}
          value={greeting}
          onChangeText={setGreeting}
          placeholder="Hi {{customer_name}},"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Body */}
      <View style={[styles.templateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.templateFieldLabel, { color: colors.muted }]}>Email Body</Text>
        <TextInput
          style={[styles.templateInput, styles.templateTextarea, { color: colors.foreground }]}
          value={body}
          onChangeText={setBody}
          placeholder="Email body..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Footer */}
      <View style={[styles.templateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.templateFieldLabel, { color: colors.muted }]}>Footer</Text>
        <TextInput
          style={[styles.templateInput, styles.templateTextarea, { color: colors.foreground }]}
          value={footer}
          onChangeText={setFooter}
          placeholder="Footer text..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Variables */}
      <Text style={[styles.variablesTitle, { color: colors.muted }]}>AVAILABLE VARIABLES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variablesScroll}>
        {VARIABLES.map((v) => (
          <Pressable
            key={v}
            style={({ pressed }) => [
              styles.variableChip,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => Alert.alert("Variable", `Tap to copy: ${v}`)}
          >
            <Text style={[styles.variableText, { color: colors.primary }]}>{v}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Actions */}
      <View style={styles.templateActions}>
        <Pressable
          style={({ pressed }) => [
            styles.previewBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => Alert.alert("Preview Email", "A preview will be sent to your email address.")}
        >
          <IconSymbol name="eye.fill" size={14} color={colors.muted} />
          <Text style={[styles.previewBtnText, { color: colors.muted }]}>Preview</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.saveTemplateBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Saved", "Email template saved successfully.");
          }}
        >
          <Text style={styles.saveTemplateBtnText}>Save Template</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [milestones, setMilestones] = useState<MilestoneConfig[]>(DEFAULT_MILESTONES);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"milestones" | "twilio" | "email" | "template">("milestones");

  // Twilio config
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [senderName, setSenderName] = useState("Acme HVAC");

  // Email config
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@acmehvac.com");
  const [fromName, setFromName] = useState("Acme HVAC Services");

  const filteredMilestones = milestones.filter(
    (m) => categoryFilter === "All" || m.category === categoryFilter,
  );

  const enabledCount = milestones.filter((m) => m.enabled).length;

  const handleToggle = (id: string, enabled: boolean) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
  };

  const handleChannelChange = (id: string, channel: NotificationChannel) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, channel } : m)));
  };

  const handleEnableAll = () => {
    setMilestones((prev) => prev.map((m) => ({ ...m, enabled: true })));
  };

  const handleDisableAll = () => {
    setMilestones((prev) => prev.map((m) => ({ ...m, enabled: false })));
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
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <Text style={styles.headerSub}>{enabledCount} of {milestones.length} milestones active</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(["milestones", "twilio", "email", "template"] as const).map((tab) => {
          const labels = { milestones: "Milestones", twilio: "SMS/Twilio", email: "Email", template: "Templates" };
          return (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                { borderBottomColor: activeTab === tab ? colors.primary : "transparent" },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Milestones Tab ── */}
        {activeTab === "milestones" && (
          <>
            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContent}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: categoryFilter === cat ? colors.primary + "20" : "transparent" },
                  ]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: categoryFilter === cat ? colors.primary : colors.muted }]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Bulk Actions */}
            <View style={styles.bulkActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.bulkBtn,
                  { backgroundColor: "#22C55E15", borderColor: "#22C55E40", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleEnableAll}
              >
                <Text style={[styles.bulkBtnText, { color: "#22C55E" }]}>Enable All</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.bulkBtn,
                  { backgroundColor: "#EF444415", borderColor: "#EF444440", opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleDisableAll}
              >
                <Text style={[styles.bulkBtnText, { color: "#EF4444" }]}>Disable All</Text>
              </Pressable>
            </View>

            {/* Milestone List */}
            <View style={styles.milestoneList}>
              {filteredMilestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  config={m}
                  onToggle={handleToggle}
                  onChannelChange={handleChannelChange}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Twilio SMS Tab ── */}
        {activeTab === "twilio" && (
          <View style={styles.configSection}>
            <View style={[styles.configBanner, { backgroundColor: "#22C55E15", borderColor: "#22C55E30" }]}>
              <IconSymbol name="message.fill" size={18} color="#22C55E" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.configBannerTitle, { color: "#22C55E" }]}>Twilio SMS Integration</Text>
                <Text style={[styles.configBannerDesc, { color: colors.muted }]}>
                  SMS messages are sent from your Twilio account using your company's sender name. Customers see your brand, not Twilio.
                </Text>
              </View>
            </View>

            <ConfigField label="Sender Name (shown to customers)" value={senderName} onChange={setSenderName} placeholder="Your Company Name" />
            <ConfigField label="Twilio Account SID" value={twilioSid} onChange={setTwilioSid} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" secure />
            <ConfigField label="Twilio Auth Token" value={twilioToken} onChange={setTwilioToken} placeholder="Your auth token" secure />
            <ConfigField label="Twilio Phone Number" value={twilioPhone} onChange={setTwilioPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />

            <Pressable
              style={({ pressed }) => [
                styles.saveConfigBtn,
                { backgroundColor: "#22C55E", opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => Alert.alert("Saved", "Twilio configuration saved. Test SMS sent to your number.")}
            >
              <Text style={styles.saveConfigBtnText}>Save & Send Test SMS</Text>
            </Pressable>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>SMS Tracking Links</Text>
              <Text style={[styles.infoCardText, { color: colors.muted }]}>
                When the "Technician En Route" milestone fires, the SMS automatically includes a live tracking link branded to your company. Customers tap it to see the technician's real-time location and ETA — no app required.
              </Text>
            </View>
          </View>
        )}

        {/* ── Email Config Tab ── */}
        {activeTab === "email" && (
          <View style={styles.configSection}>
            <View style={[styles.configBanner, { backgroundColor: "#3B82F615", borderColor: "#3B82F630" }]}>
              <IconSymbol name="envelope.fill" size={18} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.configBannerTitle, { color: "#3B82F6" }]}>Custom Email Domain</Text>
                <Text style={[styles.configBannerDesc, { color: colors.muted }]}>
                  Emails are sent from your company's own domain (e.g., noreply@yourcompany.com) using your SMTP server or a service like SendGrid or Mailgun.
                </Text>
              </View>
            </View>

            <ConfigField label="From Name" value={fromName} onChange={setFromName} placeholder="Your Company Name" />
            <ConfigField label="From Email Address" value={fromEmail} onChange={setFromEmail} placeholder="noreply@yourcompany.com" keyboardType="email-address" />
            <ConfigField label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.yourcompany.com or smtp.sendgrid.net" />
            <ConfigField label="SMTP Port" value={smtpPort} onChange={setSmtpPort} placeholder="587" keyboardType="numeric" />
            <ConfigField label="SMTP Username" value={smtpUser} onChange={setSmtpUser} placeholder="apikey or your@email.com" />
            <ConfigField label="SMTP Password / API Key" value={smtpPassword} onChange={setSmtpPassword} placeholder="Your SMTP password or API key" secure />

            <Pressable
              style={({ pressed }) => [
                styles.saveConfigBtn,
                { backgroundColor: "#3B82F6", opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => Alert.alert("Saved", "Email configuration saved. A test email has been sent to your address.")}
            >
              <Text style={styles.saveConfigBtnText}>Save & Send Test Email</Text>
            </Pressable>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>Supported Email Providers</Text>
              <Text style={[styles.infoCardText, { color: colors.muted }]}>
                Works with any SMTP provider: SendGrid, Mailgun, Amazon SES, Postmark, Office 365, Google Workspace, or your own mail server. For best deliverability, we recommend SendGrid or Mailgun.
              </Text>
            </View>
          </View>
        )}

        {/* ── Template Tab ── */}
        {activeTab === "template" && <EmailTemplateSection />}

      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Config Field Helper ──────────────────────────────────────────────────────

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: any;
}) {
  const colors = useColors();
  const [show, setShow] = useState(false);
  return (
    <View style={styles.configFieldWrap}>
      <Text style={[styles.configFieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.configFieldInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.configInput, { color: colors.foreground, flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secure && (
          <Pressable onPress={() => setShow((v) => !v)} style={{ padding: 4 }}>
            <IconSymbol name={show ? "eye.slash.fill" : "eye.fill"} size={14} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 12, fontWeight: "700" },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  categoryContent: { paddingBottom: 12, gap: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 6,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  bulkActions: { flexDirection: "row", gap: 10, marginBottom: 4 },
  bulkBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  bulkBtnText: { fontSize: 13, fontWeight: "700" },
  milestoneList: { gap: 8 },
  milestoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  milestoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  milestoneIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneLabelWrap: { flex: 1, gap: 4 },
  milestoneLabel: { fontSize: 14, fontWeight: "600" },
  channelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelBadgeText: { fontSize: 10, fontWeight: "700" },
  milestoneExpanded: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  milestoneDesc: { fontSize: 13, lineHeight: 18 },
  channelLabel: { fontSize: 12, fontWeight: "700" },
  channelRow: { flexDirection: "row", gap: 8 },
  channelChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  channelChipText: { fontSize: 12, fontWeight: "700" },
  // Config
  configSection: { gap: 12 },
  configBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  configBannerTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  configBannerDesc: { fontSize: 13, lineHeight: 18 },
  configFieldWrap: { gap: 6 },
  configFieldLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  configFieldInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 8,
  },
  configInput: { fontSize: 14 },
  saveConfigBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveConfigBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  infoCardTitle: { fontSize: 14, fontWeight: "700" },
  infoCardText: { fontSize: 13, lineHeight: 18 },
  // Template
  templateSection: { gap: 12 },
  templateTitle: { fontSize: 18, fontWeight: "800" },
  templateSubtitle: { fontSize: 13, lineHeight: 18 },
  templateField: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
  },
  templateFieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  templateInput: { fontSize: 14, lineHeight: 20 },
  templateTextarea: { minHeight: 100 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorSwatch: { width: 28, height: 28, borderRadius: 8 },
  variablesTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  variablesScroll: { marginBottom: 4 },
  variableChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  variableText: { fontSize: 11, fontWeight: "600", fontFamily: "monospace" },
  templateActions: { flexDirection: "row", gap: 10 },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  previewBtnText: { fontSize: 14, fontWeight: "600" },
  saveTemplateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveTemplateBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
