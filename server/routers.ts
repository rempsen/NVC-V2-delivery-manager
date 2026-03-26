import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { adminRouter } from "./adminRouter";
import crypto from "crypto";
import * as gemini from "./gemini";
import { Expo } from "expo-server-sdk";

// Expo push client (singleton)
const expoPush = new Expo();

/** Send a push notification to a single Expo push token, silently ignoring errors */
async function sendPushToTech(
  pushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;
  try {
    const chunks = expoPush.chunkPushNotifications([{ to: pushToken, sound: "default", title, body, data: data ?? {} }]);
    for (const chunk of chunks) {
      await expoPush.sendPushNotificationsAsync(chunk);
    }
  } catch {
    // Non-fatal: push delivery failure should never block the mutation
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateJobHash(): string {
  return crypto.randomBytes(12).toString("hex");
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Tenants (NVC360 Super-Admin) ──────────────────────────────────────────
  tenants: router({
    list: protectedProcedure.query(() => db.getAllTenants()),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTenantById(input.id)),

    /** Public — needed for slug-based tenant resolution on login page */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => db.getTenantBySlug(input.slug)),

    create: protectedProcedure
      .input(
        z.object({
          slug: z.string().min(2).max(64),
          companyName: z.string().min(1).max(255),
          industry: z.enum([
            "hvac", "construction", "delivery", "home_repair",
            "it_repair", "telecom", "home_fitness", "elder_care",
            "electrical", "plumbing", "flooring", "other",
          ]).default("other"),
          plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
          branding: z.record(z.string(), z.unknown()).optional(),
          smsSenderName: z.string().max(64).optional(),
          emailDomain: z.string().max(255).optional(),
        }),
      )
      .mutation(({ input }) => db.createTenant(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          companyName: z.string().optional(),
          branding: z.record(z.string(), z.unknown()).optional(),
          smsSenderName: z.string().optional(),
          emailDomain: z.string().optional(),
          nvc360ApiKey: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateTenant(id, data as any);
      }),
  }),

  // ─── Workflow Templates ────────────────────────────────────────────────────
  templates: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getTemplatesByTenant(input.tenantId)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          name: z.string().min(1).max(255),
          industry: z.string().optional(),
          description: z.string().optional(),
          fields: z.array(
            z.object({
              id: z.string(),
              type: z.enum(["text", "number", "dropdown", "checklist", "photo", "date", "signature"]),
              label: z.string(),
              required: z.boolean().default(false),
              options: z.array(z.string()).optional(),
            }),
          ),
          isDefault: z.boolean().default(false),
        }),
      )
      .mutation(({ input }) => db.createTemplate(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          fields: z.array(z.unknown()).optional(),
          isDefault: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateTemplate(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteTemplate(input.id)),
  }),

  // ─── Pricing Rules ─────────────────────────────────────────────────────────
  pricing: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getPricingRulesByTenant(input.tenantId)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          name: z.string().min(1),
          model: z.enum(["flat_rate", "hourly", "per_km", "custom"]),
          flatRateCents: z.number().optional(),
          hourlyBaseRateCents: z.number().optional(),
          hourlyBaseMinutes: z.number().optional(),
          hourlyOvertimeRateCents: z.number().optional(),
          perKmRateCents: z.number().optional(),
          freeRadiusKm: z.string().optional(),
          isDefault: z.boolean().default(false),
        }),
      )
      .mutation(({ input }) => db.createPricingRule(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          flatRateCents: z.number().optional(),
          hourlyBaseRateCents: z.number().optional(),
          hourlyBaseMinutes: z.number().optional(),
          hourlyOvertimeRateCents: z.number().optional(),
          perKmRateCents: z.number().optional(),
          freeRadiusKm: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updatePricingRule(id, data as any);
      }),

    /** Public — pricing calculator can be used on public-facing booking forms */
    calculate: publicProcedure
      .input(
        z.object({
          model: z.enum(["flat_rate", "hourly", "per_km", "custom"]),
          flatRateCents: z.number().optional(),
          hourlyBaseRateCents: z.number().optional(),
          hourlyBaseMinutes: z.number().optional(),
          hourlyOvertimeRateCents: z.number().optional(),
          perKmRateCents: z.number().optional(),
          freeRadiusKm: z.string().optional(),
          timeOnSiteMin: z.number().default(0),
          distanceKm: z.number().default(0),
        }),
      )
      .query(({ input }) => {
        const { timeOnSiteMin, distanceKm, ...rule } = input;
        return db.calculatePrice(rule, timeOnSiteMin, distanceKm);
      }),
  }),

  // ─── Tasks / Work Orders ───────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number(), status: z.string().optional() }))
      .query(({ input }) => db.getTasksByTenant(input.tenantId, input.status)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTaskById_NVC(input.id)),

    /** Public endpoint — customer SMS tracking link, no auth required */
    getByHash: publicProcedure
      .input(z.object({ jobHash: z.string() }))
      .query(({ input }) => db.getTaskByHash(input.jobHash)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          customerName: z.string().min(1),
          customerPhone: z.string().min(1),
          customerEmail: z.string().email().optional(),
          jobAddress: z.string().min(1),
          jobLatitude: z.string().optional(),
          jobLongitude: z.string().optional(),
          pickupAddress: z.string().optional(),
          pickupLatitude: z.string().optional(),
          pickupLongitude: z.string().optional(),
          description: z.string().optional(),
          orderRef: z.string().optional(),
          templateId: z.number().optional(),
          pricingRuleId: z.number().optional(),
          technicianId: z.number().optional(),
          priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
          customFields: z.record(z.string(), z.unknown()).optional(),
          scheduledAt: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const jobHash = generateJobHash();
        return db.createTaskRecord({
          ...input,
          jobHash,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        } as any);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["unassigned", "assigned", "en_route", "on_site", "completed", "failed", "cancelled"]),
        }),
      )
      .mutation(({ input }) => db.updateTaskStatusRecord(input.id, input.status)),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          technicianId: z.number().optional(),
          description: z.string().optional(),
          priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
          customFields: z.record(z.string(), z.unknown()).optional(),
          scheduledAt: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateTaskRecord(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.updateTaskRecord(input.id, { status: "cancelled" } as any)),

    /** Unassign: clear technicianId and revert status to unassigned */
    unassign: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateTaskRecord(input.taskId, {
          technicianId: null,
          status: "unassigned",
        } as any);
        return { success: true, taskId: input.taskId };
      }),

    /** Drag-to-assign: atomically set technicianId + status=assigned + push notification */
    assign: protectedProcedure
      .input(
        z.object({
          taskId: z.number(),
          technicianId: z.number(),
        }),
      )
      .mutation(async ({ input }) => {
        // 1. Fetch task and technician in parallel
        const [task, tech] = await Promise.all([
          db.getTaskById_NVC(input.taskId),
          db.getTechnicianById(input.technicianId),
        ]);

        // 2. Persist assignment
        await db.updateTaskRecord(input.taskId, {
          technicianId: input.technicianId,
          status: "assigned",
          dispatchedAt: new Date(),
        } as any);

        // 3. Fire-and-forget push notification to technician
        const customerName = (task as any)?.customerName ?? "a customer";
        const address = (task as any)?.address ?? (task as any)?.jobAddress ?? "";
        const orderRef = (task as any)?.orderRef ?? `#${input.taskId}`;
        await sendPushToTech(
          (tech as any)?.pushToken,
          "New Job Assigned 📋",
          `${orderRef} — ${customerName}${address ? ` · ${address}` : ""}`,
          { taskId: input.taskId, screen: "task-detail" },
        );

        return { success: true, taskId: input.taskId, technicianId: input.technicianId };
      }),

    geoClockIn: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockIn(input.taskId)),

    geoClockOut: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockOut(input.taskId)),
  }),

  // ─── Technicians ───────────────────────────────────────────────────────────
  technicians: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getTechniciansByTenant(input.tenantId)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTechnicianById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          tenantUserId: z.number().optional(),
          employeeId: z.string().optional(),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          skills: z.array(z.string()).optional(),
          certifications: z.array(z.string()).optional(),
          departments: z.array(z.string()).optional(),
          industries: z.array(z.string()).optional(),
          hourlyRate: z.string().optional(),
          overtimeRate: z.string().optional(),
          employmentType: z.enum(["full_time", "part_time", "contract", "seasonal"]).optional(),
          hireDate: z.string().optional(),
        }),
      )
      .mutation(({ input }) => db.createTechnician(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          skills: z.array(z.string()).optional(),
          certifications: z.array(z.string()).optional(),
          departments: z.array(z.string()).optional(),
          industries: z.array(z.string()).optional(),
          hourlyRate: z.string().optional(),
          overtimeRate: z.string().optional(),
          status: z.enum(["online", "busy", "on_break", "offline"]).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, tenantId, ...data } = input;
        return db.updateTechnician(id, tenantId, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(({ input }) => db.deleteTechnician(input.id, input.tenantId)),

    updateLocation: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          latitude: z.string(),
          longitude: z.string(),
          speed: z.number().optional(),
          heading: z.number().optional(),
        }),
      )
      .mutation(({ input }) =>
        db.updateTechnicianLocation(input.id, input.latitude, input.longitude),
      ),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["online", "busy", "on_break", "offline"]),
        }),
      )
      .mutation(({ input }) => db.updateTechnicianStatus(input.id, input.status)),
  }),

  // ─── Customers (CRM) ───────────────────────────────────────────────────────
  customers: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getCustomersByTenant(input.tenantId)),

    getById: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .query(({ input }) => db.getCustomerById(input.id, input.tenantId)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          company: z.string().min(1),
          contactName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          mailingStreet: z.string().optional(),
          mailingCity: z.string().optional(),
          mailingProvince: z.string().optional(),
          mailingPostalCode: z.string().optional(),
          mailingCountry: z.string().default("Canada"),
          physicalStreet: z.string().optional(),
          physicalCity: z.string().optional(),
          physicalProvince: z.string().optional(),
          physicalPostalCode: z.string().optional(),
          physicalCountry: z.string().default("Canada"),
          sameAsMailing: z.boolean().default(false),
          industry: z.string().optional(),
          status: z.enum(["active", "prospect", "inactive", "vip"]).default("prospect"),
          paymentTerms: z.string().default("net_30"),
          creditLimit: z.number().default(0),
          taxExempt: z.boolean().default(false),
          taxNumber: z.string().optional(),
          tags: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(({ input }) => db.createCustomer(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number(),
          company: z.string().optional(),
          contactName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          mailingStreet: z.string().optional(),
          mailingCity: z.string().optional(),
          mailingProvince: z.string().optional(),
          mailingPostalCode: z.string().optional(),
          mailingCountry: z.string().optional(),
          physicalStreet: z.string().optional(),
          physicalCity: z.string().optional(),
          physicalProvince: z.string().optional(),
          physicalPostalCode: z.string().optional(),
          physicalCountry: z.string().optional(),
          sameAsMailing: z.boolean().optional(),
          industry: z.string().optional(),
          status: z.enum(["active", "prospect", "inactive", "vip"]).optional(),
          paymentTerms: z.string().optional(),
          creditLimit: z.number().optional(),
          taxExempt: z.boolean().optional(),
          taxNumber: z.string().optional(),
          tags: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, tenantId, ...data } = input;
        return db.updateCustomer(id, tenantId, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(({ input }) => db.deleteCustomer(input.id, input.tenantId)),
  }),

  // ─── Calendar Items ────────────────────────────────────────────────────────
  calendar: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number(), dateFrom: z.string().optional(), dateTo: z.string().optional() }))
      .query(({ input }) => db.getCalendarItemsByTenant(input.tenantId, input.dateFrom, input.dateTo)),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          createdByUserId: z.number().optional(),
          type: z.enum(["note", "task", "event", "work_order"]),
          title: z.string().min(1),
          description: z.string().optional(),
          date: z.string(),
          time: z.string().optional(),
          endTime: z.string().optional(),
          taskId: z.number().optional(),
          color: z.string().optional(),
        }),
      )
      .mutation(({ input }) => db.createCalendarItem(input as any) as any),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          date: z.string().optional(),
          time: z.string().optional(),
          endTime: z.string().optional(),
          isCompleted: z.boolean().optional(),
          color: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, tenantId, ...data } = input;
        return db.updateCalendarItem(id, tenantId, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(({ input }) => db.deleteCalendarItem(input.id, input.tenantId)),
  }),

  // ─── Integrations ──────────────────────────────────────────────────────────
  integrations: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getIntegrationsByTenant(input.tenantId)),

    upsert: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          integrationKey: z.string(),
          isConnected: z.boolean().optional(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
          tokenExpiresAt: z.string().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(({ input }) => {
        const { tenantId, integrationKey, ...data } = input;
        return db.upsertIntegration(tenantId, integrationKey, data as any);
      }),

    disconnect: protectedProcedure
      .input(z.object({ tenantId: z.number(), integrationKey: z.string() }))
      .mutation(({ input }) => db.disconnectIntegration(input.tenantId, input.integrationKey)),

    // Get OAuth authorization URL for a given integration
    getAuthUrl: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        integrationKey: z.enum(["quickbooks", "xero", "companycam", "microsoft", "google_calendar"]),
      }))
      .query(async ({ input }) => {
        const { integrationKey, tenantId } = input;
        let url = "";
        if (integrationKey === "quickbooks") {
          const qb = await import("./integrations/quickbooks");
          url = qb.getAuthorizationUrl(tenantId);
        } else if (integrationKey === "xero") {
          const xero = await import("./integrations/xero");
          url = xero.getAuthorizationUrl(tenantId);
        } else if (integrationKey === "companycam") {
          const cc = await import("./integrations/companycam");
          url = cc.getAuthorizationUrl(tenantId);
        } else if (integrationKey === "microsoft") {
          const ms = await import("./integrations/microsoft");
          url = ms.getAuthorizationUrl(tenantId);
        } else if (integrationKey === "google_calendar") {
          const gcal = await import("./integrations/google-calendar");
          url = gcal.getAuthorizationUrl(tenantId);
        }
        return { url };
      }),

    // Get connection status for a specific integration
    getStatus: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        integrationKey: z.enum(["quickbooks", "xero", "companycam", "microsoft", "google_calendar", "apple_contacts"]),
      }))
      .query(async ({ input }) => {
        const { integrationKey, tenantId } = input;
        if (integrationKey === "quickbooks") {
          const qb = await import("./integrations/quickbooks");
          return qb.getConnectionStatus(tenantId);
        } else if (integrationKey === "xero") {
          const xero = await import("./integrations/xero");
          return xero.getConnectionStatus(tenantId);
        } else if (integrationKey === "companycam") {
          const cc = await import("./integrations/companycam");
          return cc.getConnectionStatus(tenantId);
        } else if (integrationKey === "microsoft") {
          const ms = await import("./integrations/microsoft");
          return ms.getConnectionStatus(tenantId);
        } else if (integrationKey === "google_calendar") {
          const gcal = await import("./integrations/google-calendar");
          return gcal.getConnectionStatus(tenantId);
        } else {
          const ac = await import("./integrations/apple-contacts");
          return ac.getConnectionStatus(tenantId);
        }
      }),

    // Connect Apple Contacts (app-specific password flow)
    connectAppleContacts: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        appleId: z.string().email(),
        appSpecificPassword: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const ac = await import("./integrations/apple-contacts");
        return ac.connect(input.tenantId, {
          appleId: input.appleId,
          appSpecificPassword: input.appSpecificPassword,
        });
      }),

    // Import vCard file content
    importVCard: protectedProcedure
      .input(z.object({ tenantId: z.number(), vcardContent: z.string() }))
      .mutation(async ({ input }) => {
        const ac = await import("./integrations/apple-contacts");
        return ac.importVCardFile(input.tenantId, input.vcardContent);
      }),

    // Export customers as vCard
    exportVCard: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const ac = await import("./integrations/apple-contacts");
        const content = await ac.exportCustomersAsVCard(input.tenantId);
        return { content };
      }),

    // QuickBooks: create invoice from work order
    qbCreateInvoice: protectedProcedure
      .input(z.object({ tenantId: z.number(), taskId: z.number() }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        if (!task) throw new Error("Task not found");
        const qb = await import("./integrations/quickbooks");
        return qb.createInvoiceFromWorkOrder(input.tenantId, {
          customerName: (task as any).customerName ?? "Unknown",
          customerEmail: (task as any).customerEmail ?? undefined,
          customerPhone: (task as any).customerPhone ?? undefined,
          description: (task as any).description ?? "Field Service Work Order",
          totalCents: (task as any).totalPriceCents ?? 0,
          jobRef: (task as any).orderRef ?? String(input.taskId),
          completedAt: (task as any).completedAt?.toISOString(),
        });
      }),

    // Xero: create invoice from work order
    xeroCreateInvoice: protectedProcedure
      .input(z.object({ tenantId: z.number(), taskId: z.number() }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        if (!task) throw new Error("Task not found");
        const xero = await import("./integrations/xero");
        return xero.createInvoiceFromWorkOrder(input.tenantId, {
          customerName: (task as any).customerName ?? "Unknown",
          customerEmail: (task as any).customerEmail ?? undefined,
          customerPhone: (task as any).customerPhone ?? undefined,
          description: (task as any).description ?? "Field Service Work Order",
          totalCents: (task as any).totalPriceCents ?? 0,
          jobRef: (task as any).orderRef ?? String(input.taskId),
          completedAt: (task as any).completedAt?.toISOString(),
        });
      }),

    // CompanyCam: sync work order to project
    ccSyncProject: protectedProcedure
      .input(z.object({ tenantId: z.number(), taskId: z.number() }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        if (!task) throw new Error("Task not found");
        const cc = await import("./integrations/companycam");
        return cc.syncWorkOrderToProject(input.tenantId, {
          id: input.taskId,
          customerName: (task as any).customerName ?? "Unknown",
          jobAddress: (task as any).jobAddress ?? "",
          jobRef: (task as any).orderRef ?? undefined,
        });
      }),

    // Calendar sync (Microsoft or Google) for a work order
    syncToCalendar: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        taskId: z.number(),
        provider: z.enum(["microsoft", "google_calendar"]),
      }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        if (!task) throw new Error("Task not found");
        const workOrder = {
          id: input.taskId,
          customerName: (task as any).customerName ?? "Unknown",
          jobAddress: (task as any).jobAddress ?? "",
          description: (task as any).description ?? undefined,
          scheduledAt: (task as any).scheduledAt?.toISOString() ?? undefined,
          customerEmail: (task as any).customerEmail ?? undefined,
        };
        if (input.provider === "microsoft") {
          const ms = await import("./integrations/microsoft");
          return ms.syncWorkOrderToCalendar(input.tenantId, workOrder);
        } else {
          const gcal = await import("./integrations/google-calendar");
          return gcal.syncWorkOrderToCalendar(input.tenantId, workOrder);
        }
      }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number(), userId: z.number(), limit: z.number().default(50) }))
      .query(({ input }) => db.getNotificationsForUser(input.tenantId, input.userId, input.limit)),

    markRead: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.number() }))
      .mutation(({ input }) => db.markNotificationRead(input.id, input.userId)),

    markAllRead: protectedProcedure
      .input(z.object({ tenantId: z.number(), userId: z.number() }))
      .mutation(({ input }) => db.markAllNotificationsRead(input.tenantId, input.userId)),
  }),

  // ─── File Attachments ──────────────────────────────────────────────────────
  attachments: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number(), entityType: z.string(), entityId: z.number() }))
      .query(({ input }) => db.getAttachmentsByEntity(input.tenantId, input.entityType, input.entityId)),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(({ input }) => db.deleteFileAttachment(input.id, input.tenantId)),
  }),

  // ─── Consent (PIPEDA) ──────────────────────────────────────────────────────
  consent: router({
    record: publicProcedure
      .input(
        z.object({
          tenantId: z.number(),
          userId: z.number(),
          policyVersion: z.string(),
          consentGiven: z.boolean(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
        }),
      )
      .mutation(({ input }) => db.recordConsent(input as any)),

    getByUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => db.getConsentByUser(input.userId)),
  }),

  // ─── Messages ──────────────────────────────────────────────────────────────
  messages: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(({ input }) => db.getMessagesByTask(input.taskId)),

    send: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          taskId: z.number(),
          senderType: z.enum(["dispatcher", "technician", "system"]),
          senderId: z.number().optional(),
          senderName: z.string().optional(),
          content: z.string().min(1),
          attachmentType: z.enum(["none", "task_preview", "file"]).default("none"),
          attachmentData: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(({ input }) => db.sendMessage(input as any) as any),

    markRead: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.markMessagesRead(input.taskId)),
  }),

  // ─── AI / Gemini Insights ────────────────────────────────────────────────
  ai: router({
    operationalBriefing: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .mutation(async ({ input }) => {
        const [tasks, technicians] = await Promise.all([
          db.getTasksByTenant(input.tenantId),
          db.getTechniciansByTenant(input.tenantId),
        ]);
        const taskSummaries: gemini.TaskSummary[] = (tasks as any[]).map((t) => ({
          id: t.id,
          status: t.status,
          priority: t.priority ?? "normal",
          customerName: t.customerName ?? undefined,
          jobAddress: t.jobAddress ?? undefined,
          scheduledTime: t.scheduledTime ?? undefined,
          assignedTechnicianId: t.assignedTechnicianId ?? undefined,
          estimatedDuration: t.estimatedDuration ?? undefined,
          createdAt: t.createdAt?.toISOString() ?? undefined,
        }));
        const techSummaries: gemini.TechSummary[] = (technicians as any[]).map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          todayJobs: t.todayJobs ?? 0,
          skills: t.skills ?? [],
          latitude: t.latitude ? parseFloat(t.latitude) : undefined,
          longitude: t.longitude ? parseFloat(t.longitude) : undefined,
        }));
        return gemini.generateOperationalBriefing(taskSummaries, techSummaries);
      }),

    draftSms: protectedProcedure
      .input(
        z.object({
          eventType: z.enum(["job_created", "job_assigned", "technician_en_route", "technician_arrived", "job_completed", "job_rescheduled", "custom"]),
          customerName: z.string().min(1),
          jobAddress: z.string().min(1),
          technicianName: z.string().optional(),
          scheduledTime: z.string().optional(),
          estimatedArrival: z.string().optional(),
          companyName: z.string().optional(),
          trackingUrl: z.string().optional(),
          customContext: z.string().optional(),
        }),
      )
      .mutation(({ input }) => gemini.draftSmsMessage(input)),

    assessDelayRisk: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        if (!task) throw new Error("Task not found");
        const tech = (task as any).assignedTechnicianId
          ? await db.getTechnicianById((task as any).assignedTechnicianId)
          : undefined;
        const taskSummary: gemini.TaskSummary = {
          id: (task as any).id,
          status: (task as any).status,
          priority: (task as any).priority ?? "normal",
          customerName: (task as any).customerName ?? undefined,
          jobAddress: (task as any).jobAddress ?? undefined,
          scheduledTime: (task as any).scheduledTime ?? undefined,
          assignedTechnicianId: (task as any).assignedTechnicianId ?? undefined,
        };
        const techSummary: gemini.TechSummary | undefined = tech
          ? { id: (tech as any).id, name: (tech as any).name, status: (tech as any).status, skills: (tech as any).skills ?? [] }
          : undefined;
        return gemini.assessDelayRisk(taskSummary, techSummary);
      }),
  }),

  // ─── Checklists ───────────────────────────────────────────────────────────
  checklist: router({
    getByTask: protectedProcedure
      .input(z.object({ taskId: z.number(), tenantId: z.number() }))
      .query(({ input }) => db.getChecklistsByTask(input.taskId, input.tenantId)),
    getWithItems: protectedProcedure
      .input(z.object({ checklistId: z.number(), tenantId: z.number() }))
      .query(({ input }) => db.getChecklistWithItems(input.checklistId, input.tenantId)),
    create: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        taskId: z.number(),
        title: z.string().optional(),
        templateName: z.string().optional(),
        items: z.array(z.object({
          label: z.string(),
          required: z.boolean().default(false),
          itemType: z.enum(["checkbox", "photo", "voice", "note", "signature", "payment"]).default("checkbox"),
          sortOrder: z.number().default(0),
        })),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createChecklist({
          tenantId: input.tenantId,
          taskId: input.taskId,
          title: input.title ?? "Work Order Checklist",
          templateName: input.templateName,
        });
        const insertedId = (result as any).insertId as number;
        if (input.items.length > 0) {
          await db.addChecklistItems(
            input.items.map((item, i) => ({
              checklistId: insertedId,
              tenantId: input.tenantId,
              label: item.label,
              required: item.required,
              itemType: item.itemType,
              sortOrder: item.sortOrder ?? i,
            }))
          );
        }
        return { checklistId: insertedId };
      }),
    toggleItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        tenantId: z.number(),
        checked: z.boolean(),
        userId: z.number().optional(),
      }))
      .mutation(({ input }) =>
        db.toggleChecklistItem(input.itemId, input.tenantId, input.checked, input.userId)
      ),
    updateItemNote: protectedProcedure
      .input(z.object({ itemId: z.number(), tenantId: z.number(), note: z.string() }))
      .mutation(({ input }) => db.updateChecklistItemNote(input.itemId, input.tenantId, input.note)),
    complete: protectedProcedure
      .input(z.object({
        checklistId: z.number(),
        tenantId: z.number(),
        signatureUrl: z.string().optional(),
        signedByName: z.string().optional(),
        paymentAuthorized: z.boolean().optional(),
        paymentAmountCents: z.number().optional(),
        paymentMethod: z.string().optional(),
        completedByUserId: z.number().optional(),
      }))
      .mutation(({ input }) => db.completeChecklist(input.checklistId, input.tenantId, input)),
  }),

  // ─── Location ──────────────────────────────────────────────────────────────
  location: router({
    record: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          technicianId: z.number(),
          taskId: z.number().optional(),
          latitude: z.string(),
          longitude: z.string(),
          speed: z.number().optional(),
          heading: z.number().optional(),
          accuracy: z.number().optional(),
        }),
      )
      .mutation(({ input }) => db.recordLocation(input as any)),

     history: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(({ input }) => db.getLocationHistoryForTask(input.taskId)),
  }),

  // ── NVC Super Admin (nvc_manager / super_admin roles only) ────────────────
  admin: adminRouter,
});
export type AppRouter = typeof appRouter;
