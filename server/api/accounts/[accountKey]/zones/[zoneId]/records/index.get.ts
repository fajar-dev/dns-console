import { apiHandler } from '../../../../../../http/api-handler'
import { requestServices } from '../../../../../../composition/services'
import { getRouterParam } from 'h3'
import { resourceId } from '#shared/validation/cloudflare'

export default apiHandler(event => requestServices(event).dns.list(resourceId.parse(getRouterParam(event, 'zoneId'))))
