import * as z from 'zod'

export const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().pipe(z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])).default(25),
  search: z.string().trim().max(200).default(''),
  outcome: z.enum(['all', 'success', 'failure']).default('all'),
  category: z.enum(['all', 'dns', 'route']).default('all')
}).strict()
