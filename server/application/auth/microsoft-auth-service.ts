import { randomBytes } from 'node:crypto'
import type { AuthTransaction, EntraConfig, IdentityProvider, MicrosoftIdentity } from '../../domain/auth'
import { AUTH_SESSION_SECONDS, AUTH_TRANSACTION_SECONDS } from '../../domain/auth'
import { ApplicationError } from '../../domain/errors'
import { actorEmail } from './actor-email'

const guid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function validEntraConfig(config: EntraConfig): boolean {
  try {
    const url = new URL(config.appUrl)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return guid.test(config.tenantId) && guid.test(config.clientId)
      && !!config.clientSecret.trim() && !!config.appRole.trim()
      && config.authSecret.trim().length >= 32
      && (url.protocol === 'https:' || (local && url.protocol === 'http:'))
      && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/'
  } catch {
    return false
  }
}

/** The role is granted by Entra, never by an application user table. */
export class MicrosoftAuthService {
  constructor(private readonly config: EntraConfig, private readonly provider: IdentityProvider, private readonly now = () => Math.floor(Date.now() / 1000)) {}

  async begin() {
    const random = () => randomBytes(32).toString('base64url')
    const transaction: AuthTransaction = { state: random(), nonce: random(), verifier: random(), expiresAt: this.now() + AUTH_TRANSACTION_SECONDS }
    return { transaction, url: await this.provider.authorizationUrl(transaction) }
  }

  async complete(callback: URL, transaction: AuthTransaction | null): Promise<MicrosoftIdentity> {
    if (!transaction || transaction.expiresAt <= this.now()) throw new ApplicationError(401, 'The sign-in request has expired. Sign in again.')
    const claims = await this.provider.claims(callback, transaction)
    if (claims.tid !== this.config.tenantId.toLowerCase() || typeof claims.oid !== 'string' || !guid.test(claims.oid)) {
      throw new ApplicationError(403, 'This Microsoft account cannot access this workspace.')
    }
    if (!Array.isArray(claims.roles) || !claims.roles.includes(this.config.appRole)) {
      throw new ApplicationError(403, 'Your Microsoft account has not been assigned access to this application.')
    }
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= this.now()) throw new ApplicationError(401, 'Your Microsoft sign-in has expired.')
    return {
      tenantId: claims.tid,
      objectId: claims.oid,
      name: typeof claims.name === 'string' ? claims.name.slice(0, 200) : 'Microsoft account',
      username: typeof claims.preferred_username === 'string' ? claims.preferred_username.slice(0, 254) : undefined,
      email: actorEmail({ email: claims.email, username: claims.preferred_username }) ?? undefined,
      roles: [this.config.appRole],
      expiresAt: Math.min(claims.exp, this.now() + AUTH_SESSION_SECONDS)
    }
  }

  authorized(identity: MicrosoftIdentity | null): identity is MicrosoftIdentity {
    return !!identity && identity.tenantId === this.config.tenantId.toLowerCase()
      && typeof identity.objectId === 'string' && guid.test(identity.objectId)
      && Array.isArray(identity.roles) && identity.roles.includes(this.config.appRole)
      && Number.isFinite(identity.expiresAt) && identity.expiresAt > this.now()
  }

  logoutUrl() {
    return this.provider.logoutUrl()
  }
}
