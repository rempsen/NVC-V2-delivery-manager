import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, Switch,
  FlatList, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";

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
  conditionalOperator?: "equals" | "not_equals" | "contains" | "is_true" | "is_false";
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

const FIELD_TYPES: { type: FieldType; label: string; icon: string; color: string; description: string; category: string }[] = [
  { type: "short_text",    label: "Short Text",       icon: "textformat",                   color: "#3B82F6", description: "Single-line text input",              category: "Text" },
  { type: "long_text",     label: "Long Text",        icon: "doc.text.fill",                color: "#6366F1", description: "Multi-line notes & descriptions",      category: "Text" },
  { type: "number",        label: "Number",           icon: "number",                       color: "#8B5CF6", description: "Numeric values & measurements",        category: "Numbers" },
  { type: "currency",      label: "Currency",         icon: "dollarsign.circle.fill",       color: "#22C55E", description: "Price, cost, or payment amount",       category: "Numbers" },
  { type: "date",          label: "Date",             icon: "calendar",                     color: "#F59E0B", description: "Date picker (month/day/year)",          category: "Date & Time" },
  { type: "time",          label: "Time",             icon: "clock.fill",                   color: "#F97316", description: "Time picker (hour/minute)",             category: "Date & Time" },
  { type: "datetime",      label: "Date & Time",      icon: "calendar.badge.clock",         color: "#EF4444", description: "Combined date and time",               category: "Date & Time" },
  { type: "single_select", label: "Dropdown",         icon: "chevron.down",                 color: "#06B6D4", description: "Single choice from a list",            category: "Selection" },
  { type: "multi_select",  label: "Multi-Select",     icon: "checkmark.square.fill",        color: "#0EA5E9", description: "Multiple choices from a list",         category: "Selection" },
  { type: "toggle",        label: "Yes / No Toggle",  icon: "switch.2",                     color: "#10B981", description: "Boolean yes/no or on/off",             category: "Selection" },
  { type: "checklist",     label: "Checklist",        icon: "checklist",                    color: "#84CC16", description: "Ordered step-by-step checklist",       category: "Selection" },
  { type: "photo",         label: "Photo / Camera",   icon: "camera.fill",                  color: "#F43F5E", description: "Take or upload photos",                category: "Media" },
  { type: "file",          label: "File Attachment",  icon: "paperclip",                    color: "#64748B", description: "Attach PDFs, docs, or files",          category: "Media" },
  { type: "voice",         label: "Voice Note",       icon: "mic.fill",                     color: "#A855F7", description: "Record audio field notes",             category: "Media" },
  { type: "signature",     label: "Signature",        icon: "pencil.and.scribble",          color: "#EC4899", description: "Customer or tech signature",           category: "Media" },
  { type: "gps",           label: "GPS / Location",   icon: "location.fill",                color: "#14B8A6", description: "Capture GPS coordinates",              category: "Advanced" },
  { type: "barcode",       label: "Barcode / QR",     icon: "barcode.viewfinder",           color: "#F59E0B", description: "Scan asset tags or parts",             category: "Advanced" },
  { type: "rating",        label: "Rating / Score",   icon: "star.fill",                    color: "#FBBF24", description: "1–5 or 1–10 satisfaction score",       category: "Advanced" },
  { type: "formula",       label: "Calculated Field", icon: "function",                     color: "#6EE7B7", description: "Auto-calculated from other fields",    category: "Advanced" },
  { type: "conditional",   label: "Conditional Logic", icon: "arrow.triangle.branch",       color: "#C084FC", description: "Show/hide based on prior answers",     category: "Advanced" },
];

const FIELD_CATEGORIES = ["All", "Text", "Numbers", "Date & Time", "Selection", "Media", "Advanced"];

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
    industry: "Construction",
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
  {
    id: "telecom_survey",
    name: "Telecom Site Survey",
    industry: "Telecommunications",
    description: "Cell tower, fiber, or cable installation site assessment",
    icon: "antenna.radiowaves.left.and.right",
    color: "#0EA5E9",
    isCustom: false,
    fields: [
      { id: "f1", type: "short_text", label: "Site ID / Tower Name", required: true },
      { id: "f2", type: "gps", label: "Site GPS Coordinates", required: true },
      { id: "f3", type: "single_select", label: "Site Type", required: true, options: [{ id: "o1", label: "Rooftop" }, { id: "o2", label: "Ground Tower" }, { id: "o3", label: "Pole Mount" }, { id: "o4", label: "Building Interior" }] },
      { id: "f4", type: "number", label: "Tower Height (ft)", required: false },
      { id: "f5", type: "checklist", label: "Site Conditions Checklist", required: true, checklistItems: ["Power available", "Grounding verified", "Structural integrity OK", "Access road clear", "Permits on file"] },
      { id: "f6", type: "photo", label: "Site Photos (all angles)", required: true, allowCamera: true, allowGallery: true, maxFiles: 10 },
      { id: "f7", type: "multi_select", label: "Equipment Installed", required: false, options: [{ id: "o1", label: "Antenna" }, { id: "o2", label: "RRU" }, { id: "o3", label: "Fiber cable" }, { id: "o4", label: "Power unit" }, { id: "o5", label: "Cabinet" }] },
      { id: "f8", type: "toggle", label: "Site Approved for Installation?", required: true },
      { id: "f9", type: "long_text", label: "Survey Notes", required: true },
      { id: "f10", type: "signature", label: "Site Owner / Manager Sign-Off", required: false },
    ],
  },
  {
    id: "home_fitness",
    name: "Home Fitness Equipment Install",
    industry: "Home Fitness",
    description: "Treadmill, bike, or gym equipment delivery and installation",
    icon: "figure.run",
    color: "#10B981",
    isCustom: false,
    fields: [
      { id: "f1", type: "short_text", label: "Equipment Model", required: true, placeholder: "e.g. Peloton Bike+, NordicTrack T 6.5S" },
      { id: "f2", type: "barcode", label: "Scan Serial Number", required: true },
      { id: "f3", type: "single_select", label: "Installation Location", required: true, options: [{ id: "o1", label: "Living Room" }, { id: "o2", label: "Basement" }, { id: "o3", label: "Garage" }, { id: "o4", label: "Bedroom" }, { id: "o5", label: "Dedicated Gym Room" }] },
      { id: "f4", type: "photo", label: "Pre-Install Space Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 3 },
      { id: "f5", type: "checklist", label: "Assembly Checklist", required: true, checklistItems: ["All parts accounted for", "Frame assembled", "Electronics connected", "Calibration complete", "Test run completed", "Customer demo done"] },
      { id: "f6", type: "toggle", label: "Floor Protection Used?", required: true },
      { id: "f7", type: "photo", label: "Completed Installation Photos", required: true, allowCamera: true, allowGallery: false, maxFiles: 4 },
      { id: "f8", type: "rating", label: "Customer Satisfaction", required: false, ratingMax: 5 },
      { id: "f9", type: "signature", label: "Customer Acceptance Signature", required: true },
    ],
  },
  {
    id: "limo_booking",
    name: "Limousine / Chauffeur Trip",
    industry: "Limousine",
    description: "Pre-trip inspection, passenger log, and post-trip summary",
    icon: "car.fill",
    color: "#1E293B",
    isCustom: false,
    fields: [
      { id: "f1", type: "short_text", label: "Booking Reference #", required: true },
      { id: "f2", type: "short_text", label: "Passenger Name", required: true },
      { id: "f3", type: "number", label: "Passenger Count", required: true, minValue: 1, maxValue: 20 },
      { id: "f4", type: "datetime", label: "Pickup Date & Time", required: true },
      { id: "f5", type: "short_text", label: "Pickup Address", required: true },
      { id: "f6", type: "short_text", label: "Drop-off Address", required: true },
      { id: "f7", type: "checklist", label: "Pre-Trip Vehicle Inspection", required: true, checklistItems: ["Exterior clean", "Interior clean", "Fuel full", "Water/amenities stocked", "Climate set", "Music/entertainment ready"] },
      { id: "f8", type: "photo", label: "Vehicle Condition Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 3 },
      { id: "f9", type: "number", label: "Trip Distance (km)", required: false },
      { id: "f10", type: "currency", label: "Final Fare", required: true },
      { id: "f11", type: "rating", label: "Passenger Rating", required: false, ratingMax: 5 },
      { id: "f12", type: "signature", label: "Passenger Confirmation", required: false },
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
      <View style={{ alignItems: "center", width: 20 }}>
        <Text style={[styles.fieldRowIndex, { color: colors.muted }]}>{index + 1}</Text>
      </View>
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

// ─── Preview Field Component ──────────────────────────────────────────────────

function PreviewField({ field }: { field: WorkflowField }) {
  const colors = useColors();
  const ft = FIELD_TYPES.find((f) => f.type === field.type);
  const [toggleVal, setToggleVal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>((field.checklistItems ?? []).map(() => false));
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [ratingVal, setRatingVal] = useState(0);

  const renderInput = () => {
    switch (field.type) {
      case "short_text":
        return (
          <View style={[styles.previewInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>
              {field.placeholder ?? "Enter text..."}
            </Text>
          </View>
        );
      case "long_text":
        return (
          <View style={[styles.previewInput, { borderColor: colors.border, backgroundColor: colors.surface, minHeight: 80 }]}>
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>
              {field.placeholder ?? "Enter notes..."}
            </Text>
          </View>
        );
      case "number":
        return (
          <View style={[styles.previewInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>
              {field.minValue !== undefined && field.maxValue !== undefined
                ? `${field.minValue} – ${field.maxValue}`
                : "Enter number..."}
            </Text>
          </View>
        );
      case "currency":
        return (
          <View style={[styles.previewInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.previewCurrencySymbol, { color: colors.muted }]}>$</Text>
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>0.00</Text>
          </View>
        );
      case "date":
        return (
          <View style={[styles.previewInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <IconSymbol name="calendar" size={16} color={colors.muted} />
            <Text style={[styles.previewPlaceholder, { color: colors.muted, flex: 1, marginLeft: 8 }]}>Select date...</Text>
          </View>
        );
      case "time":
        return (
          <View style={[styles.previewInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <IconSymbol name="clock.fill" size={16} color={colors.muted} />
            <Text style={[styles.previewPlaceholder, { color: colors.muted, flex: 1, marginLeft: 8 }]}>Select time...</Text>
          </View>
        );
      case "datetime":
        return (
          <View style={[styles.previewInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <IconSymbol name="calendar.badge.clock" size={16} color={colors.muted} />
            <Text style={[styles.previewPlaceholder, { color: colors.muted, flex: 1, marginLeft: 8 }]}>Select date & time...</Text>
          </View>
        );
      case "single_select":
        return (
          <View style={{ gap: 6 }}>
            {(field.options ?? []).map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.previewOption,
                  {
                    borderColor: selectedOption === opt.id ? colors.primary : colors.border,
                    backgroundColor: selectedOption === opt.id ? colors.primary + "15" : colors.surface,
                  },
                ]}
                onPress={() => setSelectedOption(opt.id)}
              >
                <View style={[
                  styles.previewRadio,
                  { borderColor: selectedOption === opt.id ? colors.primary : colors.border },
                ]}>
                  {selectedOption === opt.id && (
                    <View style={[styles.previewRadioFill, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <Text style={[styles.previewOptionText, { color: colors.foreground }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        );
      case "multi_select":
        return (
          <View style={{ gap: 6 }}>
            {(field.options ?? []).map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.previewOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary + "15" : colors.surface,
                    },
                  ]}
                  onPress={() => setSelectedOptions((prev) =>
                    isSelected ? prev.filter((id) => id !== opt.id) : [...prev, opt.id],
                  )}
                >
                  <View style={[
                    styles.previewCheckbox,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}>
                    {isSelected && <IconSymbol name="checkmark" size={10} color="#fff" />}
                  </View>
                  <Text style={[styles.previewOptionText, { color: colors.foreground }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      case "toggle":
        return (
          <View style={[styles.previewToggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.previewToggleLabel, { color: toggleVal ? colors.primary : colors.muted }]}>
              {toggleVal ? "Yes" : "No"}
            </Text>
            <Switch
              value={toggleVal}
              onValueChange={setToggleVal}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        );
      case "checklist":
        return (
          <View style={{ gap: 6 }}>
            {(field.checklistItems ?? []).map((item, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.previewChecklistItem,
                  {
                    borderColor: checkedItems[idx] ? colors.primary : colors.border,
                    backgroundColor: checkedItems[idx] ? colors.primary + "10" : colors.surface,
                  },
                ]}
                onPress={() => setCheckedItems((prev) => {
                  const next = [...prev];
                  next[idx] = !next[idx];
                  return next;
                })}
              >
                <View style={[
                  styles.previewCheckbox,
                  {
                    borderColor: checkedItems[idx] ? colors.primary : colors.border,
                    backgroundColor: checkedItems[idx] ? colors.primary : "transparent",
                  },
                ]}>
                  {checkedItems[idx] && <IconSymbol name="checkmark" size={10} color="#fff" />}
                </View>
                <Text style={[
                  styles.previewChecklistText,
                  {
                    color: checkedItems[idx] ? colors.muted : colors.foreground,
                    textDecorationLine: checkedItems[idx] ? "line-through" : "none",
                  },
                ]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      case "photo":
        return (
          <View style={styles.previewPhotoRow}>
            <View style={[styles.previewPhotoBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}>
              <IconSymbol name="camera.fill" size={20} color={colors.primary} />
              <Text style={[styles.previewPhotoBtnText, { color: colors.primary }]}>Camera</Text>
            </View>
            {field.allowGallery && (
              <View style={[styles.previewPhotoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <IconSymbol name="photo.fill" size={20} color={colors.muted} />
                <Text style={[styles.previewPhotoBtnText, { color: colors.muted }]}>Gallery</Text>
              </View>
            )}
          </View>
        );
      case "file":
        return (
          <View style={[styles.previewFileBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <IconSymbol name="paperclip" size={18} color={colors.muted} />
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>Tap to attach file...</Text>
          </View>
        );
      case "voice":
        return (
          <View style={styles.previewVoiceRow}>
            <View style={[styles.previewVoiceBtn, { backgroundColor: "#A855F7" }]}>
              <IconSymbol name="mic.fill" size={22} color="#fff" />
            </View>
            <Text style={[styles.previewVoiceLabel, { color: colors.muted }]}>Tap to record voice note</Text>
          </View>
        );
      case "signature":
        return (
          <View style={[styles.previewSignatureBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <IconSymbol name="pencil.and.scribble" size={24} color={colors.muted} />
            <Text style={[styles.previewPlaceholder, { color: colors.muted }]}>Tap to sign</Text>
          </View>
        );
      case "gps":
        return (
          <View style={[styles.previewGpsBtn, { borderColor: "#14B8A6", backgroundColor: "#14B8A6" + "15" }]}>
            <IconSymbol name="location.fill" size={18} color="#14B8A6" />
            <Text style={[styles.previewGpsBtnText, { color: "#14B8A6" }]}>Capture Current Location</Text>
          </View>
        );
      case "barcode":
        return (
          <View style={[styles.previewGpsBtn, { borderColor: "#F59E0B", backgroundColor: "#F59E0B" + "15" }]}>
            <IconSymbol name="barcode.viewfinder" size={18} color="#F59E0B" />
            <Text style={[styles.previewGpsBtnText, { color: "#F59E0B" }]}>Scan Barcode / QR Code</Text>
          </View>
        );
      case "rating":
        return (
          <View style={styles.previewRatingRow}>
            {Array.from({ length: field.ratingMax ?? 5 }).map((_, i) => (
              <Pressable key={i} onPress={() => setRatingVal(i + 1)}>
                <IconSymbol
                  name="star.fill"
                  size={28}
                  color={i < ratingVal ? "#FBBF24" : colors.border}
                />
              </Pressable>
            ))}
            {ratingVal > 0 && (
              <Text style={[styles.previewRatingLabel, { color: colors.muted }]}>
                {ratingVal}/{field.ratingMax ?? 5}
              </Text>
            )}
          </View>
        );
      case "formula":
        return (
          <View style={[styles.previewFormulaBox, { borderColor: "#6EE7B7", backgroundColor: "#6EE7B7" + "15" }]}>
            <IconSymbol name="function" size={16} color="#6EE7B7" />
            <Text style={[styles.previewFormulaText, { color: "#6EE7B7" }]}>
              {field.formulaExpression ?? "Auto-calculated"}
            </Text>
          </View>
        );
      case "conditional":
        return (
          <View style={[styles.previewFormulaBox, { borderColor: "#C084FC", backgroundColor: "#C084FC" + "15" }]}>
            <IconSymbol name="arrow.triangle.branch" size={16} color="#C084FC" />
            <Text style={[styles.previewFormulaText, { color: "#C084FC" }]}>
              {field.conditionalFieldId
                ? `Show if "${field.conditionalFieldId}" ${field.conditionalOperator ?? "equals"} "${field.conditionalValue ?? ""}"`
                : "Conditional logic — configure in editor"}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.previewFieldContainer}>
      <View style={styles.previewFieldHeader}>
        <View style={[styles.previewFieldDot, { backgroundColor: ft?.color ?? "#888" }]} />
        <Text style={[styles.previewFieldLabel, { color: "#1E293B" }]}>
          {field.label}
          {field.required && <Text style={{ color: "#EF4444" }}> *</Text>}
        </Text>
      </View>
      {field.helpText ? (
        <Text style={styles.previewHelpText}>{field.helpText}</Text>
      ) : null}
      {renderInput()}
    </View>
  );
}

// ─── Preview Mode Screen ──────────────────────────────────────────────────────

function PreviewScreen({
  template, onClose,
}: {
  template: WorkflowTemplate; onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <View style={[styles.previewHeaderIcon, { backgroundColor: template.color + "20" }]}>
            <IconSymbol name={template.icon as any} size={20} color={template.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewHeaderTitle}>{template.name}</Text>
            <Text style={styles.previewHeaderSub}>{template.fields.length} fields · {template.industry}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.previewCloseBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={onClose}
          >
            <IconSymbol name="xmark.circle.fill" size={26} color="#64748B" />
          </Pressable>
        </View>

        {/* Preview Banner */}
        <View style={styles.previewBanner}>
          <IconSymbol name="eye.fill" size={14} color="#F59E0B" />
          <Text style={styles.previewBannerText}>PREVIEW MODE — This is how technicians see this form</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        >
          {template.fields.map((field) => (
            <PreviewField key={field.id} field={field} />
          ))}

          {/* Submit Button Preview */}
          <View style={styles.previewSubmitBtn}>
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.previewSubmitText}>Submit Work Order</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Edit Field Modal ─────────────────────────────────────────────────────────

function EditFieldModal({
  field, visible, allFields, onClose, onSave,
}: {
  field: WorkflowField | null; visible: boolean;
  allFields: WorkflowField[];
  onClose: () => void; onSave: (f: WorkflowField) => void;
}) {
  const colors = useColors();
  const [local, setLocal] = useState<WorkflowField | null>(null);

  React.useEffect(() => {
    if (field) setLocal({ ...field });
  }, [field]);

  if (!visible || !local) return null;

  const ft = FIELD_TYPES.find((f) => f.type === local.type);
  const otherFields = allFields.filter((f) => f.id !== local.id && ["single_select", "toggle", "multi_select"].includes(f.type));

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
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

          {/* Conditional Logic */}
          {local.type === "conditional" && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>SHOW THIS FIELD WHEN...</Text>
              {otherFields.length === 0 ? (
                <View style={[styles.conditionalHint, { backgroundColor: "#C084FC" + "15", borderColor: "#C084FC" + "40" }]}>
                  <Text style={[styles.conditionalHintText, { color: "#C084FC" }]}>
                    Add a Dropdown, Multi-Select, or Toggle field first to use conditional logic.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>TRIGGER FIELD</Text>
                  <View style={{ gap: 6, marginBottom: 8 }}>
                    {otherFields.map((f) => (
                      <Pressable
                        key={f.id}
                        style={[
                          styles.conditionalFieldOption,
                          {
                            borderColor: local.conditionalFieldId === f.id ? "#C084FC" : colors.border,
                            backgroundColor: local.conditionalFieldId === f.id ? "#C084FC" + "15" : colors.surface,
                          },
                        ]}
                        onPress={() => updateLocal({ conditionalFieldId: f.id })}
                      >
                        <Text style={[styles.conditionalFieldText, { color: local.conditionalFieldId === f.id ? "#C084FC" : colors.foreground }]}>
                          {f.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>OPERATOR</Text>
                  <View style={styles.operatorRow}>
                    {(["equals", "not_equals", "is_true", "is_false"] as const).map((op) => (
                      <Pressable
                        key={op}
                        style={[
                          styles.operatorBtn,
                          {
                            borderColor: local.conditionalOperator === op ? "#C084FC" : colors.border,
                            backgroundColor: local.conditionalOperator === op ? "#C084FC" + "15" : "transparent",
                          },
                        ]}
                        onPress={() => updateLocal({ conditionalOperator: op })}
                      >
                        <Text style={[styles.operatorBtnText, { color: local.conditionalOperator === op ? "#C084FC" : colors.muted }]}>
                          {op === "equals" ? "=" : op === "not_equals" ? "≠" : op === "is_true" ? "YES" : "NO"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {["equals", "not_equals"].includes(local.conditionalOperator ?? "equals") && (
                    <>
                      <Text style={[styles.fieldLabel, { color: colors.muted }]}>VALUE TO MATCH</Text>
                      <TextInput
                        style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                        value={local.conditionalValue ?? ""}
                        onChangeText={(v) => updateLocal({ conditionalValue: v })}
                        placeholder="e.g. Yes, Repair, Option A..."
                        placeholderTextColor={colors.muted}
                      />
                    </>
                  )}
                </>
              )}
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
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: NVC_BLUE, opacity: pressed ? 0.85 : 1 }]}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [fieldCategory, setFieldCategory] = useState("All");

  // Unique industries for filter tabs
  const industries = ["All", ...Array.from(new Set(templates.map((t) => t.industry)))];

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === "All" || t.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const filteredFieldTypes = fieldCategory === "All"
    ? FIELD_TYPES
    : FIELD_TYPES.filter((ft) => ft.category === fieldCategory);

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

  const duplicateTemplate = (t: WorkflowTemplate) => {
    const copy: WorkflowTemplate = {
      ...t,
      id: `custom_${Date.now()}`,
      name: `${t.name} (Copy)`,
      isCustom: true,
      fields: t.fields.map((f) => ({ ...f, id: `field_${Date.now()}_${Math.random()}` })),
    };
    setTemplates((prev) => [copy, ...prev]);
    Alert.alert("Duplicated", `"${copy.name}" created as a custom template.`);
  };

  const deleteTemplate = (id: string) => {
    Alert.alert("Delete Template", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setTemplates((prev) => prev.filter((t) => t.id !== id)) },
    ]);
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
      conditionalOperator: type === "conditional" ? "equals" : undefined,
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
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setPreviewTemplate(activeTemplate)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
              >
                <IconSymbol name="eye.fill" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={saveTemplate}
                style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              </Pressable>
            </View>
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
            <Pressable
              onPress={() => setPreviewTemplate(activeTemplate)}
              style={({ pressed }) => [styles.previewLinkBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <IconSymbol name="eye.fill" size={13} color={colors.primary} />
              <Text style={[styles.previewLinkText, { color: colors.primary }]}>Preview</Text>
            </Pressable>
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

              {/* Category Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {FIELD_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: fieldCategory === cat ? colors.primary : colors.background,
                          borderColor: fieldCategory === cat ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setFieldCategory(cat)}
                    >
                      <Text style={[styles.categoryPillText, { color: fieldCategory === cat ? "#fff" : colors.muted }]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {filteredFieldTypes.map((ft) => (
                <FieldTypeCard key={ft.type} ft={ft} onSelect={() => addField(ft.type)} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Edit Field Modal */}
        <EditFieldModal
          field={editingField}
          visible={!!editingField}
          allFields={activeTemplate.fields}
          onClose={() => setEditingField(null)}
          onSave={saveField}
        />

        {/* Preview Modal */}
        {previewTemplate && (
          <PreviewScreen template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
        )}
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
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Industry Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {industries.map((ind) => (
              <Pressable
                key={ind}
                style={[
                  styles.industryTab,
                  {
                    backgroundColor: industryFilter === ind ? colors.primary : colors.surface,
                    borderColor: industryFilter === ind ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setIndustryFilter(ind)}
              >
                <Text style={[styles.industryTabText, { color: industryFilter === ind ? "#fff" : colors.muted }]}>
                  {ind}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

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
          {searchQuery || industryFilter !== "All"
            ? `RESULTS (${filteredTemplates.length})`
            : `ALL TEMPLATES (${filteredTemplates.length})`}
        </Text>

        {filteredTemplates.map((t) => (
          <View
            key={t.id}
            style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Pressable
              style={({ pressed }) => [styles.templateCardMain, { opacity: pressed ? 0.8 : 1 }]}
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
                <Text style={[styles.templateIndustry, { color: t.color }]}>{t.industry}</Text>
                <Text style={[styles.templateDesc, { color: colors.muted }]} numberOfLines={1}>{t.description}</Text>
                <Text style={[styles.templateFieldCount, { color: colors.muted }]}>{t.fields.length} fields</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>

            {/* Template Actions */}
            <View style={[styles.templateActions, { borderTopColor: colors.border }]}>
              <Pressable
                style={({ pressed }) => [styles.templateActionBtn, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => setPreviewTemplate(t)}
              >
                <IconSymbol name="eye.fill" size={13} color={colors.primary} />
                <Text style={[styles.templateActionText, { color: colors.primary }]}>Preview</Text>
              </Pressable>
              <View style={[styles.templateActionDivider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.templateActionBtn, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => duplicateTemplate(t)}
              >
                <IconSymbol name="doc.on.doc.fill" size={13} color={colors.muted} />
                <Text style={[styles.templateActionText, { color: colors.muted }]}>Duplicate</Text>
              </Pressable>
              {t.isCustom && (
                <>
                  <View style={[styles.templateActionDivider, { backgroundColor: colors.border }]} />
                  <Pressable
                    style={({ pressed }) => [styles.templateActionBtn, { opacity: pressed ? 0.6 : 1 }]}
                    onPress={() => deleteTemplate(t.id)}
                  >
                    <IconSymbol name="trash.fill" size={13} color="#EF4444" />
                    <Text style={[styles.templateActionText, { color: "#EF4444" }]}>Delete</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewScreen template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
      <BottomNavBar />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  industryTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  industryTabText: { fontSize: 12, fontWeight: "600" },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  infoCardTitle: { fontSize: 13, fontWeight: "700" },
  fieldTypePills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: "600" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  templateCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  templateCardMain: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  templateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  templateNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  templateName: { fontSize: 15, fontWeight: "700" },
  customBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  customBadgeText: { fontSize: 10, fontWeight: "700" },
  templateIndustry: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  templateDesc: { fontSize: 12, marginBottom: 2 },
  templateFieldCount: { fontSize: 11 },
  templateActions: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  templateActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  templateActionText: { fontSize: 12, fontWeight: "600" },
  templateActionDivider: { width: 1, height: 16, alignSelf: "center", marginHorizontal: 2 },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  fieldRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 8 },
  fieldRowIndex: { fontSize: 11, fontWeight: "700" },
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
  fieldPickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  fieldPickerTitle: { fontSize: 15, fontWeight: "700" },
  fieldTypeCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6, gap: 10 },
  fieldTypeIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  fieldTypeLabel: { fontSize: 13, fontWeight: "600" },
  fieldTypeDesc: { fontSize: 11, marginTop: 1 },
  categoryPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  categoryPillText: { fontSize: 12, fontWeight: "600" },
  previewLinkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  previewLinkText: { fontSize: 12, fontWeight: "600" },
  saveHeaderBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveHeaderBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  // Conditional logic
  conditionalHint: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  conditionalHintText: { fontSize: 13, lineHeight: 18 },
  conditionalFieldOption: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  conditionalFieldText: { fontSize: 14, fontWeight: "600" },
  operatorRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  operatorBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  operatorBtnText: { fontSize: 13, fontWeight: "700" },
  // Preview Screen
  previewHeader: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 12 },
  previewHeaderIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  previewHeaderTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  previewHeaderSub: { fontSize: 12, color: "#64748B", marginTop: 1 },
  previewCloseBtn: { padding: 4 },
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFBEB", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  previewBannerText: { fontSize: 11, fontWeight: "700", color: "#92400E", letterSpacing: 0.3 },
  previewFieldContainer: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  previewFieldHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  previewFieldDot: { width: 6, height: 6, borderRadius: 3 },
  previewFieldLabel: { fontSize: 14, fontWeight: "700", flex: 1 },
  previewHelpText: { fontSize: 12, color: "#64748B", marginBottom: 8, lineHeight: 17 },
  previewInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
  previewInputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  previewCurrencySymbol: { fontSize: 16, fontWeight: "700", marginRight: 6 },
  previewPlaceholder: { fontSize: 14 },
  previewOption: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  previewRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  previewRadioFill: { width: 8, height: 8, borderRadius: 4 },
  previewCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  previewOptionText: { fontSize: 14 },
  previewToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  previewToggleLabel: { fontSize: 14, fontWeight: "700" },
  previewChecklistItem: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  previewChecklistText: { fontSize: 14, flex: 1 },
  previewPhotoRow: { flexDirection: "row", gap: 10 },
  previewPhotoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, gap: 8 },
  previewPhotoBtnText: { fontSize: 13, fontWeight: "700" },
  previewFileBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  previewVoiceRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  previewVoiceBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  previewVoiceLabel: { fontSize: 13 },
  previewSignatureBox: { borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed", height: 100, alignItems: "center", justifyContent: "center", gap: 8 },
  previewGpsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, gap: 8 },
  previewGpsBtnText: { fontSize: 14, fontWeight: "700" },
  previewRatingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewRatingLabel: { fontSize: 13, marginLeft: 6 },
  previewFormulaBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  previewFormulaText: { fontSize: 13, fontWeight: "600", flex: 1 },
  previewSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FF6B35", borderRadius: 14, paddingVertical: 16, gap: 8, marginTop: 8 },
  previewSubmitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
