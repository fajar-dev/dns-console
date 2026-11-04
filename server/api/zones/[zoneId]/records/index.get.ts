import { resourceId } from '#shared/validation/cloudflare'

export default apiHandler(event => services().dns.list(resourceId.parse(getRouterParam(event, 'zoneId'))))
