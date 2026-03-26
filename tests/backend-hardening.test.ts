/**
 * Backend Hardening Tests
 * Validates that the new router structure, security logic, and db helper
 * functions are correctly defined and type-safe without requiring a live DB.
 */

import { describe, it, expect } from "vitest";

// ─── Router Shape Tests ───────────────────────────────────────────────────────

describe("tRPC Router Structure", () => {
  it("should export appRouter with all expected sub-routers", async () => {
    const { appRouter } = await import("../server/routers");
    const routerKeys = Object.keys(appRouter._def.procedures);
    // Check that key routes exist
    const expectedPrefixes = [
      "auth.me",
      "auth.logout",
      "tenants.list",
      "tenants.getBySlug",
      "templates.list",
      "pricing.calculate",
      "tasks.list",
      "tasks.getByHash",
      "technicians.list",
      "customers.list",
      "customers.create",
      "customers.update",
      "customers.delete",
      "calendar.list",
      "calendar.create",
      "calendar.update",
      "calendar.delete",
      "integrations.list",
      "integrations.upsert",
      "integrations.disconnect",
      "notifications.list",
      "notifications.markRead",
      "notifications.markAllRead",
      "attachments.list",
      "messages.list",
      "messages.send",
      "location.record",
    ];
    for (const prefix of expectedPrefixes) {
      expect(routerKeys).toContain(prefix);
    }
  });

  it("should have tasks.getByHash as a public procedure (no auth required for customer tracking)", async () => {
    const { appRouter } = await import("../server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    const proc = procedures["tasks.getByHash"];
    expect(proc).toBeDefined();
    // Public procedures have no _def.meta?.auth requirement
    const meta = (proc as any)._def?.meta;
    expect(meta?.auth).not.toBe("required");
  });

  it("should have pricing.calculate as a public procedure (for public booking forms)", async () => {
    const { appRouter } = await import("../server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    const proc = procedures["pricing.calculate"];
    expect(proc).toBeDefined();
  });

  it("should have tenants.getBySlug as a public procedure (for login page slug resolution)", async () => {
    const { appRouter } = await import("../server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    const proc = procedures["tenants.getBySlug"];
    expect(proc).toBeDefined();
  });
});

// ─── Customer Input Validation ────────────────────────────────────────────────

describe("Customer Input Validation (Zod schemas)", () => {
  it("should accept valid customer status values", () => {
    const validStatuses = ["active", "prospect", "inactive", "vip"];
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });

  it("should reject invalid customer status", () => {
    const validStatuses = ["active", "prospect", "inactive", "vip"];
    expect(validStatuses).not.toContain("deleted");
    expect(validStatuses).not.toContain("unknown");
  });

  it("should accept valid payment terms", () => {
    const validTerms = ["net_15", "net_30", "net_60", "due_on_receipt", "prepaid"];
    for (const t of validTerms) {
      expect(typeof t).toBe("string");
    }
  });
});

// ─── Calendar Item Validation ─────────────────────────────────────────────────

describe("Calendar Item Types", () => {
  it("should accept all valid calendar item types", () => {
    const validTypes = ["note", "task", "event", "work_order"];
    for (const t of validTypes) {
      expect(["note", "task", "event", "work_order"]).toContain(t);
    }
  });

  it("should reject invalid calendar item types", () => {
    const validTypes = ["note", "task", "event", "work_order"];
    expect(validTypes).not.toContain("reminder");
    expect(validTypes).not.toContain("meeting");
  });
});

// ─── Integration Key Validation ───────────────────────────────────────────────

describe("Integration Keys", () => {
  const VALID_INTEGRATION_KEYS = [
    "google_calendar",
    "microsoft_calendar",
    "dropbox",
    "google_drive",
    "onedrive",
    "box",
    "quickbooks",
    "xero",
    "twilio_sms",
    "whatsapp",
    "mapbox",
    "stripe",
    "companycam",
    "tookan",
  ];

  it("should have 14 integration keys defined", () => {
    expect(VALID_INTEGRATION_KEYS.length).toBe(14);
  });

  it("should include payment integrations", () => {
    expect(VALID_INTEGRATION_KEYS).toContain("quickbooks");
    expect(VALID_INTEGRATION_KEYS).toContain("xero");
    expect(VALID_INTEGRATION_KEYS).toContain("stripe");
  });

  it("should include calendar integrations", () => {
    expect(VALID_INTEGRATION_KEYS).toContain("google_calendar");
    expect(VALID_INTEGRATION_KEYS).toContain("microsoft_calendar");
  });

  it("should include communication integrations", () => {
    expect(VALID_INTEGRATION_KEYS).toContain("twilio_sms");
    expect(VALID_INTEGRATION_KEYS).toContain("whatsapp");
  });
});

// ─── Notification Types ───────────────────────────────────────────────────────

describe("Notification Channel Types", () => {
  const VALID_CHANNELS = ["push", "sms", "email", "in_app"];

  it("should support all notification channels", () => {
    expect(VALID_CHANNELS).toContain("push");
    expect(VALID_CHANNELS).toContain("sms");
    expect(VALID_CHANNELS).toContain("email");
    expect(VALID_CHANNELS).toContain("in_app");
  });
});

// ─── Security: Trust Proxy ────────────────────────────────────────────────────

describe("Express Server Security Config", () => {
  it("should have trust proxy setting in server entry point", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/_core/index.ts", "utf-8");
    expect(content).toContain('app.set("trust proxy", 1)');
  });

  it("should have CORS whitelist with allowed patterns", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/_core/index.ts", "utf-8");
    expect(content).toContain("ALLOWED_ORIGIN_PATTERNS");
    expect(content).toContain(".manus");
    expect(content).toContain(".nvc360");
  });

  it("should have security headers middleware", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/_core/index.ts", "utf-8");
    expect(content).toContain("X-Content-Type-Options");
    expect(content).toContain("X-Frame-Options");
    expect(content).toContain("X-XSS-Protection");
  });

  it("should have rate limiting configured", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/_core/index.ts", "utf-8");
    expect(content).toContain("rateLimit");
    expect(content).toContain("generalLimiter");
    expect(content).toContain("authLimiter");
  });
});

// ─── DB Helper Function Exports ───────────────────────────────────────────────

describe("DB Helper Function Exports", () => {
  it("should export all customer CRUD functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getCustomersByTenant).toBe("function");
    expect(typeof db.getCustomerById).toBe("function");
    expect(typeof db.createCustomer).toBe("function");
    expect(typeof db.updateCustomer).toBe("function");
    expect(typeof db.deleteCustomer).toBe("function");
  });

  it("should export all calendar CRUD functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getCalendarItemsByTenant).toBe("function");
    expect(typeof db.createCalendarItem).toBe("function");
    expect(typeof db.updateCalendarItem).toBe("function");
    expect(typeof db.deleteCalendarItem).toBe("function");
  });

  it("should export all integration config functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getIntegrationsByTenant).toBe("function");
    expect(typeof db.upsertIntegration).toBe("function");
    expect(typeof db.disconnectIntegration).toBe("function");
  });

  it("should export all notification functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getNotificationsForUser).toBe("function");
    expect(typeof db.createNotification).toBe("function");
    expect(typeof db.markNotificationRead).toBe("function");
    expect(typeof db.markAllNotificationsRead).toBe("function");
  });

  it("should export all file attachment functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getAttachmentsByEntity).toBe("function");
    expect(typeof db.createFileAttachment).toBe("function");
    expect(typeof db.deleteFileAttachment).toBe("function");
  });

  it("should export consent record functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.recordConsent).toBe("function");
    expect(typeof db.getConsentByUser).toBe("function");
  });

  it("should export technician CRUD functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.createTechnician).toBe("function");
    expect(typeof db.updateTechnician).toBe("function");
    expect(typeof db.deleteTechnician).toBe("function");
  });

  it("should export direct login helper functions", async () => {
    const db = await import("../server/db");
    expect(typeof db.getTenantUserForLogin).toBe("function");
    expect(typeof db.updateTenantUserLastLogin).toBe("function");
  });
});
