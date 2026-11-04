import * as z from 'zod'
import { ApplicationError } from '../../domain/errors'

const envelopeSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  errors: z.array(z.object({ code: z.number().int() })).optional(),
  result_info: z.object({
    total_pages: z.number().int().min(0).optional(),
    total_count: z.number().int().min(0).optional(),
    per_page: z.number().int().min(1).optional()
  }).optional()
})

export interface CloudflareEnvelope<T> {
  success: boolean
  result: T
  errors?: { code: number }[]
  result_info?: { total_pages?: number, total_count?: number, per_page?: number }
}

export function parseEnvelope<T>(value: unknown): CloudflareEnvelope<T> {
  const result = envelopeSchema.safeParse(value)
  if (!result.success || (result.data.success && result.data.result === undefined)) {
    throw new ApplicationError(502, 'Cloudflare returned an invalid response.')
  }
  return result.data as CloudflareEnvelope<T>
}
