const { createClient } = require("@libsql/client");

let client = null;

async function getDb() {
  if (client) return client;

  client = createClient({
    url: process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? "file:/tmp/local.db" : "file:local.db"),
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )`,
    ],
    "write"
  );

  // Migrations : ajouter les colonnes si elles n'existent pas encore
  const migrations = [
    "ALTER TABLE conversations ADD COLUMN title TEXT",
    "ALTER TABLE conversations ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN display_name TEXT",
  ];

  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch (_) {
      // Colonne déjà présente, on ignore
    }
  }

  return client;
}

module.exports = { getDb };
