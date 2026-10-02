/**
 * Decrypts a private backup artifact for inspection or restore.
 *   tsx tools/decrypt-private-backup.ts <file.json.enc> [outDir]
 * Database backups are written as <outDir>/database.json; object archives have their
 * files extracted under <outDir>/objects/<source>/<recordId>-<name>.
 * Requires BACKUP_ENCRYPTION_KEY (or JWT_SECRET for older backups) in the environment.
 */
import fs from "node:fs";
import path from "node:path";
import { decryptBackup } from "../server/projectBackupService";

const [input, outDir = "backup-restore"] = process.argv.slice(2);
if (!input) {
  console.error("Usage: tsx tools/decrypt-private-backup.ts <file.json.enc> [outDir]");
  process.exit(1);
}

const payload = decryptBackup(fs.readFileSync(input));
fs.mkdirSync(outDir, { recursive: true });
if (payload.tables) {
  fs.writeFileSync(path.join(outDir, "database.json"), JSON.stringify(payload, null, 2));
  console.log(`Wrote ${payload.tables.length} tables to ${outDir}/database.json`);
} else if (payload.objects) {
  for (const object of payload.objects) {
    const safeName = String(object.fileName ?? path.basename(object.key)).replace(/[^a-z0-9._-]+/gi, "_");
    const target = path.join(outDir, "objects", String(object.source).replace(/[^a-z0-9_-]+/gi, "_"), `${object.recordId}-${safeName}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(object.base64, "base64"));
  }
  console.log(`Extracted ${payload.objects.length} objects to ${outDir}/objects`);
} else {
  console.error("Unrecognised backup format");
  process.exit(1);
}
