<script setup lang="ts">
import type { CloudflareAccount } from '#shared/types/accounts'

const props = defineProps<{ account: Pick<CloudflareAccount, 'id' | 'name'>, prominent?: boolean }>()
const tones = ['text-sky-500', 'text-violet-500', 'text-amber-500', 'text-emerald-500', 'text-rose-500', 'text-cyan-500']
const tone = computed(() => {
  const hash = Array.from(props.account.id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0)
  return tones[hash % tones.length]
})
</script>

<template>
  <span
    class="inline-flex min-w-0 items-center gap-1.5"
    :class="prominent ? 'text-sm font-semibold text-highlighted' : 'text-xs text-muted'"
    :title="account.name"
  >
    <UIcon
      name="i-lucide-circle-small"
      class="size-3 shrink-0"
      :class="tone"
    />
    <span class="truncate">{{ account.name }}</span>
  </span>
</template>
