import { apiHandler } from '../../../../http/api-handler'
import { authenticatedActorEmail } from '../../../../http/identity'
import { services } from '../../../../composition/services'
import { getRouterParam } from 'h3'
import { resourceId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  await services().dns.remove(resourceId.parse(getRouterParam(event, 'zoneId')), resourceId.parse(getRouterParam(event, 'recordId')), await authenticatedActorEmail(event))
  return { success: true }
})
