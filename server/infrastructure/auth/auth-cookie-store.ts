import { createHash } from 'node:crypto'
import { EncryptJWT, jwtDecrypt } from 'jose'
import { deleteCookie, getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

/** Only encrypted, purpose-bound data is stored in browser cookies. */
export class AuthCookieStore<T extends object> {
  private readonly key: Uint8Array
  readonly name: string

  constructor(secret: string, private readonly purpose: 'identity' | 'transaction', private readonly lifetime: number, private readonly secure: boolean, binding = '') {
    if (secret.length < 32) throw new Error('An auth secret of at least 32 characters is required.')
    this.key = createHash('sha256').update(`${secret}\0${binding}`).digest()
    this.name = `${secure ? '__Host-' : ''}dns-entra-${purpose}`
  }

  async read(event: H3Event): Promise<T | null> {
    const value = getCookie(event, this.name)
    if (!value) return null
    try {
      const { payload } = await jwtDecrypt(value, this.key, {
        issuer: 'dns-console', audience: this.purpose,
        keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'],
        maxTokenAge: this.lifetime, requiredClaims: ['exp', 'iat', 'jti']
      })
      if (typeof payload.data !== 'object' || !payload.data || Array.isArray(payload.data)) return null
      return payload.data as T
    } catch {
      return null
    }
  }

  async write(event: H3Event, data: T, expiresAt: number) {
    expiresAt = Math.min(expiresAt, Math.floor(Date.now() / 1000) + this.lifetime)
    const token = await new EncryptJWT({ data })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', typ: 'JWT' })
      .setIssuer('dns-console').setAudience(this.purpose).setJti(crypto.randomUUID())
      .setIssuedAt().setExpirationTime(expiresAt).encrypt(this.key)
    setCookie(event, this.name, token, {
      httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/',
      maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
    })
  }

  clear(event: H3Event) {
    deleteCookie(event, this.name, { httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/' })
  }
}
