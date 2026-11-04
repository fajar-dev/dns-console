import type { NewLogEntry } from '#shared/types/logs'

export interface LogWriter {
  ready(): Promise<void>
  record(entry: NewLogEntry): Promise<void>
}
