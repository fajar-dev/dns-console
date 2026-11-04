import { useRuntimeConfig } from '#imports'
import { LogService } from '../application/logs/log-service'
import { SqliteLogRepository } from '../infrastructure/sqlite/sqlite-log-repository'
import { openLogDatabase } from '../infrastructure/sqlite/database'
import { ApplicationError } from '../domain/errors'

let database: ReturnType<typeof openLogDatabase> | undefined
let service: LogService | undefined

export function logService() {
  if (!service) {
    try {
      database = openLogDatabase(useRuntimeConfig().sqlitePath)
    } catch {
      throw new ApplicationError(503, 'Logs database is unavailable. Check NUXT_SQLITE_PATH and directory write permissions.')
    }
    service = new LogService(new SqliteLogRepository(database))
  }
  return service
}

export function closeLogDatabase() {
  database?.close()
  database = undefined
  service = undefined
}
