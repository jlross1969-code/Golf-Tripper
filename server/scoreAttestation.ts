import { and, eq, inArray } from "drizzle-orm";
import { groupPlayers, groups, scoreAttestations } from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db;
}

export async function getAttestations(roundId: number) {
  const db = await requireDb();
  return db.select().from(scoreAttestations).where(eq(scoreAttestations.roundId, roundId));
}

export async function isCardSigned(roundId: number, userId: number) {
  const rows = (await getAttestations(roundId)).filter((row) => row.userId === userId);
  return rows.some((row) => row.role === "player") && rows.some((row) => row.role === "marker");
}

/** True when both users were in the same group for this round. */
export async function sharedGroup(roundId: number, userA: number, userB: number) {
  const db = await requireDb();
  const roundGroups = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, roundId));
  if (!roundGroups.length) return false;
  const members = await db.select({ groupId: groupPlayers.groupId, userId: groupPlayers.userId }).from(groupPlayers)
    .where(inArray(groupPlayers.groupId, roundGroups.map((g) => g.id)));
  const groupOf = (userId: number) => members.find((m) => m.userId === userId)?.groupId;
  const a = groupOf(userA);
  return a !== undefined && a === groupOf(userB);
}

export async function addAttestation(data: { roundId: number; userId: number; attestedBy: number; role: "player" | "marker" }) {
  const db = await requireDb();
  await db.insert(scoreAttestations).values(data).onDuplicateKeyUpdate({ set: { role: data.role } });
}

export async function removeAttestations(roundId: number, userId: number) {
  const db = await requireDb();
  await db.delete(scoreAttestations).where(and(eq(scoreAttestations.roundId, roundId), eq(scoreAttestations.userId, userId)));
}
