export interface MicrosoftUser {
  tenantId: string
  objectId: string
  name: string
  username?: string
  email?: string
}

export interface AuthStatus {
  authenticated: boolean
  authConfigured: boolean
  cloudflareConfigured: boolean
  user: MicrosoftUser | null
}
