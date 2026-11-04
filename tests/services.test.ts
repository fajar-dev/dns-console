import { describe, expect, test } from 'bun:test'
import type { CloudflareGateway } from '../server/domain/ports'
import type { DnsRecord, TunnelConfig } from '../shared/types/cloudflare'
import type { DnsRecordInput } from '../shared/validation/cloudflare'
import { dnsRecordSchema, routeSchema } from '../shared/validation/cloudflare'
import { DnsService } from '../server/application/dns-service'
import { TunnelService, configurationVersion } from '../server/application/tunnel-service'
import { MemoryLogWriter } from './support/memory-log-writer'
import { CloudflareHttpGateway } from '../server/infrastructure/cloudflare-gateway'

const zoneId = 'a'.repeat(32)
const tunnelId = '12345678-1234-4234-8234-123456789abc'
class FakeGateway implements CloudflareGateway {
  records: DnsRecord[] = []
  config: TunnelConfig = { 'ingress': [{ service: 'http_status:404' }], 'originRequest': { connectTimeout: 15 }, 'warp-routing': { enabled: true } }
  failWrite = false
  ambiguousWrite = false
  failDelete = false
  writes = 0
  listZones() { return Promise.resolve([{ id: zoneId, name: 'example.com', status: 'active', account: { id: zoneId, name: 'Test' } }]) }
  async getZone() { return (await this.listZones())[0]! }
  listRecords() { return Promise.resolve(structuredClone(this.records)) }
  createRecord(_zoneId: string, input: DnsRecordInput) {
    const record: DnsRecord = { ...input, id: crypto.randomUUID().replaceAll('-', '') }
    this.records.push(record)
    return Promise.resolve(record)
  }

  updateRecord(_zoneId: string, id: string, input: DnsRecordInput) {
    const record = { ...input, id }
    this.records = this.records.map(item => item.id === id ? record : item)
    return Promise.resolve(record)
  }

  deleteRecord(_zoneId: string, id: string) {
    if (this.failDelete) return Promise.reject(new Error('DNS delete failed'))
    this.records = this.records.filter(record => record.id !== id)
    return Promise.resolve()
  }

  listTunnels() { return Promise.resolve([]) }
  getTunnel() { return Promise.resolve({ id: tunnelId, name: 'Test', status: 'healthy' as const, remote_config: true, connections: [], created_at: '' }) }
  getConfiguration() { return Promise.resolve({ config: structuredClone(this.config), source: 'cloudflare' }) }
  putConfiguration(_id: string, config: TunnelConfig) {
    this.writes++
    if (this.failWrite) return Promise.reject(new Error('Cloudflare unavailable'))
    this.config = structuredClone(config)
    if (this.ambiguousWrite) return Promise.reject(new Error('Response lost after commit'))
    return Promise.resolve()
  }
}
function setup() {
  const gateway = new FakeGateway()
  const logs = new MemoryLogWriter()
  const service = new TunnelService(gateway, logs)
  const input = () => ({ zoneId, hostname: 'app.example.com', service: 'http://localhost:3000', version: configurationVersion(gateway.config) })
  return { gateway, logs, service, input }
}

describe('Tunnel publishing', () => {
  test('creates DNS and preserves catch-all, origin settings and private routing', async () => {
    const { gateway, logs, service, input } = setup()
    await service.save(tunnelId, input())
    expect(gateway.records[0]?.content).toBe(`${tunnelId}.cfargotunnel.com`)
    expect(gateway.records[0]?.proxied).toBe(true)
    expect(gateway.config.ingress?.at(-1)?.service).toBe('http_status:404')
    expect(gateway.config.originRequest).toEqual({ connectTimeout: 15 })
    expect(gateway.config['warp-routing']).toEqual({ enabled: true })
    expect(logs.entries[0]?.action).toBe('route.create')
  })
  test('rejects stale revisions before changing DNS', async () => {
    const { gateway, service, input } = setup()
    const body = input()
    gateway.config.ingress?.unshift({ hostname: 'other.example.com', service: 'http://localhost:80' })
    await expect(service.save(tunnelId, body)).rejects.toThrow('configuration has changed')
    expect(gateway.records).toHaveLength(0)
  })
  test('rejects DNS conflict without changing ingress', async () => {
    const { gateway, service, input } = setup()
    gateway.records.push({ id: 'b'.repeat(32), name: 'app.example.com', type: 'A', content: '192.0.2.1', ttl: 1, proxied: false })
    await expect(service.save(tunnelId, input())).rejects.toThrow('conflicting DNS')
    expect(gateway.writes).toBe(0)
  })
  test('removes only newly created DNS after a confirmed failed configuration update', async () => {
    const { gateway, service, input } = setup()
    gateway.failWrite = true
    await expect(service.save(tunnelId, input())).rejects.toThrow('Cloudflare unavailable')
    expect(gateway.records).toHaveLength(0)
  })
  test('confirms a committed configuration after an ambiguous timeout', async () => {
    const { gateway, service, input } = setup()
    gateway.ambiguousWrite = true
    await service.save(tunnelId, input())
    expect(gateway.records).toHaveLength(1)
    expect(gateway.config.ingress?.[0]?.hostname).toBe('app.example.com')
  })
  test('reports cleanup failure for manual reconciliation', async () => {
    const { gateway, service, input, logs } = setup()
    gateway.failWrite = true
    gateway.failDelete = true
    await expect(service.save(tunnelId, input())).rejects.toThrow('DNS cleanup failed')
    expect(logs.entries[0]?.outcome).toBe('failure')
  })
  test('preserves pre-existing matching DNS when deleting a route', async () => {
    const { gateway, service, input } = setup()
    gateway.records.push({ id: 'b'.repeat(32), name: 'app.example.com', type: 'CNAME', content: `${tunnelId}.cfargotunnel.com`, ttl: 1, proxied: true })
    await service.save(tunnelId, input())
    await service.remove(tunnelId, { zoneId, index: 0, version: configurationVersion(gateway.config) })
    expect(gateway.records).toHaveLength(1)
    expect(gateway.config.ingress).toEqual([{ service: 'http_status:404' }])
  })
  test('deletes DNS owned by this application when the last hostname rule is removed', async () => {
    const { gateway, service, input } = setup()
    await service.save(tunnelId, input())
    await service.remove(tunnelId, { zoneId, index: 0, version: configurationVersion(gateway.config) })
    expect(gateway.records).toHaveLength(0)
  })
  test('editing preserves an existing path and origin settings', async () => {
    const { gateway, service, input } = setup()
    gateway.config.ingress?.unshift({ hostname: 'app.example.com', path: '/api/.*', service: 'http://localhost:80', originRequest: { httpHostHeader: 'internal.example.com' } })
    await service.save(tunnelId, { ...input(), index: 0 })
    expect(gateway.config.ingress?.[0]?.path).toBe('/api/.*')
    expect(gateway.config.ingress?.[0]?.originRequest).toEqual({ httpHostHeader: 'internal.example.com' })
    expect(gateway.config.ingress?.[0]?.service).toBe('http://localhost:3000')
  })
  test('reports DNS cleanup failure after route removal without restoring ingress', async () => {
    const { gateway, service, input, logs } = setup()
    await service.save(tunnelId, input())
    gateway.failDelete = true
    await expect(service.remove(tunnelId, { zoneId, index: 0, version: configurationVersion(gateway.config) })).rejects.toThrow('Route was removed')
    expect(gateway.config.ingress).toEqual([{ service: 'http_status:404' }])
    expect(gateway.records).toHaveLength(1)
    expect(logs.entries[0]?.outcome).toBe('failure')
  })
  test('serializes concurrent changes and rejects the stale writer', async () => {
    const { gateway, service, input } = setup()
    const body = input()
    const results = await Promise.allSettled([service.save(tunnelId, body), service.save(tunnelId, { ...body, hostname: 'second.example.com' })])
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(gateway.records).toHaveLength(1)
  })
  test('cannot delete the catch-all', async () => {
    const { service, input } = setup()
    await expect(service.remove(tunnelId, { zoneId, version: input().version, index: 0 })).rejects.toThrow('catch-all')
  })
})

describe('DNS validation and service', () => {
  test('blocks changes before Cloudflare writes when logs are unavailable', async () => {
    const { gateway, logs, service, input } = setup()
    logs.ready = () => Promise.reject(new Error('Logs unavailable'))
    await expect(service.save(tunnelId, input())).rejects.toThrow('Logs unavailable')
    const dns = new DnsService(gateway, logs)
    await expect(dns.save(zoneId, { type: 'A', name: 'app.example.com', content: '192.0.2.1', ttl: 1, proxied: false, comment: '' })).rejects.toThrow('Logs unavailable')
    expect(gateway.records).toHaveLength(0)
    expect(gateway.writes).toBe(0)
  })
  test('records a failed DNS deletion without including record values', async () => {
    const { gateway, logs } = setup()
    const service = new DnsService(gateway, logs)
    const record = await service.save(zoneId, { type: 'A', name: 'app.example.com', content: '192.0.2.1', ttl: 1, proxied: false, comment: '' })
    gateway.failDelete = true
    await expect(service.remove(zoneId, record.id)).rejects.toThrow('DNS delete failed')
    expect(logs.entries[0]?.outcome).toBe('failure')
    expect(logs.entries[0]?.action).toBe('dns.delete')
    expect(JSON.stringify(logs.entries)).not.toContain('192.0.2.1')
  })
  test('validates IPs, TTL, priority and proxy support', () => {
    const record = { type: 'A', name: 'app.example.com', content: 'invalid', ttl: 1, proxied: false }
    expect(dnsRecordSchema.safeParse(record).success).toBe(false)
    expect(dnsRecordSchema.safeParse({ ...record, content: '192.0.2.1', ttl: 2 }).success).toBe(false)
    expect(dnsRecordSchema.safeParse({ ...record, type: 'MX', content: 'mail.example.com', proxied: true }).success).toBe(false)
    expect(routeSchema.safeParse({ zoneId, hostname: 'app.example.com', service: 'file:///etc/passwd', version: 'a'.repeat(64) }).success).toBe(false)
  })
  test('rejects a hostname outside the selected zone', async () => {
    const { gateway, logs } = setup()
    const service = new DnsService(gateway, logs)
    await expect(service.save(zoneId, { type: 'A', name: 'example.com.attacker.com', content: '192.0.2.1', ttl: 1, proxied: false, comment: '' })).rejects.toThrow('selected zone')
  })
})

describe('Cloudflare adapter', () => {
  test('fetches all pages', async () => {
    const calls: string[] = []
    const transport = (async (url: string | URL | Request) => {
      calls.push(String(url))
      return Response.json({ success: true, result: [{ id: String(calls.length) }], result_info: { total_pages: 2 } })
    }) as typeof fetch
    const client = new CloudflareHttpGateway('test-token', zoneId, transport)
    expect(await client.listZones()).toHaveLength(2)
    expect(calls[1]).toContain('page=2')
  })
  test('supports pagination metadata without total_pages', async () => {
    let page = 0
    const transport = (async () => {
      page++
      return Response.json({ success: true, result: [{ id: String(page) }], result_info: { total_count: 2, per_page: 1 } })
    }) as unknown as typeof fetch
    const client = new CloudflareHttpGateway('test-token', zoneId, transport)
    expect(await client.listTunnels()).toHaveLength(2)
  })
  test('does not retry writes or expose bearer credentials on errors', async () => {
    let calls = 0
    const transport = (async () => {
      calls++
      return Response.json({ success: false, errors: [{ code: 10000, message: 'secret-token' }] }, { status: 403 })
    }) as unknown as typeof fetch
    const client = new CloudflareHttpGateway('secret-token', zoneId, transport)
    await expect(client.putConfiguration(tunnelId, {})).rejects.toThrow('denied access')
    expect(calls).toBe(1)
  })
})
