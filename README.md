# 🐺 Werewolf — moderator app & leaderboard

A self-hosted web app for groups that play the werewolf / mafia party game together.
It guides the moderator through each night, keeps a shared leaderboard and computes
statistics for players, roles and factions.

- **Live moderator mode:** night-by-night script with wake order, narration to read
  aloud, death cascades (lovers, hunter, …) and a suggested winner. The moderator
  confirms or overrides every step.
- **Quick entry:** record a game afterwards with just roles and outcome.
- **Leaderboard & statistics:** points per game, win rates by faction and role,
  survival, causes of death, role-set suggestions with feedback.
- **Role catalog:** 120+ roles from a unified house-rule set. Every role has its wake
  order, faction and a short moderator hint; the engine automates a core subset and the
  moderator runs the rest (human in the loop).
- **English and German:** UI and all game content (role texts, narration) are
  translated. Every visitor can switch the language; the instance sets the default.
- **One shared password** for the group, no user accounts.

Architecture and design decisions: [docs/architecture.md](./docs/architecture.md).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **`apps/web`:** Next.js 14 (App Router, Tailwind, mobile-first, dark theme)
- **`apps/api`:** NestJS 10 + Prisma + PostgreSQL
- **`packages/shared`:** domain (roles, factions, win conditions), Zod DTOs, the
  event-sourced game engine and pure statistics functions
- **Deployment:** Docker Compose (web, api, Postgres, nightly backup)

## Local development

Requirements: Node.js ≥ 20, pnpm (via `corepack enable`), Docker for Postgres.

```bash
pnpm install

# Postgres (credentials match .env.example)
docker run --name werewolf-db -e POSTGRES_USER=werewolf -e POSTGRES_PASSWORD=change-me-in-prod \
  -e POSTGRES_DB=werewolf -p 5432:5432 -d postgres:16-alpine

# Configuration for the API (DATABASE_URL, GATE_PASSWORD, SESSION_SECRET, …)
cp .env.example apps/api/.env
echo 'API_INTERNAL_URL=http://localhost:3001' > apps/web/.env.local

# Schema + demo players
pnpm --filter @werewolf/api prisma:deploy
pnpm --filter @werewolf/api prisma:seed

# Everything in watch mode (shared, api on :3001, web on :3000)
pnpm dev
```

Then open http://localhost:3000 and log in with the `GATE_PASSWORD` from `apps/api/.env`.

| Command | Effect |
| --- | --- |
| `pnpm build` | Builds shared → api → web (Turborepo) |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm test` | Vitest (mainly `packages/shared`) |
| `pnpm --filter @werewolf/api prisma:migrate` | Create a new migration |

## Self-hosting

Requirements: Docker with Compose v2. A setup CLI that does all of the following
interactively is on its way; until then the steps are manual.

Everything that belongs to one installation lives in `instance/` (ignored by git):
`.env` with configuration and secrets, `backups/`, and Caddy's certificates. Postgres
data stays in a Docker volume.

```bash
git clone https://github.com/TimGoldbach/werewolf.git && cd werewolf
mkdir -p instance && cp .env.example instance/.env && ln -s instance/.env .env
# edit instance/.env (see below), then:
docker compose up -d
```

Migrations run when the API starts. The `backup` service writes a daily `pg_dump` to
`instance/backups/` and keeps `BACKUP_RETENTION_DAYS` (default 14) days.

### How the app is reached

`COMPOSE_FILE` combines the core `docker-compose.yml` with one overlay from `compose/`.
Only the web app is exposed; it forwards `/api` to the API internally.

| Overlay | Use it for | Also set |
| --- | --- | --- |
| `compose/caddy.yml` | Your own domain. A bundled Caddy gets TLS certificates automatically; ports 80/443 must be free and the domain must point at the server. | `DOMAIN`, `SECURE_COOKIES=true` |
| `compose/port.yml` | LAN or laptop over plain HTTP, or a reverse proxy on the same host (`WEB_BIND=127.0.0.1`). | `WEB_BIND`, `WEB_PORT`, `SECURE_COOKIES` (`false` for plain HTTP) |
| `compose/proxy-network.yml` | An existing reverse proxy in Docker; it forwards to `werewolf-web:3000`. | `PROXY_NETWORK`, `SECURE_COOKIES=true` |

### Configuration

| Variable | Meaning |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `GATE_PASSWORD_HASH` | bcrypt hash of the group password (preferred) |
| `GATE_PASSWORD` | Plain-text group password (development) |
| `SESSION_SECRET` | Secret for signing session tokens (required, long and random) |
| `SESSION_TTL` | Session lifetime, default `30d` |
| `SECURE_COOKIES` | `Secure` session cookie, default `true`; `false` only for plain HTTP |
| `DEFAULT_LOCALE` | Default language, `en` (default) or `de` |
| `TIME_ZONE` | IANA time zone of the group, default `UTC` |
| `IMPRINT_URL` | Optional imprint/legal notice link in the footer |
| `BACKUP_RETENTION_DAYS` | Days to keep nightly backups, default `14` |
| `IMAGE_PREFIX` / `IMAGE_TAG` | Which container images to run |

Wrong passwords are throttled: after 10 failed logins from one client within 15
minutes, further attempts are refused until the window ends.

## Releases and CI

- **CI** ([ci.yml](.github/workflows/ci.yml)) runs on every pull request and push to
  `main`: typecheck, tests, build, and all Prisma migrations against an empty Postgres
  (including a check that `schema.prisma` has no missing migration).
- **Releases** ([release.yml](.github/workflows/release.yml)) use
  [release-please](https://github.com/googleapis/release-please): it keeps a release PR
  with the next version and `CHANGELOG.md` up to date from the Conventional Commits on
  `main`. Merging it tags the release, and the workflow publishes multi-arch images
  (amd64, arm64) to GHCR as `vX.Y.Z`, `vX.Y`, `vX` and `latest`.

## License & notice

The code is released under the [MIT license](./LICENSE). All narration texts and
graphics in this repository are original work. The sounds in `apps/web/public/audio`
come from Pixabay and are covered by its license, not by MIT (see
[NOTICE](./apps/web/public/audio/NOTICE.md)).

This is an unofficial hobby project. It implements the rules of the classic
werewolf / mafia party game, which are not protected, and is not affiliated with or
endorsed by any publisher of a commercial werewolf game.
