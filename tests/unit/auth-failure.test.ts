import { describe, expect, test } from 'bun:test'
import { authFailure } from '../../server/application/auth/auth-failure'
import { ApplicationError } from '../../server/domain/errors'

describe('Safe authentication diagnostics', () => {
  test('distinguishes absent transactions and denied roles', () => {
    expect(authFailure(new Error('private token'), false)).toEqual({ reason: 'transaction' })
    expect(authFailure(new ApplicationError(403, 'private user'), true)).toEqual({ reason: 'denied' })
  })

  test('extracts only Microsoft error identifiers, never descriptions or tokens', () => {
    const result = authFailure({ code: 'OAUTH_RESPONSE_BODY_ERROR', error_description: 'AADSTS7000215: secret=private-secret token=private-token user=private-user', cause: { access_token: 'private-access-token' } }, true)
    expect(result).toEqual({ reason: 'credentials', code: 'OAUTH_RESPONSE_BODY_ERROR', microsoftCode: 'AADSTS7000215' })
    expect(JSON.stringify(result)).not.toContain('private-')
  })

  test('identifies claim validation failures through nested causes', () => {
    expect(authFailure({ code: 'OAUTH_JWT_CLAIM_COMPARISON_FAILED', cause: { claim: 'nonce', claims: { nonce: 'private-nonce' } } }, true)).toEqual({ reason: 'verification', code: 'OAUTH_JWT_CLAIM_COMPARISON_FAILED', claim: 'nonce' })
    expect(authFailure({ cause: { error_description: 'AADSTS50011: private redirect' } }, true).reason).toBe('redirect')
    expect(authFailure({ cause: { error_description: 'AADSTS50105: private user' } }, true).reason).toBe('denied')
  })

  test('bounds cause traversal and ignores arbitrary user-controlled identifiers', () => {
    const cyclic: Record<string, unknown> = { code: 'raw-private-token', claim: 'private-user', error_description: 'no identifier' }
    cyclic.cause = cyclic
    expect(authFailure(cyclic, true)).toEqual({ reason: 'signin', microsoftCode: undefined })
  })
})
