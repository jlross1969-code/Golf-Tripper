import { and, desc, eq } from "drizzle-orm";
import { scoreAuditLog, scoreDisputes, scores } from "../drizzle/schema";
import { getDb } from "./db";

export type AuditSource = "entry" | "admin_correction" | "offline_sync";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db;
}

/** Reads the current gross score so a change can be logged before it is overwritten. */
export async function getCurrentGross(roundId: number, userId: number, holeId: number) {
  const db = await requireDb();
  const [row] = await db.select({ gross: scores.grossScore }).from(scores)
    .where(and(eq(scores.roundId, roundId), eq(scores.userId, userId), eq(scores.holeId, holeId))).limit(1);
  return row?.gross ?? null;
}

export async function logScoreChange(entry: { roundId: number; userId: number; holeId: number; holeNumber: number; oldGross: number | null; newGross: number; changedBy: number; source: AuditSource }) {
  if (entry.oldGross === entry.newGross) return; // re-saving the same value is not a change
  const db = await requireDb();
  await db.insert(scoreAuditLog).values(entry);
}

export async function getScoreHistory(roundId: number, userId?: number) {
  const db = await requireDb();
  const where = userId ? and(eq(scoreAuditLog.roundId, roundId), eq(scoreAuditLog.userId, userId)) : eq(scoreAuditLog.roundId, roundId);
  return db.select().from(scoreAuditLog).where(where).orderBy(desc(scoreAuditLog.createdAt)).limit(500);
}

export async function createDispute(data: { roundId: number; userId: number; holeId: number; holeNumber: number; raisedBy: number; note: string }) {
  const db = await requireDb();
  const [result] = await db.insert(scoreDisputes).values(data);
  return result.insertId;
}

export async function listDisputes(roundId: number) {
  const db = await requireDb();
  return db.select().from(scoreDisputes).where(eq(scoreDisputes.roundId, roundId)).orderBy(desc(scoreDisputes.createdAt)).limit(200);
}

export async function getDispute(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(scoreDisputes).where(eq(scoreDisputes.id, id)).limit(1);
  return row;
}

export async function resolveDispute(id: number, resolvedBy: number, status: "resolved" | "dismissed", resolutionNote: string | null) {
  const db = await requireDb();
  await db.update(scoreDisputes).set({ status, resolvedBy, resolutionNote, resolvedAt: new Date() }).where(eq(scoreDisputes.id, id));
}
