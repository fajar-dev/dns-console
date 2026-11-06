import { getErrorMessage } from '~/utils/error-message'

export function useMutation() {
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
      toast.add({ title: 'Unable to complete change', description: getErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
      return false
    } finally {
      busy.value = false
    }
  }
  return { busy, mutate }
}
