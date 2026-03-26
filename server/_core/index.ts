import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { rateLimit } from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { registerIntegrationCallbacks } from "../integrations/oauth-callbacks";
import { appRouter } from "../routers";
import { createContext } from "./context";

// ─── Allowed Origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.manus\.computer$/,
  /^https:\/\/.*\.nvc360\.com$/,
];
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
}

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path === "/api/health",
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again in 15 minutes." },
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  // Trust proxy headers from Manus reverse proxy (required for accurate rate limiting)
  app.set("trust proxy", 1);
  const server = createServer(app);

  // ─── Security Headers ─────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // ─── CORS — Whitelist Only ─────────────────────────────────────────────────
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ─── Rate Limiting ──────────────────────────────────────────────────────
  app.use("/api/trpc/auth", authLimiter);
  app.use("/api", generalLimiter);

  registerOAuthRoutes(app);
  registerIntegrationCallbacks(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] Error on ${path}:`, error.message);
        }
      },
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
