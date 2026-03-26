import { describe, it, expect } from "vitest";
import { config } from "dotenv";
config({ path: ".env" });

describe("Twilio Credentials", () => {
  it("TWILIO_ACCOUNT_SID is set and has correct format", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    expect(sid, "TWILIO_ACCOUNT_SID must be set").toBeTruthy();
    // Twilio Account SIDs start with 'AC' followed by 32 hex chars
    expect(sid).toMatch(/^AC[a-f0-9]{32}$/i);
  });

  it("TWILIO_AUTH_TOKEN is set and has correct length", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token, "TWILIO_AUTH_TOKEN must be set").toBeTruthy();
    // Auth tokens are 32 hex characters
    expect(token!.length).toBeGreaterThanOrEqual(32);
  });

  it("TWILIO_PHONE_NUMBER is set and in E.164 format", () => {
    const phone = process.env.TWILIO_PHONE_NUMBER;
    expect(phone, "TWILIO_PHONE_NUMBER must be set").toBeTruthy();
    // E.164 format: +[country code][number]
    expect(phone).toMatch(/^\+[1-9]\d{7,14}$/);
  });

  it("can authenticate with Twilio API and retrieve account info", async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    if (!sid || !token) {
      console.warn("Skipping live Twilio API test — credentials not set");
      return;
    }
    const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${credentials}` },
    });
    expect(res.status, `Twilio API returned ${res.status} — check credentials`).toBe(200);
    const data = await res.json() as any;
    expect(data.sid).toBe(sid);
    expect(data.status).toBe("active");
    console.log(`✅ Twilio account verified: ${data.friendly_name} (${data.status})`);
  });
});
