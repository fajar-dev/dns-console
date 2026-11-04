import { ApplicationError } from '../../domain/errors'

export interface AuthFailure {
  reason: 'signin' | 'denied' | 'transaction' | 'credentials' | 'redirect' | 'verification'
  code?: string
  microsoftCode?: string
  claim?: string
}

/** Extract diagnostic identifiers only. Never log tokens or raw provider errors. */
export function authFailure(error: unknown, hasTransaction: boolean): AuthFailure {
  const result: AuthFailure = { reason: hasTransaction ? 'signin' : 'transaction' }
  if (error instanceof ApplicationError) {
    result.reason = error.status === 403 ? 'denied' : 'transaction'
    return result
  }
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const value = current as Record<string, unknown>
    if (typeof value.code === 'string' && /^(OAUTH_|ERR_JWT_|ERR_JWS_|ERR_JWE_)[A-Z0-9_]{1,60}$/.test(value.code)) result.code ??= value.code
    if (typeof value.claim === 'string' && ['iss', 'aud', 'azp', 'exp', 'iat', 'nbf', 'nonce', 'auth_time'].includes(value.claim)) result.claim = value.claim
    if (typeof value.error_description === 'string') result.microsoftCode ??= value.error_description.match(/\bAADSTS\d{4,10}\b/)?.[0]
    current = value.cause
  }
  if (['AADSTS7000215', 'AADSTS7000222', 'AADSTS7000218'].includes(result.microsoftCode ?? '')) result.reason = 'credentials'
  else if (result.microsoftCode === 'AADSTS50011') result.reason = 'redirect'
  else if (result.microsoftCode === 'AADSTS50105') result.reason = 'denied'
  else if (result.code?.includes('JWT_') || result.code?.includes('JWS_') || result.claim) result.reason = 'verification'
  return result
}
