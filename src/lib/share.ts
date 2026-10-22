// The words a shared address carries: a board's title and description, a
// comparison's, an entity page's, the share button's text, the rows a card
// draws. Pure, so the share worker (workers/share), the share button, the
// tab title, the prerender and the tests all say the same thing; the worker
// adds the data. The comparison itself (curves, crossings, the to-match
// line) is compare.ts; the record words are words.ts.
import { spanWords, type Kind, type Ledger, type Pos } from './ledger.ts'
import type { Board, Query, Row } from './query.ts'
import { DEFAULT_QUERY, eraBound } from './query.ts'
import { compare, crossingWords, matchWords } from './compare.ts'
import type { RecordRow } from './records.ts'
import { statByKey } from './stats.ts'
import { KIND_ONE, KIND_WORDS, POS_WORDS, eraWords, he, placeWords, queryWords, recordWords, rowName, rowWords, rankWords, seqWords, testsWords, unitWords } from './words.ts'

export const SITE = 'College Football Comparator'

export interface ShareText { title: string; description: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** the row's claim as one sentence: "Kirby Smart has 100 wins through his first 119 games, 1st of 1,811 careers since 1936." */
export function claimWords(q: Query, board: Board, row: Row): string {
  const tail = row.complete && row.value != null ? `, ${rankWords(row, board.ranked.length)} ${unitWords(q)}${eraWords(eraBound(q, board))}` : row.value == null ? '' : ', still inside the window'
  return `${row.entity.name} has ${rowWords(row, q)}${tail}.`
}

/** what the share button sends with the board's address: the open row's claim, else the sentence */
export const shareText = (q: Query, board: Board | null, row: Row | null) => (board && row ? claimWords(q, board, row) : `${cap(queryWords(q, board ? eraBound(q, board) : null))}.`)

/** whether the address says more than the root page does: any slot off its default, or a row open */
export function isShared(q: Query, open: string | null): boolean {
  if (open) return true
  const d = DEFAULT_QUERY
  return q.kind !== d.kind || q.pos !== d.pos || q.stat !== d.stat || q.how !== d.how || q.n !== d.n || q.seq !== d.seq || q.scope !== d.scope || q.since !== d.since || q.dir !== d.dir || q.tests.length > 0
}

/** "Head coaches with the most wins through their first 50 games · College Football Comparator"; with a row open, "Ryan Day vs Kirby Smart: most wins through the first 50 games · …" */
export function shareTitle(q: Query, open: Row | null = null, peer: Row | null = null, bound: number | null = null): string {
  if (open) return `${rowName(open)}${peer ? ` vs ${rowName(peer)}` : ''}: ${cardHeading(q)} · ${SITE}`
  return `${cap(queryWords(q, bound))} · ${SITE}`
}

/** "Every FBS head coach", "Every FBS quarterback", "Every FBS program" */
export const everyWords = (q: Pick<Query, 'kind' | 'pos' | 'seq'>): string => {
  const one = q.kind === 'player' ? (q.pos === 'ALL' ? 'player' : POS_WORDS[q.pos].replace(/s$/, '')) : KIND_ONE[q.kind]
  const unit = q.seq === 'teamGames' ? `${one} season` : q.seq === 'tenure' ? `${one} tenure` : q.kind === 'team' ? 'program' : `${one} career`
  return `Every FBS ${unit}`
}

/** the description: the leader when the board is known; the open row's claim, read against its peer, when one is */
export function shareDescription(q: Query, L: Ledger | null, board: Board | null, open: Row | null, firstSeason: number, peer: Row | null = null): string {
  const bound = board ? eraBound(q, board) : q.since
  const parts: string[] = []
  if (open) {
    parts.push(board ? claimWords(q, board, open) : `${open.entity.name} has ${rowWords(open, q)}.`)
    if (peer && L) {
      if (peer.value != null) parts.push(`${rowName(peer)}: ${rowWords(peer, q)}.`)
      const cmp = compare(L, open, peer, q)
      if (cmp) {
        parts.push(cmp.xs[0] ? `${open.entity.name} ${crossingWords(cmp.xs[0], peer, q)}.` : 'Their curves never met.')
        const m = matchWords(open, peer, cmp, q)
        if (m) parts.push(m)
      }
    }
  } else if (board?.ranked[0] && board.ranked[0].value != null) parts.push(`${rowName(board.ranked[0])} leads with ${rowWords(board.ranked[0], q)}.`)
  parts.push(`${everyWords(q)}${eraWords(bound ?? firstSeason)} ranked at the same point: ${queryWords(q, bound)}. Open a row to read it against a peer.`)
  return parts.join(' ')
}

/** what the card's heading says: "MOST WINS THROUGH THE FIRST 50 GAMES" */
export function cardHeading(q: Query): string {
  const stat = statByKey(q.stat)
  const win = q.seq === 'teamGames' ? `a team's first ${q.n} games` : `the first ${q.n} ${seqWords(q.seq, q.n, q.kind)}`
  if (q.how === 'sum') return `${q.dir} ${stat.noun} through ${win}`
  if (q.how === 'reach') return `${q.dir === 'fewest' ? 'fastest' : 'slowest'} to ${q.n.toLocaleString('en-US')} ${stat.noun}`
  const t = testsWords(q.tests)
  if (q.how === 'every') return `${t} in each of ${win}`
  if (q.how === 'streak') return `longest streak of ${t} in ${win}`
  return `${q.dir} games of ${t} in ${win}`
}

export interface CardRow {
  rank: string
  name: string
  /** "2016–2024", or "thru 93" for a row still inside the window */
  span: string
  value: string
  /** the row still inside the window: the value in rust */
  live: boolean
  /** the open row */
  hi: boolean
}

/** the card's rows: the top of the board, with the open row in place of the last when it is further down */
export function cardRows(board: Board, q: Query, open: string | null, n = 6): CardRow[] {
  const all = [...board.ranked, ...board.onTheWay]
  const top = board.ranked.slice(0, n)
  const openRow = open ? all.find((r) => r.key === open) ?? null : null
  if (openRow && !top.includes(openRow)) top.splice(Math.max(0, Math.min(top.length, n - 1)), top.length >= n ? 1 : 0, openRow)
  const way = (r: Row) => r.season == null && !r.complete
  return top.map((r) => ({
    rank: r.complete && r.value != null ? `${r.tied ? 'T' : ''}${r.rank}` : '—',
    name: rowName(r),
    span: way(r) ? `thru ${r.reached}` : r.season != null ? (r.reached < q.n ? `all ${r.reached}` : `${r.reached} of ${q.n}`) : spanWords(r.from, r.to),
    value: r.value == null ? '—' : q.how === 'reach' ? `${r.value}` : r.value.toLocaleString('en-US'),
    live: way(r),
    hi: r.key === open,
  }))
}

// ---- an entity page

/** the field an entity's page ranks against: "head coaches", "players", "teams" */
export const fieldWords = (kind: Kind, pos: Pos | null = null): string => (kind === 'player' ? POS_WORDS[pos ?? 'ALL'] : KIND_WORDS[kind])

/** the page's one line: the best row, else what the page is */
export function entityLead(kind: Kind, name: string, pos: Pos | null, face: RecordRow | null | undefined, firstSeason: number): string {
  return face ? `${name}: ${recordWords(face)}, ${placeWords(face)}.` : `Every comparison ${name} leads among ${fieldWords(kind, pos)} at the same point${kind === 'team' ? '' : ' in the career'}${eraWords(firstSeason)}.`
}

/** an entity page's head; the title is the fact people type: "Nick Saban: every comparison he leads at the same point in a career · College Football Comparator" */
export function entityText(kind: Kind, name: string, pos: Pos | null, face: RecordRow | null | undefined, firstSeason: number, site = SITE): ShareText {
  const lead = entityLead(kind, name, pos, face, firstSeason)
  const where = kind === 'team' ? 'at the same point' : 'at the same point in a career'
  const rest = ` Every comparison ${he(kind)} leads among ${fieldWords(kind, pos)} ${where}${eraWords(firstSeason)}.`
  return { title: `${name}: every comparison ${he(kind)} leads ${where} · ${site}`, description: face ? `${lead}${rest}` : lead }
}
