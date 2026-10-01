import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { storageGetSignedUrl, storagePut } from "./storage";
import { updateProjectBackupSettings } from "./projectBackupDb";

type TableSnapshot = { name: string; rows: unknown[] };
type ArchivedObject = { source: string; recordId: number; key: string; fileName: string | null; mimeType: string | null; base64: string };

function backupKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is unavailable for backup encryption");
  return crypto.createHash("sha256").update(`${secret}:golf-trip-app:private-backups:v1`).digest();
}

function encryptJson(payload: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", backupKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

function storageKey(value: string | null | undefined) {
  if (!value || !value.trim()) return null;
  const marker = "/manus-storage/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) return value.slice(markerIndex + marker.length) || null;
  // External URLs are not stored objects, so there is nothing to archive.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith("data:")) return null;
  return value.replace(/^\/+/, "") || null;
}

async function fetchStoredFile(key: string) {
  const url = await storageGetSignedUrl(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read stored object ${key}`);
  return Buffer.from(await response.arrayBuffer());
}

const OBJECT_PART_MAX_BYTES = 64 * 1024 * 1024;

export async function createPrivateProjectBackup() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    return await runBackup(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

async function runBackup(connection: mysql.Connection) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const [tableRows] = await connection.query<any[]>(
    "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  );
  const tables: TableSnapshot[] = [];
  for (const { tableName } of tableRows) {
    const safeName = `\`${String(tableName).replaceAll("`", "``")}\``;
    const [rows] = await connection.query(`SELECT * FROM ${safeName}`);
    tables.push({ name: tableName, rows: Array.isArray(rows) ? rows : [] });
  }

  const objectSources = [
    { source: "trip_documents", query: "SELECT id, fileKey AS objectKey, fileName, mimeType FROM trip_documents WHERE fileKey IS NOT NULL" },
    { source: "trip_actual_expenses", query: "SELECT id, receiptUrl AS objectKey, receiptFileName AS fileName, NULL AS mimeType FROM trip_actual_expenses WHERE receiptUrl IS NOT NULL" },
    { source: "trip_suppliers", query: "SELECT id, invoiceAttachmentKey AS objectKey, invoiceAttachmentFileName AS fileName, NULL AS mimeType FROM trip_suppliers WHERE invoiceAttachmentKey IS NOT NULL" },
    { source: "trips", query: "SELECT id, logoUrl AS objectKey, name AS fileName, NULL AS mimeType FROM trips WHERE logoUrl IS NOT NULL" },
    { source: "trip_players", query: "SELECT id, photoUrl AS objectKey, NULL AS fileName, NULL AS mimeType FROM trip_players WHERE photoUrl IS NOT NULL" },
    { source: "rounds", query: "SELECT id, logoUrl AS objectKey, name AS fileName, NULL AS mimeType FROM rounds WHERE logoUrl IS NOT NULL" },
    { source: "trip_messages", query: "SELECT id, COALESCE(NULLIF(imageKey, ''), NULLIF(imageUrl, '')) AS objectKey, imageAlt AS fileName, NULL AS mimeType FROM trip_messages WHERE NULLIF(imageKey, '') IS NOT NULL OR NULLIF(imageUrl, '') IS NOT NULL" },
    { source: "trip_message_attachments", query: "SELECT id, COALESCE(NULLIF(imageKey, ''), NULLIF(imageUrl, '')) AS objectKey, imageAlt AS fileName, NULL AS mimeType FROM trip_message_attachments WHERE NULLIF(imageKey, '') IS NOT NULL OR NULLIF(imageUrl, '') IS NOT NULL" },
  ];
  // Objects are uploaded in size-bounded parts so memory use stays flat, and one
  // unreadable object is recorded as a failure instead of aborting the backup.
  const objectPartKeys: string[] = [];
  const failures: { source: string; recordId: number; key: string; error: string }[] = [];
  let objectCount = 0;
  let objects: ArchivedObject[] = [];
  let pendingBytes = 0;
  const flushObjects = async () => {
    if (!objects.length) return;
    const payload = { format: "golf-trip-app-private-object-archive/v1", exportedAt: new Date().toISOString(), objects };
    const part = await storagePut(`private-backups/monthly/${timestamp}-objects-${objectPartKeys.length + 1}.json.enc`, encryptJson(payload), "application/octet-stream");
    objectPartKeys.push(part.key);
    objects = [];
    pendingBytes = 0;
  };
  for (const source of objectSources) {
    const [rows] = await connection.query<any[]>(source.query);
    for (const row of rows) {
      const key = storageKey(row.objectKey);
      if (!key) continue;
      try {
        const data = await fetchStoredFile(key);
        objects.push({ source: source.source, recordId: Number(row.id), key, fileName: row.fileName ?? null, mimeType: row.mimeType ?? null, base64: data.toString("base64") });
        objectCount++;
        pendingBytes += data.length;
        if (pendingBytes >= OBJECT_PART_MAX_BYTES) await flushObjects();
      } catch (error) {
        failures.push({ source: source.source, recordId: Number(row.id), key, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  await flushObjects();

  const databasePayload = {
    format: "golf-trip-app-private-database-backup/v1",
    exportedAt: new Date().toISOString(),
    tables,
  };
  const database = await storagePut(`private-backups/monthly/${timestamp}-database.json.enc`, encryptJson(databasePayload), "application/octet-stream");
  const summary = JSON.stringify({ tableCount: tables.length, objectCount, objectPartKeys, failedObjectCount: failures.length, failedObjects: failures.slice(0, 50), rowCount: tables.reduce((count, table) => count + table.rows.length, 0) });
  await updateProjectBackupSettings({ lastDatabaseBackupKey: database.key, lastObjectArchiveKey: objectPartKeys[0] ?? null, lastBackupAt: new Date(), lastBackupSummary: summary });
  return { databaseKey: database.key, objectArchiveKey: objectPartKeys[0] ?? null, objectPartKeys, summary };
}
