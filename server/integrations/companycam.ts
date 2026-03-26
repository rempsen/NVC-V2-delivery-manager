/**
 * CompanyCam Integration
 * OAuth 2.0 + REST API for photo project management.
 * Syncs work order photos with CompanyCam projects.
 * Docs: https://docs.companycam.com/docs/getting-started
 */

import * as oauth from "./oauth-framework";

const INTEGRATION_KEY = "companycam";
const CLIENT_ID = process.env.COMPANYCAM_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.COMPANYCAM_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.COMPANYCAM_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/oauth/companycam/callback`;

const AUTH_URL = "https://app.companycam.com/oauth/authorize";
const TOKEN_URL = "https://app.companycam.com/oauth/token";
const API_BASE = "https://api.companycam.com/v2";

const SCOPES = ["read", "write", "destroy"];

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getAuthorizationUrl(tenantId: number): string {
  const state = oauth.createOAuthState({ tenantId, integrationKey: INTEGRATION_KEY, nonce: "" });
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
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

  if (!res.ok) throw new Error(`CompanyCam token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;

  await oauth.storeTokens(stateData.tenantId, INTEGRATION_KEY, {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresAt: data.expires_in
      ? new Date(Date.now() + (data.expires_in as number) * 1000)
      : undefined,
  });

  return { tenantId: stateData.tenantId };
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function ccFetch(tenantId: number, path: string, options: RequestInit = {}) {
  const token = await oauth.getValidAccessToken(tenantId, INTEGRATION_KEY, TOKEN_URL, CLIENT_ID, CLIENT_SECRET);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`CompanyCam API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(
  tenantId: number,
  params: {
    name: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country?: string;
    };
    jobRef?: string;
  },
) {
  const body: Record<string, unknown> = {
    project: {
      name: params.name,
      external_id: params.jobRef,
    },
  };

  if (params.address) {
    body.project = {
      ...(body.project as Record<string, unknown>),
      address: {
        street_address_1: params.address.street,
        city: params.address.city,
        state: params.address.state,
        postal_code: params.address.zip,
        country: params.address.country ?? "US",
      },
    };
  }

  const result = await ccFetch(tenantId, "/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.project ?? result;
}

export async function listProjects(tenantId: number, page = 1) {
  return ccFetch(tenantId, `/projects?page=${page}&per_page=25`);
}

export async function getProject(tenantId: number, projectId: string) {
  return ccFetch(tenantId, `/projects/${projectId}`);
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export async function getProjectPhotos(tenantId: number, projectId: string, page = 1) {
  return ccFetch(tenantId, `/projects/${projectId}/photos?page=${page}&per_page=50`);
}

export async function createPhotoFromUrl(
  tenantId: number,
  projectId: string,
  photoUrl: string,
  caption?: string,
) {
  const body = {
    photo: {
      uri: photoUrl,
      caption,
    },
  };
  return ccFetch(tenantId, `/projects/${projectId}/photos`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Work Order → CompanyCam Project Sync ────────────────────────────────────

export async function syncWorkOrderToProject(
  tenantId: number,
  workOrder: {
    id: number;
    customerName: string;
    jobAddress: string;
    jobRef?: string;
    photoUrls?: string[];
  },
) {
  // Parse address components (best-effort)
  const addressParts = workOrder.jobAddress.split(",").map((s) => s.trim());
  const street = addressParts[0] ?? workOrder.jobAddress;
  const city = addressParts[1] ?? "";
  const stateZip = (addressParts[2] ?? "").split(" ").filter(Boolean);
  const state = stateZip[0] ?? "";
  const zip = stateZip[1] ?? "";

  const project = await createProject(tenantId, {
    name: `${workOrder.customerName} — WO #${workOrder.id}`,
    address: { street, city, state, zip },
    jobRef: workOrder.jobRef ?? String(workOrder.id),
  });

  const projectId = project.id ?? project.project_id;

  // Upload any existing photos
  if (workOrder.photoUrls && workOrder.photoUrls.length > 0) {
    for (const url of workOrder.photoUrls) {
      await createPhotoFromUrl(tenantId, projectId, url).catch(() => null);
    }
  }

  return { projectId, projectUrl: project.url };
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const result = await ccFetch(tenantId, "/users/current");
    const user = result.user ?? result;
    return { connected: true, userName: user.name ?? user.email ?? "CompanyCam User" };
  } catch {
    return { connected: false, userName: null };
  }
}
