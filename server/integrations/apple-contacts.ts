/**
 * Apple Contacts Integration
 * Apple uses CardDAV (RFC 6352) for contacts sync — there is no OAuth 2.0 REST API.
 * This connector supports two modes:
 *   1. iCloud CardDAV (requires Apple ID + app-specific password)
 *   2. vCard import/export (file-based, works without credentials)
 *
 * For mobile apps, contacts are accessed directly via expo-contacts (device contacts).
 * This server module handles iCloud CardDAV sync and vCard parsing for the web dashboard.
 *
 * Docs: https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitQuickStart/
 */

import * as oauth from "./oauth-framework";
import * as db from "../db";

const INTEGRATION_KEY = "apple_contacts";
const ICLOUD_CARDDAV_BASE = "https://contacts.icloud.com";

// ─── Connection (App-Specific Password) ──────────────────────────────────────

export async function connect(
  tenantId: number,
  params: { appleId: string; appSpecificPassword: string },
) {
  // Validate credentials by fetching the principal URL
  const credentials = Buffer.from(`${params.appleId}:${params.appSpecificPassword}`).toString("base64");

  // CardDAV discovery: PROPFIND on the root to get the principal URL
  const res = await fetch(`${ICLOUD_CARDDAV_BASE}/`, {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`,
  });

  if (!res.ok && res.status !== 207) {
    throw new Error(`Apple iCloud authentication failed (${res.status}). Check your Apple ID and app-specific password.`);
  }

  // Store encrypted credentials (no OAuth tokens — use access_token field for the basic auth string)
  await db.upsertIntegration(tenantId, INTEGRATION_KEY, {
    isConnected: true,
    accessToken: oauth.encryptToken(credentials),
    config: JSON.stringify({ appleId: params.appleId }),
    lastSyncAt: new Date(),
  });

  return { connected: true, appleId: params.appleId };
}

export async function disconnect(tenantId: number) {
  await db.disconnectIntegration(tenantId, INTEGRATION_KEY);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCredentials(tenantId: number): Promise<string> {
  const integrations = await db.getIntegrationsByTenant(tenantId);
  const config = integrations.find((i: any) => i.integrationKey === INTEGRATION_KEY);
  if (!config?.isConnected || !config.accessToken) {
    throw new Error("Apple Contacts is not connected");
  }
  return oauth.decryptToken(config.accessToken);
}

async function cardDavFetch(
  tenantId: number,
  url: string,
  method: string,
  body?: string,
  extraHeaders?: Record<string, string>,
) {
  const credentials = await getCredentials(tenantId);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml; charset=utf-8",
      ...(extraHeaders ?? {}),
    },
    body,
  });
  return { status: res.status, text: await res.text() };
}

// ─── vCard Parsing ────────────────────────────────────────────────────────────

export interface ParsedContact {
  uid?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  note?: string;
}

export function parseVCard(vcard: string): ParsedContact {
  const lines = vcard.replace(/\r\n /g, "").replace(/\r\n/g, "\n").split("\n");
  const contact: ParsedContact = {};

  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    const baseKey = key.split(";")[0].toUpperCase();

    switch (baseKey) {
      case "UID": contact.uid = value; break;
      case "FN": contact.fullName = value; break;
      case "N": {
        const parts = value.split(";");
        contact.lastName = parts[0] ?? "";
        contact.firstName = parts[1] ?? "";
        break;
      }
      case "EMAIL": if (!contact.email) contact.email = value; break;
      case "TEL": if (!contact.phone) contact.phone = value; break;
      case "ORG": contact.organization = value.split(";")[0]; break;
      case "NOTE": contact.note = value; break;
    }
  }

  return contact;
}

export function parseVCardFile(content: string): ParsedContact[] {
  const cards = content.split(/BEGIN:VCARD/i).filter((c) => c.includes("END:VCARD"));
  return cards.map((card) => parseVCard("BEGIN:VCARD" + card.split("END:VCARD")[0] + "END:VCARD"));
}

// ─── vCard Generation ─────────────────────────────────────────────────────────

export function generateVCard(contact: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  note?: string;
}): string {
  const uid = `nvc360-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `UID:${uid}`,
    `N:${contact.lastName ?? ""};${contact.firstName};;;`,
    `FN:${contact.firstName}${contact.lastName ? " " + contact.lastName : ""}`,
  ];
  if (contact.email) lines.push(`EMAIL;type=INTERNET;type=HOME:${contact.email}`);
  if (contact.phone) lines.push(`TEL;type=CELL:${contact.phone}`);
  if (contact.organization) lines.push(`ORG:${contact.organization}`);
  if (contact.note) lines.push(`NOTE:${contact.note}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

// ─── Sync: Import contacts from vCard file ────────────────────────────────────

export async function importVCardFile(
  tenantId: number,
  vcardContent: string,
): Promise<{ imported: number; contacts: ParsedContact[] }> {
  const contacts = parseVCardFile(vcardContent);

  // Store contacts as NVC360 customers
  let imported = 0;
  for (const contact of contacts) {
    if (!contact.fullName && !contact.firstName) continue;
    try {
      await db.createCustomer({
        tenantId,
        name: contact.fullName ?? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim(),
        email: contact.email,
        phone: contact.phone,
        notes: contact.note,
      } as any);
      imported++;
    } catch {
      // Skip duplicates
    }
  }

  return { imported, contacts };
}

// ─── Export NVC360 customers as vCard file ────────────────────────────────────

export async function exportCustomersAsVCard(tenantId: number): Promise<string> {
  const customers = await db.getCustomersByTenant(tenantId);
  const vcards = customers.map((c: any) =>
    generateVCard({
      firstName: (c.name ?? "").split(" ")[0] ?? c.name,
      lastName: (c.name ?? "").split(" ").slice(1).join(" ") || undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      organization: c.company ?? undefined,
      note: c.notes ?? undefined,
    })
  );
  return vcards.join("\r\n");
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getConnectionStatus(tenantId: number) {
  try {
    const integrations = await db.getIntegrationsByTenant(tenantId);
    const config = integrations.find((i: any) => i.integrationKey === INTEGRATION_KEY);
    if (!config?.isConnected) return { connected: false, appleId: null };
    const extra = config.config
      ? (typeof config.config === "string" ? JSON.parse(config.config) : config.config)
      : {};
    return { connected: true, appleId: extra.appleId ?? "iCloud" };
  } catch {
    return { connected: false, appleId: null };
  }
}
