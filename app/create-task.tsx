import { useState, useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE } from "@/constants/brand";
import { useTenant } from "@/hooks/use-tenant";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { trpc } from "@/lib/trpc";
import {
  useWorkflowTemplates,
  type WorkflowTemplate,
  type WorkflowField,
} from "@/lib/workflow-templates-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"];

// ─── Simple text field ────────────────────────────────────────────────────────

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
        {required && <Text style={{ color: "#EF4444" }}> *</Text>}
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

// ─── Dynamic field renderer ───────────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: WorkflowField;
  value: string;
  onChange: (v: string) => void;
}) {
  const colors = useColors();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateMode, setDateMode] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState(new Date());
  const [toggleVal, setToggleVal] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [ratingVal, setRatingVal] = useState(0);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const parsedDate = value ? new Date(value) : null;

  const formatDate = (d: Date) =>
    d.toLocaleString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const label = (
    <Text style={[styles.fieldLabel, { color: colors.muted }]}>
      {field.label}
      {field.required && <Text style={{ color: "#EF4444" }}> *</Text>}
    </Text>
  );

  switch (field.type) {
    // ── Text types ──────────────────────────────────────────────────────────
    case "short_text":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
            placeholderTextColor={colors.muted + "80"}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, minHeight: 44 }]}
            returnKeyType="next"
          />
        </View>
      );

    case "long_text":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
            placeholderTextColor={colors.muted + "80"}
            multiline
            numberOfLines={4}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, minHeight: 96, textAlignVertical: "top" }]}
          />
        </View>
      );

    // ── Numeric types ───────────────────────────────────────────────────────
    case "number":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={field.minValue !== undefined ? `Min: ${field.minValue}` : "0"}
            placeholderTextColor={colors.muted + "80"}
            keyboardType="numeric"
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, minHeight: 44 }]}
            returnKeyType="done"
          />
        </View>
      );

    case "currency":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.input, { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, minHeight: 44, paddingHorizontal: 12 }]}>
            <Text style={{ color: colors.muted, fontSize: 16, marginRight: 6 }}>$</Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="0.00"
              placeholderTextColor={colors.muted + "80"}
              keyboardType="decimal-pad"
              style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
              returnKeyType="done"
            />
          </View>
        </View>
      );

    // ── Date / Time types ───────────────────────────────────────────────────
    case "date":
    case "time":
    case "datetime": {
      const pickerMode: "date" | "time" = field.type === "time" ? "time" : "date";
      return (
        <View style={styles.fieldGroup}>
          {label}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTempDate(parsedDate ?? new Date());
              setDateMode(pickerMode);
              setShowDatePicker(true);
            }}
            style={[styles.datePickerBtn, { backgroundColor: colors.background, borderColor: value ? colors.primary : colors.border }]}
          >
            <IconSymbol name="calendar" size={18} color={value ? colors.primary : colors.muted} />
            <Text style={[styles.datePickerText, { color: value ? colors.foreground : colors.muted }]}>
              {parsedDate ? formatDate(parsedDate) : `Tap to select ${field.type === "time" ? "time" : "date & time"}`}
            </Text>
            {value && (
              <Pressable onPress={() => onChange("")} style={{ padding: 4 }}>
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
              </Pressable>
            )}
          </Pressable>
          {showDatePicker && Platform.OS === "ios" && (
            <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setShowDatePicker(false)} style={({ pressed }) => [styles.pickerHeaderBtn, { opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[styles.pickerCancelText, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                  {dateMode === "date" ? "Select Date" : "Select Time"}
                </Text>
                <Pressable
                  onPress={() => {
                    if (field.type === "datetime" && dateMode === "date") {
                      setDateMode("time");
                    } else {
                      onChange(tempDate.toISOString());
                      setShowDatePicker(false);
                    }
                  }}
                  style={({ pressed }) => [styles.pickerHeaderBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.pickerDoneText, { color: colors.primary }]}>
                    {field.type === "datetime" && dateMode === "date" ? "Next" : "Done"}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={dateMode}
                display="spinner"
                onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setTempDate(d); }}
                minimumDate={new Date()}
                style={{ height: 200 }}
                themeVariant="dark"
              />
            </View>
          )}
          {showDatePicker && Platform.OS !== "ios" && (
            <DateTimePicker
              value={tempDate}
              mode={dateMode}
              display="default"
              onChange={(_e: DateTimePickerEvent, d?: Date) => {
                if (d) {
                  setTempDate(d);
                  if (field.type === "datetime" && dateMode === "date") {
                    setDateMode("time");
                  } else {
                    onChange(d.toISOString());
                    setShowDatePicker(false);
                  }
                } else {
                  setShowDatePicker(false);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>
      );
    }

    // ── Selection types ─────────────────────────────────────────────────────
    case "single_select":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={styles.optionGrid}>
            {(field.options ?? []).map((opt) => {
              const isSelected = value === opt.label;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => onChange(isSelected ? "" : opt.label)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? colors.primary + "20" : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.optionChipText, { color: isSelected ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );

    case "multi_select": {
      const selected = selectedOptions;
      const toggle = (label: string) => {
        const next = selected.includes(label)
          ? selected.filter((s) => s !== label)
          : [...selected, label];
        setSelectedOptions(next);
        onChange(next.join(", "));
      };
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={styles.optionGrid}>
            {(field.options ?? []).map((opt) => {
              const isSelected = selected.includes(opt.label);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggle(opt.label)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? colors.primary + "20" : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {isSelected && <IconSymbol name="checkmark" size={12} color={colors.primary} />}
                  <Text style={[styles.optionChipText, { color: isSelected ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    case "toggle":
      return (
        <View style={styles.fieldGroup}>
          <View style={styles.toggleRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted, flex: 1 }]}>
              {field.label}
              {field.required && <Text style={{ color: "#EF4444" }}> *</Text>}
            </Text>
            <Switch
              value={toggleVal}
              onValueChange={(v) => {
                setToggleVal(v);
                onChange(v ? "yes" : "no");
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      );

    case "checklist": {
      const items = field.checklistItems ?? [];
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.checklistBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {items.map((item, i) => {
              const checked = !!checklistState[item];
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    const next = { ...checklistState, [item]: !checked };
                    setChecklistState(next);
                    const done = items.filter((it) => next[it]).length;
                    onChange(`${done}/${items.length} completed`);
                  }}
                  style={[styles.checklistItem, i < items.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.checkBox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : "transparent" }]}>
                    {checked && <IconSymbol name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.checklistLabel, { color: checked ? colors.muted : colors.foreground }]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    // ── Media types (placeholder UI — native camera/file handled separately) ─
    case "photo":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="camera.fill" size={24} color={colors.muted} />
            <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>
              {field.allowCamera && field.allowGallery
                ? "Tap to take photo or choose from gallery"
                : field.allowCamera
                ? "Tap to take photo"
                : "Tap to choose from gallery"}
            </Text>
            {field.maxFiles && field.maxFiles > 1 && (
              <Text style={[styles.mediaSubText, { color: colors.muted }]}>Up to {field.maxFiles} photos</Text>
            )}
          </View>
        </View>
      );

    case "file":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="paperclip" size={24} color={colors.muted} />
            <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>Tap to attach file</Text>
          </View>
        </View>
      );

    case "voice":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="mic.fill" size={24} color={colors.muted} />
            <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>Tap to record voice note</Text>
          </View>
        </View>
      );

    case "signature":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.signaturePad, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.signatureHint, { color: colors.muted }]}>Signature pad (collected on-site)</Text>
          </View>
        </View>
      );

    // ── Advanced types ──────────────────────────────────────────────────────
    case "gps":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="location.fill" size={24} color={colors.muted} />
            <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>GPS coordinates captured automatically</Text>
          </View>
        </View>
      );

    case "barcode":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="barcode.viewfinder" size={24} color={colors.muted} />
            <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>Tap to scan barcode or QR code</Text>
          </View>
        </View>
      );

    case "rating": {
      const max = field.ratingMax ?? 5;
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={styles.ratingRow}>
            {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  setRatingVal(star);
                  onChange(String(star));
                }}
                style={{ padding: 4 }}
              >
                <IconSymbol
                  name={star <= ratingVal ? "star.fill" : "star"}
                  size={28}
                  color={star <= ratingVal ? "#FBBF24" : colors.border}
                />
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    case "formula":
      return (
        <View style={styles.fieldGroup}>
          {label}
          <View style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }]}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Auto-calculated: {field.formulaExpression ?? "—"}</Text>
          </View>
        </View>
      );

    case "conditional":
      // Render as a simple text field — full conditional logic handled during task execution
      return (
        <View style={styles.fieldGroup}>
          {label}
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
            placeholderTextColor={colors.muted + "80"}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, minHeight: 44 }]}
            returnKeyType="next"
          />
        </View>
      );

    default:
      return null;
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateTaskScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tenantId } = useTenant();
  const { templates, loading: templatesLoading } = useWorkflowTemplates();

  // Live technicians for assignment picker
  const { data: liveTechs } = trpc.technicians.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: tenantId !== null, staleTime: 30_000 },
  );

  // tRPC create mutation
  const createTaskMutation = trpc.tasks.create.useMutation();

  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Core form fields (always shown)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [priority, setPriority] = useState("Normal");

  // Dynamic field values keyed by field.id
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  // Date picker for scheduled time (always shown)
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState(new Date());

  // Gemini SMS Draft
  const [smsDraft, setSmsDraft] = useState<string | null>(null);
  const [smsVariants, setSmsVariants] = useState<string[]>([]);
  const [smsCharCount, setSmsCharCount] = useState(0);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  // Select first template once loaded
  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  // Reset dynamic values when template changes
  const prevTemplateId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id !== prevTemplateId.current) {
      prevTemplateId.current = selectedTemplate.id;
      setDynamicValues({});
    }
  }, [selectedTemplate]);

  const smsDraftMutation = trpc.ai.draftSms.useMutation({
    onSuccess: (data) => {
      const allVariants = [data.message, ...data.variants];
      setSmsDraft(data.message);
      setSmsVariants(allVariants);
      setSmsCharCount(data.characterCount);
      setSelectedVariantIdx(0);
      setShowSmsPanel(true);
    },
  });

  const handleDraftSms = useCallback(() => {
    const address = deliveryAddress.trim() || pickupAddress.trim();
    if (!customerName.trim() || !address) {
      Alert.alert("Fill in details first", "Please enter the customer name and service address before drafting an SMS.");
      return;
    }
    smsDraftMutation.mutate({
      eventType: "job_created",
      customerName: customerName.trim(),
      jobAddress: address,
      companyName: "NVC360",
      scheduledTime: scheduledDate ? scheduledDate.toLocaleString() : undefined,
    });
  }, [customerName, deliveryAddress, pickupAddress, scheduledDate]);

  const formatScheduledDate = (d: Date | null) => {
    if (!d) return "";
    return d.toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) { Alert.alert("Required", "Please enter the customer name."); return; }
    if (!customerPhone.trim()) { Alert.alert("Required", "Please enter the customer phone number."); return; }
    const address = deliveryAddress.trim() || pickupAddress.trim();
    if (!address) { Alert.alert("Required", "Please enter a service address."); return; }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      const templateName = selectedTemplate?.name ?? "Custom";
      const dynamicSummary = Object.entries(dynamicValues)
        .filter(([, v]) => v)
        .map(([k, v]) => {
          const field = selectedTemplate?.fields.find((f) => f.id === k);
          return field ? `${field.label}: ${v}` : v;
        })
        .join("; ");

      await createTaskMutation.mutateAsync({
        tenantId: tenantId ?? 1,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        jobAddress: address,
        pickupAddress: pickupAddress.trim() || undefined,
        description: `[${templateName}] ${description.trim()}${dynamicSummary ? ` | ${dynamicSummary}` : ""}`,
        orderRef: orderId.trim() || undefined,
        technicianId: selectedAgent ?? undefined,
        scheduledAt: scheduledDate ? scheduledDate.toISOString() : undefined,
        priority: priority.toLowerCase() as "low" | "normal" | "high" | "urgent",
        customFields: Object.keys(dynamicValues).length > 0 ? dynamicValues : undefined,
      });

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Work Order Created", "The work order has been created successfully.", [
        { text: "View Tasks", onPress: () => router.replace("/(tabs)/tasks") },
        { text: "Create Another", onPress: () => router.replace("/create-task") },
      ]);
    } catch {
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <NVCHeader title="New Work Order" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Template Selector ─── */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>WORKFLOW TEMPLATE</Text>
          {templatesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateRow}
            >
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
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
                    <IconSymbol name={tpl.icon as any} size={18} color={isSelected ? "#fff" : tpl.color} />
                    <Text style={[styles.templateLabel, { color: isSelected ? "#fff" : colors.foreground }]}>
                      {tpl.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Template description badge */}
          {selectedTemplate && (
            <View style={[styles.templateDescRow, { backgroundColor: selectedTemplate.color + "15", borderColor: selectedTemplate.color + "40" }]}>
              <IconSymbol name={selectedTemplate.icon as any} size={14} color={selectedTemplate.color} />
              <Text style={[styles.templateDesc, { color: selectedTemplate.color }]}>
                {selectedTemplate.description}
              </Text>
              <Text style={[styles.templateFieldCount, { color: selectedTemplate.color + "99" }]}>
                {selectedTemplate.fields.length} fields
              </Text>
            </View>
          )}

          {/* ─── Customer Info ─── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer Information</Text>
            <FormField label="Full Name" value={customerName} onChangeText={setCustomerName} placeholder="Jane Smith" required />
            <FormField label="Phone Number" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1 (204) 555-0000" required />
            <FormField label="Email (optional)" value={customerEmail} onChangeText={setCustomerEmail} placeholder="jane@email.com" />
          </View>

          {/* ─── Service Address (always shown) ─── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Service Location</Text>
            <FormField label="Service Address" value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="456 Customer Ave, Winnipeg" required />
            <FormField label="Pickup Address (optional)" value={pickupAddress} onChangeText={setPickupAddress} placeholder="123 Warehouse Blvd" />
            <FormField label="Order / Reference #" value={orderId} onChangeText={setOrderId} placeholder="NVC-2026-XXX" />
          </View>

          {/* ─── Scheduled Time ─── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Schedule</Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Scheduled Date &amp; Time</Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTempDate(scheduledDate ?? new Date());
                  setDatePickerMode("date");
                  setShowDatePicker(true);
                }}
                style={[styles.datePickerBtn, { backgroundColor: colors.background, borderColor: scheduledDate ? colors.primary : colors.border }]}
              >
                <IconSymbol name="calendar" size={18} color={scheduledDate ? colors.primary : colors.muted} />
                <Text style={[styles.datePickerText, { color: scheduledDate ? colors.foreground : colors.muted }]}>
                  {scheduledDate ? formatScheduledDate(scheduledDate) : "Tap to select date & time"}
                </Text>
                {scheduledDate && (
                  <Pressable onPress={(e) => { e.stopPropagation?.(); setScheduledDate(null); }} style={{ padding: 4 }}>
                    <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                  </Pressable>
                )}
              </Pressable>

              {showDatePicker && Platform.OS === "ios" && (
                <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                    <Pressable onPress={() => setShowDatePicker(false)} style={({ pressed }) => [styles.pickerHeaderBtn, { opacity: pressed ? 0.6 : 1 }]}>
                      <Text style={[styles.pickerCancelText, { color: colors.muted }]}>Cancel</Text>
                    </Pressable>
                    <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                      {datePickerMode === "date" ? "Select Date" : "Select Time"}
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (datePickerMode === "date") {
                          setDatePickerMode("time");
                        } else {
                          setScheduledDate(tempDate);
                          setShowDatePicker(false);
                          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }}
                      style={({ pressed }) => [styles.pickerHeaderBtn, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.pickerDoneText, { color: colors.primary }]}>
                        {datePickerMode === "date" ? "Next" : "Done"}
                      </Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode={datePickerMode}
                    display="spinner"
                    onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setTempDate(d); }}
                    minimumDate={new Date()}
                    style={{ height: 200 }}
                    themeVariant="dark"
                  />
                </View>
              )}
              {showDatePicker && Platform.OS !== "ios" && (
                <DateTimePicker
                  value={tempDate}
                  mode={datePickerMode}
                  display="default"
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {
                    if (d) {
                      setTempDate(d);
                      if (datePickerMode === "date") {
                        setDatePickerMode("time");
                      } else {
                        setScheduledDate(d);
                        setShowDatePicker(false);
                      }
                    } else {
                      setShowDatePicker(false);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Priority */}
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
                        { backgroundColor: isSelected ? pColor : colors.background, borderColor: isSelected ? pColor : colors.border },
                      ]}
                    >
                      <Text style={[styles.priorityBtnText, { color: isSelected ? "#fff" : colors.muted }]}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ─── Template Dynamic Fields ─── */}
          {selectedTemplate && selectedTemplate.fields.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardTitleRow}>
                <IconSymbol name={selectedTemplate.icon as any} size={18} color={selectedTemplate.color} />
                <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 0 }]}>
                  {selectedTemplate.name} Fields
                </Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {selectedTemplate.description}
              </Text>
              {selectedTemplate.fields.map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={dynamicValues[field.id] ?? ""}
                  onChange={(v) => setDynamicValues((prev) => ({ ...prev, [field.id]: v }))}
                />
              ))}
            </View>
          )}

          {/* ─── Job Notes ─── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Additional Notes</Text>
            <FormField label="Job Description / Notes" value={description} onChangeText={setDescription} placeholder="Any additional details about this work order…" multiline />
          </View>

          {/* ─── Assign Technician ─── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Assign Technician</Text>
            <Pressable
              onPress={() => setSelectedAgent(null)}
              style={[
                styles.agentOption,
                { backgroundColor: selectedAgent === null ? colors.primary + "15" : colors.background, borderColor: selectedAgent === null ? colors.primary : colors.border },
              ]}
            >
              <IconSymbol name="person.2.fill" size={18} color={selectedAgent === null ? colors.primary : colors.muted} />
              <Text style={[styles.agentOptionText, { color: selectedAgent === null ? colors.primary : colors.muted }]}>
                Auto-assign (nearest available)
              </Text>
              {selectedAgent === null && <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />}
            </Pressable>
            {(liveTechs ?? []).map((agent) => {
              const isSelected = selectedAgent === agent.tech.id;
              const isOnline = agent.tech.status === "online" || agent.tech.status === "busy";
              const agentName = agent.user?.name ?? `Technician #${agent.tech.id}`;
              return (
                <Pressable
                  key={agent.tech.id}
                  onPress={() => setSelectedAgent(isSelected ? null : agent.tech.id)}
                  style={[
                    styles.agentOption,
                    { backgroundColor: isSelected ? colors.primary + "15" : colors.background, borderColor: isSelected ? colors.primary : colors.border, opacity: isOnline ? 1 : 0.5 },
                  ]}
                >
                  <View style={styles.agentDot}>
                    <View style={[styles.agentDotInner, { backgroundColor: isOnline ? "#16A34A" : "#94A3B8" }]} />
                  </View>
                  <Text style={[styles.agentOptionText, { color: isSelected ? colors.primary : colors.foreground }]}>{agentName}</Text>
                  <Text style={[styles.agentStatus, { color: colors.muted }]}>{isOnline ? "Online" : "Offline"}</Text>
                  {isSelected && <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          {/* ─── Gemini SMS Draft Panel ─── */}
          <View style={[styles.smsPanelContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.smsPanelHeader}>
              <View style={[styles.smsPanelDot, { backgroundColor: "#3B8FDF" }]} />
              <Text style={[styles.smsPanelTitle, { color: colors.foreground }]}>Gemini SMS Draft</Text>
              <Text style={[styles.smsPanelSub, { color: colors.muted }]}>Auto-draft customer notification</Text>
            </View>
            {!showSmsPanel ? (
              <Pressable
                onPress={handleDraftSms}
                disabled={smsDraftMutation.isPending}
                style={({ pressed }) => [
                  styles.smsDraftBtn,
                  { backgroundColor: "#3B8FDF18", borderColor: "#3B8FDF40" },
                  pressed && { opacity: 0.75 },
                  smsDraftMutation.isPending && { opacity: 0.6 },
                ]}
              >
                {smsDraftMutation.isPending ? (
                  <ActivityIndicator size="small" color="#3B8FDF" />
                ) : (
                  <IconSymbol name="paperplane.fill" size={14} color="#3B8FDF" />
                )}
                <Text style={[styles.smsDraftBtnText, { color: "#3B8FDF" }]}>
                  {smsDraftMutation.isPending ? "Drafting with Gemini AI…" : "Draft Customer SMS with AI"}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.smsDraftResult}>
                <View style={styles.smsVariantRow}>
                  {["Professional", "Friendly", "Brief"].map((label, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setSelectedVariantIdx(i);
                        setSmsDraft(smsVariants[i] ?? smsVariants[0]);
                        setSmsCharCount((smsVariants[i] ?? smsVariants[0]).length);
                      }}
                      style={[
                        styles.smsVariantChip,
                        { backgroundColor: selectedVariantIdx === i ? "#3B8FDF" : colors.background, borderColor: selectedVariantIdx === i ? "#3B8FDF" : colors.border },
                      ]}
                    >
                      <Text style={[styles.smsVariantText, { color: selectedVariantIdx === i ? "#fff" : colors.muted }]}>{label}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleDraftSms}
                    style={[styles.smsVariantChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Text style={[styles.smsVariantText, { color: colors.muted }]}>↻ Re-draft</Text>
                  </Pressable>
                </View>
                <TextInput
                  value={smsDraft ?? ""}
                  onChangeText={(t) => { setSmsDraft(t); setSmsCharCount(t.length); }}
                  multiline
                  style={[
                    styles.smsTextInput,
                    { color: colors.foreground, backgroundColor: colors.background, borderColor: smsCharCount > 160 ? "#EF4444" : colors.border },
                  ]}
                  placeholderTextColor={colors.muted}
                />
                <View style={styles.smsFooter}>
                  <Text style={[styles.smsCharCount, { color: smsCharCount > 160 ? "#EF4444" : colors.muted }]}>
                    {smsCharCount}/160 chars · {Math.ceil(smsCharCount / 160)} segment{Math.ceil(smsCharCount / 160) > 1 ? "s" : ""}
                  </Text>
                  <Pressable onPress={() => setShowSmsPanel(false)} style={[styles.smsDismiss, { borderColor: colors.border }]}>
                    <Text style={[styles.smsDismissText, { color: colors.muted }]}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* ─── Submit ─── */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: NVC_BLUE },
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.6 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
                <Text style={[styles.submitBtnText, { color: "#fff" }]}>Create Work Order</Text>
              </>
            )}
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: -8 },
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
  templateLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateDescRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -8,
  },
  templateDesc: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  templateFieldCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, marginBottom: 8, marginTop: -4 },
  fieldGroup: { gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  checklistBox: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  checklistItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checklistLabel: { flex: 1, fontSize: 14 },
  mediaPlaceholder: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
  },
  mediaPlaceholderText: { fontSize: 13, textAlign: "center" },
  mediaSubText: { fontSize: 11 },
  signaturePad: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureHint: { fontSize: 13 },
  ratingRow: { flexDirection: "row", gap: 4 },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  priorityBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  agentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  agentOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
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
  submitBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  datePickerText: { flex: 1, fontSize: 15 },
  pickerSheet: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  pickerHeaderBtn: { minWidth: 60 },
  pickerCancelText: { fontSize: 15 },
  pickerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerDoneText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  smsPanelContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  smsPanelHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  smsPanelDot: { width: 8, height: 8, borderRadius: 4 },
  smsPanelTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  smsPanelSub: { fontSize: 12, flex: 1 },
  smsDraftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  smsDraftBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  smsDraftResult: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  smsVariantRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  smsVariantChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  smsVariantText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  smsTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 72,
    textAlignVertical: "top",
  },
  smsFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smsCharCount: { fontSize: 11 },
  smsDismiss: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  smsDismissText: { fontSize: 12 },
});
