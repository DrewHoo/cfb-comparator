import { describe, expect, it } from 'vitest'
import { cardHeading, isShared, shareTitle, SITE } from './share.ts'
import { queryWords } from './words.ts'
import { DEFAULT_QUERY } from './query.ts'

describe('the words a link carries', () => {
  it('the default board is not a shared address; any slot off its default is', () => {
    expect(isShared(DEFAULT_QUERY, null)).toBe(false)
    expect(isShared({ ...DEFAULT_QUERY, n: 100 }, null)).toBe(true)
    expect(isShared({ ...DEFAULT_QUERY, kind: 'team' }, null)).toBe(true)
    expect(isShared(DEFAULT_QUERY, 'c1050')).toBe(true)
  })
  it('the sentence names the kind, the window and the scope', () => {
    expect(queryWords(DEFAULT_QUERY)).toBe('head coaches with the most wins through their first 50 games, bowls included')
    expect(queryWords({ ...DEFAULT_QUERY, kind: 'player', pos: 'QB', stat: 'payd', seq: 'teamGames', n: 10 })).toBe("quarterbacks with the most passing yards through their team's first 10 games of a season")
    expect(queryWords({ ...DEFAULT_QUERY, seq: 'tenure', n: 100, scope: 'reg' })).toBe('head coaches with the most wins through their first 100 games at one school, regular season only')
    expect(queryWords({ ...DEFAULT_QUERY, how: 'reach', n: 100, dir: 'fewest' }, 1936)).toBe('head coaches fastest to 100 wins, by games, bowls included since 1936')
    expect(queryWords({ ...DEFAULT_QUERY, kind: 'team', stat: 'pf', seq: 'teamGames', n: 6 })).toBe('teams with the most points scored through the first 6 games of a season')
  })
  it('the title and the card heading', () => {
    expect(shareTitle({ ...DEFAULT_QUERY, n: 100 })).toBe(`Head coaches with the most wins through their first 100 games, bowls included · ${SITE}`)
    expect(cardHeading({ ...DEFAULT_QUERY, how: 'reach', n: 100, dir: 'fewest' })).toBe('fastest to 100 wins')
    expect(cardHeading({ ...DEFAULT_QUERY, seq: 'tenure' })).toBe('most wins through the first 50 games at one school')
  })
})
