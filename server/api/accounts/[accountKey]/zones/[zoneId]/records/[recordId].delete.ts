import { apiHandler } from '../../../../../../http/api-handler'
import { authenticatedActorEmail } from '../../../../../../http/identity'
import { requestServices } from '../../../../../../composition/services'
import { getRouterParam } from 'h3'
import { resourceId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  await requestServices(event).dns.remove(resourceId.parse(getRouterParam(event, 'zoneId')), resourceId.parse(getRouterParam(event, 'recordId')), await authenticatedActorEmail(event))
  return { success: true }
})
