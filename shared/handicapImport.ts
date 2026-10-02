export type ImportRow = { identifier: string; handicap: number };
export type Candidate = { userId: number; email?: string | null; name?: string | null; nickname?: string | null };
export type ImportMatch =
  | { status: "matched"; row: ImportRow; userId: number }
  | { status: "unmatched" | "ambiguous" | "invalid"; row: ImportRow; reason: string };

/** Parses "name or email, handicap" lines (comma, tab or semicolon separated; an optional header row is skipped). */
export function parseHandicapCsv(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,\t;]/).map((part) => part.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2) continue;
    const handicap = Number(parts[parts.length - 1].replace(/^\+/, "-"));
    const identifier = parts.slice(0, -1).join(" ").trim();
    if (!identifier) continue;
    if (Number.isNaN(handicap) && rows.length === 0) continue; // header row
    rows.push({ identifier, handicap });
  }
  return rows;
}

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function matchHandicapRows(rows: ImportRow[], players: Candidate[]): ImportMatch[] {
  return rows.map((row): ImportMatch => {
    if (!Number.isFinite(row.handicap) || row.handicap < 0 || row.handicap > 54) return { status: "invalid", row, reason: "Handicap must be between 0 and 54" };
    const key = norm(row.identifier);
    const byEmail = players.filter((p) => norm(p.email) === key);
    const hits = byEmail.length ? byEmail : players.filter((p) => norm(p.name) === key || norm(p.nickname) === key);
    if (hits.length === 1) return { status: "matched", row, userId: hits[0].userId };
    if (hits.length > 1) return { status: "ambiguous", row, reason: "More than one player matches" };
    return { status: "unmatched", row, reason: "No player on this trip matches" };
  });
}
