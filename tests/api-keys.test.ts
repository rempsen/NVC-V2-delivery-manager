/**
 * API Key Validation Tests
 * Validates that the Mapbox, Google Maps, and other API keys are correctly configured
 * and can reach their respective endpoints.
 */
import { describe, it, expect } from "vitest";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

describe("API Key Validation", () => {
  it("GOOGLE_MAPS_API_KEY environment variable is set", () => {
    expect(GOOGLE_MAPS_API_KEY).toBeTruthy();
    expect(GOOGLE_MAPS_API_KEY).toMatch(/^AIza/);
  });

  it("MAPBOX_ACCESS_TOKEN environment variable is set", () => {
    expect(MAPBOX_ACCESS_TOKEN).toBeTruthy();
    expect(typeof MAPBOX_ACCESS_TOKEN).toBe("string");
    expect(MAPBOX_ACCESS_TOKEN!.length).toBeGreaterThan(10);
    expect(MAPBOX_ACCESS_TOKEN).toMatch(/^pk\./);
  });

  it("Mapbox token resolves a geocode request", async () => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/Winnipeg.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const data = await res.json() as { features?: unknown[] };
    expect(data.features).toBeDefined();
    expect((data.features ?? []).length).toBeGreaterThan(0);
  }, 15_000);

  it("Google Maps Distance Matrix API returns a valid response", async () => {
    const origin = "Winnipeg,MB,Canada";
    const destination = "Brandon,MB,Canada";
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const data = await res.json() as { status?: string; rows?: { elements?: { status?: string }[] }[] };
    expect(data.status).not.toBe("REQUEST_DENIED");
    expect(data.status).toBe("OK");
    const element = data.rows?.[0]?.elements?.[0];
    expect(element?.status).toBe("OK");
  }, 15_000);

  it("Google Maps API key reaches Geocoding endpoint", async () => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Winnipeg,MB&key=${GOOGLE_MAPS_API_KEY}`,
      { method: "GET" }
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { status?: string };
    expect(data.status).not.toBe("REQUEST_DENIED");
    expect(data.status).not.toBe("INVALID_REQUEST");
    expect(data.status).toBe("OK");
  }, 15_000);

  // Gemini and OAuth tests — only run if keys are present
  it("GEMINI_API_KEY environment variable is set (if configured)", () => {
    if (!GEMINI_API_KEY) return; // skip gracefully if not yet configured
    expect(typeof GEMINI_API_KEY).toBe("string");
    expect(GEMINI_API_KEY.length).toBeGreaterThan(10);
  });

  it("GOOGLE_OAUTH_CLIENT_ID is set and has correct format (if configured)", () => {
    if (!GOOGLE_OAUTH_CLIENT_ID) return; // skip gracefully if not yet configured
    expect(GOOGLE_OAUTH_CLIENT_ID).toMatch(/\.apps\.googleusercontent\.com$/);
  });
});
