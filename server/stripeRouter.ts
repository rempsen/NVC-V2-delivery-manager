/**
 * Stripe Payment Router
 * Handles payment intent creation, confirmation, and webhook processing.
 * Uses server-side Stripe SDK — secret key never exposed to client.
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// Lazy-load Stripe to avoid crashing if STRIPE_SECRET_KEY is not set
async function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it in Settings → Secrets.");
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
}

export const stripeRouter = router({
  /** Get Stripe publishable key for client-side SDK initialization */
  getPublishableKey: publicProcedure.query(() => {
    const key = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
    return { publishableKey: key, configured: key.startsWith("pk_") };
  }),

  /** Create a PaymentIntent for a work order */
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        amountCents: z.number().min(50), // Stripe minimum is 50 cents
        currency: z.string().default("cad"),
        taskId: z.number().optional(),
        customerEmail: z.string().email().optional(),
        customerName: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const stripe = await getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: input.amountCents,
        currency: input.currency,
        automatic_payment_methods: { enabled: true },
        description: input.description ?? `NVC360 Work Order #${input.taskId ?? ""}`,
        receipt_email: input.customerEmail,
        metadata: {
          taskId: String(input.taskId ?? ""),
          customerName: input.customerName ?? "",
          ...input.metadata,
        },
      });
      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
      };
    }),

  /** Retrieve a PaymentIntent status (for polling after redirect) */
  getPaymentIntent: protectedProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      const stripe = await getStripe();
      const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      return {
        id: intent.id,
        status: intent.status,
        amountCents: intent.amount,
        currency: intent.currency,
        created: intent.created,
      };
    }),

  /** Create a Stripe customer for a tenant customer record */
  createCustomer: protectedProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const stripe = await getStripe();
      const customer = await stripe.customers.create({
        email: input.email,
        name: input.name,
        phone: input.phone,
        metadata: input.metadata ?? {},
      });
      return { customerId: customer.id, email: customer.email };
    }),

  /** List recent charges for a tenant (last 20) */
  listCharges: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const stripe = await getStripe();
      const charges = await stripe.charges.list({ limit: input.limit });
      return charges.data.map((c) => ({
        id: c.id,
        amountCents: c.amount,
        currency: c.currency,
        status: c.status,
        description: c.description,
        created: c.created,
        receiptUrl: c.receipt_url,
      }));
    }),

  /** Refund a charge */
  refund: protectedProcedure
    .input(
      z.object({
        chargeId: z.string(),
        amountCents: z.number().optional(), // partial refund if specified
        reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
      }),
    )
    .mutation(async ({ input }) => {
      const stripe = await getStripe();
      const refund = await stripe.refunds.create({
        charge: input.chargeId,
        amount: input.amountCents,
        reason: input.reason,
      });
      return { refundId: refund.id, status: refund.status, amountCents: refund.amount };
    }),
});
