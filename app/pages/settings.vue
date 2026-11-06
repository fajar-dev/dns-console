<script setup lang="ts">
const { accounts, error, status } = useCloudflareAccounts()
const { data: zones, issues: zoneIssues, loading: zonesLoading, error: zonesError } = useZones()
const { data: tunnels, issues: tunnelIssues, loading: tunnelsLoading, error: tunnelsError } = useTunnels()
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const connectionsLoading = computed(() => zonesLoading.value || tunnelsLoading.value)
const cards = computed(() => accounts.value.map((account) => {
  const issues = [...zoneIssues.value, ...tunnelIssues.value].filter(issue => issue.account.id === account.id)
  return {
    account,
    domains: zones.value.filter(zone => zone.owner.id === account.id).length,
    tunnels: tunnels.value.filter(tunnel => tunnel.owner.id === account.id).length,
    message: issues[0]?.message,
    failed: !!issues.length || !!zonesError.value || !!tunnelsError.value
  }
}))
</script>

<template>
  <div>
    <PageHeading
      icon="i-lucide-settings-2"
      title="Configuration"
      description="Your connected Cloudflare accounts."
    >
      <UBadge
        v-if="!loading && !error"
        color="neutral"
        variant="outline"
      >
        {{ accounts.length }} {{ accounts.length === 1 ? 'account' : 'accounts' }}
      </UBadge>
    </PageHeading>

    <RequestError
      v-if="error"
      :error="error"
    />
    <div
      v-else-if="loading"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading accounts"
    >
      <UCard
        v-for="i in 3"
        :key="i"
      >
        <div class="flex items-center justify-between gap-4">
          <USkeleton class="h-5 w-28" />
          <USkeleton class="h-5 w-20" />
        </div>
        <USkeleton class="mt-5 h-4 w-full" />
        <div class="mt-6 grid grid-cols-2 gap-4">
          <USkeleton
            v-for="j in 2"
            :key="j"
            class="h-12 w-full"
          />
        </div>
      </UCard>
    </div>
    <div
      v-else-if="!cards.length"
      class="rounded-lg border border-default p-6 text-sm text-muted"
    >
      Add credentials to <code>config/cloudflare-accounts.json</code> and restart the application.
    </div>
    <div
      v-else
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Cloudflare accounts"
    >
      <UCard
        v-for="item in cards"
        :key="item.account.id"
        class="h-full"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="min-w-0">
            <AccountBadge
              :account="item.account"
              prominent
            />
          </h2>
          <USkeleton
            v-if="connectionsLoading"
            class="h-5 w-20 shrink-0"
          />
          <UBadge
            v-else
            :color="item.failed ? 'warning' : 'success'"
            variant="subtle"
            size="sm"
            class="shrink-0"
          >
            {{ item.failed ? 'Needs attention' : 'Connected' }}
          </UBadge>
        </div>
        <p
          class="mt-3 truncate font-mono text-xs text-dimmed"
          :title="item.account.accountId"
        >
          {{ item.account.accountId }}
        </p>
        <div class="mt-6 grid grid-cols-2 gap-4 border-t border-muted pt-4">
          <div>
            <p class="flex items-center gap-1.5 text-xs text-muted">
              <UIcon
                name="i-lucide-globe"
                class="size-3.5"
              />Domains
            </p>
            <USkeleton
              v-if="zonesLoading"
              class="mt-2 h-7 w-10"
            />
            <p
              v-else
              class="mt-1 text-2xl font-semibold tracking-tight"
            >
              {{ item.domains }}
            </p>
          </div>
          <div>
            <p class="flex items-center gap-1.5 text-xs text-muted">
              <UIcon
                name="i-lucide-network"
                class="size-3.5"
              />Tunnels
            </p>
            <USkeleton
              v-if="tunnelsLoading"
              class="mt-2 h-7 w-10"
            />
            <p
              v-else
              class="mt-1 text-2xl font-semibold tracking-tight"
            >
              {{ item.tunnels }}
            </p>
          </div>
        </div>
        <p
          v-if="item.message"
          class="mt-4 text-xs leading-relaxed text-warning"
        >
          {{ item.message }}
        </p>
      </UCard>
    </div>
  </div>
</template>
