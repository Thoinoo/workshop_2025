const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'leaderboard.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.prepare(
  `CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT NOT NULL,
    players TEXT NOT NULL,
    elapsed_seconds INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`
).run();

const insertEntryStmt = db.prepare(
  `INSERT INTO leaderboard (team_name, players, elapsed_seconds, created_at)
   VALUES (@team_name, @players, @elapsed_seconds, @created_at)`
);

const topEntriesStmt = db.prepare(
  `SELECT id, team_name, players, elapsed_seconds, created_at
   FROM leaderboard
   ORDER BY elapsed_seconds ASC, created_at ASC
   LIMIT @limit`
);

const rankForEntryStmt = db.prepare(
  `SELECT COUNT(*) AS better
   FROM leaderboard
   WHERE elapsed_seconds < @elapsed_seconds
      OR (elapsed_seconds = @elapsed_seconds AND created_at < @created_at)`
);

const totalEntriesStmt = db.prepare(`SELECT COUNT(*) as count FROM leaderboard`);

const deserializePlayers = (value) => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializePlayers = (value) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify([]);
};

const toEntry = (row, indexOffset = 0) => ({
  id: row.id,
  teamName: row.team_name,
  players: deserializePlayers(row.players),
  elapsedSeconds: row.elapsed_seconds,
  createdAt: row.created_at,
  rank: indexOffset + 1,
});

function addEntry({ teamName, players, elapsedSeconds }) {
  const createdAt = Date.now();
  const normalizedName = typeof teamName === 'string' && teamName.trim().length
    ? teamName.trim()
    : 'Equipe sans nom';
  const normalizedPlayers = Array.isArray(players)
    ? players.filter((name) => typeof name === 'string' && name.trim().length).map((name) => name.trim())
    : [];
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.round(elapsedSeconds)) : null;

  if (elapsed === null) {
    throw new Error('elapsedSeconds must be a finite number');
  }

  const result = insertEntryStmt.run({
    team_name: normalizedName,
    players: serializePlayers(normalizedPlayers),
    elapsed_seconds: elapsed,
    created_at: createdAt,
  });

  const betterCount = rankForEntryStmt.get({
    elapsed_seconds: elapsed,
    created_at: createdAt,
  });

  return {
    id: result.lastInsertRowid,
    teamName: normalizedName,
    players: normalizedPlayers,
    elapsedSeconds: elapsed,
    createdAt,
    rank: (betterCount?.better ?? 0) + 1,
  };
}

function getTopEntries(limit = 10) {
  const sanitizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.round(limit), 100) : 10;
  const rows = topEntriesStmt.all({ limit: sanitizedLimit });
  return rows.map((row, index) => toEntry(row, index));
}

function getTotalEntries() {
  const { count } = totalEntriesStmt.get();
  return count ?? 0;
}

module.exports = {
  addEntry,
  getTopEntries,
  getTotalEntries,
};
