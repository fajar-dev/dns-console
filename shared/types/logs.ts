export interface LogEntry {
  id: string
  timestamp: string
  action: string
  resource: string
  actorEmail: string | null
  accountKey: string | null
  accountName: string | null
  outcome: 'success' | 'failure'
  detail: string
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'timestamp' | 'accountKey' | 'accountName'> & {
  accountKey?: string
  accountName?: string
}

export interface LogQuery {
  page: number
  pageSize: number
  search: string
  outcome: 'all' | 'success' | 'failure'
  category: 'all' | 'dns' | 'route'
  account: string
}

export interface LogPage {
  entries: LogEntry[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  summary: { success: number, failure: number }
}
