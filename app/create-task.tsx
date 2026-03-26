import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { createTask, MOCK_AGENTS } from "@/lib/tookan";

// ─── Workflow Templates ───────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "delivery",
    label: "Delivery",
    icon: "truck.box.fill",
    color: "#1A56DB",
    fields: ["pickup_address", "delivery_address", "order_id", "description"],
  },
  {
    id: "installation",
    label: "Installation",
    icon: "gear",
    color: "#8B5CF6",
    fields: ["site_address", "description", "checklist", "scheduled_time"],
  },
  {
    id: "service_call",
    label: "Service Call",
    icon: "wrench",
    color: "#F97316",
    fields: ["site_address", "description", "priority", "scheduled_time"],
  },
  {
    id: "inspection",
    label: "Inspection",
    icon: "checkmark.circle.fill",
    color: "#16A34A",
    fields: ["site_address", "description", "checklist"],
  },
  {
    id: "pickup",
    label: "Pickup",
    icon: "arrow.clockwise",
    color: "#D97706",
    fields: ["pickup_address", "description", "order_id"],
  },
  {
    id: "custom",
    label: "Custom",
    icon: "pencil",
    color: "#64748B",
    fields: ["site_address", "description"],
  },
];

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"];

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted + "80"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
            minHeight: multiline ? 80 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
        returnKeyType={multiline ? undefined : "next"}
      />
    </View>
  );
}

export default function CreateTaskScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [priority, setPriority] = useState("Normal");

  const hasField = (field: string) => selectedTemplate.fields.includes(field);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      Alert.alert("Required", "Please enter the customer name.");
      return;
    }
    if (!customerPhone.trim()) {
      Alert.alert("Required", "Please enter the customer phone number.");
      return;
    }
    const address = deliveryAddress.trim() || pickupAddress.trim();
    if (!address) {
      Alert.alert("Required", "Please enter a service address.");
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      await createTask({
        customer_username: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        job_address: address,
        job_pickup_address: pickupAddress.trim() || undefined,
        job_description: `[${selectedTemplate.label}] ${description.trim()}`,
        order_id: orderId.trim() || undefined,
        fleet_id: selectedAgent ?? undefined,
        scheduled_time: scheduledTime.trim() || undefined,
        has_pickup: pickupAddress.trim() ? 1 : 0,
        has_delivery: 1,
      });

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Task Created", "The work order has been created successfully.", [
        { text: "View Tasks", onPress: () => router.replace("/(tabs)/tasks") },
        { text: "Create Another", onPress: () => router.replace("/create-task") },
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Work Order</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Template Selector */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>WORKFLOW TEMPLATE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateRow}
          >
            {TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <Pressable
                  key={tpl.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setSelectedTemplate(tpl);
                  }}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor: isSelected ? tpl.color : colors.surface,
                      borderColor: isSelected ? tpl.color : colors.border,
                    },
                  ]}
                >
                  <IconSymbol
                    name={tpl.icon as any}
                    size={18}
                    color={isSelected ? "#fff" : tpl.color}
                  />
                  <Text
                    style={[
                      styles.templateLabel,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {tpl.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Customer Info */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer Information</Text>
            <FormField label="Full Name" value={customerName} onChangeText={setCustomerName} placeholder="Jane Smith" required />
            <FormField label="Phone Number" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1 (204) 555-0000" required />
            <FormField label="Email (optional)" value={customerEmail} onChangeText={setCustomerEmail} placeholder="jane@email.com" />
          </View>

          {/* Job Details */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Job Details</Text>

            {hasField("pickup_address") && (
              <FormField label="Pickup Address" value={pickupAddress} onChangeText={setPickupAddress} placeholder="123 Warehouse Blvd" />
            )}
            {(hasField("delivery_address") || hasField("site_address")) && (
              <FormField
                label={hasField("delivery_address") ? "Delivery Address" : "Site Address"}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="456 Customer Ave, Winnipeg"
                required
              />
            )}
            {hasField("description") && (
              <FormField label="Job Description" value={description} onChangeText={setDescription} placeholder="Describe the work to be done..." multiline />
            )}
            {hasField("order_id") && (
              <FormField label="Order / Reference #" value={orderId} onChangeText={setOrderId} placeholder="NVC-2026-XXX" />
            )}
            {hasField("scheduled_time") && (
              <FormField label="Scheduled Date & Time" value={scheduledTime} onChangeText={setScheduledTime} placeholder="e.g. 2026-04-15 10:00 AM" />
            )}
            {hasField("priority") && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const isSelected = priority === p;
                    const pColor = p === "Urgent" ? "#DC2626" : p === "High" ? "#D97706" : p === "Normal" ? "#1A56DB" : "#64748B";
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityBtn,
                          {
                            backgroundColor: isSelected ? pColor : colors.background,
                            borderColor: isSelected ? pColor : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.priorityBtnText, { color: isSelected ? "#fff" : colors.muted }]}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Assign Technician */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Assign Technician</Text>
            <Pressable
              onPress={() => setSelectedAgent(null)}
              style={[
                styles.agentOption,
                {
                  backgroundColor: selectedAgent === null ? colors.primary + "15" : colors.background,
                  borderColor: selectedAgent === null ? colors.primary : colors.border,
                },
              ]}
            >
              <IconSymbol name="person.2.fill" size={18} color={selectedAgent === null ? colors.primary : colors.muted} />
              <Text style={[styles.agentOptionText, { color: selectedAgent === null ? colors.primary : colors.muted }]}>
                Auto-assign (nearest available)
              </Text>
              {selectedAgent === null && <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />}
            </Pressable>
            {MOCK_AGENTS.map((agent) => {
              const isSelected = selectedAgent === agent.fleet_id;
              const isOnline = agent.is_available === 1;
              return (
                <Pressable
                  key={agent.fleet_id}
                  onPress={() => setSelectedAgent(isSelected ? null : agent.fleet_id)}
                  style={[
                    styles.agentOption,
                    {
                      backgroundColor: isSelected ? colors.primary + "15" : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: isOnline ? 1 : 0.5,
                    },
                  ]}
                >
                  <View style={styles.agentDot}>
                    <View style={[styles.agentDotInner, { backgroundColor: isOnline ? "#16A34A" : "#94A3B8" }]} />
                  </View>
                  <Text style={[styles.agentOptionText, { color: isSelected ? colors.primary : colors.foreground }]}>
                    {agent.fleet_name}
                  </Text>
                  <Text style={[styles.agentStatus, { color: colors.muted }]}>
                    {isOnline ? "Online" : "Offline"}
                  </Text>
                  {isSelected && <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.6 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <IconSymbol name="plus.circle.fill" size={20} color={colors.background} />
                <Text style={[styles.submitBtnText, { color: colors.background }]}>
                  Create Work Order
                </Text>
              </>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4, width: 36 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  scrollContent: { padding: 16, gap: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: -8 },
  templateRow: { gap: 8, paddingVertical: 4 },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  templateLabel: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  fieldGroup: { gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityBtnText: { fontSize: 12, fontWeight: "600" },
  agentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  agentOptionText: { flex: 1, fontSize: 14, fontWeight: "500" },
  agentStatus: { fontSize: 12 },
  agentDot: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  agentDotInner: { width: 10, height: 10, borderRadius: 5 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 17, fontWeight: "700" },
});
