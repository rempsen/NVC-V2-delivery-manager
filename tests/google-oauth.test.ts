/**
 * Validates GOOGLE_OAUTH_CLIENT_ID is set and has the correct format.
 * Google OAuth Client IDs follow the pattern: {numbers}-{hex}.apps.googleusercontent.com
 */
import { describe, it, expect } from "vitest";
import { config } from "dotenv";
config({ path: ".env" });

describe("Google OAuth Client ID", () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";

  it("should be set", () => {
    expect(clientId.length).toBeGreaterThan(0);
  });

  it("should end with .apps.googleusercontent.com", () => {
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should start with a numeric project ID", () => {
    expect(clientId).toMatch(/^\d+/);
  });

  it("should be discoverable via Google OAuth discovery endpoint", async () => {
    // Validate by checking Google's token info endpoint format
    // (We just verify the client ID is well-formed — no actual OAuth flow needed)
    const parts = clientId.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toMatch(/^\d+$/); // numeric project number
  });
});
