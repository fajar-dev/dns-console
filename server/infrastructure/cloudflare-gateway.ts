import type { CloudflareGateway } from '../domain/ports'
import type { DnsRecord, Tunnel, TunnelConfig, Zone } from '#shared/types/cloudflare'
import type { DnsRecordInput } from '#shared/validation/cloudflare'
import { ApplicationError } from '../domain/errors'

interface Envelope<T> {
  success: boolean
  result: T
  errors?: { code: number }[]
  result_info?: { total_pages?: number, total_count?: number, per_page?: number }
}

/** Server-only HTTP adapter. Writes are never retried automatically. */
export class CloudflareHttpGateway implements CloudflareGateway {
  constructor(private readonly token: string, private readonly accountId: string, private readonly transport: typeof fetch = fetch) {}

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<Envelope<T>> {
    let response: Response
    try {
      response = await this.transport(`https://api.cloudflare.com/client/v4${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      })
    } catch {
      throw new ApplicationError(502, 'Cloudflare could not be reached. Refresh the resource before retrying a change; its outcome may be unknown.')
    }
    if (response.status === 429) throw new ApplicationError(429, 'Cloudflare rate limit reached. Wait before retrying.')
    let payload: Envelope<T>
    try {
      payload = await response.json() as Envelope<T>
    } catch {
      throw new ApplicationError(502, 'Cloudflare returned an invalid response.')
    }
    if (!response.ok || !payload.success) {
      const codes = payload.errors?.map(error => error.code).join(', ')
      const reason = response.status === 403 || response.status === 401
        ? 'Cloudflare denied access. Check the API token permissions.'
        : response.status === 404 ? 'Cloudflare resource was not found.' : 'Cloudflare rejected the request. Check for conflicting records and valid field values.'
      throw new ApplicationError(response.status === 404 ? 404 : 502, `${reason}${codes ? ` Error code: ${codes}.` : ''}`)
    }
    return payload
  }

  private async all<T>(path: string, perPage = 100): Promise<T[]> {
    const items: T[] = []
    for (let page = 1; ; page++) {
      const separator = path.includes('?') ? '&' : '?'
      const result = await this.request<T[]>(`${path}${separator}per_page=${perPage}&page=${page}`)
      items.push(...result.result)
      const info = result.result_info
      const pageSize = info?.per_page ?? perPage
      const totalPages = info?.total_pages ?? (info?.total_count === undefined ? undefined : Math.ceil(info.total_count / pageSize))
      if (!result.result.length || (totalPages !== undefined ? page >= totalPages : result.result.length < pageSize)) return items
      if (page >= 100) throw new ApplicationError(502, 'Too many Cloudflare results. Narrow the account scope.')
    }
  }

  listZones() { return this.all<Zone>(`/zones?account.id=${this.accountId}`, 50) }
  async getZone(id: string) {
    const zone = (await this.request<Zone>(`/zones/${id}`)).result
    if (zone.account.id !== this.accountId) throw new ApplicationError(403, 'This zone does not belong to the configured account.')
    return zone
  }

  listRecords(zoneId: string) { return this.all<DnsRecord>(`/zones/${zoneId}/dns_records`) }
  async createRecord(zoneId: string, input: DnsRecordInput) { return (await this.request<DnsRecord>(`/zones/${zoneId}/dns_records`, 'POST', input)).result }
  async updateRecord(zoneId: string, id: string, input: DnsRecordInput) { return (await this.request<DnsRecord>(`/zones/${zoneId}/dns_records/${id}`, 'PATCH', input)).result }
  async deleteRecord(zoneId: string, id: string) { await this.request(`/zones/${zoneId}/dns_records/${id}`, 'DELETE') }
  listTunnels() { return this.all<Tunnel>(`/accounts/${this.accountId}/cfd_tunnel?is_deleted=false`) }
  async getTunnel(id: string) { return (await this.request<Tunnel>(`/accounts/${this.accountId}/cfd_tunnel/${id}`)).result }
  async getConfiguration(id: string) { return (await this.request<{ config: TunnelConfig, source?: string }>(`/accounts/${this.accountId}/cfd_tunnel/${id}/configurations`)).result }
  async putConfiguration(id: string, config: TunnelConfig) { await this.request(`/accounts/${this.accountId}/cfd_tunnel/${id}/configurations`, 'PUT', { config }) }
}
