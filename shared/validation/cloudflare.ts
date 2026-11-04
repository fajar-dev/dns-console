import * as z from 'zod'

export const resourceId = z.string().regex(/^[a-f0-9]{32}$/, 'Invalid Cloudflare ID')
export const tunnelId = z.uuid()
export const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA', 'SRV', 'PTR'] as const
export const editableDnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR'] as const
const hostname = z.string().trim().toLowerCase().max(253).regex(/^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, 'Enter a full hostname, such as app.example.com')

export const dnsRecordSchema = z.object({
  type: z.enum(editableDnsTypes),
  name: hostname,
  content: z.string().trim().min(1).max(4096),
  ttl: z.coerce.number().int().refine(value => value === 1 || (value >= 60 && value <= 86400), 'TTL must be Auto (1) or 60–86400 seconds'),
  proxied: z.boolean().default(false),
  priority: z.coerce.number().int().min(0).max(65535).optional(),
  comment: z.string().max(500).default('')
}).superRefine((record, ctx) => {
  if (record.type === 'A' && !z.ipv4().safeParse(record.content).success) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Enter a valid IPv4 address' })
  if (record.type === 'AAAA' && !z.ipv6().safeParse(record.content).success) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Enter a valid IPv6 address' })
  if (['CNAME', 'MX', 'NS', 'PTR'].includes(record.type) && !hostname.safeParse(record.content.replace(/\.$/, '')).success) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Enter a valid target hostname' })
  if (record.proxied && !['A', 'AAAA', 'CNAME'].includes(record.type)) ctx.addIssue({ code: 'custom', path: ['proxied'], message: 'Only A, AAAA and CNAME support proxying' })
  if (record.type === 'MX' && record.priority === undefined) ctx.addIssue({ code: 'custom', path: ['priority'], message: 'MX priority is required' })
})

export const routeSchema = z.object({
  zoneId: resourceId,
  hostname,
  service: z.string().trim().max(2048).refine((value) => {
    try {
      const url = new URL(value)
      return ['http:', 'https:', 'ssh:', 'tcp:', 'rdp:', 'smb:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password && !url.hash
    } catch { return false }
  }, 'Enter a service URL, such as http://localhost:3000'),
  version: z.string().regex(/^[a-f0-9]{64}$/),
  index: z.number().int().min(0).optional()
})

export const deleteRouteSchema = z.object({
  zoneId: resourceId,
  version: z.string().regex(/^[a-f0-9]{64}$/),
  index: z.number().int().min(0)
})

export type DnsRecordInput = z.infer<typeof dnsRecordSchema>
export type RouteInput = z.infer<typeof routeSchema>
