# Contributing

Thanks for helping out! Bug reports, role ideas and pull requests are all welcome.

- **Found a bug?** Open a [bug report][bug-report].
- **Have an idea for a role but don't want to code it?** Open a
  [role proposal][role-proposal]. Someone can turn it into a pull request.
- **Found a security issue?** Report it privately, as described in the
  [security policy](./SECURITY.md).
- **Want to change code?** Read on.

[bug-report]: https://github.com/TimGoldbach/werewolf/issues/new?template=bug-report.yml
[role-proposal]: https://github.com/TimGoldbach/werewolf/issues/new?template=role-proposal.yml

## Development setup

The [README](./README.md#local-development) explains how to run the app locally
(Postgres in Docker, `pnpm install`, `pnpm dev`). Before you open a pull request, run
what CI runs:

```bash
pnpm typecheck
pnpm test
pnpm build
```

CI also applies every Prisma migration to an empty database and fails if
`schema.prisma` differs from the migrations. When you change the schema, create a new
migration with `pnpm --filter @werewolf/api prisma:migrate`. Never edit a migration that
is already on `main`.

Everything in the repository is written in English: code, comments, commit messages,
pull requests and docs. Everything a player sees exists in English and German:

- UI text: `apps/web/messages/{en,de}/<area>.json`. The German files are typed against
  the English ones, so a missing key fails the typecheck.
- Game content (role names, hints, narration): `packages/shared/src/i18n/{en,de}`.

## Commits and pull requests

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and
for the pull request title:

```text
feat: add the lighthouse keeper role
fix(live): keep the mayor after an undo
docs: explain the backup retention
```

[release-please](https://github.com/googleapis/release-please) builds the changelog and
the next version number from these messages: `fix` bumps the patch version, `feat` the
minor version, and a `!` after the type (or a `BREAKING CHANGE:` footer) the major
version. `docs`, `refactor`, `test` and `chore` don't trigger a release on their own.

Keep a pull request to one topic, and fill in the checklist in the template.

## Adding a role

Roles are code. The catalog in `packages/shared/src/domain/roles.ts` is the single
source for every role, and new roles arrive by pull request. The app has no role editor.
A group can only hide built-in roles it doesn't play, on the **Roles** page.

> **Write every text yourself.** Do not copy descriptions, narration, artwork or other
> content from commercial rulebooks or games. Game mechanics are fine to use; someone
> else's wording is not.

### 1. Catalog entry

Add an entry to `ROLE_CATALOG` in `packages/shared/src/domain/roles.ts`, next to the
roles of the same category:

```ts
{
  id: 'lighthouse-keeper',
  category: 'villagers',
  faction: 'village',
  wakesAtNight: true,
  firstNightOnly: false,
  wakeEveryNight: true,
  wakeOrder: 84,
  archetypes: ['inspect'],
},
```

- **`id`**: a kebab-case English slug. It is stored with every game and with the
  group's hidden roles, so it must never change once the role is released.
- **`category`**: where the role is listed: `werewolves`, `villagers`, `ambiguous` or
  `loners`.
- **`faction`**: the side the role starts on: `village`, `werewolves`, `solo` or
  `variable` (can switch sides). A solo role with its own way of winning also needs an
  entry in `domain/win-conditions.ts` and a `winConditions` text in both catalogs.
- **Wake fields**: a role that acts at night has `wakesAtNight: true` and a
  `wakeOrder`. `firstNightOnly` is for setup roles that act once; `wakeEveryNight` for
  roles that act each night. A role that never wakes has `wakeOrder: null` and both
  flags `false`. The comment above `FIRST_NIGHT_ORDER` describes the wake-order bands;
  pick a number that puts the role in the right band.
- **`archetypes`**: the reusable mechanics the role is made of
  (`domain/archetypes.ts`). Reuse existing ones; add a new archetype only for a
  mechanic no other role has.

Do not add the role to `CLASSIC_ROLE_IDS`; that list is the fixed set of classic base
roles behind the "Classics only" preset.

### 2. Texts in both languages

Add the role to `roles` in both `packages/shared/src/i18n/en/catalog.ts` and
`packages/shared/src/i18n/de/catalog.ts`:

```ts
'lighthouse-keeper': {
  name: 'Lighthouse Keeper',
  aliases: ['Keeper of the Light'],
  description: 'Each night, points the lamp at a player and learns whether they moved.',
},
```

- `name` must be unique within a language.
- `aliases` (optional) are other names the role search should find.
- `description` is the short hint the moderator reads during the game, and the text on
  the rules page. Keep it to one or two sentences.

If you can't write one of the languages well, add your best attempt and say so in the
pull request.

### 3. Icon

Map the role to an icon in `ROLE_ICON` in `apps/web/src/components/pixel/icons.tsx`.
Reuse a fitting icon from `ICONS`, or draw a new pixel grid in the same file. Without a
mapping the role falls back to a generic person.

### 4. Narration (optional)

A role that wakes at night already works in the live console without extra code: it
gets a generic wake-up narration and its catalog description as the instruction for
the moderator.

A hand-written step needs:

- an entry in `ROLE_STEPS` in `packages/shared/src/engine/script.ts` that picks the
  input control
- `roleLore` texts (title, read-aloud variants, instruction) in
  `packages/shared/src/i18n/en/role-lore-1.ts` or `role-lore-2.ts`, and in
  `packages/shared/src/i18n/de/script.ts`, with the same number of variants in both
  languages

A role that never wakes but whose holder the moderator must know (death triggers, extra
lives) can be called on the first night: add it to `FIRST_NIGHT_RECORD_ORDER` in
`roles.ts` and add a `firstNightRecord` text in both `script.ts` files.

The engine automates only a core set of mechanics; the moderator runs everything else
from the hint. If your role needs new engine behaviour (a new kind of kill, protection
or win check), open an issue first so we can discuss the approach.

### 5. Run the tests

`pnpm test` checks the catalog and texts, among other things:

- ids are unique kebab-case slugs, and factions, categories and archetypes exist
- every role that wakes at night has a wake order and appears in the night order (and
  roles that don't wake have none)
- every role has a name and a description in every language, and names are unique
- scripted roles have narration in every language, with the same number of variants
- the English texts contain no leftover German characters

## License

By contributing, you agree that your contribution is released under the project's
[MIT license](./LICENSE).
