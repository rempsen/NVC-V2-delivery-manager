import { describe, it, expect } from "vitest";

/**
 * Credential validation tests for Google Maps API key and Twilio credentials.
 * These tests make lightweight API calls to verify the credentials are valid.
 */

describe("Google Maps API Key", () => {
  it("should return a valid response from Distance Matrix API", async () => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    expect(apiKey, "GOOGLE_MAPS_API_KEY must be set").toBeTruthy();

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=49.8951,-97.1384&destinations=49.8851,-97.1484&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as { status: string };

    expect(res.ok).toBe(true);
    expect(data.status).toBe("OK");
  });
});

describe("Twilio Credentials", () => {
  it("should authenticate with Twilio and return account info", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    expect(accountSid, "TWILIO_ACCOUNT_SID must be set").toBeTruthy();
    expect(authToken, "TWILIO_AUTH_TOKEN must be set").toBeTruthy();

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: { Authorization: `Basic ${credentials}` },
      }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { sid: string; status: string };
    expect(data.sid).toBe(accountSid);
    expect(data.status).toBe("active");
  });
});
