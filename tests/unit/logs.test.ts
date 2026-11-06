import { describe, expect, mock, test } from 'bun:test'
import { logQuerySchema } from '../../shared/validation/logs'
import { LogService } from '../../server/application/logs/log-service'
import type { LogRepository } from '../../server/domain/log-repository'

describe('Log queries', () => {
  test('defaults and coerces pagination while bounding expensive queries', () => {
    expect(logQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25, search: '', category: 'all', outcome: 'all', account: 'all' })
    expect(logQuerySchema.parse({ page: '2', pageSize: '10', search: ' app.example.com ' }).search).toBe('app.example.com')
    for (const query of [{ page: 0 }, { page: 1.5 }, { page: 1000001 }, { pageSize: 1000 }, { pageSize: 11 }, { outcome: 'invalid' }, { category: 'invalid' }, { search: 'a'.repeat(201) }, { sort: 'DROP TABLE' }, { page: ['1', '2'] }]) {
      expect(logQuerySchema.safeParse(query).success).toBe(false)
    }
  })
})

describe('Log failures', () => {
  const repository: LogRepository = {
    ready: () => Promise.reject(new Error('secret connection URL')),
    append: () => Promise.reject(new Error('secret connection URL')),
    list: () => Promise.reject(new Error('secret connection URL'))
  }
  const service = new LogService(repository)

  test('returns actionable database errors without credentials', async () => {
    await expect(service.ready()).rejects.toThrow('directory write permissions')
    await expect(service.list(logQuerySchema.parse({}))).rejects.toThrow('Check the SQLite file')
  })

  test('does not report a committed Cloudflare operation as failed if logging fails', async () => {
    const output = mock(() => {})
    const original = console.error
    console.error = output
    try {
      await service.record({ actorEmail: 'actor@example.com', action: 'dns.create', resource: 'app.example.com', outcome: 'success', detail: 'A record saved' })
      expect(output).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(output.mock.calls)).not.toContain('secret connection URL')
    } finally {
      console.error = original
    }
  })
})
