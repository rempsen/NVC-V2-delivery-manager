/**
 * Google Calendar Integration
 * OAuth 2.0 with Google Identity Platform.
 * Supports: Calendar event creation, listing, deletion, and work order sync.
 * Docs: https://developers.google.com/calendar/api/v3/reference
 */

import * as oauth from "./oauth-framework";

const INTEGRATION_KEY = "google_calendar";
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/oauth/google-calendar/callback`;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getAuthorizationUrl(tenantId: number): string {
  const state = oauth.createOAuthState({ tenantId, integrationKey: INTEGRATION_KEY, nonce: "" });
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent", // Force refresh token issuance
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
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Google Calendar token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;

  // Get user profile
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  await oauth.storeTokens(
    stateData.tenantId,
    INTEGRATION_KEY,
    {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      expiresAt: data.expires_in
        ? new Date(Date.now() + (data.expires_in as number) * 1000)
        : undefined,
    },
    {
      email: profile.email ?? "",
      name: profile.name ?? "",
      picture: profile.picture ?? "",
    },
  );

  return { tenantId: stateData.tenantId, email: profile.email };
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function gcalFetch(tenantId: number, path: string, options: RequestInit = {}) {
  const token = await oauth.getValidAccessToken(tenantId, INTEGRATION_KEY, TOKEN_URL, CLIENT_ID, CLIENT_SECRET);
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Google Calendar API error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  attendeeEmails?: string[];
  colorId?: string; // 1-11 Google color IDs
  calendarId?: string; // defaults to "primary"
}

export async function createEvent(tenantId: number, event: GoogleCalendarEvent) {
  const calendarId = event.calendarId ?? "primary";
  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description ?? "",
    start: { dateTime: event.start, timeZone: "UTC" },
    end: { dateTime: event.end, timeZone: "UTC" },
  };

  if (event.location) body.location = event.location;
  if (event.colorId) body.colorId = event.colorId;
  if (event.attendeeEmails && event.attendeeEmails.length > 0) {
    body.attendees = event.attendeeEmails.map((email) => ({ email }));
  }

  return gcalFetch(tenantId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listEvents(
  tenantId: number,
  params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    calendarId?: string;
  } = {},
) {
  const calendarId = params.calendarId ?? "primary";
  const query = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(params.maxResults ?? 50),
  });
  if (params.timeMin) query.set("timeMin", params.timeMin);
  if (params.timeMax) query.set("timeMax", params.timeMax);

  return gcalFetch(tenantId, `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`);
}

export async function deleteEvent(tenantId: number, eventId: string, calendarId = "primary") {
  return gcalFetch(tenantId, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function listCalendars(tenantId: number) {
  return gcalFetch(tenantId, "/users/me/calendarList");
}

// ─── Work Order → Google Calendar Sync ───────────────────────────────────────

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
  const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const attendees = workOrder.customerEmail ? [workOrder.customerEmail] : [];

  return createEvent(tenantId, {
    summary: `Work Order #${workOrder.id} — ${workOrder.customerName}`,
    description: [
      `Customer: ${workOrder.customerName}`,
      `Address: ${workOrder.jobAddress}`,
      workOrder.technicianName ? `Technician: ${workOrder.technicianName}` : null,
      workOrder.description ? `Notes: ${workOrder.description}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    location: workOrder.jobAddress,
    start,
    end,
    attendeeEmails: attendees,
    colorId: "2", // Green for work orders
  });
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const result = await gcalFetch(tenantId, "/users/me/calendarList?maxResults=1");
    const integrations = await import("../db").then((db) => db.getIntegrationsByTenant(tenantId));
    const config = integrations.find((i: any) => i.integrationKey === INTEGRATION_KEY);
    const extra = config?.config
      ? (typeof config.config === "string" ? JSON.parse(config.config) : config.config)
      : {};
    return {
      connected: true,
      email: extra.email ?? "",
      calendarCount: result?.items?.length ?? 0,
    };
  } catch {
    return { connected: false, email: null, calendarCount: 0 };
  }
}
