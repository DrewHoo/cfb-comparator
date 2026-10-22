# College Football Comparator: the plan, and what it became

Written 2026-10-22, after the first build. The brief: "another comparator, but for college football (FBS teams)… go back as far as we can in terms of stats… anchor on famous stat lines so that we can independently reproduce them… add coaches, too… an og image renderer and mixpanel analytics in the cloudflare worker, and a bangin' SEO strategy with pre-rendered pages."

## The shape

The NBA Comparator's engine (the newest sibling) over three ledgers instead of one, with a `kind` slot in the sentence: head coaches, teams, players. Each kind is its own columnar ledger with the same base columns (the game's date, season, flags, team, opponent, the team's game number, both scores, both AP ranks); the player ledger adds the box-score columns. The stat catalog names which kinds each stat belongs to; coach and team stats read the game itself. A fourth sequence, `tenure` (the games of one stint at a school), carries the "first N games at Georgia" discourse.

## How far back

| ledger | first season | why not earlier |
|---|---|---|
| teams | 1869 | the first game |
| head coaches | 1869 (named for 98.8% of major team-seasons from 1900, 74% in the 1890s, 12% in the 1880s) | most teams had no coach before 1895 |
| vs ranked / top 10 | 1936 | the AP poll's first season |
| players | 2004 | ESPN's box scores begin there; every licensed per-game source before it (Sports-Reference, stats.ncaa.org, heisman.com) forbids compiling a database |

The research under `research/` settled this: five Opus probes (the ESPN box files, the coach and team spine, pre-2004 player game logs, two factoid corpora) in about 25 minutes each. The pre-2004 verdict: a phase-two fleet could add game logs for roughly 1980–2003 from the next season's media guides on archive.org (about 15–20 legend seasons, 8–12 agent-hours), nothing open before the mid-1960s. Not built.

## The gates

115 factoid rows with 219 string-checked receipts (NCAA record books first). The build reproduces the ones the data can reach and pins the holes as holes (Hawai'i 2006, Texas Tech at UTEP 2007, Washington before 1916). The differences a publisher's definition makes are worded in Method, never patched: vacated wins, ties as half wins, a coach's non-major seasons.

## What shipped

The board with the three kinds; 42 named boards; 2,306 entity pages with their own cards; the share worker with a card per board address and Mixpanel unfurl events; llms.txt, JSON-LD, the sitemap, IndexNow; the Sunday/Tuesday refresh.

## Added 2026-10-22: school and conference pages

Drew: "prerendered pages for top players of a given position at a given school, like all time greatest wide receivers at alabama that renders graphs (a line for each player) for their important metrics. Same for conferences." Built as `src/lib/groups.ts` over the player ledger: 137 schools × 7 positions and 12 conferences × 7 positions, 1,008 pages, each with the position's metrics as cumulative lines (top eight) and the full table, a card, JSON-LD and a sitemap entry; the conference pages count a player's games while his team was a member (the spine's membership by season, now in every ledger as `teamConf`). Defenders rank by tackles and so begin in 2024. The era wall (2004) is in every title and h1.

## Open

- Vacated wins and forfeits as a receipt-backed layer (a futility board readers could argue with).
- A 2004-freshman ruling file (Adrian Peterson) so the 2004 debut class isn't censored wholesale.
- A merge list for ESPN's duplicate athlete ids (the same name and team under two ids).
- Mid-season coaching changes before 1936 (the navbox names both coaches, not the game).
- The team mine's rows are the NBA method's; the scoring wants a look with the tuner (`?tune=1`).
- Phase two: the 1980–2003 media-guide fleet.
