/**
 * Xero Integration
 * OAuth 2.0 + REST API for invoice creation, contact sync, and payment tracking.
 * Docs: https://developer.xero.com/documentation/api/accounting/invoices
 */

import * as oauth from "./oauth-framework";

const INTEGRATION_KEY = "xero";
const CLIENT_ID = process.env.XERO_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.XERO_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.XERO_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/oauth/xero/callback`;

const AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "offline_access",
];

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getAuthorizationUrl(tenantId: number): string {
  const state = oauth.createOAuthState({ tenantId, integrationKey: INTEGRATION_KEY, nonce: "" });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(code: string, state: string) {
  const stateData = oauth.consumeOAuthState(state);
  if (!stateData) throw new Error("Invalid or expired OAuth state");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Xero token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;

  // Get the tenant (organisation) ID from Xero connections
  const connectionsRes = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/json" },
  });
  const connections = connectionsRes.ok ? await connectionsRes.json() : [];
  const xeroTenantId = Array.isArray(connections) && connections.length > 0
    ? connections[0].tenantId
    : null;

  await oauth.storeTokens(
    stateData.tenantId,
    INTEGRATION_KEY,
    {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
    },
    { xeroTenantId, orgName: connections[0]?.tenantName ?? "Xero" },
  );

  return { tenantId: stateData.tenantId, xeroTenantId };
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function getXeroTenantId(tenantId: number): Promise<string> {
  const integrations = await import("../db").then((db) => db.getIntegrationsByTenant(tenantId));
  const config = integrations.find((i: any) => i.integrationKey === INTEGRATION_KEY);
  if (!config?.config) throw new Error("Xero tenant ID not found");
  const parsed = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  return parsed.xeroTenantId as string;
}

async function xeroFetch(tenantId: number, path: string, options: RequestInit = {}) {
  const token = await oauth.getValidAccessToken(tenantId, INTEGRATION_KEY, TOKEN_URL, CLIENT_ID, CLIENT_SECRET);
  const xeroTenantId = await getXeroTenantId(tenantId);
  const url = `${XERO_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Xero-tenant-id": xeroTenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Xero API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Contact Sync ─────────────────────────────────────────────────────────────

export async function createOrFindContact(
  tenantId: number,
  contact: { name: string; email?: string; phone?: string },
) {
  // Search for existing contact
  const searchRes = await xeroFetch(
    tenantId,
    `/Contacts?where=Name%3D%22${encodeURIComponent(contact.name)}%22`,
  );
  const existing = searchRes?.Contacts?.[0];
  if (existing) return existing;

  // Create new contact
  const body: Record<string, unknown> = { Name: contact.name };
  if (contact.email) body.EmailAddress = contact.email;
  if (contact.phone) body.Phones = [{ PhoneType: "DEFAULT", PhoneNumber: contact.phone }];

  const result = await xeroFetch(tenantId, "/Contacts", {
    method: "POST",
    body: JSON.stringify({ Contacts: [body] }),
  });
  return result.Contacts?.[0];
}

// ─── Invoice Creation ─────────────────────────────────────────────────────────

export interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmountCents: number;
  accountCode?: string;
}

export async function createInvoice(
  tenantId: number,
  params: {
    contactId: string;
    contactName: string;
    lines: XeroLineItem[];
    dueDate?: string;
    reference?: string;
    status?: "DRAFT" | "SUBMITTED" | "AUTHORISED";
  },
) {
  const lineItems = params.lines.map((line) => ({
    Description: line.description,
    Quantity: line.quantity,
    UnitAmount: line.unitAmountCents / 100,
    AccountCode: line.accountCode ?? "200", // Default revenue account
  }));

  const body = {
    Invoices: [
      {
        Type: "ACCREC",
        Contact: { ContactID: params.contactId },
        LineItems: lineItems,
        Date: new Date().toISOString().split("T")[0],
        DueDate: params.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Reference: params.reference ?? "",
        Status: params.status ?? "AUTHORISED",
        LineAmountTypes: "EXCLUSIVE",
      },
    ],
  };

  const result = await xeroFetch(tenantId, "/Invoices", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.Invoices?.[0];
}

// ─── Invoice from Work Order ──────────────────────────────────────────────────

export async function createInvoiceFromWorkOrder(
  tenantId: number,
  workOrder: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    description: string;
    totalCents: number;
    jobRef?: string;
    completedAt?: string;
  },
) {
  const contact = await createOrFindContact(tenantId, {
    name: workOrder.customerName,
    email: workOrder.customerEmail,
    phone: workOrder.customerPhone,
  });

  return createInvoice(tenantId, {
    contactId: contact.ContactID,
    contactName: contact.Name,
    lines: [
      {
        description: workOrder.description,
        quantity: 1,
        unitAmountCents: workOrder.totalCents,
      },
    ],
    reference: workOrder.jobRef,
    dueDate: workOrder.completedAt
      ? new Date(workOrder.completedAt).toISOString().split("T")[0]
      : undefined,
  });
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const result = await xeroFetch(tenantId, "/Organisation");
    const org = result?.Organisations?.[0];
    return { connected: true, orgName: org?.Name ?? "Xero Organisation" };
  } catch {
    return { connected: false, orgName: null };
  }
}
