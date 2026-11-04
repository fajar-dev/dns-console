import { apiHandler } from '../../http/api-handler'
import { authConfigured, microsoftAuth } from '../../composition/auth'

export default apiHandler((event) => {
  if (!authConfigured()) return { redirectTo: '/login' }
  const auth = microsoftAuth()
  auth.identity.clear(event)
  auth.transaction.clear(event)
  return { redirectTo: auth.service.logoutUrl() }
})
