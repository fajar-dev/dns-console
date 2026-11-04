export interface Zone {
  id: string
  name: string
  status: string
  account: { id: string, name: string }
}

export interface DnsRecord {
  id: string
  type: string
  name: string
  content: string
  ttl: number
  proxied: boolean
  proxiable?: boolean
  priority?: number
  comment?: string
}

export interface Tunnel {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'inactive'
  remote_config: boolean
  config_src?: string
  connections: { id: string, colo_name: string, client_version: string }[]
  created_at: string
}

export interface IngressRule {
  hostname?: string
  path?: string
  service: string
  originRequest?: Record<string, unknown>
  [key: string]: unknown
}

export interface TunnelConfig {
  ingress?: IngressRule[]
  [key: string]: unknown
}

export interface RouteConfiguration {
  config: TunnelConfig
  version: string
  editable: boolean
}
