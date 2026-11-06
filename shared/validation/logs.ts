import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../constants/pagination'
import * as z from 'zod'

export const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().refine(value => PAGE_SIZES.some(size => size === value), 'Unsupported page size').default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(200).default(''),
  outcome: z.enum(['all', 'success', 'failure']).default('all'),
  category: z.enum(['all', 'dns', 'route']).default('all'),
  account: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).default('all')
}).strict()
