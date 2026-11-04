import * as z from 'zod'

// Single-process throttle. Deploy behind an edge rate limiter for multiple replicas.
const attempts = new Map<string, { count: number, reset: number }>()

export default apiHandler(async (event) => {
  const session = await adminSession(event)
  const key = getRequestIP(event) ?? 'unknown'
  const now = Date.now()
  for (const [ip, value] of attempts) if (value.reset < now) attempts.delete(ip)
  const attempt = attempts.get(key) ?? { count: 0, reset: now + 15 * 60 * 1000 }
  if (attempt.count >= 10 || attempts.size > 10000) throw createError({ statusCode: 429, statusMessage: 'Too many login attempts. Try again in 15 minutes.' })
  attempt.count++
  attempts.set(key, attempt)
  const body = z.object({ password: z.string().min(1).max(1024) }).parse(await readBody(event))
  if (!secureEqual(body.password, useRuntimeConfig().adminPassword)) throw createError({ statusCode: 401, statusMessage: 'Invalid admin password' })
  await session.update({ authenticated: true })
  attempts.delete(key)
  return { authenticated: true }
})
