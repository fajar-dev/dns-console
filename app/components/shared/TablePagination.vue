<script setup lang="ts">
import { PAGE_SIZES } from '#shared/constants/pagination'

const props = withDefaults(defineProps<{
  total: number
  label?: string
  loading?: boolean
  error?: boolean
}>(), { label: 'records', loading: false, error: false })
const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })
const currentPage = computed(() => Math.max(1, Math.min(page.value, Math.ceil(props.total / pageSize.value) || 1)))
const start = computed(() => props.total ? (currentPage.value - 1) * pageSize.value + 1 : 0)
const end = computed(() => Math.min(currentPage.value * pageSize.value, props.total))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
    <div class="flex flex-wrap items-center gap-4 text-xs text-muted">
      <span
        v-if="loading"
        role="status"
      >Loading {{ label }}…</span>
      <span
        v-else-if="!error"
        aria-live="polite"
      >{{ start.toLocaleString() }}–{{ end.toLocaleString() }} of {{ total.toLocaleString() }} {{ label }}</span>
      <div class="flex items-center gap-2">
        <span>Rows per page</span>
        <USelect
          v-model="pageSize"
          :items="[...PAGE_SIZES]"
          :aria-label="`${label.charAt(0).toUpperCase() + label.slice(1)} per page`"
          size="xs"
          class="w-18"
          :disabled="loading || error"
        />
      </div>
    </div>
    <UPagination
      v-if="!error && (!loading || total > 0)"
      v-model:page="page"
      :total="total"
      :items-per-page="pageSize"
      :sibling-count="1"
      :disabled="loading"
      size="xs"
      :show-edges="false"
    />
  </div>
</template>
