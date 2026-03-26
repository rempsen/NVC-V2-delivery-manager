/**
 * OAuth 2.0 Integration Framework
 * Handles token exchange, refresh, and storage for all OAuth-based integrations.
 * Supports: QuickBooks, Xero, Google Calendar, Microsoft (Outlook/Office 365), CompanyCam
 */

import crypto from "crypto";
import * as db from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OAuthConfig {
  integrationKey: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  rawResponse?: Record<string, unknown>;
}

export interface OAuthState {
  tenantId: number;
  integrationKey: string;
  nonce: string;
  returnTo?: string;
}

// ─── Encryption helpers ───────────────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? "nvc360-default-key-32-chars-long!";

function deriveKey(key: string): Buffer {
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", deriveKey(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptToken(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", deriveKey(ENCRYPTION_KEY), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// ─── State management (in-memory, short-lived) ────────────────────────────────

const pendingStates = new Map<string, { state: OAuthState; expiresAt: number }>();

export function createOAuthState(state: OAuthState): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const stateWithNonce = { ...state, nonce };
  const key = nonce;
  pendingStates.set(key, { state: stateWithNonce, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Prune expired states
  for (const [k, v] of pendingStates.entries()) {
    if (v.expiresAt < Date.now()) pendingStates.delete(k);
  }
  return nonce;
}

export function consumeOAuthState(nonce: string): OAuthState | null {
  const entry = pendingStates.get(nonce);
  if (!entry || entry.expiresAt < Date.now()) return null;
  pendingStates.delete(nonce);
  return entry.state;
}

// ─── Token storage ────────────────────────────────────────────────────────────

export async function storeTokens(
  tenantId: number,
  integrationKey: string,
  tokens: TokenSet,
  extraConfig?: Record<string, unknown>,
) {
  await db.upsertIntegration(tenantId, integrationKey, {
    isConnected: true,
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
    tokenExpiresAt: tokens.expiresAt,
    config: extraConfig ? JSON.stringify(extraConfig) : undefined,
    lastSyncAt: new Date(),
  });
}

export async function getStoredTokens(
  tenantId: number,
  integrationKey: string,
): Promise<TokenSet | null> {
  const integrations = await db.getIntegrationsByTenant(tenantId);
  const config = integrations.find((i: any) => i.integrationKey === integrationKey);
  if (!config || !config.isConnected || !config.accessToken) return null;
  return {
    accessToken: decryptToken(config.accessToken),
    refreshToken: config.refreshToken ? decryptToken(config.refreshToken) : undefined,
    expiresAt: config.tokenExpiresAt ?? undefined,
  };
}

export async function disconnectIntegration(tenantId: number, integrationKey: string) {
  await db.disconnectIntegration(tenantId, integrationKey);
}

// ─── Generic token refresh ────────────────────────────────────────────────────

export async function refreshAccessToken(
  tenantId: number,
  integrationKey: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenSet> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed for ${integrationKey}: ${err}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const tokens: TokenSet = {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + (data.expires_in as number) * 1000)
      : undefined,
  };

  await storeTokens(tenantId, integrationKey, tokens);
  return tokens;
}

// ─── Get valid access token (auto-refresh if needed) ─────────────────────────

export async function getValidAccessToken(
  tenantId: number,
  integrationKey: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const stored = await getStoredTokens(tenantId, integrationKey);
  if (!stored) throw new Error(`${integrationKey} is not connected for tenant ${tenantId}`);

  // Refresh if token expires within 5 minutes
  const needsRefresh = stored.expiresAt && stored.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (needsRefresh && stored.refreshToken) {
    const refreshed = await refreshAccessToken(
      tenantId, integrationKey, tokenUrl, clientId, clientSecret, stored.refreshToken
    );
    return refreshed.accessToken;
  }

  return stored.accessToken;
}
