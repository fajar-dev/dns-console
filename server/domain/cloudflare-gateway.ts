import type { DnsRecord, DnsRecordInput, Tunnel, TunnelConfig, Zone } from '#shared/types/cloudflare'

export interface CloudflareGateway {
  listZones(): Promise<Zone[]>
  getZone(id: string): Promise<Zone>
  listRecords(zoneId: string): Promise<DnsRecord[]>
  createRecord(zoneId: string, input: DnsRecordInput): Promise<DnsRecord>
  updateRecord(zoneId: string, id: string, input: DnsRecordInput): Promise<DnsRecord>
  deleteRecord(zoneId: string, id: string): Promise<void>
  listTunnels(): Promise<Tunnel[]>
  getTunnel(id: string): Promise<Tunnel>
  getConfiguration(id: string): Promise<{ config: TunnelConfig, source?: string }>
  putConfiguration(id: string, config: TunnelConfig): Promise<void>
}
