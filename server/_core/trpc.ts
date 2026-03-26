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
export type UserRole = "super_admin" | "nvc_manager" | "merchant_manager" | "agent" | "user" | "admin";

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 100,
  nvc_manager: 80,
  merchant_manager: 50,
  agent: 10,
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
    if (role !== "super_admin") {
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
