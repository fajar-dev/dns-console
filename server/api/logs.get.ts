import { logQuerySchema } from '#shared/validation/logs'

export default apiHandler((event) => {
  const query = logQuerySchema.parse(getQuery(event))
  return logService().list(query)
})
