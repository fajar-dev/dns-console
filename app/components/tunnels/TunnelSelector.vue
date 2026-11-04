<script setup lang="ts">
import type { Tunnel } from '#shared/types/cloudflare'

const props = defineProps<{ tunnels: Tunnel[], loading: boolean, error: boolean }>()
const selectedId = defineModel<string>({ required: true })
const search = ref('')
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return props.tunnels.filter(tunnel => `${tunnel.name} ${tunnel.id}`.toLowerCase().includes(term))
})
</script>

<template>
  <section
    class="flex min-w-0 flex-col"
    aria-labelledby="tunnel-list-title"
  >
    <header class="border-b border-default p-5">
      <div class="flex items-center justify-between gap-3">
        <h2
          id="tunnel-list-title"
          class="text-sm font-semibold text-highlighted"
        >
          Your tunnels
        </h2>
        <USkeleton
          v-if="loading"
          class="h-4 w-6"
        />
        <span
          v-else
          class="text-xs text-muted tabular-nums"
        >{{ tunnels.length }}</span>
      </div>
      <p class="mt-1.5 text-xs leading-5 text-muted">
        Choose a tunnel to manage its routes.
      </p>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a tunnel…"
        aria-label="Search tunnels"
        class="mt-4 hidden w-full lg:block"
        :disabled="loading || error"
      />
      <USelectMenu
        v-model="selectedId"
        :items="tunnels.map(tunnel => ({ label: tunnel.name, value: tunnel.id }))"
        value-key="value"
        icon="i-lucide-network"
        placeholder="Select a tunnel"
        aria-label="Select tunnel"
        class="mt-4 w-full lg:hidden"
        :loading="loading"
        :disabled="loading || error || !tunnels.length"
      />
    </header>
    <div
      v-if="loading"
      role="status"
      aria-label="Loading tunnels"
      class="hidden divide-y divide-default lg:block"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="space-y-3 p-5"
        aria-hidden="true"
      >
        <USkeleton class="h-4 w-2/3" />
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-1/3" />
      </div>
    </div>
    <ul
      v-else-if="filtered.length"
      class="hidden max-h-[560px] divide-y divide-default overflow-y-auto lg:block"
    >
      <li
        v-for="tunnel in filtered"
        :key="tunnel.id"
      >
        <button
          type="button"
          class="relative w-full min-w-0 px-5 py-4 text-left transition-colors outline-offset-[-3px] hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
          :aria-pressed="selectedId === tunnel.id"
          @click="selectedId = tunnel.id"
        >
          <span
            v-if="selectedId === tunnel.id"
            class="absolute inset-y-4 left-0 w-0.5 bg-primary"
            aria-hidden="true"
          />
          <span class="flex items-center gap-2.5">
            <UIcon
              name="i-lucide-network"
              class="size-4 shrink-0"
              :class="selectedId === tunnel.id ? 'text-primary' : 'text-muted'"
            />
            <span
              class="min-w-0 flex-1 truncate text-sm font-semibold"
              :class="selectedId === tunnel.id ? 'text-primary' : 'text-highlighted'"
            >{{ tunnel.name }}</span>
            <UIcon
              v-if="selectedId === tunnel.id"
              name="i-lucide-chevron-right"
              class="size-4 shrink-0 text-primary"
            />
          </span>
          <span
            class="mt-2 block truncate font-mono text-[11px] text-dimmed"
            :title="tunnel.id"
          >{{ tunnel.id }}</span>
          <span class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span class="flex items-center gap-1.5 capitalize">
              <span
                class="size-1.5 rounded-sm"
                :class="tunnel.status === 'healthy' ? 'bg-primary' : tunnel.status === 'degraded' ? 'bg-warning' : tunnel.status === 'down' ? 'bg-error' : 'bg-inverted/40'"
              />
              {{ tunnel.status }}
            </span>
            <span>{{ tunnel.connections.length }} connections</span>
          </span>
        </button>
      </li>
    </ul>
    <div
      v-else
      class="hidden px-5 py-10 text-center lg:block"
    >
      <UIcon
        :name="search ? 'i-lucide-search-x' : 'i-lucide-network'"
        class="mb-3 size-7 text-dimmed"
      />
      <p class="text-sm font-medium text-highlighted">
        {{ error ? 'Tunnels unavailable' : search ? 'No matching tunnels' : 'No tunnels yet' }}
      </p>
      <p class="mt-2 text-xs leading-5 text-muted">
        {{ error ? 'See the connection error above.' : search ? 'Try a different name or tunnel ID.' : 'Create a remotely managed tunnel in Cloudflare to get started.' }}
      </p>
      <UButton
        v-if="!search && !error"
        to="https://one.dash.cloudflare.com/"
        target="_blank"
        label="Open Cloudflare"
        trailing-icon="i-lucide-arrow-up-right"
        variant="link"
        class="mt-4"
        size="xs"
      />
    </div>
  </section>
</template>
