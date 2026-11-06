<script setup lang="ts">
const {
  metrics,
  tunnels,
  error,
  tunnelIssues,
  zonesIssues,
  zones,
  zonesError,
  zonesLoading,
  selectedId,
  selected,
  configuration,
  configError,
  configLoading,
  configInitialLoading,
  tunnelsLoading,
  initialLoading,
  rules,
  routeSearch,
  filteredRules,
  page,
  pageSize,
  visibleRules,
  modal,
  editing,
  deleting,
  busy,
  badgeColor,
  open,
  saved,
  remove,
  canManage,
  reloadConfiguration
} = useTunnelRoutes()
</script>

<template>
  <div :aria-busy="tunnelsLoading || configLoading || busy">
    <PageHeading
      eyebrow="Secure connectivity"
      icon="i-lucide-network"
      title="Tunnels & routes"
      description="Connect public hostnames to services on your private infrastructure."
    />
    <RequestError
      v-if="error"
      :error="error"
      class="mb-6"
    />
    <WorkspaceIssues
      :issues="[...tunnelIssues, ...zonesIssues.filter(issue => !tunnelIssues.some(item => item.account.id === issue.account.id))]"
      class="mb-6"
    />
    <ConsoleMetrics :items="metrics" />
    <div class="grid overflow-hidden rounded-lg border border-default lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
      <TunnelSelector
        v-model="selectedId"
        :tunnels="tunnels"
        :loading="initialLoading"
        :error="!!error"
        :disabled="busy"
      />
      <section
        class="flex min-w-0 flex-col border-t border-default lg:border-t-0 lg:border-l"
        aria-labelledby="routes-title"
      >
        <header class="flex flex-wrap items-center justify-between gap-4 border-b border-default p-5">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-route"
              class="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div>
              <h2
                id="routes-title"
                class="text-sm font-semibold text-highlighted"
              >
                Public hostname routes
              </h2>
              <p class="mt-1.5 text-xs leading-5 text-muted">
                Connect a public address to a service on your network.
              </p>
            </div>
          </div>
          <UButton
            label="Publish route"
            icon="i-lucide-plus"
            :disabled="!selected || !configuration?.editable || !zones.length || configLoading || zonesLoading"
            :loading="zonesLoading"
            @click="open()"
          />
        </header>
        <div
          v-if="selected"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-default px-5 py-3 text-xs"
        >
          <span class="flex min-w-0 items-center gap-2 font-medium text-highlighted">
            <UIcon
              name="i-lucide-network"
              class="size-3.5 shrink-0 text-muted"
            />
            <span class="max-w-48 truncate">{{ selected.name }}</span>
          </span>
          <UBadge
            :color="badgeColor(selected.status)"
            variant="outline"
            size="sm"
            class="capitalize"
          >
            {{ selected.status }}
          </UBadge>
          <AccountBadge :account="selected.owner" />
          <span class="text-muted">{{ selected.remote_config || selected.config_src === 'cloudflare' ? 'Remotely managed' : 'Locally managed' }}</span>
          <USkeleton
            v-if="configInitialLoading"
            class="ml-auto h-3 w-20"
          />
          <span
            v-else-if="!configError"
            class="ml-auto text-muted tabular-nums"
          >{{ rules.length }} routes</span>
        </div>
        <div
          v-if="selected && configuration?.editable"
          class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-5 py-3"
        >
          <UInput
            v-model="routeSearch"
            icon="i-lucide-search"
            placeholder="Search hostname or origin…"
            aria-label="Search tunnel routes"
            class="w-full sm:max-w-xs"
            :disabled="configLoading"
          />
          <span
            v-if="routeSearch"
            class="text-xs text-muted"
          >{{ filteredRules.length }} matching routes</span>
        </div>
        <TableSkeleton
          v-if="initialLoading || configInitialLoading"
          :columns="3"
          :rows="5"
          label="Loading tunnel routes"
        />
        <RequestError
          v-else-if="configError"
          :error="configError"
          class="m-5"
        />
        <div
          v-else-if="!selected"
          class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <UIcon
            name="i-lucide-network"
            class="mb-4 size-9 text-primary"
          />
          <h3 class="text-sm font-semibold text-highlighted">
            Select a tunnel to get started
          </h3>
          <p class="mt-2 max-w-xs text-sm leading-6 text-muted">
            Its public hostnames and origin services will appear here.
          </p>
        </div>
        <div
          v-else-if="!configuration?.editable"
          class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <UIcon
            name="i-lucide-lock-keyhole"
            class="mb-4 size-8 text-muted"
          />
          <h3 class="text-sm font-semibold text-highlighted">
            Locally managed tunnel
          </h3>
          <p class="mt-2 max-w-sm text-sm leading-6 text-muted">
            Edit routes in the configuration file on your origin server.
          </p>
        </div>
        <div
          v-else-if="!filteredRules.length"
          class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <UIcon
            :name="routeSearch ? 'i-lucide-search-x' : 'i-lucide-route'"
            class="mb-4 size-9 text-primary"
          />
          <h3 class="text-sm font-semibold text-highlighted">
            {{ routeSearch ? 'No matching routes' : 'Publish your first service' }}
          </h3>
          <p class="mt-2 max-w-sm text-sm leading-6 text-muted">
            {{ routeSearch ? 'Try another hostname or origin service.' : 'Add a public hostname and point it to your origin. DNS is configured for you.' }}
          </p>
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full text-left text-sm">
            <thead class="border-b border-muted text-xs text-muted">
              <tr>
                <th
                  scope="col"
                  class="px-5 py-3 font-medium"
                >
                  Public hostname
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 font-medium"
                >
                  Origin service
                </th>
                <th
                  scope="col"
                  class="sticky right-0 z-10 w-20 min-w-20 bg-default px-5 py-3 text-right font-medium shadow-[-1px_0_0_var(--ui-border-muted)]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted">
              <tr
                v-for="rule in visibleRules"
                :key="rule.index"
                class="transition-colors hover:bg-inverted/[0.02]"
              >
                <td class="min-w-48 px-5 py-4 align-top">
                  <div class="flex items-start gap-2.5">
                    <UIcon
                      name="i-lucide-globe"
                      class="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <div>
                      <p class="font-medium break-all text-highlighted">
                        {{ rule.hostname }}
                      </p>
                      <p
                        v-if="rule.path"
                        class="mt-1 font-mono text-xs break-all text-muted"
                      >
                        Path: {{ rule.path }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="min-w-44 px-5 py-4 align-top">
                  <span class="flex items-start gap-2 font-mono text-xs leading-5 break-all text-toned">
                    <UIcon
                      name="i-lucide-arrow-right"
                      class="mt-0.5 size-3.5 shrink-0 text-dimmed"
                    />
                    {{ rule.service }}
                  </span>
                </td>
                <td class="sticky right-0 z-10 w-20 min-w-20 bg-default px-5 py-4 align-top shadow-[-1px_0_0_var(--ui-border-muted)]">
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
        <TablePagination
          v-if="selected && (configuration?.editable || configLoading)"
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="filteredRules.length"
          label="routes"
          :loading="configLoading"
          :error="!!configError"
          class="mt-auto border-t border-default"
        />
        <p
          v-if="zonesError && !error"
          class="border-t border-default px-5 py-3 text-xs text-error"
          role="alert"
        >
          Domain access could not be loaded.
        </p>
      </section>
    </div>
    <UModal
      v-model:open="modal"
      :title="editing ? 'Edit tunnel route' : 'Publish a service'"
      description="Connect a public hostname to a service through this tunnel."
    >
      <template #body>
        <TunnelRouteForm
          v-if="modal && configuration && selected"
          :key="`${selectedId}-${editing?.index ?? 'new'}`"
          :tunnel="selected"
          :version="configuration.version"
          :zones="zones"
          :rule="editing?.rule"
          :index="editing?.index"
          @saved="saved"
          @changed="reloadConfiguration()"
        />
      </template>
    </UModal>
    <ConfirmationModal
      :open="!!deleting"
      title="Remove public route?"
      description="Traffic to this service will stop. DNS created by this console will be removed when no other rule uses it."
      confirm-label="Remove route"
      :busy="busy"
      :disabled="deleting?.version !== configuration?.version"
      @update:open="value => { if (!value) deleting = undefined }"
      @confirm="remove"
    >
      <UAlert
        v-if="deleting?.version !== configuration?.version"
        class="mb-4"
        color="warning"
        title="Configuration changed"
        description="Close this dialog and reopen the route before deleting."
      />
      <p class="text-sm">
        Remove <strong>{{ deleting?.rule.hostname }}</strong>? Pre-existing DNS records are preserved.
      </p>
    </ConfirmationModal>
  </div>
</template>
