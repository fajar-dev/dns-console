<script setup lang="ts">
defineProps<{ eyebrow: string, title: string, description: string }>()
</script>

<template>
  <div class="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-muted pb-8">
    <div>
      <p class="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
        <span class="size-1.5 rounded-lg bg-primary" />{{ eyebrow }}
      </p>
      <h1 class="text-3xl font-medium tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {{ description }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>
