import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { createNotification, getTrip, getTripByCourseRevealTaskUid, getTripScheduledAnnouncementByTaskUid, markTripScheduledAnnouncementSent, sendTripMessage, updateTrip } from "./db";
import { sendPushToTrip } from "./webPush";

function cronOnly(user: Awaited<ReturnType<typeof sdk.authenticateRequest>>, res: Response) {
  if (!user.isCron || !user.taskUid) {
    res.status(403).json({ error: "cron-only" });
    return null;
  }
  return user.taskUid;
}

export function registerScheduledTripEventRoutes(app: Express) {
  app.post("/api/scheduled/trip-announcement", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const announcement = await getTripScheduledAnnouncementByTaskUid(taskUid);
      if (!announcement) return res.json({ ok: true, skipped: "orphan" });
      if (announcement.status === "sent" || announcement.status === "cancelled") return res.json({ ok: true, skipped: announcement.status });
      const trip = await getTrip(announcement.tripId);
      if (!trip) return res.json({ ok: true, skipped: "trip-missing" });
      await sendTripMessage({ tripId: announcement.tripId, userId: announcement.createdByUserId, message: announcement.message, isAnnouncement: true });
      await createNotification({ tripId: announcement.tripId, message: announcement.message, type: "general" });
      void sendPushToTrip(announcement.tripId, { title: "Trip announcement", body: announcement.message, tag: `scheduled-trip-announcement-${announcement.id}`, url: `/trip/${announcement.tripId}/chat` });
      await markTripScheduledAnnouncementSent(announcement.id);
      res.json({ ok: true, sent: announcement.id });
    } catch (error) {
      console.error("[ScheduledTripEvents] announcement error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/course-reveal", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const trip = await getTripByCourseRevealTaskUid(taskUid);
      if (!trip) return res.json({ ok: true, skipped: "orphan" });
      if (trip.coursesRevealed) return res.json({ ok: true, skipped: "already-revealed" });
      await updateTrip(trip.id, { coursesRevealed: true } as any);
      const message = `Course details have been revealed for ${trip.name}. Check your rounds for the full information.`;
      await createNotification({ tripId: trip.id, message, type: "general" });
      void sendPushToTrip(trip.id, { title: `⛳ ${trip.name} courses revealed`, body: message, tag: `scheduled-course-reveal-${trip.id}`, url: `/trip/${trip.id}` });
      res.json({ ok: true, revealed: trip.id });
    } catch (error) {
      console.error("[ScheduledTripEvents] course reveal error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });
}
