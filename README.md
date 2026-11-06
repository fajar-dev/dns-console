# DNS Console

An internal application for Asset Monitoring Teknologi Indonesia to centrally manage DNS records and Tunnel public hostname routes across multiple Cloudflare accounts. User access is managed through Microsoft Entra ID.

Built with Nuxt, Nuxt UI, Bun, and SQLite.

## Features

| Menu | Purpose |
| --- | --- |
| DNS records | Select domains, search and filter records, and manage hostnames, targets, TTL, proxy settings, MX priority, and comments. |
| Tunnels & routes | View tunnel status and connections, then connect public hostnames to internal services. |
| Logs | Search DNS and route changes by resource, account, actor email, category and status. |
| Configuration | View Cloudflare account cards with connection status and domain and tunnel counts. |

Supported record types for creation and editing: **A, AAAA, CNAME, MX, TXT, NS, and PTR**. Other types remain visible; structured records such as SRV and CAA are edited through Cloudflare.

Publishing a route creates a proxied CNAME when needed and checks for DNS conflicts. Existing origin settings, path matches, and catch-all rules are preserved. Removing a route only cleans up application-created CNAME records when no remaining route uses that hostname.

The interface includes light and dark modes, search, pagination, loading skeletons, and bottom navigation on mobile devices.

## Using the application

1. Choose **Continue with Microsoft** and sign in with an assigned organization account. Domains and tunnels from all configured accounts are combined automatically.
2. Open **DNS records**, select a domain, then use **Add record** or the three-dot menu to edit and delete records.
3. Open **Tunnels & routes**, select a tunnel, then use **Publish route** to connect a hostname to an origin service, such as `http://localhost:3000`.
4. Open **Logs** to review changes across accounts and see which account and user made each change.

Logs cover changes made through DNS Console. Changes made directly in the Cloudflare dashboard or another application are not included.

## Requirements

- Bun 1.4.2 or newer.
- A Cloudflare account with the domains and tunnels you want to manage.
- Remotely managed tunnels for editing routes.
- A running `cloudflared` connector that can reach the origin services.
- A Microsoft Entra ID app registration for a single organization tenant.

## Docker

Docker Engine with the Compose plugin is sufficient to run the application. Bun and SQLite are included in the image.

```bash
cp .env.docker.example .env.docker
cp config/cloudflare-accounts.example.json config/cloudflare-accounts.json
```

Fill in the Microsoft settings in `.env.docker`, including a random `NUXT_AUTH_SECRET` of at least 32 characters. Configure Cloudflare accounts in the JSON file as described below. Compose mounts that file read-only; it is never included in the image. On a standard Linux Docker host, make it readable by the container user (UID 1000):

```bash
sudo chown 1000:1000 config/cloudflare-accounts.json
sudo chmod 600 config/cloudflare-accounts.json
```

Then start the application:

```bash
docker compose --env-file .env.docker up -d --build --wait
```

Open [http://localhost:3000](http://localhost:3000). Change `APP_PORT` if that port is already in use, and update `NUXT_APP_URL` and the Entra redirect URIs to match.

The production Bun container runs as a non-root user with a read-only filesystem. The `sqlite_data` volume provides writable storage at `/app/.data` for the database and its WAL files. The schema is initialized automatically when the database is first opened. The `/health` endpoint checks database readiness. Secrets are supplied at runtime and excluded from the build context and image.

```bash
# Status and application logs
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app

# Rebuild after pulling application updates
docker compose --env-file .env.docker up -d --build --wait

# Stop the application while keeping its database
docker compose --env-file .env.docker down
```

Keep the named volume when recreating containers. `down --volumes` permanently removes its data. For a consistent offline backup, stop the application before backing up the entire data volume; restore it while the application is stopped.

The application binds to `127.0.0.1` by default. For a deployed domain, configure an HTTPS reverse proxy, set `NUXT_APP_URL` to its public HTTPS origin, and register the matching Entra redirect URIs. `APP_BIND_ADDRESS` controls the host binding if a different network setup is required.

## Local development

```bash
bun install --frozen-lockfile
cp .env.example .env
cp config/cloudflare-accounts.example.json config/cloudflare-accounts.json
chmod 600 config/cloudflare-accounts.json
```

Set the following values in `.env`:

| Variable | Description |
| --- | --- |
| `NUXT_APP_URL` | Application origin, such as `http://localhost:3000`, without a path or query. |
| `NUXT_CLOUDFLARE_ACCOUNTS_FILE` | Server-only credentials JSON path; defaults to `config/cloudflare-accounts.json`. Compose sets the container path automatically. |
| `NUXT_ENTRA_TENANT_ID` | Microsoft Entra Directory (tenant) ID. |
| `NUXT_ENTRA_CLIENT_ID` | Application (client) ID from the app registration. |
| `NUXT_ENTRA_CLIENT_SECRET` | Client secret **Value**, not Secret ID. |
| `NUXT_ENTRA_APP_ROLE` | Required sign-in role; defaults to `DNSConsole.Access`. |
| `NUXT_AUTH_SECRET` | Random secret of at least 32 characters for application sessions. |
| `NUXT_SQLITE_PATH` | Optional database file path; defaults to `.data/dns-console.sqlite`. The containing directory must be writable. |

Generate a session secret with:

```bash
bun -e 'console.log(crypto.randomUUID() + crypto.randomUUID())'
```

After completing the Cloudflare and Microsoft setup below:

```bash
bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the application after changing environment variables.

The SQLite schema is initialized automatically on first database access. `bun run db:migrate` can also initialize or verify it before starting. Logs are stored in the configured database file; keep its directory across deployments. SQLite uses WAL mode and transactional migrations, with checksums to detect changes to applied migrations.

### Cloudflare

Store Cloudflare credentials in `config/cloudflare-accounts.json`:

```json
{
  "accounts": [
    {
      "id": "amti",
      "name": "AMTI",
      "accountId": "YOUR_32_CHARACTER_CLOUDFLARE_ACCOUNT_ID",
      "apiToken": "YOUR_API_TOKEN"
    },
    {
      "id": "second-account",
      "name": "Second account",
      "accountId": "ANOTHER_32_CHARACTER_ACCOUNT_ID",
      "apiToken": "ANOTHER_API_TOKEN"
    }
  ]
}
```

Use a unique, stable lowercase `id` with letters, numbers and hyphens (up to 64 characters); `all` is reserved. `name` is the display label. `accountId` is the Cloudflare Account ID, not a Zone ID. Duplicate account IDs are rejected. Up to 100 accounts are supported. An empty `accounts` array allows initial setup without Cloudflare credentials.

Create an API token for each account with the following permissions and limit its scope to the intended account and domains:

- **Zone → Zone → Read**
- **Zone → DNS → Edit**
- **Account → Cloudflare Tunnel → Edit**

Domains and tunnels from every configured account appear in one workspace. Colored account labels identify the owner; no account switching is required. Selecting a domain or tunnel automatically routes reads and changes through its owner's credentials. Route publishing only offers domains belonging to the tunnel's account. If an account fails to load, the others remain available and the affected account is identified.

Logs retain the account label at the time of each change. Search by account name, resource or actor to narrow the combined history. Existing logs without account metadata remain unattributed.

The real credentials file is ignored by Git and excluded from Docker builds. Keep it on the server, restrict file permissions, and do not place it under `public/`. The browser receives only account IDs and labels. Restart the application after editing the file:

```bash
# Docker: recreating also picks up JSON files replaced through an atomic editor save
docker compose --env-file .env.docker up -d --force-recreate app

# PM2
pm2 restart ecosystem.config.cjs --update-env
```

### Microsoft Entra ID

1. Create an app registration with account type **Accounts in this organizational directory only**.
2. Add the **Web** platform with redirect URI `http://localhost:3000/auth/microsoft/callback`. For deployment, use `${NUXT_APP_URL}/auth/microsoft/callback`.
3. Copy the tenant ID, client ID, and client secret **Value** into `.env`.
4. Create an enabled app role with value **DNSConsole.Access** and allowed member type **Users/Groups**. If you choose a different value, update `NUXT_ENTRA_APP_ROLE` accordingly.
5. In **Enterprise applications**, enable **Assignment required?**, then assign users or groups to the role through **Users and groups**.
6. Add `${NUXT_APP_URL}/login` as a Web redirect URI to return to the application after logout.

All users with the required role have full access to every configured Cloudflare account. User assignments, roles, MFA, and sign-in policies are managed in Entra. Application sessions last up to 15 minutes; access changes take effect at the next sign-in.

## Deployment

Configure the server environment variables, use an HTTPS origin for `NUXT_APP_URL`, and register the matching redirect URIs in Entra.

```bash
bun run db:migrate
bun run build
bun run start
```

Run behind an HTTPS reverse proxy that forwards the request host and scheme correctly. Use a single application process; deployments with multiple replicas require distributed tunnel locking.

### PM2

Install PM2 on the production host, then run these commands from the application directory:

```bash
bun install --global pm2
bun install --frozen-lockfile
bun run build
pm2 start ecosystem.config.cjs
pm2 save
```

Configure `.env` using the variables listed above. Bun loads it from the application directory. The configuration runs one Bun process in fork mode, binds to `127.0.0.1:3000` by default, restarts after crashes, and allows 45 seconds for graceful shutdown. The SQLite schema is initialized automatically on first database access. Keep `.data` across deployments, or set `NUXT_SQLITE_PATH` to a persistent path outside the checkout.

Ensure `bun` is available in the PM2 service's `PATH`. To use an absolute executable path, set `BUN_BIN` when starting or restarting the ecosystem file. `HOST` and `PORT` can also be set in the shell before loading the configuration.

```bash
# Deploy updated code and reload environment variables
bun install --frozen-lockfile
bun run build
pm2 restart ecosystem.config.cjs --update-env
pm2 save

# Inspect process status, output and database readiness
pm2 status dns-console
pm2 logs dns-console
curl --fail http://127.0.0.1:3000/health

# Generate the host-specific boot service instructions
pm2 startup
```

Follow the command printed by `pm2 startup`, then run `pm2 save` again. Application output is written to `logs/pm2-out.log` and `logs/pm2-error.log`; configure host log rotation for this directory. Restarting the single process briefly interrupts requests.

## Scope

DNS Console manages multiple Cloudflare accounts within one Microsoft Entra tenant. Tunnel creation and deletion, connector installation, Cloudflare Access policies, and private network CIDR routes are managed through Cloudflare.

DNS changes and tunnel configuration updates are separate operations. If a failed request leaves the outcome uncertain, inspect both resources before retrying. Avoid editing the same tunnel ingress configuration simultaneously through the application and the Cloudflare dashboard.

## Project checks

```bash
bun run check
```

Runs lint, type checking, unit and SQLite integration tests, the production build, and end-to-end checks. Tests use isolated temporary databases and do not touch application data.
