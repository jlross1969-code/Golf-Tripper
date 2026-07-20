import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// Find Toowoomba trip
const [[trip]] = await conn.execute("SELECT id, name FROM trips WHERE name LIKE '%Toowoomba%' LIMIT 1");
console.log('Trip:', trip.id, trip.name);

// Get all rounds
const [rounds] = await conn.execute('SELECT id, name FROM rounds WHERE tripId = ?', [trip.id]);
console.log('Rounds:', rounds.map(r => `${r.id} ${r.name}`).join(', '));

for (const round of rounds) {
  const [groups] = await conn.execute('SELECT id, name FROM `groups` WHERE roundId = ?', [round.id]);
  console.log(`\nRound "${round.name}" — ${groups.length} group(s)`);

  for (const group of groups) {
    // Get players sorted by handicap (lowest first)
    const [players] = await conn.execute(
      `SELECT gp.userId, u.name, tp.currentHandicap
       FROM group_players gp
       JOIN users u ON u.id = gp.userId
       JOIN trip_players tp ON tp.tripId = ? AND tp.userId = gp.userId
       WHERE gp.groupId = ?
       ORDER BY tp.currentHandicap ASC`,
      [trip.id, group.id]
    );
    console.log(`  Group "${group.name}": ${players.map(p => `${p.name}(HC ${p.currentHandicap})`).join(', ')}`);

    if (players.length < 2) {
      console.log('    Skipping — fewer than 2 players');
      continue;
    }

    // Clear existing pairings
    await conn.execute(
      'UPDATE group_players SET pairId = NULL, partnerId = NULL, scorerId = NULL WHERE groupId = ?',
      [group.id]
    );

    // Shuffle players randomly
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    // Pair them: player[0] & player[1] = Pair A (pairId=1), player[2] & player[3] = Pair B (pairId=2)
    const pairs = [
      { pairId: 1, label: 'Pair A', players: shuffled.slice(0, 2) },
      { pairId: 2, label: 'Pair B', players: shuffled.slice(2, 4) },
    ];

    for (const pair of pairs) {
      if (pair.players.length < 2) {
        // Odd player out — leave unpaired
        for (const p of pair.players) {
          console.log(`    Unpaired: ${p.name}`);
        }
        continue;
      }
      const [p1, p2] = pair.players;
      await conn.execute(
        'UPDATE group_players SET pairId = ?, partnerId = ?, scorerId = ? WHERE groupId = ? AND userId = ?',
        [pair.pairId, p2.userId, p2.userId, group.id, p1.userId]
      );
      await conn.execute(
        'UPDATE group_players SET pairId = ?, partnerId = ?, scorerId = ? WHERE groupId = ? AND userId = ?',
        [pair.pairId, p1.userId, p1.userId, group.id, p2.userId]
      );
      console.log(`    ${pair.label}: ${p1.name} ↔ ${p2.name}`);
    }

    // Lock pairs
    await conn.execute('UPDATE `groups` SET pairsLocked = 1 WHERE id = ?', [group.id]);
    console.log(`    ✓ Pairs locked`);
  }
}

await conn.end();
console.log('\nDone!');
