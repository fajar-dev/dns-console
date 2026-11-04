import * as z from 'zod'
import type { DnsRecord, Tunnel, TunnelConfig, Zone } from '#shared/types/cloudflare'
import { ApplicationError } from '../../domain/errors'

export const zoneSchema = z.object({
  id: z.string(), name: z.string(), status: z.string().default('unknown'),
  account: z.object({ id: z.string(), name: z.string().default('') })
}) satisfies z.ZodType<Zone>

export const recordSchema = z.object({
  id: z.string(), type: z.string(), name: z.string(),
  content: z.string().default(''), ttl: z.number().int().min(1),
  proxied: z.boolean().default(false), proxiable: z.boolean().optional(),
  priority: z.number().int().optional(), comment: z.string().nullish().transform(value => value ?? undefined)
}) satisfies z.ZodType<DnsRecord>

export const tunnelSchema = z.object({
  id: z.string(), name: z.string(),
  status: z.enum(['healthy', 'degraded', 'down', 'inactive', 'unknown']).default('unknown'),
  remote_config: z.boolean().default(false), config_src: z.string().optional(), created_at: z.string().default(''),
  connections: z.array(z.object({
    id: z.string().default(''), colo_name: z.string().default(''), client_version: z.string().default('')
  })).default([])
}) satisfies z.ZodType<Tunnel>

// Keep every unknown configuration field; complete configurations are written back to Cloudflare.
const tunnelConfigSchema = z.looseObject({
  ingress: z.array(z.looseObject({
    hostname: z.string().optional(), path: z.string().optional(), service: z.string(),
    originRequest: z.record(z.string(), z.unknown()).optional()
  })).optional()
}) satisfies z.ZodType<TunnelConfig>

export const configurationSchema = z.object({
  config: tunnelConfigSchema.default({}), source: z.string().optional()
})

export function parseResult<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ApplicationError(502, 'Cloudflare returned invalid resource data.')
  return result.data
}
