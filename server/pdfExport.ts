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
