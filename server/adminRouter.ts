/**
 * NVC Super Admin Router
 *
 * All procedures require nvc_manager or super_admin role.
 * Destructive operations (suspend, delete, role promotion) require super_admin.
 */

import { router, nvcAdminProcedure, superAdminProcedure, merchantManagerProcedure } from "./_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db.js";
import {
  tenants,
  users,
  tenantUsers,
  tasks,
  merchantSettings,
  userMerchantAccess,
} from "../drizzle/schema.js";
import { eq, desc, like, or, and, sql } from "drizzle-orm";
import { sdk } from "./_core/sdk.js";
import bcrypt from "bcryptjs";

// ─── Input Schemas ────────────────────────────────────────────────────────────

const PaginationInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const MerchantSettingsInput = z.object({
  tenantId: z.number().int(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  notifications: z.record(z.string(), z.unknown()).optional(),
  autoAllocation: z.boolean().optional(),
  smsConfig: z.record(z.string(), z.unknown()).optional(),
  emailConfig: z.record(z.string(), z.unknown()).optional(),
  templates: z.record(z.string(), z.unknown()).optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = router({

  // ── Platform Stats ──────────────────────────────────────────────────────────
  getPlatformStats: nvcAdminProcedure.query(async () => {
    const ddb = await getDb();
    if (!ddb) return { totalMerchants: 0, activeMerchants: 0, totalUsers: 0, totalTasks: 0, completedTasks: 0 };

    const [totalMerchants] = await ddb
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.isNvcPlatform, false));

    const [activeMerchants] = await ddb
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(and(eq(tenants.isNvcPlatform, false), eq(tenants.isActive, true), eq(tenants.suspended, false)));

    const [totalUsers] = await ddb
      .select({ count: sql<number>`count(*)` })
      .from(tenantUsers);

    const [totalTasks] = await ddb
      .select({ count: sql<number>`count(*)` })
      .from(tasks);

    const [completedTasks] = await ddb
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    return {
      totalMerchants: totalMerchants?.count ?? 0,
      activeMerchants: activeMerchants?.count ?? 0,
      totalUsers: totalUsers?.count ?? 0,
      totalTasks: totalTasks?.count ?? 0,
      completedTasks: completedTasks?.count ?? 0,
    };
  }),

  // ── List All Merchants ───────────────────────────────────────────────────────
  listMerchants: nvcAdminProcedure
    .input(PaginationInput.extend({
      search: z.string().optional(),
      plan: z.enum(["starter", "professional", "enterprise"]).optional(),
      status: z.enum(["active", "suspended", "inactive"]).optional(),
    }))
    .query(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) return { merchants: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };

      const offset = (input.page - 1) * input.limit;
      const conditions: ReturnType<typeof eq>[] = [eq(tenants.isNvcPlatform, false)];

      if (input.search) {
        conditions.push(
          or(
            like(tenants.companyName, `%${input.search}%`),
            like(tenants.slug, `%${input.search}%`),
          ) as any,
        );
      }
      if (input.plan) conditions.push(eq(tenants.plan, input.plan));
      if (input.status === "suspended") conditions.push(eq(tenants.suspended, true));
      else if (input.status === "active") conditions.push(and(eq(tenants.isActive, true), eq(tenants.suspended, false)) as any);
      else if (input.status === "inactive") conditions.push(eq(tenants.isActive, false));

      const merchantList = await ddb
        .select()
        .from(tenants)
        .where(and(...conditions))
        .orderBy(desc(tenants.createdAt))
        .limit(input.limit)
        .offset(offset);

      const enriched = await Promise.all(
        merchantList.map(async (tenant) => {
          const [agentCount] = await ddb
            .select({ count: sql<number>`count(*)` })
            .from(tenantUsers)
            .where(eq(tenantUsers.tenantId, tenant.id));

          const [taskCount] = await ddb
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(eq(tasks.tenantId, tenant.id));

          const [completedCount] = await ddb
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(and(eq(tasks.tenantId, tenant.id), eq(tasks.status, "completed")));

          return {
            ...tenant,
            agentCount: agentCount?.count ?? 0,
            taskCount: taskCount?.count ?? 0,
            completedTaskCount: completedCount?.count ?? 0,
          };
        }),
      );

      const [totalCount] = await ddb
        .select({ count: sql<number>`count(*)` })
        .from(tenants)
        .where(and(...conditions));

      return {
        merchants: enriched,
        total: totalCount?.count ?? 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((totalCount?.count ?? 0) / input.limit),
      };
    }),

  // ── Get Single Merchant ──────────────────────────────────────────────────────
  getMerchant: nvcAdminProcedure
    .input(z.object({ tenantId: z.number().int() }))
    .query(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [tenant] = await ddb
        .select()
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" });
      }

      const [settings] = await ddb
        .select()
        .from(merchantSettings)
        .where(eq(merchantSettings.tenantId, input.tenantId))
        .limit(1);

      const agents = await ddb
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, input.tenantId))
        .orderBy(desc(tenantUsers.createdAt));

      const [taskStats] = await ddb
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
          active: sql<number>`SUM(CASE WHEN status IN ('assigned','en_route','on_site') THEN 1 ELSE 0 END)`,
        })
        .from(tasks)
        .where(eq(tasks.tenantId, input.tenantId));

      return {
        tenant,
        settings: settings ?? null,
        agents,
        taskStats: {
          total: taskStats?.total ?? 0,
          completed: taskStats?.completed ?? 0,
          active: taskStats?.active ?? 0,
        },
      };
    }),

  // ── Create Merchant (super_admin only) ───────────────────────────────────────
  createMerchant: superAdminProcedure
    .input(z.object({
      companyName: z.string().min(2).max(255),
      slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
      industry: z.enum(["hvac", "construction", "delivery", "home_repair", "it_repair", "telecom", "home_fitness", "elder_care", "electrical", "plumbing", "flooring", "other"]).default("other"),
      plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
      ownerName: z.string().min(2).max(255),
      ownerEmail: z.string().email(),
      ownerPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await ddb
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, input.slug))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A merchant with this slug already exists" });
      }

      const [tenantResult] = await ddb
        .insert(tenants)
        .values({
          slug: input.slug,
          companyName: input.companyName,
          industry: input.industry,
          plan: input.plan,
          isActive: true,
          isNvcPlatform: false,
          suspended: false,
        });

      const tenantId = (tenantResult as any).insertId as number;

      await ddb.insert(merchantSettings).values({ tenantId, autoAllocation: false });

      const passwordHash = await bcrypt.hash(input.ownerPassword, 12);

      await ddb.insert(tenantUsers).values({
        tenantId,
        role: "manager",
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash,
        isActive: true,
      });

      return { tenantId, slug: input.slug, companyName: input.companyName };
    }),

  // ── Update Merchant Settings ────────────────────────────────────────────────────────────────────
  // Accessible to NVC admins AND merchant managers (scoped to their own tenant)
  updateMerchantSettings: merchantManagerProcedure
    .input(MerchantSettingsInput)
    .mutation(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { tenantId, ...settingsData } = input;

      const [existing] = await ddb
        .select({ id: merchantSettings.id })
        .from(merchantSettings)
        .where(eq(merchantSettings.tenantId, tenantId))
        .limit(1);

      if (existing) {
        await ddb
          .update(merchantSettings)
          .set({
            ...(settingsData.preferences !== undefined && { preferences: settingsData.preferences }),
            ...(settingsData.theme !== undefined && { theme: settingsData.theme }),
            ...(settingsData.notifications !== undefined && { notifications: settingsData.notifications }),
            ...(settingsData.autoAllocation !== undefined && { autoAllocation: settingsData.autoAllocation }),
            ...(settingsData.smsConfig !== undefined && { smsConfig: settingsData.smsConfig }),
            ...(settingsData.emailConfig !== undefined && { emailConfig: settingsData.emailConfig }),
            ...(settingsData.templates !== undefined && { templates: settingsData.templates }),
          })
          .where(eq(merchantSettings.tenantId, tenantId));
      } else {
        await ddb.insert(merchantSettings).values({
          tenantId,
          preferences: settingsData.preferences ?? {},
          theme: settingsData.theme ?? {},
          notifications: settingsData.notifications ?? {},
          autoAllocation: settingsData.autoAllocation ?? false,
          smsConfig: settingsData.smsConfig ?? {},
          emailConfig: settingsData.emailConfig ?? {},
          templates: settingsData.templates ?? {},
        });
      }

      return { success: true };
    }),

  // ── Suspend Merchant (super_admin only) ──────────────────────────────────────
  suspendMerchant: superAdminProcedure
    .input(z.object({ tenantId: z.number().int(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await ddb
        .update(tenants)
        .set({ suspended: true, isActive: false })
        .where(and(eq(tenants.id, input.tenantId), eq(tenants.isNvcPlatform, false)));

      return { success: true };
    }),

  // ── Reactivate Merchant (super_admin only) ───────────────────────────────────
  reactivateMerchant: superAdminProcedure
    .input(z.object({ tenantId: z.number().int() }))
    .mutation(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await ddb
        .update(tenants)
        .set({ suspended: false, isActive: true })
        .where(and(eq(tenants.id, input.tenantId), eq(tenants.isNvcPlatform, false)));

      return { success: true };
    }),

  // ── Impersonate Merchant ─────────────────────────────────────────────────────
  impersonateMerchant: nvcAdminProcedure
    .input(z.object({ tenantId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [tenant] = await ddb
        .select({ id: tenants.id, companyName: tenants.companyName, suspended: tenants.suspended })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" });
      }

      if (tenant.suspended) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot impersonate a suspended merchant" });
      }

      await ddb.insert(userMerchantAccess).values({
        userId: ctx.user.id,
        tenantId: input.tenantId,
        grantedBy: ctx.user.id,
      }).onDuplicateKeyUpdate({ set: { grantedAt: new Date() } });

      const impersonationToken = await sdk.signSession(
        {
          openId: ctx.user.openId,
          appId: `impersonate:${input.tenantId}`,
          name: ctx.user.name ?? "NVC Admin",
        },
        { expiresInMs: 60 * 60 * 1000 },
      );

      return {
        token: impersonationToken,
        tenantId: input.tenantId,
        companyName: tenant.companyName,
        expiresInSeconds: 3600,
      };
    }),

  // ── List All Tasks (cross-tenant) ────────────────────────────────────────────
  listAllTasks: nvcAdminProcedure
    .input(PaginationInput.extend({
      tenantId: z.number().int().optional(),
      status: z.enum(["unassigned", "assigned", "en_route", "on_site", "completed", "failed", "cancelled"]).optional(),
    }))
    .query(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) return { tasks: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };

      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];
      if (input.tenantId) conditions.push(eq(tasks.tenantId, input.tenantId));
      if (input.status) conditions.push(eq(tasks.status, input.status));

      const taskList = await ddb
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tasks.createdAt))
        .limit(input.limit)
        .offset(offset);

      const [totalCount] = await ddb
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        tasks: taskList,
        total: totalCount?.count ?? 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((totalCount?.count ?? 0) / input.limit),
      };
    }),

  // ── List All Users (cross-tenant) ────────────────────────────────────────────
  listAllUsers: nvcAdminProcedure
    .input(PaginationInput.extend({
      tenantId: z.number().int().optional(),
      role: z.enum(["dispatcher", "technician", "manager", "admin"]).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) return { users: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };

      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];
      if (input.tenantId) conditions.push(eq(tenantUsers.tenantId, input.tenantId));
      if (input.role) conditions.push(eq(tenantUsers.role, input.role));
      if (input.search) {
        conditions.push(
          or(
            like(tenantUsers.name, `%${input.search}%`),
            like(tenantUsers.email, `%${input.search}%`),
          ) as any,
        );
      }

      const userList = await ddb
        .select({
          id: tenantUsers.id,
          tenantId: tenantUsers.tenantId,
          role: tenantUsers.role,
          name: tenantUsers.name,
          email: tenantUsers.email,
          phone: tenantUsers.phone,
          isActive: tenantUsers.isActive,
          createdAt: tenantUsers.createdAt,
        })
        .from(tenantUsers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tenantUsers.createdAt))
        .limit(input.limit)
        .offset(offset);

      const [totalCount] = await ddb
        .select({ count: sql<number>`count(*)` })
        .from(tenantUsers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        users: userList,
        total: totalCount?.count ?? 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((totalCount?.count ?? 0) / input.limit),
      };
    }),

  // ── Promote User Role (super_admin only) ─────────────────────────────────────
  promoteUser: superAdminProcedure
    .input(z.object({
      userId: z.number().int(),
      newRole: z.enum(["super_admin", "nvc_manager", "merchant_manager", "agent"]),
    }))
    .mutation(async ({ input }) => {
      const ddb = await getDb();
      if (!ddb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await ddb
        .update(users)
        .set({ role: input.newRole })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),
});
