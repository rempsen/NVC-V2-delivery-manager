import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP credentials", () => {
  it("should connect to Gmail SMTP with provided credentials", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    expect(host).toBe("smtp.gmail.com");
    expect(port).toBe(587);
    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // STARTTLS on port 587
      auth: { user, pass },
    });

    // verify() opens a connection and checks AUTH — throws if credentials are wrong
    await expect(transporter.verify()).resolves.toBe(true);
    console.log(`✓ SMTP verified: ${user} via ${host}:${port}`);
  }, 15000);
});
