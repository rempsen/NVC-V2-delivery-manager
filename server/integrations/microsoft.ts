/**
 * Microsoft Integration (Office 365 / Outlook / Teams)
 * OAuth 2.0 with Microsoft Identity Platform (MSAL).
 * Supports: Outlook Calendar sync, Outlook email notifications, Office 365 contacts.
 * Docs: https://learn.microsoft.com/en-us/graph/overview
 */

import * as oauth from "./oauth-framework";

const INTEGRATION_KEY = "microsoft";
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET ?? "";
const TENANT_ID_MS = process.env.MICROSOFT_TENANT_ID ?? "common"; // "common" for multi-tenant
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/oauth/microsoft/callback`;

const AUTH_URL = `https://login.microsoftonline.com/${TENANT_ID_MS}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID_MS}/oauth2/v2.0/token`;
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "Contacts.ReadWrite",
  "Mail.Send",
  "User.Read",
];

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getAuthorizationUrl(tenantId: number): string {
  const state = oauth.createOAuthState({ tenantId, integrationKey: INTEGRATION_KEY, nonce: "" });
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
    response_mode: "query",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(code: string, state: string) {
  const stateData = oauth.consumeOAuthState(state);
  if (!stateData) throw new Error("Invalid or expired OAuth state");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: SCOPES.join(" "),
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;

  // Get user profile
  const profileRes = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  await oauth.storeTokens(
    stateData.tenantId,
    INTEGRATION_KEY,
    {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
    },
    {
      userEmail: profile.mail ?? profile.userPrincipalName ?? "",
      displayName: profile.displayName ?? "",
      userId: profile.id ?? "",
    },
  );

  return { tenantId: stateData.tenantId, email: profile.mail ?? profile.userPrincipalName };
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function graphFetch(tenantId: number, path: string, options: RequestInit = {}) {
  const token = await oauth.getValidAccessToken(tenantId, INTEGRATION_KEY, TOKEN_URL, CLIENT_ID, CLIENT_SECRET);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Microsoft Graph error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  subject: string;
  body?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  location?: string;
  attendeeEmails?: string[];
  isAllDay?: boolean;
}

export async function createCalendarEvent(tenantId: number, event: CalendarEvent) {
  const body: Record<string, unknown> = {
    subject: event.subject,
    body: { contentType: "HTML", content: event.body ?? "" },
    start: { dateTime: event.start, timeZone: "UTC" },
    end: { dateTime: event.end, timeZone: "UTC" },
    isAllDay: event.isAllDay ?? false,
  };

  if (event.location) body.location = { displayName: event.location };
  if (event.attendeeEmails && event.attendeeEmails.length > 0) {
    body.attendees = event.attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    }));
  }

  return graphFetch(tenantId, "/me/events", { method: "POST", body: JSON.stringify(body) });
}

export async function listCalendarEvents(tenantId: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    startDateTime: startDate,
    endDateTime: endDate,
    $select: "id,subject,start,end,location,bodyPreview",
    $orderby: "start/dateTime",
    $top: "50",
  });
  return graphFetch(tenantId, `/me/calendarView?${params.toString()}`);
}

export async function deleteCalendarEvent(tenantId: number, eventId: string) {
  return graphFetch(tenantId, `/me/events/${eventId}`, { method: "DELETE" });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function listContacts(tenantId: number, top = 50) {
  return graphFetch(tenantId, `/me/contacts?$top=${top}&$select=id,displayName,emailAddresses,mobilePhone,businessPhones`);
}

export async function createContact(
  tenantId: number,
  contact: { displayName: string; email?: string; phone?: string; company?: string },
) {
  const body: Record<string, unknown> = { displayName: contact.displayName };
  if (contact.email) body.emailAddresses = [{ address: contact.email, name: contact.displayName }];
  if (contact.phone) body.mobilePhone = contact.phone;
  if (contact.company) body.companyName = contact.company;
  return graphFetch(tenantId, "/me/contacts", { method: "POST", body: JSON.stringify(body) });
}

// ─── Email (Outlook) ──────────────────────────────────────────────────────────

export async function sendEmail(
  tenantId: number,
  params: {
    toEmail: string;
    toName?: string;
    subject: string;
    htmlBody: string;
    saveToSentItems?: boolean;
  },
) {
  const body = {
    message: {
      subject: params.subject,
      body: { contentType: "HTML", content: params.htmlBody },
      toRecipients: [
        {
          emailAddress: {
            address: params.toEmail,
            name: params.toName ?? params.toEmail,
          },
        },
      ],
    },
    saveToSentItems: params.saveToSentItems ?? true,
  };
  return graphFetch(tenantId, "/me/sendMail", { method: "POST", body: JSON.stringify(body) });
}

// ─── Work Order → Calendar Event Sync ────────────────────────────────────────

export async function syncWorkOrderToCalendar(
  tenantId: number,
  workOrder: {
    id: number;
    customerName: string;
    jobAddress: string;
    description?: string;
    scheduledAt?: string;
    technicianName?: string;
    customerEmail?: string;
  },
) {
  const start = workOrder.scheduledAt ?? new Date().toISOString();
  const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2h default

  const attendees = workOrder.customerEmail ? [workOrder.customerEmail] : [];

  return createCalendarEvent(tenantId, {
    subject: `Work Order #${workOrder.id} — ${workOrder.customerName}`,
    body: `
      <p><strong>Customer:</strong> ${workOrder.customerName}</p>
      <p><strong>Address:</strong> ${workOrder.jobAddress}</p>
      ${workOrder.technicianName ? `<p><strong>Technician:</strong> ${workOrder.technicianName}</p>` : ""}
      ${workOrder.description ? `<p><strong>Notes:</strong> ${workOrder.description}</p>` : ""}
    `,
    start,
    end,
    location: workOrder.jobAddress,
    attendeeEmails: attendees,
  });
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const result = await graphFetch(tenantId, "/me?$select=displayName,mail,userPrincipalName");
    return {
      connected: true,
      displayName: result?.displayName ?? "Microsoft User",
      email: result?.mail ?? result?.userPrincipalName ?? "",
    };
  } catch {
    return { connected: false, displayName: null, email: null };
  }
}
