import { PixelIcon, type PixelGrid } from './pixel-icon'

// Shared colours
const C = {
  glass: '#bcd9f2',
  cork: '#9a6b3f',
  heal: '#5fe08a',
  poison: '#b06bff',
  white: '#f6f7ff',
  black: '#1b1b22',
  eyeY: '#ffd24a',
  red: '#ff5d73',
  bone: '#eef0f5',
  gold: '#ffcf4a',
  note: '#c9a6ff',
  skin: '#f0c39b',
  body: '#7aa2ff',
  moon: '#ffe07a',
  star: '#fff3b0',
  sun: '#ffb23e',
  ray: '#ffcf4a',
  iris: '#6aa6ff',
  robe: '#9aa0ac',
  pink: '#ff9ec4',
  wing: '#e8ecff',
  wood: '#d9b382',
  woodHole: '#5a3d22',
  mouth: '#b8935f',
  potDark: '#2e2e38',
  blade: '#c9d2e0',
  rust: '#b5651d',
  guard: '#c08a3e',
  hilt: '#6b4a2b',
  steel: '#8f9bb3',
  leaf: '#5fb56a',
  stem: '#3f7a45',
  stone: '#8b8b96',
  stoneDark: '#5c5c67',
  blood: '#c0304a',
  violet: '#a77dff',
  teal: '#4fd6c8',
  brown: '#8a5a34',
  ember: '#ff7a2e',
  night: '#3a3f5c',
  ghostly: '#cfe0ff',
  slime: '#7ede5a',
  fur: '#d9a86a',
  cloth: '#e6e1d5',
  paper: '#f3ead6',
  ink: '#3b3b46',
}

// ══════════════════════════════════════════════════════════════════════════
// Base grids. Many roles differ only in colouring —
// so each grid is turned into several icons by a small factory.
// ══════════════════════════════════════════════════════════════════════════

// A wolf-head grid that becomes different wolves (and cats) via the palette.
const WOLF_GRID = [
  'dd......dd',
  'dggd..dggd',
  'gggggggggg',
  'gYgggggYgg',
  'gggggggggg',
  'gggggggggg',
  '.gggggggg.',
  '..gddddg..',
  '...dKKd...',
]
const wolf = (g: string, d: string, Y: string, K: string): PixelGrid => ({
  grid: WOLF_GRID,
  palette: { g, d, Y, K },
})

/** Two-tone head — half wolf, half dog (wolfdog). */
const DOG_WOLF_GRID = [
  'dd......ee',
  'dggd..ehhe',
  'ggggghhhhh',
  'gYggghhYhh',
  'ggggghhhhh',
  'ggggghhhhh',
  '.gggghhhh.',
  '..gddeeh..',
  '...dKKe...',
]

// Bird in profile — crow, dove, swallow.
const BIRD_GRID = [
  '....bbb...',
  '...bbbbb..',
  '..obYbbb..',
  '...bbbbbbb',
  '..bbbbbbbb',
  '..bbbbbbb.',
  '...bbbbb..',
  '....b.b...',
  '....f.f...',
]
const bird = (b: string, Y: string, o = C.eyeY, f = C.eyeY): PixelGrid => ({
  grid: BIRD_GRID,
  palette: { b, Y, o, f },
})

// Bat — vampire family.
const BAT_GRID = [
  'w........w',
  'ww......ww',
  'wwww..wwww',
  'wwwwbbwwww',
  '.wwbYYbww.',
  '..bbbbbb..',
  '...bffb...',
  '....bb....',
]
const bat = (w: string, b: string, Y: string, f = C.white): PixelGrid => ({
  grid: BAT_GRID,
  palette: { w, b, Y, f },
})

// Hooded figure with glowing eyes — traitor, warlock, minion.
const HOOD_GRID = [
  '...hhhh...',
  '..hhhhhh..',
  '.hhhhhhhh.',
  '.hhYYhYYh.',
  '.hhYYhYYh.',
  '.hhhhhhhh.',
  '.hhhhhhhh.',
  'hhhhhhhhhh',
  'hhhhhhhhhh',
]
const hood = (h: string, Y: string): PixelGrid => ({ grid: HOOD_GRID, palette: { h, Y } })

// Ghost / phantom / bogeyman.
const GHOST_GRID = [
  '...GGGG...',
  '..GGGGGG..',
  '.GGGGGGGG.',
  '.GGKGGKGG.',
  '.GGKGGKGG.',
  '.GGGGGGGG.',
  '.GGGGGGGG.',
  '.GGGGGGGG.',
  '.G.GG.GG.G',
]
const ghost = (G: string, K = C.black): PixelGrid => ({ grid: GHOST_GRID, palette: { G, K } })

// Crest shield — protector roles.
const SHIELD_GRID = [
  '.ssssssss.',
  'ssssssssss',
  'ss.ssss.ss',
  'sssccccsss',
  'sssccccsss',
  '.ssccccss.',
  '..ssccss..',
  '...ssss...',
  '....ss....',
]
const shield = (s: string, c: string): PixelGrid => ({ grid: SHIELD_GRID, palette: { s, c } })

// Flame — torch, uproar, inquisition.
const FIRE_GRID = [
  '....ff....',
  '...ffff...',
  '..ffFFff..',
  '.ffFFFFff.',
  '.ffFFFFff.',
  'ffFFFFFFff',
  'ffFFFFFFff',
  '.ffFFFFff.',
  '..ffffff..',
]
const fire = (f: string, F: string): PixelGrid => ({ grid: FIRE_GRID, palette: { f, F } })

// Magnifying glass — investigator roles.
const MAGNIFIER_GRID = [
  '..gggg....',
  '.gllllg...',
  'gllllllg..',
  'gllllllg..',
  'gllllllg..',
  '.gllllg...',
  '..gggghh..',
  '.......hh.',
  '........hh',
]
const magnifier = (l: string, g = C.steel, h = C.hilt): PixelGrid => ({
  grid: MAGNIFIER_GRID,
  palette: { l, g, h },
})

// Crystal ball — medium, summoner.
const CRYSTAL_GRID = [
  '...cccc...',
  '..cccccc..',
  '.cwcccccc.',
  '.cwwccccc.',
  '.cccccccc.',
  '..cccccc..',
  '...cccc...',
  '..ssssss..',
  '.ssssssss.',
]
const crystal = (c: string, w = C.white, s = C.hilt): PixelGrid => ({
  grid: CRYSTAL_GRID,
  palette: { c, w, s },
})

// Jester cap — idiot, village fool.
const JESTER_GRID = [
  'j...j....j',
  'jj.jjj..jj',
  'jjjjjjjjjj',
  '.jjjjjjjj.',
  '..HHHHHH..',
  '..HKHHKH..',
  '..HHHHHH..',
  '...HHHH...',
  '..........',
]
const jester = (j: string, H = C.skin, K = C.black): PixelGrid => ({
  grid: JESTER_GRID,
  palette: { j, H, K },
})

// Villager with eyes — for roles that "just look different".
const PERSON_EYES_GRID = [
  '...HHHH...',
  '..HHHHHH..',
  '..HKHHKH..',
  '...HHHH...',
  '....bb....',
  '..bbbbbb..',
  '.bbbbbbbb.',
  'bbbbbbbbbb',
  'bbbbbbbbbb',
  'bb.bbbb.bb',
]
const personEyes = (b: string, K: string, H = C.skin): PixelGrid => ({
  grid: PERSON_EYES_GRID,
  palette: { b, K, H },
})

// Two figures side by side — sisters, freemasons, doppelganger.
const PAIR_GRID = [
  '.HH...HH...',
  '.HH...HH...',
  'HHHH.HHHH..',
  '.pp...pp...',
  'pppp.pppp..',
  'pppp.pppp..',
  'pppp.pppp..',
]
const pair = (p: string, H = C.skin): PixelGrid => ({ grid: PAIR_GRID, palette: { p, H } })

// Girl in a dress — little girl, Little Red Riding Hood, fair maid, wild child.
const GIRL_GRID = [
  '.R.....R..',
  '.RHHHHHR..',
  '..HHHHHH..',
  '..HHHHHH..',
  '...HHHH...',
  '....pp....',
  '...pppp...',
  '..pppppp..',
  '..pppppp..',
  '..pppppp..',
  '..pp..pp..',
]
const girl = (p: string, R: string, H = C.skin): PixelGrid => ({ grid: GIRL_GRID, palette: { p, R, H } })

// Potion — healing, poison and crafting roles.
const POTION_GRID = [
  '.....oo.....',
  '.....oo.....',
  '....gggg....',
  '....gLLg....',
  '...gLLLLg...',
  '..gLLLLLLg..',
  '..gLLLLLLg..',
  '..gLLLhLLg..',
  '..gLLLLLLg..',
  '...gLLLLg...',
  '....gggg....',
  '............',
]
const potion = (L: string, h = C.white): PixelGrid => ({
  grid: POTION_GRID,
  palette: { o: C.cork, g: C.glass, L, h },
})

// Eye — seer family.
const EYE_GRID = ['..wwwww..', '.wwwwwww.', 'wwwBBBwww', 'wwBKKKBww', 'wwwBBBwww', '.wwwwwww.', '..wwwww..']
const eye = (B: string, w = C.white, K = C.black): PixelGrid => ({ grid: EYE_GRID, palette: { w, B, K } })

// Heart — Cupid family.
const HEART_GRID = [
  '.RR..RR..',
  'RRRRRRRR.',
  'RRRRRRRRR',
  'RRRRRRRRR',
  '.RRRRRRR.',
  '..RRRRR..',
  '...RRR...',
  '....R....',
]
const heart = (R: string): PixelGrid => ({ grid: HEART_GRID, palette: { R } })

// Crown — mayor, king, prince.
const CROWN_GRID = [
  'A....A....A',
  'A.A..A..A.A',
  'AAAAAAAAAAA',
  'AAAAAAAAAAA',
  'AArAAArAArA',
  'AAAAAAAAAAA',
  '.AAAAAAAAA.',
]
const crown = (A: string, r: string): PixelGrid => ({ grid: CROWN_GRID, palette: { A, r } })

// Cauldron — witch family.
const CAULDRON_GRID = [
  '...g..g..g..',
  '......g.....',
  '.rrrrrrrrrr.',
  '.pppppppppp.',
  '.pGGGGGGGGp.',
  '.pppppppppp.',
  '.pppppppppp.',
  '..pppppppp..',
  '...pppppp...',
  '..p......p..',
  '.pp......pp.',
]
const cauldron = (g: string): PixelGrid => ({
  grid: CAULDRON_GRID,
  palette: { g, G: g, r: C.robe, p: C.potDark },
})

// Bear — werebear, bear leader.
const BEAR_GRID = [
  'bb......bb',
  'bbbb..bbbb',
  '.bbbbbbbb.',
  'bbbbbbbbbb',
  'bYbbbbbbYb',
  'bbbbbbbbbb',
  'bbb.nn.bbb',
  '.bbbnnbbb.',
  '..bbbbbb..',
]
const bear = (b: string, Y: string, n = C.black): PixelGrid => ({ grid: BEAR_GRID, palette: { b, Y, n } })

// Beer mug — barkeeper, drunkard.
const MUG_GRID = [
  '..ffffff..',
  '.mmmmmmmm.',
  '.mmmmmmmm.',
  '.mmmmmmmmh',
  '.mmmmmmmhh',
  '.mmmmmmmmh',
  '.mmmmmmmm.',
  '.mmmmmmmm.',
  '..mmmmmm..',
]
const mug = (m: string, f = C.cloth, h = C.steel): PixelGrid => ({ grid: MUG_GRID, palette: { m, f, h } })

// Beer barrel — brewer.
const BARREL_GRID = [
  '..wwwwww..',
  '.wwwwwwww.',
  'hhhhhhhhhh',
  'wwwwwwwwww',
  'wwwwwwwwtt',
  'wwwwwwwwt.',
  'hhhhhhhhhh',
  '.wwwwwwww.',
  '..wwwwww..',
]

// Book — headmistress, Hermione.
const BOOK_GRID = [
  '.cc....cc.',
  'cccccccccc',
  'cwwwcwwwwc',
  'cwwwcwwwwc',
  'cwwwcwwwwc',
  'cwwwcwwwwc',
  'cwwwcwwwwc',
  'cccccccccc',
  '.cc....cc.',
]
const book = (c: string, w = C.paper): PixelGrid => ({ grid: BOOK_GRID, palette: { c, w } })

// Downward blade — assassin, serial killer.
const DAGGER_GRID = [
  '....bb....',
  '....bb....',
  '....bb....',
  '....bb....',
  '....bb....',
  '..gggggg..',
  '....hh....',
  '....hh....',
  '...hhhh...',
]
const dagger = (b: string, g = C.guard, h = C.hilt): PixelGrid => ({ grid: DAGGER_GRID, palette: { b, g, h } })

// Slime — toady, blob.
const SLIME_GRID = [
  '....gg....',
  '...gggg...',
  '..gggggg..',
  '.gggggggg.',
  'gggKggKggg',
  'gggggggggg',
  'gggggggggg',
  'g.gg.gg.gg',
  '..........',
]
const slime = (g: string, K = C.black): PixelGrid => ({ grid: SLIME_GRID, palette: { g, K } })

// Boulder — stone golem, The Stone.
const ROCK_GRID = [
  '...rrrr...',
  '..rrrrrrd.',
  '.rrrrrrrdd',
  'rrrrrrrrdd',
  'rrrrrrrddd',
  'rrrrrrdddd',
  '.rrrrddddd',
  '..rrdddd..',
  '..........',
]
const rock = (r: string, d: string): PixelGrid => ({ grid: ROCK_GRID, palette: { r, d } })

// Lantern — night watchman, vagabond.
const LANTERN_GRID = [
  '....hh....',
  '...hhhh...',
  '..mmmmmm..',
  '.mYYYYYYm.',
  '.mYYYYYYm.',
  '.mYYYYYYm.',
  '.mYYYYYYm.',
  '..mmmmmm..',
  '...mmmm...',
]
const lantern = (Y: string, m = C.steel, h = C.hilt): PixelGrid => ({
  grid: LANTERN_GRID,
  palette: { Y, m, h },
})

// Leaf — herbalist witch, druid.
const HERB_GRID = [
  '.......ll.',
  '.....lllll',
  '...llllll.',
  '..lllllll.',
  '.llllllll.',
  '.lllllll..',
  '.sllll....',
  '..s.......',
  '..s.......',
]
const herb = (l: string, s = C.stem): PixelGrid => ({ grid: HERB_GRID, palette: { l, s } })

// ══════════════════════════════════════════════════════════════════════════
// Single icons
// ══════════════════════════════════════════════════════════════════════════

export const ICONS = {
  // ── Potions & brews ─────────────────────────────────────────────────────
  'potion-heal': potion(C.heal),
  'potion-poison': {
    grid: [
      '.....oo.....',
      '.....oo.....',
      '....gggg....',
      '....gPPg....',
      '...gPPPPg...',
      '..gPPPPPPg..',
      '..gPWPPWPg..',
      '..gPPPPPPg..',
      '..gPWWWWPg..',
      '...gPPPPg...',
      '....gggg....',
      '............',
    ],
    palette: { o: C.cork, g: C.glass, P: C.poison, W: C.white },
  },
  'potion-gold': potion(C.gold),
  'potion-mad': potion(C.teal),
  'potion-quack': potion(C.mouth),
  cauldron: cauldron(C.heal),
  'cauldron-coven': cauldron(C.violet),

  // ── Wolves & relatives ──────────────────────────────────────────────────
  wolf: wolf('#8a8f9c', '#494d59', C.eyeY, C.black),
  'wolf-father': wolf('#6a6f7c', '#33363f', '#ff5d4a', C.black),
  'wolf-big': wolf('#4a4e5a', '#2a2d35', '#ff3b3b', C.black),
  'wolf-white': wolf('#dfe5f0', '#a9b2c4', C.eyeY, '#5a5e6a'),
  'wolf-alpha': wolf('#9a8a99', '#584a58', C.pink, C.black),
  'wolf-lead': wolf('#7d7466', '#463f36', C.gold, C.black),
  'wolf-mystic': wolf('#7a6aa8', '#3f3560', C.teal, C.black),
  'wolf-plague': wolf('#7d8f6a', '#414d33', '#c8ff5a', C.black),
  'wolf-ghost': wolf('#9fb4d6', '#5d6d8c', C.ghostly, '#41506b'),
  'wolf-dream': wolf('#5f6fa8', '#333c63', '#9ad6ff', C.black),
  'wolf-shaman': wolf('#6b8f86', '#33544d', C.red, C.black),
  'wolf-stray': wolf('#a08a6a', '#5e4d38', C.eyeY, C.black),
  'wolf-pup': wolf('#b6bcc9', '#6e7480', C.eyeY, C.black),
  dog: wolf('#b07a4a', '#7a5230', '#3a2a1a', '#2a1d12'),
  'dog-wolf': {
    grid: DOG_WOLF_GRID,
    palette: { g: '#8a8f9c', d: '#494d59', h: '#b07a4a', e: '#7a5230', Y: C.eyeY, K: C.black },
  },
  fox: wolf('#ff8c42', '#d65b1f', C.eyeY, C.black),
  cat: wolf('#e08a3c', '#a75c1e', C.heal, C.black),
  'cat-cold': wolf('#8fb8d6', '#4d6f8c', C.white, C.black),
  bear: bear('#6b4a30', C.eyeY),
  'bear-tame': bear('#a5783f', C.eyeY),
  fang: {
    grid: [
      '..kkkkkk..',
      '.kwwwwwwk.',
      '.kwwwwwwk.',
      '.kwswwwwk.',
      '..kwwwwk..',
      '..kwwwwk..',
      '...kwwk...',
      '...kwwk...',
      '....kk....',
    ],
    palette: { w: C.bone, s: C.white, k: C.stoneDark },
  },
  sheep: {
    grid: [
      '..wwwwww..',
      '.wwwwwwww.',
      'wwwwwwwwww',
      'ww.dddd.ww',
      'w.dYddYd.w',
      'w.dddddd.w',
      'ww.dddd.ww',
      '.wwwwwwww.',
      '..w....w..',
    ],
    palette: { w: C.cloth, d: '#4a4e5a', Y: C.eyeY },
  },
  strawberry: {
    grid: [
      '...ll.ll..',
      '....ll....',
      '..RRRRRR..',
      '.RRwRRwRR.',
      'RRRRRRRRRR',
      'RRwRRRRwRR',
      '.RRRRRRRR.',
      '..RRRRRR..',
      '....RR....',
    ],
    palette: { R: C.red, w: C.star, l: C.leaf },
  },
  spiral: {
    grid: [
      '..ssssss..',
      '.s......s.',
      's..ssss..s',
      's.s....s.s',
      's.s.ss.s.s',
      's.s....s.s',
      's..ssss..s',
      '.s......s.',
      '..ssssss..',
    ],
    palette: { s: C.violet },
  },

  // ── Birds ───────────────────────────────────────────────────────────────
  crow: bird('#5c5c72', C.eyeY),
  dove: bird(C.white, C.black, C.sun, C.sun),
  swallow: bird('#5b7bb5', C.white, C.sun, C.sun),
  // Own grid so the seagull stands out from the dove: grey wing.
  gull: {
    grid: [
      '....www...',
      '...wwwww..',
      '..owYwww..',
      '...wwwgggg',
      '..wwwggggg',
      '..wwwgggg.',
      '...wwwww..',
      '....w.w...',
      '....f.f...',
    ],
    palette: { w: C.white, g: C.steel, o: C.sun, Y: C.black, f: C.sun },
  },

  // ── Vampires ────────────────────────────────────────────────────────────
  bat: bat('#6b3f7a', '#3a2247', C.red),
  'bat-pale': bat('#b3a1c9', '#6f6383', C.pink),
  'bat-small': bat('#4a4e5a', '#2a2d35', C.eyeY),
  'bat-ancient': bat('#4a2b57', '#241432', C.gold),

  // ── Hoods & betrayal ────────────────────────────────────────────────────
  hood: hood('#4c5160', C.red),
  'hood-chosen': hood('#5a4d6b', C.gold),
  'hood-warlock': hood('#3f2f5c', C.heal),

  // ── Ghosts ──────────────────────────────────────────────────────────────
  ghost: ghost(C.ghostly),
  'ghost-phantom': ghost('#a9c4ef'),
  'ghost-fright': ghost('#9fe0b4'),

  // ── Protection ──────────────────────────────────────────────────────────
  shield: shield(C.steel, C.body),
  'shield-gold': shield(C.gold, C.red),
  'shield-two': shield(C.steel, C.heal),

  // ── Fire & light ────────────────────────────────────────────────────────
  fire: fire(C.ember, C.gold),
  'fire-riot': fire(C.red, C.sun),
  candle: {
    grid: [
      '....ff....',
      '...ffff...',
      '...ffff...',
      '....ff....',
      '...wwww...',
      '...wwww...',
      '...wwww...',
      '...wwww...',
      '..wwwwww..',
    ],
    palette: { f: C.gold, w: C.cloth },
  },
  lantern: lantern(C.moon),
  'lantern-night': lantern(C.star, C.gold),

  // ── Investigation ───────────────────────────────────────────────────────
  magnifier: magnifier(C.glass),
  'magnifier-para': magnifier(C.violet),
  crystal: crystal('#8fb6e8'),
  'crystal-violet': crystal(C.violet),
  abacus: {
    grid: [
      'wwwwwwwwww',
      'w.b.b..b.w',
      'w........w',
      'w..b.b.b.w',
      'w........w',
      'wb..b..b.w',
      'w........w',
      'w.b.b.b..w',
      'wwwwwwwwww',
    ],
    palette: { w: C.wood, b: C.red },
  },
  keyhole: {
    grid: [
      'dddddddddd',
      'dwwwwwwwwd',
      'dwwwkkwwwd',
      'dwwkkkkwwd',
      'dwwkkkkwwd',
      'dwwwkkwwwd',
      'dwwwkkwwwd',
      'dwwwwwwwwd',
      'dddddddddd',
    ],
    palette: { d: C.hilt, w: C.wood, k: C.black },
  },
  owl: {
    grid: [
      '.oo....oo.',
      'oooooooooo',
      'ooWWooWWoo',
      'ooWKooKWoo',
      'ooooBBoooo',
      'oooooooooo',
      '.oooooooo.',
      '..oooooo..',
      '...f..f...',
    ],
    palette: { o: '#8a6f4d', W: C.white, K: C.black, B: C.sun, f: C.sun },
  },

  // ── Eyes, hearts, crowns ────────────────────────────────────────────────
  eye: eye(C.iris),
  'eye-bad': eye(C.red),
  'eye-apprentice': eye(C.heal),
  'eye-gold': eye(C.gold),
  heart: heart(C.red),
  'heart-pink': heart(C.pink),
  'heart-crush': heart('#ff7aa8'),
  'heart-bella': heart('#c9436b'),
  crown: crown(C.gold, C.red),
  'crown-king': crown('#ffe08a', C.poison),
  'crown-prince': crown(C.steel, C.body),

  // ── People ──────────────────────────────────────────────────────────────
  person: {
    grid: [
      '...HHHH...',
      '..HHHHHH..',
      '..HHHHHH..',
      '...HHHH...',
      '....bb....',
      '..bbbbbb..',
      '.bbbbbbbb.',
      'bbbbbbbbbb',
      'bbbbbbbbbb',
      'bb.bbbb.bb',
      'bb.bbbb.bb',
    ],
    palette: { H: C.skin, b: C.body },
  },
  'person-wolfish': personEyes('#7d8493', C.eyeY),
  'person-cursed': personEyes('#6b3f4a', C.red),
  elder: {
    grid: [
      '...HHHH...',
      '..HHHHHH..',
      '..HHHHHH..',
      '..WWWWWW..',
      '...WWWW...',
      '....bb....',
      '..bbbbbb..',
      '.bbbbbbbb.',
      'bbbbbbbbbb',
      'bbbbbbbbbb',
      'bb.bbbb.bb',
    ],
    palette: { H: C.skin, W: C.bone, b: C.robe },
  },
  sisters: pair(C.pink),
  brothers: pair(C.body),
  friends: pair(C.teal),
  twins: pair(C.robe),
  girl: girl(C.pink, C.red),
  'girl-red': girl(C.red, C.red),
  'girl-maid': girl(C.body, C.gold),
  'girl-wild': girl(C.brown, C.leaf),
  jester: jester(C.violet),
  'jester-fool': jester(C.ember),
  helmet: {
    grid: [
      '..hhhhhh..',
      '.hhhhhhhh.',
      'hhhhhhhhhh',
      'hhhhhhhhhh',
      'hh.hhhh.hh',
      'hh.hhhh.hh',
      'hhhhhhhhhh',
      '.hhhhhhhh.',
      '..hhhhhh..',
    ],
    palette: { h: C.steel },
  },
  mummy: {
    grid: [
      '..wwwwww..',
      '.wwwwwwww.',
      'wwKwwwKwww',
      'wwwwwwwwww',
      '.wwwwwwww.',
      'ww.wwww.ww',
      '.wwwwwwww.',
      'ww.wwww.ww',
      '..wwwwww..',
    ],
    palette: { w: C.cloth, K: C.black },
  },
  demon: {
    grid: [
      'h........h',
      'hh......hh',
      '.hddddddh.',
      '.dddddddd.',
      '.dYddddYd.',
      '.dddddddd.',
      '.ddKKKKdd.',
      '..dddddd..',
      '...dddd...',
    ],
    palette: { h: C.bone, d: '#7a2438', Y: C.gold, K: C.white },
  },
  hamster: {
    grid: [
      '..hh..hh..',
      '.hhhhhhhh.',
      'hhhhhhhhhh',
      'hKhhhhhhKh',
      'hhhhnnhhhh',
      'hhhhhhhhhh',
      '.hhhhhhhh.',
      '..hhhhhh..',
      '..........',
    ],
    palette: { h: C.fur, K: C.black, n: C.pink },
  },
  angel: {
    grid: [
      '...gggg....',
      '..g....g...',
      '...gggg....',
      '....WWW....',
      'w...WWW...w',
      'ww..WWW..ww',
      'www.WWW.www',
      'ww.WWWWW.ww',
      '....WWW....',
      '....W.W....',
    ],
    palette: { g: C.gold, W: C.white, w: C.wing },
  },

  // ── Tools & weapons ─────────────────────────────────────────────────────
  sword: {
    grid: [
      '.....s.....',
      '.....s.....',
      '.....s.....',
      '.....s.....',
      '.....r.....',
      '.....s.....',
      '.....s.....',
      '...ggggg...',
      '.....h.....',
      '.....h.....',
      '....hhh....',
    ],
    palette: { s: C.blade, r: C.rust, g: C.guard, h: C.hilt },
  },
  dagger: dagger(C.blade),
  'dagger-blood': dagger('#e0596b'),
  revolver: {
    grid: [
      '..........',
      '.mmmmmmmm.',
      'mmmmmmmmm.',
      'mmoommmm..',
      '.mmmm.....',
      '.mhhm.....',
      '..hhh.....',
      '..hhh.....',
      '...hh.....',
    ],
    palette: { m: C.steel, o: C.black, h: C.hilt },
  },
  bomb: {
    grid: [
      '.......f..',
      '......f...',
      '.....ff...',
      '..bbbb....',
      '.bbbbbb...',
      'bbbbbbbb..',
      'bbbbbbbb..',
      '.bbbbbb...',
      '..bbbb....',
    ],
    palette: { b: '#33363f', f: C.sun },
  },
  hammer: {
    grid: [
      '..........',
      '..hhhhhh..',
      '..hhhhhh..',
      '....ww....',
      '....ww....',
      '....ww....',
      '....ww....',
      '....ww....',
      '..........',
    ],
    palette: { h: C.steel, w: C.wood },
  },
  key: {
    grid: [
      '..kkkk....',
      '.kk..kk...',
      'kk....kk..',
      'kk....kk..',
      '.kk..kk...',
      '..kkkk....',
      '...kk.....',
      '...kkkkk..',
      '...kk.k.k.',
    ],
    palette: { k: C.gold },
  },
  wand: {
    grid: [
      '........SS',
      '.......S.S',
      '........SS',
      '......ww..',
      '.....ww...',
      '....ww....',
      '...ww.....',
      '..ww......',
      '.ww.......',
    ],
    palette: { w: C.wood, S: C.star },
  },
  broom: {
    grid: [
      '.......ss.',
      '......ss..',
      '.....ss...',
      '....ss....',
      '...ss.....',
      '..bbbb....',
      '.bbbbbb...',
      'bbb.bb.bb.',
      'bb..bb..b.',
    ],
    palette: { s: C.wood, b: C.mouth },
  },
  target: {
    grid: ['....T....', '..TTTTT..', '.TT...TT.', '.T..T..T.', 'TT.TTT.TT', '.T..T..T.', '.TT...TT.', '..TTTTT..', '....T....'],
    palette: { T: C.red },
  },

  // ── Objects & signs ─────────────────────────────────────────────────────
  flute: {
    grid: ['............', '.wwwwwwwwwo.', '.wKwwKwwKwo.', '.wwwwwwwwwo.', '............'],
    palette: { w: C.wood, K: C.woodHole, o: C.mouth },
  },
  book: book(C.body),
  'book-magic': book(C.violet),
  // Speech bubble with two lines of verse. A feather would fit the setting better, but at
  // 13-22 px it turns into a mushroom — the bubble reads at any size.
  speech: {
    grid: [
      '.wwwwwwww.',
      'wwwwwwwwww',
      'wwkkwkkkww',
      'wwwwwwwwww',
      'wwkkkwkkww',
      'wwwwwwwwww',
      '.wwwwwwww.',
      '..ww......',
      '.ww.......',
    ],
    palette: { w: C.paper, k: C.ink },
  },
  scroll: {
    grid: [
      '.pppppppp.',
      'p........p',
      'p.iiiiii.p',
      'p........p',
      'p.iiiiii.p',
      'p........p',
      'p.iiii...p',
      'p........p',
      '.pppppppp.',
    ],
    palette: { p: C.paper, i: C.ink },
  },
  gift: {
    grid: [
      '...r..r...',
      '..rrrrrr..',
      'gggggggggg',
      'gggggggggg',
      '.gggrrggg.',
      '.gggrrggg.',
      '.gggrrggg.',
      '.gggrrggg.',
      '.gggggggg.',
    ],
    palette: { g: C.red, r: C.gold },
  },
  rune: {
    grid: [
      '..ssssss..',
      '.ssssssss.',
      'ss.rrrr.ss',
      'ss.r..r.ss',
      'ss.rrrr.ss',
      'ss.r.r..ss',
      'ss.r..r.ss',
      '.ssssssss.',
      '..ssssss..',
    ],
    palette: { s: C.stone, r: C.teal },
  },
  rose: {
    grid: [
      '...RRR....',
      '..RRRRR...',
      '.RRRRRRR..',
      '..RRRRR...',
      '...RRR....',
      '....s.....',
      '...ls.....',
      '....sl....',
      '....s.....',
    ],
    palette: { R: C.red, s: C.stem, l: C.leaf },
  },
  herb: herb(C.leaf),
  'herb-druid': herb(C.teal),
  bell: {
    grid: [
      '....hh....',
      '....hh....',
      '...bbbb...',
      '..bbbbbb..',
      '..bbbbbb..',
      '.bbbbbbbb.',
      'bbbbbbbbbb',
      '..dddddd..',
      '....dd....',
    ],
    palette: { b: C.guard, d: C.hilt, h: C.stoneDark },
  },
  tower: {
    grid: [
      '..t.t.t.t.',
      '..tttttt..',
      '..tttttt..',
      '..twwwtt..',
      '..twwwtt..',
      '..tttttt..',
      '..tttttt..',
      '..tttttt..',
      '..tttttt..',
    ],
    palette: { t: C.stone, w: C.night },
  },
  cards: {
    grid: [
      '..bbbbbb..',
      '..bbbbbb..',
      '.wwwwwwwb.',
      '.wwwwwwwb.',
      '.wRwwwwwb.',
      '.wwwwwwwb.',
      '.wwwwRwwb.',
      '.wwwwwwww.',
      '.wwwwwwww.',
    ],
    palette: { w: C.cloth, b: C.night, R: C.red },
  },
  dice: {
    grid: [
      '.dddddddd.',
      'dddddddddd',
      'ddpdddpddd',
      'dddddddddd',
      'ddddppdddd',
      'dddddddddd',
      'ddpdddpddd',
      'dddddddddd',
      '.dddddddd.',
    ],
    palette: { d: C.cloth, p: C.ink },
  },
  ring: {
    grid: [
      '....dd....',
      '...d..d...',
      '..gggggg..',
      '.gg....gg.',
      'gg......gg',
      'gg......gg',
      '.gg....gg.',
      '..gggggg..',
      '..........',
    ],
    palette: { g: C.gold, d: C.glass },
  },
  drop: {
    grid: [
      '....RR....',
      '....RR....',
      '...RRRR...',
      '...RRRR...',
      '..RRRRRR..',
      '.RRRRRRRR.',
      '.RRRRRRRR.',
      '..RRRRRR..',
      '...RRRR...',
    ],
    palette: { R: C.blood },
  },
  bone: {
    grid: [
      'bb......bb',
      'bbb....bbb',
      '.bbbbbbbb.',
      '..bbbbbb..',
      '.bbbbbbbb.',
      'bbb....bbb',
      'bb......bb',
      '..........',
      '..........',
    ],
    palette: { b: C.bone },
  },
  noose: {
    grid: [
      '.....n....',
      '.....n....',
      '.....n....',
      '....nnn...',
      '...nn.nn..',
      '..nn...nn.',
      '..nn...nn.',
      '...nn.nn..',
      '....nnn...',
    ],
    palette: { n: C.mouth },
  },
  mug: mug(C.sun),
  'mug-drunk': mug(C.rust),
  barrel: { grid: BARREL_GRID, palette: { w: C.cork, h: C.steel, t: C.guard } },
  slime: slime(C.slime),
  'slime-blob': slime(C.teal),
  rock: rock(C.stone, C.stoneDark),
  'rock-small': rock('#a5a5b0', C.stone),

  // ── Sky & state ─────────────────────────────────────────────────────────
  skull: {
    grid: ['.BBBBBB.', 'BBBBBBBB', 'BKKBBKKB', 'BKKBBKKB', 'BBBKKBBB', 'BBBBBBBB', '.BKBKBKB', '.BBBBBB.'],
    palette: { B: C.bone, K: C.black },
  },
  star: {
    grid: ['....A....', '....A....', '...AAA...', 'AAAAAAAAA', '.AAAAAAA.', 'AAAAAAAAA', '...AAA...', '....A....', '....A....'],
    palette: { A: C.gold },
  },
  sparkle: {
    grid: ['....A....', '....A....', '...AAA...', 'AAAAAAAAA', '.AAAAAAA.', 'AAAAAAAAA', '...AAA...', '....A....', '....A....'],
    palette: { A: C.star },
  },
  moon: {
    grid: [
      '....YYYY....',
      '...YYYYYY..s',
      '..YYYY......',
      '..YYY.......',
      '.YYY........',
      '.YYY........',
      '.YYY........',
      '..YYY.......',
      '..YYYY......',
      '...YYYYYY...',
      '....YYYY....',
      '............',
    ],
    palette: { Y: C.moon, s: C.star },
  },
  sun: {
    grid: [
      '.....r.....',
      '..r..r..r..',
      '....SSS....',
      '...SSSSS...',
      '..SSSSSSS..',
      'rrSSSSSSSrr',
      '..SSSSSSS..',
      '...SSSSS...',
      '....SSS....',
      '..r..r..r..',
      '.....r.....',
    ],
    palette: { S: C.sun, r: C.ray },
  },
} satisfies Record<string, PixelGrid>

export type IconName = keyof typeof ICONS

/**
 * Role icon per role. Every role of the catalogue is deliberately assigned —
 * similar roles share a grid but differ in colour
 * (e.g. the wolf and seer families).
 */
const ROLE_ICON: Record<string, IconName> = {
  // ── Wolf roles ──────────────────────────────────────────────────────────
  'werewolf': 'wolf',
  'accursed-wolf-father': 'wolf-father',
  'big-bad-wolf': 'wolf-big',
  'alpha-female': 'wolf-alpha',
  'lead-wolf': 'wolf-lead',
  werebear: 'bear',
  sharptooth: 'fang',
  'wolf-shaman': 'wolf-shaman',
  dog: 'dog',
  hypnotist: 'spiral',
  'mystic-wolf': 'wolf-mystic',
  werecrow: 'crow',
  'wolf-cub': 'wolf-pup',
  'plague-wolf': 'wolf-plague',
  'ghost-werewolf': 'wolf-ghost',
  'dream-wolf': 'wolf-dream',
  stray: 'wolf-stray',
  'wolf-in-sheeps-clothing': 'sheep',
  sorceress: 'wand',
  minion: 'hood',
  'chosen-one': 'hood-chosen',
  warlock: 'hood-warlock',
  'strawberry-girl': 'strawberry',
  'white-werewolf': 'wolf-white',

  // ── Village roles ───────────────────────────────────────────────────────
  'villager': 'person',
  seer: 'eye',
  'flawed-seer': 'eye-bad',
  'apprentice-seer': 'eye-apprentice',
  eye: 'eye-gold',
  cupid: 'heart',
  'wanton-cupid': 'heart-pink',
  'two-sisters': 'sisters',
  freemasons: 'brothers',
  companion: 'friends',
  witch: 'cauldron',
  coven: 'cauldron-coven',
  'herb-witch': 'herb',
  magician: 'wand',
  harlot: 'rose',
  vagabond: 'lantern',
  healer: 'potion-heal',
  bodyguard: 'shield',
  keeper: 'shield-two',
  'guardian-angel': 'angel',
  'patron-saint': 'shield-gold',
  'night-watchman': 'lantern-night',
  druid: 'herb-druid',
  jailer: 'key',
  headmistress: 'book',
  mummy: 'mummy',
  'saint-nicholas': 'gift',
  'rune-reader': 'rune',
  'mad-professor': 'potion-mad',
  alchemist: 'potion-gold',
  blacksmith: 'hammer',
  assassin: 'dagger',
  inquisitor: 'fire',
  hunter: 'target',
  gunslinger: 'revolver',
  bomber: 'bomb',
  'exploding-kitten': 'cat',
  'imploding-kitten': 'cat-cold',
  'elder': 'elder',
  'tough-guy': 'helmet',
  jeremiah: 'scroll',
  lycanthrope: 'person-wolfish',
  'little-red-riding-hood': 'girl-red',
  rapunzel: 'tower',
  'rusty-sword-knight': 'sword',
  leper: 'bell',
  'fair-maiden': 'girl-maid',
  'bear-tamer': 'bear-tame',
  fox: 'fox',
  detective: 'magnifier',
  'count': 'abacus',
  'paranormal-investigator': 'magnifier-para',
  'nosy-neighbor': 'keyhole',
  insomniac: 'moon',
  streetwalker: 'swallow',
  medium: 'crystal',
  'little-owl': 'owl',
  quack: 'potion-quack',
  martyr: 'candle',
  phantom: 'ghost-phantom',
  enchantress: 'crystal-violet',
  goethe: 'speech',
  'little-girl': 'girl',
  mayor: 'crown',
  king: 'crown-king',
  prince: 'crown-prince',
  idiot: 'jester',
  pacifist: 'dove',
  'village-idiot': 'jester-fool',
  troublemaker: 'fire-riot',
  barkeeper: 'mug',
  brewer: 'barrel',
  bogeyman: 'ghost-fright',
  admirer: 'heart-crush',
  drunk: 'mug-drunk',

  // ── Ambiguous ───────────────────────────────────────────────────────────
  'wild-child': 'girl-wild',
  'wolf-hound': 'dog-wolf',
  cursed: 'person-cursed',
  thief: 'cards',
  doppelganger: 'twins',
  'devoted-maid': 'broom',
  toady: 'slime',
  ghost: 'ghost',

  // ── Loners / third parties ──────────────────────────────────────────────
  'pied-piper': 'flute',
  angel: 'angel',
  'serial-killer': 'dagger-blood',
  vampire: 'bat',
  anemic: 'bat-pale',
  bat: 'bat-small',
  'ancient-vampire': 'bat-ancient',
  bella: 'heart-bella',
  frida: 'bone',
  jason: 'noose',
  hermione: 'book-magic',
  rascal: 'dice',
  groom: 'ring',
  blob: 'slime-blob',
  leech: 'drop',
  demon: 'demon',
  'stone-golem': 'rock',
  'stone': 'rock-small',
  werehamster: 'hamster',
  gull: 'gull',
}

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const def = (ICONS as Record<string, PixelGrid>)[name]
  if (!def) return null
  return <PixelIcon grid={def.grid} palette={def.palette} size={size} className={className} />
}

export function RoleIcon({ roleId, size = 18, className }: { roleId: string; size?: number; className?: string }) {
  return <Icon name={ROLE_ICON[roleId] ?? 'person'} size={size} className={className} />
}
