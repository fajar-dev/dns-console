import { DEFAULT_PAGE_SIZE } from '#shared/constants/pagination'
import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, WatchSource } from 'vue'

export function useTablePagination<T>(items: MaybeRefOrGetter<T[]>, resetOn: WatchSource[] = []) {
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const total = computed(() => toValue(items).length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  watch([pageSize, ...resetOn], () => {
    page.value = 1
  }, { flush: 'sync' })
  watch(totalPages, (lastPage) => {
    page.value = Math.min(page.value, lastPage)
  }, { flush: 'sync' })
  const visible = computed(() => toValue(items).slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
  return { page, pageSize, total, visible }
}
