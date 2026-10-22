# Probe: per-game stat lines for pre-2004 legends

Feasibility probe, 2026-10-21/22. Not a harvest. The question: which open
sources carry game-by-game lines (date, opponent, result, and the player's
passing / rushing / receiving) for college football legends before 2004, and
whether a phase-2 research fleet is worth running.

Files here:

- `spot-checks.json`: 8 game rows from 5 decades plus one negative control
  and one OCR-failure exhibit, carrying 17 receipts. All 17 pass
  `node scripts/check-receipts.mjs --pages research/probe-pre-2004/pages --offline research/probe-pre-2004/spot-checks.json`.
- `pages/`: the text of every page quoted, keyed by sha1(url) (see
  `pages/index.json`). The archive.org files are the items' own `_djvu.txt`
  OCR. PDF texts were extracted with PyMuPDF. The one Google News Archive file
  is a **transcription from the page image** and is labelled as one.

## Verdict

**A phase-2 fleet is worth running for about 1980–2003, and for a small set
of famous earlier seasons. Below the mid-1960s it is reader-pace newspaper
work with no open per-game source.**

- **1980s–1990s.** The following season's school media guide often prints
  every game's box: scoring summary plus "top individuals" or "leaders" lines.
  Archive.org holds about 509 pre-2004 guides in one collection, and its OCR
  text downloads with a script. In three of the four guides tested, the
  legend's line was there for every game. It is clean enough to string-match
  in two of them (USC 1982, BYU 1991) and noisy in the third (FSU 1994). The
  catch is coverage: the collection is concentrated in about 15 schools (USC,
  BYU, FSU, Pitt, Nebraska, Clemson, UCLA, Baylor, Michigan, Penn State,
  Oregon State, Maryland, Colorado, Ohio State, Alabama). Georgia, Auburn,
  Texas, Wisconsin, Houston, Navy, Syracuse and Oklahoma State are absent, and
  Tennessee has only 1999–2000.
- **1965–2003 Heisman seasons.** heisman.com has a full game table for the
  Heisman year (date, opponent, result, att/yds/TD, receiving, passing for
  QBs). It was present for every winner I checked from 1965 to 2003 except
  Cappelletti in 1973, and for about a third of earlier winners (O'Brien 1938,
  Sinkwich 1942, Horvath 1944, Janowicz 1950, Ameche 1954, Cassady 1955).
  It is the best lead source there is, and it agreed with every independent
  source I compared it to (5 of 5 rows). **But its terms bar robots and any
  copying** ("use any robot, spider... including monitoring or copying any of
  the material on the Site"), and they bar using the site "for purposes of
  creating a competitive site". Treat it like Sports-Reference: a lead plus
  at most one receipt page per season, never a harvest. I fetched about 50
  winner pages by script in this probe to map coverage, which their terms
  forbid. Phase 2 should not repeat that.
- **1970s.** Guide recaps turn into prose. The Pitt 1977 guide gives
  Dorsett's yards for each game in sentences, and TDs can be counted from the
  scoring summaries, but there are no carries. That is partial unless
  heisman.com or a newspaper fills the gap.
- **1960s and earlier.** The 1960s guide I tested (USC 1969) has team stats
  per game and only season totals for Simpson. Newspapers are the only
  per-game source. Google News Archive is image-only and its search is dead.
  Chronicling America (the open pre-1963 newspaper archive) and the Illinois
  newspaper archive are behind Cloudflare bot checks from this environment.
  A human can do this at reader pace. A fleet cannot, today.
- **Can't be had openly at all:** full lines (carries and TDs) for 1920s–50s
  legends. Grange gets yards for his 100-yard games only, from the Illinois
  record book. Staubach 1963 had no open per-game source in this probe.

## Source map

| # | Source | Span seen | Granularity | Form | Generalizes? | License / terms |
|---|---|---|---|---|---|---|
| 1 | Archive.org "College Football Media Guides" collection (`collection:college-football-media-guides`, uploader wwittler) | 1950s–2026; 509 non-cover items dated 1960–2003 | Following-season guide. 1980s+: per-game box with scoring and top individuals or leaders (USC 1982, BYU 1991, FSU 1994). 1970s: per-game prose plus scoring (Pitt 1977). 1960s: team stats only (USC 1969). | Scanned PDF plus `_djvu.txt` OCR, fetchable at `archive.org/download/<id>/<file>_djvu.txt`. **Script** download; extraction is agent work. | Only to about 15 well-covered schools; `-cover` items are covers only | No license stated on items or collection. School-copyright publications, hosted by IA. The facts are usable; quote short lines. |
| 2 | School sites' current media guides and record books (born-digital PDFs, e.g. okstate.com) | Current year | Usually season totals and single-game records. **Sometimes a legend's iconic season game by game**: OSU 2026 has "Sanders' 1988 Game-by-Game Rushing Stats", and Illinois 2025 lists Grange's "Known 100-yard games prior to 1945". | Born-digital PDF with a clean text layer. **Script.** | Per school and per legend; one table per famous season at best | School copyright; facts. |
| 3 | heisman.com winner pages | Heisman seasons. Present 1965–2003 except 1973; patchy 1935–64 (6 of about 22 checked) | **Full game table** for the Heisman year | HTML text, string-matchable | Heisman winners only (one season each) | **ToS bars robots, copying and "competitive site" use.** Receipt-only, like SR. |
| 4 | Wikipedia season articles | Varies | Per-game "game summary" boxes with team leaders ("Rushing ‖ Tony Dorsett ‖ 22 carries, 181 yards, 1 TD"), or per-game prose. Patchy: Pitt 1976 has 8 of 12 games, OSU 1988 has 3, Georgia 1982 has prose for each game. | Wikitext/HTML. **Script.** | Partial for any team; leaders only; editors cite SR, Newspapers.com and GNA | CC BY-SA 4.0. Best use: the citations lead to newspaper pages. |
| 5a | Google News Archive | About 1900s–2000s, random papers | Wire game stories with carries and yards; agate box scores | **Image tiles only, no text layer.** Built-in search is defunct; reach pages through Wikipedia citations or by browsing a paper's date. Receipt = URL plus a transcribed line marked as such. **Reader-pace.** | Any game if a paper covered it | Google viewer; transcribe short lines |
| 5b | Chronicling America (loc.gov) | To 1963 | Box scores in OCR text (when reachable) | **Blocked:** HTTP 520 from curl, Cloudflare challenge in the browser pane | Pre-1963 legends (Davis, Walker, Harmon, Grange) | Public domain / open |
| 5c | State and student newspapers (Illinois IDNC; Penn State's Daily Collegian on archive.org) | Varies | Game stories | IDNC behind a Cloudflare challenge. Daily Collegian 1960 on IA has OCR (full-text search hit). | Per school | Varies |
| 6 | NCAA FBS Records Book (fs.ncaa.org PDF via Wayback, 2019 ed.) | All years | Season totals plus single-game record lists. Streak lists carry some game values, e.g. Allen 1981 "210 vs. Tennessee, Sept. 12". | Born-digital PDF, clean. Script. | Corroboration only | NCAA publication |
| 7 | Open datasets (GitHub, Hugging Face, Kaggle) | None before 2004 for player game logs | — | — | — | Nothing found. sportsdataverse `cfbfastR-data` has player_stats from 2014 and pbp "2002-present" (a possible 2002–03 extension, untested). |
| 8 | College Football Hall of Fame (cfbhall.com, footballfoundation.org) | — | Bio prose, no per-game | HTML | No | — |
| 9 | UW-Madison Digital Collections (Wisconsin guides 1990–2003, `asset.library.wisc.edu/1711.dl/<id>/E/file-*.pdf`) | 1990–2003 | 1997 guide has "RON DAYNE, GAME-BY-GAME IN 1996" | Scanned PDF whose **text layer is unusable** ("Eostern Michigon.....8 2.2.53"). Item pages are bot-walled; asset PDFs download. Reader-pace from the image. | Wisconsin only | "In Copyright" rights statement |
| 10 | okstate.com "Record Rewind" box score PDFs | Single famous games | Official NCAA stat sheets, **handwritten**, 8 pages | Image-only PDF | One-offs | School |
| 11 | Perelman's College Football Companion (1999 ed. on IA) | 1990s editions | Per-game leading rusher/passer per team ("Nwstrn Dayne 22-168-1") | IA lending library, access-restricted | All teams, leaders only | In copyright, borrow-only. Lead, not receipt. |
| 12 | Huskers Illustrated (IA, 425 issues, 1981–2016) | Nebraska seasons | Weekly game-by-game passing and rushing tables | IA OCR | Nebraska only (Frazier 1994–95 present) | Fan magazine, copyright |

Not tested in this probe: Sports-Reference (0 of the 2 allowed pages used),
stats.ncaa.org (skipped as instructed), school sites other than okstate.com.

## The media-guide hypothesis, tested

The hypothesis: the following season's guide prints the prior season game by
game, one PDF per season, about 12 games each. **It holds for the 1980s–90s
where the school's guides are online, holds weakly in the 1970s, and fails in
the 1960s.** "Game by game" means box-score top individuals or leaders, not a
dedicated table for the star. TDs usually have to be counted from the scoring
summary. Receiving appears only when the player led.

| Decade | Guide (season covered) | Table? | Three verbatim rows from the extracted text | OCR verdict |
|---|---|---|---|---|
| 1980s | USC 1982 (Allen 1981), `usc-football-1982-media-guide-c` | **Yes.** "1981 GAME SUMMARIES", one block per game: scoring, team stats, TOP INDIVIDUALS | `Rushing — Allen (USC) 22-210; Lee (USC) 6-81; Crutcher (USC)` · `Rushing — Allen (USC) 40-274; Crutcher (USC) 10-61; McClanahan` · `Rushing — Allen (USC) 26-21 1; Nelson (Arizona) 9-48; Holland (Ari-` | Individual lines mostly clean; the third row shows a split digit ("21 1" for 211). The team-stat columns are garbled. String-matchable, but digits need a cross-check. 210 agrees with the NCAA record book. |
| 1990s | BYU 1991 (Detmer 1990), `byu-football-1991-media-guide` | **Yes.** "Game-By-Game Summary" with a LEADERS table per game | `Detmer 33 46 2 387 1 28` (UTEP) · `Tuipulotu 12 89 0 89 1 16` · `Smith 6 99 0 24` | Clean. Agrees with heisman.com (33/46, 387, 1 TD, 2 INT). String-matchable. Note the column order is Comp. Att. Int Yards TD Long. |
| 1990s | FSU 1994 (Ward 1993), `florida-state-football-1994-media-guide-c` | **Yes.** INDIVIDUAL STATISTICS for every game, all players | `Passing: FSU: Ward 16-26-0-194,` · `Rushing: FSU: M. Smith 1]-B7, Jock-` · `Konsas 00000` | **Noisy.** Ward's line is right (agrees with heisman.com), but neighbouring digits are misread. Needs a look at the page image before a value is trusted. |
| 1970s | Pitt 1977 (Dorsett 1976), `pitt-football-1977-media-guide_202508` | **Prose only.** "The Road to the National Championship" recap per game plus a scoring summary; no individual table | `Tony Dorsett rushed for 112 yards and a touchdown despite missing part of the game with a bruised calf.` · `Dorsett, who rushed for 181 yards, scored on a five-yard run` · `Dorsett rushed for 199` | Prose is clean. The season table is garbled ("Ww 338 1,948"). Yards and TDs are recoverable; carries are not. heisman.com supplies carries for 1976. |
| 1960s | USC 1969 (Simpson 1968), `usc-football-1969-media-guide-c` | **No.** Opponent previews with "LAST YEAR'S GAME SUMMARY" team stats; only season totals for Simpson | `Simpson =. 383 1941 61 1880 4.90` (season) · `TD, Simpson, 5-yard run` (scoring only) · `Net Yards Rushing .... 224` (team) | Mixed. Irrelevant, since there are no per-game individual lines. |

Two extra checks: the Oklahoma State 2000 guide has no Sanders game log (bio
and records only), but the **current** 2026 guide does, as born-digital
clean text. The Wisconsin 1997 guide (UWDC) has the Dayne 1996 table, but its
OCR is unusable.

## The 12 legends

| Legend (why picked) | Seasons | Open per-game source found | Fields it gives | Receipt-only lead | Verdict |
|---|---|---|---|---|---|
| Barry Sanders (the famous case) | 1988 | OSU 2026 media guide, "Sanders' 1988 Game-by-Game Rushing Stats" (born-digital) | Date, opponent, att, yds, TD, long, for 12 games incl. Holiday Bowl. No receiving or result. | heisman.com 1988 (adds receiving, returns, result) | **Yes, script** |
| Marcus Allen (strong archive: USC guides on IA) | 1981 (and 1978–80 via the 1979–81 guides, untested) | USC 1982 guide on IA | Rush att-yds; rec-yds when he led; TDs from the scoring summary; result | heisman.com 1981; NCAA book for 5 games | **Yes, script plus checking** |
| Ty Detmer (strong archive: BYU 1955–2003 complete on IA) | 1988–91 | BYU 1989–92 guides | Comp, att, int, yds, TD, long per game (as passing leader) | heisman.com 1990 | **Yes, script** |
| Charlie Ward (1990s) | 1993 | FSU 1994 guide | Comp-att-int-yds per game; TDs from the scoring summary | heisman.com 1993 | **Yes, but check against the image** |
| Tony Dorsett (1970s) | 1973–76 | Pitt 1974–77 guides (1977 tested) | Yards and TDs from prose; no carries | heisman.com 1976 (carries) | **Partial.** 1976 full with the lead; 1973–75 untested. |
| Herschel Walker | 1980–82 | Georgia guides absent from IA. Wikipedia 1982 prose cites GNA pages. | Carries and yards from wire stories (transcribed) | heisman.com 1982 | **Reader-pace** (GNA). 1980–81 newspapers only. |
| Archie Griffin (1970s) | 1972–75 | OSU guides on IA skip 1966–77 | — | heisman.com 1974 | **Reader-pace** newspapers; 1974 lead only |
| Ron Dayne (1990s, school digital library) | 1996–99 | UWDC Wisconsin guides 1997–2000; the 1996 table exists | Att, yds, avg, TD, first downs, YAC (from the image) | heisman.com 1999; Perelman 1999 (restricted) | **Reader-pace** (bad text layer) |
| Peyton Manning (1990s, non-Heisman) | 1994–97 | Tennessee guides 1995–98 not on IA; Wikipedia 1997 has about 5 game boxes | Leaders lines for some games | none | **Not found open.** Newspapers or utsports.com (untested). |
| O.J. Simpson (1960s) | 1967–68 | USC 1969 guide: none; the USC 1968 item is cover-only | — | heisman.com 1968 (full table) | **Lead only.** Receipts need newspapers. |
| Roger Staubach (1960s) | 1963 | No Navy pre-2004 guides on IA; Chronicling America blocked | — | heisman.com has no table | **None found** |
| Red Grange (negative case) | 1923–25 | Illinois 2025 record book, "KNOWN 100-YARD GAMES PRIOR TO 1945" | Yards only, 11 games; OCR clips the leading digit ("42 Red Grange vs. Butler") | none | **Yards for big games only.** Daily Illini (IDNC) blocked. |

## Phase-2 cost estimate

| Tier | Seasons in reach (shortlist plus obvious adds) | Pages per season | Agent-minutes per season |
|---|---|---|---|
| A. Born-digital school table | Sanders 1988; other schools' iconic seasons where the current guide prints one (search each school's guide) | 1 PDF | 10–15 |
| B. IA guide with per-game boxes, clean OCR | Allen 1981 (and 1978–80), Detmer 1988–91, Frazier 1994–95 (Nebraska 1995–96 guides, untested), plus Miami/FSU/USC/Nebraska/BYU/Pitt seasons of 2000–03 legends where guides exist (Weinke, Dorsey, Crouch, Fitzgerald 2002) | 1 djvu.txt (about 12 game blocks) | 20–30 |
| C. IA guide, noisy OCR | Ward 1993, likely other FSU years | 1 djvu.txt plus about 12 page images | 40–60 |
| D. Prose guide plus the Heisman lead | Dorsett 1973–76 | 1 djvu.txt plus 1 heisman.com page | 30–45 |
| E. Newspapers (GNA via Wikipedia citations), transcribed | Walker 1980–82, Griffin 1972–75, Simpson 1967–68, Dayne 1996–99 (or the UWDC image), Manning 1994–97 | About 12 newspaper pages | 90–150 |

Realistic phase-2 scope: **about 15–20 seasons in tiers A–D, roughly 8–12
agent-hours**, giving receipted lines string-checked against open text. Each
tier-E season adds 1.5–2.5 agent-hours, with transcribed (not
machine-checkable) receipts. Below 1963, plan nothing until Chronicling
America is reachable from the fleet's network.

Fleet rules learned here:

- Use heisman.com, and SR if needed, as the expected-value lead, one page per
  season. Never harvest from them.
- Count TDs from scoring summaries in code, not by eye.
- Every OCR'd digit needs an independent agreeing source (heisman.com, NCAA
  book, Wikipedia box) or a look at the page image. Grade rows `ocr-checked`
  vs `ocr-unchecked`.
- Brief agents to reject: no player line in a game box means a gap, never an
  inferred zero.

## Tried, nothing usable, don't retry

- **Chronicling America / loc.gov:** HTTP 520 from curl and a Cloudflare
  challenge in the browser pane (2026-10-21). Not bypassed. Retry only from a
  human browser or a different network.
- **Illinois Digital Newspaper Collections (Daily Illini):** Cloudflare
  challenge. Same as above.
- **search.library.wisc.edu item pages:** "Browser not allowed". The asset
  PDFs on asset.library.wisc.edu download fine, but their text layer is
  garbage.
- **Google News Archive as text:** the HTML has the paper name and date only.
  Content is image tiles, and the archive's search is defunct.
- **1960s school guides as a per-game source** (USC 1969): team stats only.
  The USC 1956–68 IA items are mostly `-cover` only.
- **The Oklahoma State 2000 guide for Sanders:** bio and records only. Use
  the current 2026 guide.
- **The NCAA Records Book** as a per-game source: season totals and record
  lists only. It is still useful for corroboration.
- **College Football Hall of Fame bios:** prose, no per-game.
- **GitHub, Hugging Face and Kaggle** for pre-2004 player game logs: none.
  cfbfastR-data player_stats start in 2014.
- **okstate.com Record Rewind PDFs:** handwritten official sheets for single
  games; not a series.
- **Perelman's College Football Companion:** IA lending, access-restricted.
  Snippets via full-text search only.

## Method notes

- Archive.org metadata search was used for listings, the full-text search
  endpoint (`/services/search/beta/page_production/?service_backend=fts`) at
  2 s spacing, and `_djvu.txt` downloads.
- Downloads went to the session scratchpad (`probe-pre-2004/dl/…`), scripts
  to `probe-pre-2004/scripts/`, and Python ran with `-I`. Nothing downloaded
  was executed.
- Spot checks were cross-checked across sources where possible. Five
  heisman.com rows matched independent sources exactly: Detmer, Ward,
  Walker, Dorsett's Temple game, and Sanders against the OSU guide.
