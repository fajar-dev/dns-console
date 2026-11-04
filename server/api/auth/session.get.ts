import { apiHandler } from '../../http/api-handler'
import { authConfigured } from '../../composition/auth'
import { microsoftIdentity } from '../../http/identity'
import { useRuntimeConfig } from '#imports'
import type { AuthStatus } from '#shared/types/auth'

export default apiHandler(async (event): Promise<AuthStatus> => {
  const identity = await microsoftIdentity(event)
  const config = useRuntimeConfig()
  return {
    authenticated: !!identity, authConfigured: authConfigured(),
    cloudflareConfigured: !!config.cloudflareApiToken && /^[a-f0-9]{32}$/.test(config.cloudflareAccountId),
    user: identity ? { tenantId: identity.tenantId, objectId: identity.objectId, name: identity.name, username: identity.username, email: identity.email } : null
  }
})
