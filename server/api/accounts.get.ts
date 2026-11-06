import { apiHandler } from '../http/api-handler'
import { cloudflareAccounts } from '../composition/accounts'

export default apiHandler(() => cloudflareAccounts().list())
