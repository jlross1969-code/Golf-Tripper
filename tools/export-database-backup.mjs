import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const destinationRoot = process.argv[2];

if (!destinationRoot) {
  throw new Error("Usage: node tools/export-database-backup.mjs <destination-directory>");
}

const now = new Date();
const destination = path.resolve(destinationRoot);
const tablesDirectory = path.join(destination, "tables");

await fs.mkdir(tablesDirectory, { recursive: true });

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [tableRows] = await connection.query(
  "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
);

const manifest = {
  format: "golf-trip-app-data-backup/v1",
  exportedAt: now.toISOString(),
  dataOnly: true,
  notes: [
    "This archive contains database table data only.",
    "Object-storage files, including receipt and document bytes, are not embedded; their database metadata and URLs are included where present.",
    "Restore into a database whose schema has first been migrated from this project source."
  ],
  tables: []
};

const replacer = (_key, value) => {
  if (Buffer.isBuffer(value)) {
    return { type: "base64", data: value.toString("base64") };
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

for (const { tableName } of tableRows) {
  const quotedName = `\`${String(tableName).replaceAll("`", "``")}\``;
  const [rows] = await connection.query(`SELECT * FROM ${quotedName}`);
  const payload = JSON.stringify(rows, replacer, 2) + "\n";
  const relativePath = path.join("tables", `${tableName}.json`);
  const filePath = path.join(destination, relativePath);
  await fs.writeFile(filePath, payload, "utf8");
  manifest.tables.push({
    name: tableName,
    file: relativePath,
    rowCount: rows.length,
    sha256: crypto.createHash("sha256").update(payload).digest("hex")
  });
}

await connection.end();

await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

const restoreGuide = `# Golf Trip App Database Export — Restore Guide

## What this archive contains

This is a **data-only** snapshot created at ${manifest.exportedAt}. Every base table is exported as a JSON file under \`tables/\`, with row counts and SHA-256 checksums in \`manifest.json\`.

> This archive does not contain object-storage file bytes. Receipt and document metadata/URLs remain in their associated database rows; retain the storage bucket separately when a complete file-level backup is required.

## Safe restoration sequence

1. Restore the matching application source from GitHub or a project checkpoint.
2. Create a clean target database and apply the Drizzle migrations from \`drizzle/\` before importing any data.
3. Validate \`manifest.json\` checksums against each JSON file.
4. Import tables in dependency order. A safe starting order is users, courses, holes, trips, trip_players, rounds, groups, group_players, financial settings/line items/suppliers, then dependent scores, messages, documents, and notification records.
5. Restore foreign-key dependent tables only after their parent rows exist. Do not import into the live production database without a separate approved recovery plan.

## Verification

After import, compare per-table row counts with \`manifest.json\`. Then verify a sample trip, course scorecard, player roster, financial plan, and document metadata in the app.

## Security note

The exported data can include user profiles, payment metadata, supplier contact information, push subscriptions, and document/receipt URLs. Store the ZIP file in a private, access-controlled location.
`;

await fs.writeFile(path.join(destination, "RESTORE_GUIDE.md"), restoreGuide, "utf8");
console.log(JSON.stringify({ destination, tableCount: manifest.tables.length, tables: manifest.tables }, null, 2));
