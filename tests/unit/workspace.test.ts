import { describe, expect, test } from 'bun:test'
import { WorkspaceService } from '../../server/application/workspace/workspace-service'
import { ApplicationError } from '../../server/domain/errors'
import type { CloudflareGateway } from '../../server/domain/cloudflare-gateway'

function source(id: string, name: string) {
  return {
    account: { id, name, accountId: id.repeat(32) },
    gateway: {
      listZones: async () => [{ id: 'same-id', name: 'example.net', status: 'active', account: { id: id.repeat(32), name } }],
      listTunnels: async () => [{ id: 'same-tunnel-id', name: 'Tunnel', status: 'healthy' as const, remote_config: true, connections: [], created_at: '' }]
    } satisfies Pick<CloudflareGateway, 'listZones' | 'listTunnels'>
  }
}

describe('Unified Cloudflare workspace', () => {
  test('retains distinct resource keys and ownership even for identical names and IDs', async () => {
    const workspace = new WorkspaceService([source('a', 'First'), source('b', 'Second')])
    const zones = await workspace.zones()
    expect(zones.items.map(zone => zone.key)).toEqual(['a:same-id', 'b:same-id'])
    expect(zones.items.map(zone => zone.owner.name)).toEqual(['First', 'Second'])
    expect(zones.issues).toEqual([])
    const tunnels = await workspace.tunnels()
    expect(tunnels.items.map(tunnel => tunnel.key)).toEqual(['a:same-tunnel-id', 'b:same-tunnel-id'])
  })

  test('keeps healthy resources available and exposes only safe account errors', async () => {
    const failed = source('b', 'Second')
    failed.gateway.listZones = () => Promise.reject(new Error('secret token and file path'))
    failed.gateway.listTunnels = () => Promise.reject(new ApplicationError(502, 'Cloudflare denied access.'))
    const workspace = new WorkspaceService([source('a', 'First'), failed])
    const zones = await workspace.zones()
    expect(zones.items).toHaveLength(1)
    expect(zones.issues[0]?.account.name).toBe('Second')
    expect(JSON.stringify(zones)).not.toContain('secret token')
    expect((await workspace.tunnels()).issues[0]?.message).toBe('Cloudflare denied access.')
  })

  test('supports initial setup and reports complete outages without masquerading as an empty account', async () => {
    expect(await new WorkspaceService([]).zones()).toEqual({ items: [], issues: [] })
    const failed = source('a', 'First')
    failed.gateway.listZones = () => Promise.reject(new Error('failed'))
    const result = await new WorkspaceService([failed]).zones()
    expect(result.items).toEqual([])
    expect(result.issues).toHaveLength(1)
  })
})
