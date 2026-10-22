// The group pages: the best players of one position at one school ("the
// best wide receivers in Alabama history, since 2004") or in one conference
// ("the SEC's best quarterbacks"), from the player ledger. A page is a
// position's metrics, every qualifying player's totals over the games that
// count (a school's: the player's games for that team; a conference's: the
// games his team played as a member that season), ranked by the first
// metric, and the cumulative curve of each metric for the top few, drawn as
// one line per player. Pure: the prerender computes it once and embeds the
// result in the page, so the client needs no ledger.
import { F_WIN, type Ledger, type Pos } from './ledger.ts'
import { statByKey, UNKNOWN, type StatKey } from './stats.ts'
import { POS_WORDS } from './words.ts'

export type GroupKind = 'school' | 'conference'
export type GroupPos = Exclude<Pos, 'ALL'>

export interface Group {
  kind: GroupKind
  /** the team's id (a school) or the conference's slug */
  id: string
  name: string
  pos: GroupPos
}

/** the position's metrics, the first the one the page ranks by */
export const GROUP_METRICS: Record<GroupPos, StatKey[]> = {
  QB: ['payd', 'patd', 'win', 'totyd', 'int'],
  RB: ['ruyd', 'rutd', 'scrimyd', 'rec'],
  WR: ['reyd', 'rec', 'retd'],
  TE: ['reyd', 'rec', 'retd'],
  DEF: ['tkl', 'sack', 'tfl', 'dint'],
  K: ['fgm', 'xpm', 'fga'],
  P: ['pnt', 'pyd'],
}
export const GROUP_POS: GroupPos[] = ['QB', 'RB', 'WR', 'TE', 'DEF', 'K', 'P']

/** the position's slug in a page's address */
export const POS_SLUG: Record<GroupPos, string> = { QB: 'quarterbacks', RB: 'running-backs', WR: 'wide-receivers', TE: 'tight-ends', DEF: 'defenders', K: 'kickers', P: 'punters' }
export const posFromSlug = (slug: string): GroupPos | null => (Object.entries(POS_SLUG).find(([, s]) => s === slug)?.[0] as GroupPos | undefined) ?? null

/** the conferences with a page: the FBS conferences of the box-score era */
export const FBS_CONFS = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'American', 'Big East', 'Mountain West', 'MAC', 'Sun Belt', 'C-USA', 'WAC']
export const confSlug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const confFromSlug = (L: Pick<Ledger, 'confs'>, slug: string): string | null => L.confs.find((c) => confSlug(c) === slug) ?? null

/** how many curves a chart draws */
export const CURVES = 8
/** games a player needs in the group to be listed */
export const MIN_GAMES = 5

export interface GroupRow {
  id: string
  name: string
  from: number
  to: number
  games: number
  /** per metric, the total over the group's games; null where a game inside has the stat unrecorded */
  totals: (number | null)[]
  /** per metric, the cumulative value after each game, for the top rows only */
  curves?: (number[] | null)[]
}

export interface GroupData {
  kind: GroupKind
  id: string
  name: string
  pos: GroupPos
  metrics: StatKey[]
  /** the first season the ranking metric is recorded in every game */
  since: number
  currentSeason: number
  /** every qualifying player, ranked by the first metric */
  rows: GroupRow[]
}

const fmt = (n: number) => n.toLocaleString('en-US')

/** the group's games of one entity: the indexes that count */
function gamesIn(L: Ledger, lo: number, hi: number, g: Group, teamIdx: number | null, confIdx: number | null): number[] {
  const out: number[] = []
  for (let i = lo; i < hi; i++) {
    if (g.kind === 'school') { if (L.team[i] === teamIdx) out.push(i) }
    else { const t = L.teams[L.team[i]]; if (t && L.teamConf[t.id]?.[L.season[i]] === confIdx) out.push(i) }
  }
  return out
}

/** the page's data for one group */
export function groupData(L: Ledger, g: Group, { top = CURVES, minGames = MIN_GAMES } = {}): GroupData {
  if (L.kind !== 'player') throw new Error('groupData: the player ledger')
  const metrics = GROUP_METRICS[g.pos]
  const reads = metrics.map((k) => (k === 'win' ? (L: Ledger, i: number) => ((L.flags[i] & F_WIN) !== 0 ? 1 : 0) : statByKey(k).read))
  const teamIdx = g.kind === 'school' ? L.teams.findIndex((t) => (t.slug ?? t.id) === g.id) : null
  const confIdx = g.kind === 'conference' ? L.confs.indexOf(g.name) : null
  const rows: (GroupRow & { gs: number[] })[] = []
  for (const p of L.entities) {
    if (p.pos !== g.pos) continue
    const gs = gamesIn(L, p.lo, p.hi, g, teamIdx, confIdx)
    if (gs.length < minGames) continue
    const totals = metrics.map((_, m) => { let s = 0; for (const i of gs) { const v = reads[m](L, i); if (v === UNKNOWN) return null; s += v }; return s })
    rows.push({ id: p.id, name: p.name, from: L.season[gs[0]], to: L.season[gs[gs.length - 1]], games: gs.length, totals, gs })
  }
  const dir = statByKey(metrics[0]).bad ? 1 : -1
  rows.sort((a, b) => dir * ((a.totals[0] ?? -Infinity) - (b.totals[0] ?? -Infinity)) || b.games - a.games || a.name.localeCompare(b.name))
  for (const r of rows.slice(0, top)) {
    r.curves = metrics.map((_, m) => { if (r.totals[m] == null) return null; let cum = 0; return r.gs.map((i) => (cum += Math.max(0, reads[m](L, i)))) })
  }
  const since = Math.max(L.firstSeason, statByKey(metrics[0]).since.player ?? 0, ...statByKey(metrics[0]).cols.map((c) => L.statSince[c] ?? 0))
  return { kind: g.kind, id: g.id, name: g.name, pos: g.pos, metrics, since, currentSeason: L.currentSeason, rows: rows.map(({ gs, ...r }) => r) }
}

/** every school with a page: the ledger's teams that were major in the era, by name */
export function schoolsOf(L: Ledger): { id: string; name: string }[] {
  const seen = new Set<number>()
  for (let i = 0; i < L.n; i++) seen.add(L.team[i])
  return [...seen].map((i) => L.teams[i]).filter((t) => t && t.slug && L.teamConf[t.id]).map((t) => ({ id: t.slug!, name: t.name })).sort((a, b) => a.name.localeCompare(b.name))
}
/** the address id of a team by its index in the ledger */
export const schoolIdOf = (L: Ledger, teamIdx: number): string | null => L.teams[teamIdx]?.slug ?? null

export const groupPath = (g: Pick<Group, 'kind' | 'id' | 'pos'>): string => `/${g.kind}/${encodeURIComponent(g.id)}/${POS_SLUG[g.pos]}/`

/** "Alabama's best wide receivers since 2004", "The SEC's best quarterbacks since 2004" */
export const groupH1 = (d: Pick<GroupData, 'kind' | 'name' | 'pos' | 'since'>): string => `${d.kind === 'conference' ? 'The ' : ''}${d.name}'s best ${POS_WORDS[d.pos]} since ${d.since}`
/** "Best Alabama wide receivers of all time (since 2004)" */
export const groupTitle = (d: Pick<GroupData, 'kind' | 'name' | 'pos' | 'since'>, site: string): string => `Best ${d.name} ${POS_WORDS[d.pos]} of all time (since ${d.since}) · ${site}`

/** "DeVonta Smith leads with 3,965 receiving yards in 55 games at Alabama; Amari Cooper had 3,463." */
export function groupLead(d: GroupData): string {
  const stat = statByKey(d.metrics[0])
  const [a, b] = d.rows
  if (!a || a.totals[0] == null) return ''
  const where = d.kind === 'school' ? `at ${d.name}` : `in the ${d.name}`
  return `${a.name} leads with ${fmt(a.totals[0])} ${stat.noun} in ${a.games} games ${where}${b && b.totals[0] != null ? `; ${b.name} had ${fmt(b.totals[0])}` : ''}.`
}

export function groupDescription(d: GroupData): string {
  const stat = statByKey(d.metrics[0])
  const where = d.kind === 'school' ? `at ${d.name}` : `in the ${d.name}`
  return `${groupLead(d)} Every ${POS_WORDS[d.pos].replace(/s$/, '')} with ${MIN_GAMES} or more games ${where} since ${d.since}, ranked by ${stat.noun}, with each player's ${stat.noun} drawn game by game.`.replace(/\s+/g, ' ').trim()
}
