export default apiHandler(async (event) => {
  const configured = authConfigured()
  const session = configured ? await adminSession(event) : undefined
  const config = useRuntimeConfig()
  return { authenticated: session?.data.authenticated === true, authConfigured: configured, cloudflareConfigured: !!config.cloudflareApiToken && /^[a-f0-9]{32}$/.test(config.cloudflareAccountId) }
})
