import { useNitroApp } from 'nitropack/runtime'
import { MAX_JSON_BODY_BYTES } from '../../shared/constants/http'

// Nitro's stock Bun entry buffers the body before middleware runs. Enforce the
// same limit at the native listener so oversized requests never reach that bridge.
const nitro = useNitroApp()
const server = Bun.serve({
  hostname: process.env.NITRO_HOST || process.env.HOST,
  port: Number(process.env.NITRO_PORT || process.env.PORT || 3000),
  maxRequestBodySize: MAX_JSON_BODY_BYTES,
  idleTimeout: 30,
  async fetch(request) {
    const url = new URL(request.url)
    return nitro.localFetch(url.pathname + url.search, {
      host: url.host,
      protocol: url.protocol,
      method: request.method,
      headers: request.headers,
      redirect: request.redirect,
      body: request.body ? await request.arrayBuffer() : undefined
    })
  }
})

let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  await server.stop()
  await nitro.hooks.callHook('close')
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
console.log(`Listening on ${server.url}`)
