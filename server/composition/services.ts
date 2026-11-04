import { logService } from './logs'
import { useRuntimeConfig } from '#imports'
import { CloudflareHttpGateway } from '../infrastructure/cloudflare/cloudflare-http-gateway'
import { DnsService } from '../application/dns/dns-service'
import { TunnelService } from '../application/tunnels/tunnel-service'
import { ApplicationError } from '../domain/errors'
import type { LogWriter } from '../domain/log-writer'

let container: ReturnType<typeof createServices> | undefined

function createServices() {
  const config = useRuntimeConfig()
  if (!config.cloudflareApiToken || !/^[a-f0-9]{32}$/.test(config.cloudflareAccountId)) throw new ApplicationError(503, 'Configure the Cloudflare API token and account ID on the server.')
  const gateway = new CloudflareHttpGateway(config.cloudflareApiToken, config.cloudflareAccountId)
  const logs: LogWriter = { ready: () => logService().ready(), record: entry => logService().record(entry) }
  return { gateway, dns: new DnsService(gateway, logs), tunnels: new TunnelService(gateway, logs) }
}

export function services() {
  container ??= createServices()
  return container
}
