import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export function authConfigured() {
  const config = useRuntimeConfig()
  return config.adminPassword.length >= 12 && config.sessionPassword.length >= 32
}

export function secureEqual(left: string, right: string) {
  return timingSafeEqual(createHash('sha256').update(left).digest(), createHash('sha256').update(right).digest())
}

export async function adminSession(event: H3Event) {
  if (!authConfigured()) throw createError({ statusCode: 503, statusMessage: 'Set an admin password (12+ characters) and session password (32+ characters) on the server.' })
  return useSession<{ authenticated: boolean }>(event, {
    name: 'dns-console',
    password: useRuntimeConfig().sessionPassword,
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev, path: '/' }
  })
}
