import { createHash } from 'node:crypto'
import type { TunnelConfig } from '#shared/types/cloudflare'

export function configurationVersion(config: TunnelConfig): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex')
}
