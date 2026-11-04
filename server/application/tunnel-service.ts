import { createHash } from 'node:crypto'
import type { LogWriter, CloudflareGateway } from '../domain/ports'
import type { RouteInput } from '#shared/validation/cloudflare'
import type { RouteConfiguration, TunnelConfig } from '#shared/types/cloudflare'
import { ApplicationError } from '../domain/errors'

export function configurationVersion(config: TunnelConfig): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex')
}

/** Serializes writes to a tunnel within this application process. */
export class TunnelService {
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(private readonly gateway: CloudflareGateway, private readonly logs: LogWriter) {}

  private async exclusive<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(operation)
    this.locks.set(id, current)
    try {
      return await current
    } finally {
      if (this.locks.get(id) === current) this.locks.delete(id)
    }
  }

  async configuration(id: string): Promise<RouteConfiguration> {
    const tunnel = await this.gateway.getTunnel(id)
    const remote = tunnel.remote_config || tunnel.config_src === 'cloudflare'
    if (!remote) return { config: {}, version: configurationVersion({}), editable: false }
    const result = await this.gateway.getConfiguration(id)
    const config = result.config ?? {}
    return { config, version: configurationVersion(config), editable: result.source !== 'local' }
  }

  private async writable(id: string, version: string) {
    const current = await this.configuration(id)
    if (!current.editable) throw new ApplicationError(409, 'This tunnel is managed locally. Manage its configuration on the origin server.')
    if (current.version !== version) throw new ApplicationError(409, 'Tunnel configuration has changed. Refresh routes before trying again.')
    const rules = current.config.ingress ?? []
    if (rules.length && (rules.at(-1)?.hostname || rules.at(-1)?.path)) throw new ApplicationError(409, 'Tunnel configuration has no final catch-all rule. Fix it in Cloudflare before editing.')
    return current.config
  }

  private async assertHostname(zoneId: string, hostname: string) {
    const zone = await this.gateway.getZone(zoneId)
    if (hostname !== zone.name && !hostname.endsWith(`.${zone.name}`)) throw new ApplicationError(400, 'Hostname must belong to the selected zone.')
  }

  save(id: string, input: RouteInput) {
    return this.exclusive(id, async () => {
      await this.logs.ready()
      await this.assertHostname(input.zoneId, input.hostname)
      const oldConfig = await this.writable(id, input.version)
      const rules = structuredClone(oldConfig.ingress?.length ? oldConfig.ingress : [{ service: 'http_status:404' }])
      if (input.index !== undefined) {
        const existing = rules[input.index]
        if (!existing?.hostname || existing.hostname !== input.hostname) throw new ApplicationError(409, 'Route hostname cannot be renamed. Create a new route instead.')
        rules[input.index] = { ...existing, service: input.service }
      } else {
        if (rules.some(rule => rule.hostname === input.hostname)) throw new ApplicationError(409, 'This hostname already has an ingress rule. Edit the existing route.')
        rules.splice(rules.length - 1, 0, { hostname: input.hostname, service: input.service })
      }
      const target = `${id}.cfargotunnel.com`
      const records = (await this.gateway.listRecords(input.zoneId)).filter(record => record.name === input.hostname)
      if (records.length && (records.length !== 1 || records[0]?.type !== 'CNAME' || records[0]?.content !== target || !records[0]?.proxied)) {
        throw new ApplicationError(409, 'A conflicting DNS record already exists. Resolve it in DNS records before publishing this route.')
      }
      let createdId: string | undefined
      if (!records.length) {
        try {
          createdId = (await this.gateway.createRecord(input.zoneId, { type: 'CNAME', name: input.hostname, content: target, proxied: true, ttl: 1, comment: `Managed by DNS Console | tunnel:${id}` })).id
        } catch (error) {
          await this.logs.record({ action: 'route.save', resource: input.hostname, outcome: 'failure', detail: 'DNS write request failed; ingress was not changed' })
          throw error
        }
      }
      const nextConfig = { ...oldConfig, ingress: rules }
      try {
        // A second read catches edits made while the DNS record was being created.
        await this.writable(id, input.version)
        await this.gateway.putConfiguration(id, nextConfig)
      } catch (error) {
        let observed: TunnelConfig | undefined
        try {
          observed = (await this.gateway.getConfiguration(id)).config
        } catch { /* Outcome remains unknown. */ }
        if (observed && configurationVersion(observed) === configurationVersion(nextConfig)) {
          await this.logs.record({ action: 'route.save', resource: input.hostname, outcome: 'success', detail: 'Configuration confirmed after an ambiguous API response' })
          return
        }
        if (createdId && observed && configurationVersion(observed) === input.version) {
          try {
            await this.gateway.deleteRecord(input.zoneId, createdId)
          } catch {
            await this.logs.record({ action: 'route.save', resource: input.hostname, outcome: 'failure', detail: 'Ingress update failed; DNS cleanup also failed' })
            throw new ApplicationError(502, 'Route could not be saved and DNS cleanup failed. Refresh and inspect both DNS and tunnel configuration.')
          }
        } else if (createdId) {
          await this.logs.record({ action: 'route.save', resource: input.hostname, outcome: 'failure', detail: 'Ingress outcome uncertain; DNS retained to avoid breaking an active route' })
          throw new ApplicationError(502, 'Route outcome is uncertain. DNS was retained. Refresh and inspect the tunnel before retrying.')
        }
        await this.logs.record({ action: 'route.save', resource: input.hostname, outcome: 'failure', detail: 'Ingress update request failed; inspect configuration before retrying' })
        throw error
      }
      await this.logs.record({ action: input.index === undefined ? 'route.create' : 'route.update', resource: input.hostname, outcome: 'success', detail: 'Ingress and proxied CNAME synchronized' })
    })
  }

  remove(id: string, input: { zoneId: string, version: string, index: number }) {
    return this.exclusive(id, async () => {
      await this.logs.ready()
      const current = await this.writable(id, input.version)
      const rules = [...(current.ingress ?? [])]
      const rule = rules[input.index]
      if (!rule?.hostname) throw new ApplicationError(400, 'The catch-all rule cannot be deleted.')
      await this.assertHostname(input.zoneId, rule.hostname)
      rules.splice(input.index, 1)
      try {
        await this.gateway.putConfiguration(id, { ...current, ingress: rules })
      } catch (error) {
        await this.logs.record({ action: 'route.delete', resource: rule.hostname, outcome: 'failure', detail: 'Ingress removal request failed; inspect configuration before retrying' })
        throw error
      }
      if (!rules.some(item => item.hostname === rule.hostname)) {
        try {
          const records = await this.gateway.listRecords(input.zoneId)
          const managed = records.filter(record => record.name === rule.hostname && record.type === 'CNAME' && record.content === `${id}.cfargotunnel.com` && record.comment === `Managed by DNS Console | tunnel:${id}`)
          for (const record of managed) await this.gateway.deleteRecord(input.zoneId, record.id)
        } catch {
          await this.logs.record({ action: 'route.delete', resource: rule.hostname, outcome: 'failure', detail: 'Ingress removed; managed DNS cleanup failed' })
          throw new ApplicationError(502, 'Route was removed, but DNS cleanup failed. Remove its leftover CNAME from DNS records.')
        }
      }
      await this.logs.record({ action: 'route.delete', resource: rule.hostname, outcome: 'success', detail: 'Ingress removed; pre-existing DNS records preserved' })
    })
  }
}
