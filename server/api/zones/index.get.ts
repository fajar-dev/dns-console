import { apiHandler } from '../../http/api-handler'
import { services } from '../../composition/services'

export default apiHandler(() => services().gateway.listZones())
