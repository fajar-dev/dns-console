import { CloudflareHttpGateway } from '../infrastructure/cloudflare-gateway'
import { SqliteAuditRepository } from '../infrastructure/sqlite-audit-repository'
import { DnsService } from '../application/dns-service'
import { TunnelService } from '../application/tunnel-service'
import { ApplicationError } from '../domain/errors'

let container: ReturnType<typeof createServices> | undefined

function createServices() {
  const config = useRuntimeConfig()
  if (!config.cloudflareApiToken || !/^[a-f0-9]{32}$/.test(config.cloudflareAccountId)) throw new ApplicationError(503, 'Configure the Cloudflare API token and account ID on the server.')
  const gateway = new CloudflareHttpGateway(config.cloudflareApiToken, config.cloudflareAccountId)
  const audit = new SqliteAuditRepository(config.auditDatabasePath)
  return { gateway, audit, dns: new DnsService(gateway, audit), tunnels: new TunnelService(gateway, audit) }
}

export function services() {
  container ??= createServices()
  return container
}
