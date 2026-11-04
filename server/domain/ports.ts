import type { NewLogEntry, LogQuery, LogPage } from '#shared/types/logs'
import type { DnsRecord, Tunnel, TunnelConfig, Zone } from '#shared/types/cloudflare'
import type { DnsRecordInput } from '#shared/validation/cloudflare'

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

export interface LogRepository {
  ready(): Promise<void>
  append(entry: NewLogEntry): Promise<void>
  list(query: LogQuery): Promise<LogPage>
}

export interface LogWriter {
  ready(): Promise<void>
  record(entry: NewLogEntry): Promise<void>
}
