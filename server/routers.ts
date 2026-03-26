import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import crypto from "crypto";

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateJobHash(): string {
  return crypto.randomBytes(12).toString("hex");
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

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
          tookanApiKey: z.string().optional(),
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
    list: publicProcedure
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
    list: publicProcedure
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
    list: publicProcedure
      .input(z.object({ tenantId: z.number(), status: z.string().optional() }))
      .query(({ input }) => db.getTasksByTenant(input.tenantId, input.status)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTaskById_NVC(input.id)),

    /** Public endpoint for customer SMS tracking — no auth required */
    getByHash: publicProcedure
      .input(z.object({ jobHash: z.string() }))
      .query(({ input }) => db.getTaskByHash(input.jobHash)),

    create: publicProcedure
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

    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["unassigned", "assigned", "en_route", "on_site", "completed", "failed", "cancelled"]),
        }),
      )
      .mutation(({ input }) => db.updateTaskStatusRecord(input.id, input.status)),

    update: publicProcedure
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

    geoClockIn: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockIn(input.taskId)),

    geoClockOut: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockOut(input.taskId)),
  }),

  // ─── Technicians ───────────────────────────────────────────────────────────

  technicians: router({
    list: publicProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getTechniciansByTenant(input.tenantId)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTechnicianById(input.id)),

    updateLocation: publicProcedure
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

    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["online", "busy", "on_break", "offline"]),
        }),
      )
      .mutation(({ input }) => db.updateTechnicianStatus(input.id, input.status)),
  }),

  // ─── Messages ──────────────────────────────────────────────────────────────

  messages: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(({ input }) => db.getMessagesByTask(input.taskId)),

    send: publicProcedure
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

    markRead: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.markMessagesRead(input.taskId)),
  }),

  // ─── Location ──────────────────────────────────────────────────────────────

  location: router({
    record: publicProcedure
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

    history: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(({ input }) => db.getLocationHistoryForTask(input.taskId)),
  }),
});

export type AppRouter = typeof appRouter;
