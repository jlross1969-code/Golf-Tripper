import mysql2 from "mysql2/promise";

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

const statements = [
  // matchplay_results — TiDB doesn't support DEFAULT with expressions for text columns
  `CREATE TABLE IF NOT EXISTS matchplay_results (
    id int AUTO_INCREMENT NOT NULL,
    roundId int NOT NULL,
    groupId int NOT NULL,
    player1Id int NOT NULL,
    player2Id int NOT NULL,
    player1PartnerId int,
    player2PartnerId int,
    holeResults text NOT NULL,
    matchStatus int NOT NULL DEFAULT 0,
    winner enum('player1','player2','halved','pending') NOT NULL DEFAULT 'pending',
    endedOnHole int,
    nextTeePlayer int,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log("OK:", sql.trim().slice(0, 60));
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("SKIP (exists):", sql.trim().slice(0, 60));
    } else {
      console.error("ERROR:", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete.");
