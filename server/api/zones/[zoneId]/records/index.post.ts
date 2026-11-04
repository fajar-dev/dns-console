import { apiHandler } from '../../../../http/api-handler'
import { authenticatedActorEmail } from '../../../../http/identity'
import { services } from '../../../../composition/services'
import { getRouterParam } from 'h3'
import { dnsRecordSchema, resourceId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  const zoneId = resourceId.parse(getRouterParam(event, 'zoneId'))
  const input = dnsRecordSchema.parse(event.context.jsonBody)
  const actor = await authenticatedActorEmail(event)
  return services().dns.save(zoneId, input, actor)
})
