import { apiHandler } from '../../http/api-handler'
import { workspaceService } from '../../composition/services'

export default apiHandler(() => workspaceService().zones())
