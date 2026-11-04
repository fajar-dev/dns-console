import type { NewLogEntry, LogQuery, LogPage } from '#shared/types/logs'

export interface LogRepository {
  ready(): Promise<void>
  append(entry: NewLogEntry): Promise<void>
  list(query: LogQuery): Promise<LogPage>
}
