import { desc, eq } from "drizzle-orm";
import { projectBackups } from "../drizzle/schema";
import { getDb } from "./db";

export async function getProjectBackupSettings() {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(projectBackups).orderBy(desc(projectBackups.id)).limit(1);
  return settings ?? null;
}

export async function getProjectBackupSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(projectBackups).where(eq(projectBackups.monthlyCronTaskUid, taskUid)).limit(1);
  return settings ?? null;
}

export async function updateProjectBackupSettings(values: Partial<typeof projectBackups.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getProjectBackupSettings();
  if (current) {
    await db.update(projectBackups).set(values).where(eq(projectBackups.id, current.id));
    return current.id;
  }
  const result = await db.insert(projectBackups).values(values);
  return Number(result[0].insertId);
}
