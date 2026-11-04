import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import type { CustomFetch } from 'openid-client'
import type { AuthTransaction, EntraConfig } from '../../server/domain/auth'
import { MicrosoftIdentityProvider } from '../../server/infrastructure/auth/microsoft-identity-provider'

export const entra: EntraConfig = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  clientSecret: 'test-client-secret', appRole: 'DNSConsole.Access',
  appUrl: 'https://console.example.com', authSecret: 'test-auth-secret-with-more-than-32-characters'
}
export const objectId = '33333333-3333-4333-8333-333333333333'
export const issuer = `https://login.microsoftonline.com/${entra.tenantId}/v2.0`
const keys = await generateKeyPair('RS256', { extractable: true })
const otherKeys = await generateKeyPair('RS256')
const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-signing-key', use: 'sig', alg: 'RS256' }

export function oidcFixture(overrides: Record<string, unknown> = {}, badSignature = false) {
  const now = Math.floor(Date.now() / 1000)
  const transaction: AuthTransaction = { state: 'state-test-value', nonce: 'nonce-test-value', verifier: 'a'.repeat(43), expiresAt: now + 600 }
  const claims = { sub: 'test-subject', tid: entra.tenantId, oid: objectId, name: 'Test User', preferred_username: 'user@example.com', roles: [entra.appRole], iss: issuer, aud: entra.clientId, iat: now, exp: now + 3600, nonce: transaction.nonce, ...overrides }
  const calls: { url: string, body: URLSearchParams }[] = []
  const usedCodes = new Set<string>()
  const transport: CustomFetch = async (input, options) => {
    const url = new URL(input)
    const body = new URLSearchParams(String(options.body ?? ''))
    calls.push({ url: url.href, body })
    if (url.pathname.endsWith('/.well-known/openid-configuration')) {
      return Response.json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/keys`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_post'], code_challenge_methods_supported: ['S256'] })
    }
    if (url.pathname.endsWith('/keys')) return Response.json({ keys: [jwk] })
    if (url.pathname.endsWith('/token')) {
      const code = body.get('code') ?? ''
      if (usedCodes.has(code) || body.get('code_verifier') !== transaction.verifier || body.get('client_secret') !== entra.clientSecret) return Response.json({ error: 'invalid_grant' }, { status: 400 })
      usedCodes.add(code)
      return Response.json({ access_token: 'unused-test-access-token', token_type: 'Bearer', expires_in: 3600, id_token: await new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).sign(badSignature ? otherKeys.privateKey : keys.privateKey) })
    }
    throw new Error(`Unexpected OIDC request: ${url.pathname}`)
  }
  const provider = new MicrosoftIdentityProvider(entra, transport)
  const callback = new URL(`${entra.appUrl}/auth/microsoft/callback?code=test-code&state=${transaction.state}`)
  return { provider, transaction, callback, calls, claims }
}
