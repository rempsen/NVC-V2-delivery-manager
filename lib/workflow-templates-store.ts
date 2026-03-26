/**
 * workflow-templates-store.ts
 *
 * Shared in-memory + AsyncStorage store for workflow templates.
 * Both the Settings → Workflow Templates editor and the New Work Order form
 * read/write from this single source of truth.
 *
 * Pattern: module-level cache + listeners (no React context needed).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldType =
  | "short_text" | "long_text" | "number" | "currency" | "date" | "time"
  | "datetime" | "single_select" | "multi_select" | "toggle" | "checklist"
  | "photo" | "file" | "voice" | "signature" | "gps" | "barcode"
  | "rating" | "formula" | "conditional";

export interface FieldOption { id: string; label: string; }

export interface WorkflowField {
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

export interface WorkflowTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string;
  color: string;
  fields: WorkflowField[];
  isCustom: boolean;
}

// ─── Default Templates ────────────────────────────────────────────────────────
export const DEFAULT_TEMPLATES: WorkflowTemplate[] = [
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
      { id: "f7", type: "long_text", label: "Technician Notes", required: false },
      { id: "f8", type: "currency", label: "Parts Cost", required: false },
      { id: "f9", type: "photo", label: "After Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 5 },
      { id: "f10", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: "it_repair",
    name: "IT Repair",
    industry: "IT / Technology",
    description: "Computer, laptop, and device repair workflow",
    icon: "desktopcomputer",
    color: "#3B82F6",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Device Type", required: true, options: [{ id: "o1", label: "Laptop" }, { id: "o2", label: "Desktop" }, { id: "o3", label: "Tablet" }, { id: "o4", label: "Phone" }, { id: "o5", label: "Printer" }, { id: "o6", label: "Network" }] },
      { id: "f2", type: "short_text", label: "Brand / Model", required: true, placeholder: "e.g. Dell XPS 15, MacBook Pro M3" },
      { id: "f3", type: "barcode", label: "Scan Asset Tag / Serial", required: false },
      { id: "f4", type: "long_text", label: "Issue Description", required: true, placeholder: "Describe the problem in detail..." },
      { id: "f5", type: "photo", label: "Diagnostic Photo", required: false, allowCamera: true, allowGallery: true, maxFiles: 3 },
      { id: "f6", type: "short_text", label: "Parts Replaced", required: false, placeholder: "e.g. SSD, RAM, Battery" },
      { id: "f7", type: "currency", label: "Parts Cost", required: false },
      { id: "f8", type: "long_text", label: "Resolution Summary", required: true },
      { id: "f9", type: "toggle", label: "Device Tested & Working?", required: true },
      { id: "f10", type: "signature", label: "Customer Acceptance", required: true },
    ],
  },
  {
    id: "flooring_install",
    name: "Flooring Installation",
    industry: "Flooring",
    description: "Flooring supply and installation work orders",
    icon: "square.grid.3x3.fill",
    color: "#8B5CF6",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Flooring Type", required: true, options: [{ id: "o1", label: "Hardwood" }, { id: "o2", label: "Laminate" }, { id: "o3", label: "Vinyl Plank (LVP)" }, { id: "o4", label: "Tile" }, { id: "o5", label: "Carpet" }, { id: "o6", label: "Cork" }] },
      { id: "f2", type: "number", label: "Area (sq ft)", required: true, minValue: 1 },
      { id: "f3", type: "single_select", label: "Subfloor Condition", required: true, options: [{ id: "o1", label: "Good" }, { id: "o2", label: "Needs Repair" }, { id: "o3", label: "Needs Replacement" }] },
      { id: "f4", type: "toggle", label: "Old Flooring Removal Required?", required: false },
      { id: "f5", type: "photo", label: "Before Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 5 },
      { id: "f6", type: "checklist", label: "Installation Checklist", required: true, checklistItems: ["Subfloor prepared", "Moisture barrier installed", "Flooring acclimated", "Expansion gaps maintained", "Trim/transitions installed", "Final cleanup done"] },
      { id: "f7", type: "photo", label: "After Photos", required: true, allowCamera: true, allowGallery: true, maxFiles: 5 },
      { id: "f8", type: "rating", label: "Customer Satisfaction", required: false, ratingMax: 5 },
      { id: "f9", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: "delivery",
    name: "Delivery",
    industry: "Logistics",
    description: "Package and goods delivery with proof of delivery",
    icon: "shippingbox.fill",
    color: "#1A56DB",
    isCustom: false,
    fields: [
      { id: "f1", type: "short_text", label: "Order / Reference #", required: true, placeholder: "NVC-2026-XXX" },
      { id: "f2", type: "number", label: "Number of Packages", required: true, minValue: 1 },
      { id: "f3", type: "number", label: "Total Weight (kg)", required: false },
      { id: "f4", type: "single_select", label: "Special Handling", required: false, options: [{ id: "o1", label: "None" }, { id: "o2", label: "Fragile" }, { id: "o3", label: "Temperature Sensitive" }, { id: "o4", label: "Oversized" }] },
      { id: "f5", type: "short_text", label: "Recipient Name", required: true },
      { id: "f6", type: "photo", label: "Delivery Confirmation Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 1 },
      { id: "f7", type: "signature", label: "Recipient Signature", required: false },
    ],
  },
  {
    id: "home_care",
    name: "Home Care Visit",
    industry: "Home Care",
    description: "Senior care, personal support, and wellness check",
    icon: "heart.fill",
    color: "#EC4899",
    isCustom: false,
    fields: [
      { id: "f1", type: "single_select", label: "Visit Type", required: true, options: [{ id: "o1", label: "Personal Care" }, { id: "o2", label: "Medication Reminder" }, { id: "o3", label: "Meal Preparation" }, { id: "o4", label: "Companionship" }, { id: "o5", label: "Wellness Check" }] },
      { id: "f2", type: "checklist", label: "Care Tasks Completed", required: true, checklistItems: ["Vitals checked", "Medications given", "Meal prepared", "Personal hygiene assisted", "Home safety check done"] },
      { id: "f3", type: "toggle", label: "Client in Good Condition?", required: true },
      { id: "f4", type: "long_text", label: "Care Notes", required: true, placeholder: "Document any observations or concerns..." },
      { id: "f5", type: "rating", label: "Client Mood / Wellbeing", required: false, ratingMax: 5 },
      { id: "f6", type: "signature", label: "Client / Family Sign-Off", required: false },
    ],
  },
  {
    id: "home_fitness",
    name: "Fitness Equipment Install",
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
    name: "Limousine / Chauffeur",
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
      { id: "f5", type: "checklist", label: "Pre-Trip Vehicle Inspection", required: true, checklistItems: ["Exterior clean", "Interior clean", "Fuel full", "Water/amenities stocked", "Climate set", "Music/entertainment ready"] },
      { id: "f6", type: "photo", label: "Vehicle Condition Photo", required: true, allowCamera: true, allowGallery: false, maxFiles: 3 },
      { id: "f7", type: "currency", label: "Final Fare", required: true },
      { id: "f8", type: "rating", label: "Passenger Rating", required: false, ratingMax: 5 },
      { id: "f9", type: "signature", label: "Passenger Confirmation", required: false },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    industry: "General",
    description: "Blank template — add any fields you need",
    icon: "pencil",
    color: "#64748B",
    isCustom: true,
    fields: [],
  },
];

// ─── Storage Key ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "nvc360_workflow_templates_v2";

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cache: WorkflowTemplate[] | null = null;
const _listeners: Set<() => void> = new Set();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load templates from AsyncStorage (or return defaults on first run). */
export async function loadTemplates(): Promise<WorkflowTemplate[]> {
  if (_cache !== null) return _cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkflowTemplate[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        _cache = parsed;
        return _cache;
      }
    }
  } catch {
    // Fall through to defaults
  }
  _cache = [...DEFAULT_TEMPLATES];
  return _cache;
}

/** Save the full template list to AsyncStorage. */
export async function saveTemplates(templates: WorkflowTemplate[]): Promise<void> {
  _cache = templates;
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Silent fail — in-memory cache still updated
  }
}

/** Get the current cached templates synchronously (null if not yet loaded). */
export function getCachedTemplates(): WorkflowTemplate[] | null {
  return _cache;
}

/** Subscribe to template changes. Returns an unsubscribe function. */
export function subscribeToTemplates(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** React hook: returns live template list, auto-updates on changes. */
import { useState, useEffect } from "react";

export function useWorkflowTemplates(): {
  templates: WorkflowTemplate[];
  loading: boolean;
  saveTemplates: (t: WorkflowTemplate[]) => Promise<void>;
} {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(
    _cache ?? DEFAULT_TEMPLATES
  );
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    let cancelled = false;
    if (_cache === null) {
      loadTemplates().then((t) => {
        if (!cancelled) {
          setTemplates(t);
          setLoading(false);
        }
      });
    }
    const unsub = subscribeToTemplates(() => {
      if (!cancelled && _cache) setTemplates([..._cache]);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { templates, loading, saveTemplates };
}
