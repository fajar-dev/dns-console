import type { ConsoleMetric } from '~/types/ui'
import { zoneRecordsPath } from '#shared/utils/resource-paths'
import type { DnsRecord } from '#shared/types/cloudflare'

export function useDnsRecords() {
  const { data: zones, error: zonesError, issues: zonesIssues, loading: zonesLoading } = useZones()
  const selectedZone = ref(zones.value[0]?.key ?? '')
  watch(zones, (value) => {
    if (!value.some(zone => zone.key === selectedZone.value)) selectedZone.value = value[0]?.key ?? ''
  })
  const zone = computed(() => zones.value.find(item => item.key === selectedZone.value))
  const { data: records, error, status, refresh: reloadRecords } = useLazyAsyncData(
    () => `dns-records:${selectedZone.value}`,
    (_app, { signal }) => zone.value ? $fetch<DnsRecord[]>(zoneRecordsPath(zone.value), { signal }) : Promise.resolve([]),
    { server: false, default: () => [] }
  )
  const recordsLoading = computed(() => zonesLoading.value || (!!selectedZone.value && (status.value === 'idle' || status.value === 'pending')))
  const initialLoading = computed(() => recordsLoading.value && !records.value.length)
  const search = ref('')
  const type = ref('All types')
  const modal = ref(false)
  const editing = ref<DnsRecord>()
  const deleting = ref<DnsRecord>()
  const { busy, mutate } = useMutation()
  const filtered = computed(() => records.value.filter(record => (type.value === 'All types' || record.type === type.value) && `${record.name} ${record.content}`.toLowerCase().includes(search.value.toLowerCase())))
  const { page, pageSize, visible } = useTablePagination(filtered, [search, type, selectedZone])
  const stats = computed<ConsoleMetric[]>(() => [
    { label: 'Domains', value: zonesError.value ? '—' : zones.value.length, description: 'Across all connected accounts', loading: zonesLoading.value && !zones.value.length, icon: 'i-lucide-globe' },
    { label: 'DNS records', value: error.value || zonesError.value ? '—' : records.value.length, description: zone.value?.name ?? 'Select a domain', loading: initialLoading.value, icon: 'i-lucide-list-tree' },
    { label: 'Proxied', value: error.value || zonesError.value ? '—' : records.value.filter(record => record.proxied).length, description: 'Traffic through Cloudflare', loading: initialLoading.value, icon: 'i-lucide-shield-check' },
    { label: 'DNS only', value: error.value || zonesError.value ? '—' : records.value.filter(record => !record.proxied).length, description: 'Direct to your origin', loading: initialLoading.value, icon: 'i-lucide-arrow-up-right' }
  ])
  const recordTypes = computed(() => [...new Set(records.value.map(record => record.type))].map(value => ({ value, count: records.value.filter(record => record.type === value).length })))
  watch(selectedZone, () => {
    modal.value = false
    editing.value = undefined
    deleting.value = undefined
    search.value = ''
    type.value = 'All types'
  })
  function open(record?: DnsRecord) {
    editing.value = record
    modal.value = true
  }
  async function saved() {
    modal.value = false
    await reloadRecords()
  }
  async function remove() {
    if (!deleting.value || !zone.value) return
    if (await mutate(() => $fetch(`${zoneRecordsPath(zone.value!)}/${deleting.value!.id}`, { method: 'DELETE', body: {} }), 'DNS record deleted')) deleting.value = undefined
    await reloadRecords()
  }

  return {
    zones,
    zonesError,
    zonesIssues,
    zonesLoading,
    selectedZone,
    zone,
    records,
    error,
    recordsLoading,
    initialLoading,
    search,
    type,
    modal,
    editing,
    deleting,
    busy,
    filtered,
    page,
    pageSize,
    visible,
    stats,
    recordTypes,
    open,
    saved,
    remove
  }
}
