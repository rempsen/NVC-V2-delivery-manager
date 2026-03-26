import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      }),
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Returns public client configuration (safe to expose to browser).
   * Includes API keys that are browser-restricted (HTTP referrer / origin).
   */
  getPublicConfig: publicProcedure.query(() => ({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  })),
});
