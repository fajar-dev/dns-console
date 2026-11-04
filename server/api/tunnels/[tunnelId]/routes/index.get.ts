import { tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(event => services().tunnels.configuration(tunnelId.parse(getRouterParam(event, 'tunnelId'))))
