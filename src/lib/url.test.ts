import { describe, expect, it } from 'vitest'
import { parseUrl, toUrl, hrefOf, parseAddress } from './url.ts'
import { DEFAULT_QUERY } from './query.ts'

describe('the url', () => {
  it('round-trips every slot, defaults omitted', () => {
    expect(toUrl({ query: DEFAULT_QUERY, open: null })).toBe('')
    const q = { ...DEFAULT_QUERY, kind: 'player' as const, pos: 'QB' as const, stat: 'payd' as const, n: 10, seq: 'teamGames' as const, scope: 'reg' as const, since: 2014, dir: 'fewest' as const }
    const s = toUrl({ query: q, open: '3915511', vs: '191981' })
    expect(s).toBe('?kind=player&pos=QB&stat=payd&n=10&seq=teamGames&scope=reg&since=2014&dir=fewest&t=3915511&vs=191981')
    const back = parseUrl(s)
    expect(back.query).toEqual(q)
    expect(back.open).toBe('3915511')
    expect(back.vs).toBe('191981')
  })
  it('writes tests only for a count, every or streak, and reads them back', () => {
    const q = { ...DEFAULT_QUERY, how: 'count' as const, tests: [{ stat: 'win' as const, min: 1 }, { stat: 'pa' as const, min: 0, max: 0 }] }
    const s = toUrl({ query: q, open: null })
    expect(s).toContain('tests=win%3A1%2Cpa%3A0-0')
    expect(parseUrl(s).query.tests).toEqual(q.tests)
  })
  it('drops a stat the kind lacks and a position off a player board', () => {
    expect(parseUrl('?kind=coach&stat=payd').query.stat).toBe('win')
    expect(parseUrl('?kind=coach&pos=QB').query.pos).toBe('ALL')
    expect(parseUrl('?kind=team&seq=tenure').query.seq).toBe('games')
  })
  it('a landing path is the query’s canonical address, and reads with a query string on top', () => {
    const q = { ...DEFAULT_QUERY, how: 'reach' as const, n: 100, dir: 'fewest' as const, seq: 'games' as const }
    expect(hrefOf({ query: q, open: null })).toBe('/fastest-to-100-wins-as-a-head-coach/')
    expect(hrefOf({ query: q, open: 'c1050' })).toBe('/fastest-to-100-wins-as-a-head-coach/?t=c1050')
    const s = parseAddress('/cfb-comparator/fastest-to-100-wins-as-a-head-coach/', '?t=c1050', '/cfb-comparator/')
    expect(s.query.how).toBe('reach')
    expect(s.open).toBe('c1050')
  })
})
