// The known-answer gate: published factoids the ledgers have to reproduce,
// from the researched corpora under research/ (every row with a receipt).
// Each pin says where the data's definition differs from the publisher's.
// The ledgers are the committed ones (src/data), every column loaded.
import { describe, expect, it } from 'vitest'
import { loadLedger } from '../../scripts/lib/ledger-node.mjs'
import type { Ledger } from './ledger.ts'
import { evaluate, DEFAULT_QUERY, type Board, type Query } from './query.ts'

const C: Ledger = loadLedger('coach'), T: Ledger = loadLedger('team'), P: Ledger = loadLedger('player')
const q = (L: Ledger, patch: Partial<Query>) => evaluate(L, { ...DEFAULT_QUERY, kind: L.kind, ...patch })
const row = (b: Board, name: string, season?: number) => [...b.ranked, ...b.onTheWay].find((r) => r.entity.name === name && (season == null || r.season === season))
const season = (L: Ledger, name: string, year: number, stat: Query['stat'], pos: Query['pos'] = 'ALL') => row(q(L, { stat, pos, seq: 'teamGames', n: 16 }), name, year)?.value
const career = (L: Ledger, name: string, stat: Query['stat'], pos: Query['pos'] = 'ALL') => row(q(L, { stat, pos, n: 2000 }), name)?.value
const reach = (L: Ledger, name: string, stat: Query['stat'], n: number) => row(q(L, { how: 'reach', stat, n, dir: 'fewest' }), name)?.value

describe('the ledgers', () => {
  it('span the sport: the spine from 1869, the box scores from 2004, three ledgers of the running season', () => {
    expect(C.firstSeason).toBe(1869)
    expect(T.firstSeason).toBe(1869)
    expect(P.firstSeason).toBe(2004)
    expect(C.currentSeason).toBe(T.currentSeason)
    expect(P.currentSeason).toBe(C.currentSeason)
    expect(C.entities.every((p) => !p.censored)).toBe(true)
  })
})

describe('head coaches (the NCAA coaching record book, on-field results, bowls included)', () => {
  it('career totals', () => {
    expect(career(C, 'Knute Rockne', 'win')).toBe(105)
    expect(career(C, 'Knute Rockne', 'loss')).toBe(12)
    expect(career(C, 'Bear Bryant', 'win')).toBe(323)
    expect(career(C, 'Joe Paterno', 'win')).toBe(409) // the NCAA vacated 111 in 2012 and restored them in 2015
    expect(career(C, 'Tom Osborne', 'win')).toBe(255)
    expect(career(C, 'Tom Osborne', 'loss')).toBe(49)
    expect(career(C, 'Urban Meyer', 'win')).toBe(187)
    expect(career(C, 'David Beaty', 'loss')).toBe(42)
    // on-field: the NCAA says 292 (five 2007 Alabama wins vacated) and 377 (12 FSU wins vacated, plus his Samford years, which weren't major-college)
    expect(career(C, 'Nick Saban', 'win')).toBe(297)
    expect(career(C, 'Bobby Bowden', 'win')).toBe(357)
  })
  it('windows and milestones', () => {
    expect(row(q(C, { n: 100 }), 'Kirby Smart')?.value).toBe(85) // CBS
    expect(reach(C, 'Kirby Smart', 'win', 100)).toBe(117)
    expect(reach(C, 'Chris Petersen', 'win', 100)).toBe(117) // the NCAA book says 118; Washington and Georgia say 117
    expect(reach(C, 'George Washington Woodruff', 'win', 100)).toBe(111) // the NCAA book says 109; Howell's Penn pages have two more games
    expect(reach(C, 'Joe Paterno', 'win', 200)).toBe(246)
    expect(row(q(C, { seq: 'tenure', n: 100 }), 'Nick Saban')?.value).toBe(84) // CBS; the five vacated 2007 wins included
    expect(row(q(C, { how: 'streak', tests: [{ stat: 'win', min: 1 }], seq: 'tenure', n: 30 }), 'Urban Meyer')?.value).toBe(24)
    expect(row(q(C, { how: 'streak', tests: [{ stat: 'win', min: 1 }], n: 2000 }), 'Bud Wilkinson')?.value).toBe(47)
    expect(row(q(C, { seq: 'seasons', n: 1 }), 'Chris Petersen')?.value).toBe(13)
    expect(row(q(C, { seq: 'seasons', n: 5 }), 'Chris Petersen')?.value).toBe(61)
    expect(row(q(C, { seq: 'seasons', n: 5 }), 'Walter Camp')?.value).toBe(68) // the NCAA says 69, counting a tie as half a win
    expect(row(q(C, { seq: 'seasons', n: 15 }), 'Urban Meyer')?.value).toBe(165)
    expect(row(q(C, { seq: 'seasons', n: 20 }), 'Tom Osborne')?.value).toBe(195)
    expect(row(q(C, { seq: 'seasons', n: 4 }), 'Lincoln Riley')?.value).toBe(45)
    expect(row(q(C, { seq: 'seasons', n: 3 }), 'Dan Lanning')?.value).toBe(35)
    expect(row(q(C, { seq: 'tenure', n: 29 }), 'Curt Cignetti')?.value).toBe(27)
  })
  it('a finished career fills a longer window whole; an active one is still inside it', () => {
    const b = q(C, { n: 2000 })
    expect(row(b, 'Joe Paterno')?.complete).toBe(true)
    expect(b.ranked[0].entity.name).toBe('Joe Paterno')
    expect(row(b, 'Kirby Smart')?.complete).toBe(false)
  })
})

describe('teams', () => {
  it('streaks and seasons', () => {
    const streaks = q(T, { how: 'streak', tests: [{ stat: 'win', min: 1 }], n: 3000 })
    expect(row(streaks, 'Oklahoma')?.value).toBe(47)
    expect(row(streaks, 'Georgia')?.value).toBe(29)
    expect(row(q(T, { how: 'streak', tests: [{ stat: 'loss', min: 1 }], n: 3000 }), 'Northwestern')?.value).toBe(34)
    expect(season(T, 'LSU', 2019, 'pf')).toBe(726)
    expect(season(T, 'Indiana', 2025, 'win')).toBe(16)
    expect(season(T, 'Army', 2003, 'loss')).toBe(13)
    expect(row(q(T, { how: 'streak', tests: [{ stat: 'pf', min: 60 }], seq: 'teamGames', n: 16 }), 'Oklahoma', 2008)?.value).toBe(5)
    expect(row(q(T, { how: 'count', tests: [{ stat: 'pf', min: 222 }], seq: 'teamGames', n: 16 }), 'Georgia Tech', 1916)?.value).toBe(1)
  })
  it('the vs-ranked stats begin with the AP poll', () => {
    const b = q(T, { stat: 'wint10', seq: 'teamGames', n: 16 })
    expect(b.since).toBe(1936)
    expect(b.ranked.every((r) => (r.season ?? 0) >= 1936)).toBe(true)
  })
})

describe('players (the NCAA FBS record book, bowls included)', () => {
  it('seasons', () => {
    expect(season(P, 'Joe Burrow', 2019, 'payd')).toBe(5671)
    expect(season(P, 'Joe Burrow', 2019, 'patd')).toBe(60)
    expect(season(P, 'Joe Burrow', 2019, 'td')).toBe(65)
    expect(season(P, 'Joe Burrow', 2019, 'totyd')).toBe(6039)
    expect(season(P, 'Bailey Zappe', 2021, 'payd')).toBe(5967)
    expect(season(P, 'Bailey Zappe', 2021, 'patd')).toBe(62)
    expect(season(P, 'Bryce Young', 2021, 'payd')).toBe(4872)
    expect(season(P, 'Caleb Williams', 2022, 'payd')).toBe(4537)
    expect(season(P, 'Kyler Murray', 2018, 'totyd')).toBe(5362)
    expect(season(P, 'Tim Tebow', 2007, 'rutd')).toBe(23)
    expect(season(P, 'Cam Newton', 2010, 'ruyd')).toBe(1473)
    expect(season(P, 'Lamar Jackson', 2016, 'ruyd')).toBe(1571)
    expect(season(P, 'Jordan Lynch', 2013, 'ruyd')).toBe(1920)
    expect(season(P, 'Malcolm Perry', 2019, 'ruyd')).toBe(2017)
    expect(season(P, 'Ashton Jeanty', 2024, 'ruyd')).toBe(2601)
    expect(season(P, 'Melvin Gordon III', 2014, 'ruyd')).toBe(2587)
    expect(season(P, 'Derrick Henry', 2015, 'ruyd')).toBe(2219)
    expect(season(P, 'Kevin Smith', 2007, 'car')).toBe(450)
    expect(season(P, 'Jonathan Taylor', 2017, 'ruyd')).toBe(1977)
    expect(season(P, 'Montee Ball', 2011, 'scrimtd')).toBe(39)
    expect(season(P, "Ja'Marr Chase", 2019, 'reyd')).toBe(1780)
    expect(season(P, 'Justin Jefferson', 2019, 'rec')).toBe(111)
    expect(season(P, 'Amari Cooper', 2014, 'rec')).toBe(124)
    expect(season(P, 'DeVonta Smith', 2020, 'reyd')).toBe(1856)
    expect(season(P, 'Zay Jones', 2016, 'rec')).toBe(158)
    expect(season(P, 'Travis Hunter', 2024, 'reyd')).toBe(1258)
    expect(season(P, 'Jeremiah Smith', 2024, 'reyd')).toBe(1315)
    expect(season(P, 'Gerod Holliman', 2014, 'dint')).toBe(14)
    expect(season(P, 'Roberto Aguayo', 2013, 'xpm')).toBe(94)
    expect(season(P, 'Ryan Switzer', 2013, 'rettd')).toBe(5)
    expect(season(P, 'Adrian Peterson', 2004, 'car')).toBe(339)
    // sacks count against a quarterback's rushing yards, as the NCAA counts them
    expect(season(P, 'Graham Harrell', 2007, 'ruyd')).toBeLessThan(0)
  })
  it('careers and milestones', () => {
    expect(career(P, 'Case Keenum', 'payd')).toBe(19217)
    expect(career(P, 'Case Keenum', 'patd')).toBe(155)
    expect(career(P, 'Dillon Gabriel', 'patd')).toBe(155)
    expect(career(P, 'Dillon Gabriel', 'payd')).toBe(18722)
    expect(career(P, 'Jonathan Taylor', 'ruyd')).toBe(6174)
    expect(career(P, 'Donnel Pumphrey', 'ruyd')).toBe(6405)
    expect(career(P, 'Keenan Reynolds', 'rutd')).toBe(88)
    expect(career(P, 'Corey Davis', 'reyd')).toBe(5285)
    expect(career(P, 'Kellen Moore', 'win', 'QB')).toBe(50) // games he appeared in: the box score has no starter flag
    expect(row(q(P, { stat: 'ruyd', seq: 'teamGames', n: 6 }), 'Ashton Jeanty', 2024)?.value).toBe(1248)
    expect(row(q(P, { how: 'count', tests: [{ stat: 'ruyd', min: 100 }], seq: 'teamGames', n: 16 }), 'Ashton Jeanty', 2024)?.value).toBe(14)
  })
  it('single games', () => {
    const big = (name: string, stat: Query['stat'], min: number) => row(q(P, { how: 'count', tests: [{ stat, min }], seq: 'teamGames', n: 16 }), name)?.value
    expect(big('Samaje Perine', 'ruyd', 427)).toBe(1)
    expect(big('Melvin Gordon III', 'ruyd', 408)).toBe(1)
    expect(big('Khalil Tate', 'ruyd', 327)).toBe(1)
    expect(big('Tetairoa McMillan', 'reyd', 304)).toBe(1)
  })
  it('the holes ESPN has, pinned so a fix shows: Hawaii 2006 and one Texas Tech 2007 game', () => {
    expect(season(P, 'Colt Brennan', 2006, 'patd')).toBe(42) // the NCAA has 58: four home games ESPN never had
    expect(season(P, 'Graham Harrell', 2007, 'cmp')).toBe(464) // the NCAA has 512
    expect(season(P, 'Michael Crabtree', 2007, 'rec')).toBe(119) // the NCAA has 134
  })
  it('the stat walls: fumbles from 2016, tackles from 2024, and the words carry them', () => {
    expect(q(P, { stat: 'fum', seq: 'teamGames', n: 16 }).since).toBe(2016)
    expect(q(P, { stat: 'tkl', seq: 'teamGames', n: 16 }).since).toBe(2024)
    expect(q(P, { stat: 'payd', seq: 'teamGames', n: 16 }).since).toBe(2004)
  })
})
