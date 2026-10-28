-- Renames the legacy German domain ids to English ids: roles, factions, death causes,
-- win conditions and the role catalog version. The pairs mirror
-- packages/shared/src/domain/legacy-ids.ts. Each column and event field is mapped with its
-- own table, so ids that share a spelling across namespaces cannot be mixed up. On an
-- empty database this is a no-op.

CREATE TEMP TABLE "_role_map" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_role_map" ("old", "new") VALUES
  ('einfacher-werwolf', 'werewolf'),
  ('urwolf', 'accursed-wolf-father'),
  ('grosser-boeser-wolf', 'big-bad-wolf'),
  ('alphaweibchen', 'alpha-female'),
  ('leitwolf', 'lead-wolf'),
  ('werbaer', 'werebear'),
  ('scharfzahn', 'sharptooth'),
  ('wolfsschamane', 'wolf-shaman'),
  ('hund', 'dog'),
  ('hypnotiseur', 'hypnotist'),
  ('mystischer-wolf', 'mystic-wolf'),
  ('werkraehe', 'werecrow'),
  ('wolfsjunges', 'wolf-cub'),
  ('pestwolf', 'plague-wolf'),
  ('geisterwerwolf', 'ghost-werewolf'),
  ('traumwolf', 'dream-wolf'),
  ('streuner', 'stray'),
  ('wolf-im-schafspelz', 'wolf-in-sheeps-clothing'),
  ('zaubermeisterin', 'sorceress'),
  ('guenstling', 'minion'),
  ('auserwaehlte', 'chosen-one'),
  ('erdbeermaedchen', 'strawberry-girl'),
  ('weisser-werwolf', 'white-werewolf'),
  ('einfacher-dorfbewohner', 'villager'),
  ('seherin', 'seer'),
  ('seherin-schlechte-gabe', 'flawed-seer'),
  ('seherlehrling', 'apprentice-seer'),
  ('auge', 'eye'),
  ('amor', 'cupid'),
  ('amorschlampe', 'wanton-cupid'),
  ('zwei-schwestern', 'two-sisters'),
  ('freimaurer', 'freemasons'),
  ('gesellschafterin', 'companion'),
  ('hexe', 'witch'),
  ('hexenzirkel', 'coven'),
  ('kraeuterhexe', 'herb-witch'),
  ('magier', 'magician'),
  ('wanderhure', 'harlot'),
  ('vagabund', 'vagabond'),
  ('heiler', 'healer'),
  ('leibwaechter', 'bodyguard'),
  ('hueter', 'keeper'),
  ('schutzengel', 'guardian-angel'),
  ('schutzpatron', 'patron-saint'),
  ('nachtwaechter', 'night-watchman'),
  ('druide', 'druid'),
  ('kerkermeister', 'jailer'),
  ('schuldirektorin', 'headmistress'),
  ('mumie', 'mummy'),
  ('nikolaus', 'saint-nicholas'),
  ('runenkundiger', 'rune-reader'),
  ('verrueckter-professor', 'mad-professor'),
  ('schmied', 'blacksmith'),
  ('meuchelmoerder', 'assassin'),
  ('jaeger', 'hunter'),
  ('revolverheld', 'gunslinger'),
  ('attentaeter', 'bomber'),
  ('der-alte', 'elder'),
  ('harter-bursche', 'tough-guy'),
  ('jeremias', 'jeremiah'),
  ('lykantroph', 'lycanthrope'),
  ('rotkaeppchen', 'little-red-riding-hood'),
  ('ritter-rostigen-klinge', 'rusty-sword-knight'),
  ('aussaetzige', 'leper'),
  ('holde-maid', 'fair-maiden'),
  ('baerenfuehrer', 'bear-tamer'),
  ('fuchs', 'fox'),
  ('detektiv', 'detective'),
  ('graf-zahl', 'count'),
  ('paranormaler-ermittler', 'paranormal-investigator'),
  ('neugieriger-nachbar', 'nosy-neighbor'),
  ('schlaflose', 'insomniac'),
  ('bordsteinschwalbe', 'streetwalker'),
  ('kaeuzchen', 'little-owl'),
  ('quacksalber', 'quack'),
  ('maertyrerin', 'martyr'),
  ('beschwoererin', 'enchantress'),
  ('kleines-maedchen', 'little-girl'),
  ('hauptmann', 'mayor'),
  ('koenig', 'king'),
  ('prinz', 'prince'),
  ('pazifistin', 'pacifist'),
  ('dorfdepp', 'village-idiot'),
  ('unruhestifterin', 'troublemaker'),
  ('schankwart', 'barkeeper'),
  ('bierbrauer', 'brewer'),
  ('schreckgespenst', 'bogeyman'),
  ('schwaermerin', 'admirer'),
  ('trunkenbold', 'drunk'),
  ('wildes-kind', 'wild-child'),
  ('wolfshund', 'wolf-hound'),
  ('verfluchter', 'cursed'),
  ('dieb', 'thief'),
  ('doppelgaenger', 'doppelganger'),
  ('ergebene-magd', 'devoted-maid'),
  ('schleimer', 'toady'),
  ('geist', 'ghost'),
  ('floetenspieler', 'pied-piper'),
  ('engel', 'angel'),
  ('serienkiller', 'serial-killer'),
  ('vampir', 'vampire'),
  ('anaemische', 'anemic'),
  ('fledermaus', 'bat'),
  ('uralter-vampir', 'ancient-vampire'),
  ('hermine', 'hermione'),
  ('strolch', 'rascal'),
  ('braeutigam', 'groom'),
  ('blutegel', 'leech'),
  ('moewe', 'gull'),
  ('daemon', 'demon'),
  ('steingolem', 'stone-golem'),
  ('der-stein', 'stone'),
  ('werhamster', 'werehamster');

CREATE TEMP TABLE "_faction_map" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_faction_map" ("old", "new") VALUES
  ('dorf', 'village'),
  ('werwoelfe', 'werewolves'),
  ('variabel', 'variable');

CREATE TEMP TABLE "_death_cause_map" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_death_cause_map" ("old", "new") VALUES
  ('werwolf', 'werewolf'),
  ('hexe-gift', 'witch-poison'),
  ('jaeger', 'hunter'),
  ('liebeskummer', 'heartbreak'),
  ('ritter', 'rusty-sword'),
  ('sonstiges', 'other');

CREATE TEMP TABLE "_win_condition_map" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_win_condition_map" ("old", "new") VALUES
  ('engel', 'angel'),
  ('floetenspieler', 'pied-piper'),
  ('moewe', 'gull'),
  ('weisser-werwolf', 'white-werewolf'),
  ('liebespaar', 'lovers'),
  ('hermine', 'hermione'),
  ('braeutigam', 'groom'),
  ('strolch', 'rascal'),
  ('serienkiller', 'serial-killer'),
  ('daemon', 'demon'),
  ('vampir', 'vampire'),
  ('blutegel', 'leech'),
  ('steingolem', 'stone-golem'),
  ('werhamster', 'werehamster'),
  ('werwoelfe', 'werewolves'),
  ('dorf', 'village'),
  ('niemand', 'none');

CREATE TEMP TABLE "_catalog_version_map" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_catalog_version_map" ("old", "new") VALUES
  ('einheitliches-regelwerk-v1', 'unified-v1');

-- Columns
UPDATE "GamePlayer" t SET "roleId" = m."new" FROM "_role_map" m WHERE t."roleId" = m."old";
UPDATE "GamePlayer" t SET "finalFaction" = m."new" FROM "_faction_map" m WHERE t."finalFaction" = m."old";
UPDATE "GamePlayer" t SET "deathCause" = m."new" FROM "_death_cause_map" m WHERE t."deathCause" = m."old";
UPDATE "GamePlayer" t SET "roleVersion" = m."new" FROM "_catalog_version_map" m WHERE t."roleVersion" = m."old";
UPDATE "Game" t SET "winningCondition" = m."new" FROM "_win_condition_map" m WHERE t."winningCondition" = m."old";
UPDATE "Game" t SET "roleSetVersion" = m."new" FROM "_catalog_version_map" m WHERE t."roleSetVersion" = m."old";

-- Event payloads: scalar fields
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{roleId}', to_jsonb(m."new"))
  FROM "_role_map" m WHERE e."type" = 'RoleAssigned' AND e."payload"->>'roleId' = m."old";
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{side}', to_jsonb(m."new"))
  FROM "_faction_map" m WHERE e."type" = 'SideChosen' AND e."payload"->>'side' = m."old";
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{cause}', to_jsonb(m."new"))
  FROM "_death_cause_map" m WHERE e."type" IN ('Killed', 'DeathSet') AND e."payload"->>'cause' = m."old";
-- Live games store `condition`, quick entries store `winningCondition`.
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{condition}', to_jsonb(m."new"))
  FROM "_win_condition_map" m WHERE e."type" = 'GameEnded' AND e."payload"->>'condition' = m."old";
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{winningCondition}', to_jsonb(m."new"))
  FROM "_win_condition_map" m WHERE e."type" = 'GameEnded' AND e."payload"->>'winningCondition' = m."old";
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{roleSetVersion}', to_jsonb(m."new"))
  FROM "_catalog_version_map" m WHERE e."type" = 'GameCreated' AND e."payload"->>'roleSetVersion' = m."old";

-- Event payloads: SetupCompleted.roles[] (the deck) and SetupCompleted.players[].roleId.
-- The non-empty checks matter: jsonb_agg over no rows is NULL, which would wipe the payload.
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{roles}', (
    SELECT jsonb_agg(COALESCE(to_jsonb(m."new"), r.value) ORDER BY r.ord)
    FROM jsonb_array_elements(e."payload"->'roles') WITH ORDINALITY AS r(value, ord)
    LEFT JOIN "_role_map" m ON m."old" = r.value #>> '{}'
  ))
  WHERE e."type" = 'SetupCompleted'
    AND jsonb_typeof(e."payload"->'roles') = 'array'
    AND jsonb_array_length(e."payload"->'roles') > 0;
UPDATE "GameEvent" e SET "payload" = jsonb_set(e."payload", '{players}', (
    SELECT jsonb_agg(
      CASE WHEN m."new" IS NULL THEN p.value ELSE jsonb_set(p.value, '{roleId}', to_jsonb(m."new")) END
      ORDER BY p.ord)
    FROM jsonb_array_elements(e."payload"->'players') WITH ORDINALITY AS p(value, ord)
    LEFT JOIN "_role_map" m ON m."old" = p.value->>'roleId'
  ))
  WHERE e."type" = 'SetupCompleted'
    AND jsonb_typeof(e."payload"->'players') = 'array'
    AND jsonb_array_length(e."payload"->'players') > 0;

DROP TABLE "_role_map";
DROP TABLE "_faction_map";
DROP TABLE "_death_cause_map";
DROP TABLE "_win_condition_map";
DROP TABLE "_catalog_version_map";
