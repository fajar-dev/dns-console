import { describe, expect, test } from 'bun:test'
import { actorEmail } from '../server/application/actor-email'

describe('Actor email metadata', () => {
  test('prefers the Microsoft email claim and supports existing username-only sessions', () => {
    expect(actorEmail({ email: 'mail@example.com', username: 'login@example.com' })).toBe('mail@example.com')
    expect(actorEmail({ username: 'login@example.com' })).toBe('login@example.com')
    expect(actorEmail({ email: 'invalid', username: ' login@example.com ' })).toBe('login@example.com')
  })

  test('does not invent an email when Microsoft supplies no valid email address', () => {
    for (const user of [{}, { username: 'not-an-email' }, { email: ['fake@example.com'] }, { email: 'a'.repeat(300) + '@example.com' }]) {
      expect(actorEmail(user)).toBeNull()
    }
  })
})
