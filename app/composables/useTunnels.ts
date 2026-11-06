export function useTunnels() {
  const request = useLazyFetch('/api/tunnels', { key: 'workspace-tunnels', server: false })
  const data = computed(() => request.data.value?.items ?? [])
  const issues = computed(() => request.data.value?.issues ?? [])
  const loading = computed(() => request.status.value === 'idle' || request.status.value === 'pending')
  return { ...request, data, issues, loading }
}
