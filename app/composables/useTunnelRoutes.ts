import type { ConsoleMetric } from '~/types/ui'
import { findHostnameZone } from '#shared/utils/hostnames'
import type { IngressRule, RouteConfiguration } from '#shared/types/cloudflare'

export function useTunnelRoutes() {
  const { data: tunnels, error, status } = useLazyFetch('/api/tunnels', { server: false, default: () => [] })
  const { data: zones, error: zonesError, loading: zonesLoading } = useZones()
  const selectedId = ref(tunnels.value[0]?.id ?? '')
  watch(tunnels, (value) => {
    if (!value.some(tunnel => tunnel.id === selectedId.value)) selectedId.value = value[0]?.id ?? ''
  })
  const selected = computed(() => tunnels.value.find(tunnel => tunnel.id === selectedId.value))
  const { data: configuration, error: configError, status: configStatus, refresh: reloadConfiguration } = useLazyAsyncData(
    () => `tunnel-configuration:${selectedId.value}`,
    (_app, { signal }) => selectedId.value ? $fetch<RouteConfiguration>(`/api/tunnels/${selectedId.value}/routes`, { signal }) : Promise.resolve(null),
    { server: false, default: () => null }
  )
  const tunnelsLoading = computed(() => status.value === 'idle' || status.value === 'pending')
  const initialLoading = computed(() => tunnelsLoading.value && !tunnels.value.length)
  const configLoading = computed(() => !!selectedId.value && (configStatus.value === 'idle' || configStatus.value === 'pending'))
  const configInitialLoading = computed(() => configLoading.value && !configuration.value)
  const rules = computed(() => (configuration.value?.config.ingress ?? []).map((rule, index) => ({ ...rule, index })).filter(rule => rule.hostname))
  const routeSearch = ref('')
  const filteredRules = computed(() => {
    const term = routeSearch.value.trim().toLowerCase()
    return rules.value.filter(rule => `${rule.hostname ?? ''} ${rule.service} ${rule.path ?? ''}`.toLowerCase().includes(term))
  })
  const { page, pageSize, visible: visibleRules } = useTablePagination(filteredRules, [selectedId, routeSearch])
  watch(selectedId, () => {
    routeSearch.value = ''
  })
  const modal = ref(false)
  const editing = ref<{ rule: IngressRule, index: number }>()
  const deleting = ref<{ rule: IngressRule, index: number, version: string }>()
  const { busy, mutate } = useMutation()
  function badgeColor(status: string) {
    return status === 'healthy' ? 'success' as const : status === 'degraded' ? 'warning' as const : 'neutral' as const
  }
  function open(rule?: IngressRule, index?: number) {
    editing.value = rule && index !== undefined ? { rule, index } : undefined
    modal.value = true
  }
  async function saved() {
    modal.value = false
    await reloadConfiguration()
  }
  async function remove() {
    if (!deleting.value || !configuration.value) return
    const hostname = deleting.value.rule.hostname
    const zone = hostname ? findHostnameZone(hostname, zones.value) : undefined
    if (!zone) return
    if (await mutate(() => $fetch(`/api/tunnels/${selectedId.value}/routes`, { method: 'DELETE', body: { zoneId: zone.id, index: deleting.value!.index, version: deleting.value!.version } }), 'Tunnel route removed')) deleting.value = undefined
    await reloadConfiguration()
  }
  function canManage(hostname?: string) {
    return !!hostname && !!findHostnameZone(hostname, zones.value)
  }

  const metrics = computed<ConsoleMetric[]>(() => [
    { label: 'Tunnels', value: error.value ? '—' : tunnels.value.length, icon: 'i-lucide-network', description: 'In your Cloudflare account', loading: initialLoading.value },
    { label: 'Healthy', value: error.value ? '—' : tunnels.value.filter(tunnel => tunnel.status === 'healthy').length, icon: 'i-lucide-circle-check', description: 'Ready to serve traffic', loading: initialLoading.value },
    { label: 'Connections', value: error.value ? '—' : tunnels.value.reduce((total, tunnel) => total + (tunnel.connections?.length ?? 0), 0), icon: 'i-lucide-plug', description: 'Reported tunnel connections', loading: initialLoading.value },
    { label: 'Published routes', value: configError.value || error.value || !selected.value ? '—' : rules.value.length, icon: 'i-lucide-route', description: selected.value?.name ?? 'Select a tunnel', loading: configInitialLoading.value || initialLoading.value }
  ])

  return {
    metrics,
    tunnels,
    error,
    zones,
    zonesError,
    zonesLoading,
    selectedId,
    selected,
    configuration,
    configError,
    configLoading,
    configInitialLoading,
    tunnelsLoading,
    initialLoading,
    rules,
    routeSearch,
    filteredRules,
    page,
    pageSize,
    visibleRules,
    modal,
    editing,
    deleting,
    busy,
    badgeColor,
    open,
    saved,
    remove,
    canManage,
    reloadConfiguration
  }
}
