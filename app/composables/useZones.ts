export function useZones() {
  const request = useLazyFetch('/api/zones', {
    key: 'cloudflare-zones',
    server: false,
    default: () => []
  })
  const loading = computed(() => request.status.value === 'idle' || request.status.value === 'pending')
  return { ...request, loading }
}
