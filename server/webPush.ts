import webpush from "web-push";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { pushSubscriptions, tripPlayers } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

let vapidInitialised = false;

function ensureVapid() {
  if (vapidInitialised) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) return;
  webpush.setVapidDetails(
    "mailto:golf-trip-app@manus.im",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  vapidInitialised = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

type SubRow = { id: number; userId: number; endpoint: string; p256dh: string; auth: string; createdAt: Date };

/**
 * Send a Web Push notification to all players in a trip who have subscribed.
 */
export async function sendPushToTrip(tripId: number, payload: PushPayload): Promise<void> {
  ensureVapid();
  if (!vapidInitialised) return; // VAPID not configured — skip silently

  // Get all userIds in the trip
  const db = await getDb();
  if (!db) return;

  const players = await db
    .select({ userId: tripPlayers.userId })
    .from(tripPlayers)
    .where(eq(tripPlayers.tripId, tripId));

  if (!players.length) return;

  const userIds = players.map((p: { userId: number }) => p.userId);

  // Get all push subscriptions for these users
  const subs: SubRow[] = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  if (!subs.length) return;

  const payloadStr = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map((sub: SubRow) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      )
    )
  );

  // Remove expired/invalid subscriptions (410 Gone or 404)
  const expiredEndpoints: string[] = [];
  results.forEach((result: PromiseSettledResult<webpush.SendResult>, i: number) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    }
  });

  for (const endpoint of expiredEndpoints) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
}
