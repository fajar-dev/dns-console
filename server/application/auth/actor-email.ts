import * as z from 'zod'

const emailSchema = z.email().max(254)

/** Display/audit metadata only; authorization continues to use tenant, oid and roles. */
export function actorEmail(user: { email?: unknown, username?: unknown }): string | null {
  for (const value of [user.email, user.username]) {
    if (typeof value !== 'string') continue
    const result = emailSchema.safeParse(value.trim())
    if (result.success) return result.data
  }
  return null
}
