/**
 * Twilio Credentials Validation Test
 * Verifies that the configured Twilio Account SID and Auth Token are valid
 * by fetching the account info from the Twilio REST API.
 */
import { describe, it, expect } from "vitest";

describe("Twilio credentials", () => {
  it("should authenticate successfully with the Twilio API", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    expect(accountSid, "TWILIO_ACCOUNT_SID must be set").toBeTruthy();
    expect(authToken, "TWILIO_AUTH_TOKEN must be set").toBeTruthy();
    expect(fromPhone, "TWILIO_PHONE_NUMBER must be set").toBeTruthy();

    // Verify credentials by fetching account info (read-only, no SMS sent)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
    });

    expect(response.status, `Twilio API returned ${response.status} — check credentials`).toBe(200);

    const data = await response.json() as { sid?: string; status?: string; friendly_name?: string };
    expect(data.sid).toBe(accountSid);
    console.log(`✓ Twilio account verified: ${data.friendly_name} (${data.status})`);
    console.log(`✓ From phone: ${fromPhone}`);
  }, 15000);
});
