// The comparison: an open row read against a peer. The panel and the share
// words (share.ts) both use it, so a shared link's description says what the
// panel shows. Pure: rows in, curves and words out. The same module as the
// NBA Comparator's, over the three ledgers.
import type { Ledger } from './ledger.ts'
import { crossings, curve, toMatch, type Board, type Crossing, type Query, type Row } from './query.ts'
import { countWords, statByKey } from './stats.ts'
import { his, seqWords } from './words.ts'

/** the games ahead the "to match" line reads over */
export const K = 5

/** the peers a row can be read against: the rest of the board, forty at most */
export const peersOf = (board: Board, row: Row): Row[] => [...board.ranked, ...board.onTheWay].filter((r) => r.key !== row.key).slice(0, 40)

/** the peer a `vs` key names, else the first peer (the leader, or the next row) */
export const peerOf = (board: Board, row: Row, vs: string | null | undefined): Row | null => {
  const others = peersOf(board, row)
  return others.find((r) => r.key === vs) ?? others[0] ?? null
}

export interface Comparison {
  me: number[]
  them: number[]
  /** the last six crossings inside the window, latest first */
  xs: Crossing[]
  /** what the subject needs over the next K to match the peer there */
  match: { need: number; at: number } | null
  /** the chart's window */
  n: number
}

/** null for an entity-season board or a test board: no curve to draw */
export function compare(L: Ledger, row: Row, peer: Row, q: Query): Comparison | null {
  if (q.seq === 'teamGames' || q.how === 'every' || q.how === 'count' || q.how === 'streak') return null
  const cq = q.how === 'reach' ? { ...q, how: 'sum' as const } : q
  const me = curve(L, row, cq), them = curve(L, peer, cq)
  const xs = crossings(me, them).filter((c) => c.n <= Math.max(q.n, me.length)).slice(-6).reverse()
  const match = q.how === 'sum' ? toMatch(me.slice(0, Math.max(row.reached, Math.min(me.length, q.n))), them, K) : null
  const n = q.how === 'reach' ? Math.max(row.value ?? 0, peer.value ?? 0) : q.n
  return { me, them, xs, match, n }
}

const unit = (q: Query) => (q.seq === 'seasons' ? 'season' : 'game')

/** "passed Kirby Smart at game 46, 40 wins" */
export const crossingWords = (c: Crossing, peer: Row, q: Query) => `${c.kind} ${peer.entity.name} at ${unit(q)} ${c.n}, ${countWords(c.value, statByKey(q.stat))}`

/** "To match Kirby Smart's 100 wins at game 119, Ryan Day needs 6 wins over his next 5 games." */
export function matchWords(row: Row, peer: Row, cmp: Comparison, q: Query): string | null {
  if (!cmp.match) return null
  const stat = statByKey(q.stat)
  const m = cmp.match
  const p = his(q.kind)
  return `To match ${peer.entity.name}'s ${countWords(cmp.them[m.at - 1], stat)} at ${unit(q)} ${m.at}, ${row.entity.name} needs ${countWords(Math.max(0, m.need), stat)} over ${p} next ${K} ${seqWords(q.seq === 'tenure' ? 'games' : q.seq, K, q.kind)}${m.need <= 0 ? ` (${q.kind === 'team' ? 'it' : 'he'} is already past it)` : ''}.`
}
