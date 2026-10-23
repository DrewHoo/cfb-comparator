// The words of a query and of a row: the sentence the pickers sit in, the
// claim a row makes. Pure, so the prerender, the panel and a share card say
// the same thing. A season is its year; the era slot says "since 1936".
import { seasonWords, type Kind, type Pos } from './ledger.ts'
import type { Query, Row, Seq, Test } from './query.ts'
import { countWords, isUnit, statByKey } from './stats.ts'

const fmt = (n: number) => n.toLocaleString('en-US')

export const POS_WORDS: Record<Pos, string> = { ALL: 'players', QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers', TE: 'tight ends', DEF: 'defenders', K: 'kickers', P: 'punters' }
export const KIND_WORDS: Record<Kind, string> = { player: 'players', coach: 'head coaches', team: 'teams' }
export const KIND_ONE: Record<Kind, string> = { player: 'player', coach: 'head coach', team: 'team' }

/** the possessive pronoun of a kind: a coach's, a player's, a team's */
export const his = (kind: Kind): string => (kind === 'team' ? 'its' : 'his')
export const he = (kind: Kind): string => (kind === 'team' ? 'it' : 'he')

/** who the field is: "quarterbacks", "head coaches", "teams" */
export const whoWords = (q: Pick<Query, 'kind' | 'pos'>): string => (q.kind === 'player' ? POS_WORDS[q.pos] : KIND_WORDS[q.kind])

/** the unit of a board's rows: "careers", "tenures", "coach-seasons" */
export function unitWords(q: Pick<Query, 'kind' | 'seq'>): string {
  if (q.seq === 'teamGames') return q.kind === 'team' ? 'team-seasons' : `${KIND_ONE[q.kind].replace('head ', '')}-seasons`
  if (q.seq === 'tenure') return q.kind === 'player' ? 'stints' : 'tenures'
  return q.kind === 'team' ? 'programs' : 'careers'
}

/** the sequence's noun, plural: "games", "seasons", "games at one school", "games of a season" */
export function seqWords(seq: Seq, n: number, kind: Kind = 'coach'): string {
  const game = n === 1 ? 'game' : 'games'
  if (seq === 'seasons') return n === 1 ? 'season' : 'seasons'
  if (seq === 'teamGames') return `${game} of a season`
  if (seq === 'tenure') return `${game} at one ${kind === 'player' ? 'school' : 'school'}`
  return game
}

/** "300+ passing yards", "no interceptions thrown", "a shutout", "a win" */
export function testWords(t: Test): string {
  const s = statByKey(t.stat)
  if (t.max === 0 && t.min === 0) return `no ${s.noun}`
  if (t.max != null) return `${t.min}–${t.max} ${s.noun}`
  if (t.min === 1 && isUnit(s)) return `a ${s.one}`
  return `${t.min}+ ${s.noun}`
}

export const testsWords = (tests: Test[]) => tests.map(testWords).join(' and ')

/** "their first 50 games" / "their first 50 games at one school" / "their team's first 10 games of a season" / "the first 10 games of a season" */
export function windowWords(q: Query): string {
  if (q.seq === 'teamGames') return q.kind === 'team' ? `the first ${q.n} ${seqWords(q.seq, q.n)}` : `their team's first ${q.n} ${seqWords(q.seq, q.n)}`
  return `their first ${fmt(q.n)} ${seqWords(q.seq, q.n, q.kind)}`
}

/** " since 1936", or nothing for the whole ledger */
export const eraWords = (since: number | null) => (since ? ` since ${seasonWords(since)}` : '')

/** ", regular season only" or ", bowls included", where the scope can move the number */
export function scopeWords(q: Pick<Query, 'scope' | 'seq' | 'n'>): string {
  if (q.seq === 'teamGames' && q.n <= 12) return ''
  return q.scope === 'all' ? ', bowls included' : ', regular season only'
}

/** the whole sentence, for a title or a card; `bound` is the era the data forces when the reader set none (query.ts `eraBound`) */
export function queryWords(q: Query, bound: number | null = null): string {
  const who = whoWords(q)
  const stat = statByKey(q.stat)
  const era = eraWords(q.since ?? bound)
  const scope = scopeWords(q)
  if (q.how === 'sum') return `${who} with the ${q.dir} ${stat.noun} through ${windowWords(q)}${scope}${era}`
  if (q.how === 'reach') return `${who} ${q.dir === 'fewest' ? 'fastest' : 'slowest'} to ${countWords(q.n, stat)}, by ${seqWords(q.seq, 2, q.kind)}${scope}${era}`
  const t = testsWords(q.tests)
  if (q.how === 'every') return `${who} with ${t} in each of ${windowWords(q)}${scope}${era}`
  if (q.how === 'streak') return `${who} with the longest streak of games with ${t} in ${windowWords(q)}${scope}${era}`
  return `${who} with the ${q.dir} games with ${t} in ${windowWords(q)}${scope}${era}`
}

const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]) }

/** a row's name with its season or school: "Joe Burrow (2019 LSU)", "Yale (1886)", "Nick Saban (Alabama)" */
export const rowName = (r: Row) => (r.season != null ? `${r.entity.name} (${seasonWords(r.season)}${r.team && r.team !== r.entity.name ? ` ${r.team}` : ''})` : r.stint != null ? `${r.entity.name} (${r.team})` : r.entity.name)

/** the row's claim: "100 wins through his first 119 games", "60 passing touchdowns through LSU's first 15 games of 2019", "all 9 of Michigan's games of 1947" */
export function rowWords(r: Row, q: Query, kind: Kind = q.kind): string {
  const stat = statByKey(q.stat)
  const scope = scopeWords(q)
  const p = his(kind)
  const win = r.season != null
    ? (r.complete && r.reached < q.n ? (r.reached === 1 ? `${r.team}'s only game of ${seasonWords(r.season)}` : `all ${r.reached} of ${r.team}'s games of ${seasonWords(r.season)}`) : `${r.team}'s first ${q.n} games of ${seasonWords(r.season)}`)
    : r.stint != null
      ? (r.complete && r.reached < q.n ? (r.reached === 1 ? `${p} only game at ${r.team}` : `all ${fmt(r.reached)} of ${p} games at ${r.team}`) : `${r.complete ? `${p} first` : p} ${fmt(r.reached)} ${r.reached === 1 ? 'game' : 'games'} at ${r.team}`)
      : r.complete && r.reached < q.n
        ? (r.reached === 1 ? `${p} only ${seqWords(q.seq, 1, kind)}` : `all ${fmt(r.reached)} of ${p} ${seqWords(q.seq, r.reached, kind)}`)
        : `${r.complete ? `${p} first` : p} ${fmt(r.reached)} ${seqWords(q.seq, r.reached, kind)}`
  if (r.value == null) return `${fmt(r.reached)} ${seqWords(q.seq, r.reached, kind)} and still short of ${countWords(q.n, stat)}`
  if (q.how === 'sum') return `${countWords(r.value, stat)} through ${win}${scope}`
  if (q.how === 'reach') return `${countWords(q.n, stat)} in ${fmt(r.value)} ${seqWords(q.seq, r.value, kind)}${r.stint != null ? ` at ${r.team}` : ''}${scope}`
  const t = testsWords(q.tests)
  if (q.how === 'every') return r.all ? `${t} in each of ${win}${scope}` : `${t} in ${fmt(r.value)} of ${win}${scope}`
  if (q.how === 'streak') return `${fmt(r.value)} straight ${r.value === 1 ? 'game' : 'games'} with ${t} in ${win}${scope}`
  return `${r.value} ${r.value === 1 ? 'game' : 'games'} with ${t} in ${win}${scope}`
}

/** "1st of 212", "T-3rd of 212" */
export const rankWords = (r: Row, field: number) => `${r.tied ? 'T-' : ''}${ord(r.rank)} of ${fmt(field)}`

// ---- a record row (src/lib/records.ts): the claim, its place, its run

import type { RecordRow } from './records.ts'
import { fmtDate } from './ledger.ts'

/** "39 games with 300+ passing yards in his first 40 games", "100 wins in 119 games", "60 passing touchdowns through LSU's first 15 games of 2019" */
export function recordWords(r: RecordRow): string {
  const s = r.shape, stat = statByKey(s.stat)
  const p = his(s.kind)
  const win = s.seq === 'teamGames' ? `${r.team}'s first ${r.at} games of ${seasonWords(r.season!)}` : s.seq === 'tenure' ? `${p} first ${fmt(r.at)} games at ${r.team}` : `${p} first ${fmt(r.at)} ${seqWords(s.seq, r.at, s.kind)}`
  const scope = scopeWords({ ...s, n: r.at })
  if (s.how === 'sum') return `${countWords(r.value, stat)} through ${win}${scope}`
  if (s.how === 'reach') return `${countWords(r.at, stat)} in ${fmt(r.value)} ${seqWords(s.seq, r.value, s.kind)}${s.seq === 'tenure' ? ` at ${r.team}` : ''}${scope}`
  const t = testsWords(s.tests)
  if (s.how === 'every') return `${t} in each of ${win}${scope}`
  if (s.how === 'streak') return `${fmt(r.value)} straight ${r.value === 1 ? 'game' : 'games'} with ${t} in ${win}${scope}`
  return `${fmt(r.value)} ${r.value === 1 ? 'game' : 'games'} with ${t} in ${win}${scope}`
}

/** "1st of 23, next 15", "one of 4 of 957", "a record at the time, 1st of 154" */
export function placeWords(r: RecordRow): string {
  const stat = statByKey(r.shape.stat)
  const f = (v: number) => (r.shape.how === 'reach' ? `${fmt(v)} ${seqWords(r.shape.seq, v, r.shape.kind)}` : r.shape.how === 'sum' ? countWords(v, stat) : fmt(v))
  const who = unitWords({ kind: r.shape.kind, seq: r.shape.seq })
  const pr = he(r.shape.kind)
  if (r.kind === 'set') return `a record when ${pr} got there, 1st of ${r.field.toLocaleString('en-US')} ${who}${r.second != null ? `, past ${f(r.second)}` : ''}`
  if (r.ties > 1) return `one of ${r.ties}, of ${r.field.toLocaleString('en-US')} ${who}`
  return `1st of ${r.field.toLocaleString('en-US')} ${who}${r.second != null ? `, next ${f(r.second)}` : ''}`
}

/** "leads from game 112 to 144", "fastest to every milestone from 500 to 5,000", "at game 14 only", "and counting" */
export function runWords(r: RecordRow, minN: number): string {
  const s = r.shape, stat = statByKey(s.stat)
  const unit = s.seq === 'teamGames' || s.seq === 'tenure' ? 'game' : seqWords(s.seq, 1, s.kind)
  if (s.how === 'reach') return r.lo === r.hi ? '' : `fastest to every milestone from ${(r.from ?? r.at).toLocaleString('en-US')} to ${countWords(r.at, stat)}`
  const verb = r.kind === 'set' ? 'held' : 'leads'
  const holes = r.holes ? ` (${r.holes} ${r.holes === 1 ? 'gap' : 'gaps'})` : ''
  if (r.lo === r.hi) return `at ${unit} ${r.at} only`
  const from = r.lo <= minN ? 'from the start' : `from ${unit} ${r.lo}`
  return r.live ? `${verb} ${from}, and counting${holes}` : `${verb} ${from} to ${r.hi}${holes}`
}

/** "broken by Joe Burrow 2019, 60 passing touchdowns, Jan 13, 2020" */
export function breakerWords(r: RecordRow): string {
  if (!r.breaker) return ''
  const stat = statByKey(r.shape.stat)
  const v = r.shape.how === 'sum' ? countWords(r.breaker.value, stat) : String(r.breaker.value)
  return `broken by ${r.breaker.name}${r.breaker.season ? ` ${seasonWords(r.breaker.season)}` : ''}, ${v}, ${fmtDate(r.breaker.date)}`
}

// ---- the short form, for a card's heading and a title

/** "most wins through 50 games", "fastest to 100 wins", "most games with 300+ passing yards in a team's first 10 games" */
export function headWords(q: Query): string {
  const stat = statByKey(q.stat)
  const win = q.seq === 'teamGames' ? `a team's first ${q.n} games` : `${fmt(q.n)} ${seqWords(q.seq, q.n, q.kind)}`
  if (q.how === 'sum') return `${q.dir} ${stat.noun} through ${win}`
  if (q.how === 'reach') return `${q.dir === 'fewest' ? 'fastest' : 'slowest'} to ${countWords(q.n, stat)}`
  const t = testsWords(q.tests)
  if (q.how === 'every') return `${t} in each of ${q.seq === 'teamGames' ? win : `the first ${win}`}`
  if (q.how === 'streak') return `longest streak with ${t} in ${q.seq === 'teamGames' ? win : `the first ${win}`}`
  return `${q.dir} games with ${t} in ${q.seq === 'teamGames' ? win : `the first ${win}`}`
}

/** "every head coaching career", "every quarterback season", "every program" (lowercase, for the footnote under the sentence) */
export const everyWordsPlain = (q: Pick<Query, 'kind' | 'pos' | 'seq'>): string => {
  const one = q.kind === 'player' ? (q.pos === 'ALL' ? 'player' : POS_WORDS[q.pos].replace(/s$/, '')) : KIND_ONE[q.kind]
  if (q.seq === 'teamGames') return `every ${one} season`
  if (q.seq === 'tenure') return `every ${one} tenure`
  return q.kind === 'team' ? 'every program' : `every ${one.replace('head ', 'head-coaching ')} career`
}
