// The ledgers: three of them, one per kind of entity. A player's games from
// ESPN's box scores (2004 on); a head coach's games and a program's games
// from the game spine (James Howell's scores from 1869, with the AP ranks at
// kickoff from 1936 and the coach of record of every game). Each is written
// in columns by scripts/build-ledgers.mjs: src/data/<kind>.json holds the
// entities, each with its slice [lo, lo+n) of the game arrays, and
// src/data/cols/<kind>/<name>.bin.gz one gzipped typed array per column over
// every game. This decodes them. A game is an index into the columns, never
// an object: a million player-games as objects would cost a phone two hundred
// megabytes, and the page loads only the stat columns a query reads
// (`hasCols`, `missingCols`), the base columns first.

export type Kind = 'player' | 'coach' | 'team'
export const KINDS: Kind[] = ['player', 'coach', 'team']

/** the field of a player board: every player, or one position group */
export type Pos = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DEF' | 'K' | 'P'
export const POSITIONS: Pos[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF', 'K', 'P']

/** the stat columns of the player ledger; the builder writes them in this order */
export const STAT_COLS = [
  'cmp', 'att', 'payd', 'patd', 'int',
  'car', 'ruyd', 'rutd',
  'rec', 'reyd', 'retd',
  'fum', 'fuml',
  'tkl', 'sack', 'tfl', 'dint', 'pd',
  'kr', 'kryd', 'krtd', 'pr', 'pryd', 'prtd',
  'fgm', 'fga', 'fglong', 'xpm', 'xpa',
  'pnt', 'pyd',
] as const
export type StatCol = (typeof STAT_COLS)[number]
/** the columns every query reads: the date, the season, the flags, the team, the team's game number, the score, the ranks */
export const BASE_COLS = ['day', 'season', 'flags', 'team', 'tgn', 'pf', 'pa', 'rk', 'ork'] as const
export type BaseCol = (typeof BASE_COLS)[number]
export type ColName = StatCol | BaseCol | 'opp'

export type ColType = 'u8' | 'u16' | 'i16'
/** how each column is stored; a stat column defaults to a byte */
export const COL_TYPE: Partial<Record<ColName, ColType>> = {
  day: 'u16', team: 'u16', opp: 'u16',
  payd: 'i16', ruyd: 'i16', reyd: 'i16', kryd: 'i16', pryd: 'i16', pyd: 'u16',
  sack: 'u8', // sacks in halves: 1.5 sacks is 3
}
export const colType = (name: ColName): ColType => COL_TYPE[name] ?? 'u8'

// the flags column's bits
export const F_POST = 1, F_HOME = 2, F_NEUTRAL = 4, F_WIN = 8, F_TIE = 16, F_CONF = 32, F_MAJOROPP = 64

/** a rank nobody can give: no poll was in effect (before 1936, or a season's first weeks before 1950) */
export const RANK_UNKNOWN = 255
/** unranked in the poll in effect */
export const UNRANKED = 0

export interface Entity {
  id: string
  name: string
  /** YYYY-MM-DD or null */
  born: string | null
  /** the season of the entity's first game in the ledger */
  debut: number
  /** the career began before the ledger's first season: it has no first N games here, and sits out the career fields */
  censored: boolean
  /** a player's position group; null when no source has one (and for coaches and teams) */
  pos: Exclude<Pos, 'ALL'> | null
  /** where the position came from */
  posSrc: 'roster' | 'box' | null
  /** the entity's games are the indexes [lo, hi) of the columns */
  lo: number
  hi: number
}

export interface Team {
  id: string
  name: string
  /** ESPN's team id, for a mark */
  espn?: string | null
}

export interface Ledger {
  kind: Kind
  builtAt: string
  firstSeason: number
  currentSeason: number
  /** the first season with AP ranks: the "vs ranked" stats begin here */
  pollSince: number
  /** games in the columns */
  n: number
  entities: Entity[]
  teams: Team[]
  /** team id -> season -> [regular-season games, all games] on the spine */
  teamGames: Record<string, Record<string, [number, number]>>
  /** the first season each stat column is recorded in every game, where later than the ledger's start (tackles, sacks, fumbles arrived in ESPN's box after 2004) */
  statSince: Partial<Record<StatCol, number>>
  /** YYYYMMDD of each game, from the day column */
  date: Int32Array
  /** the season each game belongs to (the column holds it less 1800) */
  season: Uint16Array
  flags: Uint8Array
  team: Uint16Array
  tgn: Uint8Array
  pf: Uint8Array
  pa: Uint8Array
  /** the entity's team's AP rank at kickoff: 0 unranked, 1–25, 255 no poll in effect */
  rk: Uint8Array
  /** the opponent's */
  ork: Uint8Array
  /** the opponent, loaded for the panel's ledger */
  opp?: Uint16Array
  /** the stat columns loaded so far */
  col: Partial<Record<StatCol, Uint8Array | Uint16Array | Int16Array>>
}

export interface LedgerFile {
  v: number
  kind: Kind
  builtAt: string
  firstSeason: number
  currentSeason: number
  pollSince: number
  n: number
  cols: Record<string, ColType>
  teams: Team[]
  teamGames: Record<string, Record<string, [number, number]>>
  statSince?: Partial<Record<StatCol, number>>
  entities: { id: string; name: string; born: string | null; debut: number; cen: 0 | 1; pos: Exclude<Pos, 'ALL'> | null; src: 'roster' | 'box' | null; lo: number; n: number }[]
}

export type ColBytes = ArrayBuffer | Uint8Array

const bytes = (b: ColBytes): Uint8Array => (b instanceof Uint8Array ? b : new Uint8Array(b))
const aligned = (b: ColBytes): Uint8Array => { const u = bytes(b); return u.byteOffset % 2 === 0 ? u : u.slice() }
export function typedCol(name: ColName, b: ColBytes): Uint8Array | Uint16Array | Int16Array {
  const t = colType(name)
  if (t === 'u8') return bytes(b)
  const u = aligned(b)
  return t === 'u16' ? new Uint16Array(u.buffer, u.byteOffset, u.byteLength / 2) : new Int16Array(u.buffer, u.byteOffset, u.byteLength / 2)
}

/** the sentinel a column carries for a stat nobody recorded that game, by type */
export const UNK_OF: Record<ColType, number> = { u8: 255, u16: 65535, i16: -32768 }
/** the sentinel of a column */
export const unkOf = (name: ColName): number => UNK_OF[colType(name)]

const EPOCH = Date.UTC(1869, 0, 1)
/** YYYYMMDD of a day count since 1869-01-01 */
export function dateOfDay(day: number): number {
  const d = new Date(EPOCH + day * 86_400_000)
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}
/** days since 1869-01-01 of a YYYY-MM-DD */
export const dayOf = (s: string): number => Math.round((Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) - EPOCH) / 86_400_000)

/** the ledger from its file and the base columns (and any stat columns already in hand) */
export function decodeLedger(file: LedgerFile, cols: Partial<Record<ColName, ColBytes>>): Ledger {
  if (file.v !== 4) throw new Error(`ledger v${file.v}, expected v4`)
  for (const k of BASE_COLS) if (!cols[k]) throw new Error(`ledger: column ${k} missing`)
  const n = file.n
  const day = typedCol('day', cols.day!) as Uint16Array
  if (day.length !== n) throw new Error(`ledger: day has ${day.length} games, expected ${n}`)
  const date = new Int32Array(n), season = new Uint16Array(n)
  const seasonCol = bytes(cols.season!)
  let lastDay = -1, lastDate = 0
  for (let i = 0; i < n; i++) {
    const d = day[i]
    if (d !== lastDay) { lastDay = d; lastDate = dateOfDay(d) }
    date[i] = lastDate
    season[i] = seasonCol[i] + 1800
  }
  const L: Ledger = {
    kind: file.kind, builtAt: file.builtAt, firstSeason: file.firstSeason, currentSeason: file.currentSeason, pollSince: file.pollSince, n,
    entities: file.entities.map((p) => ({ id: p.id, name: p.name, born: p.born, debut: p.debut, censored: p.cen === 1, pos: p.pos, posSrc: p.src, lo: p.lo, hi: p.lo + p.n })),
    teams: file.teams, teamGames: file.teamGames, statSince: file.statSince ?? {},
    date, season, flags: bytes(cols.flags!), team: typedCol('team', cols.team!) as Uint16Array, tgn: bytes(cols.tgn!),
    pf: bytes(cols.pf!), pa: bytes(cols.pa!), rk: bytes(cols.rk!), ork: bytes(cols.ork!), col: {},
  }
  for (const k of Object.keys(cols) as ColName[]) if (!(BASE_COLS as readonly string[]).includes(k)) attachCol(L, k, cols[k]!)
  return L
}

/** a column that arrived after decoding */
export function attachCol(L: Ledger, name: ColName, data: ColBytes): void {
  const u = typedCol(name, data)
  if (u.length !== L.n) throw new Error(`ledger: ${name} has ${u.length} games, expected ${L.n}`)
  if (name === 'opp') L.opp = u as Uint16Array
  else if ((STAT_COLS as readonly string[]).includes(name)) L.col[name as StatCol] = u
}

export const hasCols = (L: Ledger, names: Iterable<ColName>): boolean => [...names].every((k) => (BASE_COLS as readonly string[]).includes(k) || (k === 'opp' ? !!L.opp : !!L.col[k as StatCol]))
export const missingCols = (L: Ledger, names: Iterable<ColName>): ColName[] => [...new Set(names)].filter((k) => !hasCols(L, [k]))

/** one game as an object, for a ledger listing or a test: the engine never builds these */
export interface Game {
  season: number
  post: boolean
  date: number
  home: boolean
  neutral: boolean
  conf: boolean
  team: string
  opp: string
  /** the opponent was a major (FBS-equivalent) team that season */
  majorOpp: boolean
  /** 2 won, 1 tied, 0 lost */
  result: number
  pf: number
  pa: number
  /** AP rank at kickoff: 0 unranked, 255 no poll in effect */
  rk: number
  ork: number
  /** the team's game number that season, regular season then postseason */
  tgn: number
  stat: Partial<Record<StatCol, number>>
}
export function gameAt(L: Ledger, i: number): Game {
  const f = L.flags[i]
  const g: Game = {
    season: L.season[i], post: (f & F_POST) !== 0, date: L.date[i], home: (f & F_HOME) !== 0, neutral: (f & F_NEUTRAL) !== 0, conf: (f & F_CONF) !== 0,
    team: L.teams[L.team[i]]?.id ?? '?', opp: L.opp ? L.teams[L.opp[i]]?.id ?? '?' : '?', majorOpp: (f & F_MAJOROPP) !== 0,
    result: (f & F_WIN) !== 0 ? 2 : (f & F_TIE) !== 0 ? 1 : 0, pf: L.pf[i], pa: L.pa[i], rk: L.rk[i], ork: L.ork[i], tgn: L.tgn[i], stat: {},
  }
  for (const k of STAT_COLS) { const c = L.col[k]; if (c) { const v = c[i]; g.stat[k] = v === unkOf(k) ? -1 : v } }
  return g
}

/** the team's name by its index in the team column */
export const teamName = (L: Ledger, idx: number): string => L.teams[idx]?.name ?? '?'

/** whole years between a birth date and a YYYYMMDD game date; null without a birth date */
export function ageAt(born: string | null, date: number): number | null {
  if (!born) return null
  const by = Number(born.slice(0, 4)), bm = Number(born.slice(5, 7)), bd = Number(born.slice(8, 10))
  const y = Math.floor(date / 10000), m = Math.floor(date / 100) % 100, d = date % 100
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age--
  return age
}

/** "Sep 7, 2017" from a YYYYMMDD */
export function fmtDate(date: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Math.floor(date / 100) % 100 - 1]} ${date % 100}, ${Math.floor(date / 10000)}`
}

/** a season reads as its year */
export const seasonWords = (season: number): string => String(season)
/** "1936–2026", or one season */
export const spanWords = (from: number, to: number): string => (from === to ? seasonWords(from) : `${seasonWords(from)}–${seasonWords(to)}`)

/** the contiguous runs of one team inside an entity's games: a coach's or a transfer's stints, in order */
export function stints(L: Ledger, p: Entity): { lo: number; hi: number; team: number }[] {
  const out: { lo: number; hi: number; team: number }[] = []
  for (let i = p.lo; i < p.hi; i++) {
    const t = L.team[i]
    const last = out[out.length - 1]
    if (last && last.team === t) last.hi = i + 1
    else out.push({ lo: i, hi: i + 1, team: t })
  }
  return out
}
