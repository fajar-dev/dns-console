import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createApp, defineEventHandler, toNodeListener } from 'h3'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readJsonBody } from '../../server/http/request-body'
import { MAX_JSON_BODY_BYTES } from '../../shared/constants/http'
import { apiHandler } from '../../server/http/api-handler'
import { dnsRecordSchema } from '../../shared/validation/cloudflare'
import { ApplicationError } from '../../server/domain/errors'

const app = createApp()
app.use('/body', defineEventHandler(event => readJsonBody(event)))
app.use('/validation', apiHandler(async event => dnsRecordSchema.parse(await readJsonBody(event))))
app.use('/failure', apiHandler(() => {
  throw new ApplicationError(409, 'The resource changed.')
}))
const server = createServer(toNodeListener(app))
let base: string
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  server.closeAllConnections()
  await closed
})

function post(path: string, body: string, contentType = 'application/json') {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': contentType }, body })
}

describe('HTTP request boundary', () => {
  test('accepts JSON with charset and maps malformed input to safe errors', async () => {
    const result = await post('/body', '{"value":1}', 'application/json; charset=utf-8')
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ value: 1 })
    expect((await post('/body', '{broken')).status).toBe(400)
    expect((await post('/body', '{}', 'text/plain')).status).toBe(415)
  })

  test('limits declared payload sizes', async () => {
    expect((await post('/body', JSON.stringify({ value: 'x'.repeat(MAX_JSON_BODY_BYTES) }))).status).toBe(413)
  })

  test('limits received bytes without relying on Content-Length', async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${base}/body`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' }
      }, (response) => {
        response.resume()
        response.once('end', () => resolve(response.statusCode))
      })
      req.once('error', reject)
      req.write('{"value":"')
      req.write('x'.repeat(MAX_JSON_BODY_BYTES))
      req.end('"}')
    })
    expect(status).toBe(413)
  })

  test('maps validation and application failures to consistent API responses', async () => {
    const invalid = await post('/validation', '{}')
    expect(invalid.status).toBe(400)
    expect((await invalid.json()).data.message).toContain('type:')
    const conflict = await fetch(`${base}/failure`)
    expect(conflict.status).toBe(409)
    expect((await conflict.json()).data.message).toBe('The resource changed.')
  })
})
