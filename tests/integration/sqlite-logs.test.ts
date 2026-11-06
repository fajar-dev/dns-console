import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openLogDatabase } from '../../server/infrastructure/sqlite/database'
import { migrateDatabase } from '../../server/infrastructure/sqlite/migrations'
import { SqliteLogRepository } from '../../server/infrastructure/sqlite/sqlite-log-repository'
import { logQuerySchema } from '../../shared/validation/logs'

describe('SQLite logs integration', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dns-sqlite-test-'))
  const filename = join(directory, 'logs.sqlite')
  const database = openLogDatabase(filename)
  const repository = new SqliteLogRepository(database)

  beforeAll(async () => {
    migrateDatabase(database)
    await repository.ready()
    for (let i = 0; i < 31; i++) {
      await repository.append({ actorEmail: i === 0 ? null : `actor${i}@example.net`, action: i % 2 ? 'route.create' : 'dns.create', resource: `app${i}.example.com`, outcome: i % 3 ? 'success' : 'failure', detail: i === 0 ? 'literal 50%_! match' : 'Saved through console' })
    }
    // Force timestamp ties to exercise deterministic ordering by ID.
    database.exec('UPDATE console_logs SET created_at = \'2026-11-04T01:02:03.456Z\'')
  }, 30000)
  afterAll(async () => {
    database.close()
    rmSync(directory, { recursive: true, force: true })
  })

  test('persists records with UTC timestamps and stable pagination without overlaps', async () => {
    const first = await repository.list(logQuerySchema.parse({ pageSize: 10 }))
    const second = await repository.list(logQuerySchema.parse({ page: 2, pageSize: 10 }))
    expect(first.total).toBe(31)
    expect(first.totalPages).toBe(4)
    expect(first.summary).toEqual({ success: 20, failure: 11 })
    expect(first.entries).toHaveLength(10)
    expect(first.entries[0]?.resource).toBe('app30.example.com')
    expect(first.entries[0]?.actorEmail).toBe('actor30@example.net')
    expect(first.entries[0]?.timestamp).toBe('2026-11-04T01:02:03.456Z')
    expect(first.entries.some(entry => second.entries.some(other => entry.id === other.id))).toBe(false)
    const last = await repository.list(logQuerySchema.parse({ page: 999, pageSize: 10 }))
    expect(last.page).toBe(4)
    expect(last.entries).toHaveLength(1)
    expect(last.entries[0]?.actorEmail).toBeNull()
  })

  test('combines category, status and search filters on the server', async () => {
    const page = await repository.list(logQuerySchema.parse({ category: 'dns', outcome: 'failure', search: 'example.com' }))
    expect(page.total).toBe(6)
    expect(page.summary).toEqual({ success: 0, failure: 6 })
    expect(page.entries.every(entry => entry.action.startsWith('dns.') && entry.outcome === 'failure')).toBe(true)
  })

  test('searches literal SQL wildcards and treats injection strings as data', async () => {
    expect((await repository.list(logQuerySchema.parse({ search: '50%_!' }))).total).toBe(1)
    const empty = await repository.list(logQuerySchema.parse({ search: '\' OR 1=1 --' }))
    expect(empty.total).toBe(0)
    expect(empty.entries).toEqual([])
    expect(empty.page).toBe(1)
    expect(empty.summary).toEqual({ success: 0, failure: 0 })
    expect((await repository.list(logQuerySchema.parse({}))).total).toBe(31)
  })

  test('searches by actor email without changing pagination or totals', async () => {
    const page = await repository.list(logQuerySchema.parse({ search: 'actor30@example.net' }))
    expect(page.total).toBe(1)
    expect(page.entries[0]?.resource).toBe('app30.example.com')
    expect(page.entries[0]?.actorEmail).toBe('actor30@example.net')
  })

  test('retains logs across independent connections and repeated migrations', async () => {
    const reopened = openLogDatabase(filename)
    try {
      migrateDatabase(reopened)
      const page = await new SqliteLogRepository(reopened).list(logQuerySchema.parse({}))
      expect(page.total).toBe(31)
      expect(reopened.query('SELECT version FROM console_migrations').all()).toEqual([{ version: 1n }, { version: 2n }])
      expect(reopened.query('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    } finally {
      reopened.close()
    }
  })
})
