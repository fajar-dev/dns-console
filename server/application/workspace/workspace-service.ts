import type { CloudflareAccount } from '#shared/types/accounts'
import type { WorkspaceCollection, WorkspaceZone, WorkspaceTunnel } from '#shared/types/workspace'
import type { CloudflareGateway } from '../../domain/cloudflare-gateway'
import { ApplicationError } from '../../domain/errors'

interface AccountSource {
  account: CloudflareAccount
  gateway: Pick<CloudflareGateway, 'listZones' | 'listTunnels'>
}

/** Aggregates resources while retaining their owner and isolating account failures. */
export class WorkspaceService {
  constructor(private readonly sources: AccountSource[]) {}

  private async collect<T extends { id: string, name: string }>(load: (gateway: AccountSource['gateway']) => Promise<T[]>) {
    const results = await Promise.allSettled(this.sources.map(async ({ account, gateway }) =>
      (await load(gateway)).map(item => ({ ...item, key: `${account.id}:${item.id}`, owner: account }))
    ))
    const collection: WorkspaceCollection<T & { key: string, owner: CloudflareAccount }> = { items: [], issues: [] }
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') collection.items.push(...result.value)
      else collection.issues.push({
        account: this.sources[index]!.account,
        message: result.reason instanceof ApplicationError ? result.reason.message : 'Resources could not be loaded for this account.'
      })
    }
    collection.items.sort((left, right) => left.name.localeCompare(right.name) || left.key.localeCompare(right.key))
    return collection
  }

  zones(): Promise<WorkspaceCollection<WorkspaceZone>> {
    return this.collect(gateway => gateway.listZones())
  }

  tunnels(): Promise<WorkspaceCollection<WorkspaceTunnel>> {
    return this.collect(gateway => gateway.listTunnels())
  }
}
