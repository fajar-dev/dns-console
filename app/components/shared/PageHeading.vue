<script setup lang="ts">
defineProps<{ eyebrow: string, title: string, description: string, icon?: string }>()
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-default pb-6">
    <div class="flex items-start gap-4">
      <span
        v-if="icon"
        class="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-lg border border-default text-primary sm:flex"
      >
        <UIcon
          :name="icon"
          class="size-5"
        />
      </span>
      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-widest text-muted uppercase">
          {{ eyebrow }}
        </p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ title }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {{ description }}
        </p>
      </div>
    </div>
    <div
      v-if="$slots.default"
      class="flex items-center gap-2"
    >
      <slot />
    </div>
  </div>
</template>
