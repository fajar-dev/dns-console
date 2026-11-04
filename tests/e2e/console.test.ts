import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { request as httpRequest } from 'node:http'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import type { MicrosoftIdentity } from '../../server/domain/auth'
import type { AuthStatus } from '../../shared/types/auth'
import { AuthCookieStore } from '../../server/infrastructure/auth/auth-cookie-store'
import { startProductionServer } from '../support/production-server'

let server: Awaited<ReturnType<typeof startProductionServer>>
let identity: MicrosoftIdentity
let cookie: string

async function cookieFor(data: MicrosoftIdentity) {
  const store = new AuthCookieStore<MicrosoftIdentity>(server.secret, 'identity', 900, true, `${server.tenant}:${server.client}`)
  const handler = toWebHandler(createApp().use(defineEventHandler(async (event) => {
    await store.write(event, data, data.expiresAt)
    return { ok: true }
  })))
  const response = await handler(new Request(`${server.base}/test-cookie`))
  return response.headers.get('set-cookie')!.split(';')[0]!
}

beforeAll(async () => {
  server = await startProductionServer()
  identity = {
    tenantId: server.tenant, objectId: '33333333-3333-4333-8333-333333333333', name: 'HTTP test user',
    email: 'http-test@example.com', roles: ['DNSConsole.Access'], expiresAt: Math.floor(Date.now() / 1000) + 900
  }
  cookie = await cookieFor(identity)
}, 15000)
afterAll(async () => {
  await server?.stop()
})

function get(path: string, authenticated = true) {
  return fetch(`${server.base}${path}`, { redirect: 'manual', headers: authenticated ? { Cookie: cookie } : {} })
}
function post(path: string, body: string, origin = server.base) {
  return fetch(`${server.base}${path}`, { method: 'POST', headers: { 'Cookie': cookie, 'Origin': origin, 'Content-Type': 'application/json' }, body })
}

describe('Built console', () => {
  test('reports readiness with an automatically initialized SQLite database', async () => {
    const response = await get('/health', false)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  test('serves paginated logs from the isolated SQLite database', async () => {
    const response = await get('/api/logs?page=999&pageSize=10')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entries: [], page: 1, pageSize: 10, total: 0, totalPages: 1,
      summary: { success: 0, failure: 0 }
    })
  })

  test('denies anonymous and forged credentials on protected API and pages', async () => {
    expect((await get('/api/zones', false)).status).toBe(401)
    expect((await get('/logs', false)).headers.get('location')).toBe('/login')
    const forged = await fetch(`${server.base}/api/zones`, { headers: { 'Cookie': 'dns-console=old-session', 'Authorization': 'Bearer forged', 'x-dns-console-session': 'forged' } })
    expect(forged.status).toBe(401)
  })

  test('returns only public identity metadata from a valid Microsoft session', async () => {
    const session = await (await get('/api/auth/session')).json() as AuthStatus
    expect(session.authenticated).toBe(true)
    expect(session.user?.name).toBe(identity.name)
    expect(session.user?.email).toBe(identity.email)
    expect(session.user).not.toHaveProperty('roles')
    expect(JSON.stringify(session)).not.toContain(server.secret)
    expect((await get('/api/zones')).status).toBe(503)
  })

  test('rejects sessions with missing roles, foreign tenants and expired identities', async () => {
    for (const data of [{ ...identity, roles: [] }, { ...identity, tenantId: crypto.randomUUID() }, { ...identity, expiresAt: 1 }]) {
      const response = await fetch(`${server.base}/api/zones`, { headers: { Cookie: await cookieFor(data) } })
      expect(response.status).toBe(401)
    }
  })

  test('rejects missing sign-in transactions without reflecting provider text', async () => {
    const callback = await get('/auth/microsoft/callback?code=forged&state=forged&error_description=do-not-reflect', false)
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/login?error=transaction')
    expect(await callback.text()).not.toContain('do-not-reflect')
  })

  test('enforces origin and JSON size/type before mutations', async () => {
    expect((await post('/api/auth/logout', '{}', 'https://attacker.invalid')).status).toBe(403)
    expect((await post('/api/auth/logout', '{broken')).status).toBe(400)
    expect((await post('/api/auth/logout', JSON.stringify({ value: 'x'.repeat(16384) }))).status).toBe(413)
    const text = await fetch(`${server.base}/api/auth/logout`, { method: 'POST', headers: { 'Origin': server.base, 'Content-Type': 'text/plain' }, body: '{}' })
    expect(text.status).toBe(415)
  })

  test('rejects oversized chunked requests at the Bun listener without stopping the server', async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(`${server.base}/api/auth/logout`, {
        method: 'POST', headers: { 'Origin': server.base, 'Cookie': cookie, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' }
      }, (response) => {
        response.resume()
        response.once('end', () => resolve(response.statusCode))
      })
      request.once('error', reject)
      request.write('{"value":"')
      request.write('x'.repeat(16384))
      request.end('"}')
    })
    expect(status).toBe(413)
    expect((await get('/api/auth/session')).status).toBe(200)
  })

  test('clears identity and redirects to the configured Microsoft tenant on logout', async () => {
    const response = await post('/api/auth/logout', '{}')
    expect(response.status).toBe(200)
    const result = await response.json() as { redirectTo: string }
    const destination = new URL(result.redirectTo)
    expect(destination.origin).toBe('https://login.microsoftonline.com')
    expect(destination.pathname).toBe(`/${server.tenant}/oauth2/v2.0/logout`)
    expect(destination.searchParams.get('post_logout_redirect_uri')).toBe(`${server.base}/login`)
    expect(response.headers.getSetCookie().some(value => value.includes('__Host-dns-entra-identity=') && value.includes('Max-Age=0'))).toBe(true)
  })

  test('renders Microsoft-only login and SSR-safe account, navigation and pagination', async () => {
    const login = await (await get('/login', false)).text()
    expect(login).toContain('Continue with Microsoft')
    expect(login).not.toContain('type="password"')
    expect(login).toContain('Asset Monitoring Teknologi Indonesia')
    for (const path of ['/', '/logs', '/tunnels', '/settings']) {
      const response = await get(path)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('Account menu for HTTP test user')
      expect(html).toContain('http-test@example.com')
      expect(html).toContain('aria-label="Mobile navigation"')
      if (path === '/' || path === '/logs') expect(html).toContain('Rows per page')
    }
    expect((await post('/api/auth/login', '{}')).status).toBe(404)
  })
})
