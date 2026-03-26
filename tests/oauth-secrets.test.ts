/**
 * OAuth Secrets Validation Test
 * Verifies that NVC360's platform-level OAuth credentials are configured
 * for QuickBooks and Google Calendar multi-tenant flows.
 */
import { describe, it, expect } from "vitest";

describe("OAuth Credentials", () => {
  it("QUICKBOOKS_CLIENT_ID should be set", () => {
    const val = process.env.QUICKBOOKS_CLIENT_ID ?? "";
    expect(val.length, "QUICKBOOKS_CLIENT_ID is empty — add it via Settings → Secrets").toBeGreaterThan(5);
  });

  it("QUICKBOOKS_CLIENT_SECRET should be set", () => {
    const val = process.env.QUICKBOOKS_CLIENT_SECRET ?? "";
    expect(val.length, "QUICKBOOKS_CLIENT_SECRET is empty — add it via Settings → Secrets").toBeGreaterThan(5);
  });

  it("GOOGLE_OAUTH_CLIENT_ID should be set (used for Google Calendar)", () => {
    const val = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
    expect(val.length, "GOOGLE_OAUTH_CLIENT_ID is empty — add it via Settings → Secrets").toBeGreaterThan(5);
  });

  it("GOOGLE_OAUTH_CLIENT_SECRET should be set (used for Google Calendar)", () => {
    const val = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
    expect(val.length, "GOOGLE_OAUTH_CLIENT_SECRET is empty — add it via Settings → Secrets").toBeGreaterThan(5);
  });

  it("QuickBooks getAuthorizationUrl should build a valid URL with client_id", async () => {
    const qb = await import("../server/integrations/quickbooks");
    const url = qb.getAuthorizationUrl(1);
    expect(url).toContain("appcenter.intuit.com");
    expect(url).toContain("client_id=");
    // client_id param should not be empty
    const params = new URL(url).searchParams;
    expect(params.get("client_id")?.length ?? 0).toBeGreaterThan(5);
  });

  it("API_BASE_URL should be set so OAuth redirect URIs are correct", () => {
    const val = process.env.API_BASE_URL ?? "";
    expect(val.length, "API_BASE_URL is empty").toBeGreaterThan(5);
    expect(val).toContain("http");
  });

  it("Google Calendar getAuthorizationUrl should build a valid URL with client_id", async () => {
    const gcal = await import("../server/integrations/google-calendar");
    const url = gcal.getAuthorizationUrl(1);
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=");
    const params = new URL(url).searchParams;
    expect(params.get("client_id")?.length ?? 0).toBeGreaterThan(5);
  });
});
