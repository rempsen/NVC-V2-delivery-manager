/**
 * Tookan API Service Layer
 * Based on open-source community libraries:
 * - douglasmakey/tookan_api (Python SDK)
 * - tookan-hub/tookan-tracker-sdk-android
 * - jilabaji/tookan (Node.js module)
 * API Docs: https://tookanapi.docs.apiary.io/
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOOKAN_BASE_URL = "https://api.tookanapp.com/v2";
const API_KEY_STORAGE = "nvc360_tookan_api_key";
const USER_ID_STORAGE = "nvc360_tookan_user_id";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 0  // Assigned
  | 1  // Started
  | 2  // Successful
  | 3  // Failed
  | 4  // InProgress
  | 6  // Unassigned
  | 9; // Deleted

export type JobType = 0 | 1 | 2; // 0=Pickup, 1=Delivery, 2=Appointment

export interface TookanTask {
  job_id: number;
  job_hash: string;
  job_token: string;
  job_status: TaskStatus;
  job_type: JobType;
  customer_username: string;
  customer_phone: string;
  customer_email: string;
  job_address: string;
  job_latitude: string;
  job_longitude: string;
  job_pickup_address?: string;
  job_pickup_latitude?: string;
  job_pickup_longitude?: string;
  job_pickup_name?: string;
  job_pickup_phone?: string;
  job_description: string;
  fleet_id?: number;
  fleet_name?: string;
  fleet_phone?: string;
  fleet_latitude?: string;
  fleet_longitude?: string;
  team_id?: number;
  creation_datetime: string;
  started_datetime?: string;
  completed_datetime?: string;
  scheduled_time?: string;
  tracking_link?: string;
  order_id?: string;
  total_distance_travelled?: number;
  total_time_spent?: number;
}

export interface TookanAgent {
  fleet_id: number;
  fleet_name: string;
  username: string;
  phone: string;
  email: string;
  fleet_image?: string;
  latitude?: string;
  longitude?: string;
  is_available: number; // 1=available, 0=unavailable
  total_tasks?: number;
  completed_tasks?: number;
  active_task_id?: number;
  last_updated?: string;
  transport_type?: number; // 1=Car, 2=Bike, 3=Truck
}

export interface TookanLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface CreateTaskPayload {
  customer_username: string;
  customer_phone: string;
  customer_email?: string;
  job_description: string;
  job_pickup_address?: string;
  job_pickup_name?: string;
  job_pickup_phone?: string;
  job_address: string;
  job_latitude?: string;
  job_longitude?: string;
  job_pickup_latitude?: string;
  job_pickup_longitude?: string;
  fleet_id?: number;
  team_id?: number;
  scheduled_time?: string;
  has_pickup?: number;
  has_delivery?: number;
  order_id?: string;
  ref_images?: string[];
  custom_field_template?: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  0: "Assigned",
  1: "Started",
  2: "Completed",
  3: "Failed",
  4: "In Progress",
  6: "Unassigned",
  9: "Deleted",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  0: "#F59E0B",
  1: "#1A56DB",
  2: "#22C55E",
  3: "#EF4444",
  4: "#8B5CF6",
  6: "#94A3B8",
  9: "#64748B",
};

export function getStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? "Unknown";
}

export function getStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] ?? "#94A3B8";
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function saveApiKey(key: string, userId: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE, key);
  await AsyncStorage.setItem(USER_ID_STORAGE, userId);
}

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_STORAGE);
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_STORAGE);
}

export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(API_KEY_STORAGE);
  await AsyncStorage.removeItem(USER_ID_STORAGE);
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_AGENTS: TookanAgent[] = [
  {
    fleet_id: 1001,
    fleet_name: "Marcus Johnson",
    username: "marcus.j",
    phone: "+12045551234",
    email: "marcus@nvc360.com",
    fleet_image: "",
    latitude: "49.8951",
    longitude: "-97.1384",
    is_available: 1,
    total_tasks: 142,
    completed_tasks: 138,
    active_task_id: 5001,
    last_updated: new Date().toISOString(),
    transport_type: 1,
  },
  {
    fleet_id: 1002,
    fleet_name: "Sarah Chen",
    username: "sarah.c",
    phone: "+12045555678",
    email: "sarah@nvc360.com",
    fleet_image: "",
    latitude: "49.9051",
    longitude: "-97.1284",
    is_available: 1,
    total_tasks: 98,
    completed_tasks: 95,
    active_task_id: undefined,
    last_updated: new Date().toISOString(),
    transport_type: 1,
  },
  {
    fleet_id: 1003,
    fleet_name: "Dave Patel",
    username: "dave.p",
    phone: "+12045559012",
    email: "dave@nvc360.com",
    fleet_image: "",
    latitude: "49.8851",
    longitude: "-97.1484",
    is_available: 0,
    total_tasks: 67,
    completed_tasks: 64,
    active_task_id: undefined,
    last_updated: new Date(Date.now() - 3600000).toISOString(),
    transport_type: 2,
  },
];

export const MOCK_TASKS: TookanTask[] = [
  {
    job_id: 5001,
    job_hash: "abc123def456",
    job_token: "tok_5001",
    job_status: 1,
    job_type: 1,
    customer_username: "Alice Thompson",
    customer_phone: "+12045550001",
    customer_email: "alice@email.com",
    job_address: "123 Main St, Winnipeg, MB R3C 1A1",
    job_latitude: "49.8951",
    job_longitude: "-97.1384",
    job_pickup_address: "NVC360 Warehouse, 456 Industrial Ave, Winnipeg",
    job_pickup_latitude: "49.9100",
    job_pickup_longitude: "-97.1500",
    job_pickup_name: "NVC360 Dispatch",
    job_pickup_phone: "+12045550000",
    job_description: "Flooring installation — 3 boxes hardwood",
    fleet_id: 1001,
    fleet_name: "Marcus Johnson",
    fleet_phone: "+12045551234",
    fleet_latitude: "49.8990",
    fleet_longitude: "-97.1420",
    creation_datetime: new Date(Date.now() - 7200000).toISOString(),
    started_datetime: new Date(Date.now() - 1800000).toISOString(),
    tracking_link: "https://track.nvc360.com/job/abc123def456",
    order_id: "NVC-2026-001",
  },
  {
    job_id: 5002,
    job_hash: "xyz789uvw012",
    job_token: "tok_5002",
    job_status: 0,
    job_type: 1,
    customer_username: "Bob Martinez",
    customer_phone: "+12045550002",
    customer_email: "bob@email.com",
    job_address: "789 Oak Ave, Winnipeg, MB R2H 2B5",
    job_latitude: "49.8700",
    job_longitude: "-97.1200",
    job_description: "Commercial carpet delivery — 2 rolls",
    fleet_id: 1002,
    fleet_name: "Sarah Chen",
    fleet_phone: "+12045555678",
    creation_datetime: new Date(Date.now() - 3600000).toISOString(),
    tracking_link: "https://track.nvc360.com/job/xyz789uvw012",
    order_id: "NVC-2026-002",
  },
  {
    job_id: 5003,
    job_hash: "lmn345opq678",
    job_token: "tok_5003",
    job_status: 2,
    job_type: 1,
    customer_username: "Carol White",
    customer_phone: "+12045550003",
    customer_email: "carol@email.com",
    job_address: "321 Elm St, Winnipeg, MB R3G 0K8",
    job_latitude: "49.9000",
    job_longitude: "-97.1600",
    job_description: "Tile installation supplies",
    fleet_id: 1001,
    fleet_name: "Marcus Johnson",
    fleet_phone: "+12045551234",
    creation_datetime: new Date(Date.now() - 86400000).toISOString(),
    completed_datetime: new Date(Date.now() - 72000000).toISOString(),
    tracking_link: "https://track.nvc360.com/job/lmn345opq678",
    order_id: "NVC-2026-003",
    total_distance_travelled: 12.4,
    total_time_spent: 45,
  },
  {
    job_id: 5004,
    job_hash: "rst901uvw234",
    job_token: "tok_5004",
    job_status: 3,
    job_type: 1,
    customer_username: "Dan Rosenblat",
    customer_phone: "+12045550004",
    customer_email: "dan@nvc360.com",
    job_address: "555 Portage Ave, Winnipeg, MB R3B 2E9",
    job_latitude: "49.8960",
    job_longitude: "-97.1450",
    job_description: "Luxury vinyl plank — showroom delivery",
    fleet_id: 1003,
    fleet_name: "Dave Patel",
    fleet_phone: "+12045559012",
    creation_datetime: new Date(Date.now() - 172800000).toISOString(),
    tracking_link: "https://track.nvc360.com/job/rst901uvw234",
    order_id: "NVC-2026-004",
  },
  {
    job_id: 5005,
    job_hash: "efg567hij890",
    job_token: "tok_5005",
    job_status: 6,
    job_type: 1,
    customer_username: "Eve Nguyen",
    customer_phone: "+12045550005",
    customer_email: "eve@email.com",
    job_address: "888 Grant Ave, Winnipeg, MB R3M 1Y6",
    job_latitude: "49.8800",
    job_longitude: "-97.1700",
    job_description: "Backsplash tile — kitchen renovation",
    creation_datetime: new Date(Date.now() - 1800000).toISOString(),
    tracking_link: "https://track.nvc360.com/job/efg567hij890",
    order_id: "NVC-2026-005",
  },
];

// ─── API Client ───────────────────────────────────────────────────────────────

async function tookanPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch(`${TOOKAN_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, ...body }),
  });

  const data = await response.json();
  if (data.status !== 200) {
    throw new Error(data.message || "Tookan API error");
  }
  return data.data as T;
}

// ─── Task API ─────────────────────────────────────────────────────────────────

export async function getAllTasks(
  jobStatus?: TaskStatus,
  jobType?: JobType,
): Promise<TookanTask[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return MOCK_TASKS;

  try {
    return await tookanPost<TookanTask[]>("/get_all_tasks", {
      job_status: jobStatus,
      job_type: jobType,
      is_pagination: 0,
    });
  } catch {
    return MOCK_TASKS;
  }
}

export async function getTaskById(jobId: number): Promise<TookanTask | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return MOCK_TASKS.find((t) => t.job_id === jobId) ?? null;

  try {
    const result = await tookanPost<TookanTask[]>("/get_task_details", {
      job_ids: [jobId],
      include_task_history: 1,
    });
    return result[0] ?? null;
  } catch {
    return MOCK_TASKS.find((t) => t.job_id === jobId) ?? null;
  }
}

export async function createTask(payload: CreateTaskPayload): Promise<TookanTask> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const newTask: TookanTask = {
      job_id: Date.now(),
      job_hash: Math.random().toString(36).substring(2),
      job_token: `tok_${Date.now()}`,
      job_status: 6,
      job_type: 1,
      customer_username: payload.customer_username,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email ?? "",
      job_address: payload.job_address,
      job_latitude: payload.job_latitude ?? "",
      job_longitude: payload.job_longitude ?? "",
      job_pickup_address: payload.job_pickup_address,
      job_description: payload.job_description,
      creation_datetime: new Date().toISOString(),
      tracking_link: `https://track.nvc360.com/job/${Math.random().toString(36).substring(2)}`,
      order_id: payload.order_id,
    };
    MOCK_TASKS.unshift(newTask);
    return newTask;
  }

  return tookanPost<TookanTask>("/create_task", {
    ...payload,
    has_pickup: payload.has_pickup ?? 0,
    has_delivery: 1,
    layout_type: 0,
    tracking_link: 1,
  });
}

export async function updateTaskStatus(jobId: number, status: TaskStatus): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const task = MOCK_TASKS.find((t) => t.job_id === jobId);
    if (task) task.job_status = status;
    return;
  }
  await tookanPost("/update_task_status", { job_id: jobId, job_status: status });
}

export async function deleteTask(jobId: number): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const idx = MOCK_TASKS.findIndex((t) => t.job_id === jobId);
    if (idx !== -1) MOCK_TASKS.splice(idx, 1);
    return;
  }
  await tookanPost("/delete_task", { job_id: jobId });
}

// ─── Agent API ────────────────────────────────────────────────────────────────

export async function getAllAgents(): Promise<TookanAgent[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return MOCK_AGENTS;

  try {
    return await tookanPost<TookanAgent[]>("/get_all_fleets", {
      is_pagination: 0,
    });
  } catch {
    return MOCK_AGENTS;
  }
}

export async function getAgentLocation(fleetId: number): Promise<TookanLocation | null> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const agent = MOCK_AGENTS.find((a) => a.fleet_id === fleetId);
    if (!agent?.latitude) return null;
    // Simulate slight movement for demo
    const jitter = () => (Math.random() - 0.5) * 0.002;
    return {
      latitude: parseFloat(agent.latitude) + jitter(),
      longitude: parseFloat(agent.longitude!) + jitter(),
      timestamp: new Date().toISOString(),
      speed: Math.random() * 60,
      heading: Math.random() * 360,
    };
  }

  try {
    const result = await tookanPost<{ latitude: string; longitude: string }>("/get_fleet_location", {
      fleet_id: fleetId,
    });
    return {
      latitude: parseFloat(result.latitude),
      longitude: parseFloat(result.longitude),
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Tracking link helper ─────────────────────────────────────────────────────

export function buildTrackingUrl(jobHash: string): string {
  return `https://track.nvc360.com/job/${jobHash}`;
}

export function formatETA(minutes: number): string {
  if (minutes < 1) return "Arriving now";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function estimateETA(
  agentLat: number,
  agentLng: number,
  destLat: number,
  destLng: number,
): number {
  // Haversine distance in km, assume 40 km/h average urban speed
  const R = 6371;
  const dLat = ((destLat - agentLat) * Math.PI) / 180;
  const dLng = ((destLng - agentLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((agentLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (distKm / 40) * 60; // minutes
}
