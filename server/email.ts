/**
 * NVC360 Email Module
 *
 * Sends transactional emails via SMTP (nodemailer).
 * Credentials are resolved from:
 *   1. Per-tenant settings stored in DB (smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName)
 *   2. Platform-level env vars as fallback (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME)
 */

import nodemailer from "nodemailer";

export interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Resolve SMTP credentials: tenant settings first, then platform env vars.
 * Returns null if no credentials are available.
 */
export function resolveSmtpCredentials(tenant?: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
}): SmtpCredentials | null {
  const host = tenant?.smtpHost || process.env.SMTP_HOST || "";
  const port = tenant?.smtpPort || parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = tenant?.smtpUser || process.env.SMTP_USER || "";
  const password = tenant?.smtpPassword || process.env.SMTP_PASSWORD || "";
  const fromEmail = tenant?.fromEmail || process.env.SMTP_FROM_EMAIL || "";
  const fromName = tenant?.fromName || process.env.SMTP_FROM_NAME || "NVC360";

  if (!host || !user || !password || !fromEmail) return null;

  return { host, port, user, password, fromEmail, fromName };
}

/**
 * Send an email using the provided SMTP credentials.
 * Throws on failure so callers can surface the error to the user.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  creds: SmtpCredentials,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.port === 465,
    auth: {
      user: creds.user,
      pass: creds.password,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs for on-prem mail servers
    },
  });

  await transporter.sendMail({
    from: `"${creds.fromName}" <${creds.fromEmail}>`,
    to,
    subject,
    html,
  });
}

/**
 * Send a test email to validate SMTP configuration.
 */
export async function sendTestEmail(
  to: string,
  creds: SmtpCredentials,
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <img src="https://nvc360.com/logo.png" alt="NVC360" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #0052CC; margin: 0 0 8px;">NVC360 2.0 — Email Test</h2>
      <p style="color: #444; line-height: 1.6;">
        Your SMTP integration is working correctly. Transactional emails (job confirmations,
        technician assignments, ETA updates, and completion summaries) will be delivered
        from <strong>${creds.fromEmail}</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ba1a6; font-size: 12px;">
        Sent by NVC360 2.0 · Field Service Management Platform
      </p>
    </div>
  `;
  await sendEmail(to, "NVC360 2.0 — Test Email", html, creds);
}
