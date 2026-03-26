// ─── NVC360 Shared Types ──────────────────────────────────────────────────────

export type TaskStatus =
  | "unassigned"
  | "assigned"
  | "en_route"
  | "on_site"
  | "completed"
  | "failed"
  | "cancelled";

export type TechStatus = "online" | "busy" | "on_break" | "offline";
export type Priority = "low" | "normal" | "high" | "urgent";

export interface Technician {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: TechStatus;
  latitude: number;
  longitude: number;
  transportType: "car" | "van" | "truck" | "bike" | "foot";
  skills: string[];
  photoUrl?: string;
  activeTaskId?: number;
  activeTaskAddress?: string;
  todayJobs: number;
  todayDistanceKm: number;
}

export interface Task {
  id: number;
  jobHash: string;
  status: TaskStatus;
  priority: Priority;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  jobAddress: string;
  jobLatitude: number;
  jobLongitude: number;
  pickupAddress?: string;
  description?: string;
  orderRef?: string;
  technicianId?: number;
  technicianName?: string;
  technicianPhone?: string;
  templateName?: string;
  customFields?: Record<string, unknown>;
  geoClockIn?: string;
  geoClockOut?: string;
  timeOnSiteMin?: number;
  distanceTraveledKm?: number;
  totalCents?: number;
  scheduledAt?: string;
  dispatchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Message {
  id: number;
  taskId: number;
  senderType: "dispatcher" | "technician" | "system";
  senderId?: number;
  senderName?: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  industry?: string;
  description?: string;
  fields: TemplateField[];
  isDefault: boolean;
}

export interface TemplateField {
  id: string;
  type: "text" | "number" | "dropdown" | "checklist" | "photo" | "date" | "signature";
  label: string;
  required: boolean;
  options?: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_TECHNICIANS: Technician[] = [
  {
    id: 1,
    name: "Marcus Johnson",
    phone: "+1-204-555-0101",
    email: "marcus@example.com",
    status: "busy",
    latitude: 49.8951,
    longitude: -97.1384,
    transportType: "van",
    skills: ["HVAC", "Electrical"],
    activeTaskId: 1,
    activeTaskAddress: "123 Main St, Winnipeg",
    todayJobs: 3,
    todayDistanceKm: 42.5,
  },
  {
    id: 2,
    name: "Sarah Chen",
    phone: "+1-204-555-0102",
    email: "sarah@example.com",
    status: "online",
    latitude: 49.8821,
    longitude: -97.1472,
    transportType: "car",
    skills: ["IT Repair", "Telecom"],
    todayJobs: 2,
    todayDistanceKm: 18.3,
  },
  {
    id: 3,
    name: "David Okafor",
    phone: "+1-204-555-0103",
    email: "david@example.com",
    status: "en_route" as any,
    latitude: 49.9012,
    longitude: -97.1201,
    transportType: "truck",
    skills: ["Construction", "Flooring"],
    activeTaskId: 3,
    activeTaskAddress: "456 Oak Ave, Winnipeg",
    todayJobs: 1,
    todayDistanceKm: 9.1,
  },
  {
    id: 4,
    name: "Lisa Tremblay",
    phone: "+1-204-555-0104",
    email: "lisa@example.com",
    status: "offline",
    latitude: 49.8700,
    longitude: -97.1600,
    transportType: "car",
    skills: ["Home Repair", "Plumbing"],
    todayJobs: 0,
    todayDistanceKm: 0,
  },
  {
    id: 5,
    name: "James Kowalski",
    phone: "+1-204-555-0105",
    email: "james@example.com",
    status: "on_break",
    latitude: 49.8650,
    longitude: -97.1300,
    transportType: "van",
    skills: ["Electrical", "HVAC"],
    todayJobs: 4,
    todayDistanceKm: 55.2,
  },
  {
    id: 6,
    name: "Priya Sharma",
    phone: "+1-204-555-0106",
    email: "priya@example.com",
    status: "busy",
    latitude: 49.8780,
    longitude: -97.1450,
    transportType: "car",
    skills: ["IT Repair", "Networking"],
    activeTaskId: 6,
    activeTaskAddress: "789 Portage Ave, Winnipeg",
    todayJobs: 2,
    todayDistanceKm: 22.1,
  },
  {
    id: 7,
    name: "Carlos Rivera",
    phone: "+1-204-555-0107",
    email: "carlos@example.com",
    status: "en_route" as any,
    latitude: 49.9100,
    longitude: -97.1550,
    transportType: "truck",
    skills: ["Plumbing", "HVAC"],
    activeTaskId: 7,
    activeTaskAddress: "321 Henderson Hwy, Winnipeg",
    todayJobs: 1,
    todayDistanceKm: 14.7,
  },
  {
    id: 8,
    name: "Aisha Mbeki",
    phone: "+1-204-555-0108",
    email: "aisha@example.com",
    status: "online",
    latitude: 49.8600,
    longitude: -97.1200,
    transportType: "car",
    skills: ["Elder Care", "Home Fitness"],
    todayJobs: 3,
    todayDistanceKm: 31.4,
  },
  {
    id: 9,
    name: "Tom Nguyen",
    phone: "+1-204-555-0109",
    email: "tom@example.com",
    status: "offline",
    latitude: 49.8500,
    longitude: -97.1700,
    transportType: "van",
    skills: ["Telecom", "Electrical"],
    todayJobs: 0,
    todayDistanceKm: 0,
  },
  {
    id: 10,
    name: "Rachel Kim",
    phone: "+1-204-555-0110",
    email: "rachel@example.com",
    status: "busy",
    latitude: 49.8920,
    longitude: -97.1350,
    transportType: "car",
    skills: ["Flooring", "Construction"],
    activeTaskId: 10,
    activeTaskAddress: "654 St. Mary's Rd, Winnipeg",
    todayJobs: 5,
    todayDistanceKm: 67.8,
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    jobHash: "abc123def456",
    status: "on_site",
    priority: "high",
    customerName: "Robert Williams",
    customerPhone: "+1-204-555-0201",
    customerEmail: "robert@example.com",
    jobAddress: "123 Main St, Winnipeg, MB R3C 1A1",
    jobLatitude: 49.8951,
    jobLongitude: -97.1384,
    description: "HVAC unit not cooling. Customer reports unit making loud noise.",
    orderRef: "WO-2026-0341",
    technicianId: 1,
    technicianName: "Marcus Johnson",
    technicianPhone: "+1-204-555-0101",
    templateName: "HVAC Service Call",
    geoClockIn: new Date(Date.now() - 45 * 60000).toISOString(),
    timeOnSiteMin: 45,
    distanceTraveledKm: 12.3,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    startedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 2,
    jobHash: "xyz789ghi012",
    status: "en_route",
    priority: "normal",
    customerName: "Jennifer Park",
    customerPhone: "+1-204-555-0202",
    customerEmail: "jennifer@example.com",
    jobAddress: "789 Portage Ave, Winnipeg, MB R3G 0N1",
    jobLatitude: 49.8821,
    jobLongitude: -97.1472,
    description: "Laptop screen replacement. Device: MacBook Pro 14-inch 2023.",
    orderRef: "WO-2026-0342",
    technicianId: 2,
    technicianName: "Sarah Chen",
    technicianPhone: "+1-204-555-0102",
    templateName: "IT Repair",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 3,
    jobHash: "mno345pqr678",
    status: "assigned",
    priority: "urgent",
    customerName: "Michael Thompson",
    customerPhone: "+1-204-555-0203",
    jobAddress: "456 Oak Ave, Winnipeg, MB R2H 2T4",
    jobLatitude: 49.9012,
    jobLongitude: -97.1201,
    description: "Emergency flooring repair — water damage. 500 sq ft area affected.",
    orderRef: "WO-2026-0343",
    technicianId: 3,
    technicianName: "David Okafor",
    technicianPhone: "+1-204-555-0103",
    templateName: "Flooring Installation",
    scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 4,
    jobHash: "stu901vwx234",
    status: "completed",
    priority: "normal",
    customerName: "Amanda Foster",
    customerPhone: "+1-204-555-0204",
    jobAddress: "321 Henderson Hwy, Winnipeg, MB R2K 2M1",
    jobLatitude: 49.9100,
    jobLongitude: -97.0900,
    description: "Annual furnace inspection and filter replacement.",
    orderRef: "WO-2026-0340",
    technicianId: 1,
    technicianName: "Marcus Johnson",
    technicianPhone: "+1-204-555-0101",
    templateName: "HVAC Service Call",
    geoClockIn: new Date(Date.now() - 4 * 3600000).toISOString(),
    geoClockOut: new Date(Date.now() - 3 * 3600000).toISOString(),
    timeOnSiteMin: 62,
    distanceTraveledKm: 8.7,
    totalCents: 15000,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    startedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 5,
    jobHash: "yza567bcd890",
    status: "unassigned",
    priority: "low",
    customerName: "Patricia Nguyen",
    customerPhone: "+1-204-555-0205",
    customerEmail: "patricia@example.com",
    jobAddress: "654 Grant Ave, Winnipeg, MB R3M 1X9",
    jobLatitude: 49.8700,
    jobLongitude: -97.1600,
    description: "Install new smart thermostat. Customer has Nest Learning Thermostat.",
    orderRef: "WO-2026-0344",
    templateName: "HVAC Service Call",
    scheduledAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

export const MOCK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 1,
    name: "HVAC Service Call",
    industry: "hvac",
    description: "Standard HVAC inspection, repair, and maintenance",
    isDefault: true,
    fields: [
      { id: "unit_type", type: "dropdown", label: "Unit Type", required: true, options: ["Central AC", "Heat Pump", "Furnace", "Mini-Split", "Boiler"] },
      { id: "issue_type", type: "dropdown", label: "Issue Type", required: true, options: ["No Cooling", "No Heating", "Noisy", "Leaking", "Annual Maintenance"] },
      { id: "unit_age", type: "number", label: "Unit Age (years)", required: false },
      { id: "filter_replaced", type: "checklist", label: "Filter Replaced", required: false },
      { id: "refrigerant_checked", type: "checklist", label: "Refrigerant Level Checked", required: false },
      { id: "before_photo", type: "photo", label: "Before Photo", required: true },
      { id: "after_photo", type: "photo", label: "After Photo", required: true },
      { id: "tech_notes", type: "text", label: "Technician Notes", required: false },
    ],
  },
  {
    id: 2,
    name: "IT Repair",
    industry: "it_repair",
    description: "Computer, laptop, and device repair",
    isDefault: false,
    fields: [
      { id: "device_type", type: "dropdown", label: "Device Type", required: true, options: ["Laptop", "Desktop", "Tablet", "Phone", "Printer", "Network"] },
      { id: "brand", type: "text", label: "Brand / Model", required: true },
      { id: "issue_description", type: "text", label: "Issue Description", required: true },
      { id: "parts_replaced", type: "text", label: "Parts Replaced", required: false },
      { id: "diagnostic_photo", type: "photo", label: "Diagnostic Photo", required: false },
      { id: "resolution", type: "text", label: "Resolution Summary", required: true },
    ],
  },
  {
    id: 3,
    name: "Flooring Installation",
    industry: "flooring",
    description: "Flooring supply and installation work orders",
    isDefault: false,
    fields: [
      { id: "flooring_type", type: "dropdown", label: "Flooring Type", required: true, options: ["Hardwood", "Laminate", "Vinyl", "Tile", "Carpet", "Cork"] },
      { id: "area_sqft", type: "number", label: "Area (sq ft)", required: true },
      { id: "subfloor_condition", type: "dropdown", label: "Subfloor Condition", required: true, options: ["Good", "Needs Repair", "Needs Replacement"] },
      { id: "removal_required", type: "checklist", label: "Old Flooring Removal Required", required: false },
      { id: "before_photo", type: "photo", label: "Before Photo", required: true },
      { id: "after_photo", type: "photo", label: "After Photo", required: true },
      { id: "customer_signature", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: 4,
    name: "Delivery",
    industry: "delivery",
    description: "Package and goods delivery",
    isDefault: false,
    fields: [
      { id: "package_count", type: "number", label: "Number of Packages", required: true },
      { id: "weight_kg", type: "number", label: "Total Weight (kg)", required: false },
      { id: "special_handling", type: "dropdown", label: "Special Handling", required: false, options: ["None", "Fragile", "Temperature Sensitive", "Oversized"] },
      { id: "delivery_photo", type: "photo", label: "Delivery Confirmation Photo", required: true },
      { id: "recipient_signature", type: "signature", label: "Recipient Signature", required: true },
    ],
  },
  {
    id: 5,
    name: "Home Fitness Equipment",
    industry: "home_fitness",
    description: "Fitness equipment delivery and assembly",
    isDefault: false,
    fields: [
      { id: "equipment_type", type: "dropdown", label: "Equipment Type", required: true, options: ["Treadmill", "Elliptical", "Stationary Bike", "Weight Bench", "Rowing Machine", "Other"] },
      { id: "brand_model", type: "text", label: "Brand & Model", required: true },
      { id: "assembly_required", type: "checklist", label: "Assembly Required", required: false },
      { id: "placement_photo", type: "photo", label: "Final Placement Photo", required: true },
      { id: "customer_signature", type: "signature", label: "Customer Sign-Off", required: true },
    ],
  },
  {
    id: 6,
    name: "Custom",
    industry: "other",
    description: "Fully customizable work order",
    isDefault: false,
    fields: [
      { id: "custom_notes", type: "text", label: "Work Description", required: true },
    ],
  },
];

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<TaskStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  en_route: "En Route",
  on_site: "On Site",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  unassigned: "#6B7280",
  assigned: "#3B82F6",
  en_route: "#F59E0B",
  on_site: "#8B5CF6",
  completed: "#22C55E",
  failed: "#EF4444",
  cancelled: "#9CA3AF",
};

export const TECH_STATUS_LABELS: Record<string, string> = {
  online: "Available",
  busy: "On Job",
  on_break: "On Break",
  offline: "Offline",
  en_route: "En Route",
};

export const TECH_STATUS_COLORS: Record<string, string> = {
  online: "#22C55E",
  busy: "#F59E0B",
  on_break: "#3B82F6",
  offline: "#6B7280",
  en_route: "#8B5CF6",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#6B7280",
  normal: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getETA(techLat: number, techLng: number, jobLat: number, jobLng: number): number {
  // Haversine distance in km
  const R = 6371;
  const dLat = ((jobLat - techLat) * Math.PI) / 180;
  const dLng = ((jobLng - techLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((techLat * Math.PI) / 180) *
      Math.cos((jobLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Assume 40 km/h average urban speed
  return Math.max(1, Math.round((distKm / 40) * 60));
}
