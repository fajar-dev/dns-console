import { routeSchema, tunnelId } from '#shared/validation/cloudflare'

export default apiHandler(async (event) => {
  await services().tunnels.save(tunnelId.parse(getRouterParam(event, 'tunnelId')), routeSchema.parse(await readBody(event)))
  return { success: true }
})
