/**
 * SMTP Connection Validation Test
 * Verifies that the SMTP credentials in env vars can establish a real connection.
 */
import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Connection", () => {
  it("should connect to SMTP server and verify credentials", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL;

    // If no credentials provided, skip gracefully
    if (!host || !user || !pass) {
      console.log("⚠️  SMTP credentials not configured — skipping connection test");
      expect(true).toBe(true);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // verify() throws if credentials are wrong or server unreachable
    await expect(transporter.verify()).resolves.toBe(true);
    console.log(`✅ SMTP connected: ${user}@${host}:${port} (from: ${fromEmail})`);
  }, 20000);
});
