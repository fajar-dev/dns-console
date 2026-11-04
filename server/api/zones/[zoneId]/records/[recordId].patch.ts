import { dnsRecordSchema, resourceId } from '#shared/validation/cloudflare'

export default apiHandler(async event => services().dns.save(resourceId.parse(getRouterParam(event, 'zoneId')), dnsRecordSchema.parse(await readBody(event)), await authenticatedActorEmail(event), resourceId.parse(getRouterParam(event, 'recordId'))))
