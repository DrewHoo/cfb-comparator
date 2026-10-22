// llms.txt (llmstxt.org): the site in plain markdown for a language model
// that reads it, the way a person reads the board: what it is, then one line
// per named board with its leader, then the entity pages and the data.
import { PLAYERS_FIRST_SEASON } from './window.mjs'

const REPO = 'https://github.com/DrewHoo/cfb-comparator'
const line = ({ text, url, lead }) => `- [${text}](${url})${lead ? ` — ${lead}` : ''}`

export function llmsText({ site, title, description, firstSeason, currentSeason, landings = [], entities = {}, counts = {} }) {
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

## Data

- [Method](${site}#method): the sources, the rulings (what counts as a game, a win, a tenure, a ranked opponent) and the era each stat is recorded from.
- [The repository](${REPO}): the ledgers, the engine, the known-answer gate and the researched receipts.
`
}
