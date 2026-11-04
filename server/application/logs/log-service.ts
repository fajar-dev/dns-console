import type { LogRepository } from '../../domain/log-repository'
import type { LogWriter } from '../../domain/log-writer'
import type { LogQuery, NewLogEntry } from '#shared/types/logs'
import { ApplicationError } from '../../domain/errors'

export class LogService implements LogWriter {
  constructor(private readonly repository: LogRepository) {}

  async ready() {
    try {
      await this.repository.ready()
    } catch {
      throw new ApplicationError(503, 'Logs database is unavailable. Check NUXT_MYSQL_URL and run bun run db:migrate.')
    }
  }

  async record(entry: NewLogEntry) {
    try {
      await this.repository.append(entry)
    } catch {
      // An already committed Cloudflare change must not appear to have failed.
      // Emit metadata to stderr for recovery without leaking connection secrets.
      console.error('Failed to persist console log:', JSON.stringify(entry))
    }
  }

  async list(query: LogQuery) {
    try {
      return await this.repository.list(query)
    } catch {
      throw new ApplicationError(503, 'Logs could not be loaded. Check the MySQL connection and database migrations.')
    }
  }
}
