# DNS Console

An internal application for Asset Monitoring Teknologi Indonesia to manage Cloudflare DNS records and Tunnel public hostname routes in one place. User access is managed through Microsoft Entra ID.

Built with Nuxt, Nuxt UI, Bun, and SQLite.

## Features

| Menu | Purpose |
| --- | --- |
| DNS records | Select domains, search and filter records, and manage hostnames, targets, TTL, proxy settings, MX priority, and comments. |
| Tunnels & routes | View tunnel status and connections, then connect public hostnames to internal services. |
| Logs | Search DNS and route changes by resource, actor email, category, status, and time. |
| Configuration | Review server configuration requirements, token permissions, and Cloudflare domain access. |

Supported record types for creation and editing: **A, AAAA, CNAME, MX, TXT, NS, and PTR**. Other types remain visible; structured records such as SRV and CAA are edited through Cloudflare.

Publishing a route creates a proxied CNAME when needed and checks for DNS conflicts. Existing origin settings, path matches, and catch-all rules are preserved. Removing a route only cleans up application-created CNAME records when no remaining route uses that hostname.

The interface includes light and dark modes, search, pagination, loading skeletons, and bottom navigation on mobile devices.

## Using the application

1. Choose **Continue with Microsoft** and sign in with an organization account that has been assigned access.
2. Open **DNS records**, select a domain, then use **Add record** or the three-dot menu to edit and delete records.
3. Open **Tunnels & routes**, select a tunnel, then use **Publish route** to connect a hostname to an origin service, such as `http://localhost:3000`.
4. Open **Logs** to review changes and the email addresses of the users who made them.

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
```

Fill in the Cloudflare and Microsoft settings described below, including a random `NUXT_AUTH_SECRET` of at least 32 characters. Then start the application:

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
```

Set the following values in `.env`:

| Variable | Description |
| --- | --- |
| `NUXT_APP_URL` | Application origin, such as `http://localhost:3000`, without a path or query. |
| `NUXT_CLOUDFLARE_API_TOKEN` | API token for DNS and Tunnel access. |
| `NUXT_CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID, not Zone ID. |
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

Create an API token with the following permissions and limit its scope to the account and domains you intend to manage:

- **Zone → Zone → Read**
- **Zone → DNS → Edit**
- **Account → Cloudflare Tunnel → Edit**

The token is stored on the server. The Configuration page shows configuration status and domain access results without exposing secret values.

### Microsoft Entra ID

1. Create an app registration with account type **Accounts in this organizational directory only**.
2. Add the **Web** platform with redirect URI `http://localhost:3000/auth/microsoft/callback`. For deployment, use `${NUXT_APP_URL}/auth/microsoft/callback`.
3. Copy the tenant ID, client ID, and client secret **Value** into `.env`.
4. Create an enabled app role with value **DNSConsole.Access** and allowed member type **Users/Groups**. If you choose a different value, update `NUXT_ENTRA_APP_ROLE` accordingly.
5. In **Enterprise applications**, enable **Assignment required?**, then assign users or groups to the role through **Users and groups**.
6. Add `${NUXT_APP_URL}/login` as a Web redirect URI to return to the application after logout.

All users with the required role have full console access. User assignments, roles, MFA, and sign-in policies are managed in Entra. Application sessions last up to 15 minutes; access changes take effect at the next sign-in.

## Deployment

Configure the server environment variables, use an HTTPS origin for `NUXT_APP_URL`, and register the matching redirect URIs in Entra.

```bash
bun run db:migrate
bun run build
bun run start
```

Run behind an HTTPS reverse proxy that forwards the request host and scheme correctly. Use a single application process; deployments with multiple replicas require distributed tunnel locking.

## Scope

DNS Console manages one Cloudflare account and one Microsoft Entra tenant. Tunnel creation and deletion, connector installation, Cloudflare Access policies, and private network CIDR routes are managed through Cloudflare.

DNS changes and tunnel configuration updates are separate operations. If a failed request leaves the outcome uncertain, inspect both resources before retrying. Avoid editing the same tunnel ingress configuration simultaneously through the application and the Cloudflare dashboard.

## Project checks

```bash
bun run check
```

Runs lint, type checking, unit and SQLite integration tests, the production build, and end-to-end checks. Tests use isolated temporary databases and do not touch application data.
