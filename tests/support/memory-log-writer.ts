import type { LogWriter } from '../../server/domain/log-writer'
import type { NewLogEntry } from '../../shared/types/logs'

export class MemoryLogWriter implements LogWriter {
  entries: NewLogEntry[] = []
  ready() { return Promise.resolve() }
  record(entry: NewLogEntry) {
    this.entries.unshift(entry)
    return Promise.resolve()
  }
}
