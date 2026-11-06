import type { H3Event } from 'h3'
import type { CloudflareAccountCredential } from '../infrastructure/configuration/cloudflare-accounts'
import { logService } from './logs'
import { cloudflareAccounts } from './accounts'
import { getRouterParam } from 'h3'
import { WorkspaceService } from '../application/workspace/workspace-service'
import { CloudflareHttpGateway } from '../infrastructure/cloudflare/cloudflare-http-gateway'
import { DnsService } from '../application/dns/dns-service'
import { TunnelService } from '../application/tunnels/tunnel-service'
import type { LogWriter } from '../domain/log-writer'

const containers = new Map<string, ReturnType<typeof createServices>>()

function createServices(account: CloudflareAccountCredential) {
  const gateway = new CloudflareHttpGateway(account.apiToken, account.accountId)
  const logs: LogWriter = {
    ready: () => logService().ready(),
    record: entry => logService().record({ ...entry, accountKey: account.id, accountName: account.name })
  }
  return { gateway, dns: new DnsService(gateway, logs), tunnels: new TunnelService(gateway, logs) }
}

function accountServices(accountKey: string | undefined) {
  const account = cloudflareAccounts().get(accountKey)
  let container = containers.get(account.id)
  if (!container) {
    container = createServices(account)
    containers.set(account.id, container)
  }
  return container
}

export function requestServices(event: H3Event) {
  return accountServices(getRouterParam(event, 'accountKey'))
}

let workspace: WorkspaceService | undefined
export function workspaceService() {
  workspace ??= new WorkspaceService(cloudflareAccounts().list().map(account => ({ account, gateway: accountServices(account.id).gateway })))
  return workspace
}
