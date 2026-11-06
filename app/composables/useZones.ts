export function useZones() {
  const request = useLazyFetch('/api/zones', { key: 'workspace-zones', server: false })
  const data = computed(() => request.data.value?.items ?? [])
  const issues = computed(() => request.data.value?.issues ?? [])
  const loading = computed(() => request.status.value === 'idle' || request.status.value === 'pending')
  return { ...request, data, issues, loading }
}
