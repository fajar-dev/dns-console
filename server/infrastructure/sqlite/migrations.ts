import { createHash } from 'node:crypto'
import type { Database } from 'bun:sqlite'

// Keep applied migrations immutable; add a new version for future schema changes.
const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE console_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        action TEXT NOT NULL CHECK(length(action) BETWEEN 1 AND 64),
        resource TEXT NOT NULL CHECK(length(resource) BETWEEN 1 AND 253),
        actor_email TEXT CHECK(actor_email IS NULL OR length(actor_email) <= 254),
        outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure')),
        detail TEXT NOT NULL CHECK(length(detail) <= 1024)
      ) STRICT;
      CREATE INDEX logs_created ON console_logs(created_at DESC, id DESC);
      CREATE INDEX logs_outcome_created ON console_logs(outcome, created_at DESC, id DESC);
      CREATE INDEX logs_action_created ON console_logs(action, created_at DESC, id DESC);
    `
  },
  {
    version: 2,
    sql: `
      ALTER TABLE console_logs ADD COLUMN account_key TEXT;
      ALTER TABLE console_logs ADD COLUMN account_name TEXT;
      CREATE INDEX logs_account_created ON console_logs(account_key, created_at DESC, id DESC);
    `
  }
] as const

export function migrateDatabase(database: Database) {
  // Acquire the write lock before checking versions, including across processes.
  database.transaction(() => {
    database.exec(`CREATE TABLE IF NOT EXISTS console_migrations (
      version INTEGER PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT`)
    const applied = database.query<{ version: bigint, checksum: string }, []>(
      'SELECT version, checksum FROM console_migrations ORDER BY version'
    ).all()
    if (applied.some(row => !migrations.some(migration => BigInt(migration.version) === row.version))) {
      throw new Error('Database schema is newer than this application. Use a compatible application version.')
    }
    for (const migration of migrations) {
      const checksum = createHash('sha256').update(migration.sql).digest('hex')
      const existing = applied.find(row => row.version === BigInt(migration.version))
      if (existing) {
        if (existing.checksum !== checksum) throw new Error(`Applied migration ${migration.version} has changed.`)
        continue
      }
      database.exec(migration.sql)
      database.query('INSERT INTO console_migrations (version, checksum, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, checksum, new Date().toISOString())
    }
  }).immediate()
}
