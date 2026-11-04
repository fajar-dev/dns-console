import type { Database } from 'bun:sqlite'
import type { LogRepository } from '../../domain/log-repository'
import type { LogEntry, LogPage, LogQuery, NewLogEntry } from '#shared/types/logs'

interface LogRow {
  id: bigint
  created_at: string
  action: string
  resource: string
  actor_email: string | null
  outcome: LogEntry['outcome']
  detail: string
}

interface TotalsRow {
  total: bigint
  success: bigint | null
  failure: bigint | null
}

export class SqliteLogRepository implements LogRepository {
  constructor(private readonly database: Database) {}

  async ready() {
    this.database.query('SELECT id, actor_email FROM console_logs LIMIT 0').all()
  }

  async append(entry: NewLogEntry) {
    this.database.query(
      'INSERT INTO console_logs (created_at, action, resource, actor_email, outcome, detail) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(new Date().toISOString(), entry.action, entry.resource, entry.actorEmail, entry.outcome, entry.detail)
  }

  async list(query: LogQuery): Promise<LogPage> {
    const conditions: string[] = []
    const parameters: string[] = []
    if (query.search) {
      const search = `%${query.search.replace(/[!%_]/g, character => `!${character}`)}%`
      conditions.push('(resource LIKE ? ESCAPE \'!\' OR action LIKE ? ESCAPE \'!\' OR detail LIKE ? ESCAPE \'!\' OR actor_email LIKE ? ESCAPE \'!\')')
      parameters.push(search, search, search, search)
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
    // The count, summary and page are read from the same SQLite snapshot.
    return this.database.transaction(() => {
      const totals = this.database.query<TotalsRow, string[]>(
        `SELECT COUNT(*) AS total, SUM(outcome = 'success') AS success, SUM(outcome = 'failure') AS failure FROM console_logs ${where}`
      ).get(...parameters)
      const total = Number(totals?.total ?? 0)
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
      const page = Math.min(query.page, totalPages)
      const rows = this.database.query<LogRow, (string | number)[]>(
        `SELECT id, created_at, action, resource, actor_email, outcome, detail FROM console_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      ).all(...parameters, query.pageSize, (page - 1) * query.pageSize)
      return {
        entries: rows.map(row => ({ id: String(row.id), timestamp: row.created_at, action: row.action, resource: row.resource, actorEmail: row.actor_email, outcome: row.outcome, detail: row.detail })),
        page, pageSize: query.pageSize, total, totalPages,
        summary: { success: Number(totals?.success ?? 0), failure: Number(totals?.failure ?? 0) }
      }
    })()
  }
}
