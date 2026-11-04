# DNS Console

A private Cloudflare DNS and public hostname Tunnel management console.
one Cloudflare account, and one application process.

## Requirements

- Bun 1.4.2 or newer.
- MySQL 8.0 or newer with a dedicated database.
- Domains and existing Cloudflare Tunnels in your Cloudflare account.
- Remotely managed tunnels for editing ingress rules through the API.
- A running `cloudflared` connector with access to each origin service.

## Setup

```bash
bun install --frozen-lockfile
cp .env.example .env
```

Set these server-only variables in `.env`:

| Variable | Purpose |
| --- | --- |
| `NUXT_CLOUDFLARE_API_TOKEN` | Scoped Cloudflare API token. |
| `NUXT_CLOUDFLARE_ACCOUNT_ID` | Account ID, not zone ID. |
| `NUXT_ADMIN_PASSWORD` | Unique admin password, at least 12 characters. |
| `NUXT_SESSION_PASSWORD` | Random session encryption secret, at least 32 characters. |
| `NUXT_MYSQL_URL` | MySQL connection URL, e.g. `mysql://dns_console:password@127.0.0.1:3306/dns_console`. |

Generate a session secret with:

```bash
bun -e 'console.log(crypto.randomUUID() + crypto.randomUUID())'
```

Create a Cloudflare token with **Zone → Zone → Read**, **Zone → DNS → Edit**, and **Account → Cloudflare Tunnel → Edit**. Scope it to the account and zones you intend to manage. Tokens and account configuration are never sent to the browser. The Configuration page tests zone access; the Tunnels page also verifies Tunnel access.

```bash
bun run db:migrate
bun run dev
```

Open `http://localhost:3000` and sign in with the configured admin password. If authentication is not configured, the login screen displays setup instructions and the management API remains inaccessible.

## Features

- List accessible domains and search/filter/paginate their DNS records.
- Create and edit A, AAAA, CNAME, MX, TXT, NS, and PTR records, including TTL, supported proxy settings, MX priority, and comments.
- View other DNS record types and delete records after confirmation. Structured record types such as SRV and CAA must be edited in Cloudflare.
- List existing tunnels, connection counts, and tunnel status.
- Create, edit, and remove public hostname ingress rules for remotely managed tunnels.
- Publish routes with automatic proxied CNAME creation and conflict checks.
- Preserve existing path matches, origin settings, private routing configuration, and the final catch-all rule.
- Browse persistent MySQL logs with server-side search, category/status filters, success/failure counts, and pagination (10/25/50/100 rows).
- Responsive Nuxt UI dashboard with light/dark mode, inline validation, and error feedback.
- Non-blocking data loading with a navigation progress bar and skeletons for DNS records, tunnels, routes, logs, and connection checks. Data reloads automatically after saves and deletions, and requests are scoped to the selected domain or tunnel.

Tunnel creation/deletion, connector installation, Cloudflare Access policies, private network CIDR routes, multi-account management, and multi-user roles are outside this version's scope. HTTP applications can be published directly; SSH/TCP/RDP services require the appropriate Cloudflare client-side access setup.

## Architecture

```text
app/                    Vue pages, Nuxt UI components, composables, auth middleware
shared/types/           Frontend/backend response contracts
shared/validation/      Shared Zod request schemas
server/domain/          Gateway/repository interfaces and application errors
server/application/     DNS, Tunnel and Logs use cases, orchestration, concurrency control
server/infrastructure/  Cloudflare HTTP adapter and MySQL log repository
server/api/             Thin, validated HTTP handlers
server/utils/           Dependency composition, session management, error mapping
server/middleware/      Authentication and same-origin mutation enforcement
tests/                  Bun service, adapter, validation and compensation tests
```

Application services depend on gateway/repository interfaces and receive dependencies through constructors. `services()` is the composition root. Native `fetch` provides HTTP transport; Axios is not required.

## Consistency and recovery

Cloudflare DNS and Tunnel configuration are separate operations, with no shared transaction. Publishing first validates the current tunnel configuration and DNS records, creates a CNAME only if needed, rechecks the configuration, and writes the complete preserved ingress configuration.

If a write fails, the service reads the configuration again to distinguish an applied change from a confirmed failure. Newly created DNS is removed only when the original configuration is confirmed unchanged. When the outcome cannot be established, DNS is retained and the UI asks for inspection. Existing matching DNS is never claimed as application-owned. Deleting a route only deletes a matching CNAME marked as created by this console and only when no remaining ingress rule uses that hostname.

Configuration hashes reject stale forms, and per-tunnel locks serialize this process's writes. Cloudflare does not provide an atomic compare-and-swap in this workflow: another tool or dashboard can still race between the final read and write. Avoid simultaneous external ingress edits. Multiple replicas require distributed locks and a shared MySQL store.

Ambiguous DNS API timeouts can also leave a record behind. Refresh both resources before retrying. Writes are never automatically retried. Cloudflare rate limits and pagination are handled explicitly; users receive actionable errors without raw upstream responses or credentials.

Logs describe changes through this console only. The database stores action/resource metadata, not credentials or DNS record contents. Authentication failures and mutations performed outside this application are not part of these logs. Protect and back up the database. Mutations check database availability before contacting Cloudflare. If log insertion fails after a committed Cloudflare change, its metadata is emitted to server stderr for recovery without marking the successful change as failed. Historical local database files are left untouched; this rewrite starts a fresh MySQL log history.

## Validation

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Service tests use injected fake gateways and a test-only memory log writer. MySQL integration tests run against a dedicated database whose name ends in `_test`; set `TEST_MYSQL_URL` to enable them locally. They cover migrations, persistence, filters, ordering and pagination, and never mutate a real Cloudflare account. CI runs the same checks with MySQL and Bun.

## Production

```bash
bun run build
bun run start
```

Supply the environment variables to the running process. Bun automatically loads `.env` files from the working directory when present. For production, configure secrets in your deployment environment and avoid shipping a development `.env` file. To explicitly select a local environment file, use:

```bash
bun --env-file=.env run start
```

Run behind an HTTPS reverse proxy; session cookies are `Secure` in production, `HttpOnly`, and `SameSite=Strict`. Sessions expire after eight hours. Changing the session secret invalidates existing sessions. Preserve `Host` and the original request scheme correctly at the proxy so same-origin checks match your public URL.

Back up the MySQL database and run `bun run db:migrate` before deploying application changes. The migration command tracks applied files and serializes concurrent runs with a database lock. Use a migration account with CREATE/ALTER rights; the runtime account only needs SELECT/INSERT on `console_logs`. URL-encode special characters in credentials and configure TLS for remote database connections (mysql2 connection options in the URL). The application uses a bounded connection pool, prepared statements, UTC timestamps, and closes its pool on shutdown. Use one application process for tunnel write serialization. Login attempts are limited in memory per source IP; use an edge limiter and properly configured trusted-proxy handling for internet-facing or replicated deployments. No public deployment or live Cloudflare change is performed by project setup.

## References

- [Cloudflare DNS API](https://developers.cloudflare.com/api/resources/dns/)
- [Cloudflare Tunnel API setup](https://developers.cloudflare.com/tunnel/get-started/)
- [Remotely managed tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/)
- [Cloudflare API rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/)
- [Nuxt UI](https://ui.nuxt.com/)

MySQL connection pooling follows the [mysql2 documentation](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool).
