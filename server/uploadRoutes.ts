import express, { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { tripPlayers, pushSubscriptions, trips, rounds } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createContext } from "./_core/context";
import { TRIP_CHAT_IMAGE_MAX_BYTES, isTripChatImageType } from "../shared/tripChatAttachment";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Use a PDF, JPEG, PNG, or WebP receipt"));
  },
});

const tripDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Use a PDF, DOCX, XLSX, JPEG, or PNG document"));
  },
});

export function registerUploadRoutes(app: express.Application) {
  const router = Router();

  // POST /api/upload/profile-photo
  router.post("/api/upload/profile-photo", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const tripId = parseInt(req.body.tripId as string);
      if (!tripId || isNaN(tripId)) {
        res.status(400).json({ error: "tripId required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database unavailable" });
        return;
      }

      // Verify player is in the trip
      const players = await db
        .select()
        .from(tripPlayers)
        .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, ctx.user.id)));

      if (!players.length) {
        res.status(403).json({ error: "Not a member of this trip" });
        return;
      }

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const key = `profile-photos/${ctx.user.id}-${tripId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

      // Update photoUrl on trip_players
      await db
        .update(tripPlayers)
        .set({ photoUrl: url })
        .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, ctx.user.id)));

      res.json({ url });
    } catch (err) {
      console.error("Profile photo upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // POST /api/upload/trip-logo — admin only, updates trips.logoUrl
  router.post("/api/upload/trip-logo", upload.single("logo"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (ctx.user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
      if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }

      const tripId = parseInt(req.body.tripId as string);
      if (!tripId || isNaN(tripId)) { res.status(400).json({ error: "tripId required" }); return; }

      const db = await getDb();
      if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const key = `trip-logos/trip-${tripId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

      await db.update(trips).set({ logoUrl: url } as any).where(eq(trips.id, tripId));

      res.json({ url });
    } catch (err) {
      console.error("Trip logo upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // POST /api/upload/round-logo — admin only, updates rounds.logoUrl
  router.post("/api/upload/round-logo", upload.single("logo"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (ctx.user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
      if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }

      const roundId = parseInt(req.body.roundId as string);
      if (!roundId || isNaN(roundId)) { res.status(400).json({ error: "roundId required" }); return; }

      const db = await getDb();
      if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const key = `round-logos/round-${roundId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

      await db.update(rounds).set({ logoUrl: url } as any).where(eq(rounds.id, roundId));

      res.json({ url });
    } catch (err) {
      console.error("Round logo upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // POST /api/upload/course-scorecard — admin only, stores an image for AI-assisted extraction.
  router.post("/api/upload/course-scorecard", upload.single("scorecard"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (ctx.user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
      if (!req.file) { res.status(400).json({ error: "No scorecard image provided" }); return; }

      const ext = req.file.mimetype.split("/")[1] || "jpg";
      const key = `course-scorecards/${ctx.user.id}/scorecard-${Date.now()}.${ext}`;
      const stored = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json(stored);
    } catch (err) {
      console.error("Course scorecard upload error:", err);
      res.status(500).json({ error: "Scorecard upload failed" });
    }
  });

  // POST /api/upload/trip-chat-image — a trip member may upload one chat photo.
  router.post("/api/upload/trip-chat-image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (!req.file) { res.status(400).json({ error: "No image provided" }); return; }
      if (!isTripChatImageType(req.file.mimetype)) { res.status(400).json({ error: "Use a JPEG, PNG, WebP, or GIF image" }); return; }
      if (req.file.size <= 0 || req.file.size > TRIP_CHAT_IMAGE_MAX_BYTES) { res.status(400).json({ error: "Use an image smaller than 5 MB" }); return; }
      const tripId = parseInt(req.body.tripId as string, 10);
      if (!tripId || Number.isNaN(tripId)) { res.status(400).json({ error: "tripId required" }); return; }
      const db = await getDb();
      if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }
      const membership = await db.select({ id: tripPlayers.id }).from(tripPlayers).where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, ctx.user.id))).limit(1);
      if (!membership.length) { res.status(403).json({ error: "Not a member of this trip" }); return; }
      const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
      const key = `trip-chat/${tripId}/${ctx.user.id}/${Date.now()}.${extensionByType[req.file.mimetype]}`;
      const stored = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({ key: stored.key, url: stored.url, alt: "Trip chat image" });
    } catch (err) {
      console.error("Trip chat image upload error:", err);
      res.status(500).json({ error: "Image upload failed" });
    }
  });

  // POST /api/upload/trip-expense-receipt — trip financial manager only.
  router.post("/api/upload/trip-expense-receipt", receiptUpload.single("receipt"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: "No receipt provided" });
      const tripId = parseInt(req.body.tripId as string, 10);
      if (!tripId || Number.isNaN(tripId)) return res.status(400).json({ error: "tripId required" });
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      if (ctx.user.role !== "admin" && trip.createdBy !== ctx.user.id && trip.financialManagerUserId !== ctx.user.id) return res.status(403).json({ error: "Financial manager access required" });
      const extension = req.file.mimetype === "application/pdf" ? "pdf" : req.file.mimetype.split("/")[1] || "file";
      const stored = await storagePut(`trip-receipts/${tripId}/${ctx.user.id}-${Date.now()}.${extension}`, req.file.buffer, req.file.mimetype);
      res.json({ key: stored.key, url: stored.url, fileName: req.file.originalname });
    } catch (err) {
      console.error("Trip expense receipt upload error:", err);
      res.status(500).json({ error: "Receipt upload failed" });
    }
  });

  // POST /api/upload/supplier-invoice — financial manager only.
  router.post("/api/upload/supplier-invoice", receiptUpload.single("invoice"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: "No invoice file provided" });
      const tripId = parseInt(req.body.tripId as string, 10);
      if (!tripId || Number.isNaN(tripId)) return res.status(400).json({ error: "tripId required" });
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      if (ctx.user.role !== "admin" && trip.createdBy !== ctx.user.id && trip.financialManagerUserId !== ctx.user.id) return res.status(403).json({ error: "Financial manager access required" });
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160) || "invoice";
      const stored = await storagePut(`supplier-invoices/${tripId}/${ctx.user.id}-${Date.now()}-${safeName}`, req.file.buffer, req.file.mimetype);
      res.json({ key: stored.key, url: stored.url, fileName: req.file.originalname });
    } catch (err) {
      console.error("Supplier invoice upload error:", err);
      res.status(500).json({ error: "Invoice upload failed" });
    }
  });

  // POST /api/upload/trip-document — financial manager only.
  router.post("/api/upload/trip-document", tripDocumentUpload.single("document"), async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: "No document provided" });
      const tripId = parseInt(req.body.tripId as string, 10);
      if (!tripId || Number.isNaN(tripId)) return res.status(400).json({ error: "tripId required" });
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      if (ctx.user.role !== "admin" && trip.createdBy !== ctx.user.id && trip.financialManagerUserId !== ctx.user.id) return res.status(403).json({ error: "Financial manager access required" });
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160) || "document";
      const stored = await storagePut(`trip-documents/${tripId}/${ctx.user.id}-${Date.now()}-${safeName}`, req.file.buffer, req.file.mimetype);
      res.json({ key: stored.key, url: stored.url, fileName: req.file.originalname, mimeType: req.file.mimetype, sizeBytes: req.file.size });
    } catch (err) {
      console.error("Trip document upload error:", err);
      res.status(500).json({ error: "Document upload failed" });
    }
  });

  // POST /api/push/subscribe
  router.post("/api/push/subscribe", async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ error: "Invalid subscription object" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database unavailable" });
        return;
      }

      // Remove old subscription for this user+endpoint then insert fresh
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, ctx.user.id), eq(pushSubscriptions.endpoint, endpoint)));

      await db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Push subscribe error:", err);
      res.status(500).json({ error: "Subscribe failed" });
    }
  });

  // DELETE /api/push/unsubscribe
  router.delete("/api/push/unsubscribe", async (req: Request, res: Response) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { endpoint } = req.body as { endpoint?: string };
      if (endpoint) {
        const db = await getDb();
        if (db) {
          await db
            .delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.userId, ctx.user.id), eq(pushSubscriptions.endpoint, endpoint)));
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Unsubscribe failed" });
    }
  });

  app.use(router);
}
