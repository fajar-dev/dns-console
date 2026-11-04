import type { AuthStatus } from '#shared/types/auth'

/** One SSR-safe session source for middleware, login, settings and the account menu. */
export function useAuth() {
  const session = useState<AuthStatus | null>('auth-session', () => null)
  const request = useRequestFetch()
  const user = computed(() => session.value?.user ?? null)

  async function loadSession() {
    try {
      session.value = await request<AuthStatus>('/api/auth/session')
      return session.value
    } catch (error) {
      session.value = null
      throw error
    }
  }

  async function signOut() {
    const { redirectTo } = await $fetch('/api/auth/logout', { method: 'POST', body: {} })
    session.value = null
    clearNuxtData()
    await navigateTo(redirectTo, { external: true })
  }

  return { session: readonly(session), user, loadSession, signOut }
}
