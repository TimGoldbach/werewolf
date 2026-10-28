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
login, health and the public rules page. The password is configured as a bcrypt hash
(`GATE_PASSWORD_HASH`) or, for development, in plain text. Players are plain records;
whoever uses the app is implicitly the moderator.

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
- `AppState(testMode)`: in test mode, generated players and games are marked and
  removed again when it is switched off.

## Deployment

Docker Compose runs web, api, Postgres and a backup container (daily `pg_dump`, kept
14 days). A reverse proxy in front terminates TLS. The API applies migrations when it
starts; CI checks them against an empty database. The optional deploy workflow builds
images to GHCR and rolls them out over SSH (see the README).

## Testing

Vitest covers `packages/shared`: catalog integrity, engine rules and edge cases,
the moderator script, statistics and scoring. Rule correctness carries the most risk,
so most tests sit there. The API has service-level tests for the live-game flow.
