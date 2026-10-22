# College Football Comparator

Compare college football head coaches, teams and players at the same point: wins through the first 50 games as a head coach, fastest to 100 wins, points through a season's first six games, passing yards through a team's first ten. Every head coach and program since 1869, every player since 2004.

Live at [drewhoover.com/cfb-comparator](https://drewhoover.com/cfb-comparator/). A sibling of [College Football Streak King](https://drewhoover.com/cfb-streak-king/), [Hostile Territory](https://drewhoover.com/hostile-territory/), [NFL Comparator](https://drewhoover.com/nfl-comparator/), [NBA Comparator](https://drewhoover.com/nba-comparator/) and [WNBA Comparator](https://drewhoover.com/wnba-comparator/).

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy%20me%20a%20coffee-c36c36)](https://ko-fi.com/drewhooverdotcom) · the data method is the [receipts-research](https://github.com/DrewHoo/skill-receipts-research) one: every published number the site is asked to reproduce has a receipt under `research/`, and the build fails unless it reproduces them.

## The three ledgers

| Ledger | Games | From | Source |
|---|---|---|---|
| head coaches | every game as a major-college head coach | 1869 | James Howell's scores; Streak King's payload (AP ranks, coaches, errata) from 1936; Wikipedia's coach lists before 1936 (CC BY-SA, `data/ref/coaches-1869-1935.json`) |
| teams | every major-college program's games, by season | 1869 | the same spine |
| players | every player's games with a box-score line | 2004 | ESPN's box scores as cfbfastR (sportsdataverse) publishes them, CC BY 4.0 |

`npm run fetch` downloads the raw files into `data/raw/` (gitignored); `npm run ledger` writes the three columnar ledgers under `src/data/` (committed); `npm run gate` prints the known-answer gate and `npm test` pins it; `npm run build` mines what every coach, team and player leads, builds the site and prerenders every page.

The pre-1936 games are parsed once from Howell's pages by `npm run history` into `data/history/` (committed). The research that chose the sources and the receipts behind every gate are under `research/`; `npm run receipts` string-checks every quote against its saved page.

## Working here

- `npm run dev` on port 5178; `npm run preview` on 4175; `npm run worker:dev` on 8789 against the preview.
- `npm run records` mines the entity pages (`public/entities/`, gitignored); `node scripts/records.mjs coach "Kirby Smart"` prints what one entity leads.
- `npm run gen:og` draws `public/og.png` and `public/card.png` from the real default board (a Mac, for Georgia Bold); `npm run gen:favicon` copies drewhoover.com's own set.
- The share worker (`workers/share/`) deploys with every push through the `worker` job in `deploy.yml`; `CARD_VERSION` in its `index.ts` keys the edge cache.

CLAUDE.md has the map of the code; AGENTS.md the list of places where the data surprises.
