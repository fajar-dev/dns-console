import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { LogRepository } from '../domain/ports'
import type { LogEntry, LogPage, LogQuery, NewLogEntry } from '#shared/types/logs'

interface LogRow extends RowDataPacket {
  id: string
  created_at: Date
  action: string
  resource: string
  outcome: LogEntry['outcome']
  detail: string
}

interface TotalsRow extends RowDataPacket {
  total: string | number
  success: string | number | null
  failure: string | number | null
}

export class MysqlLogRepository implements LogRepository {
  constructor(private readonly pool: Pool) {}

  async ready() {
    await this.pool.execute('SELECT id FROM console_logs LIMIT 0')
  }

  async append(entry: NewLogEntry) {
    await this.pool.execute(
      'INSERT INTO console_logs (created_at, action, resource, outcome, detail) VALUES (UTC_TIMESTAMP(3), ?, ?, ?, ?)',
      [entry.action, entry.resource, entry.outcome, entry.detail]
    )
  }

  async list(query: LogQuery): Promise<LogPage> {
    const conditions: string[] = []
    const parameters: string[] = []
    if (query.search) {
      const search = `%${query.search.replace(/[!%_]/g, character => `!${character}`)}%`
      conditions.push('(resource LIKE ? ESCAPE \'!\' OR action LIKE ? ESCAPE \'!\' OR detail LIKE ? ESCAPE \'!\')')
      parameters.push(search, search, search)
    }
    if (query.outcome !== 'all') {
      conditions.push('outcome = ?')
      parameters.push(query.outcome)
    }
    if (query.category !== 'all') {
      conditions.push('action LIKE ?')
      parameters.push(`${query.category}.%`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const connection = await this.pool.getConnection()
    try {
      // Count and page share a consistent snapshot even while new logs arrive.
      await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
      await connection.beginTransaction()
      const [totals] = await connection.execute<TotalsRow[]>(
        `SELECT COUNT(*) AS total, SUM(outcome = 'success') AS success, SUM(outcome = 'failure') AS failure FROM console_logs ${where}`, parameters
      )
      const total = Number(totals[0]?.total ?? 0)
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
      const page = Math.min(query.page, totalPages)
      const [rows] = await connection.execute<LogRow[]>(
        `SELECT id, created_at, action, resource, outcome, detail FROM console_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...parameters, query.pageSize, (page - 1) * query.pageSize]
      )
      await connection.commit()
      return {
        entries: rows.map(row => ({ id: String(row.id), timestamp: row.created_at.toISOString(), action: row.action, resource: row.resource, outcome: row.outcome, detail: row.detail })),
        page, pageSize: query.pageSize, total, totalPages,
        summary: { success: Number(totals[0]?.success ?? 0), failure: Number(totals[0]?.failure ?? 0) }
      }
    } catch (error) {
      await connection.rollback().catch(() => {})
      throw error
    } finally {
      connection.release()
    }
  }
}
