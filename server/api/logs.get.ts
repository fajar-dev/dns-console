import { apiHandler } from '../http/api-handler'
import { logService } from '../composition/logs'
import { getQuery } from 'h3'
import { logQuerySchema } from '#shared/validation/logs'

export default apiHandler((event) => {
  const query = logQuerySchema.parse(getQuery(event))
  return logService().list(query)
})
