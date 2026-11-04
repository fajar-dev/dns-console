import { Database } from 'bun:sqlite'
import { chmodSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { migrateDatabase } from './migrations'

export const defaultDatabasePath = '.data/dns-console.sqlite'

export function openLogDatabase(path = defaultDatabasePath) {
  if (!path.trim() || path === ':memory:') throw new Error('SQLite requires a persistent database file path.')
  const filename = resolve(path)
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
  const existed = existsSync(filename)
  const database = new Database(filename, { create: true, strict: true, safeIntegers: true })
  try {
    if (!existed) chmodSync(filename, 0o600)
    database.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')
    const mode = database.query<{ journal_mode: string }, []>('PRAGMA journal_mode = WAL').get()
    if (mode?.journal_mode !== 'wal') throw new Error('SQLite WAL mode could not be enabled.')
    database.exec('PRAGMA synchronous = FULL;')
    migrateDatabase(database)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}
