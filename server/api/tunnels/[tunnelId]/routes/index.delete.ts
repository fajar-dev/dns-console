import { deleteRouteSchema, tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  await services().tunnels.remove(tunnelId.parse(getRouterParam(event, 'tunnelId')), deleteRouteSchema.parse(await readBody(event)), await authenticatedActorEmail(event))
  return { success: true }
})
