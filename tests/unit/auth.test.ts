import { describe, expect, test } from 'bun:test'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { jwtDecrypt } from 'jose'
import { createHash } from 'node:crypto'
import { MicrosoftAuthService, validEntraConfig } from '../../server/application/auth/microsoft-auth-service'
import { AuthCookieStore } from '../../server/infrastructure/auth/auth-cookie-store'
import { entra, objectId, oidcFixture } from '../support/auth-fixture'

describe('Microsoft Entra configuration', () => {
  test('requires a specific tenant, confidential client, strong secret and trusted origin', () => {
    expect(validEntraConfig(entra)).toBe(true)
    expect(validEntraConfig({ ...entra, appUrl: 'http://localhost:3000' })).toBe(true)
    for (const patch of [{ tenantId: 'common' }, { tenantId: 'organizations' }, { clientId: '' }, { clientSecret: '' }, { authSecret: 'short' }, { appRole: '' }, { appUrl: 'http://console.example.com' }, { appUrl: 'https://attacker@example.com' }, { appUrl: 'https://example.com/path' }, { appUrl: 'https://example.com?next=attacker' }]) {
      expect(validEntraConfig({ ...entra, ...patch })).toBe(false)
    }
  })
})

describe('Microsoft OIDC validation and authorization', () => {
  test('generates fresh state, nonce and PKCE, and only requests sign-in scopes', async () => {
    const { provider } = oidcFixture()
    const service = new MicrosoftAuthService(entra, provider)
    const first = await service.begin()
    const second = await service.begin()
    const url = new URL(first.url)
    expect(url.origin).toBe('https://login.microsoftonline.com')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid profile email')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(first.transaction.verifier).digest('base64url'))
    expect(first.transaction.state).not.toBe(second.transaction.state)
    expect(first.transaction.nonce).not.toBe(second.transaction.nonce)
    expect(first.transaction.verifier).not.toBe(second.transaction.verifier)
    expect(first.url).not.toContain(entra.clientSecret)
    expect(first.url).not.toContain(first.transaction.verifier)
  })

  test('accepts a signed tenant token with the assigned role and bounds session lifetime', async () => {
    const { provider, transaction, callback, calls } = oidcFixture()
    const now = Math.floor(Date.now() / 1000)
    const service = new MicrosoftAuthService(entra, provider, () => now)
    const identity = await service.complete(callback, transaction)
    expect(identity.objectId).toBe(objectId)
    expect(identity.roles).toEqual(['DNSConsole.Access'])
    expect(identity.expiresAt).toBe(now + 900)
    expect(service.authorized(identity)).toBe(true)
    expect(calls.some(call => call.url.endsWith('/keys'))).toBe(true)
    const token = calls.find(call => call.url.endsWith('/token'))!
    expect(token.body.get('redirect_uri')).toBe(`${entra.appUrl}/auth/microsoft/callback`)
    expect(token.body.get('code_verifier')).toBe(transaction.verifier)
  })

  for (const [name, claims] of Object.entries({ 'wrong tenant': { tid: '44444444-4444-4444-8444-444444444444' }, 'missing role': { roles: [] }, 'unassigned role': { roles: ['Other.Access'] }, 'email without immutable identity': { oid: undefined, preferred_username: 'admin@example.com' }, 'wrong issuer': { iss: 'https://attacker.example.com' }, 'wrong audience': { aud: 'other-client' }, 'expired token': { exp: 1 }, 'wrong nonce': { nonce: 'different' } })) {
    test(`rejects ${name}`, async () => {
      const { provider, callback, transaction } = oidcFixture(claims)
      await expect(new MicrosoftAuthService(entra, provider).complete(callback, transaction)).rejects.toThrow()
    })
  }

  test('rejects forged signatures even if every claim looks correct', async () => {
    const { provider, callback, transaction } = oidcFixture({}, true)
    await expect(new MicrosoftAuthService(entra, provider).complete(callback, transaction)).rejects.toThrow()
  })

  test('never extends a session beyond the Microsoft token expiry', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60
    const { provider, callback, transaction } = oidcFixture({ exp })
    expect((await new MicrosoftAuthService(entra, provider).complete(callback, transaction)).expiresAt).toBe(exp)
  })

  test('stores the Microsoft email claim while retaining the account username separately', async () => {
    const { provider, callback, transaction } = oidcFixture({ email: 'mailbox@example.com', preferred_username: 'login@example.com' })
    const identity = await new MicrosoftAuthService(entra, provider).complete(callback, transaction)
    expect(identity.email).toBe('mailbox@example.com')
    expect(identity.username).toBe('login@example.com')
  })

  test('rejects wrong state before exchanging a code and prevents code replay', async () => {
    const { provider, callback, transaction, calls } = oidcFixture()
    const service = new MicrosoftAuthService(entra, provider)
    const wrong = new URL(callback)
    wrong.searchParams.set('state', 'wrong-state')
    await expect(service.complete(wrong, transaction)).rejects.toThrow()
    expect(calls.filter(call => call.url.endsWith('/token'))).toHaveLength(0)
    await service.complete(callback, transaction)
    await expect(service.complete(callback, transaction)).rejects.toThrow()
  })

  test('rejects missing, expired or mismatched PKCE transactions', async () => {
    const { provider, callback, transaction } = oidcFixture()
    const service = new MicrosoftAuthService(entra, provider)
    await expect(service.complete(callback, null)).rejects.toThrow('expired')
    await expect(service.complete(callback, { ...transaction, expiresAt: 1 })).rejects.toThrow('expired')
    await expect(service.complete(callback, { ...transaction, verifier: 'b'.repeat(43) })).rejects.toThrow()
  })

  test('rejects expired sessions and roles or tenants that no longer match configuration', async () => {
    const { provider, callback, transaction } = oidcFixture()
    const service = new MicrosoftAuthService(entra, provider)
    const identity = await service.complete(callback, transaction)
    expect(service.authorized({ ...identity, expiresAt: 1 })).toBe(false)
    expect(service.authorized({ ...identity, roles: [] })).toBe(false)
    expect(service.authorized({ ...identity, tenantId: 'other' })).toBe(false)
    expect(service.authorized(null)).toBe(false)
  })

  test('uses a fixed tenant and configured post-logout URL', () => {
    const { provider } = oidcFixture()
    const url = new URL(provider.logoutUrl())
    expect(url.origin).toBe('https://login.microsoftonline.com')
    expect(url.pathname).toContain(entra.tenantId)
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(`${entra.appUrl}/login`)
  })
})

describe('Encrypted authentication cookies', () => {
  const store = new AuthCookieStore<{ subject: string }>(entra.authSecret, 'identity', 900, true)
  const transaction = new AuthCookieStore<{ subject: string }>(entra.authSecret, 'transaction', 600, true)
  const handle = toWebHandler(createApp().use(defineEventHandler(async (event) => {
    const url = new URL(event.path, 'https://console.example.com')
    if (url.pathname === '/write') {
      await store.write(event, { subject: 'private-subject' }, Math.floor(Date.now() / 1000) + 900)
      return { ok: true }
    }
    if (url.pathname === '/expired') {
      await store.write(event, { subject: 'private-subject' }, 1)
      return { ok: true }
    }
    if (url.pathname === '/clear') {
      store.clear(event)
      return { ok: true }
    }
    return url.pathname === '/transaction' ? await transaction.read(event) ?? {} : await store.read(event) ?? {}
  })))
  const request = (path: string, cookie = '') => handle(new Request(`https://console.example.com${path}`, { headers: { Cookie: cookie } }))

  test('encrypts identity, uses secure cookies, and rotates each successful sign-in', async () => {
    const first = await request('/write')
    const header = first.headers.get('set-cookie')!
    expect(header).toContain('__Host-dns-entra-identity=')
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).not.toContain('private-subject')
    expect(header).not.toContain('Domain=')
    expect(await (await request('/read', header.split(';')[0])).json()).toEqual({ subject: 'private-subject' })
    expect((await request('/write')).headers.get('set-cookie')).not.toBe(header)
    const token = header.split(';')[0]!.split('=')[1]!
    const key = createHash('sha256').update(`${entra.authSecret}\0`).digest()
    const { payload } = await jwtDecrypt(token, key)
    expect(payload.exp! - payload.iat!).toBe(900)
  })

  test('rejects tampered, expired, cross-purpose and legacy cookies', async () => {
    const cookie = (await request('/write')).headers.get('set-cookie')!.split(';')[0]!
    const parts = cookie.split('.')
    parts[parts.length - 1] = 'corrupted'
    expect(await (await request('/read', parts.join('.'))).json()).toEqual({})
    expect(await (await request('/transaction', cookie.replace(store.name, transaction.name))).json()).toEqual({})
    expect(await (await request('/read', 'dns-console=old-password-session')).json()).toEqual({})
    const expired = (await request('/expired')).headers.get('set-cookie')!.split(';')[0]!
    expect(await (await request('/read', expired)).json()).toEqual({})
    expect((await request('/clear')).headers.get('set-cookie')).toContain('Max-Age=0')
  })

  test('invalidates cookies when the encryption key or tenant/client binding changes', async () => {
    const cookie = (await request('/write')).headers.get('set-cookie')!.split(';')[0]!
    for (const other of [new AuthCookieStore(entra.authSecret, 'identity', 900, true, 'other-tenant:other-client'), new AuthCookieStore('a-different-auth-secret-at-least-32-characters', 'identity', 900, true)]) {
      const read = toWebHandler(createApp().use(defineEventHandler(async event => await other.read(event) ?? {})))
      const response = await read(new Request('https://console.example.com', { headers: { Cookie: cookie } }))
      expect(await response.json()).toEqual({})
    }
  })
})
