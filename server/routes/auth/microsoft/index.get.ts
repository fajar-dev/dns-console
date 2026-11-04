import { microsoftAuth } from '../../../composition/auth'
import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const auth = microsoftAuth()
  auth.identity.clear(event)
  auth.transaction.clear(event)
  try {
    const { transaction, url } = await auth.service.begin()
    await auth.transaction.write(event, transaction, transaction.expiresAt)
    return sendRedirect(event, url)
  } catch {
    return sendRedirect(event, '/login?error=unavailable')
  }
})
