import { readJsonBody } from '../http/request-body'
import { microsoftIdentity } from '../http/identity'
import { defineEventHandler, setResponseHeader, createError, getRequestURL, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'Referrer-Policy', 'same-origin')
  if (!path.startsWith('/_nuxt/')) setResponseHeader(event, 'Cache-Control', 'private, no-store')
  if (!path.startsWith('/api/')) return
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)) {
    const origin = getHeader(event, 'origin')
    if (!origin || origin !== getRequestURL(event).origin) throw createError({ statusCode: 403, statusMessage: 'Same-origin request required' })
    // Authenticate before consuming a body, except for the public logout endpoint.
    if (path !== '/api/auth/logout' && !await microsoftIdentity(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in with Microsoft to continue.' })
    event.context.jsonBody = await readJsonBody(event)
  }
  if (['/api/auth/session', '/api/auth/logout'].includes(path)) return
  if (!await microsoftIdentity(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in with Microsoft to continue.' })
})
