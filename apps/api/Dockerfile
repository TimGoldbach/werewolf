# Build context = repo root (see docker-compose.yml)
FROM node:22-slim AS base
# OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
# Only api + its workspace dependencies (without Next & co.)
RUN pnpm install --frozen-lockfile --filter @werewolf/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @werewolf/shared build \
  && pnpm --filter @werewolf/api exec prisma generate \
  && pnpm --filter @werewolf/api build
# Standalone directory with production dependencies only (including @werewolf/shared as a
# copy). --legacy because the workspace does not use injected packages; --offline
# because all packages are already in the store (saves the registry round trip).
RUN pnpm --filter @werewolf/api deploy --legacy --prod --offline /out \
  && cd /out && node_modules/.bin/prisma generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/prisma ./prisma
EXPOSE 3001
# Apply migrations, then start (exec: node receives SIGTERM directly).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
