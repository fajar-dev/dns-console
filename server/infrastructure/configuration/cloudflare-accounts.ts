import { readFileSync, statSync } from 'node:fs'
import * as z from 'zod'
import type { CloudflareAccount } from '#shared/types/accounts'
import { ApplicationError } from '../../domain/errors'

const accountSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).refine(value => value !== 'all'),
  name: z.string().trim().min(1).max(80),
  accountId: z.string().regex(/^[a-f0-9]{32}$/i).transform(value => value.toLowerCase()),
  apiToken: z.string().trim().min(1).max(4096).regex(/^\S+$/)
}).strict()
const fileSchema = z.object({ accounts: z.array(accountSchema).max(100) }).strict()
export type CloudflareAccountCredential = z.infer<typeof accountSchema>

export class CloudflareAccounts {
  private readonly accounts: readonly CloudflareAccountCredential[]

  constructor(contents: string) {
    let parsed: z.infer<typeof fileSchema>
    try {
      if (Buffer.byteLength(contents) > 131072) throw new Error()
      parsed = fileSchema.parse(JSON.parse(contents))
      if (new Set(parsed.accounts.map(account => account.id)).size !== parsed.accounts.length
        || new Set(parsed.accounts.map(account => account.accountId)).size !== parsed.accounts.length) throw new Error()
    } catch {
      // JSON and schema errors can contain credential values. Never expose them.
      throw new ApplicationError(503, 'Cloudflare accounts JSON is invalid. Check its format, required fields and unique account IDs.')
    }
    this.accounts = parsed.accounts
  }

  list(): CloudflareAccount[] {
    return this.accounts.map(({ id, name, accountId }) => ({ id, name, accountId }))
  }

  get(id: string | undefined): Readonly<CloudflareAccountCredential> {
    if (!this.accounts.length) throw new ApplicationError(503, 'Add Cloudflare credentials to the server accounts JSON file.')
    if (!id) throw new ApplicationError(400, 'Resource account is missing.')
    const account = this.accounts.find(account => account.id === id)
    if (!account) throw new ApplicationError(400, 'The selected Cloudflare account is not configured.')
    return Object.freeze({ ...account })
  }
}

export function readCloudflareAccounts(path: string): CloudflareAccounts {
  let contents: string
  try {
    const file = statSync(path)
    if (!file.isFile() || file.size > 131072) throw new Error()
    contents = readFileSync(path, 'utf8')
  } catch {
    throw new ApplicationError(503, 'Cloudflare accounts file is unavailable. Check NUXT_CLOUDFLARE_ACCOUNTS_FILE and file read permissions.')
  }
  return new CloudflareAccounts(contents)
}
