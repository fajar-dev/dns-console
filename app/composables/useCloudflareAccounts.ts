export function useCloudflareAccounts() {
  const request = useLazyFetch('/api/accounts', { key: 'cloudflare-accounts', server: false, default: () => [] })
  return { ...request, accounts: request.data }
}
