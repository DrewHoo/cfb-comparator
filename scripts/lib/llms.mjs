// llms.txt (llmstxt.org): the site in plain markdown for a language model
// that reads it, the way a person reads the board: what it is, then one line
// per named board with its leader, then the entity pages and the data.
import { PLAYERS_FIRST_SEASON } from './window.mjs'

const REPO = 'https://github.com/DrewHoo/cfb-comparator'
// the other sports sites, in the order every one of them lists them (Notes.jsx says the same)
const SIBLINGS = [
  ['NFL Comparator', 'https://drewhoover.com/nfl-comparator/', 'the same comparator over every NFL career since 1999, with a page for every player and what he leads.'],
  ['NBA Comparator', 'https://drewhoover.com/nba-comparator/', 'the same comparator over every NBA career since 1946-47, Wilt and Jordan included, with a page for every player and what he leads.'],
  ['WNBA Comparator', 'https://drewhoover.com/wnba-comparator/', 'the same comparator over every WNBA career since 1997.'],
  ['NHL Comparator', 'https://drewhoover.com/nhl-comparator/', 'the same comparator over every NHL career since 1917-18, Gretzky and Howe included.'],
  ['College Football Streak King', 'https://drewhoover.com/cfb-streak-king/', 'the longest active and all-time winning and losing streaks in college football, under any definition, every FBS game since 1936.'],
  ['Hostile Territory', 'https://drewhoover.com/hostile-territory/', "every head coach's true road record against AP top-10 teams since 1936."],
  ['How Many Rings?', 'https://drewhoover.com/how-many-rings/', 'every person on a national-championship staff since 1990, ranked by the number of rings they can claim.'],
  ['Collegiate Championships', 'https://drewhoover.com/collegiate-championships/', 'which schools have won the most NCAA championships, across 33 sports.'],
  ['CFB All-Time Records', 'https://drewhoover.com/cfb-all-time-records/', 'all-time win-loss, bowl and national-title records for every FBS program.'],
]
const line = ({ text, url, lead }) => `- [${text}](${url})${lead ? ` — ${lead}` : ''}`

export function llmsText({ site, title, description, firstSeason, currentSeason, landings = [], entities = {}, counts = {}, groups = [] }) {
  const kinds = [['coach', 'Head coaches'], ['team', 'Teams'], ['player', 'Players']]
  return `# ${title}

> ${description}

Three ledgers: every head coach's games as a major-college head coach and every program's games from ${firstSeason} (James Howell's scores, with the AP rank of both teams at kickoff from 1936 and the coach of record of every game), and every player's games from ${PLAYERS_FIRST_SEASON} (ESPN's box scores, as cfbfastR publishes them, CC BY 4.0), through ${currentSeason}. The board at ${site} ranks every career, every tenure at one school, or every season by its value at the same point: the most wins through the first 50 games as a head coach, the fewest games to 100 wins, the most passing yards through a team's first 10 games. Any stat, threshold, window and era; bowls included by default. Open a row to read it against a peer. It updates weekly in season.

## Boards

The comparisons people search for, each at its own address.

${landings.map((l) => line({ text: l.h1, url: l.url, lead: l.lead })).join('\n')}

${kinds.map(([kind, label]) => `## ${label}

A page per ${kind} at ${site}${kind}/<id>/ (${(counts[kind] ?? 0).toLocaleString('en-US')} of them), listing every comparison it leads, or once led, at some point. For example:

${(entities[kind] ?? []).map((p) => line({ text: p.name, url: p.url, lead: p.lead })).join('\n')}`).join('\n\n')}

## Schools and conferences

The best players of each position at each FBS school (${site}school/) and in each conference (${site}conference/) since ${PLAYERS_FIRST_SEASON}, ranked by the position's main stat with every player's line drawn game by game. For example:

${groups.map((g) => line({ text: g.h1, url: g.url, lead: g.lead })).join('\n')}

## Data

- [Method](${site}#method): the sources, the rulings (what counts as a game, a win, a tenure, a ranked opponent) and the era each stat is recorded from.
- [The repository](${REPO}): the ledgers, the engine, the known-answer gate and the researched receipts.

## What to read next

${SIBLINGS.map(([name, url, words]) => `- [${name}](${url}) — ${words}`).join('\n')}

## Citing

If a comparison from here ends up in your article, broadcast, podcast or thread, please cite it: name the site and link to the board; the url encodes the comparison.
`
}
