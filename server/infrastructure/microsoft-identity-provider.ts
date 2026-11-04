import * as oidc from 'openid-client'
import type { AuthTransaction, EntraConfig, IdentityProvider } from '../domain/auth'

export class MicrosoftIdentityProvider implements IdentityProvider {
  private configuration?: Promise<oidc.Configuration>

  constructor(private readonly config: EntraConfig, private readonly transport?: oidc.CustomFetch) {}

  private client() {
    this.configuration ??= oidc.discovery(
      new URL(`https://login.microsoftonline.com/${this.config.tenantId}/v2.0`),
      this.config.clientId,
      { client_secret: this.config.clientSecret, id_token_signed_response_alg: 'RS256' },
      oidc.ClientSecretPost(this.config.clientSecret),
      { timeout: 10, execute: [oidc.enableNonRepudiationChecks], ...(this.transport ? { [oidc.customFetch]: this.transport } : {}) }
    ).catch((error) => {
      this.configuration = undefined
      throw error
    })
    return this.configuration
  }

  async authorizationUrl(transaction: AuthTransaction) {
    const config = await this.client()
    return oidc.buildAuthorizationUrl(config, {
      redirect_uri: `${this.config.appUrl}/auth/microsoft/callback`,
      scope: 'openid profile email',
      response_mode: 'query',
      code_challenge: await oidc.calculatePKCECodeChallenge(transaction.verifier),
      code_challenge_method: 'S256',
      state: transaction.state,
      nonce: transaction.nonce
    }).href
  }

  async claims(callback: URL, transaction: AuthTransaction) {
    const tokens = await oidc.authorizationCodeGrant(await this.client(), callback, {
      pkceCodeVerifier: transaction.verifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true
    })
    const claims = tokens.claims()
    if (!claims) throw new Error('Microsoft did not return an ID token.')
    return claims
  }

  logoutUrl() {
    const url = new URL(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/logout`)
    url.searchParams.set('post_logout_redirect_uri', `${this.config.appUrl}/login`)
    url.searchParams.set('client_id', this.config.clientId)
    return url.href
  }
}
