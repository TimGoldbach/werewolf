import type { CatalogTexts } from '../types.js'

export const catalog: CatalogTexts = {
  roles: {
    werewolf: {
      name: 'Werewolf',
      aliases: ['Wolf'],
      description: 'The pack wakes and agrees on a victim. Never devour a werewolf.',
    },
    'accursed-wolf-father': {
      name: 'Accursed Wolf-Father',
      aliases: ['Wolf Father'],
      description:
        'Once per game, the accursed wolf-father may infect the victim instead of killing them — the victim turns into a werewolf (keeps their special ability and becomes a full member of the pack).',
    },
    'big-bad-wolf': {
      name: 'Big Bad Wolf',
      description:
        'After the pack has fed, mauls a second victim alone — as long as no member of the pack has died yet.',
    },
    'alpha-female': {
      name: 'Alpha Female',
      aliases: ['Matriarch'],
      description:
        'Leader of the pack. Survives the first night attack on her, may devour one extra victim once and infect someone once — but not both in the same night.',
    },
    'lead-wolf': {
      name: 'Lead Wolf',
      aliases: ['Forefather'],
      description:
        'May infect one player each night until the pack is complete (size set beforehand). Infected players lose their special abilities.',
    },
    werebear: {
      name: 'Werebear',
      description:
        'Once, in addition to the pack, may devour their direct neighbor (dead neighbors are skipped). Can devour any role of any faction.',
    },
    sharptooth: {
      name: 'Sharptooth',
      description:
        'Once per game, can make a kill unstoppable — nothing can save the victim anymore.',
    },
    'wolf-shaman': {
      name: 'Wolf Shaman',
      description:
        'Each night, veils one wolf in mist (may pick themselves, but never the same wolf twice). The veiled wolf stays hidden from seer-type roles — the bear still smells them, though.',
    },
    dog: {
      name: 'Dog',
      description:
        'On waking, picks a player who has no ability this night (they are still called for show). Otherwise a normal pack member.',
    },
    hypnotist: {
      name: 'Hypnotist',
      description:
        'Knows the wolves (but not the other way around). At the start of the night, names a player who sleeps through the night hypnotized and may not perform a night action (never the same player twice).',
    },
    'mystic-wolf': {
      name: 'Mystic Wolf',
      description:
        'Once per game, may ask how many night-active village roles are still in play. Otherwise a normal pack member.',
    },
    werecrow: {
      name: 'Werecrow',
      description:
        'Each night, may ask whether a player is active at night. Otherwise a normal pack member.',
    },
    'wolf-cub': {
      name: 'Wolf Cub',
      aliases: ['Junior'],
      description:
        'If the wolf cub is killed (by any means), the wolves may devour two players the following night out of rage. The pack may not devour the cub itself.',
    },
    'plague-wolf': {
      name: 'Plague Wolf',
      description:
        'If the plague wolf dies by lynching, the player who nominated them first dies the following night — on top of the regular kill.',
    },
    'ghost-werewolf': {
      name: 'Ghost Werewolf',
      description:
        'Wakes with the pack as usual and cannot be killed by anything. When the last wolf dies, they die automatically as well.',
    },
    'dream-wolf': {
      name: 'Dream Wolf',
      description:
        'Only wakes with the pack once another wolf is dead. Until then, nobody knows them and they do not know the wolves. Cannot be devoured by the wolves.',
    },
    stray: {
      name: 'Stray',
      description:
        'If the stray is devoured by the wolves, they become the minion — the wolves are revealed to them. The wolves know nothing of their existence.',
    },
    'wolf-in-sheeps-clothing': {
      name: "Wolf in Sheep's Clothing",
      description:
        'A normal wolf who appears “good” to the seer and the paranormal investigator, and as a villager to the flawed seer. Only the bear sees through them.',
    },
    sorceress: {
      name: 'Sorceress',
      description:
        'Plays for the wolves (who do not know her) and appears to the seer as a villager. Each night, points at a player and learns whether they are the seer.',
    },
    minion: {
      name: 'Minion',
      description:
        'Traitor to the village: learns who the wolves are on the first night (and they learn who the minion is), but afterwards does NOT wake with the pack and may not vote with them either. Appears as a villager to seer-type roles (except the flawed seer). Cannot win alone.',
    },
    'chosen-one': {
      name: 'Chosen One',
      description:
        'Ally of the wolves: knows them, and they know the chosen one. When the last wolf dies, the chosen one becomes a wolf. (Variant: the wolves are not told whether it is the chosen one or the minion.)',
    },
    warlock: {
      name: 'Warlock',
      description:
        'Like the minion, but may also pick one player who appears as a wolf to seer-type roles (like a lycanthrope).',
    },
    'strawberry-girl': {
      name: 'Strawberry Girl',
      description:
        "The wolves' biggest fan: knows them, but they do not know her. Once, may smear berries in front of a door so that a fake pool of blood is found there in the morning.",
    },
    'white-werewolf': {
      name: 'White Werewolf',
      aliases: ['White Wolf'],
      description:
        'Hunts with the pack; every other night, may also kill a werewolf alone. Only wins as the last survivor.',
    },
    villager: {
      name: 'Villager',
      aliases: ['Townsperson'],
      description:
        'No special ability. Hunts down the werewolves by day and sleeps soundly at night.',
    },
    seer: {
      name: 'Seer',
      aliases: ['Fortune Teller'],
      description:
        "Each night, checks a player's alignment (thumbs up = pro-village/incognito, thumbs down = against).",
    },
    'flawed-seer': {
      name: 'Flawed Seer',
      description:
        "Sees the exact role, but the information is revealed to the WHOLE village. The wolf in sheep's clothing and the minion appear as villagers, the lycanthrope as a plain werewolf.",
    },
    'apprentice-seer': {
      name: 'Apprentice Seer',
      description:
        'Takes over the role of the seer as soon as the seer dies (learns it from the moderator). Until then, does not know who the seer is.',
    },
    eye: {
      name: 'Eye',
      description:
        'Has a mental bond with the seer and learns on the first night who the seer is (but not the other way around).',
    },
    cupid: {
      name: 'Cupid',
      description:
        'On the first night, chooses two lovers (may choose himself). If one dies, the other dies of grief too. Mixed couples form a third party.',
    },
    'wanton-cupid': {
      name: 'Wanton Cupid',
      description:
        "A Cupid variant who spends every night with another player (never the same one twice in a row) and is therefore not at home. If she spends the night with the wolves' victim, both die.",
    },
    'two-sisters': {
      name: 'Two Sisters',
      aliases: ['Sisters'],
      description:
        'Recognize each other on the first night and know the other is righteous. They do not die together.',
    },
    freemasons: {
      name: 'Freemasons',
      description:
        'A secret society whose members reveal themselves to each other on the first night. No one but the moderator may use the word “Freemason” or hint at it — whoever does, dies.',
    },
    companion: {
      name: 'Companion',
      description:
        'On the first night, picks a friend, reveals herself to them and forces her company on them. If the friend dies, she may pick a new one.',
    },
    witch: {
      name: 'Witch',
      description:
        "Only sees the pack's victim (as long as she has a potion left). Has one single-use healing potion and one single-use poison potion, and may use both in the same night.",
    },
    coven: {
      name: 'Coven',
      description:
        'Two witches with four potions between them (a “good” one with two healing potions, a “wicked” one with two poison potions). They must agree on every use; each potion stays with its witch.',
    },
    'herb-witch': {
      name: 'Herb Witch',
      description:
        'A witch variant with only one potion — she chooses whether it heals or poisons.',
    },
    magician: {
      name: 'Mage',
      description:
        'Mightier than the witch: has two potions of their choice (healing and/or poison).',
    },
    harlot: {
      name: 'Harlot',
      aliases: ['Orphan Girl'],
      description:
        'Each night on waking, picks a player to spend the night with. She is then untouchable for the werewolves, but dies if that player dies the same night. If that player is a werewolf, the wolves devour her instead of their chosen victim (the witch can heal her).',
    },
    vagabond: {
      name: 'Vagabond',
      description:
        'Finds a different place to sleep every night. If they stay with a villager who is targeted by a night action, it hits the vagabond instead. If the vagabond is attacked, nothing happens (not at home).',
    },
    healer: {
      name: 'Healer',
      aliases: ['Protector'],
      description:
        'Each night, protects one player from werewolf bites (never the same player twice in a row; may protect themselves). Does NOT protect against infection.',
    },
    bodyguard: {
      name: 'Bodyguard',
      description:
        'Each night, protects another player from any attack (not infection), but dies in their place. Is never at home, so cannot be devoured (but can be infected).',
    },
    keeper: {
      name: 'Keeper',
      description:
        'Protects both direct seat neighbors (as seated at the start of the game) from all deadly night attacks by roles hostile to the village.',
    },
    'guardian-angel': {
      name: 'Guardian Angel',
      description:
        'Each night, picks a player who is protected from all attacks by roles hostile to the village (except infection). Only protects pro-village roles.',
    },
    'patron-saint': {
      name: 'Patron Saint',
      description:
        'Each night, protects a player from all night attacks (except infection) — regardless of their faction.',
    },
    'night-watchman': {
      name: 'Night Watchman',
      description:
        'As long as he lives, no plain villager (“Villager” on the card) can be devoured by the wolves. No protection against other killing roles or infection.',
    },
    druid: {
      name: 'Druid',
      description:
        'Each night, picks a player who cannot be lynched the following day (never the same player twice in a row). That player knows nothing about it.',
    },
    jailer: {
      name: 'Jailer',
      description:
        'Each night, locks up a player (never the same one twice in a row) to protect or punish them. No action can be performed on or by the jailed player.',
    },
    headmistress: {
      name: 'Headmistress',
      description:
        'Each night, picks a player who may not vote the next day (for that one day only).',
    },
    mummy: {
      name: 'Mummy',
      description:
        'Each night, wraps up a player (the spell lasts until death). Before the lynch vote, the mummy announces how it will vote — all mummified players must vote the same way.',
    },
    'saint-nicholas': {
      name: 'Saint Nicholas',
      description:
        'Each night, picks a lucky recipient (never the same player twice in a row) and hands out presents.',
    },
    'rune-reader': {
      name: 'Rune Reader',
      description:
        'Once per game, paints runes on the doors of three players. That night, the wolves can only devour one of those three. If all three are wolves, there is no kill.',
    },
    'mad-professor': {
      name: 'Mad Professor',
      description:
        'Each night, hands a highly explosive brew to another player (never the same one twice in a row). If the professor dies, whoever currently holds the brew dies too.',
    },
    alchemist: {
      name: 'Alchemist',
      description:
        'Before the first night, hands a test tube to a player, who passes it on every night. If the alchemist dies, the brew explodes and kills whoever currently holds it.',
    },
    blacksmith: {
      name: 'Blacksmith',
      description:
        'Once per game, may forge a dagger and give it to another player. That player may stab someone the following night.',
    },
    assassin: {
      name: 'Assassin',
      description: 'Once per game (at night), may stab someone.',
    },
    inquisitor: {
      name: 'Inquisitor',
      description:
        'Each night, may torture a player (optional). If the victim is a wolf, it dies; if not, the inquisitor dies. If the inquisitor tortures the witch, the witch dies.',
    },
    hunter: {
      name: 'Hunter',
      description:
        'When the hunter dies (by any means), they fire one last shot with their dying breath and take any player with them to the grave (or shoot into the air). Also protects Little Red Riding Hood.',
    },
    gunslinger: {
      name: 'Gunslinger',
      description: 'This gun nut may shoot up to two players after their death.',
    },
    bomber: {
      name: 'Bomber',
      description:
        'The moment the bomber dies, they decide whether to take both neighbors, just one, or none at all with them to the grave.',
    },
    'exploding-kitten': {
      name: 'Exploding Kitten',
      description:
        'Explodes when it dies (no matter how), taking its left and right neighbors with it.',
    },
    'imploding-kitten': {
      name: 'Imploding Kitten',
      description:
        'Explodes on death (by any means) and kills both neighbors — but the kitten itself survives.',
    },
    elder: {
      name: 'Elder',
      aliases: ['Ancient', 'Old Man', 'Eldest'],
      description:
        'Survives the first werewolf attack (takes two bites). If killed by lynching, poison or a killing village role, all villagers lose their special abilities.',
    },
    'tough-guy': {
      name: 'Tough Guy',
      description:
        'An especially tough villager: survives the first werewolf attack (must be devoured twice) and is not told they were attacked.',
    },
    jeremiah: {
      name: 'Jeremiah',
      description:
        'Survives the first werewolf attack. During that attack, a divine revelation shows him two random players: one wolf and one pro-village role.',
    },
    lycanthrope: {
      name: 'Lycanthrope',
      description: "Appears as a wolf to all seer-type roles, but plays on the village's side.",
    },
    'little-red-riding-hood': {
      name: 'Little Red Riding Hood',
      description:
        'Protected at night from all wolf attacks by the living hunter (except infection). In the night the hunter dies, the protection no longer applies.',
    },
    rapunzel: {
      name: 'Rapunzel',
      description:
        'If she is devoured, the greediest of the wolves chokes to death on her hairball.',
    },
    'rusty-sword-knight': {
      name: 'Knight with the Rusty Sword',
      aliases: ['Knight of the Rusty Blade', 'Knight'],
      description:
        'If devoured by werewolves, the next werewolf clockwise falls ill and dies the following night. The village is not told about this death.',
    },
    leper: {
      name: 'Leper',
      description:
        'If she is devoured, the wolves upset their stomachs and may not devour anyone the following night.',
    },
    'fair-maiden': {
      name: 'Fair Maiden',
      description:
        'If devoured by the werewolves, she is told and picks another player (of any faction) to die in her place. If she is protected, she learns nothing.',
    },
    'bear-tamer': {
      name: 'Bear Tamer',
      description:
        "Every morning, the bear growls if a direct (living) seat neighbor is a werewolf. Also detects the wolf in sheep's clothing and veiled wolves. Requires the seating order.",
    },
    fox: {
      name: 'Fox',
      description:
        'Points at a player and learns whether there is a werewolf in their group of three (with both neighbors). If not, the fox loses the ability.',
    },
    detective: {
      name: 'Detective',
      description:
        'Once per game, may ask whether two players are on the same team. May not ask about themselves.',
    },
    count: {
      name: 'Count Tally',
      description: 'Once per game, may ask how many evil characters are still alive.',
    },
    'paranormal-investigator': {
      name: 'Paranormal Investigator',
      description:
        "Once per game, may scan a player and learns whether there is evil among them or their two neighbors (lycanthrope counts as evil, wolf in sheep's clothing as good, third parties as evil; the dead do not count).",
    },
    'nosy-neighbor': {
      name: 'Nosy Neighbor',
      description:
        "On the first night, learns the alignment of both direct neighbors (pro-village / pro-wolf). The lycanthrope counts as a wolf, the wolf in sheep's clothing as pro-village.",
    },
    insomniac: {
      name: 'Insomniac',
      description:
        'Each night, the moderator tells them whether one of their direct neighbors was active during the night.',
    },
    streetwalker: {
      name: 'Lady of the Night',
      description:
        'Each night, asks about a player and learns whether they are active at night or not.',
    },
    medium: {
      name: 'Medium',
      description:
        'Each night, may ask an eliminated player a yes/no question through the moderator. The player asked does not have to answer truthfully.',
    },
    'little-owl': {
      name: 'Little Owl',
      description:
        'At the end of the night, is shown the dying players and, once per game, may postpone a death by one night (not their own). After that, no more deaths are shown to them.',
    },
    quack: {
      name: 'Quack Doctor',
      description: "Is shown all of the night's dead and, once per game, may save one of them.",
    },
    martyr: {
      name: 'Martyr',
      description:
        "Wakes last and is shown all of the night's final deaths. Once, she may sacrifice herself for one of the dead — then she dies in their place. (Variant: at the lynching too.)",
    },
    phantom: {
      name: 'Phantom',
      description:
        'Each night, appears to another resident of the village (always someone new, as long as there is a choice).',
    },
    goethe: {
      name: 'Goethe',
      aliases: ['Poet'],
      description:
        'Each night, calls on a player who must speak only in rhyme for the entire following day. As the moderator, you set the penalty for breaking this beforehand (e.g. losing their vote for that day).',
    },
    enchantress: {
      name: 'Enchantress',
      description:
        'Each night, picks a player whose communication is restricted the following day (variants: mime, rhymes, singing, a foreign language …). Breaking the rule eventually leads to death.',
    },
    'little-girl': {
      name: 'Little Girl',
      description:
        'May secretly peek during the werewolf phase. If caught, she can be devoured instead of the victim.',
    },
    mayor: {
      name: 'Mayor',
      aliases: ['Captain'],
      description:
        'Elected by the village; their vote counts double and they break ties. When the mayor dies, they name a successor.',
    },
    king: {
      name: 'King',
      description:
        'Escapes the lynch once (role is not revealed). On the SECOND night, he picks a queen who gets the same one-time protection from the lynch (without knowing it) — skip this step on other nights.',
    },
    prince: {
      name: 'Prince',
      description:
        'If the village tries to lynch him, his bodyguards throw themselves in the way and he survives. On the second attempt, the prince can be lynched.',
    },
    idiot: {
      name: 'Idiot',
      description:
        'Is out for blood and votes for the death of the accused in every vote. May not be outed in the first round. Must be played together with the pacifist.',
    },
    pacifist: {
      name: 'Pacifist',
      description:
        'Votes for the accused to live in every vote and may not nominate anyone. May not be outed in the first round. Must be played together with the idiot.',
    },
    'village-idiot': {
      name: 'Village Idiot',
      description:
        'If the village tries to lynch him, it recognizes the fool at the last moment and spares him — but he loses his vote for the rest of the game. Once infected, he cannot be lynched.',
    },
    troublemaker: {
      name: 'Troublemaker',
      description:
        'Once per game, can make the village lynch two people the following day: there is only one vote, and the two players with the most votes die.',
    },
    barkeeper: {
      name: 'Barkeep',
      description:
        'When the village loses an important member, all villagers sleep it off for a night — the following night, no pro-village night actions can be performed.',
    },
    brewer: {
      name: 'Brewer',
      description:
        'Funeral feast: when the brewer dies, the village raids their cellar. The following day, everyone votes at the same time on command — no one may play tactics or change their mind.',
    },
    bogeyman: {
      name: 'Bogeyman',
      description:
        'If killed by the village, it takes revenge by infecting a villager with the werewolf virus. This new wolf must devour a fellow wolf so the pack stays the same size.',
    },
    'wild-child': {
      name: 'Wild Child',
      aliases: ['Feral Child'],
      description:
        'Picks a role model on the first night. If the role model dies, the wild child becomes a full werewolf.',
    },
    'wolf-hound': {
      name: 'Wolf-Hound',
      description: 'Decides once and for all on the first night: villager or werewolf.',
    },
    cursed: {
      name: 'Cursed',
      description:
        "Wins with the village until the wolves try to devour them — then they do not die but turn into a werewolf. If infected, they also become a wolf. The witch is not shown them as the wolves' victim.",
    },
    thief: {
      name: 'Thief',
      description:
        'At the start of the game, steals the role of any player and takes it over. The robbed player becomes a villager. (Variant: they are not told.)',
    },
    doppelganger: {
      name: 'Doppelganger',
      description:
        'On the first night, picks a player and immediately takes on their role (which then exists twice). Is woken as “the doppelganger”, not as the copied role.',
    },
    'devoted-maid': {
      name: 'Devoted Maid',
      description:
        'Once per game, may take over the role of a player who has just been lynched. She only learns the role after taking it over.',
    },
    toady: {
      name: 'Toady',
      description:
        "Neutral at first. The moment the first player's death is announced, takes on that player's identity. The dead player's role is revealed as “Toady”.",
    },
    ghost: {
      name: 'Ghost',
      description:
        'The first player to die becomes the ghost and still wins with their faction. From then on, they know all roles and write one letter on a board each night (no names).',
    },
    admirer: {
      name: 'Admirer',
      description:
        "Falls in love with the first night-active role that uses an action on her. The new couple exists alongside Cupid's lovers; a love triangle is possible too.",
    },
    drunk: {
      name: 'Drunkard',
      description:
        'Lies drunk under the table until the third night and notices nothing. Only then does the moderator tell them their role. Until then, they play and win with the village.',
    },
    'pied-piper': {
      name: 'Pied Piper',
      aliases: ['Flute Player'],
      description:
        'At the end of every night, charms two players (one when ≤15 are alive). Wins alone as soon as every living player is charmed.',
    },
    angel: {
      name: 'Angel',
      description:
        'With the angel in play, the game starts with a day BEFORE the first night. Wins immediately if eliminated in the first round — otherwise a regular villager.',
    },
    'serial-killer': {
      name: 'Serial Killer',
      description:
        'Kills one player each night. Wins as the sole survivor. Can kill wolves and can be devoured by wolves.',
    },
    vampire: {
      name: 'Vampire',
      description:
        'Bites one player each night — they die as soon as the first nomination is made the next day (otherwise, all bitten players die at the first nomination). Cannot be devoured or infected; wins alone.',
    },
    anemic: {
      name: 'Anemic',
      description:
        'Plays for the village until the vampire bites them — then they become a second vampire. Once there are two vampires, their chosen victim dies immediately at the start of the day.',
    },
    bat: {
      name: 'Bat',
      description: "The vampire's minion. Survives the first lynching.",
    },
    'ancient-vampire': {
      name: 'Ancient Vampire',
      description:
        'A weaker vampire with two options each night: kill (does not happen if no one is nominated during the day) OR disguise itself (shielded from seer-type roles, appears as pro-village).',
    },
    bella: {
      name: 'Bella',
      description:
        'Has a crush on the vampire and desperately wants to be bitten. As soon as that happens, she wins alone.',
    },
    frida: {
      name: 'Frida',
      description:
        'So shy that she would love nothing more than to be devoured by the wolves. If that happens, she wins alone.',
    },
    jason: {
      name: 'Jason',
      description:
        'Desperately wants to be lynched by the village — then he wins. If he is in love, he only wins if he himself is lynched; if his partner is lynched, Jason simply dies.',
    },
    hermione: {
      name: 'Hermione',
      description:
        'Wants to match every role to its player correctly. Has two attempts (three with >20 players); if she succeeds, she wins alone. If her last attempt is wrong, she dies.',
    },
    rascal: {
      name: 'Rascal',
      description:
        'On the first night, bets on the demise of a set number of fellow villagers (three to five, depending on group size). As soon as they are all dead, the rascal wins.',
    },
    groom: {
      name: 'Bridegroom',
      description:
        'Each night, picks a player as his bride (who is told). If he survives a full day-night cycle with three brides, he wins alone. The brides know each other, but not the bridegroom.',
    },
    blob: {
      name: 'Blob',
      description:
        'Each night, absorbs one more resident (going left or right, its choice). Once all living players are absorbed, the village is one single blob and it wins.',
    },
    leech: {
      name: 'Leech',
      description:
        'Drains its victims: drained players die as soon as they are put up for the lynch. Wins once it has drained every player.',
    },
    gull: {
      name: 'Seagull',
      description:
        "Each night, poops on someone's head — once hit, always hit. Wins alone as soon as every living player has been hit. The hit itself harms no one.",
    },
    demon: {
      name: 'Demon',
      description:
        'Not active at night. Any night-active role that picks it dies. If the wolves point at it, only one of the wolves dies. Wins as the last one standing.',
    },
    'stone-golem': {
      name: 'Stone Golem',
      description:
        'Immune to vampire bites. Each night, one of three options: kill normally, protect itself (invulnerable) or grow (gain an extra life; first life = 2 nights, second = 3, etc.).',
    },
    stone: {
      name: 'Stone',
      description: "The golem's minion. Becomes the stone golem if the golem dies.",
    },
    werehamster: {
      name: 'Werehamster',
      description:
        'Wins as soon as all werewolves are dead. Cannot be devoured by the wolves (if they try, there is no kill).',
    },
  },
  roleCategories: {
    werewolves: 'Werewolves',
    villagers: 'Villagers',
    ambiguous: 'Ambiguous',
    loners: 'Loners',
  },
  factions: {
    village: 'Village',
    werewolves: 'Werewolves',
    solo: 'Loners',
    variable: 'Variable',
  },
  deathCauses: {
    werewolf: 'Werewolf',
    'witch-poison': "Witch's poison",
    lynch: 'Lynch',
    hunter: 'Hunter',
    heartbreak: 'Heartbreak',
    'rusty-sword': 'Rusty sword',
    other: 'Other',
  },
  winConditions: {
    angel: {
      label: 'Angel',
      description:
        'The angel was removed from the game in the first round and immediately wins alone.',
    },
    'pied-piper': {
      label: 'Pied Piper',
      description: 'Every living player has been charmed by the pied piper — he wins alone.',
    },
    gull: {
      label: 'Seagull',
      description: "The seagull has pooped on every living player's head — it wins alone.",
    },
    'white-werewolf': {
      label: 'White Werewolf',
      description: 'The white werewolf is the last one standing — they win alone.',
    },
    lovers: {
      label: 'Lovers',
      description: 'Only the (mixed) lovers are still alive — they win together.',
    },
    hermione: {
      label: 'Hermione',
      description: 'Hermione matched every role correctly and wins alone.',
    },
    bella: { label: 'Bella', description: 'Bella was bitten by the vampire and wins alone.' },
    frida: {
      label: 'Frida',
      description: 'Frida was devoured by the wolves and wins alone.',
    },
    jason: { label: 'Jason', description: 'Jason was lynched by the village and wins alone.' },
    groom: {
      label: 'Bridegroom',
      description: 'The bridegroom survived a full cycle with three brides and wins alone.',
    },
    rascal: {
      label: 'Rascal',
      description: 'Everyone the rascal bet on is dead — he wins alone.',
    },
    'serial-killer': {
      label: 'Serial Killer',
      description: 'The serial killer is the last one standing — they win alone.',
    },
    demon: { label: 'Demon', description: 'The demon is the only one left — it wins alone.' },
    vampire: {
      label: 'Vampire',
      description: 'The vampire (or the vampire team) is the last one standing and wins.',
    },
    blob: {
      label: 'Blob',
      description: 'The blob has absorbed everyone still alive and wins alone.',
    },
    leech: {
      label: 'Leech',
      description: 'The leech has drained every player and wins alone.',
    },
    'stone-golem': {
      label: 'Stone Golem',
      description: 'The stone golem is the last one standing — it wins alone.',
    },
    werehamster: {
      label: 'Werehamster',
      description: 'All werewolves are dead — the werehamster wins.',
    },
    werewolves: {
      label: 'Werewolves',
      description: 'The werewolves have drawn level with or outnumber the rest of the village.',
    },
    village: {
      label: 'Village',
      description: 'All werewolves (and any other threats) have been eliminated.',
    },
    none: { label: 'Nobody / aborted', description: 'Stalemate, aborted game or no winner.' },
  },
  winCategories: {
    village: 'Village',
    werewolves: 'Werewolves',
    lovers: 'Lovers',
    solo: 'Loners',
  },
  winCategoryRationale: {
    village: 'The majority at the table shares the win.',
    werewolves: 'Only the small pack wins — against overwhelming odds.',
    lovers: 'Two against everyone, and both must survive.',
    solo: 'A win all alone against the whole table.',
  },
  noWinner: 'No winner',
  setRatings: {
    '1': 'Flop',
    '2': 'Meh',
    '3': 'Okay',
    '4': 'Good',
    '5': 'Great',
  },
}
