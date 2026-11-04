import { apiHandler } from '../../../../http/api-handler'
import { services } from '../../../../composition/services'
import { getRouterParam } from 'h3'
import { tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(event => services().tunnels.configuration(tunnelId.parse(getRouterParam(event, 'tunnelId'))))
