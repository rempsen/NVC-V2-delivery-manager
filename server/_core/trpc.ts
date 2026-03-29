import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// ─── Role Hierarchy ───────────────────────────────────────────────────────────
/**
 * 4-tier permission hierarchy for NVC360:
 *
 *  super_admin    → NVC platform owner — full access to all tenants, settings, impersonation
 *  nvc_manager    → NVC staff — same as super_admin except cannot delete tenants or promote roles
 *  merchant_manager → Merchant owner/manager — full CRUD within their own tenant only
 *  agent          → Field technician / dispatcher — limited to assigned tasks within their tenant
 *
 * Legacy values "user" and "admin" are mapped to "agent" and "merchant_manager" respectively
 * for backward compatibility.
 */
export type UserRole =
  | "super_admin" | "nvc_super_admin"
  | "nvc_manager" | "nvc_project_manager"
  | "merchant_manager" | "company_admin" | "dispatcher"
  | "agent" | "field_technician"
  | "user" | "admin";  // legacy aliases

const ROLE_RANK: Record<UserRole, number> = {
  // NVC platform staff
  super_admin: 100,
  nvc_super_admin: 100,   // alias for super_admin returned by emailLogin
  nvc_manager: 80,
  nvc_project_manager: 80, // alias for nvc_manager
  // Merchant staff
  merchant_manager: 50,
  company_admin: 50,       // alias for merchant_manager
  dispatcher: 30,
  // Field roles
  agent: 10,
  field_technician: 10,    // alias for agent
  // Legacy aliases
  admin: 50,
  user: 10,
};

/** Returns true if the user's role meets or exceeds the required minimum rank */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[requiredRole] ?? 0);
}

// ─── tRPC Init ────────────────────────────────────────────────────────────────
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Base Auth Middleware ─────────────────────────────────────────────────────
const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Any authenticated user (agent and above) */
export const protectedProcedure = t.procedure.use(requireUser);

// ─── Role-Gated Procedures ────────────────────────────────────────────────────

/**
 * Requires merchant_manager role or above.
 * Merchant managers can manage their own tenant's agents, customers, and tasks.
 * NVC staff (nvc_manager / super_admin) also pass this check.
 */
export const merchantManagerProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const role = ctx.user.role as UserRole;
    if (!hasRole(role, "merchant_manager")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Merchant manager access required (10003)",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * Requires nvc_manager role or above.
 * NVC staff can view and edit any merchant's data.
 */
export const nvcAdminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const role = ctx.user.role as UserRole;
    if (!hasRole(role, "nvc_manager")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "NVC admin access required (10004)",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * Requires super_admin role only.
 * Reserved for NVC platform owner operations: tenant creation/deletion, role promotion, impersonation.
 */
export const superAdminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const role = ctx.user.role as UserRole;
    if (role !== "super_admin" && role !== "nvc_super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Super admin access required (10005)",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * Legacy alias — maps old "admin" check to merchant_manager level.
 * Kept for backward compatibility with existing routes.
 */
export const adminProcedure = merchantManagerProcedure;

// ─── AI Rate Limiter ─────────────────────────────────────────────────────────

/** In-memory sliding-window rate limiter: max 10 AI calls per tenant per minute */
const aiRateLimitMap = new Map<string, number[]>();
const AI_RATE_LIMIT_MAX = 10;
const AI_RATE_LIMIT_WINDOW_MS = 60_000;

function checkAiRateLimit(tenantId: number | null | undefined, userId: string): void {
  const key = tenantId != null ? `t:${tenantId}` : `u:${userId}`;
  const now = Date.now();
  const windowStart = now - AI_RATE_LIMIT_WINDOW_MS;
  const calls = (aiRateLimitMap.get(key) ?? []).filter((ts) => ts > windowStart);
  if (calls.length >= AI_RATE_LIMIT_MAX) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `AI rate limit exceeded: max ${AI_RATE_LIMIT_MAX} requests per minute. Please wait before retrying.`,
    });
  }
  calls.push(now);
  aiRateLimitMap.set(key, calls);
}

/**
 * Requires authentication AND enforces AI rate limiting (10 req/min per tenant).
 * Use for all AI/LLM endpoints to prevent abuse and runaway costs.
 */
export const aiRateLimitedProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next, getRawInput } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Extract tenantId from input if present for per-tenant limiting
    const rawInput = await getRawInput();
    const inputTenantId =
      rawInput && typeof rawInput === "object" && "tenantId" in rawInput
        ? Number((rawInput as Record<string, unknown>).tenantId)
        : null;

    checkAiRateLimit(
      inputTenantId ?? (typeof ctx.user.tenantId === "number" ? ctx.user.tenantId : null),
      String(ctx.user.id),
    );

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// ─── Tenant-Scoped Procedure ──────────────────────────────────────────────────

/**
 * Enforces that the authenticated user can only access their own tenant's data.
 *
 * Rules:
 *  - NVC platform staff (super_admin / nvc_manager) bypass the check entirely.
 *  - All other roles must have ctx.user.tenantId set and it must match the
 *    `tenantId` field in the input (if present). Routes that don't take a
 *    tenantId input are still protected by authentication only.
 *
 * Usage:
 * ```ts
 * tenantScopedProcedure
 *   .input(z.object({ tenantId: z.number(), ... }))
 *   .query(({ ctx, input }) => {
 *     // ctx.tenantId is guaranteed to equal input.tenantId here
 *   })
 * ```
 */
export const tenantScopedProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next, getRawInput } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const role = ctx.user.role as UserRole;
    const isNvcStaff = hasRole(role, "nvc_manager");

    // NVC platform staff can access any tenant
    if (!isNvcStaff) {
      const userTenantId = ctx.user.tenantId;
      if (userTenantId == null) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account is not associated with a tenant. Please contact support. (10010)",
        });
      }

      // Check if the input contains a tenantId and enforce it matches
      const rawInput = await getRawInput();
      if (rawInput && typeof rawInput === "object" && "tenantId" in rawInput) {
        const inputTenantId = Number((rawInput as Record<string, unknown>).tenantId);
        if (!isNaN(inputTenantId) && inputTenantId !== userTenantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: you can only access your own company's data. (10011)",
          });
        }
      }
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
