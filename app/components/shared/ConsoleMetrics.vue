<script setup lang="ts">
import type { ConsoleMetric } from '~/types/ui'

defineProps<{
  items: ConsoleMetric[]
}>()
</script>

<template>
  <section
    class="mb-6 grid grid-cols-2 overflow-hidden rounded-lg border border-default sm:flex"
    aria-label="Page overview"
  >
    <div
      v-for="(item, index) in items"
      :key="item.label"
      class="min-w-0 flex-1 border-default px-4 py-4 odd:border-r sm:border-r sm:px-5 sm:py-5 sm:last:border-r-0"
      :class="[index > 1 ? 'border-t sm:border-t-0' : '', items.length % 2 && index === items.length - 1 ? 'col-span-2 border-r-0' : '']"
    >
      <div class="flex items-center gap-2 text-xs font-medium text-muted">
        <UIcon
          :name="item.icon"
          class="size-4 shrink-0"
          :class="item.tone === 'error' ? 'text-error' : 'text-primary'"
        />
        {{ item.label }}
      </div>
      <div
        v-if="item.loading"
        role="status"
        class="mt-3"
      >
        <span class="sr-only">Loading {{ item.label }}</span>
        <USkeleton
          class="h-8 w-16"
          aria-hidden="true"
        />
      </div>
      <p
        v-else
        class="mt-2 text-3xl font-semibold tracking-tight text-highlighted tabular-nums"
      >
        {{ item.value }}
      </p>
      <p
        :title="item.description"
        class="mt-1 truncate text-xs leading-5 text-muted"
      >
        {{ item.description }}
      </p>
    </div>
  </section>
</template>
