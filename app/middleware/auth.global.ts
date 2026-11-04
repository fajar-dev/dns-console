import type { AuthStatus } from '#shared/types/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const request = useRequestFetch()
  const session = await request<AuthStatus>('/api/auth/session')
  if (!session.authenticated && to.path !== '/login') return navigateTo('/login')
  if (session.authenticated && to.path === '/login') return navigateTo('/')
})
