import { describe, expect, test } from 'bun:test'
import { CloudflareAccounts, readCloudflareAccounts } from '../../server/infrastructure/configuration/cloudflare-accounts'

const first = { id: 'amti', name: 'AMTI', accountId: 'a'.repeat(32), apiToken: 'secret-token-a' }
const second = { id: 'other', name: 'Other', accountId: 'b'.repeat(32), apiToken: 'secret-token-b' }

describe('Cloudflare account credentials', () => {
  test('exposes metadata and resolves credentials by resource owner', () => {
    const registry = new CloudflareAccounts(JSON.stringify({ accounts: [first, second] }))
    expect(registry.list()).toEqual([
      { id: 'amti', name: 'AMTI', accountId: first.accountId },
      { id: 'other', name: 'Other', accountId: second.accountId }
    ])
    expect(JSON.stringify(registry.list())).not.toContain('secret-token')
    expect(registry.get('amti').apiToken).toBe(first.apiToken)
    expect(registry.get('other').apiToken).toBe(second.apiToken)
    expect(() => registry.get(undefined)).toThrow('Resource account is missing')
    expect(() => registry.get('unknown')).toThrow('not configured')
    expect(() => registry.get('../../other')).toThrow('not configured')
  })

  test('returns independent metadata copies and immutable credential objects', () => {
    const registry = new CloudflareAccounts(JSON.stringify({ accounts: [first] }))
    registry.list()[0]!.name = 'Changed'
    expect(registry.list()[0]?.name).toBe('AMTI')
    expect(Object.isFrozen(registry.get('amti'))).toBe(true)
  })

  test('rejects malformed, oversized and ambiguous files without leaking tokens', () => {
    for (const contents of [
      '{broken secret-token-a', JSON.stringify([first]),
      JSON.stringify({ accounts: [first, first] }),
      JSON.stringify({ accounts: [first, { ...second, accountId: first.accountId }] }),
      JSON.stringify({ accounts: [{ ...first, id: 'all' }] }),
      JSON.stringify({ accounts: [{ ...first, accountId: 'invalid' }] }),
      JSON.stringify({ accounts: [{ ...first, apiToken: '' }] }),
      JSON.stringify({ accounts: [{ ...first, apiToken: 'a b' }] }),
      JSON.stringify({ accounts: [{ ...first, extra: 'secret-token-a' }] }),
      JSON.stringify({ accounts: Array.from({ length: 101 }, () => first) }),
      ' '.repeat(131073)
    ]) {
      try {
        new CloudflareAccounts(contents)
        throw new Error('Expected rejection')
      } catch (error) {
        expect((error as Error).message).toContain('JSON is invalid')
        expect((error as Error).message).not.toContain('secret-token-a')
      }
    }
  })

  test('supports an empty configuration and reports missing files safely', () => {
    const registry = new CloudflareAccounts('{"accounts": []}')
    expect(registry.list()).toEqual([])
    expect(() => registry.get('amti')).toThrow('Add Cloudflare credentials')
    expect(() => readCloudflareAccounts('/nonexistent/private-account-token.json')).toThrow('accounts file is unavailable')
  })
})
