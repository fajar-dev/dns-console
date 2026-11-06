import type { CloudflareAccount } from './accounts'
import type { Tunnel, Zone } from './cloudflare'

export interface WorkspaceResource {
  key: string
  owner: CloudflareAccount
}

export type WorkspaceZone = Zone & WorkspaceResource
export type WorkspaceTunnel = Tunnel & WorkspaceResource

export interface WorkspaceIssue {
  account: CloudflareAccount
  message: string
}

export interface WorkspaceCollection<T> {
  items: T[]
  issues: WorkspaceIssue[]
}
