import { apiHandler } from '../../../../../../http/api-handler'
import { requestServices } from '../../../../../../composition/services'
import { getRouterParam } from 'h3'
import { tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(event => requestServices(event).tunnels.configuration(tunnelId.parse(getRouterParam(event, 'tunnelId'))))
