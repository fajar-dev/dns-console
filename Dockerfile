# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.4.2
FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
ENV NODE_ENV=production
RUN bun run build \
    && bun build scripts/migrate.ts --target=bun --outfile=/app/docker-build/migrate.mjs

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NUXT_SQLITE_PATH=/app/.data/dns-console.sqlite
RUN mkdir -p /app/.data && chown bun:bun /app/.data
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --from=build --chown=bun:bun /app/docker-build/migrate.mjs ./scripts/migrate.mjs
COPY --chown=bun:bun docker/entrypoint.mjs docker/healthcheck.mjs ./docker/
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["bun", "docker/healthcheck.mjs"]
ENTRYPOINT ["bun", "--no-install", "docker/entrypoint.mjs"]
CMD ["start"]
