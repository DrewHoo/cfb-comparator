# Probe: ESPN per-game player box scores (sportsdataverse `espn_cfb_player_box`)

Probe run 2026-10-21. This is a feasibility probe, not a harvest. Code produced every number below. The scripts are in `scripts/`. Their saved outputs and every API body cited are in the scratch probe dir:

`/private/tmp/claude-501/-Users-drewhoo-Projects-cfb-comparator/3ff4e702-05dc-4dbb-8387-fa6fa9a3d5aa/scratchpad/probe-player-box/` (`downloads/` holds the raw bodies and files, `out/` holds the script outputs, `scripts/` holds the scripts).

The ledger builder can read two files from this directory:
- `stat-layout.json`: season → category → ESPN labels in order, plus `_meta._columns`, which maps each label position to its `.csv` column name.
- `coverage.json`: every per-season number in this README, plus the known-answer results and id stability.

## Verdict

- **Honest first season: 2004 for passing, 2008 for everything else.** Kick returns start in 2009, positions in 2014, and defense in 2024.
  - In 2004–2007 the games are almost all present: FBS team-game coverage is 98.6–99.4%.
  - But rows inside games are missing. In 2004, 12.6% of FBS team-games have receiving rows that fall more than 20 yards short of that team's passing rows. The share drops to 6.5% in 2005, 5.5% in 2006, 2.8% in 2007, and 0.3% in 2008.
  - Passers survive the truncation: Leinart 2004, Tebow 2007 and Keenum 2007–2011 match the published figures exactly. Depth rushers and receivers do not.
- **Nothing licensed reaches before 2004.**
  - ESPN summaries for three 2003 games have the category shells but zero athletes: 232560158 (Sep), 233120265 (Nov), 240040099 (Sugar Bowl, 2004-01-04).
  - CFBD could not be probed. All 4 `/games/players` calls returned HTTP 429 `{"message":"Monthly call quota exceeded."}`, so CFBD's pre-2004 player-game coverage is still **unknown**. See "Not done" at the end.
- **Use the `.csv` (or `.parquet`) assets, not `.csv.gz`.**
  - The `.csv.gz` assets are frozen at 2026-07-12 (2024: 07-18). There is no `player_box_2026.csv.gz`.
  - The `.csv`, `.parquet` and `.rds` assets were rebuilt on 2026-10-18.
  - The stale `.csv.gz` files are where `stat_1..stat_5` come from (see Layout).

## Sources and spans

| source | span | what it is | license / terms |
|---|---|---|---|
| `espn_cfb_player_box` `player_box_<Y>.csv` | 2004–2026 | one row per athlete × game × category | CC BY 4.0 (cfbfastR-data LICENSE, per brief) |
| `espn_cfb_schedules` `cfb_schedule_<Y>.csv` | 2004–2026 | ESPN games: `game_date` (UTC, `YYYY-MM-DDTHH:MMZ`), home/away ids, scores, `neutral_site`, `season_type` (2 = regular, 3 = post), `status` | same |
| `espn_cfb_team_box` `team_box_<Y>.csv` | 2004–2026 | team totals per game, used here to check that player rows add up | same |
| `espn_cfb_rosters` `cfb_rosters_<Y>.csv.gz` | 2004–2026 | season × team × athlete: position, height, weight, DOB, `experience_*`, `games_rostered`, `division` | same |
| `espn_cfb_game_rosters` | 2004–2026 | per-game rosters (huge: 3.1 GB csv total). Sampled 2004 and 2019 only | same |
| cfbfastR-data `schedules/csv/cfb_schedules_<Y>.csv` (CFBD) | 2001–2026 | `home_division` / `away_division`, so FBS can be classified. `game_id` is the ESPN event id, except CFBD-native ids under 10,000,000 | CFBD-derived; see CFBD terms below |
| ESPN site summary API | probed 2003–2026, one game per season | the authority for stat labels | unlicensed public endpoint; use only for probes |

Release freshness (`timestamp.txt`): `espn_cfb_player_box` was last updated 2026-10-18 18:39:16 EDT. The schedules, rosters, game_rosters and crosswalk releases are from 2026-10-18 06:54–10:07 EDT.

## Layout (Measure 1)

- **Fresh `.csv` (2026-10-18): named columns in every season, 2004–2026.**
  - There are no `stat_N` columns at all.
  - The column order changes between seasons. 2004 has 41 columns; 2025 has more because the defensive, fumbles and kickReturns columns were added. Read columns by name, never by position.
- **Stale `.csv.gz` (2026-07-12): every season except 2010 also carries `stat_1..stat_5`.** Only `passing` rows ever use them.
  - These are the rows where ESPN's box had 5 passing labels (no QBR) while its `keys` list had 6.
  - The scraper could not name those rows, so they landed in `stat_N`.
  - Count of rows in `stat_N` per season: 2004 115, 2005 59, 2006 8, 2007 11, 2008 17, 2009 14, 2010 0 (no `stat_N` columns), 2011 4, 2012 4, 2013 9, 2014 19, 2015 22, 2016 17, 2017 18, 2018 20, 2019 17, 2020 10, 2021 25, 2022 23, 2023 2, 2024 147, 2025 80.
  - The fresh `.csv` maps the same rows into the named columns. For example, Phillip Johnson 6/12, 56 yds in game 242410193 sits in `stat_1..5` in the gz and in `completions/passingAttempts` / `passingYards` in the csv.
  - The 2004 probe summary shows the mismatch directly: `labels` has 5 entries and `keys` has 6 (`_meta.label_key_mismatch`).
- **Fresh `.csv` vs gz row diffs** (`out/gz_vs_csv.txt`):
  - The fresh csv **drops** 18 real rows in 2004 (receiving 16, 607 receiving yds) and 9 rows in 2005. The dropped rows belong to low-id athletes such as Bo Scaife (15825) and Bristol Olomua (16705).
  - It also drops 2–5 rows in each season 2012–2015.
  - It **gains** 434 / 566 / 342 defensive rows in 2018 / 2019 / 2020.
  - Yards on the rows both versions share are identical, except for 1–7 rows in 2010, 2011 and 2022.

ESPN labels from the summary API (`stat-layout.json`) are identical across 2004–2026. The only change is which categories exist:

| category | labels (in order) → `.csv` columns | in summary | rows in file |
|---|---|---|---|
| passing | C/ATT, YDS, AVG, TD, INT, QBR → `completions/passingAttempts, passingYards, yardsPerPassAttempt, passingTouchdowns, interceptions, adjQBR` | 2004–2026 (2004 probe game lacked QBR) | all seasons; `adjQBR` is the literal `--` on 75–426 rows/season |
| rushing | CAR, YDS, AVG, TD, LONG → `rushingAttempts, rushingYards, yardsPerRushAttempt, rushingTouchdowns, longRushing` | all | all |
| receiving | REC, YDS, AVG, TD, LONG → `receptions, receivingYards, yardsPerReception, receivingTouchdowns, longReception` | all | all |
| fumbles | FUM, LOST, REC → `fumbles, fumblesLost, fumblesRecovered` | 2016+ | 2016+ |
| defensive | TOT, SOLO, SACKS, TFL, PD, QB HUR, TD → `totalTackles, soloTackles, sacks, tacklesForLoss, passesDefended, hurries, defensiveTouchdowns` | 2016+ | 2016+, but only 36–154 games/season until 2022; 473 in 2023; 918+ in 2024 |
| interceptions | INT, YDS, TD → `interceptions, interceptionYards, interceptionTouchdowns` | all | all. **Trap:** `interceptions` is the same column as passing's INT thrown, so tell the two apart by `category` |
| kickReturns | NO, YDS, AVG, LONG, TD → `kickReturns, kickReturnYards, yardsPerKickReturn, longKickReturn, kickReturnTouchdowns` | all | 2004: none; 2005–2008: 39–92 games of ~700–800; 2009+: ~all |
| puntReturns | NO, YDS, AVG, LONG, TD → `puntReturns, …` | all | all |
| kicking | FG, PCT, LONG, XP, PTS → `fieldGoalsMade/fieldGoalAttempts, fieldGoalPct, longFieldGoalMade, extraPointsMade/extraPointAttempts, totalKickingPoints` | all | all |
| punting | NO, YDS, AVG, TB, In 20, LONG → `punts, puntYards, grossAvgPuntYards, touchbacks, puntsInside20, longPunt` | all | all |

- **Fidelity:** for the probe game in each season 2004–2025, the file rows equal the ESPN summary lines one-for-one, with zero mismatches in the first two stats (`out/summary_vs_file.txt`). The file is a faithful copy of ESPN.
- **2026 exception:** for 401856634 (2026-09-05, ECU at Alabama), ESPN now shows 55 defensive lines that the file lacks; the file has 4. That game is 1 of 99 week-1 games with fewer than 10 defensive rows (`out/defensive_rows_2026_by_week.txt`). ESPN back-fills boxes after the fact, and the release does not re-pull old games.
- **Blank values:** the blank-primary-stat rate is 0.0 for every category in every season (a row exists only when the stat exists). The only non-numeric value found is `adjQBR = "--"`.

## Coverage per season (the suspected failure mode)

"ESPN-final FBS games w/o rows" counts games that are `STATUS_FINAL` in the ESPN schedule, involve an FBS team, and have no player rows. "Games ESPN never had" counts CFBD games whose ids are CFBD-native (no ESPN event), after removing CFBD's own duplicates.

FBS team-game coverage = FBS team-games with any row ÷ (ESPN final FBS team-games + CFBD-native games).

For the sample-20 column, 20 FBS teams were drawn per season with `random.Random(season)`. The three numbers are the teams' scheduled games, games with any row for that team, and games with a passing row for that team.

The two "short" columns test whether rows are missing inside games that are present:
- "rec short >20": that side's receiving rows sum to more than 20 yards below its passing rows.
- "carries short >5": the player carries fall more than 5 short of the team-box carries. Kneels and sacks account for 1–3 of these until Team rows appear in 2014.

| season | pb games | ESPN final FBS-FBS / FBS-FCS | CFBD completed FBS-FBS / FBS-FCS | ESPN-final FBS games w/o rows | games ESPN never had | FBS team-game coverage | sample-20 sched / any row / passing row | FBS sides rec short >20 yds | FBS sides carries short >5 | defensive games | kickReturns games | neutral true | pb bytes (csv) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2004 | 699 | 655 / 52 | 627 / 66 | 8 | 0 | 0.9883 | 237 / 234 / 233 | 170 (12.6%) | 117 | 0 | 0 | 0.003 | 2246419 |
| 2005 | 708 | 664 / 54 | 636 / 54 | 10 | 0 | 0.9855 | 233 / 229 / 224 | 89 (6.5%) | 80 | 0 | 39 | 0.000 | 2447360 |
| 2006 | 787 | 711 / 77 | 682 / 78 | 1 | 4 | 0.9940 | 250 / 249 / 249 | 82 (5.5%) | 36 | 0 | 51 | 0.000 | 2667926 |
| 2007 | 793 | 718 / 80 | 686 / 80 | 5 | 0 | 0.9914 | 250 / 247 / 247 | 42 (2.8%) | 23 | 0 | 74 | 0.000 | 2842463 |
| 2008 | 806 | 719 / 88 | 683 / 88 | 3 | 0 | 0.9954 | 253 / 252 / 252 | 4 (0.3%) | 3 | 0 | 92 | 0.061 | 2878063 |
| 2009 | 810 | 714 / 94 | 680 / 94 | 0 | 0 | 1.0000 | 256 / 256 / 256 | 1 (0.1%) | 3 | 0 | 810 | 0.060 | 3179891 |
| 2010 | 808 | 718 / 90 | 683 / 90 | 0 | 0 | 1.0000 | 254 / 254 / 254 | 0 (0.0%) | 0 | 0 | 807 | 0.070 | 3212264 |
| 2011 | 805 | 715 / 97 | 680 / 97 | 7 | 0 | 0.9908 | 255 / 251 / 251 | 3 (0.2%) | 0 | 0 | 805 | 0.067 | 3169533 |
| 2012 | 841 | 739 / 108 | 697 / 108 | 6 | 0 | 0.9924 | 246 / 246 / 246 | 9 (0.6%) | 0 | 0 | 839 | 0.064 | 3239502 |
| 2013 | 855 | 739 / 111 | 702 / 111 | 2 | 0 | 0.9975 | 253 / 252 / 252 | 2 (0.1%) | 0 | 0 | 852 | 0.061 | 3334013 |
| 2014 | 870 | 760 / 107 | 721 / 108 | 0 | 0 | 1.0000 | 259 / 259 / 259 | 7 (0.4%) | 1 | 0 | 868 | 0.074 | 3433896 |
| 2015 | 873 | 765 / 105 | 724 / 105 | 0 | 0 | 1.0000 | 258 / 258 / 258 | 7 (0.4%) | 20 | 0 | 868 | 0.073 | 3435582 |
| 2016 | 875 | 760 / 113 | 719 / 113 | 1 | 0 | 0.9988 | 258 / 258 / 258 | 2 (0.1%) | 7 | 69 | 870 | 0.077 | 4498079 |
| 2017 | 877 | 776 / 98 | 736 / 98 | 0 | 0 | 1.0000 | 249 / 249 / 249 | 7 (0.4%) | 0 | 55 | 869 | 0.073 | 4429965 |
| 2018 | 887 | 772 / 112 | 733 / 112 | 0 | 0 | 1.0000 | 251 / 251 / 251 | 8 (0.5%) | 0 | 36 | 874 | 0.072 | 4451111 |
| 2019 | 891 | 774 / 114 | 734 / 114 | 0 | 0 | 1.0000 | 255 / 255 / 255 | 9 (0.5%) | 7 | 36 | 870 | 0.069 | 4376308 |
| 2020 | 571 | 534 / 34 | 508 / 34 | 0 | 0 | 1.0000 | 182 / 182 / 182 | 9 (0.8%) | 6 | 37 | 560 | 0.072 | 2850434 |
| 2021 | 891 | 770 / 117 | 732 / 117 | 0 | 0 | 1.0000 | 254 / 254 / 253 | 2 (0.1%) | 10 | 154 | 856 | 0.073 | 4883055 |
| 2022 | 900 | 776 / 120 | 734 / 120 | 0 | 0 | 1.0000 | 248 / 248 / 248 | 4 (0.2%) | 0 | 70 | 864 | 0.072 | 4502016 |
| 2023 | 911 | 792 / 118 | 792 / 118 | 0 | 0 | 1.0000 | 261 / 261 / 261 | 0 (0.0%) | 0 | 473 | 866 | 0.069 | 6339777 |
| 2024 | 965 | 798 / 121 | 798 / 121 | 0 | 0 | 1.0000 | 261 / 261 / 261 | 1 (0.1%) | 0 | 918 | 913 | 0.064 | 8739614 |
| 2025 | 958 | 808 / 126 | 808 / 126 | 0 | 0 | 1.0000 | 251 / 251 / 251 | 0 (0.0%) | 0 | 935 | 901 | 0.057 | 8910074 |
| 2026 | 510 | 388 / 122 | 388 / 122 | 0 | 0 | 1.0000 | 125 / 125 / 125 | 1 (0.1%) | 0 | 510 | 466 | 0.014 | 4914141 |

Reading the table:
- **CFBD has fewer FBS-FBS games than ESPN through 2022.** The cfbfastR CFBD schedules for 2001–2022 contain **no postseason games** (`season_type` is all `regular`). Postseason games first appear in 2023.
  - For bowls, the ESPN schedule is the only universe.
  - CFBD 2004 also lists 7 FBS games twice, once under a CFBD-native id and once under the ESPN id, e.g. 63827 and 242690050, Tennessee St at Florida A&M. It also labels Florida A&M `fbs` that year.
- **Missing games are real ESPN holes, not scraper bugs.**
  - The 2005 USC–Washington State game (253020030) is in the ESPN schedule. Its summary today has `players` for both teams but 0 athletes (`downloads/espn_summary/summary_missing2005_253020030.json`).
  - The four 2006 Hawai'i home games against UNLV, Eastern Illinois, Nevada and Idaho exist only in CFBD, under ids 63843–63846. ESPN never had those events, so they are absent from the ESPN schedule too. Coverage measured against the ESPN schedule alone looks perfect for Hawai'i 2006 and is wrong.
  - Worst team-seasons: Hawai'i 2006 is missing 4 games and Western Kentucky 2007 is missing 5 (its FBS transition year). Other missing games are scattered one per team; 2004 has 15 teams missing a game and 2011 has 14 (`team_game_coverage.json` → `worst_teams_missing`).
- **When a game is present, both sides are present**, FCS sides included: in 2004–2026, `side_presence` never records a missing side. But FCS sides are the thinner ones: in 2004, 34.6% of FCS sides are short more than 20 receiving yards.

### Within-game reconciliation against `espn_cfb_team_box` (match share per team-game)

| season | pass = team netPassing | rush (incl. Team rows) = team rush | rush excl. Team rows = team rush | carries = team carries | receiving = passing |
|---|---|---|---|---|---|
| 2004 | 0.175 | 0.521 | 0.521 | 0.498 | 0.729 |
| 2005 | 0.172 | 0.579 | 0.579 | 0.553 | 0.839 |
| 2006 | 0.173 | 0.711 | 0.711 | 0.696 | 0.896 |
| 2007 | 0.199 | 0.607 | 0.607 | 0.595 | 0.926 |
| 2008 | 0.206 | 0.619 | 0.619 | 0.609 | 0.987 |
| 2009 | 0.199 | 0.575 | 0.575 | 0.564 | 0.995 |
| 2010 | 0.194 | 0.600 | 0.600 | 0.585 | 1.000 |
| 2011 | 0.214 | 0.632 | 0.632 | 0.625 | 0.997 |
| 2012 | 0.999 | 0.603 | 0.603 | 0.594 | 0.993 |
| 2013 | 0.999 | 0.587 | 0.587 | 0.575 | 0.997 |
| 2014 | 0.996 | 0.629 | 0.590 | 0.624 | 0.979 |
| 2015 | 0.991 | 0.594 | 0.564 | 0.585 | 0.958 |
| 2016 | 0.994 | 0.975 | 0.595 | 0.974 | 0.978 |
| 2017 | 0.996 | 0.986 | 0.588 | 0.986 | 0.986 |
| 2018 | 0.994 | 0.989 | 0.591 | 0.988 | 0.984 |
| 2019 | 0.998 | 0.989 | 0.579 | 0.989 | 0.987 |
| 2020 | 1.000 | 0.991 | 0.606 | 0.991 | 0.983 |
| 2021 | 0.992 | 0.987 | 0.595 | 0.989 | 0.987 |
| 2022 | 0.995 | 0.993 | 0.569 | 0.993 | 0.988 |
| 2023 | 1.000 | 0.998 | 0.602 | 0.999 | 0.996 |
| 2024 | 1.000 | 0.993 | 0.576 | 0.993 | 0.993 |
| 2025 | 0.999 | 1.000 | 0.592 | 1.000 | 0.998 |
| 2026 | 0.996 | 0.996 | 0.598 | 0.996 | 0.989 |

Reading it:
- **The 2004–2011 team box `netPassingYards` is the wrong one.** It runs a median of 13–15 yards *above* the player sum on about 80% of team-games. Yet Leinart 2004 and Keenum 2007–2011 player sums match the published figures exactly, so do not use the pre-2012 team box as a reconciliation gate for passing.
- **Team rows are real and carry kneels and team plays.** They are named " Team", with a leading space; 9 are named "- Team" in 2016. Their `athlete_id` is negative: minus the team's `team_alternate_ids_sdr`, e.g. −7798 for Virginia Tech, not minus the ESPN team_id. In 2014, some Team rows have *positive* 7-digit ids (team 135: 2991632, 3060775), so filter on name as well as on sign.
  - They appear in 2013 (7 rows) and 2014–2015 (86–134 rows), and run at about 1,000/season from 2016.
  - With them, team rushing reconciles 97–100% from 2016. Without them, about 59%.
  - In 2019 there were 754 team rushing rows, 739 of them negative, totalling −4,160 yds on 1,203 carries.
  - Before 2014 they do not exist, so team rushing reconciles only 52–71% (team minus players has a median of −2 to −3 yards and 1–2 carries). That residue is kneels that were never written as rows.
  - Exclude Team rows from player stats.
- **Sacks sit in the QB's rushing line** (the NCAA convention). The file gives Burrow 2019 115 carries for 368 yds (`out/sacks_team_rows.txt`), which matches the NCAA line (recalled, not probed). Passing yards are gross.

## Known answers (Measure 2)

All sums are over every game in the file, bowls included (`known_answers.json`).

| check | file | published | diff | games in file | of which postseason | athlete_id |
|---|---|---|---|---|---|---|
| Matt Leinart 2004 passing yards | 3322 | 3322* | +0 | 13 | 332 | 120511 |
| Matt Leinart 2004 passing TDs | 33 | 33* | +0 | 13 | 5 | 120511 |
| Reggie Bush 2005 rushing yards | 1643 | 1740* | **−97** | 12 | 82 | 145158 |
| Colt Brennan 2006 passing TDs | 42 | 58 | **−16** | 10 | 5 | 145275 |
| Tim Tebow 2007 rushing TDs | 23 | 23 | +0 | 13 | 1 | 183484 |
| Tim Tebow 2007 passing TDs | 32 | 32 | +0 | 13 | 3 | 183484 |
| Joe Burrow 2019 passing yards | 5671 | 5671 | +0 | 15 | 956 | 3915511 |
| Joe Burrow 2019 passing TDs | 60 | 60 | +0 | 15 | 12 | 3915511 |
| Melvin Gordon 2014 rushing yards | 2587 | 2587 | +0 | 14 | 251 | 514218 (named "Melvin Gordon III") |
| Melvin Gordon 2014 best game | 408 | 408 | +0 | — | — | game 400547974, 2014-11-15, Nebraska at Wisconsin |
| Samaje Perine 2014 best game | 427 | 427 | +0 | — | — | game 400547894, 2014-11-22, Kansas at Oklahoma |
| Ja'Marr Chase 2019 receiving yards | 1780 | 1780 | +0 | 14 | 282 | 4362628 |
| Ashton Jeanty 2024 rushing yards | 2601 | 2601 | +0 | 14 | 104 | 4890973 |
| Case Keenum career passing yards 2007–2011 | 19217 | 19217 | +0 | 57 | 1341 | 191981 |
| DeVonta Smith 2020 receiving yards | 1856 | 1856 | +0 | 13 | 345 | 4241478 |

\* The brief gave no published figure for Leinart or Bush. These are recalled figures; Sports-Reference is off-limits, so they were not re-checked.

- **Bush −97:** the USC–Washington State game of 2005-10-29 (253020030) has no athletes at ESPN (`out/audit_usc_2005_bush.txt`). The 97 yards are presumably that game. All of his other 12 games are present.
- **Brennan −16:** the four Hawai'i home games of 2006 (UNLV 9/16, Eastern Illinois 9/30, Nevada 10/7, Idaho 10/28) do not exist at ESPN (`out/audit_hawaii_2006_brennan.txt`). The file has 10 of his 14 games.
- No duplicate rows were found: 0 duplicate (game, team, athlete, category) keys in any season.

## Rosters (Measure 3)

| season | athletes | roster row (same team) | position | birth date | height | weight | class (experience) | Senior share of matched |
|---|---|---|---|---|---|---|---|---|
| 2004 | 3616 | 1.000 | 0.000 | 0.956 | 0.999 | 1.000 | 0.843 | 0.71 |
| 2005 | 3969 | 1.000 | 0.000 | 0.932 | 0.999 | 1.000 | 0.814 | 0.68 |
| 2006 | 4166 | 1.000 | 0.000 | 0.914 | 0.997 | 0.998 | 0.781 | 0.64 |
| 2007 | 4475 | 1.000 | 0.000 | 0.877 | 0.995 | 0.996 | 0.825 | 0.68 |
| 2008 | 4554 | 1.000 | 0.000 | 0.802 | 0.996 | 0.997 | 0.879 | 0.72 |
| 2009 | 4787 | 1.000 | 0.000 | 0.618 | 0.997 | 0.998 | 0.894 | 0.74 |
| 2010 | 4839 | 1.000 | 0.000 | 0.418 | 0.997 | 0.998 | 0.922 | 0.76 |
| 2011 | 4778 | 1.000 | 0.000 | 0.251 | 0.998 | 0.999 | 0.957 | 0.81 |
| 2012 | 4942 | 1.000 | 0.000 | 0.140 | 0.998 | 0.998 | 0.991 | 0.84 |
| 2013 | 5184 | 1.000 | 0.000 | 0.105 | 0.998 | 0.999 | 0.994 | 0.83 |
| 2014 | 5186 | 0.981 | 0.998 | 0.133 | 0.996 | 0.996 | 0.996 | 0.83 |
| 2015 | 5155 | 0.991 | 0.998 | 0.157 | 0.999 | 0.999 | 0.999 | 0.82 |
| 2016 | 6854 | 0.993 | 0.999 | 0.178 | 0.999 | 0.999 | 1.000 | 0.82 |
| 2017 | 6569 | 0.989 | 0.998 | 0.219 | 0.999 | 0.999 | 0.998 | 0.82 |
| 2018 | 6754 | 0.990 | 0.998 | 0.229 | 0.998 | 0.999 | 0.998 | 0.80 |
| 2019 | 6674 | 0.991 | 0.998 | 0.245 | 0.997 | 0.999 | 0.997 | 0.78 |
| 2020 | 4999 | 0.998 | 0.995 | 0.295 | 0.999 | 1.000 | 0.999 | 0.77 |
| 2021 | 8336 | 0.998 | 0.993 | 0.230 | 0.998 | 0.999 | 0.998 | 0.78 |
| 2022 | 7376 | 0.993 | 0.998 | 0.223 | 0.998 | 1.000 | 0.999 | 0.79 |
| 2023 | 9383 | 0.998 | 0.999 | 0.163 | 0.998 | 1.000 | 0.999 | 0.73 |
| 2024 | 12272 | 0.999 | 1.000 | 0.092 | 0.998 | 0.999 | 0.999 | 0.60 |
| 2025 | 12550 | 0.994 | 0.999 | 0.043 | 0.997 | 0.997 | 1.000 | 0.40 |
| 2026 | 11895 | 0.996 | 0.999 | 0.000 | 0.997 | 0.994 | 1.000 | 0.36 |

- **Position is absent before 2014.** In 2004–2013 every `position` is "Unknown" / `-`. The 2004 game rosters agree: 0% of `position_href` values are anything but `/positions/0`. Positions for 2004–2013 must be inferred from stat categories; nothing better was found.
- **Class, height, weight, age and DOB are the athlete's latest ESPN profile, not that season's.**
  - 71% of 2004 box-score athletes are "Senior", against 40% in 2025.
  - Jason Campbell's 2004 row says age 33.
  - DOB fill *falls* over time, from 95.6% (2004) to 0.0% (2026): DOBs exist mostly for players who went on to a later profile.
  - Do not show "class that year" from this file.
- **There is no starter flag.** In `game_rosters`, `starter` is `false` on 43,037 / 43,037 rows (2004) and 200,436 / 200,436 rows (2019), and `did_not_play` is uniformly `false`.
- `ncaa_mfb_player_stats` (2013+) was looked at once, for 2019. It holds 55,330 rows of `contest_id, team_id, number, name, position, category, espn_game_id, season`, all with `category = "other"`. It is a participation and position list per game, not stats. It is low value next to ESPN positions from 2014.

## Ids (Measure 4)

- **Stable across seasons and transfers.** Case Keenum is 191981 in every season 2007–2011, all with team 248; 2010 has 7 rows (his injury year). Joe Burrow is 3915511 at Ohio State (194) in 2016–2017 and at LSU (99) in 2018–2019, with no rows in 2015 (redshirt).
- **The same name and team can carry 2 ids in one season.** Counts: 0–6/season in 2004–2013, 13–26/season in 2014–2019, and 0–4/season since 2020.
  - Examples: Connor Barth, UNC 2004–2005 (162664 / 387947); Corey Brown, Ohio State 2012–2013 (487791 / 534284).
  - Some are probably real namesakes (Michael Johnson, Aaron Williams).
  - These need a manual merge list before career totals are trusted.
- Old ids are 5–6 digits; current ones are 7. The fresh csv dropped a few rows of some 5-digit-id athletes in 2004–2005 (Layout above).

## Game dates and the schedule join (Measure 5)

- **Every game resolves.** Every player-box `game_id` in 2004–2026 is in that season's ESPN schedule, with `game_date`, home/away ids, both scores, and `neutral_site` all filled (100% each).
- **UTC date trap: confirmed.** `game_date` is UTC. Between 100 and 230 games per season have a UTC calendar date different from the ET date (2004: 153; 2025: 218); e.g. 243640197 is stamped `2004-12-30T01:00Z` for a 2004-12-29 20:00 ET kickoff. Convert to America/New_York (or the venue zone) before taking a date. Never slice the string.
- **`neutral_site` is a lie before 2008.** The `true` share is 0.3% (2004) and 0.0% (2005–2007), against 6–7.7% from 2008. Example: USC vs Virginia Tech 2004 (242410259, FedEx Field, BCA Classic) is `false` in both the ESPN and the CFBD files.
- Bowls are `season_type = 3` in the ESPN schedule: 28 in 2004, 35–48 in later seasons. The player box covers them all except 2 in 2013 (35 of 37).

## Running season (Measure 6)

- The release timestamp is 2026-10-18 18:39:16 EDT. That was three days before this probe.
- The latest game in the 2026 file is `2026-10-18T03:00Z` (Saturday 10/17, ET).
- Every final game dated 10/10 (45), 10/11 (5) and 10/13–10/18 (62) has rows.
- The 2026 ESPN schedule file holds only `STATUS_FINAL` games (510 of 510), so it cannot serve as a forward schedule.
- Whether games of 10/19–10/21 exist could not be checked: the ESPN scoreboard date-range call returned HTTP 400.
- See also the back-fill gap: one week-1 game is missing 55 defensive lines that ESPN now has.

## Sizes (Measure 7)

| asset set (2004–2026) | csv | csv.gz | parquet |
|---|---|---|---|
| player_box | 94,981,486 | 16,945,108 (stale, no 2026) | 10,772,829 |
| schedules | 3,075,050 | 628,170 | 633,543 |
| team_box | 4,045,585 | 1,154,987 | 1,127,836 |
| rosters | — (csv.gz only) | 43,981,778 | 38,939,299 |
| game_rosters | 3,112,739,247 | 286,495,177 | 129,473,542 |

The fresh player_box csv gzipped locally at level 6 weighs 18,304,726 bytes in total: 477 KB for 2004, rising to 1.61 MB for 2025 and 906 KB for 2026 so far. Per-season figures are in `coverage.json`.

## CFBD terms (exact wording, from collegefootballdata.com/terms, effective August 12, 2026)

Saved as `downloads/cfbd_site/terms.html` (and extracted to `terms.txt`). The relevant lines, verbatim:

- "Commercial use is permitted."
- §4 permits: "privately cache, store, normalize, and retain API responses;" "display reasonable portions of factual API Data as part of a larger product;" "publish and commercialize independently created analyses, models, model weights, predictions, projections, rankings, visualizations, and other Derived Outputs;"
- §5 says you may not: "sell, sublicense, publish, or provide API Data as a standalone dataset or bulk download;" "operate a raw feed, public database mirror, proxy, substitute API, or substantially equivalent data service;" "expose, transfer, publish, or embed an API key in public or client-side code;"
- §6: "Attribution is appreciated but not required. When practical, we recommend “Data provided by CollegeFootballData.com.”"
- §8: "Nothing in these Terms grants rights to team, conference, tournament, or league names as trademarks; logos; player names or likenesses; …"

What this means for the comparator: computed rankings are Derived Outputs, so CFBD data could power them. Committing CFBD raw per-game rows to a public repo as a ledger would be "publish … as a standalone dataset", which §5 forbids. The cfbfastR-data CFBD schedules carry their own license (§7: "Downloadable data packs … are governed by the licenses included with those products").

## Tried, nothing usable, don't retry

- ESPN summary for 2003 games (232560158, 233120265, 240040099): category shells, 0 athletes. Combined with the brief's 2002 and 2001 results, ESPN has no pre-2004 player boxes.
- The ESPN scoreboard with a `dates=YYYYMMDD-YYYYMMDD` range plus `groups=80` returns HTTP 400. Use a single date, as in `dates=20040104&seasontype=3&groups=80`.
- The cfbfastR CFBD schedules 2001–2022 have no postseason rows, so they cannot be the bowl universe.
- `espn_cfb_game_rosters`: `starter` and `did_not_play` are always false, and positions are unknown before 2014. Not worth the 3 GB.
- `ncaa_mfb_player_stats`: participation and position only, not stats.
- `espn_cfb_team_box` `netPassingYards` for 2004–2011: does not reconcile with correct player sums. Do not use it as a passing gate.
- The stale `player_box_*.csv.gz` assets: superseded by `.csv` / `.parquet`.
- Sports-Reference and stats.ncaa.org: off-limits by their terms (per brief).

## Not done (needs a follow-up)

- **CFBD `/games/players` for 2001–2004.** The monthly quota on the cfb-streak-king key is exhausted: 4 calls, all 429 (`downloads/cfbd/*.json`). Re-run `scripts/cfbd_probe.py` once the quota resets or with another key. It remains the only open lead for licensed pre-2004 player-game data.

API requests used: ESPN 31 (26 summaries, 1 missing-game summary, 4 scoreboard calls of which 2 returned 400) and CFBD 4. All GitHub release downloads were sequential.
