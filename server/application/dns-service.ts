import type { LogWriter, CloudflareGateway } from '../domain/ports'
import type { DnsRecordInput } from '#shared/validation/cloudflare'
import { ApplicationError } from '../domain/errors'

export class DnsService {
  constructor(private readonly gateway: CloudflareGateway, private readonly logs: LogWriter) {}

  async list(zoneId: string) {
    await this.gateway.getZone(zoneId)
    return this.gateway.listRecords(zoneId)
  }

  async save(zoneId: string, input: DnsRecordInput, id?: string) {
    await this.logs.ready()
    const zone = await this.gateway.getZone(zoneId)
    if (input.name !== zone.name && !input.name.endsWith(`.${zone.name}`)) throw new ApplicationError(400, 'Record hostname must belong to the selected zone.')
    const payload = { ...input, ttl: input.proxied ? 1 : input.ttl, priority: input.type === 'MX' ? input.priority : undefined }
    let result
    try {
      result = id ? await this.gateway.updateRecord(zoneId, id, payload) : await this.gateway.createRecord(zoneId, payload)
    } catch (error) {
      await this.logs.record({ action: id ? 'dns.update' : 'dns.create', resource: input.name, outcome: 'failure', detail: `${input.type} write request failed; inspect DNS before retrying` })
      throw error
    }
    await this.logs.record({ action: id ? 'dns.update' : 'dns.create', resource: input.name, outcome: 'success', detail: `${input.type} record saved` })
    return result
  }

  async remove(zoneId: string, id: string) {
    await this.logs.ready()
    await this.gateway.getZone(zoneId)
    const record = (await this.gateway.listRecords(zoneId)).find(item => item.id === id)
    if (!record) throw new ApplicationError(404, 'DNS record was not found.')
    try {
      await this.gateway.deleteRecord(zoneId, id)
    } catch (error) {
      await this.logs.record({ action: 'dns.delete', resource: record.name, outcome: 'failure', detail: `${record.type} delete request failed; inspect DNS before retrying` })
      throw error
    }
    await this.logs.record({ action: 'dns.delete', resource: record.name, outcome: 'success', detail: `${record.type} record deleted` })
  }
}
