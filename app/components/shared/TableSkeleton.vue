<script setup lang="ts">
withDefaults(defineProps<{ columns?: number, rows?: number, label?: string }>(), {
  columns: 6,
  rows: 5,
  label: 'Loading records'
})
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    :aria-label="label"
    class="overflow-hidden"
  >
    <span class="sr-only">{{ label }}</span>
    <div
      class="grid gap-4 border-b border-muted px-5 py-3"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <USkeleton
        v-for="column in columns"
        :key="column"
        class="h-3 w-3/5"
      />
    </div>
    <div
      v-for="row in rows"
      :key="row"
      class="grid items-center gap-4 border-b border-muted px-5 py-5 last:border-0"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <USkeleton
        v-for="column in columns"
        :key="column"
        class="h-4"
        :class="column === 1 ? 'w-4/5' : column === columns ? 'w-3/5 justify-self-end' : row % 2 ? 'w-full' : 'w-4/5'"
      />
    </div>
  </div>
</template>
