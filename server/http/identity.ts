import { createError } from 'h3'
import type { H3Event } from 'h3'
import { authConfigured, microsoftAuth } from '../composition/auth'
import { actorEmail } from '../application/auth/actor-email'

export async function microsoftIdentity(event: H3Event) {
  if (event.context.microsoftIdentity !== undefined) return event.context.microsoftIdentity
  if (!authConfigured()) return null
  const auth = microsoftAuth()
  const identity = await auth.identity.read(event)
  event.context.microsoftIdentity = auth.service.authorized(identity) ? identity : null
  return event.context.microsoftIdentity
}

export async function authenticatedActorEmail(event: H3Event) {
  const identity = await microsoftIdentity(event)
  if (!identity) throw createError({ statusCode: 401, statusMessage: 'Sign in with Microsoft to continue.' })
  return actorEmail(identity)
}
