/**
 * Seed script: fill in all missing scores for Toowoomba trip (id=1), round 1.
 *
 * Players and handicaps:
 *   userId 1       John Ross     HCP 18
 *   userId 1680001 Hendo         HCP 12
 *   userId 1680002 Morrie        HCP 18
 *   userId 1680003 Fitzy         HCP 7
 *   userId 1680004 Cal           HCP 22
 *   userId 1680005 Whitty        HCP 15
 *   userId 1680006 Gally         HCP 9
 *   userId 1680007 Dunno         HCP 20
 *   userId 1680008 Stapes        HCP 14
 *   userId 1680009 Raffy         HCP 11
 *   userId 1680011 Micky         HCP 16
 *   userId 1680012 Callo         HCP 8
 *
 * Holes (courseId=2, holeIds 19-36):
 *   H1  id19  par3  SI1
 *   H2  id20  par4  SI2
 *   H3  id21  par5  SI3
 *   H4  id22  par4  SI4
 *   H5  id23  par4  SI5
 *   H6  id24  par5  SI6
 *   H7  id25  par3  SI7
 *   H8  id26  par4  SI8
 *   H9  id27  par5  SI9
 *   H10 id28  par4  SI10
 *   H11 id29  par4  SI11
 *   H12 id30  par5  SI12
 *   H13 id31  par3  SI13
 *   H14 id32  par4  SI14
 *   H15 id33  par5  SI15
 *   H16 id34  par4  SI16
 *   H17 id35  par4  SI17
 *   H18 id36  par5  SI18
 */

import { createConnection } from 'mysql2/promise';

const ROUND_ID = 1;

// Realistic gross scores per player per hole (holeId 19-36)
// Designed to produce believable Stableford scores for each handicap
const GROSS_SCORES = {
  // John Ross HCP 18 - gets 1 shot on every hole (18/18)
  1: [4, 5, 6, 5, 5, 6, 4, 5, 6, 5, 5, 7, 4, 5, 7, 5, 5, 7],
  // Hendo HCP 12 - gets 1 shot on SI 1-12
  1680001: [3, 5, 5, 8, 6, 6, 3, 4, 3, 5, 5, 6, 3, 5, 6, 5, 5, 6],
  // Morrie HCP 18 - gets 1 shot on every hole
  1680002: [4, 5, 6, 5, 5, 7, 4, 5, 6, 5, 5, 7, 4, 5, 7, 5, 5, 7],
  // Fitzy HCP 7 - gets 1 shot on SI 1-7
  1680003: [2, 4, 3, 4, 4, 6, 3, 4, 4, 4, 4, 6, 3, 4, 6, 4, 5, 6],
  // Cal HCP 22 - gets 1 shot on all holes + 2 shots on SI 1-4
  1680004: [5, 6, 7, 6, 6, 7, 5, 6, 7, 6, 6, 8, 5, 6, 8, 6, 6, 8],
  // Whitty HCP 15 - gets 1 shot on SI 1-15
  1680005: [4, 5, 6, 5, 5, 6, 4, 5, 6, 5, 5, 7, 4, 5, 6, 5, 5, 7],
  // Gally HCP 9 - gets 1 shot on SI 1-9
  1680006: [3, 4, 5, 4, 4, 6, 3, 4, 5, 4, 4, 5, 3, 4, 5, 4, 4, 6],
  // Dunno HCP 20 - gets 1 shot on all + 2 shots on SI 1-2
  1680007: [5, 6, 7, 6, 6, 7, 5, 6, 7, 6, 6, 8, 5, 6, 8, 6, 6, 8],
  // Stapes HCP 14 - gets 1 shot on SI 1-14
  1680008: [4, 5, 6, 5, 5, 6, 4, 5, 6, 5, 5, 6, 3, 5, 6, 5, 5, 7],
  // Raffy HCP 11 - gets 1 shot on SI 1-11
  1680009: [3, 4, 5, 4, 4, 6, 3, 4, 5, 4, 4, 6, 3, 4, 6, 4, 4, 6],
  // Micky HCP 16 - gets 1 shot on SI 1-16
  1680011: [4, 5, 6, 5, 5, 7, 4, 5, 6, 5, 5, 7, 4, 5, 7, 5, 5, 7],
  // Callo HCP 8 - gets 1 shot on SI 1-8
  1680012: [3, 4, 5, 4, 4, 5, 3, 4, 5, 4, 4, 5, 3, 4, 5, 4, 4, 6],
};

// Holes: [holeId, par, strokeIndex]
const HOLES = [
  [19, 3, 1],
  [20, 4, 2],
  [21, 5, 3],
  [22, 4, 4],
  [23, 4, 5],
  [24, 5, 6],
  [25, 3, 7],
  [26, 4, 8],
  [27, 5, 9],
  [28, 4, 10],
  [29, 4, 11],
  [30, 5, 12],
  [31, 3, 13],
  [32, 4, 14],
  [33, 5, 15],
  [34, 4, 16],
  [35, 4, 17],
  [36, 5, 18],
];

function calculateNet(gross, hcp, si) {
  const shots = Math.floor(hcp / 18) + (hcp % 18 >= si ? 1 : 0);
  return gross - shots;
}

function calculateStableford(gross, hcp, si, par) {
  const net = calculateNet(gross, hcp, si);
  const diff = net - par;
  return Math.max(0, 2 - diff);
}

const HANDICAPS = {
  1: 18,
  1680001: 12,
  1680002: 18,
  1680003: 7,
  1680004: 22,
  1680005: 15,
  1680006: 9,
  1680007: 20,
  1680008: 14,
  1680009: 11,
  1680011: 16,
  1680012: 8,
};

(async () => {
  const conn = await createConnection(process.env.DATABASE_URL || '');

  // Fetch existing scores
  const [existing] = await conn.query(
    'SELECT userId, holeId FROM scores WHERE roundId = ?',
    [ROUND_ID]
  );
  const existingSet = new Set(existing.map(r => `${r.userId}-${r.holeId}`));

  let inserted = 0;
  const now = new Date();

  for (const [userId, grossArr] of Object.entries(GROSS_SCORES)) {
    const uid = parseInt(userId);
    const hcp = HANDICAPS[uid];

    for (let i = 0; i < HOLES.length; i++) {
      const [holeId, par, si] = HOLES[i];
      const key = `${uid}-${holeId}`;

      if (existingSet.has(key)) continue; // already entered

      const gross = grossArr[i];
      const net = calculateNet(gross, hcp, si);
      const pts = calculateStableford(gross, hcp, si, par);

      await conn.query(
        `INSERT INTO scores (roundId, userId, holeId, grossScore, netScore, stablefordPoints, createdAt, updatedAt, mercyCapped)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [ROUND_ID, uid, holeId, gross, net, pts, now, now]
      );
      inserted++;
    }
  }

  console.log(`Done. Inserted ${inserted} missing scores.`);
  await conn.end();
})().catch(e => { console.error(e.message); process.exit(1); });
