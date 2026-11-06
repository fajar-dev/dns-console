import { useRuntimeConfig } from '#imports'
import { readCloudflareAccounts } from '../infrastructure/configuration/cloudflare-accounts'

let accounts: ReturnType<typeof readCloudflareAccounts> | undefined

export function cloudflareAccounts() {
  accounts ??= readCloudflareAccounts(useRuntimeConfig().cloudflareAccountsFile)
  return accounts
}

export function cloudflareConfigured() {
  try {
    return cloudflareAccounts().list().length > 0
  } catch {
    return false
  }
}
