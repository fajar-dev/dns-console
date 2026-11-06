// Loaded only by isolated E2E subprocesses. Never imported by application code.
const original = globalThis.fetch
const records = new Map<string, unknown[]>()
const zoneIds = { a: '1'.repeat(32), b: '2'.repeat(32) }
const zone = (key: 'a' | 'b') => ({ id: zoneIds[key], name: `${key}.example.test`, status: 'active', account: { id: key.repeat(32) } })
const tunnelId = '44444444-4444-4444-8444-444444444444'

globalThis.fetch = Object.assign(async (input: string | URL | Request, options?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (url.hostname !== 'api.cloudflare.com') return original(input, options)
  const headers = new Headers(options?.headers)
  const key = headers.get('authorization') === 'Bearer synthetic-token-a' ? 'a' : headers.get('authorization') === 'Bearer synthetic-token-b' ? 'b' : null
  if (!key) return Response.json({ success: false, errors: [{ code: 10000 }] }, { status: 403 })
  if (key === process.env.DNS_TEST_FAIL_ACCOUNT) return Response.json({ success: false, errors: [{ code: 10000 }] }, { status: 403 })
  const path = url.pathname.replace('/client/v4', '')
  let result: unknown
  if (path === '/zones') {
    if (url.searchParams.get('account.id') !== key.repeat(32)) throw new Error('Account query and token do not match')
    result = [zone(key)]
  } else if (path.startsWith('/zones/')) {
    const id = path.split('/')[2]
    if (!path.includes('/dns_records')) result = zone(id === zoneIds.a ? 'a' : 'b')
    else {
      if (id !== zoneIds[key]) throw new Error('Cross-account record access reached the transport')
      const current = records.get(key) ?? []
      if (options?.method === 'POST') {
        result = { ...JSON.parse(String(options.body)), id: '3'.repeat(32), proxiable: true }
        records.set(key, [...current, result])
      } else result = current
    }
  } else if (path === `/accounts/${key.repeat(32)}/cfd_tunnel`) {
    result = [{ id: tunnelId, name: `Tunnel ${key.toUpperCase()}`, status: 'healthy', remote_config: true, connections: [] }]
  } else if (path === `/accounts/${key.repeat(32)}/cfd_tunnel/${tunnelId}`) {
    result = { id: tunnelId, name: `Tunnel ${key.toUpperCase()}`, status: 'healthy', remote_config: true, connections: [] }
  } else if (path === `/accounts/${key.repeat(32)}/cfd_tunnel/${tunnelId}/configurations`) {
    result = { config: { ingress: [{ hostname: `app.${key}.example.test`, service: `http://localhost:${key === 'a' ? 8080 : 8081}` }, { service: 'http_status:404' }] }, source: 'cloudflare' }
  } else {
    return Response.json({ success: false, errors: [{ code: 1000 }] }, { status: 404 })
  }
  return Response.json({ success: true, result, result_info: { total_pages: 1 } })
}, original) as typeof fetch
