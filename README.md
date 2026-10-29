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
Want to help or add a role? See [CONTRIBUTING.md](./CONTRIBUTING.md).

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

Requirements: Docker with Compose v2, git and Node.js ≥ 22.18 (the CLI is TypeScript that
Node runs directly). Release images exist for amd64 and arm64.

```bash
git clone https://github.com/TimGoldbach/werewolf.git && cd werewolf
./werewolf setup
```

`setup` checks the system, then asks a few questions: language, group name and tagline,
accent colour, an optional logo, how the app is reached, time zone, the group password (your
own or a generated one like `vollmond-heult-37`) and an optional imprint link. After a summary
it writes `instance/.env`, gets the images, starts everything, checks that the app answers and
shows the URL and the password. On its first run, `./werewolf` installs only the CLI's few
dependencies, not the web and API toolchain.

On a release tag (`git checkout v1.0.0`) the setup pulls the matching images from GHCR; on
any other commit, or with `--build`, it builds them from the checkout.

### How the app is reached

| Mode | Use it for |
| --- | --- |
| `domain` | Your own domain. A bundled Caddy gets TLS certificates automatically. The setup checks that the domain points at the server and that ports 80/443 are free. |
| `proxy` | A reverse proxy that already runs on the server (nginx, Traefik, Caddy, …). The app listens on `127.0.0.1:<port>` or joins the proxy's Docker network; the CLI prints example configurations. |
| `lan` | The local network over plain HTTP, e.g. on a Raspberry Pi (port 8080 by default). The CLI shows a QR code for phones. |

### Commands

| Command | Effect |
| --- | --- |
| `./werewolf setup` | Set up a new instance |
| `./werewolf config` | Change name, tagline, colour, logo, mode, language, time zone or imprint; restarts what is affected |
| `./werewolf password` | Set a new group password; ends all sessions |
| `./werewolf status` | Version, container health, URL and latest backup |
| `./werewolf logs [-f] [service…]` | Logs of web and api (or `db`, `backup`, `caddy`, `all`) |
| `./werewolf start` / `stop` / `restart` | Start, stop, or recreate the containers (`restart` applies edits to `instance/.env`) |
| `./werewolf link` | Put `werewolf` on your PATH (a link in `~/.local/bin`) |

Every command also runs without questions when you pass flags and `--yes`, e.g. for scripts:

```bash
./werewolf setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes
./werewolf setup --mode domain --domain werewolf.example.org --lang en --yes
./werewolf config --accent blood --yes
```

`./werewolf <command> --help` lists all options.

### Instance data

Everything that belongs to one installation lives in `instance/` (ignored by git): `.env` with
configuration and secrets, `branding/` with the logo, `backups/`, and Caddy's certificates.
`instance/.env` is linked to `./.env`, so plain `docker compose` works too. Postgres data stays
in a Docker volume.

Migrations run when the API starts. The `backup` service writes a daily `pg_dump` to
`instance/backups/` and keeps `BACKUP_RETENTION_DAYS` (default 14) days.

### Manual setup

Without the CLI, create the instance yourself:

```bash
mkdir -p instance/backups instance/branding && cp .env.example instance/.env && ln -s instance/.env .env
# edit instance/.env (see below), then:
docker compose up -d
```

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
| `GROUP_NAME` | Optional group name shown instead of "Werewolves" (nav, login, home page, tab title, app icon name); the same in every language |
| `GROUP_TAGLINE` | Optional subtitle on the home page |
| `ACCENT_COLOR` | Accent colour: `violet` (default), `blood`, `moon`, `forest`, `amber` or `silver` |
| `BACKUP_RETENTION_DAYS` | Days to keep nightly backups, default `14` |
| `IMAGE_PREFIX` / `IMAGE_TAG` | Which container images to run |

For an own logo, put `logo.svg` or `logo.png` (square works best) into `instance/branding/`.
It replaces the pixel wolf and becomes the favicon and app icon; without one the app keeps
its default look.

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
