import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { getTrip, getTripPlayer, isCoAdminForTrip } from "../db";

const MEMBER_PREFIXES = ["trip-documents", "trip-chat"];
const FINANCE_PREFIXES = ["trip-receipts", "supplier-invoices"];

/** Returns an HTTP status when access to the key must be refused, else null. */
async function denyStorageAccess(key: string, req: Parameters<typeof sdk.authenticateRequest>[0]): Promise<number | null> {
  const segments = key.split("/");
  if (segments.some((segment) => segment === ".." || segment === "." || segment === "")) return 400;
  if (segments[0] === "private-backups") return 404; // backups are never served over HTTP
  const memberOnly = MEMBER_PREFIXES.includes(segments[0]);
  const financeOnly = FINANCE_PREFIXES.includes(segments[0]);
  if (!memberOnly && !financeOnly) return null;
  const tripId = Number(segments[1]);
  if (!Number.isInteger(tripId)) return 404;
  const user = await sdk.authenticateRequest(req).catch(() => null);
  if (!user) return 401;
  const trip = await getTrip(tripId);
  if (!trip) return 404;
  if (user.role === "admin" || trip.createdBy === user.id) return null;
  if (financeOnly) return trip.financialManagerUserId === user.id || (await isCoAdminForTrip(user.id, tripId)) ? null : 403;
  return (await getTripPlayer(tripId, user.id)) || (await isCoAdminForTrip(user.id, tripId)) ? null : 403;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const denied = await denyStorageAccess(key, req).catch(() => 500);
    if (denied) {
      res.status(denied).send(denied === 401 ? "Login required" : denied === 403 ? "Not allowed" : denied === 404 ? "Not found" : "Request refused");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
