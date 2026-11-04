export const environment = [
  { name: 'NUXT_CLOUDFLARE_API_TOKEN', description: 'Scoped Cloudflare API token with DNS and Tunnel permissions.' },
  { name: 'NUXT_CLOUDFLARE_ACCOUNT_ID', description: 'The Cloudflare account containing your domains and tunnels.' },
  { name: 'NUXT_APP_URL', description: 'Application origin used for the Microsoft sign-in callback and sign-out redirect.' },
  { name: 'NUXT_ENTRA_TENANT_ID', description: 'Directory ID of your organization. Only this tenant can sign in.' },
  { name: 'NUXT_ENTRA_CLIENT_ID', description: 'Application ID from your single-tenant Entra app registration.' },
  { name: 'NUXT_ENTRA_CLIENT_SECRET', description: 'Client secret value from the Entra app registration; kept on the server.' },
  { name: 'NUXT_ENTRA_APP_ROLE', description: 'Required Entra app role. Defaults to DNSConsole.Access; assign users or groups in Entra.' },
  { name: 'NUXT_AUTH_SECRET', description: 'Random secret of at least 32 characters for encrypting session cookies.' },
  { name: 'NUXT_MYSQL_URL', description: 'MySQL connection URL for persistent logs. Run bun run db:migrate before starting.' }
]
