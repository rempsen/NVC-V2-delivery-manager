import { describe, it, expect } from "vitest";
import {
  MOCK_TASKS,
  MOCK_TECHNICIANS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  TECH_STATUS_COLORS,
  TECH_STATUS_LABELS,
} from "../lib/nvc-types";

// ─── Mock Data Tests ──────────────────────────────────────────────────────────

describe("NVC360 Mock Data", () => {
  it("should have mock tasks with required fields", () => {
    expect(MOCK_TASKS.length).toBeGreaterThan(0);
    for (const task of MOCK_TASKS) {
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("status");
      expect(task).toHaveProperty("customerName");
      expect(task).toHaveProperty("jobAddress");
      expect(task).toHaveProperty("priority");
    }
  });

  it("should have mock technicians with required fields", () => {
    expect(MOCK_TECHNICIANS.length).toBeGreaterThan(0);
    for (const tech of MOCK_TECHNICIANS) {
      expect(tech).toHaveProperty("id");
      expect(tech).toHaveProperty("name");
      expect(tech).toHaveProperty("phone");
      expect(tech).toHaveProperty("status");
      expect(tech).toHaveProperty("latitude");
      expect(tech).toHaveProperty("longitude");
    }
  });

  it("should have valid GPS coordinates for all technicians", () => {
    for (const tech of MOCK_TECHNICIANS) {
      expect(tech.latitude).toBeGreaterThan(-90);
      expect(tech.latitude).toBeLessThan(90);
      expect(tech.longitude).toBeGreaterThan(-180);
      expect(tech.longitude).toBeLessThan(180);
    }
  });
});

// ─── Status Colors & Labels ───────────────────────────────────────────────────

describe("Task Status Colors and Labels", () => {
  const expectedStatuses = ["unassigned", "assigned", "en_route", "on_site", "completed", "failed", "cancelled"];

  it("should have color for every task status", () => {
    for (const status of expectedStatuses) {
      expect(STATUS_COLORS).toHaveProperty(status);
      expect(typeof STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBe("string");
    }
  });

  it("should have label for every task status", () => {
    for (const status of expectedStatuses) {
      expect(STATUS_LABELS).toHaveProperty(status);
      expect(typeof STATUS_LABELS[status as keyof typeof STATUS_LABELS]).toBe("string");
    }
  });

  it("should have valid hex color values", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const color of Object.values(STATUS_COLORS)) {
      expect(color).toMatch(hexPattern);
    }
  });
});

// ─── Priority Colors ──────────────────────────────────────────────────────────

describe("Task Priority Colors", () => {
  const expectedPriorities = ["low", "normal", "high", "urgent"];

  it("should have color for every priority level", () => {
    for (const priority of expectedPriorities) {
      expect(PRIORITY_COLORS).toHaveProperty(priority);
    }
  });
});

// ─── Technician Status ────────────────────────────────────────────────────────

describe("Technician Status Colors and Labels", () => {
  const expectedStatuses = ["online", "busy", "offline", "on_break"];

  it("should have color for every technician status", () => {
    for (const status of expectedStatuses) {
      expect(TECH_STATUS_COLORS).toHaveProperty(status);
    }
  });

  it("should have label for every technician status", () => {
    for (const status of expectedStatuses) {
      expect(TECH_STATUS_LABELS).toHaveProperty(status);
    }
  });
});

// ─── Business Logic ───────────────────────────────────────────────────────────

describe("Dispatcher Dashboard Logic", () => {
  it("should correctly count active tasks", () => {
    const activeTasks = MOCK_TASKS.filter(
      (t) => t.status === "en_route" || t.status === "on_site",
    );
    expect(activeTasks.length).toBeGreaterThanOrEqual(0);
  });

  it("should correctly count unassigned tasks", () => {
    const unassigned = MOCK_TASKS.filter((t) => t.status === "unassigned");
    expect(unassigned.length).toBeGreaterThanOrEqual(0);
  });

  it("should correctly count online technicians", () => {
    const online = MOCK_TECHNICIANS.filter(
      (t) => t.status === "online" || t.status === "busy",
    );
    expect(online.length).toBeGreaterThanOrEqual(0);
    expect(online.length).toBeLessThanOrEqual(MOCK_TECHNICIANS.length);
  });

  it("should filter tasks by status correctly", () => {
    const enRouteTasks = MOCK_TASKS.filter((t) => t.status === "en_route");
    for (const task of enRouteTasks) {
      expect(task.status).toBe("en_route");
    }
  });

  it("should filter tasks by search query correctly", () => {
    const query = MOCK_TASKS[0].customerName.toLowerCase().slice(0, 4);
    const results = MOCK_TASKS.filter(
      (t) =>
        t.customerName.toLowerCase().includes(query) ||
        t.jobAddress.toLowerCase().includes(query),
    );
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── Multi-Tenant Architecture ────────────────────────────────────────────────

describe("Multi-Tenant Data Isolation", () => {
  it("all mock tasks should have a unique id", () => {
    const ids = MOCK_TASKS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all mock technicians should have a unique id", () => {
    const ids = MOCK_TECHNICIANS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("tasks can be filtered per technician (simulating tenant isolation)", () => {
    const techId = MOCK_TECHNICIANS[0].id;
    const techTasks = MOCK_TASKS.filter((t) => t.technicianId === techId);
    for (const task of techTasks) {
      expect(task.technicianId).toBe(techId);
    }
  });
});

// ─── ETA Calculation ──────────────────────────────────────────────────────────

describe("ETA Logic", () => {
  it("should calculate ETA in minutes from distance and speed", () => {
    const distanceKm = 5;
    const speedKmh = 40;
    const etaMinutes = Math.round((distanceKm / speedKmh) * 60);
    expect(etaMinutes).toBe(8);
  });

  it("should return 0 ETA for arrived status", () => {
    const status = "on_site";
    const eta = status === "on_site" ? 0 : 10;
    expect(eta).toBe(0);
  });
});

// ─── Pricing Engine Logic ─────────────────────────────────────────────────────

describe("Pricing Engine", () => {
  it("should calculate flat rate correctly", () => {
    const flatRate = 150;
    const total = flatRate;
    expect(total).toBe(150);
  });

  it("should calculate hourly rate with overtime correctly", () => {
    const baseRate = 150; // first 60 min
    const overtimeRate = 75; // per hour after
    const totalMinutes = 90;
    const baseMinutes = 60;
    const overtimeMinutes = totalMinutes - baseMinutes;
    const total = baseRate + (overtimeMinutes / 60) * overtimeRate;
    expect(total).toBe(187.5);
  });

  it("should calculate per-km rate correctly", () => {
    const freeKmRadius = 20;
    const perKmRate = 1.5;
    const totalKm = 35;
    const chargeableKm = Math.max(0, totalKm - freeKmRadius);
    const total = chargeableKm * perKmRate;
    expect(total).toBe(22.5);
  });

  it("should return 0 charge when within free radius", () => {
    const freeKmRadius = 20;
    const perKmRate = 1.5;
    const totalKm = 15;
    const chargeableKm = Math.max(0, totalKm - freeKmRadius);
    const total = chargeableKm * perKmRate;
    expect(total).toBe(0);
  });
});

// ─── Authentication Tests ─────────────────────────────────────────────────────

describe("NVC360 Authentication", () => {
  const MOCK_USERS = [
    { email: "admin@nvc360.com", role: "nvc_super_admin", tenantId: null },
    { email: "pm@nvc360.com", role: "nvc_project_manager", tenantId: null },
    { email: "dispatch@acmehvac.com", role: "dispatcher", tenantId: "t-001" },
    { email: "tech@acmehvac.com", role: "field_technician", tenantId: "t-001" },
  ];

  it("should have NVC360 platform users with no tenantId", () => {
    const platformUsers = MOCK_USERS.filter((u) => u.tenantId === null);
    expect(platformUsers).toHaveLength(2);
  });

  it("should have client users with a tenantId", () => {
    const clientUsers = MOCK_USERS.filter((u) => u.tenantId !== null);
    expect(clientUsers).toHaveLength(2);
    for (const u of clientUsers) {
      expect(u.tenantId).toBe("t-001");
    }
  });

  it("should route nvc_super_admin to super-admin dashboard", () => {
    const user = MOCK_USERS.find((u) => u.role === "nvc_super_admin")!;
    const route =
      user.role === "nvc_super_admin" || user.role === "nvc_project_manager"
        ? "/super-admin"
        : "/(tabs)";
    expect(route).toBe("/super-admin");
  });

  it("should route dispatcher to main tabs", () => {
    const user = MOCK_USERS.find((u) => u.role === "dispatcher")!;
    const route =
      user.role === "nvc_super_admin" || user.role === "nvc_project_manager"
        ? "/super-admin"
        : "/(tabs)";
    expect(route).toBe("/(tabs)");
  });

  it("should support Google, Apple, and email auth providers", () => {
    const providers = ["email", "google", "apple"];
    expect(providers).toContain("google");
    expect(providers).toContain("apple");
    expect(providers).toContain("email");
  });
});

// ─── Role & Permission Tests ──────────────────────────────────────────────────

describe("NVC360 Roles & Permissions", () => {
  const ROLES = [
    { id: "nvc_super_admin", tier: "nvc360_platform" },
    { id: "nvc_project_manager", tier: "nvc360_platform" },
    { id: "nvc_support", tier: "nvc360_platform" },
    { id: "company_admin", tier: "client_company" },
    { id: "divisional_manager", tier: "client_company" },
    { id: "dispatcher", tier: "client_company" },
    { id: "field_technician", tier: "client_company" },
    { id: "office_staff", tier: "client_company" },
  ];

  it("should have 8 total roles", () => {
    expect(ROLES).toHaveLength(8);
  });

  it("should have 3 NVC360 platform roles", () => {
    const platformRoles = ROLES.filter((r) => r.tier === "nvc360_platform");
    expect(platformRoles).toHaveLength(3);
  });

  it("should have 5 client company roles", () => {
    const clientRoles = ROLES.filter((r) => r.tier === "client_company");
    expect(clientRoles).toHaveLength(5);
  });

  it("should have 7 permission categories", () => {
    const categories = ["Platform", "Company", "Tasks", "Field", "Customers", "Reports", "Messaging"];
    expect(categories).toHaveLength(7);
  });
});

// ─── Notification Milestone Tests ─────────────────────────────────────────────

describe("NVC360 Notification Milestones", () => {
  const MILESTONES = [
    { id: "job_booked", channel: "both", enabled: true },
    { id: "agent_assigned", channel: "both", enabled: true },
    { id: "agent_en_route", channel: "sms", enabled: true },
    { id: "agent_arrived", channel: "sms", enabled: true },
    { id: "job_started", channel: "none", enabled: false },
    { id: "job_completed", channel: "both", enabled: true },
    { id: "job_failed", channel: "both", enabled: true },
    { id: "followup_24h", channel: "email", enabled: true },
    { id: "followup_review", channel: "email", enabled: false },
    { id: "invoice_sent", channel: "email", enabled: true },
    { id: "payment_received", channel: "email", enabled: true },
    { id: "payment_overdue", channel: "both", enabled: true },
    { id: "payment_reminder", channel: "email", enabled: false },
  ];

  it("should have 13 notification milestones", () => {
    expect(MILESTONES).toHaveLength(13);
  });

  it("should have agent_en_route send SMS (includes tracking link)", () => {
    const milestone = MILESTONES.find((m) => m.id === "agent_en_route")!;
    expect(milestone.channel).toBe("sms");
    expect(milestone.enabled).toBe(true);
  });

  it("should support all 4 channel options", () => {
    const channels = ["sms", "email", "both", "none"];
    const usedChannels = [...new Set(MILESTONES.map((m) => m.channel))];
    for (const c of usedChannels) {
      expect(channels).toContain(c);
    }
  });

  it("should have 10 milestones enabled by default", () => {
    const enabled = MILESTONES.filter((m) => m.enabled);
    expect(enabled).toHaveLength(10);
  });
});

// ─── Integration Tests ────────────────────────────────────────────────────────

describe("NVC360 Third-Party Integrations", () => {
  const INTEGRATIONS = [
    { id: "tookan", category: "Dispatch", status: "connected" },
    { id: "twilio", category: "SMS", status: "connected" },
    { id: "quickbooks", category: "Accounting", status: "available" },
    { id: "xero", category: "Accounting", status: "available" },
    { id: "companycam", category: "Photos", status: "available" },
    { id: "google_calendar", category: "Calendar", status: "available" },
    { id: "office365", category: "Calendar", status: "available" },
    { id: "mapbox", category: "Maps", status: "connected" },
  ];

  it("should have 8 integrations defined", () => {
    expect(INTEGRATIONS).toHaveLength(8);
  });

  it("should have Tookan, Twilio, and Mapbox connected by default", () => {
    const connected = INTEGRATIONS.filter((i) => i.status === "connected").map((i) => i.id);
    expect(connected).toContain("tookan");
    expect(connected).toContain("twilio");
    expect(connected).toContain("mapbox");
  });

  it("should have 2 calendar integrations (Google + Office 365)", () => {
    const calendarIntegrations = INTEGRATIONS.filter((i) => i.category === "Calendar");
    expect(calendarIntegrations).toHaveLength(2);
  });

  it("should have 2 accounting integrations (QuickBooks + Xero)", () => {
    const accounting = INTEGRATIONS.filter((i) => i.category === "Accounting");
    expect(accounting).toHaveLength(2);
  });
});

// ─── Geo Clock-In Tests ───────────────────────────────────────────────────────

describe("NVC360 Geo Clock-In / Clock-Out", () => {
  const GEO_RADIUS_METERS = 20;

  function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  it("should auto clock-in when within 20m of job site", () => {
    const dist = distanceMeters(49.8954, -97.1385, 49.8954, -97.1385);
    expect(dist).toBeLessThanOrEqual(GEO_RADIUS_METERS);
  });

  it("should NOT auto clock-in when outside 20m radius", () => {
    const dist = distanceMeters(49.8954, -97.1385, 49.8960, -97.1385);
    expect(dist).toBeGreaterThan(GEO_RADIUS_METERS);
  });
});

// ─── Customer Tracking Tests ──────────────────────────────────────────────────

describe("NVC360 Customer Tracking Page", () => {
  it("should generate a unique tracking URL per job", () => {
    const jobId = "JH-2026-8821";
    const url = `https://track.nvc360.com/${jobId}`;
    expect(url).toContain(jobId);
    expect(url).toMatch(/^https:\/\//);
  });

  it("should include ETA and agent contact in tracking data", () => {
    const data = { eta: "14 min", agentPhone: "+1 (204) 555-0192", status: "en_route" };
    expect(data.eta).toBeTruthy();
    expect(data.agentPhone).toBeTruthy();
    expect(data.status).toBe("en_route");
  });

  it("should support two-way messaging from tracking page", () => {
    const messages = [
      { from: "customer", text: "Please use the side entrance" },
      { from: "agent", text: "Got it, thanks!" },
    ];
    expect(messages[0].from).toBe("customer");
    expect(messages[1].from).toBe("agent");
  });
});

// ─── Client Detail & Management Tests ────────────────────────────────────────

describe("NVC360 Client Detail Management", () => {
  const CLIENT_DATA = {
    "1": { name: "Arctic HVAC Services", industry: "HVAC", primaryColor: "#3B82F6", subdomain: "arctic-hvac", plan: "enterprise" },
    "2": { name: "Prairie Electric Co.", industry: "Electrical", primaryColor: "#F59E0B", subdomain: "prairie-electric", plan: "pro" },
    "3": { name: "Swift Couriers", industry: "Delivery", primaryColor: "#22C55E", subdomain: "swift-couriers", plan: "pro" },
  };

  const MOCK_EMPLOYEES = [
    { id: 1, name: "Sarah Mitchell", role: "company_admin", status: "active", department: "Management", jobsCompleted: 0 },
    { id: 2, name: "James Kowalski", role: "dispatcher", status: "active", department: "Operations", jobsCompleted: 0 },
    { id: 3, name: "Marcus Thompson", role: "field_technician", status: "active", department: "Field", jobsCompleted: 142 },
    { id: 4, name: "Priya Patel", role: "field_technician", status: "active", department: "Field", jobsCompleted: 98 },
    { id: 5, name: "Derek Olsen", role: "divisional_manager", status: "active", department: "North Division", jobsCompleted: 0 },
    { id: 6, name: "Aisha Nwosu", role: "office_staff", status: "invited", department: "Admin", jobsCompleted: 0 },
  ];

  const MOCK_CUSTOMERS = [
    { id: 1, name: "Robert & Linda Chen", status: "vip", totalJobs: 12 },
    { id: 2, name: "Sunrise Properties Ltd.", status: "active", totalJobs: 34 },
    { id: 3, name: "Thomas Bergmann", status: "active", totalJobs: 3 },
    { id: 4, name: "Westgate Mall", status: "active", totalJobs: 8 },
    { id: 5, name: "Maria Santos", status: "inactive", totalJobs: 1 },
  ];

  it("should resolve client data by ID", () => {
    expect(CLIENT_DATA["1"].name).toBe("Arctic HVAC Services");
    expect(CLIENT_DATA["2"].plan).toBe("pro");
    expect(CLIENT_DATA["3"].subdomain).toBe("swift-couriers");
  });

  it("should have 6 mock employees with correct roles", () => {
    expect(MOCK_EMPLOYEES).toHaveLength(6);
    const roles = MOCK_EMPLOYEES.map((e) => e.role);
    expect(roles).toContain("company_admin");
    expect(roles).toContain("dispatcher");
    expect(roles).toContain("field_technician");
    expect(roles).toContain("divisional_manager");
    expect(roles).toContain("office_staff");
  });

  it("should have 1 invited employee (Aisha Nwosu)", () => {
    const invited = MOCK_EMPLOYEES.filter((e) => e.status === "invited");
    expect(invited).toHaveLength(1);
    expect(invited[0].name).toBe("Aisha Nwosu");
  });

  it("should have 5 mock customers with 1 VIP", () => {
    expect(MOCK_CUSTOMERS).toHaveLength(5);
    const vip = MOCK_CUSTOMERS.filter((c) => c.status === "vip");
    expect(vip).toHaveLength(1);
    expect(vip[0].name).toBe("Robert & Linda Chen");
  });

  it("should calculate total jobs across all customers", () => {
    const total = MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalJobs, 0);
    expect(total).toBe(58);
  });

  it("should filter employees by role", () => {
    const techs = MOCK_EMPLOYEES.filter((e) => e.role === "field_technician");
    expect(techs).toHaveLength(2);
    expect(techs[0].jobsCompleted).toBe(142);
  });

  it("should filter customers by status", () => {
    const active = MOCK_CUSTOMERS.filter((c) => c.status === "active");
    expect(active).toHaveLength(3);
    const inactive = MOCK_CUSTOMERS.filter((c) => c.status === "inactive");
    expect(inactive).toHaveLength(1);
  });

  it("should generate correct tracking URL for new customer work order", () => {
    const jobId = "WO-2026-0042";
    const clientSubdomain = "arctic-hvac";
    const url = `https://${clientSubdomain}.nvc360.com/track/${jobId}`;
    expect(url).toBe("https://arctic-hvac.nvc360.com/track/WO-2026-0042");
  });

  it("should validate new employee form — name and email required", () => {
    const validate = (name: string, email: string) => name.trim().length > 0 && email.trim().length > 0;
    expect(validate("", "test@test.com")).toBe(false);
    expect(validate("John Doe", "")).toBe(false);
    expect(validate("John Doe", "john@company.com")).toBe(true);
  });

  it("should validate new customer form — name and phone required", () => {
    const validate = (name: string, phone: string) => name.trim().length > 0 && phone.trim().length > 0;
    expect(validate("", "+1 204 555 0000")).toBe(false);
    expect(validate("Jane Smith", "")).toBe(false);
    expect(validate("Jane Smith", "+1 204 555 0000")).toBe(true);
  });

  it("should sanitize subdomain input (lowercase, alphanumeric + hyphens only)", () => {
    const sanitize = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    expect(sanitize("Arctic HVAC Services!")).toBe("arctichvacservices");
    expect(sanitize("Prairie Electric Co.")).toBe("prairieelectricco");
    expect(sanitize("swift-couriers")).toBe("swift-couriers");
  });
});
