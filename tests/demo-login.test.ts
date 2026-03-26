/**
 * Demo Login Validation Tests
 * Verifies that all four demo accounts can authenticate via the real
 * auth.emailLogin tRPC mutation and receive a valid session token.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";

// Create a caller with a mock context that captures Set-Cookie calls
function createTestCaller() {
  const cookies: Record<string, string> = {};
  const mockCtx = {
    user: null,
    req: {
      headers: { host: "localhost" },
      hostname: "localhost",
      protocol: "http",
    } as any,
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: () => {},
    } as any,
  };
  const caller = appRouter.createCaller(mockCtx as any);
  return { caller, cookies };
}

const DEMO_ACCOUNTS = [
  { email: "admin@nvc360.com",      label: "NVC360 Super Admin" },
  { email: "dispatch@acmehvac.com", label: "Dispatcher" },
  { email: "tech@acmehvac.com",     label: "Field Technician" },
  { email: "admin@plumbpro.com",    label: "Company Admin" },
];

describe("Demo Login — all four accounts", () => {
  for (const account of DEMO_ACCOUNTS) {
    it(`${account.label} (${account.email}) logs in with demo123`, { timeout: 15000 }, async () => {
      const { caller, cookies } = createTestCaller();
      const result = await caller.auth.emailLogin({
        email: account.email,
        password: "demo123",
      });
      expect(result.success).toBe(true);
      // Session cookie must have been set by the server
      const cookieValue = Object.values(cookies)[0];
      expect(cookieValue).toBeTruthy();
      expect(typeof cookieValue).toBe("string");
      expect(cookieValue.length).toBeGreaterThan(20);
    });
  }

  it("rejects wrong password", async () => {
    const { caller } = createTestCaller();
    await expect(
      caller.auth.emailLogin({ email: "admin@nvc360.com", password: "wrongpassword" }),
    ).rejects.toThrow();
  });

  it("rejects unknown email", async () => {
    const { caller } = createTestCaller();
    await expect(
      caller.auth.emailLogin({ email: "unknown@example.com", password: "demo123" }),
    ).rejects.toThrow();
  });
});
