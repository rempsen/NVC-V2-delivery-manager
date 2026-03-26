import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, merchantManagerProcedure, nvcAdminProcedure, tenantScopedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { adminRouter } from "./adminRouter";
import { mapsRouter } from "./mapsRouter";
import { stripeRouter } from "./stripeRouter";
import { exportRouter } from "./exportRouter";

import * as gemini from "./gemini";
import { broadcastLocationUpdate, broadcastStatusChange } from "./locationHub";
import bcrypt from "bcrypt";
import nodeCrypto from "node:crypto";
import { Expo } from "expo-server-sdk";

// ─── In-memory password reset token store (TTL 1 hour) ────────────────────────
const resetTokens = new Map<string, { email: string; tenantId: number; expiresAt: number }>();
function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) resetTokens.delete(token);
  }
}

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
  return nodeCrypto.randomBytes(12).toString("hex");
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
    /**
     * Email + password login for demo accounts.
     * Creates a real signed JWT session cookie so the web auth guard passes.
     * Password is always "demo123" for all demo accounts.
     */
    emailLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const DEMO_USERS: Record<string, { openId: string; name: string; email: string }> = {
          "admin@nvc360.com":      { openId: "demo-nvc-001",  name: "Dan Rosenblat",  email: "admin@nvc360.com" },
          "pm@nvc360.com":         { openId: "demo-nvc-002",  name: "Sarah Mitchell", email: "pm@nvc360.com" },
          "dispatch@acmehvac.com": { openId: "demo-t1-001",   name: "James Chen",     email: "dispatch@acmehvac.com" },
          "tech@acmehvac.com":     { openId: "demo-t1-002",   name: "Mike Torres",    email: "tech@acmehvac.com" },
          "admin@plumbpro.com":    { openId: "demo-t2-001",   name: "Lisa Park",      email: "admin@plumbpro.com" },
        };
        const emailLower = input.email.toLowerCase().trim();
        const demoUser = DEMO_USERS[emailLower];
        if (!demoUser || input.password !== "demo123") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials. Use password 'demo123' with a demo account." });
        }
        // Upsert the demo user so authenticateRequest can find them on subsequent requests
        await db.upsertUser({
          openId: demoUser.openId,
          name: demoUser.name,
          email: demoUser.email,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        // Create a real signed JWT session token using the platform secret
        const sessionToken = await sdk.createSessionToken(demoUser.openId, {
          name: demoUser.name,
          expiresInMs: 365 * 24 * 60 * 60 * 1000,
        });
        // Set the session cookie so the web auth guard (/api/auth/me) passes
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        // Return the token so the web client can call /api/auth/session on the
        // Express server domain (3000-xxx) to get a properly-scoped cookie that
        // the browser will send back with subsequent /api/auth/me requests.
        return { success: true, token: sessionToken } as const;
      }),

    /**
     * Forgot Password — sends a reset link to the employee's email.
     * Works for tenantUsers (dispatchers/technicians). Uses in-memory token store (1 hour TTL).
     */
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email(), tenantId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        cleanExpiredTokens();
        const user = await db.getTenantUserByEmail(input.email, input.tenantId);
        // Always return success to prevent email enumeration
        if (!user) return { success: true };
        const token = nodeCrypto.randomBytes(32).toString("hex");
        resetTokens.set(token, {
          email: input.email,
          tenantId: input.tenantId,
          expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        // Send email if SMTP is configured
        try {
          const { resolveSmtpCredentials, sendEmail } = await import("./email.js");
          const creds = resolveSmtpCredentials();
          if (creds) {
            const resetUrl = `https://tookandeliv-ve29h94a.manus.space/reset-password?token=${token}`;
            const html = `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #0052CC;">Reset Your Password</h2>
                <p>Hi ${user.name ?? input.email},</p>
                <p>Click the button below to reset your NVC360 password. This link expires in 1 hour.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#0052CC;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
                <p style="color:#9ba1a6;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                <p style="color:#9ba1a6;font-size:12px;">NVC360 2.0 · Field Service Management Platform</p>
              </div>
            `;
            await sendEmail(input.email, "Reset your NVC360 password", html, creds);
          } else {
            console.log(`[Auth] Reset token for ${input.email}: ${token}`);
          }
        } catch (err) {
          console.error("[Auth] Failed to send reset email:", err);
        }
        return { success: true };
      }),

    /**
     * Reset Password — validates the token and sets the new hashed password.
     */
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        cleanExpiredTokens();
        const entry = resetTokens.get(input.token);
        if (!entry || entry.expiresAt < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link is invalid or has expired." });
        }
        const user = await db.getTenantUserByEmail(entry.email, entry.tenantId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        const { tenantUsers: tuTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new Error("Database not available");
        await drizzleDb.update(tuTable).set({ passwordHash }).where(eq(tuTable.id, user.id));
        resetTokens.delete(input.token);
        return { success: true };
      }),

    /**
     * Invite Employee — creates a tenantUser with a temp password and sends a welcome email.
     */
    inviteEmployee: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["dispatcher", "technician", "manager", "admin"]).default("technician"),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check for duplicate email in tenant
        const existing = await db.getTenantUserByEmail(input.email, input.tenantId);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An employee with this email already exists." });
        }
        // Generate a random temp password
        const tempPassword = nodeCrypto.randomBytes(6).toString("hex"); // 12-char hex
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const userId = await db.createTenantUser({
          tenantId: input.tenantId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          role: input.role,
          passwordHash,
          isActive: true,
        });
        // Send welcome email if SMTP is configured
        let emailSent = false;
        try {
          const { resolveSmtpCredentials, sendEmail } = await import("./email.js");
          const creds = resolveSmtpCredentials();
          if (creds) {
            const loginUrl = "https://tookandeliv-ve29h94a.manus.space/login";
            const html = `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #0052CC;">Welcome to NVC360!</h2>
                <p>Hi ${input.name},</p>
                <p>You've been added to your team's NVC360 account as a <strong>${input.role}</strong>.</p>
                <p>Use the credentials below to log in:</p>
                <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>Email:</strong> ${input.email}</p>
                  <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
                </div>
                <a href="${loginUrl}" style="display:inline-block;background:#0052CC;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Log In Now</a>
                <p style="color:#9ba1a6;font-size:12px;">Please change your password after your first login.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                <p style="color:#9ba1a6;font-size:12px;">NVC360 2.0 · Field Service Management Platform</p>
              </div>
            `;
            await sendEmail(input.email, "You've been invited to NVC360", html, creds);
            emailSent = true;
          }
        } catch (err) {
          console.error("[Auth] Failed to send invite email:", err);
        }
        return { success: true, userId, tempPassword: emailSent ? undefined : tempPassword, emailSent };
      }),
  }),

  // ─── Tenant Users (Employees) ────────────────────────────────────────────
  tenantUsers: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getTenantUsersByTenant(input.tenantId)),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        const db2 = await import("../drizzle/schema");
        const { tenantUsers: tuTable } = db2;
        const drizzleDb = await (await import("./db")).getDb();
        if (!drizzleDb) throw new Error("Database not available");
        const { eq, and } = await import("drizzle-orm");
        await drizzleDb.delete(tuTable).where(and(eq(tuTable.id, input.id), eq(tuTable.tenantId, input.tenantId)));
        return { success: true };
      }),
  }),

  // ─── Tenants (NVC360 Super-Admin) ──────────────────────────────────────────
  tenants: router({
    // NVC staff only — tenants are platform-level records
    list: nvcAdminProcedure.query(() => db.getAllTenants()),

    getById: nvcAdminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTenantById(input.id)),

    /** Public — needed for slug-based tenant resolution on login page */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => db.getTenantBySlug(input.slug)),

    create: nvcAdminProcedure
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

    update: nvcAdminProcedure
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

    update: tenantScopedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number(),
          name: z.string().optional(),
          fields: z.array(z.unknown()).optional(),
          isDefault: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) => {
        const { id, tenantId: _tid, ...data } = input;
        return db.updateTemplate(id, data as any);
      }),

    delete: tenantScopedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
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

    update: tenantScopedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number(),
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
        const { id, tenantId: _tid, ...data } = input;
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

    getById: tenantScopedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
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
    assign: tenantScopedProcedure
      .input(
        z.object({
          taskId: z.number(),
          technicianId: z.number(),
          tenantId: z.number(),
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
        const pushTitle = "New Job Assigned 📋";
        const pushBody = `${orderRef} — ${customerName}${address ? ` · ${address}` : ""}`;
        const deepLink = `/task/${input.taskId}`;

        await sendPushToTech(
          (tech as any)?.pushToken,
          pushTitle,
          pushBody,
          { taskId: input.taskId, screen: "task-detail", deepLink },
        );

        // 4. Persist notification record for history panel
        const tenantId = (task as any)?.tenantId ?? (tech as any)?.tenantId ?? 1;
        const techUserId = (tech as any)?.tenantUserId ?? (tech as any)?.id ?? 0;
        await db.createNotification({
          tenantId,
          recipientUserId: techUserId,
          type: "job_assigned",
          title: pushTitle,
          body: pushBody,
          deepLink,
          entityType: "task",
          entityId: input.taskId,
          pushStatus: (tech as any)?.pushToken ? "sent" : "not_applicable",
          pushToken: (tech as any)?.pushToken ?? null,
          sentAt: new Date(),
        } as any);

        return { success: true, taskId: input.taskId, technicianId: input.technicianId };
      }),

    geoClockIn: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockIn(input.taskId)),

    geoClockOut: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(({ input }) => db.geoClockOut(input.taskId)),

    /** Agent swipes to start — set status=en_route, record startedAt, optionally send SMS */
    // ── Twilio SMS helpers are imported lazily to avoid import errors when not configured
    startTask: tenantScopedProcedure
      .input(z.object({
        taskId: z.number(),
        tenantId: z.number(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        await db.updateTaskRecord(input.taskId, {
          status: "en_route",
          startedAt: new Date(),
        } as any);
        // Fire-and-forget SMS via Twilio if configured
        const customerPhone = (task as any)?.customerPhone;
        const customerName = (task as any)?.customerName ?? "Customer";
        const orderRef = (task as any)?.orderRef ?? `#${input.taskId}`;
        const jobHash = (task as any)?.jobHash;
        if (customerPhone) {
          try {
            const trackUrl = jobHash ? `https://tookandeliv-ve29h94a.manus.space/track/${jobHash}` : "";
            const smsBody = `Hi ${customerName}, your technician is on the way for ${orderRef}. ${trackUrl ? `Track here: ${trackUrl}` : ""}`.trim();
            // Fetch tenant Twilio credentials and send real SMS
            const { resolveTwilioCredentials, sendSmsIfConfigured } = await import("./twilio.js");
            const tenant = (task as any)?.tenantId ? await db.getTenantById((task as any).tenantId) : null;
            const creds = resolveTwilioCredentials(tenant);
            await sendSmsIfConfigured(customerPhone, smsBody, creds);
            // Always log the SMS attempt in notifications table
            await db.createNotification({
              tenantId: (task as any)?.tenantId ?? 1,
              recipientUserId: 0,
              type: "sms_sent",
              title: "SMS: Technician En Route",
              body: smsBody,
              deepLink: `/task/${input.taskId}`,
              entityType: "task",
              entityId: input.taskId,
              pushStatus: creds ? "sent" : "pending",
              pushToken: null,
              sentAt: new Date(),
            } as any);
          } catch (err) { console.error("[startTask] SMS error:", err); /* non-fatal */ }
        }
        return { success: true, taskId: input.taskId, status: "en_route" };
      }),

    /** Agent arrives at job site — set status=on_site, record geoClockIn, optionally send SMS */
    arriveTask: tenantScopedProcedure
      .input(z.object({
        taskId: z.number(),
        tenantId: z.number(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        await db.updateTaskRecord(input.taskId, {
          status: "on_site",
          geoClockIn: new Date(),
        } as any);
        const customerPhone2 = (task as any)?.customerPhone;
        const customerName2 = (task as any)?.customerName ?? "Customer";
        const orderRef2 = (task as any)?.orderRef ?? `#${input.taskId}`;
        if (customerPhone2) {
          try {
            const smsBody2 = `Hi ${customerName2}, your technician has arrived for ${orderRef2}. They will be with you shortly.`;
            // Fetch tenant Twilio credentials and send real SMS
            const { resolveTwilioCredentials: resolveCreds2, sendSmsIfConfigured: sendSms2 } = await import("./twilio.js");
            const tenant2 = (task as any)?.tenantId ? await db.getTenantById((task as any).tenantId) : null;
            const creds2 = resolveCreds2(tenant2);
            await sendSms2(customerPhone2, smsBody2, creds2);
            // Log SMS attempt
            await db.createNotification({
              tenantId: (task as any)?.tenantId ?? 1,
              recipientUserId: 0,
              type: "sms_sent",
              title: "SMS: Technician Arrived",
              body: smsBody2,
              deepLink: `/task/${input.taskId}`,
              entityType: "task",
              entityId: input.taskId,
              pushStatus: creds2 ? "sent" : "pending",
              pushToken: null,
              sentAt: new Date(),
            } as any);
          } catch (err) { console.error("[arriveTask] SMS error:", err); /* non-fatal */ }
        }
        return { success: true, taskId: input.taskId, status: "on_site" };
      }),

    /** Agent saves notes/photos metadata to customFields */
    saveTaskNotes: tenantScopedProcedure
      .input(z.object({
        taskId: z.number(),
        tenantId: z.number(),
        notes: z.string().optional(),
        photoUris: z.array(z.string()).optional(),
        signatureUri: z.string().optional(),
        paymentAmount: z.number().optional(),
        paymentMethod: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { taskId, ...fields } = input;
        const task = await db.getTaskById_NVC(taskId);
        const existing = (task as any)?.customFields ?? {};
        await db.updateTaskRecord(taskId, {
          customFields: {
            ...existing,
            agentNotes: fields.notes,
            photoUris: fields.photoUris,
            signatureUri: fields.signatureUri,
            paymentAmount: fields.paymentAmount,
            paymentMethod: fields.paymentMethod,
            savedAt: new Date().toISOString(),
          },
        } as any);
        return { success: true };
      }),

    /** Agent swipes to complete — set status=completed, record completedAt, geoClockOut */
    completeTask: tenantScopedProcedure
      .input(z.object({
        taskId: z.number(),
        tenantId: z.number(),
        notes: z.string().optional(),
        signatureUri: z.string().optional(),
        paymentAmount: z.number().optional(),
        paymentMethod: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const task = await db.getTaskById_NVC(input.taskId);
        const existing = (task as any)?.customFields ?? {};
        await db.updateTaskRecord(input.taskId, {
          status: "completed",
          completedAt: new Date(),
          geoClockOut: new Date(),
          customFields: {
            ...existing,
            agentNotes: input.notes ?? existing.agentNotes,
            signatureUri: input.signatureUri ?? existing.signatureUri,
            paymentAmount: input.paymentAmount ?? existing.paymentAmount,
            paymentMethod: input.paymentMethod ?? existing.paymentMethod,
            completedAt: new Date().toISOString(),
          },
        } as any);
        // Push notification to dispatcher
        const customerName = (task as any)?.customerName ?? "Customer";
        const orderRef = (task as any)?.orderRef ?? `#${input.taskId}`;
        const tenantId = (task as any)?.tenantId ?? 1;
        await db.createNotification({
          tenantId,
          recipientUserId: 0,
          type: "job_completed",
          title: "Job Completed ✅",
          body: `${orderRef} — ${customerName} marked complete`,
          deepLink: `/task/${input.taskId}`,
          entityType: "task",
          entityId: input.taskId,
          pushStatus: "sent",
          pushToken: null,
          sentAt: new Date(),
        } as any);
        return { success: true, taskId: input.taskId, status: "completed" };
      }),
  }),

  // ─── Technicians ───────────────────────────────────────────────────────────
  technicians: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(({ input }) => db.getTechniciansByTenant(input.tenantId)),

    getById: tenantScopedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
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
          tenantId: z.number().optional(),
          latitude: z.string(),
          longitude: z.string(),
          speed: z.number().optional(),
          heading: z.number().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        await db.updateTechnicianLocation(input.id, input.latitude, input.longitude);
        if (input.tenantId) {
          broadcastLocationUpdate(
            input.tenantId,
            input.id,
            parseFloat(input.latitude),
            parseFloat(input.longitude),
          );
        }
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tenantId: z.number().optional(),
          status: z.enum(["online", "busy", "on_break", "offline"]),
        }),
      )
      .mutation(async ({ input }) => {
        await db.updateTechnicianStatus(input.id, input.status);
        if (input.tenantId) {
          broadcastStatusChange(input.tenantId, input.id, input.status);
        }
        return { success: true };
      }),

    /** Geo-clock in: record shift start with GPS coordinates */
    clockIn: tenantScopedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number(), lat: z.number(), lng: z.number() }))
      .mutation(async ({ input }) => {
        const { technicians: techTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new Error("Database not available");
        await drizzleDb.update(techTable).set({
          clockInAt: new Date(),
          clockInLat: String(input.lat),
          clockInLng: String(input.lng),
          clockOutAt: null,
          clockOutLat: null,
          clockOutLng: null,
          todayMinutesWorked: 0,
          status: "online",
        }).where(eq(techTable.id, input.id));
        return { success: true, clockInAt: new Date().toISOString() };
      }),

    /** Geo-clock out: record shift end and compute minutes worked */
    clockOut: tenantScopedProcedure
      .input(z.object({ id: z.number(), tenantId: z.number(), lat: z.number(), lng: z.number() }))
      .mutation(async ({ input }) => {
        const { technicians: techTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new Error("Database not available");
        const rows = await drizzleDb.select({ clockInAt: techTable.clockInAt }).from(techTable).where(eq(techTable.id, input.id)).limit(1);
        const clockInAt = rows[0]?.clockInAt;
        const clockOutAt = new Date();
        const minutesWorked = clockInAt ? Math.round((clockOutAt.getTime() - new Date(clockInAt).getTime()) / 60_000) : 0;
        await drizzleDb.update(techTable).set({
          clockOutAt,
          clockOutLat: String(input.lat),
          clockOutLng: String(input.lng),
          todayMinutesWorked: minutesWorked,
          status: "offline",
        }).where(eq(techTable.id, input.id));
        return { success: true, clockOutAt: clockOutAt.toISOString(), minutesWorked };
      }),
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

    /** Last 20 job_assigned notifications for the dispatcher history panel */
    dispatchHistory: protectedProcedure
      .input(z.object({ tenantId: z.number(), limit: z.number().default(20) }))
      .query(({ input }) => db.getDispatchHistory(input.tenantId, input.limit)),

    /** Send a test SMS to validate Twilio credentials */
    sendTestSms: protectedProcedure
      .input(z.object({ tenantId: z.number(), phone: z.string() }))
      .mutation(async ({ input }) => {
        const { resolveTwilioCredentials, sendSmsIfConfigured } = await import("./twilio.js");
        const tenant = await db.getTenantById(input.tenantId);
        const creds = resolveTwilioCredentials(tenant as any);
        if (!creds) throw new Error("Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Secrets.");
        await sendSmsIfConfigured(input.phone, "NVC360 2.0 test SMS — your Twilio integration is working!", creds);
        return { success: true };
      }),
    /** Send a test email to validate SMTP credentials */
    sendTestEmail: protectedProcedure
      .input(z.object({ tenantId: z.number(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { resolveSmtpCredentials, sendTestEmail } = await import("./email.js");
        const tenant = await db.getTenantById(input.tenantId);
        const creds = resolveSmtpCredentials(tenant as any);
        if (!creds) throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL in Secrets.");
        await sendTestEmail(input.email, creds);
        return { success: true };
      }),
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
    list: tenantScopedProcedure
      .input(z.object({ taskId: z.number(), tenantId: z.number() }))
      .query(({ input }) => db.getMessagesByTask(input.taskId)),

    send: tenantScopedProcedure
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

  // ─── Maps & Routing ──────────────────────────────────────────────────────
  maps: mapsRouter,

  // ─── Stripe Payments ─────────────────────────────────────────────────────
  stripe: stripeRouter,

  // ─── PDF / CSV Exports ───────────────────────────────────────────────────
  export: exportRouter,

  // ── NVC Super Admin (nvc_manager / super_admin roles only) ────────────────
  admin: adminRouter,
});
export type AppRouter = typeof appRouter;
