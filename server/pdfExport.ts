import PDFDocument from "pdfkit";
import { Readable } from "stream";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScorecardHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossScore: number;
  netScore: number;
  stablefordPoints: number;
}

export interface ScorecardPlayer {
  name: string;
  handicap: number;
  holes: ScorecardHole[];
}

export interface ScorecardData {
  tripName: string;
  roundName: string;
  courseName: string;
  roundDate: string;
  players: ScorecardPlayer[];
}

export interface TripResultsPlayer {
  name: string;
  startingHandicap: number;
  currentHandicap: number;
  rounds: {
    roundName: string;
    grossTotal: number;
    netTotal: number;
    stablefordTotal: number;
  }[];
  cumulativeGross: number;
  cumulativeNet: number;
  cumulativeStableford: number;
}

export interface TripResultsData {
  tripName: string;
  startDate: string;
  endDate: string;
  players: TripResultsPlayer[];
  achievements: { playerName: string; type: string; holeNumber: number; roundName: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GREEN = "#1a5c2a";
const LIGHT_GREEN = "#e8f5e9";
const DARK_GREY = "#333333";
const MID_GREY = "#666666";
const LIGHT_GREY = "#f5f5f5";
const WHITE = "#ffffff";

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ─── Scorecard PDF ────────────────────────────────────────────────────────────

export async function generateScorecardPDF(data: ScorecardData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });

  // Header
  doc.rect(0, 0, doc.page.width, 70).fill(GREEN);
  doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text(data.tripName, 40, 18);
  doc.fontSize(13).font("Helvetica").text(`${data.roundName}  •  ${data.courseName}  •  ${data.roundDate}`, 40, 44);

  let y = 90;

  for (const player of data.players) {
    // Player header row
    doc.rect(40, y, doc.page.width - 80, 22).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(12).font("Helvetica-Bold")
      .text(`${player.name}  (Handicap: ${player.handicap})`, 48, y + 5);
    y += 26;

    // Column headers
    const cols = [40, 90, 140, 190, 240, 295, 350];
    const headers = ["Hole", "Par", "SI", "Gross", "Net", "Pts", ""];
    doc.rect(40, y, doc.page.width - 80, 18).fill(DARK_GREY);
    headers.forEach((h, i) => {
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold").text(h, cols[i], y + 4, { width: 48, align: "center" });
    });
    y += 20;

    // Holes — split into front 9 and back 9
    const front9 = player.holes.filter((h) => h.holeNumber <= 9);
    const back9 = player.holes.filter((h) => h.holeNumber > 9);

    const renderHoles = (holes: ScorecardHole[], startY: number) => {
      let hy = startY;
      holes.forEach((hole, idx) => {
        const bg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
        doc.rect(40, hy, doc.page.width - 80, 16).fill(bg);
        const values = [
          hole.holeNumber,
          hole.par,
          hole.strokeIndex,
          hole.grossScore || "-",
          hole.netScore || "-",
          hole.stablefordPoints ?? "-",
        ];
        values.forEach((v, i) => {
          doc.fillColor(DARK_GREY).fontSize(9).font("Helvetica")
            .text(String(v), cols[i], hy + 3, { width: 48, align: "center" });
        });
        hy += 16;
      });
      return hy;
    };

    y = renderHoles(front9, y);

    // Front 9 subtotals
    const f9Gross = front9.reduce((s, h) => s + (h.grossScore || 0), 0);
    const f9Net = front9.reduce((s, h) => s + (h.netScore || 0), 0);
    const f9Pts = front9.reduce((s, h) => s + (h.stablefordPoints || 0), 0);
    const f9Par = front9.reduce((s, h) => s + h.par, 0);
    doc.rect(40, y, doc.page.width - 80, 18).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(9).font("Helvetica-Bold")
      .text("OUT", cols[0], y + 4, { width: 48, align: "center" })
      .text(String(f9Par), cols[1], y + 4, { width: 48, align: "center" })
      .text("", cols[2], y + 4, { width: 48, align: "center" })
      .text(String(f9Gross), cols[3], y + 4, { width: 48, align: "center" })
      .text(String(f9Net), cols[4], y + 4, { width: 48, align: "center" })
      .text(String(f9Pts), cols[5], y + 4, { width: 48, align: "center" });
    y += 20;

    y = renderHoles(back9, y);

    // Back 9 + totals
    const b9Gross = back9.reduce((s, h) => s + (h.grossScore || 0), 0);
    const b9Net = back9.reduce((s, h) => s + (h.netScore || 0), 0);
    const b9Pts = back9.reduce((s, h) => s + (h.stablefordPoints || 0), 0);
    const b9Par = back9.reduce((s, h) => s + h.par, 0);
    const totalPar = f9Par + b9Par;
    const totalGross = f9Gross + b9Gross;
    const totalNet = f9Net + b9Net;
    const totalPts = f9Pts + b9Pts;

    doc.rect(40, y, doc.page.width - 80, 18).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(9).font("Helvetica-Bold")
      .text("IN", cols[0], y + 4, { width: 48, align: "center" })
      .text(String(b9Par), cols[1], y + 4, { width: 48, align: "center" })
      .text("", cols[2], y + 4, { width: 48, align: "center" })
      .text(String(b9Gross), cols[3], y + 4, { width: 48, align: "center" })
      .text(String(b9Net), cols[4], y + 4, { width: 48, align: "center" })
      .text(String(b9Pts), cols[5], y + 4, { width: 48, align: "center" });
    y += 20;

    doc.rect(40, y, doc.page.width - 80, 20).fill(GREEN);
    doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold")
      .text("TOTAL", cols[0], y + 5, { width: 48, align: "center" })
      .text(String(totalPar), cols[1], y + 5, { width: 48, align: "center" })
      .text("", cols[2], y + 5, { width: 48, align: "center" })
      .text(String(totalGross), cols[3], y + 5, { width: 48, align: "center" })
      .text(String(totalNet), cols[4], y + 5, { width: 48, align: "center" })
      .text(String(totalPts), cols[5], y + 5, { width: 48, align: "center" });
    y += 30;

    // Page break if needed
    if (y > doc.page.height - 100 && data.players.indexOf(player) < data.players.length - 1) {
      doc.addPage();
      y = 40;
    }
  }

  // Footer
  doc.fontSize(8).fillColor(MID_GREY).font("Helvetica")
    .text(`Generated by Golf Trip App  •  ${new Date().toLocaleDateString()}`, 40, doc.page.height - 30, {
      align: "center",
      width: doc.page.width - 80,
    });

  return bufferFromDoc(doc);
}

// ─── Trip Results PDF ─────────────────────────────────────────────────────────

export async function generateTripResultsPDF(data: TripResultsData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  // Header
  doc.rect(0, 0, doc.page.width, 70).fill(GREEN);
  doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text(data.tripName, 40, 18);
  doc.fontSize(12).font("Helvetica").text(`Trip Results  •  ${data.startDate} – ${data.endDate}`, 40, 46);

  let y = 90;

  // ── Leaderboard table ──
  doc.fillColor(GREEN).fontSize(14).font("Helvetica-Bold").text("Overall Leaderboard", 40, y);
  y += 22;

  const lbCols = [40, 200, 290, 370, 450];
  const lbHeaders = ["Player", "Gross", "Net", "Stableford", "HCP"];
  doc.rect(40, y, doc.page.width - 80, 20).fill(DARK_GREY);
  lbHeaders.forEach((h, i) => {
    doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold").text(h, lbCols[i], y + 5, { width: 80, align: "left" });
  });
  y += 22;

  // Sort by Stableford desc
  const sorted = [...data.players].sort((a, b) => b.cumulativeStableford - a.cumulativeStableford);
  sorted.forEach((p, idx) => {
    const bg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
    doc.rect(40, y, doc.page.width - 80, 18).fill(bg);
    doc.fillColor(DARK_GREY).fontSize(10).font("Helvetica")
      .text(p.name, lbCols[0], y + 4, { width: 155 })
      .text(String(p.cumulativeGross), lbCols[1], y + 4, { width: 80 })
      .text(String(p.cumulativeNet), lbCols[2], y + 4, { width: 80 })
      .text(String(p.cumulativeStableford), lbCols[3], y + 4, { width: 80 })
      .text(String(p.currentHandicap), lbCols[4], y + 4, { width: 80 });
    y += 18;
  });
  y += 20;

  // ── Round-by-round breakdown ──
  if (y > doc.page.height - 200) { doc.addPage(); y = 40; }
  doc.fillColor(GREEN).fontSize(14).font("Helvetica-Bold").text("Round-by-Round Breakdown", 40, y);
  y += 22;

  for (const player of sorted) {
    if (y > doc.page.height - 120) { doc.addPage(); y = 40; }
    doc.rect(40, y, doc.page.width - 80, 20).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(11).font("Helvetica-Bold").text(player.name, 48, y + 5);
    y += 22;

    const rCols = [40, 220, 300, 380, 460];
    doc.rect(40, y, doc.page.width - 80, 16).fill(DARK_GREY);
    ["Round", "Gross", "Net", "Stableford"].forEach((h, i) => {
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold").text(h, rCols[i], y + 3, { width: 80 });
    });
    y += 18;

    player.rounds.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
      doc.rect(40, y, doc.page.width - 80, 16).fill(bg);
      doc.fillColor(DARK_GREY).fontSize(9).font("Helvetica")
        .text(r.roundName, rCols[0], y + 3, { width: 175 })
        .text(String(r.grossTotal), rCols[1], y + 3, { width: 80 })
        .text(String(r.netTotal), rCols[2], y + 3, { width: 80 })
        .text(String(r.stablefordTotal), rCols[3], y + 3, { width: 80 });
      y += 16;
    });
    y += 12;
  }

  // ── Achievements ──
  if (data.achievements.length > 0) {
    if (y > doc.page.height - 150) { doc.addPage(); y = 40; }
    doc.fillColor(GREEN).fontSize(14).font("Helvetica-Bold").text("Achievements", 40, y);
    y += 22;

    data.achievements.forEach((a, idx) => {
      const bg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
      const emoji = a.type === "hole_in_one" ? "🏆" : a.type === "eagle" ? "🦅" : "🐦";
      const label = a.type === "hole_in_one" ? "Hole-in-One" : a.type === "eagle" ? "Eagle" : "Birdie";
      doc.rect(40, y, doc.page.width - 80, 16).fill(bg);
      doc.fillColor(DARK_GREY).fontSize(10).font("Helvetica")
        .text(`${emoji}  ${a.playerName} — ${label} on Hole ${a.holeNumber} (${a.roundName})`, 48, y + 3);
      y += 16;
    });
  }

  // Footer
  doc.fontSize(8).fillColor(MID_GREY).font("Helvetica")
    .text(`Generated by Golf Trip App  •  ${new Date().toLocaleDateString()}`, 40, doc.page.height - 30, {
      align: "center",
      width: doc.page.width - 80,
    });

  return bufferFromDoc(doc);
}

// ─── Tee Sheet PDF ────────────────────────────────────────────────────────────

export interface TeeSheetPlayer {
  name: string;
  handicap: number;
  pairId: number | null;
}

export interface TeeSheetGroup {
  name: string;
  teeTime: string | null;
  startingHole: number | null;
  players: TeeSheetPlayer[];
}

export interface TeeSheetData {
  tripName: string;
  roundName: string;
  roundDate: string;
  groups: TeeSheetGroup[];
}

export async function generateTeeSheetPDF(data: TeeSheetData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  // ── Header bar ──
  doc.rect(0, 0, doc.page.width, 70).fill(GREEN);
  doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text(data.tripName, 40, 16);
  doc.fontSize(12).font("Helvetica").text(`${data.roundName}  •  ${data.roundDate}  •  Tee Sheet`, 40, 44);

  let y = 90;
  const pageW = doc.page.width;
  const contentW = pageW - 80;

  // ── Pair colour legend ──
  const PAIR_COLOURS = ["#1565C0", "#B71C1C", "#4A148C", "#E65100", "#006064"];
  const pairLabels = ["Pair A", "Pair B", "Pair C", "Pair D", "Pair E"];

  // ── Groups ──
  for (const group of data.groups) {
    if (y > doc.page.height - 120) { doc.addPage(); y = 40; }

    // Group header
    doc.rect(40, y, contentW, 24).fill(DARK_GREY);
    const teeLabel = group.teeTime ? `  Tee: ${group.teeTime}` : "";
    const holeLabel = group.startingHole ? `  Hole ${group.startingHole}` : "";
    doc.fillColor(WHITE).fontSize(12).font("Helvetica-Bold")
      .text(`${group.name}${teeLabel}${holeLabel}`, 48, y + 6, { width: contentW - 16 });
    y += 26;

    // Pair grouping: group players by pairId
    const pairMap = new Map<number | null, TeeSheetPlayer[]>();
    for (const p of group.players) {
      const key = p.pairId;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key)!.push(p);
    }

    let pairIndex = 0;
    for (const [pairId, pairPlayers] of Array.from(pairMap.entries())) {
      const colour = pairId !== null ? PAIR_COLOURS[pairIndex % PAIR_COLOURS.length] : MID_GREY;
      const label = pairId !== null ? pairLabels[pairIndex % pairLabels.length] : "Unpaired";

      // Pair label strip
      doc.rect(40, y, 60, 18 * pairPlayers.length).fill(colour);
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
        .text(label, 40, y + (18 * pairPlayers.length) / 2 - 5, { width: 60, align: "center" });

      // Player rows
      pairPlayers.forEach((player: TeeSheetPlayer, idx: number) => {
        const rowBg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
        doc.rect(100, y, contentW - 60, 18).fill(rowBg);
        doc.fillColor(DARK_GREY).fontSize(10).font("Helvetica")
          .text(player.name, 108, y + 4, { width: contentW - 120 })
          .text(`HC: ${player.handicap}`, pageW - 100, y + 4, { width: 60, align: "right" });
        y += 18;
      });

      if (pairId !== null) pairIndex++;
      y += 2;
    }

    y += 12;
  }

  // ── Footer ──
  doc.fontSize(8).fillColor(MID_GREY).font("Helvetica")
    .text(`Generated by Golf Trip App  •  ${new Date().toLocaleDateString()}`, 40, doc.page.height - 30, {
      align: "center",
      width: contentW,
    });

  return bufferFromDoc(doc);
}

// ─── Round Summary PDF ────────────────────────────────────────────────────────

export interface RoundSummaryHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossScore: number | null;
  netScore: number | null;
  stablefordPoints: number | null;
  mercyCapped: boolean;
}

export interface RoundSummaryPlayer {
  name: string;
  handicap: number;
  position: number;
  totalGross: number;
  totalNet: number;
  totalStableford: number;
  holesPlayed: number;
  holes: RoundSummaryHole[];
  achievements: { type: string; holeNumber: number }[];
}

export interface RoundSummaryData {
  tripName: string;
  roundName: string;
  courseName: string;
  roundDate: string;
  scoringMode: string;
  mercyRuleEnabled: boolean;
  mercyRuleStrokes: number;
  players: RoundSummaryPlayer[];
}

export async function generateRoundSummaryPDF(data: RoundSummaryData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });

  // ── Header ──
  doc.rect(0, 0, doc.page.width, 70).fill(GREEN);
  doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text(data.tripName, 40, 14);
  doc.fontSize(13).font("Helvetica").text(
    `${data.roundName}  •  ${data.courseName}  •  ${data.roundDate}`,
    40, 40
  );
  doc.fontSize(10).text(
    `Format: ${data.scoringMode}${data.mercyRuleEnabled ? `  •  Mercy Rule: max par+${data.mercyRuleStrokes}` : ""}`,
    40, 56
  );

  let y = 90;
  const pageW = doc.page.width;
  const contentW = pageW - 80;

  // ── Leaderboard summary table ──
  doc.fillColor(GREEN).fontSize(14).font("Helvetica-Bold").text("Leaderboard", 40, y);
  y += 20;

  const lbCols = [40, 60, 200, 290, 370, 450, 530];
  const lbHeaders = ["Pos", "Player", "HCP", "Gross", "Net", "Pts", "Holes"];
  doc.rect(40, y, contentW, 20).fill(DARK_GREY);
  lbHeaders.forEach((h, i) => {
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
      .text(h, lbCols[i], y + 5, { width: i === 1 ? 135 : 80, align: i === 1 ? "left" : "center" });
  });
  y += 22;

  for (const p of data.players) {
    if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
    const bg = data.players.indexOf(p) % 2 === 0 ? WHITE : LIGHT_GREY;
    doc.rect(40, y, contentW, 18).fill(bg);
    const achLabel = p.achievements.length > 0
      ? "  " + p.achievements.map((a) => {
          if (a.type === "hole_in_one") return `HIO H${a.holeNumber}`;
          if (a.type === "eagle") return `Eagle H${a.holeNumber}`;
          return `Birdie H${a.holeNumber}`;
        }).join(", ")
      : "";
    doc.fillColor(DARK_GREY).fontSize(9).font("Helvetica")
      .text(String(p.position), lbCols[0], y + 4, { width: 18, align: "center" })
      .text(`${p.name}${achLabel}`, lbCols[1], y + 4, { width: 135 })
      .text(String(p.handicap), lbCols[2], y + 4, { width: 80, align: "center" })
      .text(String(p.totalGross), lbCols[3], y + 4, { width: 80, align: "center" })
      .text(String(p.totalNet), lbCols[4], y + 4, { width: 80, align: "center" })
      .text(String(p.totalStableford), lbCols[5], y + 4, { width: 80, align: "center" })
      .text(String(p.holesPlayed), lbCols[6], y + 4, { width: 80, align: "center" });
    y += 18;
  }
  y += 20;

  // ── Per-player hole-by-hole scorecards ──
  for (const player of data.players) {
    if (y > doc.page.height - 160) { doc.addPage(); y = 40; }

    // Player header
    doc.rect(40, y, contentW, 22).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(11).font("Helvetica-Bold")
      .text(`${player.name}  (HCP ${player.handicap})  —  Pos: ${player.position}  |  Gross: ${player.totalGross}  Net: ${player.totalNet}  Pts: ${player.totalStableford}`, 48, y + 6, { width: contentW - 16 });
    y += 24;

    // Column headers
    const cols = [40, 90, 140, 190, 240, 295, 350];
    const headers = ["Hole", "Par", "SI", "Gross", "Net", "Pts", ""];
    doc.rect(40, y, contentW, 18).fill(DARK_GREY);
    headers.forEach((h, i) => {
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
        .text(h, cols[i], y + 4, { width: 48, align: "center" });
    });
    y += 20;

    // Front 9
    const front9 = player.holes.filter((h) => h.holeNumber <= 9);
    const back9 = player.holes.filter((h) => h.holeNumber > 9);

    const renderHoles = (holes: RoundSummaryHole[], startY: number) => {
      let hy = startY;
      holes.forEach((hole, idx) => {
        const bg = idx % 2 === 0 ? WHITE : LIGHT_GREY;
        doc.rect(40, hy, contentW, 16).fill(bg);
        const grossLabel = hole.grossScore !== null
          ? `${hole.grossScore}${hole.mercyCapped ? " M" : ""}`
          : "-";
        const values = [
          hole.holeNumber,
          hole.par,
          hole.strokeIndex,
          grossLabel,
          hole.netScore !== null ? hole.netScore : "-",
          hole.stablefordPoints !== null ? hole.stablefordPoints : "-",
        ];
        values.forEach((v, i) => {
          doc.fillColor(DARK_GREY).fontSize(9).font("Helvetica")
            .text(String(v), cols[i], hy + 3, { width: 48, align: "center" });
        });
        hy += 16;
      });
      return hy;
    };

    y = renderHoles(front9, y);

    // Front 9 subtotals
    const f9Gross = front9.reduce((s, h) => s + (h.grossScore ?? 0), 0);
    const f9Net = front9.reduce((s, h) => s + (h.netScore ?? 0), 0);
    const f9Pts = front9.reduce((s, h) => s + (h.stablefordPoints ?? 0), 0);
    const f9Par = front9.reduce((s, h) => s + h.par, 0);
    doc.rect(40, y, contentW, 18).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(9).font("Helvetica-Bold")
      .text("OUT", cols[0], y + 4, { width: 48, align: "center" })
      .text(String(f9Par), cols[1], y + 4, { width: 48, align: "center" })
      .text("", cols[2], y + 4, { width: 48, align: "center" })
      .text(String(f9Gross), cols[3], y + 4, { width: 48, align: "center" })
      .text(String(f9Net), cols[4], y + 4, { width: 48, align: "center" })
      .text(String(f9Pts), cols[5], y + 4, { width: 48, align: "center" });
    y += 20;

    y = renderHoles(back9, y);

    // Back 9 + totals
    const b9Gross = back9.reduce((s, h) => s + (h.grossScore ?? 0), 0);
    const b9Net = back9.reduce((s, h) => s + (h.netScore ?? 0), 0);
    const b9Pts = back9.reduce((s, h) => s + (h.stablefordPoints ?? 0), 0);
    const b9Par = back9.reduce((s, h) => s + h.par, 0);
    const totalPar = f9Par + b9Par;
    const totalGross = f9Gross + b9Gross;
    const totalNet = f9Net + b9Net;
    const totalPts = f9Pts + b9Pts;

    doc.rect(40, y, contentW, 18).fill(LIGHT_GREEN);
    doc.fillColor(GREEN).fontSize(9).font("Helvetica-Bold")
      .text("IN", cols[0], y + 4, { width: 48, align: "center" })
      .text(String(b9Par), cols[1], y + 4, { width: 48, align: "center" })
      .text("", cols[2], y + 4, { width: 48, align: "center" })
      .text(String(b9Gross), cols[3], y + 4, { width: 48, align: "center" })
      .text(String(b9Net), cols[4], y + 4, { width: 48, align: "center" })
      .text(String(b9Pts), cols[5], y + 4, { width: 48, align: "center" });
    y += 20;

    doc.rect(40, y, contentW, 20).fill(GREEN);
    doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold")
      .text("TOTAL", cols[0], y + 5, { width: 48, align: "center" })
      .text(String(totalPar), cols[1], y + 5, { width: 48, align: "center" })
      .text("", cols[2], y + 5, { width: 48, align: "center" })
      .text(String(totalGross), cols[3], y + 5, { width: 48, align: "center" })
      .text(String(totalNet), cols[4], y + 5, { width: 48, align: "center" })
      .text(String(totalPts), cols[5], y + 5, { width: 48, align: "center" });
    y += 30;
  }

  // ── Footer ──
  doc.fontSize(8).fillColor(MID_GREY).font("Helvetica")
    .text(`Generated by Golf Trip App  •  ${new Date().toLocaleDateString()}  •  M = Score capped by mercy rule`, 40, doc.page.height - 30, {
      align: "center",
      width: contentW,
    });

  return bufferFromDoc(doc);
}
