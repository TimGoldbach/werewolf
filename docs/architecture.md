# Architecture

The app serves a group that plays the werewolf party game together: one shared
leaderboard for everyone who ever played (roughly 5–40 people), behind a single group
password. It has three parts:

1. **Players and leaderboard**: roster, points, win rates and deeper statistics.
2. **Recording games**: either quickly afterwards (roles and outcome) or live while
   moderating.
3. **Moderator mode**: guides through each night, suggests resolutions and death
   cascades, and detects a winner. The moderator confirms or overrides every step.

## Services

- **`apps/web`** (Next.js App Router): UI and a thin backend-for-frontend. Server
  components call the API over `API_INTERNAL_URL`; the browser reaches the API through
  the `/api/*` rewrite, so there is a single origin.
- **`apps/api`** (NestJS + Prisma + PostgreSQL): REST endpoints, persistence and the
  password gate.
- **`packages/shared`**: everything both sides need. That is the role catalog,
  factions, win conditions, Zod schemas (they validate API input and forms), the game
  engine and the statistics as pure functions.

There is no realtime channel; a single moderator device drives a live game, and other
devices poll.

## Languages

The UI and all game content exist in English and German.

- **UI text:** next-intl, without locale prefixes in URLs. Messages live in
  `apps/web/messages/{en,de}/<area>.json`. The German messages are typed against the
  English ones, so a missing key fails the typecheck.
- **Game content** (role names and hints, labels, the moderator's narration):
  per-language TypeScript modules in `packages/shared/src/i18n/{en,de}`, used through
  `catalogTexts(locale)` and `stepTexts(locale)`.
  - Tests check that every role and step has texts in every language.
  - They also check that every variant list has the same length in all languages, so a
    game picks the same story whichever language is shown.
- **Choosing the language:** the visitor's choice is stored in the `NEXT_LOCALE` cookie;
  without one, the instance default `DEFAULT_LOCALE` applies.
- **API errors** carry a stable `code` (`API_ERROR_CODES`) that the web app translates;
  the API's own `message` is English.

## Auth

Auth is a single password gate with no player identities. A correct password sets an
HttpOnly cookie holding a signed JWT, and a Nest guard protects every endpoint except
login, health and reading the hidden roles (the public rules page needs them). The
password is configured as a bcrypt hash (`GATE_PASSWORD_HASH`) or, for development, in
plain text. Players are plain records; whoever uses the app is implicitly the moderator.

## Domain

- **Roles are code, not data.** `packages/shared/src/domain/roles.ts` defines every
  role. Each entry has:
  - a stable id
  - a category and a faction
  - its wake behaviour and wake order
  - a short moderator hint
  - a list of **archetypes**: reusable mechanics such as `inspect`, `protect`,
    `kill-pack`, `potion-heal` or `death-trigger-shoot`
- **Human in the loop.** The engine automates a core subset: the werewolf victim,
  protection and healing, the elder, the knight, the hunter, lovers, charm, the angel
  and the wild child. The moderator runs every other role from the script; the catalog
  still provides wake order, faction and statistics for all of them.
- **Versioned catalog.** Games store the role id and the catalog version
  (`ROLE_CATALOG_VERSION`), so later changes do not reinterpret history. Lovers are
  not a card (Cupid creates them) but are modelled as a win condition.
- **Groups hide roles, they don't edit them.** New roles arrive by pull request (see
  [CONTRIBUTING.md](../CONTRIBUTING.md)). On the Roles page a group only hides the
  built-in roles it doesn't play (`HiddenRole`), or picks the "classics only"
  preset (`CLASSIC_ROLE_IDS`). Hidden roles drop out of game setup, set suggestions and
  the rules page; past games, statistics and running games keep them.
- **Ids are stable English slugs** (`seer`, `village`, `witch-poison`). Databases from
  before the rename are migrated by `20261028120000_english_ids`; the mapping lives in
  `packages/shared/src/domain/legacy-ids.ts`.

## Event sourcing

A live game is an append-only event log (`GameEvent`: `gameId`, `seq`, `type`,
`payload`).

- **State** (`packages/shared/src/engine`) is derived by replaying events.
- **Undo** removes the last event.
- **The day phase** records only the lynch result and special cases; there is no
  in-app voting.

When a game ends, the API writes a projection per player (`GamePlayer`: role, final
faction, winner flag, survival, death round and cause), and the statistics read from
that. Quick entries write the same projection directly, plus a minimal event stream.
Deep statistics (survival, causes of death) therefore come from live games and degrade
gracefully for quick entries.

## Statistics and scoring

`packages/shared/src/stats`:

- **Leaderboard**: sorted by **average points per game**.
  - A win is worth more the fewer people share it (village < werewolves < lovers <
    solo); a loss is worth 0.
  - Ties are broken by win rate.
  - A minimum number of games keeps a single lucky win from topping the table.
  - The rules are constants (`scoring.ts`), and the leaderboard page renders its
    explanation from them.
- **Player, role and global statistics**: win rate overall and by faction,
  per-role results, survival rate, average death round, causes of death, faction
  balance and game length.
- **Set suggestions** (`sets.ts`): for the chosen player count, the setup screen
  suggests role sets that were played before.
  - They are ranked by games × a feedback factor. After a game, the group rates the set
    from 1 to 5 stars (`Game.setRating`).
  - Three stars counts once; every star more doubles the weight, every star less halves
    it.
  - Unrated games count as neutral.

## Data model

- `Player(id, displayName, active, generated)`: archiving keeps history and stats.
- `Game(id, status, mode, playedAt, roleSetVersion, winningCondition, moderatorId,
  revealRolesOnDeath, showNarration, soundEnabled, setRating, generated)`
- `GameEvent(gameId, seq, type, payload jsonb)`
- `GamePlayer(gameId, playerId, roleId, roleVersion, finalFaction, isWinner, survived,
  diedRound, deathCause)`
- `HiddenRole(roleId, hiddenAt)`: built-in roles the group has hidden; no row means
  visible.
- `AppState(testMode)`: in test mode, generated players and games are marked and
  removed again when it is switched off.

## Deployment

An installation is a git checkout plus an `instance/` directory (ignored by git) that
holds `.env`, backups and Caddy's certificates; `.env` is linked to the repository root
so plain `docker compose` works.
How to run one: [cli.md](./cli.md) and [self-hosting.md](./self-hosting.md).

- **Core stack** (`docker-compose.yml`): web, api, Postgres and a backup container
  (daily `pg_dump`, `BACKUP_RETENTION_DAYS`). The API applies migrations when it
  starts; CI checks them against an empty database.
- **Exposure overlays** (`compose/`), picked via `COMPOSE_FILE`:
  - a bundled Caddy with automatic TLS for an own domain
  - a host port (LAN, or a proxy on the same host)
  - the Docker network of an existing proxy

  Only the web app is exposed. `SECURE_COOKIES` is off only for plain-HTTP setups.
- **Branding:** `GROUP_NAME`, `GROUP_TAGLINE` and `ACCENT_COLOR` are runtime variables of
  the web container, read per request (`apps/web/src/lib/branding.ts`), so one image
  serves every instance. The name is the same in every language and falls back to the
  translated app name. Each accent preset is a `[data-accent]` block in `globals.css`
  that overrides the primary, accent and ring colours. `instance/branding/` is mounted
  read-only at `/app/branding`; a `logo.svg` or `logo.png` there is served by the
  `/branding/logo` route and replaces the pixel wolf, the favicon and the manifest icon.
- **Login throttling:** wrong passwords are counted per client IP. The API trusts
  `X-Forwarded-For` from private networks, which Caddy sets; in LAN mode all devices
  share one counter.
- **Images:** release-please tags releases from the Conventional Commits on `main`, and
  the release workflow builds amd64 and arm64 images on native runners and publishes
  them to GHCR. The checked-out release tag selects the image version.

## Testing

Vitest covers `packages/shared`: catalog integrity, engine rules and edge cases,
the moderator script, statistics and scoring. Rule correctness carries the most risk,
so most tests sit there. The API has service-level tests for the live-game flow.
