import express, { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { tripPlayers, pushSubscriptions, trips, rounds } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createContext } from "./_core/context";
import { isTripChatImageType } from "../shared/tripChatAttachment";

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
