import type { H3Event } from 'h3'
import type { AuthTransaction, EntraConfig, MicrosoftIdentity } from '../domain/auth'
import { AUTH_SESSION_SECONDS, AUTH_TRANSACTION_SECONDS } from '../domain/auth'
import { MicrosoftAuthService, validEntraConfig } from '../application/microsoft-auth-service'
import { MicrosoftIdentityProvider } from '../infrastructure/microsoft-identity-provider'
import { AuthCookieStore } from '../infrastructure/auth-cookie-store'
import { actorEmail } from '../application/actor-email'

let container: ReturnType<typeof createAuth> | undefined

export function entraConfig(): EntraConfig {
  const config = useRuntimeConfig()
  return {
    tenantId: config.entraTenantId.toLowerCase(), clientId: config.entraClientId.toLowerCase(),
    clientSecret: config.entraClientSecret, appRole: config.entraAppRole,
    appUrl: config.appUrl.replace(/\/+$/, ''), authSecret: config.authSecret
  }
}

export function authConfigured() {
  return validEntraConfig(entraConfig())
}

function createAuth() {
  const config = entraConfig()
  if (!validEntraConfig(config)) throw createError({ statusCode: 503, statusMessage: 'Configure Microsoft Entra ID on the server. See .env.example.' })
  const binding = `${config.tenantId}:${config.clientId}`
  return {
    service: new MicrosoftAuthService(config, new MicrosoftIdentityProvider(config)),
    identity: new AuthCookieStore<MicrosoftIdentity>(config.authSecret, 'identity', AUTH_SESSION_SECONDS, !import.meta.dev, binding),
    transaction: new AuthCookieStore<AuthTransaction>(config.authSecret, 'transaction', AUTH_TRANSACTION_SECONDS, !import.meta.dev, binding)
  }
}

export function microsoftAuth() {
  container ??= createAuth()
  return container
}

export async function microsoftIdentity(event: H3Event) {
  if (!authConfigured()) return null
  const auth = microsoftAuth()
  const identity = await auth.identity.read(event)
  return auth.service.authorized(identity) ? identity : null
}

export async function authenticatedActorEmail(event: H3Event) {
  const identity = await microsoftIdentity(event)
  if (!identity) throw createError({ statusCode: 401, statusMessage: 'Sign in with Microsoft to continue.' })
  return actorEmail(identity)
}
