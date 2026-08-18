import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { createNotification, getIncompleteChecklistPlayerIds, getTrip, getTripByCourseRevealTaskUid, getTripByPaymentReminderTaskUid, getTripPaymentReminderStageByTaskUid, getTripPaymentSummary, getTripScheduledAnnouncementByTaskUid, getTripSupplierByInvoiceReminderTaskUid, getTripTravelChecklistByReminderTaskUid, markTripPaymentReminderStageSent, markTripScheduledAnnouncementSent, markTripSupplierInvoiceReminderSent, markTripTravelChecklistReminderSent, sendTripMessage, updateTrip } from "./db";
import { sendPushToTrip, sendPushToUsers } from "./webPush";

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

  app.post("/api/scheduled/payment-reminder", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const trip = await getTripByPaymentReminderTaskUid(taskUid);
      if (!trip) return res.json({ ok: true, skipped: "orphan" });
      const balances = await getTripPaymentSummary(trip.id);
      const recipients = balances.filter((balance) => balance.outstandingCents > 0).map((balance) => balance.userId);
      if (!recipients.length) return res.json({ ok: true, skipped: "all-paid" });
      const dueLabel = trip.paymentDueAt ? new Date(trip.paymentDueAt).toLocaleDateString("en-AU") : "soon";
      const message = `A payment is still outstanding for ${trip.name}. Due date: ${dueLabel}.`;
      await createNotification({ tripId: trip.id, message, type: "general" });
      void sendPushToUsers(recipients, { title: `Payment reminder · ${trip.name}`, body: message, tag: `payment-reminder-${trip.id}`, url: `/trip/${trip.id}/payments` });
      res.json({ ok: true, reminded: recipients.length });
    } catch (error) {
      console.error("[ScheduledTripEvents] payment reminder error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/payment-reminder-stage", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const stage = await getTripPaymentReminderStageByTaskUid(taskUid);
      if (!stage) return res.json({ ok: true, skipped: "orphan" });
      if (stage.status !== "pending") return res.json({ ok: true, skipped: stage.status });
      const trip = await getTrip(stage.tripId);
      if (!trip) return res.json({ ok: true, skipped: "trip-missing" });
      const balances = await getTripPaymentSummary(trip.id);
      const recipients = balances.filter((balance) => balance.outstandingCents > 0).map((balance) => balance.userId);
      if (!recipients.length) { await markTripPaymentReminderStageSent(stage.id); return res.json({ ok: true, skipped: "all-paid" }); }
      const dueLabel = trip.paymentDueAt ? new Date(trip.paymentDueAt).toLocaleDateString("en-AU") : "soon";
      const message = `${stage.label}: payment is still outstanding for ${trip.name}. Due date: ${dueLabel}.`;
      await createNotification({ tripId: trip.id, message, type: "general" });
      void sendPushToUsers(recipients, { title: `Payment reminder · ${trip.name}`, body: message, tag: `payment-reminder-stage-${stage.id}`, url: `/trip/${trip.id}/payments` });
      await markTripPaymentReminderStageSent(stage.id);
      res.json({ ok: true, reminded: recipients.length, stageId: stage.id });
    } catch (error) {
      console.error("[ScheduledTripEvents] staged payment reminder error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/checklist-reminder", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const item = await getTripTravelChecklistByReminderTaskUid(taskUid);
      if (!item) return res.json({ ok: true, skipped: "orphan" });
      if (item.reminderSentAt) return res.json({ ok: true, skipped: "already-sent" });
      const trip = await getTrip(item.tripId);
      if (!trip) return res.json({ ok: true, skipped: "trip-missing" });
      const recipients = await getIncompleteChecklistPlayerIds(item.id, item.tripId);
      const deadline = item.dueAt ? ` by ${new Date(item.dueAt).toLocaleString("en-AU")}` : "";
      const message = `Travel checklist reminder: ${item.label}${deadline}.`;
      if (recipients.length) {
        await createNotification({ tripId: item.tripId, message, type: "general" });
        void sendPushToUsers(recipients, { title: `Travel checklist · ${trip.name}`, body: message, tag: `checklist-reminder-${item.id}`, url: `/trip/${item.tripId}/itinerary` });
      }
      await markTripTravelChecklistReminderSent(item.id);
      res.json({ ok: true, reminded: recipients.length, itemId: item.id });
    } catch (error) {
      console.error("[ScheduledTripEvents] checklist reminder error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/supplier-invoice-reminder", async (req: Request, res: Response) => {
    try {
      const taskUid = cronOnly(await sdk.authenticateRequest(req), res);
      if (!taskUid) return;
      const supplier = await getTripSupplierByInvoiceReminderTaskUid(taskUid);
      if (!supplier) return res.json({ ok: true, skipped: "orphan" });
      if (supplier.invoiceReminderSentAt) return res.json({ ok: true, skipped: "already-sent" });
      const trip = await getTrip(supplier.tripId);
      if (!trip) return res.json({ ok: true, skipped: "trip-missing" });
      const dueLabel = supplier.invoiceDueAt ? new Date(supplier.invoiceDueAt).toLocaleDateString("en-AU") : "soon";
      const outstanding = Math.max(0, supplier.paymentDueCents - supplier.paidCents);
      const message = `Supplier invoice reminder: ${supplier.name} has ${outstanding > 0 ? `$${(outstanding / 100).toFixed(2)} outstanding` : "an invoice due"} for ${trip.name}, due ${dueLabel}.`;
      await createNotification({ tripId: trip.id, message, type: "general" });
      void sendPushToUsers([trip.createdBy, ...(trip.financialManagerUserId ? [trip.financialManagerUserId] : [])], { title: `Supplier invoice · ${trip.name}`, body: message, tag: `supplier-invoice-${supplier.id}`, url: `/admin/trips/${trip.id}/finances` });
      await markTripSupplierInvoiceReminderSent(supplier.id);
      res.json({ ok: true, supplierId: supplier.id });
    } catch (error) {
      console.error("[ScheduledTripEvents] supplier invoice reminder error", error);
      res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });
}
