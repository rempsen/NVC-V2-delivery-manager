import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType =
  | "short_text" | "long_text" | "number" | "currency" | "date" | "time"
  | "datetime" | "single_select" | "multi_select" | "toggle" | "checklist"
  | "photo" | "file" | "voice" | "signature" | "gps" | "barcode"
  | "rating" | "formula" | "conditional";

interface FieldOption { id: string; label: string; }

interface WorkflowField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  minValue?: number;
  maxValue?: number;
  formulaExpression?: string;
  conditionalFieldId?: string;
  conditionalValue?: string;
  allowCamera?: boolean;
  allowGallery?: boolean;
  maxFiles?: number;
  ratingMax?: number;
  checklistItems?: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string;
  color: string;
  fields: WorkflowField[];
  isCustom: boolean;
}

// ─── Field Type Definitions ───────────────────────────────────────────────────

const FIELD_TYPES: { type: FieldType; label: string; icon: string; color: string; description: string }[] = [
  { type: "short_text",    label: "Short Text",       icon: "textformat",                   color: "#3B82F6", description: "Single-line text input" },
  { type: "long_text",     label: "Long Text",        icon: "doc.text.fill",                color: "#6366F1", description: "Multi-line notes & descriptions" },
  { type: "number",        label: "Number",           icon: "number",                       color: "#8B5CF6", description: "Numeric values & measurements" },
  { type: "currency",      label: "Currency",         icon: "dollarsign.circle.fill",       color: "#22C55E", description: "Price, cost, or payment amount" },
  { type: "date",          label: "Date",             icon: "calendar",                     color: "#F59E0B", description: "Date picker (month/day/year)" },
  { type: "time",          label: "Time",             icon: "clock.fill",                   color: "#F97316", description: "Time picker (hour/minute)" },
  { type: "datetime",      label: "Date & Time",      icon: "calendar.badge.clock",         color: "#EF4444", description: "Combined date and time" },
  { type: "single_select", label: "Dropdown",         icon: "chevron.down",                 color: "#06B6D4", description: "Single choice from a list" },
  { type: "multi_select",  label: "Multi-Select",     icon: "checkmark.square.fill",        color: "#0EA5E9", description: "Multiple choices from a list" },
  { type: "toggle",        label: "Yes / No Toggle",  icon: "switch.2",                     color: "#10B981", description: "Boolean yes/no or on/off" },
  { type: "checklist",     label: "Checklist",        icon: "checklist",                    color: "#84CC16", description: "Ordered step-by-step checklist" },
  { type: "photo",         label: "Photo / Camera",   icon: "camera.fill",                  color: "#F43F5E", description: "Take or upload photos" },
  { type: "file",          label: "File Attachment",  icon: "paperclip",                    color: "#64748B", description: "Attach PDFs, docs, or files" },
  { type: "voice",         label: "Voice Note",       icon: "mic.fill",                     color: "#A855F7", description: "Record audio field notes" },
  { type: "signature",     label: "Signature",        icon: "pencil.and.scribble",          color: "#EC4899", description: "Customer or tech signature" },
  { type: "gps",           label: "GPS / Location",   icon: "location.fill",                color: "#14B8A6", description: "Capture GPS coordinates" },
  { type: "barcode",       label: "Barcode / QR",     icon: "barcode.viewfinder",           color: "#F59E0B", description: "Scan asset tags or parts" },
  { type: "rating",        label: "Rating / Score",   icon: "star.fill",                    color: "#FBBF24", description: "1–5 or 1–10 satisfaction score" },
  { type: "formula",       label: "Calculated Field", icon: "function",                     color: "#6EE7B7", description: "Auto-calculated from other fields" },
  { type: "conditional",   label: "Conditional Logic","icon": "arrow.triangle.branch",      color: "#C084FC", description: "Show/hide based on prior answers" },
];

// ─── Industry Templates ───────────────────────────────────────────────────────

const INDUSTRY_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "hvac_service",
    name: "HVAC Service Call",
    industry: "HVAC",
    description: "Heating, cooling, and ventilation service with safety checklist",
    icon: "thermometer.medium",
    color: "#EF4444",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Service Type", required: true, options: [{ id: "o1", label: "Repair" }, { id: "o2", label: "Maintenance" }, { id: "o3", label: "Installation" }, { id: "o4", label: "Inspection" }] },
      { id: "f2", type: "short_text", label: "Equipment Model / Serial #", required: true, placeholder: "e.g. Carrier 24ACC636A003" },
      { id: "f3", type: "number", label: "Refrigerant Level (PSI)", required: false, minValue: 0, maxValue: 500 },
      { id: "f4", type: "checklist", label: "Pre-Job Safety Checklist", required: true, checklistItems: ["Power disconnected", "PPE on", "Area clear", "Customer notified"] },
      { id: "f5", type: "photo", label: "Before Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 5 },
      { id: "f6", type: "multi_select", label: "Issues Found", required: false, options: [{ id: "o1", label: "Refrigerant leak" }, { id: "o2", label: "Dirty filter" }, { id: "o3", label: "Faulty capacitor" }, { id: "o4", label: "Blocked drain" }, { id: "o5", label: "Electrical fault" }] },
      { id: "f7", type: "long_text", label: "Work Performed", required: true, placeholder: "Describe all work completed..." },
      { id: "f8", type: "photo", label: "After Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 5 },
      { id: "f9", type: "currency", label: "Parts Cost", required: false },
      { id: "f10", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: "it_repair",
    name: "IT Repair & Support",
    industry: "IT / Technology",
    description: "Computer, network, and device repair with asset tracking",
    icon: "desktopcomputer",
    color: "#3B82F6",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Device Type", required: true, options: [{ id: "o1", label: "Desktop" }, { id: "o2", label: "Laptop" }, { id: "o3", label: "Server" }, { id: "o4", label: "Network" }, { id: "o5", label: "Printer" }] },
      { id: "f2", type: "barcode", label: "Asset Tag Scan", required: false },
      { id: "f3", type: "short_text", label: "Device Make / Model", required: true },
      { id: "f4", type: "short_text", label: "Serial Number", required: true },
      { id: "f5", type: "long_text", label: "Problem Description", required: true },
      { id: "f6", type: "multi_select", label: "Diagnostics Performed", required: false, options: [{ id: "o1", label: "Hardware test" }, { id: "o2", label: "OS reinstall" }, { id: "o3", label: "Virus scan" }, { id: "o4", label: "Network test" }, { id: "o5", label: "Data backup" }] },
      { id: "f7", type: "long_text", label: "Resolution Notes", required: true },
      { id: "f8", type: "toggle", label: "Data Backed Up Before Work?", required: true },
      { id: "f9", type: "rating", label: "Customer Satisfaction", required: false, ratingMax: 5 },
      { id: "f10", type: "signature", label: "Customer Acceptance", required: true },
    ],
  },
  {
    id: "flooring_install",
    name: "Flooring Installation",
    industry: "Construction / Flooring",
    description: "Flooring measurement, install, and quality inspection",
    icon: "square.grid.2x2.fill",
    color: "#F59E0B",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Flooring Type", required: true, options: [{ id: "o1", label: "Hardwood" }, { id: "o2", label: "Laminate" }, { id: "o3", label: "Vinyl Plank" }, { id: "o4", label: "Tile" }, { id: "o5", label: "Carpet" }] },
      { id: "f2", type: "number", label: "Area (sq ft)", required: true, minValue: 1 },
      { id: "f3", type: "number", label: "Rooms", required: true, minValue: 1 },
      { id: "f4", type: "photo", label: "Pre-Install Subfloor Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 8 },
      { id: "f5", type: "checklist", label: "Pre-Install Checklist", required: true, checklistItems: ["Subfloor level checked", "Moisture test done", "Old flooring removed", "Underlayment installed"] },
      { id: "f6", type: "long_text", label: "Install Notes", required: false },
      { id: "f7", type: "photo", label: "Completed Install Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 8 },
      { id: "f8", type: "formula", label: "Total Material Cost", required: false, formulaExpression: "area_sqft × material_rate" },
      { id: "f9", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: "home_care",
    name: "Home / Elder Care Visit",
    industry: "Home Care",
    description: "Care visit with health check, tasks, and family notification",
    icon: "heart.fill",
    color: "#EC4899",
    isCustom: false,
    fields: [
      { id: "f1", type: "short_text", label: "Client Name", required: true },
      { id: "f2", type: "datetime", label: "Visit Start Time", required: true },
      { id: "f3", type: "checklist", label: "Care Tasks Completed", required: true, checklistItems: ["Medication administered", "Meal prepared", "Personal hygiene", "Mobility assistance", "Vitals checked"] },
      { id: "f4", type: "number", label: "Blood Pressure (Systolic)", required: false },
      { id: "f5", type: "number", label: "Blood Pressure (Diastolic)", required: false },
      { id: "f6", type: "toggle", label: "Client Alert / Concern?", required: true },
      { id: "f7", type: "long_text", label: "Visit Notes", required: true },
      { id: "f8", type: "voice", label: "Audio Note for Family", required: false },
      { id: "f9", type: "datetime", label: "Visit End Time", required: true },
      { id: "f10", type: "signature", label: "Caregiver Sign-Off", required: true },
    ],
  },
  {
    id: "delivery",
    name: "Delivery / Courier",
    industry: "Logistics",
    description: "Package pickup, delivery confirmation, and proof of delivery",
    icon: "shippingbox.fill",
    color: "#6366F1",
    isCustom: false,
    fields: [
      { id: "f1", type: "barcode", label: "Scan Package Barcode", required: true },
      { id: "f2", type: "short_text", label: "Recipient Name", required: true },
      { id: "f3", type: "gps", label: "Delivery Location", required: true },
      { id: "f4", type: "photo", label: "Package Condition Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 2 },
      { id: "f5", type: "single_select", label: "Delivery Status", required: true, options: [{ id: "o1", label: "Delivered to recipient" }, { id: "o2", label: "Left at door" }, { id: "o3", label: "Neighbour accepted" }, { id: "o4", label: "Attempted - no answer" }] },
      { id: "f6", type: "photo", label: "Proof of Delivery Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 1 },
      { id: "f7", type: "signature", label: "Recipient Signature", required: false },
    ],
  },
];

// ─── Field Type Card ──────────────────────────────────────────────────────────

function FieldTypeCard({ ft, onSelect }: { ft: typeof FIELD_TYPES[0]; onSelect: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fieldTypeCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onSelect}
    >
      <View style={[styles.fieldTypeIcon, { backgroundColor: ft.color + "20" }]}>
        <IconSymbol name={ft.icon as any} size={18} color={ft.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldTypeLabel, { color: colors.foreground }]}>{ft.label}</Text>
        <Text style={[styles.fieldTypeDesc, { color: colors.muted }]} numberOfLines={1}>{ft.description}</Text>
      </View>
      <IconSymbol name="plus.circle.fill" size={20} color={ft.color} />
    </Pressable>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({
  field, index, total, onEdit, onDelete, onMoveUp, onMoveDown,
}: {
  field: WorkflowField; index: number; total: number;
  onEdit: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const colors = useColors();
  const ft = FIELD_TYPES.find((f) => f.type === field.type);
  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.fieldRowIcon, { backgroundColor: (ft?.color ?? "#888") + "20" }]}>
        <IconSymbol name={(ft?.icon ?? "doc") as any} size={14} color={ft?.color ?? "#888"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldRowLabel, { color: colors.foreground }]} numberOfLines={1}>
          {field.label}
          {field.required && <Text style={{ color: "#EF4444" }}> *</Text>}
        </Text>
        <Text style={[styles.fieldRowType, { color: colors.muted }]}>{ft?.label ?? field.type}</Text>
      </View>
      <View style={styles.fieldRowActions}>
        {index > 0 && (
          <Pressable onPress={onMoveUp} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
            <IconSymbol name="chevron.up" size={14} color={colors.muted} />
          </Pressable>
        )}
        {index < total - 1 && (
          <Pressable onPress={onMoveDown} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
            <IconSymbol name="chevron.down" size={14} color={colors.muted} />
          </Pressable>
        )}
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
          <IconSymbol name="pencil" size={14} color={colors.primary} />
        </Pressable>
        <Pressable onPress={onDelete} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
          <IconSymbol name="trash.fill" size={14} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Edit Field Modal ─────────────────────────────────────────────────────────

function EditFieldModal({
  field, visible, onClose, onSave,
}: {
  field: WorkflowField | null; visible: boolean;
  onClose: () => void; onSave: (f: WorkflowField) => void;
}) {
  const colors = useColors();
  const [local, setLocal] = useState<WorkflowField | null>(null);

  React.useEffect(() => {
    if (field) setLocal({ ...field });
  }, [field]);

  if (!visible || !local) return null;

  const ft = FIELD_TYPES.find((f) => f.type === local.type);

  const updateLocal = (patch: Partial<WorkflowField>) => setLocal((prev) => prev ? { ...prev, ...patch } : prev);

  const addOption = () => {
    const opts = [...(local.options ?? []), { id: `o${Date.now()}`, label: "" }];
    updateLocal({ options: opts });
  };

  const updateOption = (idx: number, label: string) => {
    const opts = [...(local.options ?? [])];
    opts[idx] = { ...opts[idx], label };
    updateLocal({ options: opts });
  };

  const removeOption = (idx: number) => {
    const opts = [...(local.options ?? [])];
    opts.splice(idx, 1);
    updateLocal({ options: opts });
  };

  const addChecklistItem = () => {
    const items = [...(local.checklistItems ?? []), ""];
    updateLocal({ checklistItems: items });
  };

  const updateChecklistItem = (idx: number, val: string) => {
    const items = [...(local.checklistItems ?? [])];
    items[idx] = val;
    updateLocal({ checklistItems: items });
  };

  const removeChecklistItem = (idx: number) => {
    const items = [...(local.checklistItems ?? [])];
    items.splice(idx, 1);
    updateLocal({ checklistItems: items });
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.fieldTypeIcon, { backgroundColor: (ft?.color ?? "#888") + "20" }]}>
              <IconSymbol name={(ft?.icon ?? "doc") as any} size={18} color={ft?.color ?? "#888"} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{ft?.label ?? local.type}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}>
              <IconSymbol name="xmark.circle.fill" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Label */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>FIELD LABEL *</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={local.label}
            onChangeText={(v) => updateLocal({ label: v })}
            placeholder="Enter field label..."
            placeholderTextColor={colors.muted}
          />

          {/* Placeholder */}
          {["short_text", "long_text", "number", "currency", "formula"].includes(local.type) && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>PLACEHOLDER TEXT</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={local.placeholder ?? ""}
                onChangeText={(v) => updateLocal({ placeholder: v })}
                placeholder="e.g. Enter value..."
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {/* Help Text */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>HELP TEXT (shown below field)</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={local.helpText ?? ""}
            onChangeText={(v) => updateLocal({ helpText: v })}
            placeholder="Optional instructions for the technician..."
            placeholderTextColor={colors.muted}
          />

          {/* Required Toggle */}
          <View style={[styles.toggleRow, { borderColor: colors.border }]}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Required Field</Text>
              <Text style={[styles.toggleSub, { color: colors.muted }]}>Technician cannot submit without completing</Text>
            </View>
            <Switch
              value={local.required}
              onValueChange={(v) => updateLocal({ required: v })}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {/* Number / Currency: min/max */}
          {["number", "currency"].includes(local.type) && (
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>MIN VALUE</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={local.minValue?.toString() ?? ""}
                  onChangeText={(v) => updateLocal({ minValue: v ? Number(v) : undefined })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>MAX VALUE</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={local.maxValue?.toString() ?? ""}
                  onChangeText={(v) => updateLocal({ maxValue: v ? Number(v) : undefined })}
                  keyboardType="numeric"
                  placeholder="No limit"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
          )}

          {/* Rating: max stars */}
          {local.type === "rating" && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>RATING SCALE</Text>
              <View style={styles.ratingOptions}>
                {[3, 5, 10].map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.ratingOption,
                      { borderColor: local.ratingMax === n ? colors.primary : colors.border,
                        backgroundColor: local.ratingMax === n ? colors.primary + "20" : "transparent" },
                    ]}
                    onPress={() => updateLocal({ ratingMax: n })}
                  >
                    <Text style={[styles.ratingOptionText, { color: local.ratingMax === n ? colors.primary : colors.muted }]}>
                      1 – {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Photo: camera / gallery */}
          {local.type === "photo" && (
            <>
              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Allow Camera</Text>
                <Switch value={local.allowCamera ?? true} onValueChange={(v) => updateLocal({ allowCamera: v })} trackColor={{ true: colors.primary }} />
              </View>
              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Allow Gallery Upload</Text>
                <Switch value={local.allowGallery ?? true} onValueChange={(v) => updateLocal({ allowGallery: v })} trackColor={{ true: colors.primary }} />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>MAX PHOTOS</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={local.maxFiles?.toString() ?? ""}
                onChangeText={(v) => updateLocal({ maxFiles: v ? Number(v) : undefined })}
                keyboardType="numeric"
                placeholder="No limit"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {/* Formula expression */}
          {local.type === "formula" && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>FORMULA EXPRESSION</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={local.formulaExpression ?? ""}
                onChangeText={(v) => updateLocal({ formulaExpression: v })}
                placeholder="e.g. hours × hourly_rate + parts_cost"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {/* Dropdown / Multi-select options */}
          {["single_select", "multi_select"].includes(local.type) && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>OPTIONS</Text>
              {(local.options ?? []).map((opt, idx) => (
                <View key={opt.id} style={styles.optionRow}>
                  <TextInput
                    style={[styles.optionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={opt.label}
                    onChangeText={(v) => updateOption(idx, v)}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable onPress={() => removeOption(idx)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}>
                    <IconSymbol name="minus.circle.fill" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={[styles.addOptionBtn, { borderColor: colors.primary }]}
                onPress={addOption}
              >
                <IconSymbol name="plus.circle.fill" size={16} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Option</Text>
              </Pressable>
            </>
          )}

          {/* Checklist items */}
          {local.type === "checklist" && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>CHECKLIST ITEMS</Text>
              {(local.checklistItems ?? []).map((item, idx) => (
                <View key={idx} style={styles.optionRow}>
                  <TextInput
                    style={[styles.optionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={item}
                    onChangeText={(v) => updateChecklistItem(idx, v)}
                    placeholder={`Step ${idx + 1}`}
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable onPress={() => removeChecklistItem(idx)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}>
                    <IconSymbol name="minus.circle.fill" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={[styles.addOptionBtn, { borderColor: colors.primary }]}
                onPress={addChecklistItem}
              >
                <IconSymbol name="plus.circle.fill" size={16} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Step</Text>
              </Pressable>
            </>
          )}

          {/* Save */}
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { if (local.label.trim()) onSave(local); else Alert.alert("Field label is required."); }}
          >
            <Text style={styles.saveBtnText}>Save Field</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkflowTemplatesScreen() {
  const colors = useColors();
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkflowTemplate[]>(INDUSTRY_TEMPLATES);
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [editingField, setEditingField] = useState<WorkflowField | null>(null);
  const [view, setView] = useState<"list" | "builder">("list");
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.industry.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const createBlankTemplate = () => {
    const t: WorkflowTemplate = {
      id: `custom_${Date.now()}`,
      name: "New Template",
      industry: "Custom",
      description: "Custom workflow template",
      icon: "doc.text.fill",
      color: colors.primary,
      fields: [],
      isCustom: true,
    };
    setTemplates((prev) => [t, ...prev]);
    setActiveTemplate(t);
    setView("builder");
  };

  const openTemplate = (t: WorkflowTemplate) => {
    setActiveTemplate({ ...t, fields: [...t.fields] });
    setView("builder");
  };

  const addField = (type: FieldType) => {
    if (!activeTemplate) return;
    const ft = FIELD_TYPES.find((f) => f.type === type)!;
    const newField: WorkflowField = {
      id: `field_${Date.now()}`,
      type,
      label: ft.label,
      required: false,
      options: ["single_select", "multi_select"].includes(type)
        ? [{ id: `o1`, label: "Option 1" }, { id: `o2`, label: "Option 2" }]
        : undefined,
      checklistItems: type === "checklist" ? ["Step 1", "Step 2"] : undefined,
      ratingMax: type === "rating" ? 5 : undefined,
      allowCamera: type === "photo" ? true : undefined,
      allowGallery: type === "photo" ? true : undefined,
    };
    setActiveTemplate((prev) => prev ? { ...prev, fields: [...prev.fields, newField] } : prev);
    setShowFieldPicker(false);
    setEditingField(newField);
  };

  const saveField = (updated: WorkflowField) => {
    if (!activeTemplate) return;
    setActiveTemplate((prev) => {
      if (!prev) return prev;
      const idx = prev.fields.findIndex((f) => f.id === updated.id);
      if (idx === -1) return { ...prev, fields: [...prev.fields, updated] };
      const fields = [...prev.fields];
      fields[idx] = updated;
      return { ...prev, fields };
    });
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    Alert.alert("Delete Field", "Remove this field from the template?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setActiveTemplate((prev) =>
            prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) } : prev,
          ),
      },
    ]);
  };

  const moveField = (idx: number, dir: "up" | "down") => {
    if (!activeTemplate) return;
    const fields = [...activeTemplate.fields];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;
    [fields[idx], fields[swapIdx]] = [fields[swapIdx], fields[idx]];
    setActiveTemplate((prev) => prev ? { ...prev, fields } : prev);
  };

  const saveTemplate = () => {
    if (!activeTemplate) return;
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTemplate.id);
      if (idx === -1) return [activeTemplate, ...prev];
      const updated = [...prev];
      updated[idx] = activeTemplate;
      return updated;
    });
    Alert.alert("Saved", `"${activeTemplate.name}" has been saved.`);
    setView("list");
  };

  // ── Builder View ────────────────────────────────────────────────────────────
  if (view === "builder" && activeTemplate) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <NVCHeader
          title={activeTemplate.name}
          subtitle={`${activeTemplate.fields.length} fields · ${activeTemplate.industry}`}
          onBack={() => setView("list")}
          rightElement={
            <Pressable
              onPress={saveTemplate}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Save</Text>
            </Pressable>
          }
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
          {/* Template Meta */}
          <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>TEMPLATE NAME</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={activeTemplate.name}
              onChangeText={(v) => setActiveTemplate((prev) => prev ? { ...prev, name: v } : prev)}
              placeholder="Template name..."
              placeholderTextColor={colors.muted}
            />
            <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 8 }]}>INDUSTRY / CATEGORY</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={activeTemplate.industry}
              onChangeText={(v) => setActiveTemplate((prev) => prev ? { ...prev, industry: v } : prev)}
              placeholder="e.g. HVAC, IT Repair, Delivery..."
              placeholderTextColor={colors.muted}
            />
            <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 8 }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, minHeight: 60 }]}
              value={activeTemplate.description}
              onChangeText={(v) => setActiveTemplate((prev) => prev ? { ...prev, description: v } : prev)}
              placeholder="Describe this workflow..."
              placeholderTextColor={colors.muted}
              multiline
            />
          </View>

          {/* Fields */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>FIELDS ({activeTemplate.fields.length})</Text>
          </View>

          {activeTemplate.fields.length === 0 && (
            <View style={[styles.emptyFields, { borderColor: colors.border }]}>
              <IconSymbol name="doc.badge.plus" size={32} color={colors.muted} />
              <Text style={[styles.emptyFieldsText, { color: colors.muted }]}>No fields yet. Add your first field below.</Text>
            </View>
          )}

          {activeTemplate.fields.map((field, idx) => (
            <FieldRow
              key={field.id}
              field={field}
              index={idx}
              total={activeTemplate.fields.length}
              onEdit={() => setEditingField(field)}
              onDelete={() => deleteField(field.id)}
              onMoveUp={() => moveField(idx, "up")}
              onMoveDown={() => moveField(idx, "down")}
            />
          ))}

          {/* Add Field Button */}
          <Pressable
            style={({ pressed }) => [
              styles.addFieldBtn,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => setShowFieldPicker(true)}
          >
            <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
            <Text style={[styles.addFieldBtnText, { color: colors.primary }]}>Add Field</Text>
          </Pressable>

          {/* Field Type Picker */}
          {showFieldPicker && (
            <View style={[styles.fieldPickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.fieldPickerHeader}>
                <Text style={[styles.fieldPickerTitle, { color: colors.foreground }]}>Choose Field Type</Text>
                <Pressable onPress={() => setShowFieldPicker(false)}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                </Pressable>
              </View>
              {FIELD_TYPES.map((ft) => (
                <FieldTypeCard key={ft.type} ft={ft} onSelect={() => addField(ft.type)} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Edit Field Modal */}
        <EditFieldModal
          field={editingField}
          visible={!!editingField}
          onClose={() => setEditingField(null)}
          onSave={saveField}
        />
      </ScreenContainer>
    );
  }

  // ── Template List View ──────────────────────────────────────────────────────
  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader
        title="Workflow Templates"
        subtitle={`${templates.length} templates`}
        rightElement={
          <Pressable
            onPress={createBlankTemplate}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
          >
            <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search templates..."
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Field Types Reference */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoCardHeader}>
            <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
            <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>20 Field Types Available</Text>
          </View>
          <View style={styles.fieldTypePills}>
            {FIELD_TYPES.map((ft) => (
              <View key={ft.type} style={[styles.pill, { backgroundColor: ft.color + "18", borderColor: ft.color + "40" }]}>
                <Text style={[styles.pillText, { color: ft.color }]}>{ft.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Templates */}
        <Text style={[styles.sectionTitle, { color: colors.muted, marginBottom: 8 }]}>
          {searchQuery ? `RESULTS (${filteredTemplates.length})` : "ALL TEMPLATES"}
        </Text>

        {filteredTemplates.map((t) => (
          <Pressable
            key={t.id}
            style={({ pressed }) => [
              styles.templateCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => openTemplate(t)}
          >
            <View style={[styles.templateIcon, { backgroundColor: t.color + "20" }]}>
              <IconSymbol name={t.icon as any} size={22} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.templateNameRow}>
                <Text style={[styles.templateName, { color: colors.foreground }]}>{t.name}</Text>
                {t.isCustom && (
                  <View style={[styles.customBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.customBadgeText, { color: colors.primary }]}>Custom</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.templateIndustry, { color: colors.primary }]}>{t.industry}</Text>
              <Text style={[styles.templateDesc, { color: colors.muted }]} numberOfLines={1}>{t.description}</Text>
              <Text style={[styles.templateFieldCount, { color: colors.muted }]}>{t.fields.length} fields</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  infoCardTitle: { fontSize: 13, fontWeight: "700" },
  fieldTypePills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: "600" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  templateCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  templateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  templateNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  templateName: { fontSize: 15, fontWeight: "700" },
  customBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  customBadgeText: { fontSize: 10, fontWeight: "700" },
  templateIndustry: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  templateDesc: { fontSize: 12, marginBottom: 2 },
  templateFieldCount: { fontSize: 11 },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  fieldRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  fieldRowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fieldRowLabel: { fontSize: 13, fontWeight: "600" },
  fieldRowType: { fontSize: 11, marginTop: 1 },
  fieldRowActions: { flexDirection: "row", gap: 2 },
  iconBtn: { padding: 6 },
  addFieldBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", paddingVertical: 14, gap: 8, marginTop: 4 },
  addFieldBtnText: { fontSize: 14, fontWeight: "700" },
  emptyFields: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 10, marginBottom: 12 },
  emptyFieldsText: { fontSize: 13, textAlign: "center" },
  fieldPickerCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12 },
  fieldPickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  fieldPickerTitle: { fontSize: 15, fontWeight: "700" },
  fieldTypeCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6, gap: 10 },
  fieldTypeIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  fieldTypeLabel: { fontSize: 13, fontWeight: "600" },
  fieldTypeDesc: { fontSize: 11, marginTop: 1 },
  // Modal
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end", zIndex: 100 },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "90%", gap: 4 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: "800" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, marginBottom: 5, marginTop: 10 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 11, marginTop: 1 },
  row2: { flexDirection: "row", gap: 10 },
  ratingOptions: { flexDirection: "row", gap: 10, marginBottom: 4 },
  ratingOption: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  ratingOptionText: { fontSize: 13, fontWeight: "700" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  optionInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  addOptionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 10, gap: 6, marginBottom: 4 },
  addOptionText: { fontSize: 13, fontWeight: "700" },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16, marginBottom: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
