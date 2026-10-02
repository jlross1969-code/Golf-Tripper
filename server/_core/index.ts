import "dotenv/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ENV } from "./env";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPasswordAuthRoutes } from "../passwordAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerPdfRoutes } from "../pdfRoutes";
import { registerUploadRoutes } from "../uploadRoutes";
import { registerScheduledTripEventRoutes } from "../scheduledTripEvents";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

function assertRequiredEnv() {
  if (!ENV.isProduction) return;
  const missing = [["JWT_SECRET", ENV.cookieSecret], ["DATABASE_URL", ENV.databaseUrl]].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
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
  assertRequiredEnv();
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false, frameguard: false }));
  // File uploads go through multer with their own limits, so JSON bodies stay small.
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // Cookies are SameSite=None, so reject cross-origin state-changing requests
  // (multipart uploads are "simple" requests and would otherwise be forgeable).
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Cross-origin request blocked" });
      } catch {
        return res.status(403).json({ error: "Invalid origin" });
      }
    }
    next();
  });
  app.use("/api/trpc", rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }));
  app.use("/api/upload", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPasswordAuthRoutes(app);
  registerPdfRoutes(app);
  registerUploadRoutes(app);
  registerScheduledTripEventRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
