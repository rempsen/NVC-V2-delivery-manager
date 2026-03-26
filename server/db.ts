import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ─── NVC360 Multi-Tenant Queries ──────────────────────────────────────────────
import { and, desc, isNull } from "drizzle-orm";
import {
  tenants,
  tenantUsers,
  technicians,
  workflowTemplates,
  pricingRules,
  tasks,
  messages,
  locationHistory,
  taskAuditLog,
  type InsertTenant,
  type InsertTenantUser,
  type InsertTechnician,
  type InsertWorkflowTemplate,
  type InsertPricingRule,
  type InsertTask,
  type InsertMessage,
  type InsertLocationHistory,
} from "../drizzle/schema";

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenants).values(data);
  return result[0].insertId;
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenants).set(data).where(eq(tenants.id, id));
}

// ─── Tenant Users ─────────────────────────────────────────────────────────────

export async function getTenantUsersByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
}

export async function getTenantUserByEmail(email: string, tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(tenantUsers)
    .where(and(eq(tenantUsers.email, email), eq(tenantUsers.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTenantUser(data: InsertTenantUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenantUsers).values(data);
  return result[0].insertId;
}

// ─── Technicians ──────────────────────────────────────────────────────────────

export async function getTechniciansByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ tech: technicians, user: tenantUsers })
    .from(technicians)
    .leftJoin(tenantUsers, eq(technicians.tenantUserId, tenantUsers.id))
    .where(eq(technicians.tenantId, tenantId));
}

export async function getTechnicianById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateTechnicianLocation(
  id: number,
  lat: string,
  lng: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(technicians)
    .set({ latitude: lat, longitude: lng, lastLocationAt: new Date() })
    .where(eq(technicians.id, id));
}

export async function updateTechnicianStatus(
  id: number,
  status: "online" | "busy" | "on_break" | "offline",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(technicians).set({ status }).where(eq(technicians.id, id));
}

// ─── Workflow Templates ───────────────────────────────────────────────────────

export async function getTemplatesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workflowTemplates)
    .where(and(eq(workflowTemplates.tenantId, tenantId), eq(workflowTemplates.isActive, true)));
}

export async function createTemplate(data: InsertWorkflowTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowTemplates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, data: Partial<InsertWorkflowTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowTemplates).set(data).where(eq(workflowTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowTemplates).set({ isActive: false }).where(eq(workflowTemplates.id, id));
}

// ─── Pricing Rules ────────────────────────────────────────────────────────────

export async function getPricingRulesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingRules).where(eq(pricingRules.tenantId, tenantId));
}

export async function createPricingRule(data: InsertPricingRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricingRules).values(data);
  return result[0].insertId;
}

export async function updatePricingRule(id: number, data: Partial<InsertPricingRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricingRules).set(data).where(eq(pricingRules.id, id));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasksByTenant(tenantId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.tenantId, tenantId)];
  if (status) conditions.push(eq(tasks.status, status as any));
  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));
}

export async function getTaskById_NVC(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTaskByHash(jobHash: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(tasks).where(eq(tasks.jobHash, jobHash)).limit(1);
  return rows[0] ?? null;
}

export async function createTaskRecord(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return result[0].insertId;
}

export async function updateTaskRecord(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function updateTaskStatusRecord(
  id: number,
  status: "unassigned" | "assigned" | "en_route" | "on_site" | "completed" | "failed" | "cancelled",
  extra?: Partial<InsertTask>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: Partial<InsertTask> = { status, ...extra };
  if (status === "en_route") updates.dispatchedAt = new Date();
  if (status === "on_site") updates.startedAt = new Date();
  if (status === "completed" || status === "failed") updates.completedAt = new Date();
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
}

export async function geoClockIn(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set({ geoClockIn: new Date(), status: "on_site" }).where(eq(tasks.id, taskId));
}

export async function geoClockOut(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const task = await getTaskById_NVC(taskId);
  if (!task?.geoClockIn) return;
  const clockIn = new Date(task.geoClockIn).getTime();
  const timeOnSiteMin = Math.round((Date.now() - clockIn) / 60000);
  await db.update(tasks).set({ geoClockOut: new Date(), timeOnSiteMin }).where(eq(tasks.id, taskId));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesByTask(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.taskId, taskId)).orderBy(messages.createdAt);
}

export async function sendMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return result[0].insertId;
}

export async function markMessagesRead(taskId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.taskId, taskId), isNull(messages.readAt)));
}

// ─── Location History ─────────────────────────────────────────────────────────

export async function recordLocation(data: InsertLocationHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(locationHistory).values(data);
}

export async function getLocationHistoryForTask(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locationHistory).where(eq(locationHistory.taskId, taskId)).orderBy(locationHistory.recordedAt);
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function logTaskAction(
  tenantId: number,
  taskId: number,
  action: string,
  actorId?: number,
  actorType?: "dispatcher" | "technician" | "system" | "customer",
  previousValue?: unknown,
  newValue?: unknown,
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(taskAuditLog).values({ tenantId, taskId, actorId, actorType, action, previousValue, newValue });
}

// ─── Pricing Calculator ───────────────────────────────────────────────────────

export function calculatePrice(
  rule: {
    model: string;
    flatRateCents?: number | null;
    hourlyBaseRateCents?: number | null;
    hourlyBaseMinutes?: number | null;
    hourlyOvertimeRateCents?: number | null;
    perKmRateCents?: number | null;
    freeRadiusKm?: string | null;
  },
  timeOnSiteMin: number,
  distanceKm: number,
): { totalCents: number; breakdown: Record<string, number> } {
  if (rule.model === "flat_rate") {
    return { totalCents: rule.flatRateCents ?? 0, breakdown: { flatRate: rule.flatRateCents ?? 0 } };
  }
  if (rule.model === "hourly") {
    const baseRate = rule.hourlyBaseRateCents ?? 0;
    const baseMin = rule.hourlyBaseMinutes ?? 60;
    const overtimeRate = rule.hourlyOvertimeRateCents ?? 0;
    const overtimeMin = Math.max(0, timeOnSiteMin - baseMin);
    const overtimeCents = Math.round((overtimeMin / 60) * overtimeRate);
    return { totalCents: baseRate + overtimeCents, breakdown: { baseRate, overtime: overtimeCents } };
  }
  if (rule.model === "per_km") {
    const freeKm = parseFloat(rule.freeRadiusKm ?? "0");
    const chargeableKm = Math.max(0, distanceKm - freeKm);
    const kmCharge = Math.round(chargeableKm * (rule.perKmRateCents ?? 0));
    return { totalCents: kmCharge, breakdown: { distanceKm, freeKm, chargeableKm, kmCharge } };
  }
  return { totalCents: 0, breakdown: {} };
}
