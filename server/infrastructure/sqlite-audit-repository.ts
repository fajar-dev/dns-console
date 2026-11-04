import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { AuditEntry } from '#shared/types/cloudflare'
import type { AuditRepository } from '../domain/ports'

export class SqliteAuditRepository implements AuditRepository {
  private readonly database: Database

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.database = new Database(path, { create: true })
    this.database.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, outcome TEXT NOT NULL, detail TEXT NOT NULL)')
  }

  append(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    this.database.query('INSERT INTO audit VALUES (?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), new Date().toISOString(), entry.action, entry.resource, entry.outcome, entry.detail)
  }

  recent(): AuditEntry[] {
    return this.database.query('SELECT * FROM audit ORDER BY timestamp DESC, rowid DESC LIMIT 100').all() as AuditEntry[]
  }
}
