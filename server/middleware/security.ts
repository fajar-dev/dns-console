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
    if (getHeader(event, 'content-type')?.split(';')[0] !== 'application/json') throw createError({ statusCode: 415, statusMessage: 'JSON content type required' })
    const length = Number(getHeader(event, 'content-length') ?? 0)
    if (length > 16384) throw createError({ statusCode: 413, statusMessage: 'Request too large' })
  }
  if (['/api/auth/session', '/api/auth/logout'].includes(path)) return
  if (!await microsoftIdentity(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in with Microsoft to continue.' })
})
