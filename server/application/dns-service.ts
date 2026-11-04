import type { AuditRepository, CloudflareGateway } from '../domain/ports'
import type { DnsRecordInput } from '#shared/validation/cloudflare'
import { ApplicationError } from '../domain/errors'

export class DnsService {
  constructor(private readonly gateway: CloudflareGateway, private readonly audit: AuditRepository) {}

  async list(zoneId: string) {
    await this.gateway.getZone(zoneId)
    return this.gateway.listRecords(zoneId)
  }

  async save(zoneId: string, input: DnsRecordInput, id?: string) {
    const zone = await this.gateway.getZone(zoneId)
    if (input.name !== zone.name && !input.name.endsWith(`.${zone.name}`)) throw new ApplicationError(400, 'Record hostname must belong to the selected zone.')
    const payload = { ...input, ttl: input.proxied ? 1 : input.ttl, priority: input.type === 'MX' ? input.priority : undefined }
    const result = id ? await this.gateway.updateRecord(zoneId, id, payload) : await this.gateway.createRecord(zoneId, payload)
    this.audit.append({ action: id ? 'dns.update' : 'dns.create', resource: input.name, outcome: 'success', detail: `${input.type} record saved` })
    return result
  }

  async remove(zoneId: string, id: string) {
    await this.gateway.getZone(zoneId)
    const record = (await this.gateway.listRecords(zoneId)).find(item => item.id === id)
    if (!record) throw new ApplicationError(404, 'DNS record was not found.')
    await this.gateway.deleteRecord(zoneId, id)
    this.audit.append({ action: 'dns.delete', resource: record.name, outcome: 'success', detail: `${record.type} record deleted` })
  }
}
