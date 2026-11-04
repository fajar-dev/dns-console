import type { MicrosoftIdentity } from '../domain/auth'

declare module 'h3' {
  interface H3EventContext {
    microsoftIdentity?: MicrosoftIdentity | null
    jsonBody?: unknown
  }
}

export {}
