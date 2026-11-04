# DNS Console

An internal application for Asset Monitoring Teknologi Indonesia to manage Cloudflare DNS records and Tunnel public hostname routes in one place. User access is managed through Microsoft Entra ID.

Built with Nuxt, Nuxt UI, Bun, and MySQL.

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
- MySQL 8.0 or newer with a dedicated application database.
- A Cloudflare account with the domains and tunnels you want to manage.
- Remotely managed tunnels for editing routes.
- A running `cloudflared` connector that can reach the origin services.
- A Microsoft Entra ID app registration for a single organization tenant.

## Getting started

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
| `NUXT_MYSQL_URL` | MySQL database connection URL. |

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

Runs lint, type checking, tests, and the production build. To include database tests, set `TEST_MYSQL_URL` to a dedicated test database whose name ends in `_test`.
