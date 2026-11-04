export default apiHandler((event) => {
  if (!authConfigured()) return { redirectTo: '/login' }
  const auth = microsoftAuth()
  auth.identity.clear(event)
  auth.transaction.clear(event)
  return { redirectTo: auth.service.logoutUrl() }
})
