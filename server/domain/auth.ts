import type { MicrosoftUser } from '#shared/types/auth'

export const AUTH_SESSION_SECONDS = 15 * 60
export const AUTH_TRANSACTION_SECONDS = 10 * 60

export interface EntraConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  appRole: string
  appUrl: string
  authSecret: string
}

export interface AuthTransaction {
  state: string
  nonce: string
  verifier: string
  expiresAt: number
}

export interface MicrosoftIdentity extends MicrosoftUser {
  roles: string[]
  expiresAt: number
}

export interface IdentityProvider {
  authorizationUrl(transaction: AuthTransaction): Promise<string>
  claims(callback: URL, transaction: AuthTransaction): Promise<Record<string, unknown>>
  logoutUrl(): string
}
