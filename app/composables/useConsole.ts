export function consoleError(error: unknown): string {
  const value = error as { data?: { data?: { message?: string }, message?: string, statusMessage?: string }, message?: string }
  return value?.data?.data?.message ?? value?.data?.statusMessage ?? value?.data?.message ?? value?.message ?? 'Something went wrong. Please try again.'
}

export function useConsole() {
  const toast = useToast()
  const busy = ref(false)
  async function mutate(action: () => Promise<unknown>, message: string) {
    if (busy.value) return false
    busy.value = true
    try {
      await action()
      toast.add({ title: message, icon: 'i-lucide-circle-check', color: 'success' })
      return true
    } catch (error) {
      toast.add({ title: 'Unable to complete change', description: consoleError(error), color: 'error', icon: 'i-lucide-circle-alert' })
      return false
    } finally { busy.value = false }
  }
  return { busy, mutate }
}
