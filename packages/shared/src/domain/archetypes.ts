/**
 * Archetypes = reusable mechanic building blocks. Roles are composed from them.
 * The capability engine (phase 2) implements one primitive per archetype
 * (command handler + reducer effect).
 *
 * Not every archetype is simulated in the live engine yet — many roles of the
 * "Unified Ruleset" are executed by the moderator in human-in-the-loop mode
 * (the engine knows them as catalog data: faction, wake order,
 * short hint). The archetype describes the mechanic regardless of whether it is
 * already automated.
 */
export const ARCHETYPES = [
  // ── Inspect / inform ─────────────────────────────────────────────────────
  'inspect', // inspects a player's identity/camp (Seer)
  'inspect-group', // checks a group for werewolves (Fox)
  'inspect-relation', // asks once whether two players are on the same team (Detective)
  'inspect-adjacency-evil', // checks target + neighbors for evil once (Paranormal Investigator)
  'inspect-neighbors-alignment', // learns the alignment of both neighbors (Nosy Neighbor)
  'inspect-neighbor-active', // learns whether a neighbor was active at night (Insomniac)
  'inspect-nightactive', // asks whether a player is night-active (Streetwalker, Werecrow)
  'inspect-seer', // learns / looks for the seer (Eye; Sorceress)
  'count-evil', // asks once how many evil players are still alive (Count)
  'count-nightactive', // asks once how many night-active village roles are alive (Mystic Wolf)
  'foretell-on-attack', // on the first attack sees one wolf + one pro-village role (Jeremiah)
  'medium-ask', // asks the dead a yes/no question (Medium)

  // ── Protect / block / support ────────────────────────────────────────────
  'protect', // protects a person at night (Healer) — not the same one twice
  'guard-redirect', // stands by the person, takes the attack itself (Bodyguard)
  'protect-neighbors', // protects both direct seat neighbors (Keeper)
  'protect-village-mass', // protects all plain villagers from wolves (Night Watchman)
  'protect-any-faction', // protects regardless of the side (Patron Saint)
  'protect-self', // can make itself invulnerable (Stone Golem, Ancient Vampire)
  'lynch-immune-self', // survives the first lynch attempt (Prince, King)
  'lynch-immune-grant', // makes another person lynch-immune (Druid; King → Queen)
  'rune-mark', // marks three doors once — wolves eat only one of them (Rune Reader)
  'jail', // locks a person up — no action on/through them (Jailer)
  'block-action', // prevents a person from their night action (Dog, Hypnotist)
  'block-village-actions', // disables all pro-village night actions for one night (Barkeeper)
  'potion-heal', // one-time healing potion (Witch, Magician, Herb Witch)
  'potion-poison', // one-time poison potion (Witch, Magician, Herb Witch)
  'heal-victim', // saves an already fallen night victim once (Quack)
  'delay-death', // postpones a death by one night once (Little Owl)
  'martyr', // sacrifices itself once in place of a dead/lynched person (Martyr)
  'reduce-wolf-appetite', // gets eaten → wolves cannot eat the following night (Leper)

  // ── Kill / weapons / gifts ───────────────────────────────────────────────
  'kill-pack', // shared werewolf victim
  'kill-extra', // additional victim (Big Bad Wolf, Werebear)
  'kill-solo-nightly', // kills every night as a loner (Serial Killer, Vampire)
  'kill-once', // may kill someone once per game (Assassin)
  'kill-unstoppable', // makes a feeding unstoppable once (Sharptooth)
  'weapon-gift', // passes on a weapon/a brew (Blacksmith; Alchemist; Mad Professor)
  'death-trigger-shoot', // takes someone along when dying (Hunter)
  'death-trigger-shoot-two', // shoots up to two people after death (Gunslinger)
  'death-trigger-explode-neighbors', // explodes on death and takes neighbors along (Exploding/Imploding Kitten, Bomber)
  'death-trigger-infect', // infects a wolf when killed by wolves (Knight)
  'death-trigger-kill-eater', // the eating wolf perishes too (Rapunzel)
  'death-trigger-convert-village', // infects a villager when lynched (Bogeyman)
  'death-trigger-lynch-partner', // the first nominator dies the following night (Plague Wolf)
  'death-redirect-on-attack', // when attacked, a self-chosen person dies in its place (Fair Maiden)
  'death-trigger-pack-rage', // when it dies, the wolves may eat two the following night (Wolf Cub)
  'death-trigger-blind-vote', // when he dies, the village votes simultaneously on command the next day (Brewer)

  // ── Convert / infect / appearance ────────────────────────────────────────
  'convert', // turns a player into a werewolf (Accursed Wolf Father)
  'convert-limited', // infects until the pack is complete (Lead Wolf, Alpha Female)
  'become-wolf-on-eat', // becomes a wolf itself when eaten (Cursed)
  'become-minion-on-eat', // becomes a minion when eaten (Stray)
  'become-vampire-on-bite', // becomes the second vampire when bitten by the vampire (Anemic)
  'appear-as-wolf', // is shown as a wolf to seeing roles but plays village (Lycanthrope)
  'appear-as-village', // wolf/traitor shown as village (Wolf in Sheep's Clothing, Minion)
  'mark-appear-wolf', // marks a person who appears as a wolf to seeing roles (Warlock)
  'cloak-wolf', // hides a wolf from seeing roles (Wolf Shaman)

  // ── Wolf specialties ─────────────────────────────────────────────────────
  'wolf-ally-knows', // traitor knows the wolves, helps them (Minion, Chosen One, Warlock, Hypnotist, Strawberry Girl)
  'wolf-ally-no-vote', // may not vote/wake up with the wolves (Minion)
  'ally-becomes-wolf', // becomes a wolf when the last wolf dies (Chosen One)
  'die-with-pack', // dies automatically when the last wolf dies (Ghost Werewolf)
  'unkillable-by-wolves', // cannot be eaten by the wolves (Ghost Werewolf, Dream Wolf)
  'wake-when-wolf-dies', // only wakes once a wolf has fallen (Dream Wolf)
  'fake-bloodpool', // places a fake pool of blood in front of a door once (Strawberry Girl)
  'growl-adjacency', // "growls" when a werewolf sits next to it (Bear Tamer)

  // ── Day / vote ───────────────────────────────────────────────────────────
  'day-vote-double', // double vote during the day (Mayor)
  'day-vote-extra', // marks someone for extra votes (Raven)
  'day-second-vote', // forces a second vote (Judge)
  'day-tie-survive', // survives the first lynch / only loses the right to vote (Village Idiot)
  'day-tie-decider', // dies on a tie & determines the next voter (Scapegoat)
  'day-vote-force-lynch', // votes for death in every vote (Idiot)
  'day-vote-always-spare', // votes for survival in every vote (Pacifist)
  'day-double-lynch', // causes a day with two lynch victims once (Troublemaker)
  'day-silence', // a target may not vote the next day (Headmistress)
  'vote-bind', // bound persons must vote the same way as she (Mummy)
  'village-power-anchor', // if she dies unjustly, the village roles lose their powers (Elder)
  'double-life', // survives the first werewolf attack (Elder, Tough Guy, Jeremiah)

  // ── Identity / role model / team switch ──────────────────────────────────
  'team-swap', // switches faction under a condition (Wild Child)
  'choose-side', // chooses a side at the start of the game (Wolf-Hound)
  'setup-swap-card', // swaps its own card at the start (Thief)
  'role-thief', // can take over another ability/role (Juggler)
  'copy-role-setup', // copies a person's role on the first night (Doppelganger)
  'inherit-role-on-mentor-death', // takes over the mentor's role on her death (Apprentice Seer)
  'inherit-role-on-lynch', // takes over the role of a lynched person once (Devoted Maid)
  'become-role-of-first-dead', // assumes the identity of the first dead (Toady)
  'become-role-on-patron-death', // becomes its patron's role when the patron dies (Stone → Stone Golem)

  // ── Ally / recognize / communication ─────────────────────────────────────
  'recognize-allies', // recognizes allies on the first night (Sisters, Freemasons)
  'friend-bond', // binds a friend to itself (Companion)
  'peek-wolves', // may secretly watch the wolves (Little Girl)
  'phantom-reveal', // shows itself to a different player every night (Phantom)
  'visit-elsewhere', // sleeps elsewhere → not at home at night (Harlot, Vagabond, Wanton Cupid)
  'redirect-if-visited', // an action on the host hits the visitor instead (Vagabond)
  'ghost-write', // as the first dead, writes a letter at night (Ghost)
  'speak-restrict', // restricts a person's communication (Enchantress, Goethe)
  'gift-nightly', // gifts/visits a lucky person every night (Saint Nicholas)
  'lover-link', // determines the lovers (Cupid)
  'love-on-visited', // falls in love with the first role that acts on her (Admirer)

  // ── Loners / third parties (own win condition) ───────────────────────────
  'solo-charm', // charms players, wins alone when all are charmed (Pied Piper)
  'solo-mark-all', // marks one person every night, wins alone once all are marked (Gull)
  'solo-survivor', // wins as the last survivor (White Werewolf, Serial Killer, Demon)
  'solo-die-early', // wins through early elimination (Angel)
  'solo-absorb-all', // absorbs one every night, wins when all are part of it (Blob)
  'solo-brides', // survives a cycle with three brides (Groom)
  'solo-bleed-all', // wins once everyone has been drained (Leech)
  'solo-be-bitten', // wins once the vampire bites her (Bella)
  'solo-be-eaten', // wins once the wolves eat her (Frida)
  'solo-be-lynched', // wins when the village lynches her (Jason)
  'solo-guess-roles', // wins when she guesses all roles correctly (Hermione)
  'solo-wager-deaths', // wins once the wagered persons are all dead (Rascal)
  'solo-grow-life', // grows an additional life over several nights (Stone Golem)
  'vampire-team', // wins as a (growing) vampire team / alone (Vampire, Ancient Vampire)
  'win-when-wolves-dead', // wins once all werewolves are dead (Werehamster)

  'passive', // no active night ability
] as const

export type Archetype = (typeof ARCHETYPES)[number]

export function isArchetype(value: string): value is Archetype {
  return (ARCHETYPES as readonly string[]).includes(value)
}
