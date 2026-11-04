import type { ConsoleMetric } from '~/types/ui'
import { DEFAULT_PAGE_SIZE } from '#shared/constants/pagination'
import type { LogPage, LogQuery } from '#shared/types/logs'

export function useLogs() {
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const search = ref('')
  const debouncedSearch = ref('')
  const outcome = ref<LogQuery['outcome']>('all')
  const category = ref<LogQuery['category']>('all')
  const outcomes = [{ label: 'All statuses', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failed', value: 'failure' }]
  const categories = [{ label: 'All changes', value: 'all' }, { label: 'DNS records', value: 'dns' }, { label: 'Tunnel routes', value: 'route' }]
  watch(search, (value, _old, onCleanup) => {
    const timer = setTimeout(() => {
      debouncedSearch.value = value.trim()
    }, 300)
    onCleanup(() => clearTimeout(timer))
  })
  watch([debouncedSearch, outcome, category, pageSize], () => {
    page.value = 1
  }, { flush: 'sync' })
  const query = computed(() => ({ page: page.value, pageSize: pageSize.value, search: debouncedSearch.value, outcome: outcome.value, category: category.value }))
  const { data, error, status } = useLazyFetch('/api/logs', { server: false, query })
  const loading = computed(() => status.value === 'idle' || status.value === 'pending')
  const result = computed<LogPage | null>(() => data.value ?? null)
  const entries = computed(() => result.value?.entries ?? [])
  const filtered = computed(() => debouncedSearch.value || outcome.value !== 'all' || category.value !== 'all')
  watch(() => result.value?.page, (value) => {
    if (value && status.value === 'success') page.value = value
  })
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
  function actionLabel(action: string) {
    const [resource, operation] = action.split('.')
    const labels: Record<string, string> = { create: 'created', update: 'updated', delete: 'deleted', save: 'saved' }
    return `${resource === 'dns' ? 'DNS record' : 'Tunnel route'} ${labels[operation ?? ''] ?? operation ?? ''}`
  }

  const metrics = computed<ConsoleMetric[]>(() => [
    { label: 'Changes', value: error.value ? '—' : result.value?.total.toLocaleString() ?? '—', icon: 'i-lucide-logs', description: filtered.value ? 'Matching your filters' : 'Recorded through this console', loading: !result.value && loading.value },
    { label: 'Successful', value: error.value ? '—' : result.value?.summary.success.toLocaleString() ?? '—', icon: 'i-lucide-circle-check', description: 'Completed changes', loading: !result.value && loading.value },
    { label: 'Failed', value: error.value ? '—' : result.value?.summary.failure.toLocaleString() ?? '—', icon: 'i-lucide-circle-alert', description: 'Changes requiring review', tone: 'error', loading: !result.value && loading.value }
  ])

  return { metrics, page, pageSize, search, outcome, category, outcomes, categories, result, entries, error, loading, filtered, dateFormatter, timeFormatter, actionLabel }
}
