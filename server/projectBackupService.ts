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
  if (!value) return null;
  const marker = "/manus-storage/";
  const markerIndex = value.indexOf(marker);
  return markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value.replace(/^\/+/, "");
}

async function fetchStoredFile(key: string) {
  const url = await storageGetSignedUrl(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read stored object ${key}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function createPrivateProjectBackup() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
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
  ];
  const objects: ArchivedObject[] = [];
  for (const source of objectSources) {
    const [rows] = await connection.query<any[]>(source.query);
    for (const row of rows) {
      const key = storageKey(row.objectKey);
      if (!key) continue;
      const data = await fetchStoredFile(key);
      objects.push({ source: source.source, recordId: Number(row.id), key, fileName: row.fileName ?? null, mimeType: row.mimeType ?? null, base64: data.toString("base64") });
    }
  }
  await connection.end();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const databasePayload = {
    format: "golf-trip-app-private-database-backup/v1",
    exportedAt: new Date().toISOString(),
    tables,
  };
  const objectPayload = {
    format: "golf-trip-app-private-object-archive/v1",
    exportedAt: new Date().toISOString(),
    objects,
  };
  const database = await storagePut(`private-backups/monthly/${timestamp}-database.json.enc`, encryptJson(databasePayload), "application/octet-stream");
  const objectArchive = await storagePut(`private-backups/monthly/${timestamp}-objects.json.enc`, encryptJson(objectPayload), "application/octet-stream");
  const summary = JSON.stringify({ tableCount: tables.length, objectCount: objects.length, rowCount: tables.reduce((count, table) => count + table.rows.length, 0) });
  await updateProjectBackupSettings({ lastDatabaseBackupKey: database.key, lastObjectArchiveKey: objectArchive.key, lastBackupAt: new Date(), lastBackupSummary: summary });
  return { databaseKey: database.key, objectArchiveKey: objectArchive.key, summary };
}
