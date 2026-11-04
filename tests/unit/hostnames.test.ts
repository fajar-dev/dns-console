import { describe, expect, test } from 'bun:test'
import { findHostnameZone, isHostnameInZone } from '../../shared/utils/hostnames'

describe('Hostname ownership', () => {
  test('accepts zone apex and descendants, and rejects suffix lookalikes', () => {
    expect(isHostnameInZone('example.com', 'example.com')).toBe(true)
    expect(isHostnameInZone('*.example.com', 'example.com')).toBe(true)
    expect(isHostnameInZone('app.dev.example.com', 'example.com')).toBe(true)
    expect(isHostnameInZone('notexample.com', 'example.com')).toBe(false)
    expect(isHostnameInZone('example.com.attacker.test', 'example.com')).toBe(false)
  })
  test('chooses the most specific zone without mutating its input', () => {
    const zones = [{ name: 'example.com', id: 'parent' }, { name: 'dev.example.com', id: 'child' }]
    expect(findHostnameZone('app.dev.example.com', zones)?.id).toBe('child')
    expect(findHostnameZone('other.test', zones)).toBeUndefined()
    expect(zones[0]?.id).toBe('parent')
  })
})
