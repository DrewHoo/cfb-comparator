// Downloads what the ledgers are built from into data/raw/ (gitignored).
// Skips a file already there; the running season's files refetch after a
// day. Three sources:
//   sportsdataverse-data releases (cfbfastR, CC BY 4.0), 2004 on:
//     espn_cfb_player_box/player_box_<season>.csv      ESPN box scores: a row per player per stat category per game
//     espn_cfb_schedules/cfb_schedule_<season>.csv     ESPN schedule: the date, the teams, the score, neutral site, the season type
//     espn_cfb_rosters/cfb_rosters_<season>.csv.gz     ESPN rosters: position, class, height, weight
//   College Football Streak King's committed payload (DrewHoo/cfb-streak-king): the game spine 1936 on,
//     with AP ranks at kickoff, the postseason flag, and the head coach of every game (CFBD /coaches rows
//     resolved against the results, plus that repo's researched coach-overrides)
//   Howell's pages are NOT fetched here: the pre-1936 games are committed as data/history (scripts/build-history.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLAYERS_FIRST_SEASON, CURRENT_SEASON } from './lib/window.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RAW = path.join(ROOT, 'data/raw')
const BASE = 'https://github.com/sportsdataverse/sportsdataverse-data/releases/download'
const STREAK_KING = 'https://raw.githubusercontent.com/DrewHoo/cfb-streak-king/main/src/data/payload.json'
fs.mkdirSync(RAW, { recursive: true })

const wants = [] // [url, local name, optional]
for (let s = PLAYERS_FIRST_SEASON; s <= CURRENT_SEASON; s++) {
  // the plain csv assets: the .csv.gz ones were last rebuilt in July 2026 and have no running season
  wants.push([`${BASE}/espn_cfb_player_box/player_box_${s}.csv`, `player_box_${s}.csv`])
  // the older gz build keeps a few rows the plain csv drops; the builder unions them (none for the running season)
  wants.push([`${BASE}/espn_cfb_player_box/player_box_${s}.csv.gz`, `player_box_${s}.csv.gz`, true])
  wants.push([`${BASE}/espn_cfb_schedules/cfb_schedule_${s}.csv`, `cfb_schedule_${s}.csv`])
  wants.push([`${BASE}/espn_cfb_rosters/cfb_rosters_${s}.csv.gz`, `cfb_rosters_${s}.csv.gz`, true])
}
wants.push([STREAK_KING, `streak-king-payload.json`])

// the running season's files change weekly, and so does the payload; refetch those when older than a day
const fresh = (file) => {
  if (!fs.existsSync(file)) return false
  const running = file.includes(`_${CURRENT_SEASON}.`) || file.endsWith('payload.json')
  return !running || Date.now() - fs.statSync(file).mtimeMs < 86_400_000
}

let n = 0
const one = async ([url, name, optional]) => {
  const file = path.join(RAW, name)
  if (fresh(file)) return
  const res = await fetch(url)
  if (!res.ok) {
    await res.body?.cancel()
    if (optional) { console.warn(`fetch ${name}: HTTP ${res.status} (not there)`); return }
    console.error(`fetch ${name}: HTTP ${res.status}`); process.exitCode = 1; return
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  n++
  console.log(`${name} ${(fs.statSync(file).size / 1024).toFixed(0)}KB`)
}
for (let i = 0; i < wants.length; i += 6) await Promise.all(wants.slice(i, i + 6).map(one))
console.log(`fetched ${n} files`)
