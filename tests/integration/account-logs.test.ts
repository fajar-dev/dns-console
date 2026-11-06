import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openLogDatabase } from '../../server/infrastructure/sqlite/database'
import { SqliteLogRepository } from '../../server/infrastructure/sqlite/sqlite-log-repository'
import { logQuerySchema } from '../../shared/validation/logs'

const directory = mkdtempSync(join(tmpdir(), 'dns-account-logs-'))
afterAll(() => rmSync(directory, { recursive: true, force: true }))

describe('Account log history', () => {
  test('filters and searches account metadata while retaining unattributed history', async () => {
    const database = openLogDatabase(join(directory, 'accounts.sqlite'))
    try {
      const repository = new SqliteLogRepository(database)
      const entry = { actorEmail: 'actor@example.net', action: 'dns.create', resource: 'app.example.net', outcome: 'success' as const, detail: 'Created' }
      await repository.append(entry)
      await repository.append({ ...entry, accountKey: 'first', accountName: 'Company One' })
      await repository.append({ ...entry, outcome: 'failure', accountKey: 'second', accountName: 'Company Two' })
      const first = await repository.list(logQuerySchema.parse({ account: 'first' }))
      expect(first.total).toBe(1)
      expect(first.summary).toEqual({ success: 1, failure: 0 })
      expect(first.entries[0]?.accountName).toBe('Company One')
      const second = await repository.list(logQuerySchema.parse({ search: 'Company Two' }))
      expect(second.total).toBe(1)
      expect(second.entries[0]?.accountKey).toBe('second')
      const missing = await repository.list(logQuerySchema.parse({ account: 'removed-account' }))
      expect(missing.total).toBe(0)
      const all = await repository.list(logQuerySchema.parse({}))
      expect(all.total).toBe(3)
      expect(all.entries.find(item => item.accountKey === null)?.accountName).toBeNull()
    } finally {
      database.close()
    }
  })

  test('upgrades a version-one database without assigning historical logs to an account', async () => {
    const filename = join(directory, 'upgrade.sqlite')
    const database = openLogDatabase(filename)
    database.exec(`
      DROP INDEX logs_account_created;
      ALTER TABLE console_logs DROP COLUMN account_key;
      ALTER TABLE console_logs DROP COLUMN account_name;
      DELETE FROM console_migrations WHERE version = 2;
    `)
    database.query('INSERT INTO console_logs (created_at, action, resource, actor_email, outcome, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run('2026-11-04T01:02:03.456Z', 'dns.create', 'example.net', 'actor@example.net', 'success', 'Existing change')
    database.close()
    const upgraded = openLogDatabase(filename)
    try {
      const page = await new SqliteLogRepository(upgraded).list(logQuerySchema.parse({}))
      expect(page.total).toBe(1)
      expect(page.entries[0]?.actorEmail).toBe('actor@example.net')
      expect(page.entries[0]?.accountKey).toBeNull()
      expect(page.entries[0]?.accountName).toBeNull()
      expect(upgraded.query('SELECT version FROM console_migrations ORDER BY version').all()).toEqual([{ version: 1n }, { version: 2n }])
    } finally {
      upgraded.close()
    }
  })
})
