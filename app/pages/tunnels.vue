<script setup lang="ts">
import type { IngressRule, RouteConfiguration } from '#shared/types/cloudflare'

const { data: tunnels, error, status } = useLazyFetch('/api/tunnels', { server: false, default: () => [] })
const { data: zones, error: zonesError, status: zonesStatus } = useLazyFetch('/api/zones', { key: 'cloudflare-zones', server: false, default: () => [] })
const selectedId = ref(tunnels.value[0]?.id ?? '')
watch(tunnels, (value) => {
  if (!value.some(tunnel => tunnel.id === selectedId.value)) selectedId.value = value[0]?.id ?? ''
})
const selected = computed(() => tunnels.value.find(tunnel => tunnel.id === selectedId.value))
const { data: configuration, error: configError, status: configStatus, refresh: reloadConfiguration } = useLazyAsyncData(
  () => `tunnel-configuration:${selectedId.value}`,
  (_app, { signal }) => selectedId.value ? $fetch<RouteConfiguration>(`/api/tunnels/${selectedId.value}/routes`, { signal }) : Promise.resolve(null),
  { server: false, default: () => null }
)
const tunnelsLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const initialLoading = computed(() => tunnelsLoading.value && !tunnels.value.length)
const zonesLoading = computed(() => zonesStatus.value === 'idle' || zonesStatus.value === 'pending')
const configLoading = computed(() => !!selectedId.value && (configStatus.value === 'idle' || configStatus.value === 'pending'))
const configInitialLoading = computed(() => configLoading.value && !configuration.value)
const rules = computed(() => (configuration.value?.config.ingress ?? []).map((rule, index) => ({ ...rule, index })).filter(rule => rule.hostname))
const modal = ref(false)
const editing = ref<{ rule: IngressRule, index: number }>()
const deleting = ref<{ rule: IngressRule, index: number, version: string }>()
const { busy, mutate } = useConsole()
function badgeColor(status: string) {
  return status === 'healthy' ? 'success' as const : status === 'degraded' ? 'warning' as const : 'neutral' as const
}
function open(rule?: IngressRule, index?: number) {
  editing.value = rule && index !== undefined ? { rule, index } : undefined
  modal.value = true
}
async function saved() {
  modal.value = false
  await reloadConfiguration()
}
async function remove() {
  if (!deleting.value || !configuration.value) return
  const hostname = deleting.value.rule.hostname
  const zone = zones.value.filter(item => hostname === item.name || hostname?.endsWith(`.${item.name}`)).sort((a, b) => b.name.length - a.name.length)[0]
  if (!zone) return
  if (await mutate(() => $fetch(`/api/tunnels/${selectedId.value}/routes`, { method: 'DELETE', body: { zoneId: zone.id, index: deleting.value!.index, version: deleting.value!.version } }), 'Tunnel route removed')) deleting.value = undefined
  await reloadConfiguration()
}
function canManage(hostname?: string) {
  return zones.value.some(zone => hostname === zone.name || hostname?.endsWith(`.${zone.name}`))
}
</script>

<template>
  <div :aria-busy="tunnelsLoading || configLoading || busy">
    <PageHeading
      eyebrow="Secure connectivity"
      title="Tunnels & routes"
      description="Connect public hostnames to services on your private infrastructure."
    />
    <RequestError
      v-if="error"
      :error="error"
      class="mb-6"
    />
    <USkeleton
      v-if="initialLoading"
      class="mb-8 h-5 w-48"
    />
    <div
      v-else
      class="mb-8 flex items-center gap-2 text-sm text-muted"
    >
      <span class="size-2 rounded-lg bg-primary" />{{ tunnels.filter(tunnel => tunnel.status === 'healthy').length }} healthy<span class="mx-2 text-dimmed">/</span>{{ tunnels.length }} total tunnels
    </div>
    <div
      v-if="initialLoading"
      class="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-live="polite"
    >
      <span class="sr-only">Loading tunnels</span>
      <UCard
        v-for="i in 3"
        :key="i"
        aria-hidden="true"
      >
        <div class="mb-4 flex items-center justify-between">
          <USkeleton class="size-9" /><USkeleton class="h-5 w-16" />
        </div>
        <USkeleton class="h-5 w-2/3" />
        <USkeleton class="mt-2 h-3 w-full" />
        <div class="mt-4 flex justify-between">
          <USkeleton class="h-3 w-20" /><USkeleton class="h-3 w-28" />
        </div>
      </UCard>
    </div>
    <div
      v-else-if="tunnels.length"
      class="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <button
        v-for="tunnel in tunnels"
        :key="tunnel.id"
        class="rounded-lg border bg-default p-5 text-left transition hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary"
        :class="selectedId === tunnel.id ? 'border-primary/60 ring-1 ring-primary/10' : 'border-default'"
        :aria-pressed="selectedId === tunnel.id"
        @click="selectedId = tunnel.id"
      >
        <div class="mb-4 flex items-center justify-between">
          <span class="flex size-9 items-center justify-center rounded-md bg-default"><UIcon
            name="i-lucide-network"
            class="size-4 text-primary"
          /></span><UBadge
            :color="badgeColor(tunnel.status)"
            variant="subtle"
            class="capitalize"
          >
            {{ tunnel.status }}
          </UBadge>
        </div>
        <h2 class="truncate font-semibold">
          {{ tunnel.name }}
        </h2><p class="mt-1 truncate font-mono text-xs text-dimmed">
          {{ tunnel.id }}
        </p><div class="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{{ tunnel.connections?.length ?? 0 }} connections</span><span>{{ tunnel.remote_config || tunnel.config_src === 'cloudflare' ? 'Remote configuration' : 'Locally managed' }}</span>
        </div>
      </button>
    </div>
    <UCard
      v-else-if="!error"
      class="mb-8"
    >
      <div class="py-8 text-center">
        <UIcon
          name="i-lucide-network"
          class="mb-3 size-10 text-dimmed"
        /><h2 class="font-semibold">
          No tunnels yet
        </h2><p class="mx-auto mt-2 max-w-md text-sm text-muted">
          Create a remotely managed tunnel in Cloudflare and run cloudflared on your server. Your tunnel will appear here.
        </p><UButton
          to="https://one.dash.cloudflare.com/"
          target="_blank"
          label="Open Cloudflare"
          trailing-icon="i-lucide-arrow-up-right"
          variant="soft"
          class="mt-5"
        />
      </div>
    </UCard>
    <UCard
      v-if="selected"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">
              Public hostname routes
            </h2>
            <USkeleton
              v-if="configInitialLoading"
              class="mt-2 h-3 w-48"
            />
            <p
              v-else
              class="mt-1 text-xs text-muted"
            >
              {{ selected.name }} · {{ rules.length }} published routes
            </p>
          </div><UButton
            label="Publish route"
            icon="i-lucide-plus"
            :disabled="!configuration?.editable || !zones.length || configLoading || zonesLoading"
            :loading="zonesLoading"
            @click="open()"
          />
        </div>
      </template>
      <TableSkeleton
        v-if="configInitialLoading"
        :columns="3"
        :rows="3"
        label="Loading tunnel routes"
      />
      <RequestError
        v-else-if="configError"
        :error="configError"
        class="m-5"
      />
      <div
        v-else-if="!configuration?.editable"
        class="px-6 py-10 text-center"
      >
        <UIcon
          name="i-lucide-lock-keyhole"
          class="mb-3 size-8 text-dimmed"
        />
        <h3 class="text-sm font-medium">
          Locally managed tunnel
        </h3>
        <p class="mt-2 text-sm text-muted">
          Edit routes in the configuration file on your origin server.
        </p>
      </div>
      <div
        v-else-if="!rules.length"
        class="px-6 py-14 text-center"
      >
        <UIcon
          name="i-lucide-route"
          class="mb-3 size-9 text-dimmed"
        /><h3 class="font-semibold">
          Publish your first service
        </h3><p class="mt-2 text-sm text-muted">
          Connect a hostname to an origin service. DNS is configured for you.
        </p>
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-left text-sm">
          <thead class="bg-default text-xs text-muted">
            <tr>
              <th class="px-5 py-3 font-medium">
                Public hostname
              </th><th class="px-5 py-3 font-medium">
                Origin service
              </th><th class="px-5 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead><tbody class="divide-y divide-muted">
            <tr
              v-for="rule in rules"
              :key="rule.index"
              class="hover:bg-default"
            >
              <td class="px-5 py-5">
                <p class="font-medium">
                  {{ rule.hostname }}
                </p><p
                  v-if="rule.path"
                  class="mt-1 font-mono text-xs text-muted"
                >
                  Path: {{ rule.path }}
                </p>
              </td><td class="px-5 py-5 font-mono text-xs text-muted">
                <span class="flex items-center gap-2"><UIcon
                  name="i-lucide-arrow-right"
                  class="text-dimmed"
                />{{ rule.service }}</span>
              </td><td class="px-5 py-5">
                <div class="flex justify-end">
                  <RowActions
                    :label="rule.hostname ?? 'tunnel route'"
                    :disabled="configLoading || busy || !canManage(rule.hostname)"
                    @edit="open(rule, rule.index)"
                    @delete="deleting = { rule, index: rule.index, version: configuration?.version ?? '' }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <p class="flex items-center gap-2 text-xs text-muted">
          <UIcon
            name="i-lucide-shield-check"
            class="text-primary"
          />Catch-all and existing origin settings are preserved. Access policies are managed separately in Cloudflare.
        </p>
      </template>
    </UCard>
    <p
      v-if="zonesError && !error"
      class="mt-3 text-xs text-error"
      role="alert"
    >
      Domain access could not be loaded.
    </p>
    <UModal
      v-model:open="modal"
      :title="editing ? 'Edit tunnel route' : 'Publish a service'"
      description="Connect a public hostname to a service through this tunnel."
    >
      <template #body>
        <TunnelRouteForm
          v-if="modal && configuration"
          :key="`${selectedId}-${editing?.index ?? 'new'}`"
          :tunnel-id="selectedId"
          :version="configuration.version"
          :zones="zones"
          :rule="editing?.rule"
          :index="editing?.index"
          @saved="saved"
          @changed="reloadConfiguration()"
        />
      </template>
    </UModal>
    <UModal
      :open="!!deleting"
      title="Remove public route?"
      description="Traffic to this service will stop. DNS created by this console will be removed when no other rule uses it."
      @update:open="value => { if (!value && !busy) deleting = undefined }"
    >
      <template #body>
        <UAlert
          v-if="deleting?.version !== configuration?.version"
          class="mb-4"
          color="warning"
          title="Configuration changed"
          description="Close this dialog and reopen the route before deleting."
        />
        <p class="text-sm">
          Remove <strong>{{ deleting?.rule.hostname }}</strong>? Pre-existing DNS records are preserved.
        </p><div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="busy"
            @click="deleting = undefined"
          /><UButton
            label="Remove route"
            :disabled="deleting?.version !== configuration?.version"
            color="error"
            :loading="busy"
            @click="remove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
