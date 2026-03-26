/**
 * Twilio SMS Helper — NVC360 2.0
 *
 * Sends real SMS messages via the Twilio REST API.
 * Credentials are read from:
 *   1. The tenant record (twilioAccountSid, twilioAuthToken, twilioPhoneNumber)
 *   2. Environment variables as fallback (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
 *
 * If no credentials are found, the call is a no-op (logs a warning).
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

/**
 * Resolve Twilio credentials from tenant record or environment variables.
 */
export function resolveTwilioCredentials(tenant?: {
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
} | null): TwilioCredentials | null {
  const accountSid = tenant?.twilioAccountSid ?? process.env.TWILIO_ACCOUNT_SID ?? "";
  const authToken = tenant?.twilioAuthToken ?? process.env.TWILIO_AUTH_TOKEN ?? "";
  const fromPhone = tenant?.twilioPhoneNumber ?? process.env.TWILIO_PHONE_NUMBER ?? "";

  if (!accountSid || !authToken || !fromPhone) return null;
  return { accountSid, authToken, fromPhone };
}

/**
 * Send an SMS via Twilio REST API.
 * Returns true on success, false on failure (non-throwing).
 */
export async function sendTwilioSms(
  to: string,
  body: string,
  credentials: TwilioCredentials,
): Promise<boolean> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: to,
      From: credentials.fromPhone,
      Body: body,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Twilio] SMS failed (${response.status}):`, errText);
      return false;
    }

    const data = await response.json() as { sid?: string; status?: string };
    console.log(`[Twilio] SMS sent: SID=${data.sid} status=${data.status} to=${to}`);
    return true;
  } catch (err) {
    console.error("[Twilio] sendTwilioSms error:", err);
    return false;
  }
}

/**
 * Convenience: send SMS if credentials are available, otherwise log a warning.
 * Always non-throwing.
 */
export async function sendSmsIfConfigured(
  to: string,
  body: string,
  credentials: TwilioCredentials | null,
): Promise<void> {
  if (!credentials) {
    console.warn(`[Twilio] No credentials configured — SMS not sent to ${to}`);
    return;
  }
  await sendTwilioSms(to, body, credentials);
}
