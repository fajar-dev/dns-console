# DNS Console

A private Cloudflare DNS and public hostname Tunnel management console.
one Cloudflare account, and one application process.

## Requirements

- Bun 1.4.2 or newer.
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
| `NUXT_AUDIT_DATABASE_PATH` | SQLite database path, defaults to `./.data/audit.sqlite`. |

Generate a session secret with:

```bash
bun -e 'console.log(crypto.randomUUID() + crypto.randomUUID())'
```

Create a Cloudflare token with **Zone → Zone → Read**, **Zone → DNS → Edit**, and **Account → Cloudflare Tunnel → Edit**. Scope it to the account and zones you intend to manage. Tokens and account configuration are never sent to the browser. The Configuration page tests zone access; the Tunnels page also verifies Tunnel access.

```bash
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
- View the latest 100 locally recorded changes in a persistent SQLite audit log.
- Responsive Nuxt UI dashboard with light/dark mode, loading states, inline validation, and error feedback.

Tunnel creation/deletion, connector installation, Cloudflare Access policies, private network CIDR routes, multi-account management, and multi-user roles are outside this version's scope. HTTP applications can be published directly; SSH/TCP/RDP services require the appropriate Cloudflare client-side access setup.

## Architecture

```text
app/                    Vue pages, Nuxt UI components, composables, auth middleware
shared/types/           Frontend/backend response contracts
shared/validation/      Shared Zod request schemas
server/domain/          Gateway/repository interfaces and application errors
server/application/     DNS and Tunnel use cases, orchestration, concurrency control
server/infrastructure/  Cloudflare HTTP adapter and Bun SQLite audit repository
server/api/             Thin, validated HTTP handlers
server/utils/           Dependency composition, session management, error mapping
server/middleware/      Authentication and same-origin mutation enforcement
tests/                  Bun service, adapter, validation and compensation tests
```

Application services depend on gateway/repository interfaces and receive dependencies through constructors. `services()` is the composition root. Native `fetch` provides HTTP transport; Axios is not required.

## Consistency and recovery

Cloudflare DNS and Tunnel configuration are separate operations, with no shared transaction. Publishing first validates the current tunnel configuration and DNS records, creates a CNAME only if needed, rechecks the configuration, and writes the complete preserved ingress configuration.

If a write fails, the service reads the configuration again to distinguish an applied change from a confirmed failure. Newly created DNS is removed only when the original configuration is confirmed unchanged. When the outcome cannot be established, DNS is retained and the UI asks for inspection. Existing matching DNS is never claimed as application-owned. Deleting a route only deletes a matching CNAME marked as created by this console and only when no remaining ingress rule uses that hostname.

Configuration hashes reject stale forms, and per-tunnel locks serialize this process's writes. Cloudflare does not provide an atomic compare-and-swap in this workflow: another tool or dashboard can still race between the final read and write. Avoid simultaneous external ingress edits. Multiple replicas require distributed locks and a shared audit store.

Ambiguous DNS API timeouts can also leave a record behind. Refresh both resources before retrying. Writes are never automatically retried. Cloudflare rate limits and pagination are handled explicitly; users receive actionable errors without raw upstream responses or credentials.

Audit records describe changes through this console only. The database stores action/resource metadata, not credentials or DNS record contents. Authentication failures and mutations performed outside this application are not part of this activity feed. Protect and back up the database with the application data.

## Validation

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Tests use injected fake gateways and an in-memory SQLite database. They never mutate a real Cloudflare account. CI runs the same checks using Bun and the frozen lockfile.

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

Persist the database directory, including SQLite WAL files, across deployments. The application requires Bun at runtime because the audit adapter uses `bun:sqlite`. Use one application process for this deployment model. Login attempts are limited in memory per source IP; use an edge limiter and properly configured trusted-proxy handling for internet-facing or replicated deployments. No public deployment or live Cloudflare change is performed by project setup.

## References

- [Cloudflare DNS API](https://developers.cloudflare.com/api/resources/dns/)
- [Cloudflare Tunnel API setup](https://developers.cloudflare.com/tunnel/get-started/)
- [Remotely managed tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/)
- [Cloudflare API rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/)
- [Nuxt UI](https://ui.nuxt.com/)
