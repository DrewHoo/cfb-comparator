// The stat catalog: what a game can be counted by, for each kind of entity.
// Each stat reads one game of a ledger by index, from the columns it names
// (`cols`), so the page can load a query's columns and no others. A player
// stat reads the box-score columns; a coach or team stat reads the game's
// own columns (the result, the score, the ranks at kickoff), which every
// ledger carries. A read is UNKNOWN (-1) where nobody recorded the stat that
// game; `since` is the first season the stat is recorded in every game, the
// era bound the words carry (the "vs ranked" stats begin with the AP poll in
// 1936; the player stats with ESPN's box scores in 2004; tackles and sacks
// later still, where the probe found them). `noun` is how a sum reads
// ("4,872 passing yards"), a test how a per-game threshold reads ("300+
// passing yards").

import { F_CONF, F_HOME, F_NEUTRAL, F_POST, F_TIE, F_WIN, RANK_UNKNOWN, UNRANKED, unkOf, type Kind, type Ledger, type StatCol } from './ledger.ts'

export type StatKey =
  // every kind
  | 'win' | 'loss'
  // coaches and teams
  | 'tie' | 'pf' | 'pa' | 'margin' | 'winrk' | 'wint10' | 'lossunr' | 'roadwin' | 'homewin' | 'confwin' | 'postwin' | 'shutout' | 'rout' | 'closewin' | 'upset' | 'winvsmajor'
  // players
  | 'payd' | 'patd' | 'int' | 'cmp' | 'att' | 'ruyd' | 'rutd' | 'car' | 'reyd' | 'retd' | 'rec'
  | 'td' | 'scrimtd' | 'totyd' | 'scrimyd' | 'fum' | 'fuml' | 'tkl' | 'sack' | 'tfl' | 'dint' | 'pd' | 'kryd' | 'pryd' | 'rettd' | 'fgm' | 'fga' | 'xpm' | 'pnt' | 'pyd'

/** a stat nobody recorded that game: a value no stat can take (yards run negative, so not -1) */
export const UNKNOWN = -99999

export interface Stat {
  key: StatKey
  /** which ledgers carry it */
  kinds: Kind[]
  /** plural noun for a total: "passing yards" */
  noun: string
  /** singular for a count of 1: "passing yard" */
  one: string
  /** the columns the read needs (none for a stat read off the game itself) */
  cols: StatCol[]
  /** the first season the stat is in every game; earlier careers sit out its fields. Per kind, since the ledgers begin in different years */
  since: Partial<Record<Kind, number>>
  read: (L: Ledger, i: number) => number
  /** the per-game thresholds the test picker offers */
  thresholds: number[]
  /** a bad thing: a fan wants the fewest */
  bad?: boolean
  /** the step a "fastest to" target moves by */
  tick?: number
}

const SPINE = 1869, POLL = 1936, BOX = 2004
const GAME: Kind[] = ['coach', 'team'], PLAYER: Kind[] = ['player'], ALL: Kind[] = ['player', 'coach', 'team']

const won = (L: Ledger, i: number) => (L.flags[i] & F_WIN) !== 0
const tied = (L: Ledger, i: number) => (L.flags[i] & F_TIE) !== 0
const lost = (L: Ledger, i: number) => !won(L, i) && !tied(L, i)
const ranked = (r: number) => r !== UNRANKED && r !== RANK_UNKNOWN
/** a rank-based read: unknown where no poll was in effect */
const vs = (L: Ledger, i: number, f: (ork: number) => boolean): number => (L.ork[i] === RANK_UNKNOWN ? UNKNOWN : f(L.ork[i]) ? 1 : 0)

const S = (key: StatKey, kinds: Kind[], noun: string, one: string, cols: StatCol[], since: Partial<Record<Kind, number>>, read: Stat['read'], thresholds: number[], extra: Partial<Stat> = {}): Stat => ({ key, kinds, noun, one, cols, since, read, thresholds, ...extra })
const val = (L: Ledger, k: StatCol, i: number) => { const c = L.col[k]; if (!c) return UNKNOWN; const v = c[i]; return v === unkOf(k) ? UNKNOWN : v }
const C = (k: StatCol) => (L: Ledger, i: number) => val(L, k, i)
const sum = (ks: StatCol[]) => (L: Ledger, i: number) => { let s = 0; for (const k of ks) { const v = val(L, k, i); if (v === UNKNOWN) return UNKNOWN; s += v }; return s }

const gameSince = { coach: SPINE, team: SPINE }, pollSince = { coach: POLL, team: POLL }, boxSince = { player: BOX }
/** tackles, sacks and defensive stats arrive later in ESPN's box; the builder measures the first full season and the catalog carries it */
export const DEF_SINCE = 2004
const defSince = { player: DEF_SINCE }

export const STATS: Stat[] = [
  S('win', ALL, 'wins', 'win', [], { player: BOX, ...gameSince }, (L, i) => (won(L, i) ? 1 : 0), [1], { tick: 25 }),
  S('loss', ALL, 'losses', 'loss', [], { player: BOX, ...gameSince }, (L, i) => (lost(L, i) ? 1 : 0), [1], { bad: true, tick: 25 }),
  // the game itself: coaches and teams
  S('tie', GAME, 'ties', 'tie', [], gameSince, (L, i) => (tied(L, i) ? 1 : 0), [1]),
  S('pf', GAME, 'points scored', 'point scored', [], gameSince, (L, i) => L.pf[i], [30, 40, 50, 60, 70], { tick: 500 }),
  S('pa', GAME, 'points allowed', 'point allowed', [], gameSince, (L, i) => L.pa[i], [0, 3, 7, 10, 14, 21], { bad: true, tick: 500 }),
  S('margin', GAME, 'points of margin', 'point of margin', [], gameSince, (L, i) => L.pf[i] - L.pa[i], [7, 14, 21, 28, 35], { tick: 500 }),
  S('winrk', GAME, 'wins vs ranked teams', 'win vs a ranked team', [], pollSince, (L, i) => vs(L, i, (r) => won(L, i) && ranked(r)), [1], { tick: 10 }),
  S('wint10', GAME, 'wins vs top-10 teams', 'win vs a top-10 team', [], pollSince, (L, i) => vs(L, i, (r) => won(L, i) && ranked(r) && r <= 10), [1], { tick: 5 }),
  S('lossunr', GAME, 'losses to unranked teams', 'loss to an unranked team', [], pollSince, (L, i) => vs(L, i, (r) => lost(L, i) && r === UNRANKED), [1], { bad: true, tick: 5 }),
  S('upset', GAME, 'wins as an unranked team over a ranked one', 'win as an unranked team over a ranked one', [], pollSince, (L, i) => (L.rk[i] === RANK_UNKNOWN || L.ork[i] === RANK_UNKNOWN ? UNKNOWN : won(L, i) && L.rk[i] === UNRANKED && ranked(L.ork[i]) ? 1 : 0), [1], { tick: 5 }),
  S('roadwin', GAME, 'road wins', 'road win', [], gameSince, (L, i) => (won(L, i) && (L.flags[i] & (F_HOME | F_NEUTRAL)) === 0 ? 1 : 0), [1], { tick: 10 }),
  S('homewin', GAME, 'home wins', 'home win', [], gameSince, (L, i) => (won(L, i) && (L.flags[i] & F_HOME) !== 0 ? 1 : 0), [1], { tick: 25 }),
  S('confwin', GAME, 'conference wins', 'conference win', [], gameSince, (L, i) => (won(L, i) && (L.flags[i] & F_CONF) !== 0 ? 1 : 0), [1], { tick: 10 }),
  S('postwin', GAME, 'bowl and playoff wins', 'bowl or playoff win', [], gameSince, (L, i) => (won(L, i) && (L.flags[i] & F_POST) !== 0 ? 1 : 0), [1], { tick: 5 }),
  S('shutout', GAME, 'shutouts', 'shutout', [], gameSince, (L, i) => (won(L, i) && L.pa[i] === 0 ? 1 : 0), [1], { tick: 10 }),
  S('rout', GAME, 'wins by 21 or more', 'win by 21 or more', [], gameSince, (L, i) => (won(L, i) && L.pf[i] - L.pa[i] >= 21 ? 1 : 0), [1], { tick: 25 }),
  S('closewin', GAME, 'one-score wins', 'one-score win', [], gameSince, (L, i) => (won(L, i) && L.pf[i] - L.pa[i] <= 8 ? 1 : 0), [1], { tick: 10 }),
  S('winvsmajor', GAME, 'wins vs major-college teams', 'win vs a major-college team', [], gameSince, (L, i) => (won(L, i) && (L.flags[i] & 64) !== 0 ? 1 : 0), [1], { tick: 25 }),
  // the box score: players
  S('payd', PLAYER, 'passing yards', 'passing yard', ['payd'], boxSince, C('payd'), [200, 250, 300, 350, 400, 500], { tick: 1000 }),
  S('patd', PLAYER, 'passing touchdowns', 'passing touchdown', ['patd'], boxSince, C('patd'), [1, 2, 3, 4, 5, 6], { tick: 10 }),
  S('int', PLAYER, 'interceptions thrown', 'interception thrown', ['int'], boxSince, C('int'), [0, 1, 2, 3, 4], { bad: true }),
  S('cmp', PLAYER, 'completions', 'completion', ['cmp'], boxSince, C('cmp'), [20, 25, 30, 35, 40], { tick: 100 }),
  S('att', PLAYER, 'pass attempts', 'pass attempt', ['att'], boxSince, C('att'), [30, 40, 50, 60], { tick: 100 }),
  S('ruyd', PLAYER, 'rushing yards', 'rushing yard', ['ruyd'], boxSince, C('ruyd'), [100, 150, 200, 250, 300], { tick: 500 }),
  S('rutd', PLAYER, 'rushing touchdowns', 'rushing touchdown', ['rutd'], boxSince, C('rutd'), [1, 2, 3, 4, 5], { tick: 10 }),
  S('car', PLAYER, 'carries', 'carry', ['car'], boxSince, C('car'), [20, 25, 30, 35, 40], { tick: 100 }),
  S('reyd', PLAYER, 'receiving yards', 'receiving yard', ['reyd'], boxSince, C('reyd'), [100, 150, 200, 250], { tick: 500 }),
  S('retd', PLAYER, 'receiving touchdowns', 'receiving touchdown', ['retd'], boxSince, C('retd'), [1, 2, 3, 4], { tick: 10 }),
  S('rec', PLAYER, 'receptions', 'reception', ['rec'], boxSince, C('rec'), [5, 8, 10, 12, 15], { tick: 50 }),
  S('td', PLAYER, 'touchdowns responsible for', 'touchdown responsible for', ['patd', 'rutd', 'retd'], boxSince, sum(['patd', 'rutd', 'retd']), [2, 3, 4, 5, 6, 7], { tick: 10 }),
  S('scrimtd', PLAYER, 'touchdowns from scrimmage', 'touchdown from scrimmage', ['rutd', 'retd'], boxSince, sum(['rutd', 'retd']), [1, 2, 3, 4, 5], { tick: 10 }),
  S('totyd', PLAYER, 'yards of total offense', 'yard of total offense', ['payd', 'ruyd'], boxSince, sum(['payd', 'ruyd']), [300, 400, 500, 600], { tick: 1000 }),
  S('scrimyd', PLAYER, 'yards from scrimmage', 'yard from scrimmage', ['ruyd', 'reyd'], boxSince, sum(['ruyd', 'reyd']), [100, 150, 200, 250, 300], { tick: 500 }),
  S('fum', PLAYER, 'fumbles', 'fumble', ['fum'], boxSince, C('fum'), [0, 1, 2, 3], { bad: true }),
  S('fuml', PLAYER, 'fumbles lost', 'fumble lost', ['fuml'], boxSince, C('fuml'), [0, 1, 2], { bad: true }),
  S('tkl', PLAYER, 'tackles', 'tackle', ['tkl'], defSince, C('tkl'), [8, 10, 12, 15, 20], { tick: 100 }),
  S('sack', PLAYER, 'sacks', 'sack', ['sack'], defSince, (L, i) => { const v = val(L, 'sack', i); return v === UNKNOWN ? UNKNOWN : v / 2 }, [1, 2, 3, 4], { tick: 5 }),
  S('tfl', PLAYER, 'tackles for loss', 'tackle for loss', ['tfl'], defSince, C('tfl'), [2, 3, 4, 5], { tick: 10 }),
  S('dint', PLAYER, 'interceptions', 'interception', ['dint'], boxSince, C('dint'), [1, 2, 3], { tick: 5 }),
  S('pd', PLAYER, 'passes defended', 'pass defended', ['pd'], defSince, C('pd'), [2, 3, 4, 5], { tick: 10 }),
  S('kryd', PLAYER, 'kick return yards', 'kick return yard', ['kryd'], boxSince, C('kryd'), [100, 150, 200], { tick: 500 }),
  S('pryd', PLAYER, 'punt return yards', 'punt return yard', ['pryd'], boxSince, C('pryd'), [50, 100, 150], { tick: 250 }),
  S('rettd', PLAYER, 'return touchdowns', 'return touchdown', ['krtd', 'prtd'], boxSince, sum(['krtd', 'prtd']), [1, 2], { tick: 2 }),
  S('fgm', PLAYER, 'field goals made', 'field goal made', ['fgm'], boxSince, C('fgm'), [2, 3, 4, 5, 6], { tick: 25 }),
  S('fga', PLAYER, 'field goal attempts', 'field goal attempt', ['fga'], boxSince, C('fga'), [3, 4, 5, 6], { tick: 25 }),
  S('xpm', PLAYER, 'extra points made', 'extra point made', ['xpm'], boxSince, C('xpm'), [5, 6, 7, 8, 9, 10], { tick: 50 }),
  S('pnt', PLAYER, 'punts', 'punt', ['pnt'], boxSince, C('pnt'), [6, 8, 10, 12], { tick: 50 }),
  S('pyd', PLAYER, 'punting yards', 'punting yard', ['pyd'], boxSince, C('pyd'), [300, 400, 500], { tick: 2500 }),
]

export const statByKey = (key: StatKey): Stat => {
  const s = STATS.find((x) => x.key === key)
  if (!s) throw new Error(`no stat ${key}`)
  return s
}
/** the catalog of one kind, in order */
export const statsFor = (kind: Kind): Stat[] => STATS.filter((s) => s.kinds.includes(kind))
export const statHasKind = (key: StatKey, kind: Kind): boolean => statByKey(key).kinds.includes(kind)
/** the first season the stat is in every game of this kind's ledger: the catalog's, pushed later by the ledger's own measure of its columns */
export const statSince = (s: Stat, kind: Kind, L?: Pick<Ledger, 'statSince'> | null): number => Math.max(s.since[kind] ?? 0, ...s.cols.map((c) => L?.statSince?.[c] ?? 0))

/** a count stat: a game either has one or doesn't, so its only test is "a shutout" */
export const isUnit = (s: Stat) => s.thresholds.length === 1 && s.thresholds[0] === 1

/** the words of a count: "1 win", "115 wins", "4,872 passing yards" */
export function countWords(n: number, stat: Stat): string {
  const v = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 })
  return `${v} ${n === 1 ? stat.one : stat.noun}`
}
