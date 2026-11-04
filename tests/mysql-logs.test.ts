import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createLogPool } from '../server/infrastructure/mysql-pool'
import { MysqlLogRepository } from '../server/infrastructure/mysql-log-repository'
import { logQuerySchema } from '../shared/validation/logs'

const url = process.env.TEST_MYSQL_URL
describe.skipIf(!url)('MySQL logs integration', () => {
  if (!url) return
  if (!new URL(url).pathname.endsWith('_test')) throw new Error('Integration tests require a dedicated database ending in _test.')
  const pool = createLogPool(url)
  const repository = new MysqlLogRepository(pool)

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const migration = Bun.spawn(['bun', 'run', 'db:migrate'], { env: { ...process.env, NUXT_MYSQL_URL: url }, stdout: 'pipe', stderr: 'pipe' })
      const exit = await migration.exited
      if (exit) throw new Error(await new Response(migration.stderr).text())
      expect(exit).toBe(0)
    }
    await repository.ready()
    await pool.query('DELETE FROM console_logs')
    for (let i = 0; i < 31; i++) {
      await repository.append({ action: i % 2 ? 'route.create' : 'dns.create', resource: `app${i}.example.com`, outcome: i % 3 ? 'success' : 'failure', detail: i === 0 ? 'literal 50%_! match' : 'Saved through console' })
    }
    // Force timestamp ties to exercise deterministic ordering by ID.
    await pool.query('UPDATE console_logs SET created_at = \'2026-11-04 01:02:03.456\'')
  }, 30000)
  afterAll(async () => {
    await pool.end()
  })

  test('persists records with UTC timestamps and stable pagination without overlaps', async () => {
    const first = await repository.list(logQuerySchema.parse({ pageSize: 10 }))
    const second = await repository.list(logQuerySchema.parse({ page: 2, pageSize: 10 }))
    expect(first.total).toBe(31)
    expect(first.totalPages).toBe(4)
    expect(first.summary).toEqual({ success: 20, failure: 11 })
    expect(first.entries).toHaveLength(10)
    expect(first.entries[0]?.resource).toBe('app30.example.com')
    expect(first.entries[0]?.timestamp).toBe('2026-11-04T01:02:03.456Z')
    expect(first.entries.some(entry => second.entries.some(other => entry.id === other.id))).toBe(false)
    const last = await repository.list(logQuerySchema.parse({ page: 999, pageSize: 10 }))
    expect(last.page).toBe(4)
    expect(last.entries).toHaveLength(1)
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
})
