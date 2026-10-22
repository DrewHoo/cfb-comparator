# Probe: coach and team ledgers before 1936

Probe run 2026-10-21. Every number here was copied from a script's saved output under `out/` (the file is named beside each table). The scripts are in `scripts/` and take their paths as arguments. Nothing was edited in cfb-streak-king or hostile-territory.

## The answer in one paragraph

Howell's pages give the team ledger every game of every major team from 1869, with both sides of each game agreeing perfectly. A coach of record per game comes from Wikipedia: its "football coach navbox" templates name one coach for 98.8% of major team-seasons from 1900, 74% in the 1890s and 12% in the 1880s, because before about 1895 most teams had no coach at all. Those navboxes agree with CFBD's coach for every one of 7,347 team-seasons from 1936 on where both exist; the 19 that looked like misses are spelling variants. CFBD's 1869–1935 coaches could not be checked, because the API refused the call with "Monthly call quota exceeded". So the coach table before 1936 would be derived from Wikipedia, under CC BY-SA. Every known answer reproduces once three things are applied as rulings on top of the results: vacated wins, forfeits, and a coach's games at non-major schools.

**Honest first seasons**
- **Team ledger, win-loss boards: 1880.** The data starts in 1869, but the 113 games of 1869–1879 weren't 11-man scrimmage football, and a third of the 1870s rows are unverified (37 of 111 red).
- **Team ledger, points boards: 1912 is likely, not checked here.** Scoring values changed until then; that needs a source before it ships.
- **Coach ledger: 1900.** 656 of the 664 major team-seasons in the 1900s name one coach (out/coach-holes.txt).
- **"Vs AP top 10" boards: 1936,** and an early-season game before 1950 has no rank (see Q6).
- **"First N games as a head coach":** honest only when the board says "major-college games" or brings in the coach's non-major games from somewhere else. Six of the 15 sample coaches have seasons that aren't on the spine.

## Sources and licenses

| Source | What it gives | License | Used for |
| --- | --- | --- | --- |
| Howell team pages (cfb-streak-king `data/raw/jhowell/`, updated 2026-01-27) | Every game of every major team-season, 1869 to now; scores, site, conference marks; a verification color per row | No terms stated on the pages (grep for copyright, license or permission: none). Results are facts; credit him the way Streak King does | Game spine 1869–1935 |
| Wikipedia "<Program> football coach navbox" templates (997 fetched; 186 of the 193 pre-1936 major teams mapped) | Coach name(s) and years per program, "No coach" years, `#` for interim | CC BY-SA 4.0 | Coach of record per team-season, 1869–1935 |
| Wikipedia coach pages (24 pages) | Infobox career record; "Head coaching record" per-season rows | CC BY-SA 4.0 | Sample table, off-spine (non-major) seasons |
| CFBD `/coaches` 1936–2026 (Streak King's local pull) | Per coach per team per season: games, wins, losses, ties | Not checked in this probe | Coaches from 1936 (already in the Streak King payload) |
| Streak King `src/data/payload.json` | 63,975 games 1936–2026 with coach stints and AP ranks | Streak King's own computation | 1936+ joins and known answers |

**What CC BY-SA would oblige us to do.** Treat a coach-season table extracted from Wikipedia as an adaptation:
- Attribute it: name Wikipedia, link the source pages or a list of them, name the license, and say we changed it.
- License the table itself (the JSON we publish that carries the coach-of-record column) under CC BY-SA 4.0 or a compatible license.
- Put no extra restrictions on it.

The computed boards built from it could stay CC BY 4.0 like Streak King's `/data/` files only if they don't redistribute the table. The safe course is to publish the coach file as BY-SA and say so on `/data/`. US copyright doesn't protect bare facts (who coached Notre Dame in 1919), but a wholesale extraction is the case where share-alike is the honest reading. A receipt (a quote with a URL) is plainly fine. This is not legal advice.

---

## Q1. Howell before 1936

`out/howell-coverage.txt` / `coverage.json`. Parsed by `scripts/parse-howell-all.mjs`, which is Streak King's parser with the `FIRST_SEASON` filter removed and teams keyed by file name.

- **Files:** 305 team files, 304 of them in byconf with spans. 193 carry seasons before 1936.
- **Rows:** 149,929 team-page rows in all seasons, and every score is numeric.
- **1869–1935:** 31,860 team-page rows, which mirror-dedupe to **20,849 unique games**.
- **Opponents:** 9,838 of those games (**47.2%**) are against an opponent with no page that season (non-major).
- **Mirror check, 1869–1935:** 11,011 major-vs-major pairs. 0 singles (a game on one side only), 0 score disagreements, 0 result disagreements, 0 site disagreements.
- **Earliest row:** 1869-11-06, Princeton at Rutgers, L 4–6 from Princeton's side.
- **Page seasons vs byconf spans:** a team page carries only the seasons in its byconf spans. The one exception is WorcesterTech 1888. So Notre Dame has no 1903 or 1906–1912, and Michigan has no 1882 or 1884–1891.

Games per decade (unique games; "red" = Howell's own "not yet verified" color):

| Decade | Seasons | Games | Both major | vs non-major | Share non-major | Ties | Green | Red | Max teams |
|---|---|---|---|---|---|---|---|---|---|
| 1860s | 1 | 2 | 2 | 0 | 0.000 | 0 | 2 | 0 | 2 |
| 1870s | 10 | 111 | 82 | 29 | 0.261 | 15 | 73 | 37 | 9 |
| 1880s | 10 | 569 | 404 | 165 | 0.290 | 30 | 336 | 226 | 21 |
| 1890s | 10 | 1,913 | 888 | 1,025 | 0.536 | 92 | 1,135 | 761 | 41 |
| 1900s | 10 | 4,064 | 1,887 | 2,177 | 0.536 | 246 | 2,730 | 1,253 | 82 |
| 1910s | 10 | 4,404 | 2,094 | 2,310 | 0.525 | 269 | 3,020 | 1,270 | 99 |
| 1920s | 10 | 5,766 | 3,174 | 2,592 | 0.450 | 392 | 4,160 | 1,522 | 111 |
| 1930s (to 1935) | 6 | 4,020 | 2,480 | 1,540 | 0.383 | 272 | 2,953 | 1,032 | 128 |

Sample seasons (the full 1869–1935 list is `coverage.json` → `gamesPerSeason1869to1935`):

| Season | Games | Teams with a page | Share non-major |
|---|---|---|---|
| 1869 | 2 | 2 | 0.000 |
| 1875 | 17 | 6 | 0.529 |
| 1880 | 20 | 8 | 0.250 |
| 1890 | 118 | 18 | 0.466 |
| 1900 | 290 | 41 | 0.548 |
| 1905 | 521 | 82 | 0.526 |
| 1910 | 402 | 74 | 0.542 |
| 1920 | 521 | 96 | 0.464 |
| 1930 | 621 | 106 | 0.428 |
| 1935 | 714 | 128 | 0.357 |

**Earliest teams.** Earliest season and pre-1936 seasons/games for each team are in `howell-coverage.json` → `teamTable`. The first ten:

| Team | First season | Pre-1936 seasons | Pre-1936 games |
|---|---|---|---|
| Princeton | 1869 | 64 | 524 |
| Rutgers | 1869 | 31 | 201 |
| Columbia | 1870 | 38 | 289 |
| Stevens | 1872 | 19 | 123 |
| Yale | 1872 | 62 | 566 |
| Harvard | 1875 | 59 | 548 |
| Pennsylvania | 1876 | 59 | 623 |
| Amherst | 1877 | 25 | 239 |
| Tufts | 1877 | 17 | 178 |
| Brown | 1878 | 47 | 447 |

## Q2. Howell's major list before 1936 (byconf.htm)

- **Size:** 304 files with spans. The earliest span starts in 1869.
- **Gaps:** 145 files have more than one span. Rutgers has 6; Mississippi, Bucknell, Columbia and Georgetown 5 each.
- **Teams major in a year:** 1869: 2, 1875: 6, 1880: 8, 1890: 18, **1900: 41, 1920: 96, 1935: 128**, 1936: 131, 1950: 120.
- 193 files have a span starting before 1936. 54 files are major only before 1936, among them Carlisle, Washington & Jefferson, Centre, Haskell, Oglethorpe, and the New England small colleges of 1904–05 (`howell-coverage.json` → `byconf.filesWhoseAllSpansEndBefore1936`).
- **The list breathes.** It was 82 in 1905 and 74 in 1910, as Howell drops the small colleges after 1905.
- **Example spans:**

| Team | Major spans |
|---|---|
| Michigan | 1881, 1883, 1892– |
| Notre Dame | 1899–1902, 1904–05, 1913– |
| Alabama | 1902–17, 1919–42, 1944– |
| Stanford | 1918–42, 1946– (its rugby years are not major) |
| Washington | 1916– (so Dobie's 1908–15 Washington is off the spine) |
| Ohio State | 1904, 1913– |
| Chicago | 1892–1939 |
| Carlisle | 1896–1915, 1917 |
| Penn State | 1889, 1891, 1896– |

## Q3. Coaches before 1936

### CFBD /coaches 1869–1935: not fetched

`out/fetch-cfbd-1.txt`: all three calls (`/coaches?minYear=1869&maxYear=1935`, `/games?year=1925`, `/games?year=1900`) returned **HTTP 429 `{"message":"Monthly call quota exceeded."}`**. So `downloads/cfbd-coaches-1869-1935.json` does not exist; I didn't write a placeholder. Re-run after the quota resets:

```
node scripts/fetch-cfbd.mjs ~/Projects/cfb-streak-king/.env downloads "/coaches?minYear=1869&maxYear=1935"
mv downloads/coaches-minYear-1869-maxYear-1935.json downloads/cfbd-coaches-1869-1935.json
```

Then `scripts/cfbd-vs-howell.py <howell-all.json> downloads/cfbd-coaches-1869-1935.json <name-aliases.json> 1869 1935` produces the reconciliation this section would have had. Streak King's pre-1978 research notes say CFBD `/games` reaches back to 1869. Whether `/coaches` does is open.

### Stand-in 1: CFBD vs Howell where CFBD exists (1936–1959)

`out/cfbd-vs-howell.txt`. This is the same prefix idea as `scripts/lib/coach.mjs`.

- **Team-seasons checked:** 2,739 Howell major team-seasons with a canonical id.
- **No CFBD row: 536 (19.6%).**
- **Single coach:** the season W-L-T equals Howell's in 2,197; it differs in 2. St. Mary's 1945 has 6-2 vs Howell's 7-2; Ohio State 1950 has 6-0 vs 6-3.
- **Multi-coach:** 4 seasons. 3 tile the result sequence as prefixes; Virginia Tech 1942 doesn't (CFBD double-credits it, 14-4-2 for a 7-2-1 season).
- **Fill:** games, wins, losses and ties are non-null in 100% of CFBD rows in every decade 1936–2026.

### Stand-in 2: Wikipedia navboxes as the coach source, every major team-season 1869–2025

`out/coach-holes.txt` (`scripts/coach-holes.py`). Column meanings:
- **named:** the navbox names a coach that season.
- **no coach:** the navbox says "No coach".
- **hole:** the navbox exists but skips the year.
- **no navbox:** the team has no navbox in the map. After 1935 this is mostly teams the map never tried.
- **2+ entries:** two or more entries cover the season (a mid-season change), so it needs a W-L prefix the navbox doesn't carry.
- **co:** one entry names two coaches.
- **CFBD hole:** a Howell major team-season with no CFBD row.

| Decade | Major team-seasons | Named | No coach | Hole | No navbox | 2+ entries | Co | CFBD rows | CFBD hole |
|---|---|---|---|---|---|---|---|---|---|
| 1860s | 2 | 0 | 2 | 0 | 0 | 0 | 0 | – | – |
| 1870s | 55 | 1 | 54 | 0 | 0 | 1 | 0 | – | – |
| 1880s | 125 | 15 | 100 | 5 | 5 | 0 | 0 | – | – |
| 1890s | 281 | 207 | 56 | 11 | 7 | 4 | 10 | – | – |
| 1900s | 664 | 656 | 4 | 3 | 1 | 5 | 5 | – | – |
| 1910s | 816 | 813 | 1 | 0 | 2 | 6 | 4 | – | – |
| 1920s | 1,026 | 1,020 | 0 | 0 | 6 | 6 | 8 | – | – |
| 1930s | 1,217 | 1,206 | 0 | 0 | 11 | 2 | 2 | 389 (1936–39) | 114 |
| 1940s | 1,109 | 1,038 | 0 | 0 | 71 | 2 | 2 | 871 | 238 |
| 1950s | 1,127 | 1,028 | 0 | 0 | 99 | 3 | 0 | 943 | 184 |
| 1960s | 1,182 | 964 | 0 | 0 | 218 | 0 | 0 | 1,051 | 131 |
| 1970s | 1,333 | 950 | 0 | 0 | 383 | 8 | 0 | 1,142 | 191 |
| 1980s | 1,140 | 801 | 0 | 0 | 339 | 9 | 0 | 1,076 | 64 |

**Pre-1936 totals:**
- 4,186 major team-seasons, 36,501 team-game rows.
- **Named:** 3,918.
- **No coach:** 217 team-seasons (1,515 rows).
- **Hole:** 19 (165 rows). They are mostly Williams 1886–1895, plus Penn State 1889/1891, Florida 1904, Colby 1904 and Haverford 1891.
- **No navbox:** 32 team-seasons, from 7 teams: FortBenning, MIT, MareIslandMarines, Millsaps, Regis, TennesseeMedical, Whitman.
- **2+ entries:** 24. **Co:** 29.

**Navbox vs CFBD, 1936 on:** 7,328 team-seasons agree on the coach's surname. 19 "disagree", and every one is a spelling (Di Francesca/DiFrancesca, Woodard/Woodward, Rodgers/Rogers, Jr./Sr., J.P. Moran/James Moran Sr.). Effective agreement is 7,347 of 7,347.

Per team-game row, pre-1936, from `out/join.txt` (one = one coach named):

| Decade | One | Co | Multi (unresolved) | No coach | Hole | No navbox |
|---|---|---|---|---|---|---|
| 1880s | 294 | 0 | 0 | 613 | 35 | 31 |
| 1890s | 2,048 | 109 | 41 | 450 | 107 | 46 |
| 1900s | 5,823 | 42 | 46 | 11 | 23 | 6 |
| 1910s | 6,398 | 28 | 53 | 0 | 0 | 19 |
| 1920s | 8,769 | 72 | 52 | 0 | 0 | 47 |
| 1930–35 | 6,458 | 15 | 18 | 0 | 0 | 9 |

**Streak King's own coach holes from 1936.** These are game sides of major team-seasons where the payload has no coach (`out/join.txt`):

| Decade | Sides with no coach | Major sides | Example teams |
|---|---|---|---|
| 1936–39 | 907 | 4,641 | Centenary, Grinnell, Mercer, Citadel, VMI, Wofford |
| 1940s | 959 | 10,419 | |
| 1950s | 192 | 10,989 | |
| 1960s | 185 | 11,749 | |
| 1970s | 685 | 14,640 | |
| 1980s | 176 | 12,948 | |
| 1990s on | 6 | | Florida A&M, 2000s |

These are teams that were major then and aren't FBS now. The navboxes fill most of them.

### Wikipedia per-season rows vs Howell, 1890–1935

`out/summarize.txt`. The 271 coach-seasons of the 15-coach sample (plus the extra 9 pages) that fall in 1890–1935:
- **221 match** Howell's season W-L-T exactly.
- **35 are off the spine** (the school wasn't major that year).
- **15 mismatch.**

The mismatches are 13 Stagg seasons at Chicago and 2 Warner seasons at Carlisle. Stagg's come from Howell counting games against high schools, athletic clubs and service teams that Wikipedia's record leaves out. Chicago 1899 is 16-0-2 in Howell, with four high-school wins, and 12-0-2 on Wikipedia.

## Q4. Wikipedia sample

`out/join.txt`, `out/join.json`, `downloads/wikipedia/`.
- **Pages:** 24 coach pages (the 15 asked for, plus Paterno, Bowden, Saban, Osborne, Hayes, Smart, Meyer, Brian Kelly and Tressel for the known answers), fetched through the MediaWiki API with revids saved.
- **Rate:** at 1.5 s between requests Wikipedia answered 429 after 10 pages; 3 s with a backoff worked.
- **Columns:** "Computed" is the coach's games on the spine (Howell 1869–1935 by navbox, the payload's stints 1936+), on-field, bowls included. "Off-spine" is the sum of the Wikipedia rows for seasons not on the spine.

| Coach | Infobox | Table season sum | Computed (spine) | Seasons match / mismatch / off-spine | Off-spine record (from Wikipedia rows) |
|---|---|---|---|---|---|
| Knute Rockne | 105–12–5 | 105–12–5 | 105-12-5 | 13 / 0 / 0 | – |
| Fielding Yost | 198–35–12 | 198–35–12 | 165-29-10 | 25 / 0 / 5 | 33-6-2 (Ohio Wesleyan 1897, Nebraska 1898, Kansas 1899, Stanford 1900, San Jose Normal 1900) |
| Amos Alonzo Stagg | 314–99–35 | 295–200–36 | 282-123-29 | 30 / 13 / 14 | 58-78-7 (Springfield 1890, Pacific 1933–46) |
| Pop Warner | 319–106–32 | 319–106–32 | 319-111-33 | 40 / 2 / 2 | 7-4-0 (Georgia 1895–96) |
| Walter Camp | 79–5–3 | 66–5–3 | 68-2-0 | 4 / 0 / 3, 1 unparsed | 11-3-3 (Stanford 1892, 1894–95) |
| Bud Wilkinson | 145–29–4 | 145–29–4 | 145-29-4 | 17 / 0 / 0 | – |
| Bear Bryant | 323–85–17 | 323–85–17 | 323-85-17 | 38 / 0 / 0 | – |
| Frank Leahy | 107–13–9 | 107–13–9 | 107-13-9 | 13 / 0 / 0 | – |
| Gil Dobie | 182–45–15 | 182–45–15 | 116-44-11 | 22 / 0 / 11 | 66-1-4 (North Dakota State 1906–07, Washington 1908–15) |
| John Heisman | 186–70–18 | 186–70–18 | 148-60-14 | 26 / 0 / 11 | 38-10-4 (Oberlin, Buchtel, Auburn 1895–99, Clemson 1900–01) |
| Robert Zuppke | 131–81–12 | 131–81–12 | 131-81-12 | 29 / 0 / 0 | – |
| Robert Neyland | 173–31–12 | 173–31–12 | 173-31-12 | 21 / 0 / 0 | – |
| Fritz Crisler | 116–32–9 | 116–32–9 | 116-32-9 | 18 / 0 / 0 | – |
| Jock Sutherland | (no infobox record) | 144–28–14 | 144-28-14 | 20 / 0 / 0 | – |
| Wallace Wade | 171–49–10 | 171–49–10 | 171-49-10 | 24 / 0 / 0 | – |

Every mismatched season, exactly:

| Coach | Season | Wikipedia | Computed | Why |
|---|---|---|---|---|
| Stagg | Chicago 1892, 1894–1904, 1918 (13 seasons) | e.g. 1899 12-0-2, 1918 0-6-0 | 16-0-2, 4-6-1 | Howell includes high-school, club and service-team games (1918: Crane J.C., Hyde Park High, Chicago YMCA) |
| Warner | Carlisle 1908 | 11-2-1 | 10-2-1 | One more win on Wikipedia; Howell has 13 games |
| Warner | Carlisle 1914 | 5-9-1 | 5-10-1 | One more loss in Howell (it includes the New England All-Stars) |
| Bowden | Florida State 1983 | 8-4 ("7–5 ^") | 7-5 | Forfeit win vs Tulane (on the field L 28–34) |
| Saban | Alabama 2007 | 2-6 | 7-6 | 5 wins vacated |
| Brian Kelly | Notre Dame 2012 | 0-0 | 12-1 | Vacated |
| Brian Kelly | Notre Dame 2013 | 0-4 | 9-4 | Vacated. Wikipedia's rows also drop the 2012 loss, so its table sums to 110 losses against an infobox of 109 |

**Concurrent job.** Warner's computed 319-111-33 is 7 W, 9 L and 1 T more than Wikipedia's on-spine 312-102-32. The difference is the two Carlisle seasons above plus **Iowa State 1895 (3-4) and 1899 (5-4-1)**. The Iowa State navbox co-credits Warner there ("Bert German & Pop Warner", "Joe Meyers & Pop Warner") while he coached Georgia and Carlisle; his record excludes them (`out/warner-check.txt`).

**Internal inconsistencies in Wikipedia itself:**
- Stagg's yearly table sums to 295-200-36 against his infobox's 314-99-35.
- Camp's sums to 66-5-3 against 79-5-3, with one row unparsed.
- Kirby Smart's infobox (124-23, "as of games through 10/17/26") is ahead of his table (123-22).
- Osborne's and Sutherland's infoboxes use `{{Winning percentage}}` or nothing.

Use the per-season rows, never the infobox.

## Q5. Join rules the ledger must carry

| # | Rule | Example |
|---|---|---|
| 1 | **Mid-season change: segments by game.** A team-season can have 2+ coaches, cut at a game ordinal or a date. | 1936+: CFBD rows resolved as W-L prefixes (`coach.mjs`), plus 142 researched seasons in Streak King's `coach-overrides.json` (Penn State 2011: Paterno games 1–9, Bradley the last four; USC 2015: Sarkisian 3-2, Helton from game 6). Pre-1936: 24 team-seasons have 2+ navbox entries and **no per-coach W-L in the navbox**, so they need the coaches' Wikipedia rows or season articles to place the cut. CFBD 1936–59 had only 4 multi-coach seasons, 1 of them broken (Virginia Tech 1942). |
| 2 | **Interims.** Credit the interim as himself, flagged. | Streak King `markInterim` (a stint that started mid-season and didn't cross a season); navbox `#`: Notre Dame 2004 Kent Baer; Michigan 2025 Biff Poggi from game 13 (payload stint at ordinal 12). |
| 3 | **Acting coach vs the record.** The coach on the sideline isn't always the one credited. | Michigan 2023: the payload credits all 15 games to Jim Harbaugh (`out/join.txt`). The NCAA credits the three September self-suspension games to acting coaches (navbox: Jesse Minter, Jay Harbaugh & Mike Hart, Sherrone Moore) and the November Big Ten-ban games to Harbaugh (hostile-territory `attribution-overrides.json`). Same convention: Jerry Kill 2013, Bob Davie 2019. |
| 4 | **Co-head coaches.** A game can have two credited coaches. | Utah 2004 Fiesta Bowl: Utah credits Meyer and Whittingham; Streak King gives it to Meyer (`coach-overrides.json`), and the payload shows Meyer for the 2005-01-01 game. Pre-1936: 29 team-seasons where one navbox entry names two coaches (Michigan 1891 "Frank Crawford & Mike Murphy"); 2023 Michigan "Jay Harbaugh & Mike Hart". The ledger needs `coaches[]` per game plus a credit rule. |
| 5 | **Concurrent or advisory jobs.** A navbox co-credit that the coach's own record doesn't count. | Warner at Iowa State 1895 and 1899, while head coach at Georgia and Carlisle: +8-8-1 against his 319. Rule: a navbox co-credit is advisory unless the coach's own record includes it. |
| 6 | **Vacated games.** Keep the game and its result; carry `vacated` with a receipt; show on-field and official. | Paterno 111 wins 1998–2011 (official 298, restored to 409 in 2015); Bowden 12 (2006–07); Saban 5 (Alabama 2007); Kelly 21 (Notre Dame 2012–13); Tressel 12 (Ohio State 2010). None are flagged in the payload. |
| 7 | **Forfeits.** The on-field result and the credited result differ. | Florida State vs Tulane 1983: Howell's green row is L 28–34; the record is a forfeit W (Bowden's 389 includes it). The same layer as vacated, with the opposite sign. |
| 8 | **Ties.** A game, not a half-win; a tie breaks a win streak. | 1,316 ties in 20,849 games 1869–1935. Wilkinson's 47 reproduces with ties breaking runs. |
| 9 | **Non-major tenures in a career.** Off the spine, so "first N games" must say "major-college" or bring in other games. | Kelly: Grand Valley State 118-35-2 (1991–2003). Tressel: Youngstown State 135-57-2. Bowden: Howard/Samford 31-6. Hayes: Denison and Miami (OH) 33-11. Yost 33-6-2, Heisman 38-10-4, Dobie 66-1-4. Bryant: none (38 of 38 seasons on the spine). Wikipedia rows give season totals only, no per-game order. |
| 10 | **Non-college opponents.** Howell counts games against high schools, clubs and service teams that a record may not. | Stagg's Chicago, 13 seasons (1892–1904, 1918). 47.2% of 1869–1935 games are against non-major opponents, and only part of those are colleges. A per-game `oppKind` (college / non-college / service) would be needed to word it. |
| 11 | **"No coach" seasons and pre-1880 games.** A game whose coach of record is nobody, as distinct from unknown. | 217 pre-1936 major team-seasons (1,515 team-game rows) are "No coach" on the navbox, nearly all before 1900. 1869–1879 is 113 games under soccer- and rugby-style rules; the coach ledger loses nothing there, but the team ledger has to choose. |
| 12 | **A school's move up to major.** | Team ledger, Streak King's rule (a team's games count from its latest move up, with wartime gaps bridged): 113 teams lose pre-1936 games, **10,349 of 31,860** pre-1936 team-game rows (Army from 1922, Virginia and North Carolina from 1919, Temple from 1971). Coach ledger: a coach's games count at any major school in any of its major spans, but a school's non-major seasons aren't on Howell at all (Dobie's Washington 1908–15). |
| 13 | **Coach identity across sources.** | Navbox (Wikipedia page title) vs CFBD id vs payload name: "Gil Dobie"/"Gilmour Dobie", "Robert Neyland"/"Bob Neyland", "Rat Rogers"/"Ira Rodgers", "Chalmer Woodward"/"Woody Woodard". Needs a crosswalk keyed on CFBD id and Wikipedia title. |

**The three hardest:**
1. **Who gets the credit for a game** (rules 3, 4, 5). A game has zero, one or two credited coaches, and the credit can differ from who was on the sideline. Michigan 2023 splits three ways; Utah 2004 is double-credited; Iowa State 1899 is a co-credit the coach's record ignores.
2. **Vacated and forfeited results as a ruling layer over on-field results** (rules 6, 7). Five of the known answers turn on it, none of it is in any source the spine reads, and it has to be researched game by game with receipts.
3. **Careers that leave the spine** (rules 9, 10, 12). Non-major tenures, non-college opponents and a school's non-major seasons decide what "first N games as a head coach" means. A third of the sample coaches have off-spine seasons, and the source for them (Wikipedia's season rows) has no game order.

## Q6. AP ranks per game

From cfb-streak-king `src/lib/schema.ts`, `scripts/data/build-payload.mjs` (`rankOf`), `specs/research/pre-1978.md`, and the payload (`out/summarize.txt`).

- **`games.hr` / `games.ar`** are the home and away AP rank at kickoff: 1–25 ranked, `UNRANKED = 0`, `RANK_UNKNOWN = -1` when no poll was in effect yet.
- **The poll in effect** is the latest poll dated strictly before the game day. A poll dated the game day already reflects that game, so the previous one applies.
- **No preseason poll before 1950.** The first poll of 1936–1949 came in mid-October. In the payload, 2,322 of 5,468 game sides in 1936–39 and 3,552 of 11,962 in the 1940s are -1. From 1950 on, none are.
- **Poll depth by era,** from the max rank in the payload: 20 for 1936–1960, 10 for 1961–1967, 20 for 1968–1988, 25 from 1989.
- **"Vs top 10"** means the same thing in every era. **"Vs ranked"** doesn't.
- **Final polls before 1968 were released before the bowls** (1965 excepted).
- **Hostile Territory's `rules.json`:** "top10_at_kickoff" is the most recent AP poll before the game; a 1936–49 game before that season's first poll doesn't count.
- **Demo:** Saban vs AP top 10 is 47-25 in 72 games (payload). Leahy has 21 games with no poll in effect.
- **Before 1936 there is no AP poll at all.** "Vs top 10 through N games" boards start at 1936, and a coach's early-season games before 1950 must read "no poll yet", not "unranked".

## Q7. Known answers

Computed by `scripts/join.mjs` (`out/join.txt`). Results are on-field from the spine, with bowls included. Vacated and forfeit adjustments are applied as named constants where marked; they are rulings, not in the payload.

| Check | Published | Computed | Difference and reason |
|---|---|---|---|
| Knute Rockne career | 105-12-5 | **105-12-5** | none (Howell Notre Dame 1918–30 × navbox, 122 games) |
| Bud Wilkinson win streak | 47 (1953–57) | **47**, last win 1957-11-09 | none (payload; ties break a run) |
| Bud Wilkinson career | 145-29-4 | **145-29-4** | none |
| Bear Bryant career wins | 323 | **323** (323-85-17) | none. Scope: all four schools, bowls included; 308-73-15 without bowls |
| Bear Bryant at Alabama | 232-46-9 | **232-46-9** | none |
| Joe Paterno on-field | 409 | **409** (409-136-3) | none |
| Joe Paterno, 1998–2011 vacated | 298 | **298** (111 wins vacated) | none |
| Bobby Bowden on-field | 389 | **388** = 357 major (WVU 42-26, FSU 315-98-4) + 31 Samford (Wikipedia rows) | −1: the 1983 Tulane forfeit. Howell has the on-field loss |
| Bobby Bowden official | 377 | **376** (388 − 12 vacated) | −1: the same forfeit. With the forfeit ruling it is 377 |
| Nick Saban career (last season 2023) | 292-71-1 | **297-71-1** on-field; **292** with 5 vacated 2007 wins removed | −5 = 2007 vacated |
| Nick Saban at Alabama | 201-29 official, 206-29 on-field | **206-29-0**, 201 official | none |
| Kirby Smart, first 100 Georgia games | – | **85-15-0** (game 100 on 2023-09-23) | no published figure to check; 145 Georgia games through 2026 to date, 123-22-0 |
| Urban Meyer, first 24 at Ohio State | 24-0 | **24-0-0** (game 24 on 2013-11-30) | none |
| Urban Meyer major career | 187-32 | **187-32-0** | none (the Utah 2004 Fiesta credited to Meyer) |
| Fielding Yost, Michigan 1901–05 | 55-1-1 | **55-1-1** | none |
| Fielding Yost career | 198-35-12 | **165-29-10** on the spine; + 33-6-2 off-spine = 198-35-12 | the off-spine seasons |
| Tom Osborne | 255-49-3 | **255-49-3** | none |
| Woody Hayes at Ohio State | 205-61-10 | **205-61-10** | none |
| Woody Hayes career | 238-72-10 | **205-61-10** on the spine; + 33-11 (Denison, Miami (OH) 1949–50) = 238-72-10 | the off-spine seasons |
| Brian Kelly | 297 wins (Wikipedia, as of 2025-10-25) | **200-76-0** major + 118-35-2 GVSU = 318 on-field; − 21 vacated = 297 | none once the rulings are applied |
| Jim Tressel | 229-79-2 | **106-22-0** at Ohio State + 135-57-2 YSU = 241; − 12 vacated (2010) = 229 | none once the rulings are applied |

## Tried, nothing usable, don't retry

- **CFBD `/coaches` and `/games` before 1936 this month.** HTTP 429 "Monthly call quota exceeded." This one is worth retrying once the quota resets (command above). Don't burn calls on `/games` samples; Streak King's notes already say `/games` reaches 1869 and matches Howell.
- **sportsdataverse `espn_cfb_coach_careers` (coach_careers.csv, 3.2 MB, updated 2026-10-18).** 447 rows, all HC, first_season from 2004, 601 columns of play-by-play aggregates (EPA, success rates, fourth-down calls). No wins, losses or per-season records; only wins split home/away/neutral. It is also incomplete: Saban shows 18 seasons and 244 games for 2004–2023. Useless for a coach ledger.
- **Wikipedia infobox `overall_record` as a number.** Mixed formats (`{{Winning percentage}}`, `<br>`-joined other sports, official vs on-field, stale "as of" dates), and in four of 24 pages it disagrees with the page's own table (Stagg, Camp, Kirby Smart, Brian Kelly). Use the per-season "CFB Yearly Record Entry" rows.
- **Wikipedia API at 1.5 s per request.** 429 after 10 pages. Use 3 s with a backoff (`scripts/fetch-wiki.mjs`), or batch 50 titles per request (`fetch-wiki-navboxes.mjs`).
- **Sports-Reference:** not attempted, per the terms.

## Files

- `README.md` (this file) and `coverage.json`: per-season game counts 1869–1935, coach holes per decade, AP eras, the reconciliation counts.
- `scripts/`:
  - `parse-howell-all.mjs`, `howell-coverage.mjs`: Q1–Q2.
  - `fetch-cfbd.mjs`: the key is read from the env file and never printed.
  - `fetch-wiki.mjs`, `fetch-wiki-navboxes.mjs`, `parse-wiki-coaches.py`, `navbox-map.py`, `coach-holes.py`, `cfbd-vs-howell.py`: Q3–Q4.
  - `join.mjs`: Q4, Q5 examples and Q7.
  - `warner-check.mjs`, `espn-careers.py`, `summarize.mjs`.
- `out/`: each script's stdout plus `join.json`.
- `downloads/wikipedia/`:
  - `navboxes.json` (997 navboxes with revids, retrieved 2026-10-21) and `navbox-titles.json`.
  - `navbox-map.json`: Howell file → navbox; 186 of 193 mapped, auto matches checked by eye in `out/navbox-map.txt`.
  - `coach-pages/`: 24 pages' wikitext with revid and URL.
  - `wiki-coaches.json`: parsed. All CC BY-SA 4.0.
- `downloads/cfbd-coaches-1869-1935.json`: **missing** (quota).
- Big intermediates (`howell-all.json`, 34 MB; `coach-holes.json`) stay in scratch; `parse-howell-all.mjs` regenerates them in seconds.

Run order (scratch layout; paths are arguments):

```
node scripts/parse-howell-all.mjs <csk>/data/raw/jhowell out
node scripts/howell-coverage.mjs out
node scripts/fetch-wiki.mjs downloads/wiki "Knute Rockne" ...          # 3 s apart
node scripts/fetch-wiki-navboxes.mjs downloads/wiki-navbox
python3 -I scripts/parse-wiki-coaches.py downloads/wiki out/wiki-coaches.json
python3 -I scripts/navbox-map.py out/howell-all.json downloads/wiki-navbox/navbox-titles.json out/navbox-map.json
python3 -I scripts/coach-holes.py out/howell-all.json downloads/wiki-navbox/navboxes.json out/navbox-map.json <csk>/data/raw/cfbd-coaches-from-1936.json <csk>/data/ref/name-aliases.json out/coach-holes.json
python3 -I scripts/cfbd-vs-howell.py out/howell-all.json <csk>/data/raw/cfbd-coaches-from-1936.json <csk>/data/ref/name-aliases.json 1936 1959
node scripts/join.mjs <csk>/src/data/payload.json out <csk>/data/ref/name-aliases.json downloads/wiki-navbox/navboxes.json
node scripts/summarize.mjs out <csk>/src/data/payload.json out/coverage.json
```
