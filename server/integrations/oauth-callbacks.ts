/**
 * OAuth Callback Routes for Third-Party Integrations
 *
 * Each provider redirects back to /api/oauth/{provider}/callback after authorization.
 * These routes exchange the code for tokens and store them via the connector modules.
 */

import type { Express } from "express";

const SUCCESS_HTML = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name} Connected — NVC360</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh;
           background: #f0f4f8; margin: 0; }
    .card { background: #fff; border-radius: 16px; padding: 40px 48px; text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a2332; font-size: 22px; margin: 0 0 8px; }
    p { color: #687076; font-size: 14px; margin: 0 0 24px; }
    .close-btn { background: #0a7ea4; color: #fff; border: none; border-radius: 10px;
                 padding: 12px 28px; font-size: 15px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>${name} Connected</h1>
    <p>Your ${name} account has been successfully connected to NVC360. You can close this window.</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
  </div>
  <script>
    // Notify the opener window if available
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_success', provider: '${name.toLowerCase()}' }, '*');
      setTimeout(() => window.close(), 1500);
    }
  </script>
</body>
</html>`;

const ERROR_HTML = (name: string, message: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name} Connection Failed — NVC360</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh;
           background: #f0f4f8; margin: 0; }
    .card { background: #fff; border-radius: 16px; padding: 40px 48px; text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a2332; font-size: 22px; margin: 0 0 8px; }
    p { color: #687076; font-size: 14px; margin: 0 0 24px; }
    .err { color: #ef4444; font-size: 12px; background: #fef2f2; padding: 8px 12px;
           border-radius: 8px; margin-bottom: 20px; }
    .close-btn { background: #687076; color: #fff; border: none; border-radius: 10px;
                 padding: 12px 28px; font-size: 15px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>${name} Connection Failed</h1>
    <div class="err">${message}</div>
    <p>Please close this window and try again.</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
  </div>
</body>
</html>`;

export function registerIntegrationCallbacks(app: Express) {
  // ─── QuickBooks ──────────────────────────────────────────────────────────────
  app.get("/api/oauth/quickbooks/callback", async (req, res) => {
    const { code, state, realmId, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.send(ERROR_HTML("QuickBooks", error ?? "Missing authorization code"));
      return;
    }
    try {
      const qb = await import("./quickbooks");
      await qb.handleCallback(code, realmId, state);
      res.send(SUCCESS_HTML("QuickBooks"));
    } catch (err: any) {
      console.error("[OAuth] QuickBooks callback error:", err.message);
      res.send(ERROR_HTML("QuickBooks", err.message ?? "Token exchange failed"));
    }
  });

  // ─── Xero ────────────────────────────────────────────────────────────────────
  app.get("/api/oauth/xero/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.send(ERROR_HTML("Xero", error ?? "Missing authorization code"));
      return;
    }
    try {
      const xero = await import("./xero");
      await xero.handleCallback(code, state);
      res.send(SUCCESS_HTML("Xero"));
    } catch (err: any) {
      console.error("[OAuth] Xero callback error:", err.message);
      res.send(ERROR_HTML("Xero", err.message ?? "Token exchange failed"));
    }
  });

  // ─── CompanyCam ──────────────────────────────────────────────────────────────
  app.get("/api/oauth/companycam/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.send(ERROR_HTML("CompanyCam", error ?? "Missing authorization code"));
      return;
    }
    try {
      const cc = await import("./companycam");
      await cc.handleCallback(code, state);
      res.send(SUCCESS_HTML("CompanyCam"));
    } catch (err: any) {
      console.error("[OAuth] CompanyCam callback error:", err.message);
      res.send(ERROR_HTML("CompanyCam", err.message ?? "Token exchange failed"));
    }
  });

  // ─── Microsoft (Office 365 / Outlook) ───────────────────────────────────────
  app.get("/api/oauth/microsoft/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.send(ERROR_HTML("Microsoft 365", error_description ?? error ?? "Missing authorization code"));
      return;
    }
    try {
      const ms = await import("./microsoft");
      await ms.handleCallback(code, state);
      res.send(SUCCESS_HTML("Microsoft 365"));
    } catch (err: any) {
      console.error("[OAuth] Microsoft callback error:", err.message);
      res.send(ERROR_HTML("Microsoft 365", err.message ?? "Token exchange failed"));
    }
  });

  // ─── Google Calendar ─────────────────────────────────────────────────────────
  app.get("/api/oauth/google-calendar/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.send(ERROR_HTML("Google Calendar", error ?? "Missing authorization code"));
      return;
    }
    try {
      const gcal = await import("./google-calendar");
      await gcal.handleCallback(code, state);
      res.send(SUCCESS_HTML("Google Calendar"));
    } catch (err: any) {
      console.error("[OAuth] Google Calendar callback error:", err.message);
      res.send(ERROR_HTML("Google Calendar", err.message ?? "Token exchange failed"));
    }
  });
}
