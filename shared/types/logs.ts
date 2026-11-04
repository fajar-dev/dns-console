export interface LogEntry {
  id: string
  timestamp: string
  action: string
  resource: string
  outcome: 'success' | 'failure'
  detail: string
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'timestamp'>

export interface LogQuery {
  page: number
  pageSize: number
  search: string
  outcome: 'all' | 'success' | 'failure'
  category: 'all' | 'dns' | 'route'
}

export interface LogPage {
  entries: LogEntry[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  summary: { success: number, failure: number }
}
