import { expect, test } from 'bun:test'
import { KeyedMutex } from '../../server/application/shared/keyed-mutex'

test('a failed operation releases its resource and does not block independent resources', async () => {
  const mutex = new KeyedMutex()
  const gate = Promise.withResolvers<undefined>()
  const events: string[] = []
  const first = mutex.run('first', async () => {
    events.push('first:start')
    await gate.promise
    throw new Error('Expected failure')
  }).catch(error => error.message)
  const second = mutex.run('first', async () => {
    events.push('first:next')
  })
  await mutex.run('other', async () => {
    events.push('other:done')
  })
  expect(events).toEqual(['first:start', 'other:done'])
  gate.resolve(undefined)
  expect(await first).toBe('Expected failure')
  await second
  expect(events).toEqual(['first:start', 'other:done', 'first:next'])
  expect(await mutex.run('first', async () => 'reused')).toBe('reused')
})
