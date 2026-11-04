import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** An isolated build process with synthetic auth, its own SQLite file and no Cloudflare credentials. */
export async function startProductionServer() {
  if (!await Bun.file('.output/server/index.mjs').exists()) throw new Error('Run bun run build before end-to-end tests.')
  const reservation = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
  const port = reservation.port!
  reservation.stop(true)
  const base = `http://127.0.0.1:${port}`
  const tenant = '11111111-1111-4111-8111-111111111111'
  const client = '22222222-2222-4222-8222-222222222222'
  const secret = crypto.randomUUID() + crypto.randomUUID()
  const directory = await mkdtemp(join(tmpdir(), 'dns-e2e-'))
  const child = Bun.spawn([process.execPath, '.output/server/index.mjs'], {
    env: {
      NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), NUXT_APP_URL: base,
      NUXT_ENTRA_TENANT_ID: tenant, NUXT_ENTRA_CLIENT_ID: client,
      NUXT_ENTRA_CLIENT_SECRET: 'synthetic-test-secret', NUXT_AUTH_SECRET: secret,
      NUXT_ENTRA_APP_ROLE: 'DNSConsole.Access',
      NUXT_CLOUDFLARE_API_TOKEN: '', NUXT_CLOUDFLARE_ACCOUNT_ID: '', NUXT_SQLITE_PATH: join(directory, 'logs.sqlite')
    },
    stdout: 'ignore', stderr: 'ignore'
  })
  async function stop() {
    child.kill()
    await child.exited
    await rm(directory, { recursive: true, force: true })
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) break
    try {
      if ((await fetch(`${base}/api/auth/session`, { signal: AbortSignal.timeout(1000) })).ok) return { base, tenant, client, secret, stop }
    } catch { /* Wait only for this synthetic process to bind its port. */ }
    await Bun.sleep(50)
  }
  await stop()
  throw new Error('The isolated production server did not become ready.')
}
