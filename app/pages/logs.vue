<script setup lang="ts">
const { metrics, page, pageSize, search, outcome, category, outcomes, categories, result, entries, error, loading, filtered, dateFormatter, timeFormatter, actionLabel } = useLogs()
</script>

<template>
  <div :aria-busy="loading">
    <PageHeading
      eyebrow="Change tracking"
      icon="i-lucide-logs"
      title="Logs"
      description="Track DNS and tunnel changes made through this console."
    />

    <ConsoleMetrics :items="metrics" />

    <section
      class="overflow-hidden rounded-lg border border-default bg-default"
      aria-label="Change logs"
    >
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-muted px-5 py-4">
        <div class="flex items-center gap-2.5">
          <UIcon
            name="i-lucide-logs"
            class="size-5 text-primary"
          />
          <h2 class="text-sm font-semibold text-highlighted">
            Change history
          </h2>
          <USkeleton
            v-if="!result && loading"
            class="h-5 w-8"
          />
          <UBadge
            v-else-if="result"
            color="neutral"
            variant="outline"
            size="sm"
          >
            {{ result.total.toLocaleString() }}
          </UBadge>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-b border-muted p-4 sm:flex-row sm:items-center">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search resource, actor, or details…"
          aria-label="Search logs"
          :maxlength="200"
          class="w-full sm:max-w-sm"
        />
        <div class="flex flex-wrap gap-2 sm:ml-auto">
          <USelect
            v-model="category"
            :items="categories"
            aria-label="Filter log category"
            class="min-w-36 flex-1 sm:flex-none"
          />
          <USelect
            v-model="outcome"
            :items="outcomes"
            aria-label="Filter log status"
            class="min-w-32 flex-1 sm:flex-none"
          />
        </div>
      </div>

      <RequestError
        v-if="error"
        :error="error"
        class="m-4"
      />
      <TableSkeleton
        v-else-if="loading"
        :columns="5"
        :rows="pageSize > 10 ? 10 : pageSize"
        label="Loading logs"
      />
      <div
        v-else-if="!entries.length"
        class="px-6 py-20 text-center"
      >
        <div class="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg border border-default">
          <UIcon
            :name="filtered ? 'i-lucide-search-x' : 'i-lucide-logs'"
            class="size-5 text-muted"
          />
        </div>
        <h3 class="text-sm font-medium text-highlighted">
          {{ filtered ? 'No matching logs' : 'No changes yet' }}
        </h3>
        <p class="mt-1.5 text-sm text-muted">
          {{ filtered ? 'Try another search or adjust your filters.' : 'DNS and tunnel changes will appear here once you start working.' }}
        </p>
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            DNS and tunnel change logs, newest first. All times are in Jakarta.
          </caption>
          <thead class="border-b border-muted text-xs text-muted">
            <tr>
              <th
                scope="col"
                class="px-5 py-3 font-medium"
              >
                Event / resource
              </th>
              <th
                scope="col"
                class="px-5 py-3 font-medium"
              >
                Details
              </th>
              <th
                scope="col"
                class="px-5 py-3 font-medium"
              >
                Actor
              </th>
              <th
                scope="col"
                class="px-5 py-3 font-medium"
              >
                Status
              </th>
              <th
                scope="col"
                class="px-5 py-3 text-right font-medium"
              >
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted">
            <tr
              v-for="entry in entries"
              :key="entry.id"
              class="transition-colors hover:bg-inverted/[0.02]"
            >
              <td class="px-5 py-4 align-top">
                <div class="flex gap-3">
                  <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-muted text-muted">
                    <UIcon
                      :name="entry.action.startsWith('dns.') ? 'i-lucide-globe' : 'i-lucide-network'"
                      class="size-4"
                    />
                  </span>
                  <div class="min-w-44">
                    <p class="font-medium text-highlighted">
                      {{ actionLabel(entry.action) }}
                    </p>
                    <p class="mt-1 max-w-72 text-xs break-all text-muted">
                      {{ entry.resource }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="min-w-64 px-5 py-4 align-top">
                <p class="max-w-md leading-relaxed text-toned">
                  {{ entry.detail }}
                </p>
                <p class="mt-1 font-mono text-[11px] text-dimmed">
                  {{ entry.action }} · #{{ entry.id }}
                </p>
              </td>
              <td class="min-w-44 px-5 py-4 align-top">
                <p class="max-w-60 text-xs leading-relaxed break-all text-toned">
                  {{ entry.actorEmail ?? '—' }}
                </p>
              </td>
              <td class="px-5 py-4 align-top">
                <UBadge
                  :color="entry.outcome === 'success' ? 'success' : 'error'"
                  variant="subtle"
                  size="sm"
                  :icon="entry.outcome === 'success' ? 'i-lucide-check' : 'i-lucide-circle-alert'"
                >
                  {{ entry.outcome === 'success' ? 'Success' : 'Failed' }}
                </UBadge>
              </td>
              <td class="px-5 py-4 text-right align-top whitespace-nowrap">
                <time
                  :datetime="entry.timestamp"
                  class="text-xs text-toned"
                >{{ dateFormatter.format(new Date(entry.timestamp)) }}<span class="mt-1 block text-dimmed">{{ timeFormatter.format(new Date(entry.timestamp)) }} WIB</span>
                </time>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="result?.total ?? 0"
        label="logs"
        :loading="loading"
        :error="!!error"
        class="border-t border-muted"
      />
    </section>
  </div>
</template>
