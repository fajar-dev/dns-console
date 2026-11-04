<script setup lang="ts">
const { data: entries, error, status, refresh } = useLazyFetch('/api/activity', { server: false, default: () => [] })
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const initialLoading = computed(() => loading.value && !entries.value.length)
</script>

<template>
  <div :aria-busy="loading">
    <PageHeading
      eyebrow="Workspace history"
      title="Activity"
      description="Review the latest 100 changes made through this console. Changes made directly in Cloudflare are not included."
    >
      <UButton
        label="Refresh"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh()"
      />
    </PageHeading>
    <RequestError
      v-if="error"
      :error="error"
      class="mb-6"
      @retry="refresh()"
    />
    <UCard
      v-else
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-history"
            class="text-primary"
          /><h2 class="font-semibold">
            Change history
          </h2><USkeleton
            v-if="initialLoading"
            class="h-5 w-7"
          /><UBadge
            v-else
            color="neutral"
            variant="subtle"
          >
            {{ entries.length }}
          </UBadge>
        </div>
      </template>
      <div
        v-if="initialLoading"
        role="status"
        aria-live="polite"
        class="divide-y divide-muted"
      >
        <span class="sr-only">Loading activity</span>
        <div
          v-for="i in 5"
          :key="i"
          class="flex gap-4 p-5"
          aria-hidden="true"
        >
          <USkeleton class="size-9 shrink-0" />
          <div class="flex-1">
            <div class="flex justify-between gap-4">
              <USkeleton class="h-4 w-1/3" /><USkeleton class="h-3 w-24" />
            </div><USkeleton class="mt-3 h-3 w-2/3" /><USkeleton class="mt-3 h-5 w-20" />
          </div>
        </div>
      </div>
      <div
        v-else-if="!entries.length"
        class="px-6 py-16 text-center"
      >
        <UIcon
          name="i-lucide-history"
          class="mb-3 size-9 text-dimmed"
        /><h3 class="font-semibold">
          A clean slate
        </h3><p class="mt-2 text-sm text-muted">
          DNS and route changes will appear here as you work.
        </p>
      </div>
      <div
        v-else
        class="divide-y divide-default"
      >
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="flex gap-4 p-5"
        >
          <span
            class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg"
            :class="entry.outcome === 'success' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'"
          ><UIcon
            :name="entry.outcome === 'success' ? 'i-lucide-check' : 'i-lucide-circle-alert'"
            class="size-4"
          /></span><div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="truncate text-sm font-semibold">
                {{ entry.resource }}
              </p><time
                class="text-xs text-dimmed"
                :datetime="entry.timestamp"
              >{{ new Date(entry.timestamp).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' }) }} WIB</time>
            </div><p class="mt-1 text-sm text-muted">
              {{ entry.detail }}
            </p><UBadge
              class="mt-2"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ entry.action }}
            </UBadge>
          </div>
        </div>
      </div>
      <template #footer>
        <p class="text-xs text-muted">
          Stored in your server’s SQLite database. Credentials and DNS record content are never included.
        </p>
      </template>
    </UCard>
  </div>
</template>
