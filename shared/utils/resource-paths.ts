import type { WorkspaceResource } from '../types/workspace'

export function zoneRecordsPath(zone: WorkspaceResource & { id: string }) {
  return `/api/accounts/${encodeURIComponent(zone.owner.id)}/zones/${encodeURIComponent(zone.id)}/records`
}

export function tunnelRoutesPath(tunnel: WorkspaceResource & { id: string }) {
  return `/api/accounts/${encodeURIComponent(tunnel.owner.id)}/tunnels/${encodeURIComponent(tunnel.id)}/routes`
}
