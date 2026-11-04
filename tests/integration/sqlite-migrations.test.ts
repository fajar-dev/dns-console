import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openLogDatabase } from '../../server/infrastructure/sqlite/database'

describe('SQLite migration safety', () => {
  let directory: string
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'dns-migration-test-'))
  })
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  test('persists data after closing and reopening the database', () => {
    const filename = join(directory, 'nested', 'logs.sqlite')
    const database = openLogDatabase(filename)
    database.query('INSERT INTO console_logs (created_at, action, resource, actor_email, outcome, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run('2026-11-04T01:02:03.456Z', 'dns.create', 'example.net', 'actor@example.net', 'success', 'Created')
    database.close()
    const reopened = openLogDatabase(filename)
    try {
      expect(reopened.query('SELECT actor_email FROM console_logs').get()).toEqual({ actor_email: 'actor@example.net' })
    } finally {
      reopened.close()
    }
  })

  test('refuses changed migrations and future schemas without removing existing data', () => {
    const filename = join(directory, 'logs.sqlite')
    const database = openLogDatabase(filename)
    database.exec('UPDATE console_migrations SET checksum = \'modified\'')
    database.close()
    expect(() => openLogDatabase(filename)).toThrow('has changed')
    const future = new Database(filename)
    future.exec('UPDATE console_migrations SET version = 99')
    future.close()
    expect(() => openLogDatabase(filename)).toThrow('newer than this application')
  })

  test('rolls back the entire schema migration when a statement fails', () => {
    const filename = join(directory, 'logs.sqlite')
    const database = new Database(filename)
    database.exec('CREATE TABLE existing (id INTEGER); CREATE INDEX logs_created ON existing(id)')
    database.close()
    expect(() => openLogDatabase(filename)).toThrow()
    const reopened = new Database(filename)
    try {
      expect(reopened.query('SELECT name FROM sqlite_schema WHERE name IN (\'console_logs\', \'console_migrations\')').all()).toEqual([])
      expect(reopened.query('SELECT name FROM sqlite_schema WHERE name = \'existing\'').get()).toEqual({ name: 'existing' })
    } finally {
      reopened.close()
    }
  })

  test('requires persistent storage and rejects invalid database paths', () => {
    expect(() => openLogDatabase('')).toThrow('persistent database file')
    expect(() => openLogDatabase(':memory:')).toThrow('persistent database file')
    expect(() => openLogDatabase(directory)).toThrow()
  })

  test('serializes migrations from separate processes', async () => {
    const filename = join(directory, 'logs.sqlite')
    const processes = Array.from({ length: 2 }, () => Bun.spawn([process.execPath, 'scripts/migrate.ts'], {
      env: { ...process.env, NUXT_SQLITE_PATH: filename },
      stdout: 'ignore', stderr: 'pipe'
    }))
    for (const process of processes) {
      const error = await new Response(process.stderr).text()
      expect(error).toBe('')
      expect(await process.exited).toBe(0)
    }
    const database = openLogDatabase(filename)
    try {
      expect(database.query('SELECT version FROM console_migrations').all()).toEqual([{ version: 1n }])
    } finally {
      database.close()
    }
  })
})
