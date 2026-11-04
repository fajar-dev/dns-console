import { entraConfig, microsoftAuth } from '../../../composition/auth'
import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { authFailure } from '../../../application/auth/auth-failure'

export default defineEventHandler(async (event) => {
  const auth = microsoftAuth()
  const transaction = await auth.transaction.read(event)
  auth.transaction.clear(event)
  auth.identity.clear(event)
  try {
    const callback = new URL('/auth/microsoft/callback', entraConfig().appUrl)
    callback.search = getRequestURL(event).search
    const identity = await auth.service.complete(callback, transaction)
    await auth.identity.write(event, identity, identity.expiresAt)
    return sendRedirect(event, '/')
  } catch (error) {
    const failure = authFailure(error, !!transaction)
    console.warn('[auth] Microsoft callback rejected', JSON.stringify(failure))
    return sendRedirect(event, `/login?error=${failure.reason}`)
  }
})
