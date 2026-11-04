export default defineNuxtRouteMiddleware(async (to) => {
  const { loadSession } = useAuth()
  const session = await loadSession()
  if (!session.authenticated && to.path !== '/login') return navigateTo('/login')
  if (session.authenticated && to.path === '/login') return navigateTo('/')
})
