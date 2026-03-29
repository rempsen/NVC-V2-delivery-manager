import {
  boolean,
  decimal,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  foreignKey,
} from "drizzle-orm/mysql-core";

// ─── Core Auth ────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "nvc_manager", "merchant_manager", "agent", "user", "admin"]).default("agent").notNull(),
  /** Tenant this user belongs to. NULL = NVC platform staff (super_admin / nvc_manager). */
  tenantId: int("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Multi-Tenant: Client Companies ──────────────────────────────────────────

/**
 * Each row = one NVC360 B2B client (e.g., "Acme HVAC", "QuickFix IT")
 * Supports up to 20,000 tenants.
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  /** URL-safe slug used in subdomains / routing */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  industry: mysqlEnum("industry", [
    "hvac",
    "construction",
    "delivery",
    "home_repair",
    "it_repair",
    "telecom",
    "home_fitness",
    "elder_care",
    "electrical",
    "plumbing",
    "flooring",
    "other",
  ]).default("other").notNull(),
  plan: mysqlEnum("plan", ["starter", "professional", "enterprise"]).default("starter").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isNvcPlatform: boolean("isNvcPlatform").default(false).notNull(),
  suspended: boolean("suspended").default(false).notNull(),
  /** White-label branding: { logoUrl, primaryColor, accentColor, companyName, tagline } */
  branding: json("branding"),
  /** SMS sender name shown to customers (e.g., "Acme HVAC") */
  smsSenderName: varchar("smsSenderName", { length: 64 }),
  /** Email domain for outbound notifications (e.g., "acmehvac.com") */
  emailDomain: varchar("emailDomain", { length: 255 }),
  /** NVC360 / Tookan API key for this tenant */
  nvc360ApiKey: varchar("tookanApiKey", { length: 255 }),
  /** Twilio credentials for SMS */
  twilioAccountSid: varchar("twilioAccountSid", { length: 64 }),
  twilioAuthToken: varchar("twilioAuthToken", { length: 64 }),
  twilioPhoneNumber: varchar("twilioPhoneNumber", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── Tenant Users (Dispatchers + Technicians) ─────────────────────────────────

export const tenantUsers = mysqlTable("tenantUsers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  /** Link to core users table if using OAuth */
  userId: int("userId"),
  role: mysqlEnum("role", ["dispatcher", "technician", "manager", "admin"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  /** Hashed password for direct login */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Google OAuth subject identifier (sub) — set on first Google sign-in, stable even if email changes */
  googleId: varchar("googleId", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = typeof tenantUsers.$inferInsert;

// ─── Technicians (extended profile) ──────────────────────────────────────────

export const technicians = mysqlTable("technicians", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  tenantUserId: int("tenantUserId").notNull().references(() => tenantUsers.id),
  status: mysqlEnum("status", ["online", "busy", "on_break", "offline"]).default("offline").notNull(),
  /** Current GPS position */
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  lastLocationAt: timestamp("lastLocationAt"),
  transportType: mysqlEnum("transportType", ["car", "van", "truck", "bike", "foot"]).default("car").notNull(),
  /** Skills / certifications: JSON array of strings */
  skills: json("skills"),
  /** Hourly rate in cents */
  hourlyRateCents: int("hourlyRateCents").default(0),
  /** Profile photo URL */
  photoUrl: varchar("photoUrl", { length: 500 }),
  /** Push notification token */
  pushToken: varchar("pushToken", { length: 255 }),
  /** Geo-clock: shift start */
  clockInAt: timestamp("clockInAt"),
  clockInLat: decimal("clockInLat", { precision: 10, scale: 7 }),
  clockInLng: decimal("clockInLng", { precision: 10, scale: 7 }),
  /** Geo-clock: shift end */
  clockOutAt: timestamp("clockOutAt"),
  clockOutLat: decimal("clockOutLat", { precision: 10, scale: 7 }),
  clockOutLng: decimal("clockOutLng", { precision: 10, scale: 7 }),
  /** Total minutes worked today (computed on clock-out) */
  todayMinutesWorked: int("todayMinutesWorked").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = typeof technicians.$inferInsert;

// ─── Workflow Templates ───────────────────────────────────────────────────────

/**
 * Customizable work order templates per tenant.
 * fields: JSON array of { id, type, label, required, options? }
 */
export const workflowTemplates = mysqlTable("workflowTemplates", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 64 }),
  description: text("description"),
  /** JSON: Array<{ id: string, type: 'text'|'number'|'dropdown'|'checklist'|'photo'|'date'|'signature', label: string, required: boolean, options?: string[] }> */
  fields: json("fields").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert;

// ─── Pricing Rules ────────────────────────────────────────────────────────────

export const pricingRules = mysqlTable("pricingRules", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  model: mysqlEnum("model", ["flat_rate", "hourly", "per_km", "custom"]).notNull(),
  /** Flat rate: price per job in cents */
  flatRateCents: int("flatRateCents"),
  /** Hourly: base rate for first N minutes */
  hourlyBaseRateCents: int("hourlyBaseRateCents"),
  /** Hourly: minutes included in base rate */
  hourlyBaseMinutes: int("hourlyBaseMinutes").default(60),
  /** Hourly: overtime rate per minute in cents */
  hourlyOvertimeRateCents: int("hourlyOvertimeRateCents"),
  /** Per-km: free delivery radius in km */
  freeRadiusKm: decimal("freeRadiusKm", { precision: 6, scale: 2 }),
  /** Per-km: charge per km outside free radius in cents */
  perKmRateCents: int("perKmRateCents"),
  /** Custom rules: JSON array of rule objects */
  customRules: json("customRules"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

// ─── Tasks / Work Orders ──────────────────────────────────────────────────────

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  /** Unique public hash for customer tracking link */
  jobHash: varchar("jobHash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", [
    "unassigned",
    "assigned",
    "en_route",
    "on_site",
    "completed",
    "failed",
    "cancelled",
  ]).default("unassigned").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  templateId: int("templateId"),
  pricingRuleId: int("pricingRuleId"),
  technicianId: int("technicianId").references(() => technicians.id),
  /** Customer details */
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  /** Job site address */
  jobAddress: text("jobAddress").notNull(),
  jobLatitude: decimal("jobLatitude", { precision: 10, scale: 7 }),
  jobLongitude: decimal("jobLongitude", { precision: 10, scale: 7 }),
  /** Optional pickup address */
  pickupAddress: text("pickupAddress"),
  pickupLatitude: decimal("pickupLatitude", { precision: 10, scale: 7 }),
  pickupLongitude: decimal("pickupLongitude", { precision: 10, scale: 7 }),
  description: text("description"),
  orderRef: varchar("orderRef", { length: 128 }),
  /** Custom field values: JSON object keyed by field ID */
  customFields: json("customFields"),
  /** Pricing snapshot at time of completion */
  pricingSnapshot: json("pricingSnapshot"),
  /** Calculated total in cents */
  totalCents: int("totalCents"),
  /** Geo-clock: timestamp when tech entered 20m geofence */
  geoClockIn: timestamp("geoClockIn"),
  /** Geo-clock: timestamp when tech left 20m geofence */
  geoClockOut: timestamp("geoClockOut"),
  /** Total time on site in minutes */
  timeOnSiteMin: int("timeOnSiteMin"),
  /** Total distance traveled in km */
  distanceTraveledKm: decimal("distanceTraveledKm", { precision: 8, scale: 3 }),
  scheduledAt: timestamp("scheduledAt"),
  dispatchedAt: timestamp("dispatchedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  taskId: int("taskId").notNull().references(() => tasks.id),
  senderType: mysqlEnum("senderType", ["dispatcher", "technician", "system"]).notNull(),
  senderId: int("senderId"),
  senderName: varchar("senderName", { length: 255 }),
  content: text("content").notNull(),
  /** For future task / work order previews sent in chat */
  attachmentType: mysqlEnum("attachmentType", ["none", "task_preview", "file"]).default("none"),
  attachmentData: json("attachmentData"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Location History ─────────────────────────────────────────────────────────

export const locationHistory = mysqlTable("locationHistory", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  technicianId: int("technicianId").notNull(),
  taskId: int("taskId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: float("speed"),
  heading: float("heading"),
  accuracy: float("accuracy"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = typeof locationHistory.$inferInsert;

// ─── Task Audit Log ───────────────────────────────────────────────────────────

export const taskAuditLog = mysqlTable("taskAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  taskId: int("taskId").notNull(),
  actorId: int("actorId"),
  actorType: mysqlEnum("actorType", ["dispatcher", "technician", "system", "customer"]),
  action: varchar("action", { length: 128 }).notNull(),
  previousValue: json("previousValue"),
  newValue: json("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskAuditLog = typeof taskAuditLog.$inferSelect;

// ─── Customers (CRM) ──────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  company: varchar("company", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  mailingStreet: varchar("mailingStreet", { length: 255 }),
  mailingCity: varchar("mailingCity", { length: 128 }),
  mailingProvince: varchar("mailingProvince", { length: 64 }),
  mailingPostalCode: varchar("mailingPostalCode", { length: 20 }),
  mailingCountry: varchar("mailingCountry", { length: 64 }).default("Canada"),
  physicalStreet: varchar("physicalStreet", { length: 255 }),
  physicalCity: varchar("physicalCity", { length: 128 }),
  physicalProvince: varchar("physicalProvince", { length: 64 }),
  physicalPostalCode: varchar("physicalPostalCode", { length: 20 }),
  physicalCountry: varchar("physicalCountry", { length: 64 }).default("Canada"),
  sameAsMailing: boolean("sameAsMailing").default(false),
  industry: varchar("industry", { length: 64 }),
  status: mysqlEnum("status", ["active", "prospect", "inactive", "vip"]).default("prospect").notNull(),
  paymentTerms: varchar("paymentTerms", { length: 64 }).default("net_30"),
  creditLimit: int("creditLimit").default(0),
  taxExempt: boolean("taxExempt").default(false),
  taxNumber: varchar("taxNumber", { length: 64 }),
  tags: text("tags"),
  notes: text("notes"),
  totalRevenueCents: int("totalRevenueCents").default(0),
  jobCount: int("jobCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Calendar Items ───────────────────────────────────────────────────────────
export const calendarItems = mysqlTable("calendarItems", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  createdByUserId: int("createdByUserId"),
  type: mysqlEnum("type", ["note", "task", "event", "work_order"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 10 }).notNull(),
  time: varchar("time", { length: 5 }),
  endTime: varchar("endTime", { length: 5 }),
  taskId: int("taskId"),
  color: varchar("color", { length: 7 }),
  isCompleted: boolean("isCompleted").default(false),
  externalEventId: varchar("externalEventId", { length: 255 }),
  externalCalendarType: mysqlEnum("externalCalendarType", ["google", "microsoft"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CalendarItem = typeof calendarItems.$inferSelect;
export type InsertCalendarItem = typeof calendarItems.$inferInsert;

// ─── Integration Configs ──────────────────────────────────────────────────────
export const integrationConfigs = mysqlTable("integrationConfigs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  integrationKey: varchar("integrationKey", { length: 64 }).notNull(),
  isConnected: boolean("isConnected").default(false).notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  config: json("config"),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = typeof integrationConfigs.$inferInsert;

// ─── File Attachments ─────────────────────────────────────────────────────────
export const fileAttachments = mysqlTable("fileAttachments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  entityType: mysqlEnum("entityType", ["task", "customer", "technician", "message"]).notNull(),
  entityId: int("entityId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 128 }),
  url: varchar("url", { length: 1000 }).notNull(),
  storageProvider: varchar("storageProvider", { length: 32 }).default("s3"),
  externalFileId: varchar("externalFileId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FileAttachment = typeof fileAttachments.$inferSelect;
export type InsertFileAttachment = typeof fileAttachments.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  recipientUserId: int("recipientUserId").notNull(),
  type: mysqlEnum("type", [
    "job_assigned",
    "job_updated",
    "job_completed",
    "message_received",
    "alert",
    "system",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  deepLink: varchar("deepLink", { length: 500 }),
  entityType: mysqlEnum("entityType", ["task", "message", "technician", "customer"]),
  entityId: int("entityId"),
  pushStatus: mysqlEnum("pushStatus", ["pending", "sent", "failed", "not_applicable"]).default("pending"),
  pushToken: varchar("pushToken", { length: 255 }),
  readAt: timestamp("readAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Consent Records (PIPEDA compliance) ─────────────────────────────────────
export const consentRecords = mysqlTable("consentRecords", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  policyVersion: varchar("policyVersion", { length: 16 }).notNull(),
  consentGiven: boolean("consentGiven").default(false).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
});
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = typeof consentRecords.$inferInsert;

// ─── Task Checklists ──────────────────────────────────────────────────────────
/**
 * A checklist template attached to a task (work order).
 * One task can have multiple checklists (e.g., Pre-Work, During, Post-Work).
 */
export const taskChecklists = mysqlTable("taskChecklists", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  taskId: int("taskId").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("Work Order Checklist"),
  /** Workflow template name this checklist was generated from */
  templateName: varchar("templateName", { length: 128 }),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  completedByUserId: int("completedByUserId"),
  /** Customer signature as base64 data URL or S3 URL */
  signatureUrl: text("signatureUrl"),
  signedAt: timestamp("signedAt"),
  signedByName: varchar("signedByName", { length: 255 }),
  /** Payment authorization captured during execution */
  paymentAuthorized: boolean("paymentAuthorized").default(false),
  paymentAmountCents: int("paymentAmountCents"),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  paymentAuthorizedAt: timestamp("paymentAuthorizedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TaskChecklist = typeof taskChecklists.$inferSelect;
export type InsertTaskChecklist = typeof taskChecklists.$inferInsert;

// ─── Checklist Items ──────────────────────────────────────────────────────────
/**
 * Individual items within a task checklist.
 * Supports text confirmation, photo attachment, and sub-notes.
 */
export const checklistItems = mysqlTable("checklistItems", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),
  tenantId: int("tenantId").notNull(),
  /** Display order within the checklist */
  sortOrder: int("sortOrder").default(0).notNull(),
  label: varchar("label", { length: 512 }).notNull(),
  /** Whether this item must be completed before the checklist can be closed */
  required: boolean("required").default(false).notNull(),
  /** Item type: checkbox, photo, voice, note, signature, payment */
  itemType: mysqlEnum("itemType", ["checkbox", "photo", "voice", "note", "signature", "payment"]).default("checkbox").notNull(),
  isChecked: boolean("isChecked").default(false).notNull(),
  checkedAt: timestamp("checkedAt"),
  checkedByUserId: int("checkedByUserId"),
  /** Free-text note attached to this item */
  note: text("note"),
  /** S3 URL of attached photo */
  photoUrl: text("photoUrl"),
  /** S3 URL of attached voice note */
  voiceNoteUrl: text("voiceNoteUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ─── Technician Skills (normalized) ──────────────────────────────────────────
export const technicianSkills = mysqlTable("technicianSkills", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  technicianId: int("technicianId").notNull(),
  skill: varchar("skill", { length: 128 }).notNull(),
  proficiencyLevel: mysqlEnum("proficiencyLevel", ["beginner", "intermediate", "expert"]).default("intermediate"),
  certifiedAt: timestamp("certifiedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TechnicianSkill = typeof technicianSkills.$inferSelect;

// ─── Merchant Settings ────────────────────────────────────────────────────────
/**
 * Per-merchant configuration: preferences, theme, notifications, SMS, email, templates.
 * One row per tenant. NVC super admins can edit all rows; merchant managers can edit their own.
 */
export const merchantSettings = mysqlTable("merchantSettings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  /** General preferences: { timezone, currency, dateFormat, language } */
  preferences: json("preferences"),
  /** Theme overrides: { primaryColor, accentColor, logoUrl } */
  theme: json("theme"),
  /** Notification config: { jobAssigned, jobCompleted, jobFailed, dailySummary } */
  notifications: json("notifications"),
  /** Auto-allocation rules: { enabled, algorithm, maxDistanceKm } */
  autoAllocation: boolean("autoAllocation").default(false).notNull(),
  /** SMS config: { enabled, senderName, templates: { confirmation, enRoute, completed } } */
  smsConfig: json("smsConfig"),
  /** Email config: { enabled, fromName, fromEmail, templates: { confirmation, receipt } } */
  emailConfig: json("emailConfig"),
  /** Workflow templates config: { pickup_delivery, appointment, field_workforce } */
  templates: json("templates"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MerchantSettings = typeof merchantSettings.$inferSelect;
export type InsertMerchantSettings = typeof merchantSettings.$inferInsert;

// ─── User Merchant Access (NVC staff cross-tenant access) ─────────────────────
/**
 * Grants NVC staff (super_admin / nvc_manager) access to a specific merchant tenant.
 * Used for impersonation and cross-tenant support operations.
 */
export const userMerchantAccess = mysqlTable("userMerchantAccess", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId").notNull(),
  grantedBy: int("grantedBy").notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
});
export type UserMerchantAccess = typeof userMerchantAccess.$inferSelect;
export type InsertUserMerchantAccess = typeof userMerchantAccess.$inferInsert;

// ─── Audit Logs (Super Admin action trail) ────────────────────────────────────
/**
 * Records every super admin action for compliance and client demos.
 * actorId = openId of the NVC staff member who performed the action.
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  /** Affected tenant — NULL for platform-level actions (e.g. login) */
  tenantId: int("tenantId"),
  /** openId of the NVC staff who performed the action */
  actorId: varchar("actorId", { length: 128 }).notNull(),
  actorEmail: varchar("actorEmail", { length: 320 }).notNull(),
  actorRole: varchar("actorRole", { length: 64 }).notNull(),
  /** Action key, e.g. "tenant.create", "tenant.suspend", "user.login" */
  action: varchar("action", { length: 128 }).notNull(),
  /** Type of the affected record, e.g. "tenant", "tenantUser", "task" */
  targetType: varchar("targetType", { length: 64 }),
  /** ID of the affected record */
  targetId: varchar("targetId", { length: 128 }),
  /** Extra context: before/after values, IP, etc. */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
