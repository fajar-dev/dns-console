import { LogService } from '../application/log-service'
import { MysqlLogRepository } from '../infrastructure/mysql-log-repository'
import { createLogPool } from '../infrastructure/mysql-pool'
import { ApplicationError } from '../domain/errors'

let pool: ReturnType<typeof createLogPool> | undefined
let service: LogService | undefined

export function logService() {
  if (!service) {
    const { mysqlUrl } = useRuntimeConfig()
    if (!mysqlUrl) throw new ApplicationError(503, 'Configure NUXT_MYSQL_URL and run bun run db:migrate to enable logs and changes.')
    try {
      pool = createLogPool(mysqlUrl)
    } catch {
      throw new ApplicationError(503, 'NUXT_MYSQL_URL must be a valid MySQL connection URL.')
    }
    service = new LogService(new MysqlLogRepository(pool))
  }
  return service
}

export async function closeLogPool() {
  await pool?.end()
  pool = undefined
  service = undefined
}
