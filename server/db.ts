import { eq, and, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  tenants, InsertTenant,
  tenantUsers, InsertTenantUser,
  technicians, InsertTechnician,
  workflowTemplates, InsertWorkflowTemplate,
  pricingRules, InsertPricingRule,
  tasks, InsertTask,
  messages, InsertMessage,
  locationHistory, InsertLocationHistory,
  taskAuditLog,
  customers, InsertCustomer,
  calendarItems, InsertCalendarItem,
  integrationConfigs, InsertIntegrationConfig,
  fileAttachments, InsertFileAttachment,
  notifications, InsertNotification,
  consentRecords, InsertConsentRecord,
  taskChecklists, InsertTaskChecklist,
  checklistItems, InsertChecklistItem,
  auditLogs, InsertAuditLog,
} from "../drizzle/schema";
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

    // Handle tenantId (nullable integer)
    if (user.tenantId !== undefined) {
      values.tenantId = user.tenantId;
      updateSet.tenantId = user.tenantId;
    }

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

// ─── NVC360 Multi-Tenant Queries ──────────────────────────────────────────────

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function getAllTenants() {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
  return db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
}

export async function getTenantUserByEmail(email: string, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db
    .select()
    .from(tenantUsers)
    .where(and(eq(tenantUsers.email, email), eq(tenantUsers.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Find a tenantUser by email across all tenants — used for login when tenant slug is not provided */
export async function getTenantUserByEmailAnyTenant(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db
    .select()
    .from(tenantUsers)
    .where(eq(tenantUsers.email, email))
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
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select({ tech: technicians, user: tenantUsers })
    .from(technicians)
    .leftJoin(tenantUsers, eq(technicians.tenantUserId, tenantUsers.id))
    .where(eq(technicians.tenantId, tenantId));
}

export async function getTechnicianByTenantUserId(tenantUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db.select().from(technicians).where(eq(technicians.tenantUserId, tenantUserId)).limit(1);
  return rows[0] ?? null;
}

export async function getTechnicianById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTaskByHash(jobHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db.select().from(tasks).where(eq(tasks.jobHash, jobHash)).limit(1);
  const task = rows[0] ?? null;
  if (!task) return null;

  // Enrich with technician + tenant data for the customer tracking page
  let techData: {
    techName: string;
    techPhone: string | null;
    techLat: string | null;
    techLng: string | null;
    techPhotoUrl: string | null;
    techTransportType: string;
  } | null = null;

  if (task.technicianId) {
    const techRows = await db
      .select({
        techId: technicians.id,
        techLat: technicians.latitude,
        techLng: technicians.longitude,
        techPhotoUrl: technicians.photoUrl,
        techTransportType: technicians.transportType,
        userName: tenantUsers.name,
        userPhone: tenantUsers.phone,
      })
      .from(technicians)
      .leftJoin(tenantUsers, eq(technicians.tenantUserId, tenantUsers.id))
      .where(eq(technicians.id, task.technicianId))
      .limit(1);
    const t = techRows[0];
    if (t) {
      techData = {
        techName: t.userName ?? "Technician",
        techPhone: t.userPhone ?? null,
        techLat: t.techLat ?? null,
        techLng: t.techLng ?? null,
        techPhotoUrl: t.techPhotoUrl ?? null,
        techTransportType: t.techTransportType ?? "car",
      };
    }
  }

  // Enrich with tenant branding
  let tenantData: {
    companyName: string;
    companyColor: string;
    companyLogo: string | null;
  } | null = null;

  if (task.tenantId) {
    const tenantRows = await db
      .select({ tenantName: tenants.companyName, branding: tenants.branding })
      .from(tenants)
      .where(eq(tenants.id, task.tenantId))
      .limit(1);
    const ten = tenantRows[0];
    if (ten) {
      let branding: { primaryColor?: string; logoUrl?: string } = {};
      try {
        const raw = ten.branding;
        if (typeof raw === "string") branding = JSON.parse(raw);
        else if (raw && typeof raw === "object") branding = raw as typeof branding;
      } catch { /* ignore */ }
      tenantData = {
        companyName: ten.tenantName,
        companyColor: branding.primaryColor ?? "#1E6FBF",
        companyLogo: branding.logoUrl ?? null,
      };
    }
  }

  return { ...task, ...techData, ...tenantData };
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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
  if (!db) throw new Error("Database connection unavailable");
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

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomersByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select()
    .from(customers)
    .where(eq(customers.tenantId, tenantId))
    .orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, tenantId: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
}

export async function deleteCustomer(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
}

// ─── Calendar Items ───────────────────────────────────────────────────────────

export async function getCalendarItemsByTenant(tenantId: number, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const conditions = [eq(calendarItems.tenantId, tenantId)];
  return db
    .select()
    .from(calendarItems)
    .where(and(...conditions))
    .orderBy(calendarItems.date, calendarItems.time);
}

export async function createCalendarItem(data: InsertCalendarItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarItems).values(data);
  return result[0].insertId;
}

export async function updateCalendarItem(id: number, tenantId: number, data: Partial<InsertCalendarItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(calendarItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.tenantId, tenantId)));
}

export async function deleteCalendarItem(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarItems).where(and(eq(calendarItems.id, id), eq(calendarItems.tenantId, tenantId)));
}

// ─── Integration Configs ──────────────────────────────────────────────────────

export async function getIntegrationsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db.select().from(integrationConfigs).where(eq(integrationConfigs.tenantId, tenantId));
}

export async function upsertIntegration(tenantId: number, integrationKey: string, data: Partial<InsertIntegrationConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(integrationConfigs)
    .where(and(eq(integrationConfigs.tenantId, tenantId), eq(integrationConfigs.integrationKey, integrationKey)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(integrationConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(integrationConfigs.tenantId, tenantId), eq(integrationConfigs.integrationKey, integrationKey)));
  } else {
    await db.insert(integrationConfigs).values({ tenantId, integrationKey, ...data } as InsertIntegrationConfig);
  }
}

export async function disconnectIntegration(tenantId: number, integrationKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(integrationConfigs)
    .set({ isConnected: false, accessToken: null, refreshToken: null, tokenExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(integrationConfigs.tenantId, tenantId), eq(integrationConfigs.integrationKey, integrationKey)));
}

// ─── File Attachments ─────────────────────────────────────────────────────────

export async function getAttachmentsByEntity(tenantId: number, entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select()
    .from(fileAttachments)
    .where(
      and(
        eq(fileAttachments.tenantId, tenantId),
        eq(fileAttachments.entityType, entityType as any),
        eq(fileAttachments.entityId, entityId),
      ),
    )
    .orderBy(desc(fileAttachments.createdAt));
}

export async function createFileAttachment(data: InsertFileAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fileAttachments).values(data);
  return result[0].insertId;
}

export async function deleteFileAttachment(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fileAttachments).where(and(eq(fileAttachments.id, id), eq(fileAttachments.tenantId, tenantId)));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotificationsForUser(tenantId: number, userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.recipientUserId, userId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Fetch last N dispatch (job_assigned) notifications for a tenant — used by the history panel */
export async function getDispatchHistory(tenantId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.type, "job_assigned")))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientUserId, userId)));
}

export async function markAllNotificationsRead(tenantId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.recipientUserId, userId), isNull(notifications.readAt)));
}

// ─── Consent Records (PIPEDA) ─────────────────────────────────────────────────

export async function recordConsent(data: InsertConsentRecord) {
  const db = await getDb();
  if (!db) return;
  await db.insert(consentRecords).values(data);
}

export async function getConsentByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, userId))
    .orderBy(desc(consentRecords.consentAt))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Direct Login (email/password for tenant users) ───────────────────────────

export async function getTenantUserForLogin(email: string, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const rows = await db
    .select()
    .from(tenantUsers)
    .where(and(eq(tenantUsers.email, email), eq(tenantUsers.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateTenantUserLastLogin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  await db.update(tenantUsers).set({ updatedAt: new Date() }).where(eq(tenantUsers.id, id));
}

// ─── Technician CRUD (full profile) ──────────────────────────────────────────

export async function createTechnician(data: InsertTechnician) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(technicians).values(data);
  return result[0].insertId;
}

export async function updateTechnician(id: number, tenantId: number, data: Partial<InsertTechnician>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(technicians)
    .set(data)
    .where(and(eq(technicians.id, id), eq(technicians.tenantId, tenantId)));
}

export async function deleteTechnician(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(technicians).where(and(eq(technicians.id, id), eq(technicians.tenantId, tenantId)));
}

// ─── Task Checklists ──────────────────────────────────────────────────────────

export async function getChecklistsByTask(taskId: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  return db
    .select()
    .from(taskChecklists)
    .where(and(eq(taskChecklists.taskId, taskId), eq(taskChecklists.tenantId, tenantId)));
}

export async function getChecklistWithItems(checklistId: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const [checklist] = await db
    .select()
    .from(taskChecklists)
    .where(and(eq(taskChecklists.id, checklistId), eq(taskChecklists.tenantId, tenantId)));
  if (!checklist) return null;
  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(checklistItems.sortOrder);
  return { ...checklist, items };
}

export async function createChecklist(data: InsertTaskChecklist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(taskChecklists).values(data);
  return result;
}

export async function addChecklistItems(items: InsertChecklistItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(checklistItems).values(items);
}

export async function toggleChecklistItem(
  itemId: number,
  tenantId: number,
  checked: boolean,
  userId?: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(checklistItems)
    .set({
      isChecked: checked,
      checkedAt: checked ? new Date() : null,
      checkedByUserId: checked ? (userId ?? null) : null,
    })
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.tenantId, tenantId)));
}

export async function updateChecklistItemNote(itemId: number, tenantId: number, note: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(checklistItems)
    .set({ note })
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.tenantId, tenantId)));
}

export async function completeChecklist(
  checklistId: number,
  tenantId: number,
  data: {
    signatureUrl?: string;
    signedByName?: string;
    paymentAuthorized?: boolean;
    paymentAmountCents?: number;
    paymentMethod?: string;
    completedByUserId?: number;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(taskChecklists)
    .set({
      isCompleted: true,
      completedAt: new Date(),
      completedByUserId: data.completedByUserId ?? null,
      signatureUrl: data.signatureUrl ?? null,
      signedAt: data.signatureUrl ? new Date() : null,
      signedByName: data.signedByName ?? null,
      paymentAuthorized: data.paymentAuthorized ?? false,
      paymentAmountCents: data.paymentAmountCents ?? null,
      paymentMethod: data.paymentMethod ?? null,
      paymentAuthorizedAt: data.paymentAuthorized ? new Date() : null,
    })
    .where(and(eq(taskChecklists.id, checklistId), eq(taskChecklists.tenantId, tenantId)));
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  tenantId?: number | null;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  if (!db) return; // Non-fatal — don't block the main action
  try {
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId ?? null,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId != null ? String(entry.targetId) : null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    // Audit log failures must never crash the main request
    console.warn("[audit] Failed to write audit log:", e);
  }
}

export async function getAuditLogs(opts: {
  tenantId?: number;
  actorId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const conditions = [];
  if (opts.tenantId != null) conditions.push(eq(auditLogs.tenantId, opts.tenantId));
  if (opts.actorId) conditions.push(eq(auditLogs.actorId, opts.actorId));
  if (opts.action) conditions.push(eq(auditLogs.action, opts.action));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countRows] = await Promise.all([
    db.select().from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    db.select({ count: auditLogs.id }).from(auditLogs).where(whereClause),
  ]);
  return { rows, total: countRows.length };
}

export async function getTenantStats(tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const [activeJobRows, userRows, techRows] = await Promise.all([
    db.select({ id: tasks.id }).from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        // Active = not completed, not cancelled, not failed
        // Use a raw SQL approach by checking multiple statuses
      )),
    db.select({ id: tenantUsers.id }).from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true))),
    db.select({ id: technicians.id }).from(technicians)
      .where(eq(technicians.tenantId, tenantId)),
  ]);
  // Count active jobs manually
  const activeStatuses = ["unassigned", "assigned", "en_route", "on_site"];
  const allJobs = await db.select({ id: tasks.id, status: tasks.status })
    .from(tasks).where(eq(tasks.tenantId, tenantId));
  const activeJobs = allJobs.filter(j => activeStatuses.includes(j.status)).length;
  return {
    activeJobs,
    totalUsers: userRows.length,
    totalTechnicians: techRows.length,
  };
}
