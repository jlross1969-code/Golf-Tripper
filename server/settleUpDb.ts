import { and, desc, eq } from "drizzle-orm";
import { tripSettlements } from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db;
}

export async function listSettlements(tripId: number) {
  const db = await requireDb();
  return db.select().from(tripSettlements).where(eq(tripSettlements.tripId, tripId)).orderBy(desc(tripSettlements.createdAt)).limit(1000);
}

export async function getSettlement(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(tripSettlements).where(eq(tripSettlements.id, id)).limit(1);
  return row;
}

export async function addSettlement(data: { tripId: number; roundId?: number | null; fromUserId: number; toUserId: number; amountCents: number; reason: string; createdBy: number }) {
  const db = await requireDb();
  const [result] = await db.insert(tripSettlements).values(data);
  return result.insertId;
}

export async function setSettlementPaid(id: number, tripId: number, paid: boolean) {
  const db = await requireDb();
  await db.update(tripSettlements).set({ settledAt: paid ? new Date() : null }).where(and(eq(tripSettlements.id, id), eq(tripSettlements.tripId, tripId)));
}

export async function deleteSettlement(id: number, tripId: number) {
  const db = await requireDb();
  await db.delete(tripSettlements).where(and(eq(tripSettlements.id, id), eq(tripSettlements.tripId, tripId)));
}
