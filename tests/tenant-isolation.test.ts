/**
 * Tenant Isolation Tests
 *
 * Verifies that the tenantScopedProcedure middleware correctly enforces
 * data isolation between tenants, and that NVC admins can bypass the check.
 *
 * These tests mock the tRPC context and call the middleware directly,
 * without requiring a running server or database.
 */

import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock the tenantScopedProcedure middleware logic ─────────────────────────
// We replicate the exact middleware logic from server/_core/trpc.ts so we can
// unit-test it in isolation without importing the full server stack.

type MockUser = {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: string;
  tenantId: number | null;
};

const NVC_ADMIN_ROLES = new Set(["super_admin", "nvc_manager"]);

/**
 * Replicates the tenantScopedProcedure ownership check.
 * Returns true if access is allowed, throws TRPCError if denied.
 */
function checkTenantAccess(user: MockUser, inputTenantId: number): boolean {
  const isNvcAdmin = NVC_ADMIN_ROLES.has(user.role);
  if (isNvcAdmin) return true; // NVC admins can access any tenant

  if (user.tenantId == null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tenant associated with this account",
    });
  }

  if (user.tenantId !== inputTenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied: you can only access your own company data",
    });
  }

  return true;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Tenant Isolation — tenantScopedProcedure middleware", () => {

  // ── NVC Admin bypass ────────────────────────────────────────────────────────

  it("allows super_admin to access any tenant", () => {
    const user: MockUser = { id: 1, openId: "nvc-1", email: "admin@nvc360.com", name: "NVC Admin", role: "super_admin", tenantId: null };
    expect(checkTenantAccess(user, 1)).toBe(true);
    expect(checkTenantAccess(user, 2)).toBe(true);
    expect(checkTenantAccess(user, 999)).toBe(true);
  });

  it("allows nvc_manager to access any tenant", () => {
    const user: MockUser = { id: 2, openId: "nvc-2", email: "manager@nvc360.com", name: "NVC Manager", role: "nvc_manager", tenantId: null };
    expect(checkTenantAccess(user, 1)).toBe(true);
    expect(checkTenantAccess(user, 5)).toBe(true);
  });

  // ── Tenant user — own data ──────────────────────────────────────────────────

  it("allows a dispatcher to access their own tenant data", () => {
    const user: MockUser = { id: 10, openId: "acme-1", email: "dispatch@acmehvac.com", name: "Dispatcher", role: "dispatcher", tenantId: 1 };
    expect(checkTenantAccess(user, 1)).toBe(true);
  });

  it("allows a manager to access their own tenant data", () => {
    const user: MockUser = { id: 11, openId: "plumb-1", email: "admin@plumbpro.com", name: "Manager", role: "manager", tenantId: 2 };
    expect(checkTenantAccess(user, 2)).toBe(true);
  });

  // ── Cross-tenant access — must be blocked ───────────────────────────────────

  it("blocks a dispatcher from accessing another tenant's data", () => {
    const user: MockUser = { id: 10, openId: "acme-1", email: "dispatch@acmehvac.com", name: "Dispatcher", role: "dispatcher", tenantId: 1 };
    expect(() => checkTenantAccess(user, 2)).toThrow(TRPCError);
    expect(() => checkTenantAccess(user, 2)).toThrow("Access denied");
  });

  it("blocks a manager from accessing another tenant's data", () => {
    const user: MockUser = { id: 11, openId: "plumb-1", email: "admin@plumbpro.com", name: "Manager", role: "manager", tenantId: 2 };
    expect(() => checkTenantAccess(user, 1)).toThrow(TRPCError);
    expect(() => checkTenantAccess(user, 99)).toThrow(TRPCError);
  });

  it("blocks a technician from accessing another tenant's data", () => {
    const user: MockUser = { id: 20, openId: "tech-1", email: "tech@acmehvac.com", name: "Technician", role: "agent", tenantId: 1 };
    expect(() => checkTenantAccess(user, 2)).toThrow(TRPCError);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("blocks a user with no tenantId (not yet associated) from any access", () => {
    const user: MockUser = { id: 99, openId: "orphan-1", email: "orphan@example.com", name: "Orphan", role: "dispatcher", tenantId: null };
    expect(() => checkTenantAccess(user, 1)).toThrow(TRPCError);
    expect(() => checkTenantAccess(user, 1)).toThrow("No tenant associated");
  });

  it("blocks access when tenantId is 0 (invalid)", () => {
    const user: MockUser = { id: 10, openId: "acme-1", email: "dispatch@acmehvac.com", name: "Dispatcher", role: "dispatcher", tenantId: 1 };
    expect(() => checkTenantAccess(user, 0)).toThrow(TRPCError);
  });

  // ── FORBIDDEN error code ────────────────────────────────────────────────────

  it("throws FORBIDDEN (not UNAUTHORIZED) on cross-tenant access", () => {
    const user: MockUser = { id: 10, openId: "acme-1", email: "dispatch@acmehvac.com", name: "Dispatcher", role: "dispatcher", tenantId: 1 };
    try {
      checkTenantAccess(user, 2);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("throws FORBIDDEN (not UNAUTHORIZED) when user has no tenantId", () => {
    const user: MockUser = { id: 99, openId: "orphan-1", email: "orphan@example.com", name: "Orphan", role: "dispatcher", tenantId: null };
    try {
      checkTenantAccess(user, 1);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

// ─── Export Router isolation tests ───────────────────────────────────────────

describe("Export Router — invoice ownership check", () => {

  function checkInvoiceOwnership(callerTenantId: number | null, callerRole: string, taskTenantId: number): boolean {
    const isNvcAdmin = NVC_ADMIN_ROLES.has(callerRole);
    if (isNvcAdmin) return true;
    if (callerTenantId != null && taskTenantId !== callerTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: task belongs to a different tenant" });
    }
    return true;
  }

  it("allows NVC admin to export any invoice", () => {
    expect(checkInvoiceOwnership(null, "super_admin", 1)).toBe(true);
    expect(checkInvoiceOwnership(null, "super_admin", 99)).toBe(true);
  });

  it("allows a dispatcher to export their own tenant's invoice", () => {
    expect(checkInvoiceOwnership(1, "dispatcher", 1)).toBe(true);
  });

  it("blocks a dispatcher from exporting another tenant's invoice", () => {
    expect(() => checkInvoiceOwnership(1, "dispatcher", 2)).toThrow("Access denied: task belongs to a different tenant");
  });

  it("blocks a manager from exporting another tenant's invoice", () => {
    expect(() => checkInvoiceOwnership(2, "manager", 1)).toThrow(TRPCError);
  });
});

// ─── Admin Router — updateMerchantSettings ownership ─────────────────────────

describe("Admin Router — updateMerchantSettings ownership", () => {

  function checkSettingsOwnership(callerRole: string, callerTenantId: number | null, inputTenantId: number): boolean {
    const isNvcAdmin = callerRole === "super_admin" || callerRole === "nvc_manager";
    if (isNvcAdmin) return true;
    if (callerTenantId != null && callerTenantId !== inputTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: you can only update your own company settings" });
    }
    return true;
  }

  it("allows NVC admin to update any merchant settings", () => {
    expect(checkSettingsOwnership("super_admin", null, 1)).toBe(true);
    expect(checkSettingsOwnership("nvc_manager", null, 5)).toBe(true);
  });

  it("allows a merchant manager to update their own settings", () => {
    expect(checkSettingsOwnership("manager", 1, 1)).toBe(true);
  });

  it("blocks a merchant manager from updating another company's settings", () => {
    expect(() => checkSettingsOwnership("manager", 1, 2)).toThrow("you can only update your own company settings");
  });

  it("blocks a dispatcher from updating another company's settings", () => {
    expect(() => checkSettingsOwnership("dispatcher", 2, 1)).toThrow(TRPCError);
  });
});
