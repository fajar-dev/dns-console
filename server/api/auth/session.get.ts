import { apiHandler } from '../../http/api-handler'
import { authConfigured } from '../../composition/auth'
import { microsoftIdentity } from '../../http/identity'
import { cloudflareConfigured } from '../../composition/accounts'
import type { AuthStatus } from '#shared/types/auth'

export default apiHandler(async (event): Promise<AuthStatus> => {
  const identity = await microsoftIdentity(event)
  return {
    authenticated: !!identity, authConfigured: authConfigured(),
    cloudflareConfigured: cloudflareConfigured(),
    user: identity ? { tenantId: identity.tenantId, objectId: identity.objectId, name: identity.name, username: identity.username, email: identity.email } : null
  }
})
