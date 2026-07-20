import express, { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { tripPlayers, pushSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createContext } from "./_core/context";

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
