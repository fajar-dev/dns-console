import { apiHandler } from '../../../../http/api-handler'
import { authenticatedActorEmail } from '../../../../http/identity'
import { services } from '../../../../composition/services'
import { getRouterParam } from 'h3'
import { routeSchema, tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  await services().tunnels.save(tunnelId.parse(getRouterParam(event, 'tunnelId')), routeSchema.parse(event.context.jsonBody), await authenticatedActorEmail(event))
  return { success: true }
})
