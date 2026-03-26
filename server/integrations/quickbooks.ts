/**
 * QuickBooks Online Integration
 * OAuth 2.0 + REST API for invoice creation, customer sync, and payment tracking.
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
 */

import * as oauth from "./oauth-framework";

const INTEGRATION_KEY = "quickbooks";
const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/oauth/quickbooks/callback`;

const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const SCOPES = ["com.intuit.quickbooks.accounting"];

// Sandbox vs production base URL
const QB_BASE_URL = process.env.QUICKBOOKS_SANDBOX === "true"
  ? "https://sandbox-quickbooks.api.intuit.com/v3/company"
  : "https://quickbooks.api.intuit.com/v3/company";

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getAuthorizationUrl(tenantId: number): string {
  const state = oauth.createOAuthState({ tenantId, integrationKey: INTEGRATION_KEY, nonce: "" });
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(code: string, realmId: string, state: string) {
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

  if (!res.ok) throw new Error(`QuickBooks token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;

  await oauth.storeTokens(
    stateData.tenantId,
    INTEGRATION_KEY,
    {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
    },
    { realmId },
  );

  return { tenantId: stateData.tenantId, realmId };
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function getRealmId(tenantId: number): Promise<string> {
  const integrations = await import("../db").then((db) => db.getIntegrationsByTenant(tenantId));
  const config = integrations.find((i: any) => i.integrationKey === INTEGRATION_KEY);
  if (!config?.config) throw new Error("QuickBooks realm ID not found");
  const parsed = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  return parsed.realmId as string;
}

async function qbFetch(tenantId: number, path: string, options: RequestInit = {}) {
  const token = await oauth.getValidAccessToken(tenantId, INTEGRATION_KEY, TOKEN_URL, CLIENT_ID, CLIENT_SECRET);
  const realmId = await getRealmId(tenantId);
  const url = `${QB_BASE_URL}/${realmId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`QuickBooks API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Customer Sync ────────────────────────────────────────────────────────────

export async function createOrFindCustomer(
  tenantId: number,
  customer: { displayName: string; email?: string; phone?: string },
) {
  // Search for existing customer
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${customer.displayName}' MAXRESULTS 1`);
  const searchResult = await qbFetch(tenantId, `/query?query=${query}&minorversion=65`);
  const existing = searchResult?.QueryResponse?.Customer?.[0];
  if (existing) return existing;

  // Create new customer
  const body: Record<string, unknown> = { DisplayName: customer.displayName };
  if (customer.email) body.PrimaryEmailAddr = { Address: customer.email };
  if (customer.phone) body.PrimaryPhone = { FreeFormNumber: customer.phone };

  const result = await qbFetch(tenantId, "/customer?minorversion=65", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.Customer;
}

// ─── Invoice Creation ─────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  itemName?: string;
}

export async function createInvoice(
  tenantId: number,
  params: {
    customerId: string;
    customerRef: string;
    lines: InvoiceLineItem[];
    dueDate?: string;
    memo?: string;
    jobRef?: string;
  },
) {
  const lines = params.lines.map((line, i) => ({
    Id: String(i + 1),
    Amount: (line.unitPriceCents * line.quantity) / 100,
    DetailType: "SalesItemLineDetail",
    Description: line.description,
    SalesItemLineDetail: {
      Qty: line.quantity,
      UnitPrice: line.unitPriceCents / 100,
    },
  }));

  const body: Record<string, unknown> = {
    CustomerRef: { value: params.customerId, name: params.customerRef },
    Line: lines,
    PrivateNote: params.memo ?? `NVC360 Job Ref: ${params.jobRef ?? "N/A"}`,
  };
  if (params.dueDate) body.DueDate = params.dueDate;

  const result = await qbFetch(tenantId, "/invoice?minorversion=65", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.Invoice;
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
  const customer = await createOrFindCustomer(tenantId, {
    displayName: workOrder.customerName,
    email: workOrder.customerEmail,
    phone: workOrder.customerPhone,
  });

  return createInvoice(tenantId, {
    customerId: customer.Id,
    customerRef: customer.DisplayName,
    lines: [
      {
        description: workOrder.description,
        quantity: 1,
        unitPriceCents: workOrder.totalCents,
      },
    ],
    memo: `NVC360 Work Order${workOrder.jobRef ? ` #${workOrder.jobRef}` : ""}`,
    jobRef: workOrder.jobRef,
    dueDate: workOrder.completedAt
      ? new Date(workOrder.completedAt).toISOString().split("T")[0]
      : undefined,
  });
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const result = await qbFetch(tenantId, "/companyinfo/1?minorversion=65");
    return { connected: true, companyName: result?.CompanyInfo?.CompanyName ?? "QuickBooks" };
  } catch {
    return { connected: false, companyName: null };
  }
}
