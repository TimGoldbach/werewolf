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

## Production (Docker Compose)

The Compose file runs `web`, `api`, `db` and a `backup` service. It expects a reverse
proxy that terminates TLS on the external Docker network `web` and forwards your domain
to `werewolf-web:3000`.

1. Copy `docker-compose.yml` and `.env.example` (as `.env`) to the server.
2. In `.env`:
   - set a long random `SESSION_SECRET`;
   - put a bcrypt hash of the group password into `GATE_PASSWORD_HASH` instead of a
     plain `GATE_PASSWORD`;
   - set `WEB_ORIGIN` to your public URL.
3. `docker compose up -d`

Migrations run when the API starts. The `backup` service writes a daily `pg_dump` to
`ops/backups/` and keeps 14 days.

### Configuration

| Variable | Service | Meaning |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db, api, backup | Database credentials |
| `GATE_PASSWORD_HASH` | api | bcrypt hash of the group password (preferred) |
| `GATE_PASSWORD` | api | Plain-text group password (development) |
| `SESSION_SECRET` | api | Secret for signing session tokens (required) |
| `SESSION_TTL` | api | Session lifetime, default `30d` |
| `WEB_ORIGIN` | api | Allowed CORS origin |
| `DEFAULT_LOCALE` | web | Default language, `en` (default) or `de` |
| `TIME_ZONE` | web | IANA time zone of the group, default `UTC` |
| `IMPRINT_URL` | web | Optional imprint/legal notice link in the footer |
| `IMAGE_PREFIX` / `IMAGE_TAG` | Compose | Which container images to run |

## CI/CD

- **CI** ([ci.yml](.github/workflows/ci.yml)) runs on every pull request and push to
  `main`:
  - typecheck, tests and build;
  - all Prisma migrations against an empty Postgres, including a check that
    `schema.prisma` has no missing migration.
- **Deploy** ([deploy.yml](.github/workflows/deploy.yml)) is optional and started by
  hand (*Actions → Deploy → Run workflow*):
  1. it runs CI and builds the images to GHCR as `sha-<commit>`;
  2. it promotes that tag to `:latest`;
  3. it rolls out via SSH with [ops/deploy.sh](ops/deploy.sh): pull the images, back up
     the database, then `docker compose up --wait`.

  To roll back, run the deploy again with an earlier `image_tag`.

### Setting up the deploy workflow

Create a GitHub environment `production` with:

| Name | Kind | Value |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | Secret | Private SSH key of the deploy user |
| `DEPLOY_HOST` | Variable | Server host or IP |
| `DEPLOY_USER` | Variable | SSH user (needs Docker and write access to the deploy path) |
| `DEPLOY_PATH` | Variable | Absolute path of the Compose project (contains `.env`) |
| `DEPLOY_SSH_KNOWN_HOSTS` | Variable | Output of `ssh-keyscan <host>` |
| `DEPLOY_PORT` | Variable | Optional, default `22` |
| `DEPLOY_URL` | Variable | Public URL shown on the environment |

## License & notice

The code is released under the [MIT license](./LICENSE). All narration texts and
graphics in this repository are original work. The sounds in `apps/web/public/audio`
come from Pixabay and are covered by its license, not by MIT (see
[NOTICE](./apps/web/public/audio/NOTICE.md)).

This is an unofficial hobby project. It implements the rules of the classic
werewolf / mafia party game, which are not protected, and is not affiliated with or
endorsed by any publisher of a commercial werewolf game.
