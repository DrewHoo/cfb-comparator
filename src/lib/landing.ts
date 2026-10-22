// The named boards: a curated set of queries, each at its own path
// (/fastest-to-100-wins-as-a-head-coach/), prerendered as the board on that
// query with an h1 and a title worded the way people search for it, a lead
// sentence with the leader, and an ItemList of the top ten. The board is the
// same board; the path is the query's canonical address, so a board that
// reaches one of these queries by any route writes the path (url.ts
// `hrefOf`), and a path with a query string on top (?t=, ?n=) reads as the
// landing's query with that on top (`parseAddress`). Pure: strings and
// queries only, so the prerender and the share worker can import it. The
// default query is the root page and must not appear here (landing.test
// pins it).

import { seasonWords } from './ledger.ts'
import { DEFAULT_QUERY, normalize, type Query } from './query.ts'

export interface Landing {
  slug: string
  query: Query
  /** the h1: the phrase people search with */
  h1: string
  /** the <title> before the era and the site's name; the h1 when empty */
  title?: string
}

const Q = (patch: Partial<Query>): Query => normalize({ ...DEFAULT_QUERY, ...patch })
const L = (slug: string, patch: Partial<Query>, h1: string, title?: string): Landing => ({ slug, query: Q(patch), h1, title })
const coach = (patch: Partial<Query>) => ({ kind: 'coach' as const, ...patch })
const team = (patch: Partial<Query>) => ({ kind: 'team' as const, ...patch })
const player = (patch: Partial<Query>) => ({ kind: 'player' as const, ...patch })

export const LANDINGS: Landing[] = [
  // head coaches: careers
  L('most-wins-through-100-games-as-a-head-coach', coach({ n: 100 }), 'Most wins through the first 100 games as a college football head coach', 'Best records through 100 games as a head coach'),
  L('most-wins-through-25-games-as-a-head-coach', coach({ n: 25 }), 'Best start to a college football head coaching career: wins through 25 games', 'Best starts to a head coaching career, through 25 games'),
  L('fewest-losses-through-50-games-as-a-head-coach', coach({ stat: 'loss', dir: 'fewest' }), 'Fewest losses through the first 50 games as a college football head coach'),
  L('fastest-to-100-wins-as-a-head-coach', coach({ how: 'reach', n: 100, dir: 'fewest' }), 'Fastest college football head coaches to 100 wins', 'Fastest to 100 wins: fewest games, every FBS head coach'),
  L('fastest-to-200-wins-as-a-head-coach', coach({ how: 'reach', n: 200, dir: 'fewest' }), 'Fastest college football head coaches to 200 wins', 'Fastest to 200 wins: fewest games, every FBS head coach'),
  L('most-wins-vs-ranked-teams-through-50-games', coach({ stat: 'winrk' }), 'Most wins over ranked teams through the first 50 games as a head coach'),
  L('most-wins-vs-top-10-teams-through-100-games', coach({ stat: 'wint10', n: 100 }), 'Most wins over AP top-10 teams through the first 100 games as a head coach'),
  L('longest-win-streak-to-start-a-head-coaching-career', coach({ how: 'streak', tests: [{ stat: 'win', min: 1 }], n: 150 }), 'Longest winning streak to start a college football head coaching career', 'Longest win streaks inside a head coach’s first 150 games'),
  L('most-losses-through-30-games-as-a-head-coach', coach({ stat: 'loss', n: 30 }), 'Most losses through the first 30 games as a college football head coach', 'Worst starts to a head coaching career, through 30 games'),
  L('most-wins-through-5-seasons-as-a-head-coach', coach({ seq: 'seasons', n: 5 }), 'Most wins through the first five seasons as a college football head coach'),
  L('most-wins-in-a-first-season-as-a-head-coach', coach({ seq: 'seasons', n: 1 }), 'Most wins in a first season as a college football head coach'),
  // head coaches: at one school
  L('most-wins-through-50-games-at-one-school', coach({ seq: 'tenure' }), 'Most wins through a head coach’s first 50 games at one school'),
  L('most-wins-through-100-games-at-one-school', coach({ seq: 'tenure', n: 100 }), 'Most wins through a head coach’s first 100 games at one school'),
  // head coaches and teams: a season
  L('most-wins-in-a-season-as-a-head-coach', coach({ seq: 'teamGames', n: 16 }), 'Most wins in a single season by a college football head coach'),
  L('most-wins-through-10-games-of-a-season', team({ seq: 'teamGames', n: 10 }), 'Best starts to a college football season: most wins through 10 games', 'Most wins through the first 10 games of a season, every FBS team'),
  L('most-points-through-6-games-of-a-season', team({ stat: 'pf', seq: 'teamGames', n: 6 }), 'Most points scored through the first 6 games of a college football season'),
  L('most-points-in-a-season', team({ stat: 'pf', seq: 'teamGames', n: 16 }), 'Most points scored in a single college football season, every FBS team'),
  L('fewest-points-allowed-through-10-games-of-a-season', team({ stat: 'pa', seq: 'teamGames', n: 10, dir: 'fewest' }), 'Fewest points allowed through the first 10 games of a college football season'),
  L('most-shutouts-in-a-season', team({ stat: 'shutout', seq: 'teamGames', n: 16 }), 'Most shutouts in a single college football season'),
  L('most-wins-vs-ranked-teams-in-a-season', team({ stat: 'winrk', seq: 'teamGames', n: 16 }), 'Most wins over ranked teams in a single college football season'),
  L('most-losses-through-10-games-of-a-season', team({ stat: 'loss', seq: 'teamGames', n: 10 }), 'Worst starts to a college football season: most losses through 10 games'),
  L('fastest-program-to-900-wins', team({ how: 'reach', n: 900, dir: 'fewest' }), 'Fastest college football programs to 900 wins', 'Fastest to 900 wins: fewest games, every FBS program'),
  // players
  L('most-passing-yards-in-a-season', player({ stat: 'payd', pos: 'QB', seq: 'teamGames', n: 16 }), 'Most passing yards in a single college football season', 'Most passing yards in an FBS season, since 2004'),
  L('most-passing-touchdowns-in-a-season', player({ stat: 'patd', pos: 'QB', seq: 'teamGames', n: 16 }), 'Most passing touchdowns in a single college football season'),
  L('most-rushing-yards-in-a-season', player({ stat: 'ruyd', pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most rushing yards in a single college football season'),
  L('most-rushing-touchdowns-in-a-season', player({ stat: 'rutd', pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most rushing touchdowns in a single college football season'),
  L('most-receiving-yards-in-a-season', player({ stat: 'reyd', pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most receiving yards in a single college football season'),
  L('most-receptions-in-a-season', player({ stat: 'rec', pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most receptions in a single college football season'),
  L('most-touchdowns-responsible-for-in-a-season', player({ stat: 'td', pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most touchdowns responsible for in a single college football season'),
  L('most-passing-yards-through-10-games-of-a-season', player({ stat: 'payd', pos: 'QB', seq: 'teamGames', n: 10 }), 'Most passing yards through the first 10 games of a college football season'),
  L('most-rushing-yards-through-10-games-of-a-season', player({ stat: 'ruyd', pos: 'ALL', seq: 'teamGames', n: 10 }), 'Most rushing yards through the first 10 games of a college football season'),
  L('most-career-passing-yards', player({ stat: 'payd', pos: 'QB', n: 60 }), 'Most career passing yards in college football, since 2004', 'Most passing yards through the first 60 games of a college career'),
  L('most-career-rushing-yards', player({ stat: 'ruyd', pos: 'ALL', n: 60 }), 'Most career rushing yards in college football, since 2004', 'Most rushing yards through the first 60 games of a college career'),
  L('most-career-receiving-yards', player({ stat: 'reyd', pos: 'ALL', n: 60 }), 'Most career receiving yards in college football, since 2004', 'Most receiving yards through the first 60 games of a college career'),
  L('fastest-to-10000-passing-yards', player({ how: 'reach', stat: 'payd', pos: 'QB', n: 10000, dir: 'fewest' }), 'Fastest to 10,000 career passing yards in college football', 'Fastest to 10,000 passing yards: fewest games'),
  L('fastest-to-100-passing-touchdowns', player({ how: 'reach', stat: 'patd', pos: 'QB', n: 100, dir: 'fewest' }), 'Fastest to 100 career passing touchdowns in college football'),
  L('fastest-to-3000-rushing-yards', player({ how: 'reach', stat: 'ruyd', pos: 'ALL', n: 3000, dir: 'fewest' }), 'Fastest to 3,000 career rushing yards in college football'),
  L('most-300-yard-passing-games-in-a-season', player({ how: 'count', tests: [{ stat: 'payd', min: 300 }], pos: 'QB', seq: 'teamGames', n: 16 }), 'Most 300-yard passing games in a single college football season'),
  L('most-100-yard-rushing-games-in-a-season', player({ how: 'count', tests: [{ stat: 'ruyd', min: 100 }], pos: 'ALL', seq: 'teamGames', n: 16 }), 'Most 100-yard rushing games in a single college football season'),
  L('longest-streak-of-100-yard-rushing-games', player({ how: 'streak', tests: [{ stat: 'ruyd', min: 100 }], pos: 'ALL', n: 60 }), 'Longest streak of 100-yard rushing games in college football, since 2004'),
  L('most-wins-as-a-starting-quarterback-through-40-games', player({ stat: 'win', pos: 'QB', n: 40 }), 'Most wins through the first 40 games of a college quarterback’s career'),
  L('most-interceptions-thrown-in-a-season', player({ stat: 'int', pos: 'QB', seq: 'teamGames', n: 16 }), 'Most interceptions thrown in a single college football season'),
]

export const landingBySlug = new Map(LANDINGS.map((l) => [l.slug, l]))

/** a query's identity, for matching a board to its landing */
export const queryKey = (q: Query): string => {
  const n = normalize(q)
  return [n.kind, n.pos, n.stat, n.how, n.n, n.seq, n.scope, n.since ?? '', n.dir, n.how === 'sum' || n.how === 'reach' ? '' : n.tests.map((t) => `${t.stat}:${t.min}${t.max != null ? `-${t.max}` : ''}`).join(',')].join('|')
}
const byKey = new Map(LANDINGS.map((l) => [queryKey(l.query), l]))

/** the landing a query is on, when it has one */
export const landingFor = (q: Query): Landing | null => byKey.get(queryKey(q)) ?? null

/** the landing at a path like /cfb-comparator/fastest-to-100-wins-as-a-head-coach/ (with or without the base); null for every other address */
export function landingFromPath(pathname: string, base = ''): Landing | null {
  let rel = pathname.startsWith(base) ? pathname.slice(base.length) : pathname
  rel = rel.replace(/^\/+|\/+$/g, '')
  return landingBySlug.get(rel) ?? null
}

/** the <title>: the searcher's phrase, the era the data forces, the site */
export const landingTitle = (l: Landing, bound: number | null, site: string): string => `${l.title ?? l.h1}${bound ? ` (since ${seasonWords(bound)})` : ''} · ${site}`
