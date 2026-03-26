/**
 * API Key Validation Tests
 * Validates that the Gemini and Google Maps API keys are correctly configured
 * and can reach their respective endpoints.
 */
import { describe, it, expect } from "vitest";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;

describe("API Key Validation", () => {
  it("GEMINI_API_KEY environment variable is set", () => {
    expect(GEMINI_API_KEY).toBeTruthy();
    expect(typeof GEMINI_API_KEY).toBe("string");
    expect(GEMINI_API_KEY!.length).toBeGreaterThan(10);
  });

  it("GOOGLE_MAPS_API_KEY environment variable is set", () => {
    expect(GOOGLE_MAPS_API_KEY).toBeTruthy();
    expect(GOOGLE_MAPS_API_KEY).toMatch(/^AIza/);
  });

  it("GOOGLE_OAUTH_CLIENT_ID is set and has correct format", () => {
    expect(GOOGLE_OAUTH_CLIENT_ID).toBeTruthy();
    expect(GOOGLE_OAUTH_CLIENT_ID).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("Gemini API key reaches Google AI endpoint", async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      { method: "GET" }
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
  }, 15_000);

  it("Google Maps API key reaches Geocoding endpoint", async () => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Winnipeg,MB&key=${GOOGLE_MAPS_API_KEY}`,
      { method: "GET" }
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    // OK or ZERO_RESULTS both mean the key is valid; REQUEST_DENIED means invalid key
    expect(data.status).not.toBe("REQUEST_DENIED");
    expect(data.status).not.toBe("INVALID_REQUEST");
    // Confirm we actually got a result for Winnipeg
    expect(data.status).toBe("OK");
  }, 15_000);
});
