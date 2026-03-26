/**
 * Export Router
 * Generates PDF and CSV exports for work orders, invoices, and technician reports.
 * Uses jsPDF (lightweight, no native deps) for PDF generation.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(","));
  }
  return lines.join("\n");
}

// ─── Simple PDF builder (plain text layout, no native deps) ──────────────────

function buildPdfBase64(title: string, lines: string[]): string {
  // Build a minimal valid PDF with plain text content
  const now = new Date().toISOString();
  const bodyLines = [`NVC360 — ${title}`, `Generated: ${now}`, "", ...lines];
  const content = bodyLines.join("\n");

  // Encode as a simple text-based PDF using basic PDF structure
  const pdfContent = [
    "%PDF-1.4",
    "1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj",
    "2 0 obj<</Type /Pages /Kids[3 0 R] /Count 1>>endobj",
    `3 0 obj<</Type /Page /Parent 2 0 R /MediaBox[0 0 612 792] /Contents 4 0 R /Resources<</Font<</F1 5 0 R>>>>>>endobj`,
    `4 0 obj<</Length ${content.length + 50}>>`,
    "stream",
    "BT /F1 10 Tf 40 750 Td 12 TL",
    ...bodyLines.map((l) => `(${l.replace(/[()\\]/g, "\\$&")}) Tj T*`),
    "ET",
    "endstream endobj",
    "5 0 obj<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>endobj",
    "xref",
    "0 6",
    "0000000000 65535 f",
    "0000000009 00000 n",
    "0000000058 00000 n",
    "0000000115 00000 n",
    "0000000266 00000 n",
    "0000000360 00000 n",
    "trailer<</Size 6 /Root 1 0 R>>",
    "startxref",
    "450",
    "%%EOF",
  ].join("\n");

  return Buffer.from(pdfContent).toString("base64");
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const exportRouter = router({
  /** Export work orders as CSV */
  workOrdersCsv: protectedProcedure
    .input(z.object({ tenantId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const tasks = await db.getTasksByTenant(input.tenantId, input.status);
      const headers = [
        "ID", "Job Hash", "Status", "Priority", "Customer Name", "Customer Phone",
        "Customer Email", "Job Address", "Technician ID", "Total ($)",
        "Scheduled At", "Completed At", "Created At",
      ];
      const rows = tasks.map((t: any) => [
        t.id, t.jobHash, t.status, t.priority,
        t.customerName, t.customerPhone, t.customerEmail ?? "",
        t.jobAddress, t.technicianId ?? "",
        t.totalCents != null ? (t.totalCents / 100).toFixed(2) : "",
        t.scheduledAt ?? "", t.completedAt ?? "", t.createdAt,
      ]);
      return { csv: toCSV(headers, rows), filename: `work-orders-${Date.now()}.csv` };
    }),

  /** Export work orders as PDF (base64 encoded) */
  workOrdersPdf: protectedProcedure
    .input(z.object({ tenantId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const tasks = await db.getTasksByTenant(input.tenantId, input.status);
      const lines: string[] = [];
      for (const t of tasks as any[]) {
        lines.push(
          `#${t.id} | ${t.status.toUpperCase()} | ${t.customerName} | ${t.jobAddress}`,
          `  Phone: ${t.customerPhone}  |  Priority: ${t.priority}  |  Total: $${t.totalCents != null ? (t.totalCents / 100).toFixed(2) : "N/A"}`,
          `  Scheduled: ${t.scheduledAt ?? "Not set"}  |  Completed: ${t.completedAt ?? "Pending"}`,
          "",
        );
      }
      if (lines.length === 0) lines.push("No work orders found.");
      return {
        pdfBase64: buildPdfBase64("Work Orders Report", lines),
        filename: `work-orders-${Date.now()}.pdf`,
      };
    }),

  /** Export a single work order as PDF invoice */
  invoicePdf: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const task = await db.getTaskById_NVC(input.taskId) as any;
      if (!task) throw new Error("Task not found");
      const lines = [
        `INVOICE`,
        ``,
        `Work Order: #${task.id}`,
        `Job Reference: ${task.orderRef ?? "N/A"}`,
        ``,
        `BILL TO:`,
        `  ${task.customerName}`,
        `  ${task.customerPhone}`,
        `  ${task.customerEmail ?? ""}`,
        ``,
        `SERVICE ADDRESS:`,
        `  ${task.jobAddress}`,
        ``,
        `STATUS: ${task.status?.toUpperCase()}`,
        `PRIORITY: ${task.priority?.toUpperCase()}`,
        ``,
        `DESCRIPTION:`,
        `  ${task.description ?? "No description provided"}`,
        ``,
        `TIME ON SITE: ${task.timeOnSiteMin ?? 0} minutes`,
        `DISTANCE TRAVELED: ${task.distanceTraveledKm ?? 0} km`,
        ``,
        `─────────────────────────────────────`,
        `TOTAL: $${task.totalCents != null ? (task.totalCents / 100).toFixed(2) : "0.00"} CAD`,
        `─────────────────────────────────────`,
        ``,
        `Completed: ${task.completedAt ?? "Pending"}`,
      ];
      return {
        pdfBase64: buildPdfBase64(`Invoice — Work Order #${task.id}`, lines),
        filename: `invoice-${task.id}-${Date.now()}.pdf`,
      };
    }),

  /** Export technician activity report as CSV */
  technicianReportCsv: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const techs = await db.getTechniciansByTenant(input.tenantId) as any[];
      const headers = [
        "ID", "Name", "Email", "Phone", "Status", "Transport",
        "Skills", "Hourly Rate ($)", "Today Minutes Worked",
        "Last Location At", "Clock In At", "Clock Out At",
      ];
      const rows = techs.map((t: any) => {
        const tech = t.tech ?? t;
        const user = t.user ?? {};
        return [
          tech.id,
          user.name ?? `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
          user.email ?? "",
          user.phone ?? "",
          tech.status,
          tech.transportType,
          Array.isArray(tech.skills) ? tech.skills.join("; ") : "",
          tech.hourlyRateCents != null ? (tech.hourlyRateCents / 100).toFixed(2) : "",
          tech.todayMinutesWorked ?? 0,
          tech.lastLocationAt ?? "",
          tech.clockInAt ?? "",
          tech.clockOutAt ?? "",
        ];
      });
      return { csv: toCSV(headers, rows), filename: `technicians-${Date.now()}.csv` };
    }),

  /** Export customer list as CSV */
  customersCsv: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const customers = await db.getCustomersByTenant(input.tenantId) as any[];
      const headers = [
        "ID", "Company", "Contact Name", "Email", "Phone",
        "Mailing Address", "City", "Province", "Postal Code", "Country",
        "Total Jobs", "Total Spent ($)", "Created At",
      ];
      const rows = customers.map((c: any) => [
        c.id, c.company, c.contactName ?? "", c.email ?? "", c.phone ?? "",
        c.mailingStreet ?? "", c.mailingCity ?? "", c.mailingProvince ?? "",
        c.mailingPostalCode ?? "", c.mailingCountry ?? "Canada",
        c.totalJobs ?? 0,
        c.totalSpentCents != null ? (c.totalSpentCents / 100).toFixed(2) : "0.00",
        c.createdAt,
      ]);
      return { csv: toCSV(headers, rows), filename: `customers-${Date.now()}.csv` };
    }),
});
