import { apiHandler } from '../../../../http/api-handler'
import { services } from '../../../../composition/services'
import { getRouterParam } from 'h3'
import { resourceId } from '#shared/validation/cloudflare'

export default apiHandler(event => services().dns.list(resourceId.parse(getRouterParam(event, 'zoneId'))))
