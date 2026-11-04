import { createError, getHeader, getRequestWebStream } from 'h3'
import type { H3Event } from 'h3'
import { MAX_JSON_BODY_BYTES } from '../../shared/constants/http'

// H3's Node stream adapter has no cancel hook. Drain rejected input without retaining it.
async function discardRemaining(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    while (!(await reader.read()).done) { /* Discard remaining chunks. */ }
  } catch { /* The client may close the connection after receiving an error. */ } finally { reader.releaseLock() }
}

/** Works with native Node requests and Nitro's Bun/local-fetch request bridge. */
export async function readJsonBody(event: H3Event): Promise<unknown> {
  const contentType = getHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') throw createError({ statusCode: 415, statusMessage: 'JSON content type required' })
  if (Number(getHeader(event, 'content-length') ?? 0) > MAX_JSON_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Request too large' })
  }
  const reader = getRequestWebStream(event)?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'JSON body required' })
  const chunks: Uint8Array[] = []
  let size = 0
  let draining = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_JSON_BODY_BYTES) {
        draining = true
        void discardRemaining(reader)
        throw createError({ statusCode: 413, statusMessage: 'Request too large' })
      }
      chunks.push(value)
    }
  } finally {
    if (!draining) reader.releaseLock()
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }
}
