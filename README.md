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

## Self-hosting

You need a server or a computer that runs Docker with Compose v2, plus git and Node.js 22.18 or
newer for the CLI. Release images exist for amd64 and arm64, so a Raspberry Pi works too.

```bash
git clone https://github.com/TimGoldbach/werewolf.git && cd werewolf
git checkout "$(git tag --sort=-v:refname | head -1)"   # the newest release
./werewolf setup
```

`setup` checks the system, then asks a few questions: language, group name and tagline, accent
colour, an optional logo, how the app is reached, time zone, the group password (your own or a
generated one like `vollmond-heult-37`) and an optional imprint link. It writes the
configuration, starts everything, checks that the app answers and shows you the URL and the
password. On a release tag it pulls the images from GHCR; on `main` it builds them, which takes
a few minutes.

| Mode | Use it for |
| --- | --- |
| `domain` | Your own domain. A bundled Caddy gets TLS certificates automatically. |
| `proxy` | A reverse proxy that already runs on the server (nginx, Traefik, Caddy, …). The CLI prints example configurations. |
| `lan` | The local network over plain HTTP, e.g. on a Raspberry Pi. The CLI shows a QR code for phones. |

After the setup, the same CLI runs the instance:

| Command | Effect |
| --- | --- |
| `./werewolf config` | Change name, tagline, colour, logo, mode, language, time zone, imprint or backup retention |
| `./werewolf password` | Set a new group password; ends all sessions |
| `./werewolf status` | Version, container health, URL and latest backup |
| `./werewolf logs [-f]` | Logs of web and api |
| `./werewolf start` / `stop` / `restart` | Start, stop, or recreate the containers |
| `./werewolf update` | Update to the newest release: backs up first, rolls back if the new version does not come up |
| `./werewolf backup` / `restore` | Back up the database now, or restore it from a backup |
| `./werewolf uninstall` | Back up, then remove containers and the database volume |
| `./werewolf link` | Put `werewolf` on your PATH |

Every command also runs without questions when you pass flags and `--yes`:

```bash
./werewolf setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes
```

The database is backed up every night to `instance/backups/`; backups are kept for 14 days.
All your settings, the logo and the backups live in `instance/`, which git ignores.

- **[CLI reference](./docs/cli.md):** every command and option, how updates and restores
  work, troubleshooting
- **[Self-hosting reference](./docs/self-hosting.md):** the Compose stack, manual setup without
  the CLI, all configuration variables

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

### Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **`apps/web`:** Next.js 14 (App Router, Tailwind, mobile-first, dark theme)
- **`apps/api`:** NestJS 10 + Prisma + PostgreSQL
- **`packages/shared`:** domain (roles, factions, win conditions), Zod DTOs, the
  event-sourced game engine and pure statistics functions
- **Deployment:** Docker Compose (web, api, Postgres, nightly backup)

## Releases and CI

- **CI** ([ci.yml](.github/workflows/ci.yml)) runs on every pull request and push to
  `main`: typecheck, tests, build, all Prisma migrations against an empty Postgres
  (including a check that `schema.prisma` has no missing migration), and an end-to-end run
  of the CLI (setup, backup, restore, uninstall) with Docker.
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
