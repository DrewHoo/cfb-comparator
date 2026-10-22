// Builds the three ledgers the site reads (src/lib/ledger.ts decodes them):
//   team    every major-college program's games, season by season, 1869 on
//   coach   every head coach's games as a major-college head coach, 1869 on
//   player  every player's games from ESPN's box scores, 2004 on
//
// The game spine: James Howell's scores 1869–1935 (data/history, parsed once
// by scripts/build-history.mjs) and College Football Streak King's payload
// 1936 on (data/raw/streak-king-payload.json, fetched by scripts/fetch.mjs),
// which carries Howell's and Repole's scores with that repo's errata, the AP
// rank of both teams at kickoff, the neutral/conference/postseason flags and
// the head coach of every team-game (CFBD's /coaches rows resolved against
// the results, and that repo's researched coach-overrides). The coaches
// before 1936 come from CFBD's /coaches rows 1869–1935 (data/ref), resolved
// the same way (scripts/lib/coach.mjs).
//
// The output is columnar: src/data/<kind>.json holds the entities, each with
// its slice of the game arrays, and src/data/cols/<kind>/<name>.bin.gz one
// gzipped typed array per column over every game (entities in order, each
// one's games in date order).
//
// What the data can't say, so the site doesn't: a player whose first ESPN
// season is 2004 and who wasn't a freshman then began before the ledger and
// sits out the career fields (`censored`); a box-score category a season
// lacks for most games (tackles, fumbles, kick returns in the early years)
// is unknown in every game of that season, and the ledger's `statSince`
// names the first full season.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { readCsv } from './lib/csv.mjs'
import { ROOT, canon, lookup } from './lib/names.mjs'
import { FIRST_SEASON, POLL_FIRST_SEASON, PLAYERS_FIRST_SEASON, CURRENT_SEASON } from './lib/window.mjs'
import { STAT_COLS, BASE_COLS, COL_TYPE, UNK_OF, dayOf, F_POST, F_HOME, F_NEUTRAL, F_WIN, F_TIE, F_CONF, F_MAJOROPP, RANK_UNKNOWN } from '../src/lib/ledger.ts'

const RAW = path.join(ROOT, 'data/raw')
const OUT = path.join(ROOT, 'src/data')
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const want = (kind) => !ONLY.length || ONLY.includes(kind)

// ---------------------------------------------------------------- the spine
const payload = JSON.parse(fs.readFileSync(path.join(RAW, 'streak-king-payload.json'), 'utf8'))
const history = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'data/history', `games-${FIRST_SEASON}-${POLL_FIRST_SEASON - 1}.json.gz`))).toString())
if (payload.currentSeason !== CURRENT_SEASON) console.warn(`the payload's running season is ${payload.currentSeason}; window.mjs says ${CURRENT_SEASON}`)

/** teams by id: the payload's (with ESPN ids and the major spans) plus the history's */
const teams = new Map()
for (const t of payload.teams) teams.set(t.id, { id: t.id, name: t.name, espn: t.espn ?? null, major: t.major ?? history.spans[t.id] ?? null })
for (const [id, name] of Object.entries(history.names)) if (!teams.has(id)) teams.set(id, { id, name, espn: null, major: history.spans[id] ?? null })
for (const [id, spans] of Object.entries(history.spans)) { const t = teams.get(id); if (t && !t.major) t.major = spans }
const isMajor = (id, season) => (teams.get(id)?.major ?? []).some(([a, b]) => a <= season && b >= season)
// conference membership by season, from the payload's spans (1936 on; the history's conference names before)
const CONFS = [...payload.confs]
const confIdx = (name) => { let i = CONFS.indexOf(name); if (i < 0) { i = CONFS.length; CONFS.push(name) } return i }
const teamConf = {} // team id -> season -> conf index
for (const t of payload.teams) for (const [a, b, ci] of t.conf ?? []) for (let y = a; y <= Math.min(b, CURRENT_SEASON); y++) (teamConf[t.id] ??= {})[y] = ci
for (const [id, byYear] of Object.entries(history.conf ?? {})) for (const [y, name] of Object.entries(byYear)) if (teamConf[id]?.[y] == null) (teamConf[id] ??= {})[y] = confIdx(name)
const byEspn = new Map([...teams.values()].filter((t) => t.espn).map((t) => [String(t.espn), t.id]))

const isoOfEp = (ep) => new Date(ep * 86400000).toISOString().slice(0, 10)
/** every game, 1869 on: { se, date, home, away, hs, as, neutral, conf, post, hr, ar } with team ids */
const spine = []
for (const g of history.games) spine.push({ se: g.se, date: g.date, home: g.home, away: g.away, hs: g.hs, as: g.as, neutral: g.neutral, conf: g.conf, post: g.post, hr: RANK_UNKNOWN, ar: RANK_UNKNOWN })
{
  const G = payload.games, T = payload.teams
  for (let i = 0; i < G.se.length; i++) {
    const rank = (r) => (r == null || r < 0 ? RANK_UNKNOWN : r)
    spine.push({ se: G.se[i], date: isoOfEp(G.ep[i]), home: T[G.hi[i]].id, away: T[G.ai[i]].id, hs: G.hs[i], as: G.as[i], neutral: (G.fl[i] & 1) !== 0, conf: (G.fl[i] & 2) !== 0, post: (G.fl[i] & 4) !== 0, hr: rank(G.hr[i]), ar: rank(G.ar[i]) })
  }
}
spine.sort((a, b) => a.se - b.se || (a.post ? 1 : 0) - (b.post ? 1 : 0) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
// a team-season's games in order, and the team's game number of each
const teamSeason = new Map() // `${team}|${se}` -> [{ g: spine index, home }]
spine.forEach((g, i) => {
  for (const [team, home] of [[g.home, true], [g.away, false]]) (teamSeason.get(`${team}|${g.se}`) ?? teamSeason.set(`${team}|${g.se}`, []).get(`${team}|${g.se}`)).push({ g: i, home })
})
const spineTeamGames = {} // team id -> season -> [reg, all], major seasons only
for (const [k, list] of teamSeason) {
  const [team, se] = k.split('|')
  if (!isMajor(team, Number(se))) continue
  ;(spineTeamGames[team] ??= {})[se] = [list.filter((x) => !spine[x.g].post).length, list.length]
}
console.log(`spine: ${spine.length} games ${spine[0].se}–${spine[spine.length - 1].se}, ${teams.size} teams, ${Object.keys(spineTeamGames).length} with major seasons`)

/** a team-game as a ledger row's fields, from the team's side */
function sideOf(g, home) {
  const pf = home ? g.hs : g.as, pa = home ? g.as : g.hs
  const opp = home ? g.away : g.home
  const flags = (g.post ? F_POST : 0) | (home && !g.neutral ? F_HOME : 0) | (g.neutral ? F_NEUTRAL : 0) | (pf > pa ? F_WIN : 0) | (pf === pa ? F_TIE : 0) | (g.conf ? F_CONF : 0) | (isMajor(opp, g.se) ? F_MAJOROPP : 0)
  return { flags, pf, pa, rk: home ? g.hr : g.ar, ork: home ? g.ar : g.hr, opp }
}

// ---------------------------------------------------------------- writing a ledger
const teamIndex = new Map()
const teamList = []
const tIdx = (id) => { let i = teamIndex.get(id); if (i == null) { i = teamList.length; teamIndex.set(id, i); const t = teams.get(id); teamList.push({ id, name: t?.name ?? id, espn: t?.espn ?? null }) } return i }
const alloc = (name, n) => { const t = COL_TYPE[name] ?? 'u8'; return t === 'u8' ? new Uint8Array(n) : t === 'u16' ? new Uint16Array(n) : new Int16Array(n) }

/** writes src/data/<kind>.json and its columns from entities [{ id, name, born, debut, cen, pos, src, rows: [{ day, season, flags, team, opp, tgn, pf, pa, rk, ork, stat? }] }] */
function writeLedger(kind, entities, { firstSeason, teamGames, teamsOf, statSince = {}, confOf = teamConf }) {
  const N = entities.reduce((s, e) => s + e.rows.length, 0)
  const col = {}
  for (const k of [...BASE_COLS, 'opp']) col[k] = alloc(k, N)
  const statCols = kind === 'player' ? STAT_COLS : []
  for (const k of statCols) col[k] = alloc(k, N)
  let i = 0, clipped = 0
  const out = []
  for (const e of entities) {
    const lo = i
    for (const r of e.rows) {
      col.day[i] = r.day; col.season[i] = r.season - 1800; col.flags[i] = r.flags; col.team[i] = r.team; col.opp[i] = r.opp; col.tgn[i] = Math.min(255, r.tgn)
      col.pf[i] = Math.min(255, r.pf); col.pa[i] = Math.min(255, r.pa); col.rk[i] = r.rk; col.ork[i] = r.ork
      if (r.pf > 255 || r.pa > 255) clipped++
      for (const k of statCols) {
        // a stat with no row in a category the season carries is 0; NaN marks a category the season lacks (a real -1,
        // a catch for a loss of a yard, is a value)
        const v = r.stat?.[k] ?? 0
        const t = COL_TYPE[k] ?? 'u8'
        if (Number.isNaN(v)) { col[k][i] = UNK_OF[t]; continue }
        const max = t === 'u8' ? 254 : t === 'u16' ? 65534 : 32767, min = t === 'i16' ? -32767 : 0
        if (v > max || v < min) clipped++
        col[k][i] = Math.max(min, Math.min(max, v))
      }
      i++
    }
    out.push({ id: e.id, name: e.name, born: e.born ?? null, debut: e.debut, cen: e.cen ? 1 : 0, pos: e.pos ?? null, src: e.src ?? null, lo, n: e.rows.length })
  }
  if (clipped) console.warn(`${kind}: ${clipped} values clipped to their column's range`)
  const dir = path.join(OUT, 'cols', kind)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const cols = {}
  for (const [k, arr] of Object.entries(col)) { cols[k] = COL_TYPE[k] ?? 'u8'; fs.writeFileSync(path.join(dir, `${k}.bin.gz`), zlib.gzipSync(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), { level: 9 })) }
  const file = { v: 4, kind, builtAt: new Date().toISOString(), firstSeason, currentSeason: CURRENT_SEASON, pollSince: POLL_FIRST_SEASON, n: N, cols, teams: teamsOf, teamGames, statSince, confs: CONFS, teamConf: confOf, entities: out }
  const text = JSON.stringify(file)
  fs.writeFileSync(path.join(OUT, `${kind}.json`), text)
  const kb = (f) => (fs.statSync(path.join(dir, f)).size / 1024).toFixed(0)
  console.log(`${kind}: ${out.length} entities, ${N} games; ${kind}.json ${(text.length / 1024).toFixed(0)}KB; columns ${fs.readdirSync(dir).map((f) => `${f.replace('.bin.gz', '')} ${kb(f)}KB`).join(' ')}`)
}

// ---------------------------------------------------------------- the team ledger
if (want('team')) {
  const entities = []
  for (const t of [...teams.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!t.major) continue
    const rows = []
    for (const [a, b] of t.major) {
      for (let se = a; se <= Math.min(b, CURRENT_SEASON); se++) {
        const list = teamSeason.get(`${t.id}|${se}`)
        if (!list) continue
        list.forEach(({ g: gi, home }, k) => { const g = spine[gi]; const s = sideOf(g, home); rows.push({ day: dayOf(g.date), season: se, flags: s.flags, team: tIdx(t.id), opp: tIdx(s.opp), tgn: k + 1, pf: s.pf, pa: s.pa, rk: s.rk, ork: s.ork }) })
      }
    }
    if (!rows.length) continue
    entities.push({ id: t.id, name: t.name, born: null, debut: rows[0].season, cen: false, rows })
  }
  writeLedger('team', entities, { firstSeason: FIRST_SEASON, teamGames: spineTeamGames, teamsOf: teamList })
}

// ---------------------------------------------------------------- the coach ledger
if (want('coach')) {
  // the coach of each team-game: the payload's stints from 1936 (CFBD ids, that repo's overrides applied), CFBD's rows before
  const coachOf = new Map() // `${team}|${se}|${ord}` -> cfbd id
  const names = new Map() // cfbd id -> name
  const T = payload.teams
  for (const t of T) {
    const hc = t.hc ?? []
    for (let j = 0; j < hc.length; j++) {
      const [ci, startSe, startOrd] = hc[j]
      const next = hc[j + 1]
      const id = ci < 0 ? null : payload.coachIds[ci]
      if (id != null) names.set(id, payload.coachNames[ci])
      const endSe = next ? next[1] : CURRENT_SEASON
      for (let se = startSe; se <= endSe; se++) {
        const list = teamSeason.get(`${t.id}|${se}`)
        if (!list) continue
        for (let ord = 0; ord < list.length; ord++) {
          if (se === startSe && ord < startOrd) continue
          if (next && se === next[1] && ord >= next[2]) break
          if (id != null) coachOf.set(`${t.id}|${se}|${ord}`, id)
        }
      }
    }
  }
  // before 1936: the coach of record per team-season from Wikipedia's coach navboxes (data/ref, scripts/build-coaches-pre1936.mjs),
  // whole seasons; a coach continuing past 1935 is the same man as CFBD's by name
  const preFile = path.join(ROOT, 'data/ref', `coaches-${FIRST_SEASON}-${POLL_FIRST_SEASON - 1}.json`)
  let preStats = 'no pre-1936 coach file'
  if (fs.existsSync(preFile)) {
    const nameKey = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(jr|sr|ii|iii)\b\.?/gi, '').replace(/[^a-zA-Z]/g, '').toLowerCase()
    // CFBD ids by name, for the coaches whose careers cross 1936 (active by 1941)
    const cfbdByName = new Map()
    for (const t of T) for (const [ci, startSe] of t.hc ?? []) if (ci >= 0 && startSe <= POLL_FIRST_SEASON + 5) { const k = nameKey(payload.coachNames[ci]); if (!cfbdByName.has(k)) cfbdByName.set(k, payload.coachIds[ci]) }
    const wikiIds = new Map()
    let credited = 0, skipped = 0, joined = 0
    for (const r of JSON.parse(fs.readFileSync(preFile, 'utf8')).rows) {
      if (!r.coach) { skipped++; continue }
      if (!isMajor(r.team, r.season)) continue
      const list = teamSeason.get(`${r.team}|${r.season}`)
      if (!list) continue
      const k = nameKey(r.coach)
      let id = cfbdByName.get(k)
      if (id != null) joined++
      else { id = wikiIds.get(k) ?? wikiIds.set(k, `w:${k}`).get(k) }
      names.set(id, r.coach)
      for (let ord = 0; ord < list.length; ord++) coachOf.set(`${r.team}|${r.season}|${ord}`, id)
      credited++
    }
    preStats = `pre-1936 coaches: ${credited} team-seasons credited (${joined} to a coach CFBD also has), ${skipped} without a coach of record, ${wikiIds.size} coaches known only from the navboxes`
  }
  console.log(preStats)
  // the coaches' games
  const games = new Map() // cfbd id -> rows
  let coached = 0, uncoached = 0
  for (const [k, list] of teamSeason) {
    const [team, seS] = k.split('|'); const se = Number(seS)
    if (!isMajor(team, se)) continue
    list.forEach(({ g: gi, home }, ord) => {
      const id = coachOf.get(`${team}|${se}|${ord}`)
      if (id == null) { uncoached++; return }
      coached++
      const g = spine[gi], s = sideOf(g, home)
      ;(games.get(id) ?? games.set(id, []).get(id)).push({ day: dayOf(g.date), season: se, flags: s.flags, team: tIdx(team), opp: tIdx(s.opp), tgn: ord + 1, pf: s.pf, pa: s.pa, rk: s.rk, ork: s.ork })
    })
  }
  const entities = []
  for (const [id, rows] of games) {
    rows.sort((a, b) => a.day - b.day || a.season - b.season)
    const first = rows[0].season
    // a coach in place when the coach rows begin (1936 without the CFBD file) began before the ledger
    // a coach in place when the coach rows begin (1936 without the pre-1936 file) began before the ledger
    const cen = !fs.existsSync(preFile) && first === POLL_FIRST_SEASON && rows[0].tgn === 1 && isMajor(teamList[rows[0].team].id, first - 1)
    entities.push({ id: `c${id}`, name: names.get(id) ?? `coach ${id}`, born: null, debut: first, cen, rows })
  }
  entities.sort((a, b) => a.rows[0].day - b.rows[0].day || a.name.localeCompare(b.name))
  console.log(`coach: ${coached} team-games with a coach of record, ${uncoached} without (${(100 * uncoached / (coached + uncoached)).toFixed(1)}%), ${entities.filter((e) => e.cen).length} careers censored`)
  writeLedger('coach', entities, { firstSeason: fs.existsSync(preFile) ? FIRST_SEASON : POLL_FIRST_SEASON, teamGames: spineTeamGames, teamsOf: teamList })
}

// ---------------------------------------------------------------- the player ledger
if (want('player')) {
  const has = (f) => fs.existsSync(path.join(RAW, f))
  const csv = (f) => readCsv(path.join(RAW, f))
  const num = (v) => (v === '' || v == null || v === 'NA' ? 0 : Math.round(Number(v)))
  const pair = (v) => { const m = /^(-?\d+)\s*[-/]\s*(-?\d+)$/.exec(String(v ?? '').trim()); return m ? [Number(m[1]), Number(m[2])] : [0, 0] }
  /** the local date of an ESPN UTC timestamp: a kickoff before 10:00 UTC was the evening before in every US zone */
  const localDate = (ts) => { const d = new Date(ts); if (d.getUTCHours() < 10) d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }
  const POS = { QB: 'QB', RB: 'RB', FB: 'RB', HB: 'RB', TB: 'RB', WR: 'WR', TE: 'TE', K: 'K', PK: 'K', P: 'P', DL: 'DEF', DE: 'DEF', DT: 'DEF', NT: 'DEF', LB: 'DEF', OLB: 'DEF', ILB: 'DEF', MLB: 'DEF', DB: 'DEF', CB: 'DEF', S: 'DEF', SS: 'DEF', FS: 'DEF', EDGE: 'DEF', NB: 'DEF' }
  // the spine's games by (season, home espn id, away espn id), for the ranks and the local date
  const spineByEspn = new Map()
  for (const g of spine) { if (g.se < PLAYERS_FIRST_SEASON) continue; const h = teams.get(g.home)?.espn, a = teams.get(g.away)?.espn; if (h && a) (spineByEspn.get(`${g.se}|${h}|${a}`) ?? spineByEspn.set(`${g.se}|${h}|${a}`, []).get(`${g.se}|${h}|${a}`)).push(g) }
  const dayDiff = (a, b) => Math.abs(dayOf(a) - dayOf(b))

  const players = new Map() // athlete id -> { id, name, games: [] }
  const espnTeams = new Map() // espn id -> name (the spine's where it has one)
  const teamSeasonGames = new Map() // `${espn}|${season}` -> [{ key, post, date }]
  const statSinceCount = {} // season -> { category: games with a row }
  const perSeason = {}
  let joined = 0, unjoined = 0, teamRows = 0, fallback = 0
  const gzAdded = {}
  const catOf = { passing: ['cmp', 'att', 'payd', 'patd', 'int'], rushing: ['car', 'ruyd', 'rutd'], receiving: ['rec', 'reyd', 'retd'], fumbles: ['fum', 'fuml'], interceptions: ['dint'], kickReturns: ['kr', 'kryd', 'krtd'], puntReturns: ['pr', 'pryd', 'prtd'], kicking: ['fgm', 'fga', 'fglong', 'xpm', 'xpa'], punting: ['pnt', 'pyd'], defensive: ['tkl', 'sack', 'tfl', 'pd'] }
  const seasonsWith = {} // category -> the seasons it is full in
  const seasonLines = new Map()
  for (let s = PLAYERS_FIRST_SEASON; s <= CURRENT_SEASON; s++) {
    if (!has(`player_box_${s}.csv`) || !has(`cfb_schedule_${s}.csv`)) continue
    const sched = new Map()
    for (const g of csv(`cfb_schedule_${s}.csv`)) {
      if (Number(g.season) !== s || g.status !== 'STATUS_FINAL' || !g.home_id || !g.away_id) continue
      if (g.season_type !== '2' && g.season_type !== '3') continue
      const hs = Number(g.home_score), as = Number(g.away_score)
      if (!(hs > 0 || as > 0)) continue
      const utc = g.game_date, local = localDate(utc)
      const sp = (spineByEspn.get(`${s}|${g.home_id}|${g.away_id}`) ?? []).find((x) => dayDiff(x.date, local) <= 1) ?? null
      if (sp) joined++; else unjoined++
      const homeMajor = byEspn.has(g.home_id) && isMajor(byEspn.get(g.home_id), s), awayMajor = byEspn.has(g.away_id) && isMajor(byEspn.get(g.away_id), s)
      if (!homeMajor && !awayMajor) continue
      espnTeams.set(g.home_id, teams.get(byEspn.get(g.home_id))?.name ?? g.home_team); espnTeams.set(g.away_id, teams.get(byEspn.get(g.away_id))?.name ?? g.away_team)
      const row = { key: g.game_id, season: s, date: sp?.date ?? local, post: g.season_type === '3' || !!sp?.post, neutral: sp ? sp.neutral : g.neutral_site === 'true', conf: sp ? sp.conf : g.conference_competition === 'true', home: g.home_id, away: g.away_id, hs, as, hr: sp?.hr ?? RANK_UNKNOWN, ar: sp?.ar ?? RANK_UNKNOWN, homeMajor, awayMajor, cats: new Set() }
      sched.set(g.game_id, row)
      for (const [team, major] of [[g.home_id, homeMajor], [g.away_id, awayMajor]]) if (major) (teamSeasonGames.get(`${team}|${s}`) ?? teamSeasonGames.set(`${team}|${s}`, []).get(`${team}|${s}`)).push(row)
    }
    const lines = new Map() // `${game}|${athlete}` -> { pid, name, team, stat }
    // the plain csv (named columns, the running season) plus the rows only the older .csv.gz carries (a few real rows a season)
    const boxRows = csv(`player_box_${s}.csv`)
    if (has(`player_box_${s}.csv.gz`)) {
      const seen = new Set(boxRows.map((r) => `${r.game_id}|${r.athlete_id}|${r.category}`))
      let added = 0
      for (const r of csv(`player_box_${s}.csv.gz`)) if (!seen.has(`${r.game_id}|${r.athlete_id}|${r.category}`)) { boxRows.push(r); added++ }
      if (added) gzAdded[s] = added
    }
    for (const r of boxRows) {
      const g = sched.get(r.game_id)
      if (!g) continue
      if (!r.athlete_id || r.athlete_id.startsWith('-') || /^\s*team\s*$/i.test(r.athlete_name ?? '')) { teamRows++; continue }
      const major = r.team_id === g.home ? g.homeMajor : r.team_id === g.away ? g.awayMajor : false
      if (!major) continue
      const k = `${r.game_id}|${r.athlete_id}`
      const line = lines.get(k) ?? lines.set(k, { pid: r.athlete_id, name: r.athlete_name, team: r.team_id, stat: {} }).get(k)
      const c = r.category
      g.cats.add(c)
      const st = line.stat
      const named = (col, n) => { const v = r[col]; if (v != null && v !== '' && v !== 'NA') return v; if (r[`stat_${n}`] != null && r[`stat_${n}`] !== '' && r[`stat_${n}`] !== 'NA') { fallback++; return r[`stat_${n}`] } return '' }
      if (c === 'passing') { const [cmp, att] = pair(named('completions/passingAttempts', 1)); st.cmp = (st.cmp ?? 0) + cmp; st.att = (st.att ?? 0) + att; st.payd = (st.payd ?? 0) + num(named('passingYards', 2)); st.patd = (st.patd ?? 0) + num(named('passingTouchdowns', 4)); st.int = (st.int ?? 0) + num(named('interceptions', 5)) }
      else if (c === 'rushing') { st.car = (st.car ?? 0) + num(named('rushingAttempts', 1)); st.ruyd = (st.ruyd ?? 0) + num(named('rushingYards', 2)); st.rutd = (st.rutd ?? 0) + num(named('rushingTouchdowns', 4)) }
      else if (c === 'receiving') { st.rec = (st.rec ?? 0) + num(named('receptions', 1)); st.reyd = (st.reyd ?? 0) + num(named('receivingYards', 2)); st.retd = (st.retd ?? 0) + num(named('receivingTouchdowns', 4)) }
      else if (c === 'fumbles') { st.fum = (st.fum ?? 0) + num(named('fumbles', 1)); st.fuml = (st.fuml ?? 0) + num(named('fumblesLost', 2)) }
      else if (c === 'interceptions') { st.dint = (st.dint ?? 0) + num(named('interceptions', 1)) }
      else if (c === 'kickReturns') { st.kr = (st.kr ?? 0) + num(named('kickReturns', 1)); st.kryd = (st.kryd ?? 0) + num(named('kickReturnYards', 2)); st.krtd = (st.krtd ?? 0) + num(named('kickReturnTouchdowns', 5)) }
      else if (c === 'puntReturns') { st.pr = (st.pr ?? 0) + num(named('puntReturns', 1)); st.pryd = (st.pryd ?? 0) + num(named('puntReturnYards', 2)); st.prtd = (st.prtd ?? 0) + num(named('puntReturnTouchdowns', 5)) }
      else if (c === 'kicking') { const [fgm, fga] = pair(named('fieldGoalsMade/fieldGoalAttempts', 1)); st.fgm = (st.fgm ?? 0) + fgm; st.fga = (st.fga ?? 0) + fga; st.fglong = Math.max(st.fglong ?? 0, num(named('longFieldGoalMade', 3))); const [xpm, xpa] = pair(named('extraPointsMade/extraPointAttempts', 4)); st.xpm = (st.xpm ?? 0) + xpm; st.xpa = (st.xpa ?? 0) + xpa }
      else if (c === 'punting') { st.pnt = (st.pnt ?? 0) + num(named('punts', 1)); st.pyd = (st.pyd ?? 0) + num(named('puntYards', 2)) }
      else if (c === 'defensive') { st.tkl = (st.tkl ?? 0) + num(named('totalTackles', 1)); st.sack = (st.sack ?? 0) + Math.round(Number(named('sacks', 3) || 0) * 2); st.tfl = (st.tfl ?? 0) + num(named('tacklesForLoss', 4)); st.pd = (st.pd ?? 0) + num(named('passesDefended', 5)) }
    }
    // which categories the season carries: decided below against the latest season's share, since a game with no
    // interception has no interception row; for now, record the share of games with a row
    const nGames = sched.size
    const have = {}
    for (const g of sched.values()) for (const c of g.cats) have[c] = (have[c] ?? 0) + 1
    statSinceCount[s] = Object.fromEntries(Object.entries(have).map(([c, n]) => [c, Math.round(100 * n / nGames)]))
    seasonLines.set(s, lines)
    for (const [k, line] of lines) {
      const gid = k.split('|')[0], g = sched.get(gid)
      const p = players.get(line.pid) ?? players.set(line.pid, { id: line.pid, name: line.name, games: [] }).get(line.pid)
      p.name = line.name
      p.games.push({ g, team: line.team, stat: line.stat, season: s })
    }
    perSeason[s] = { games: nGames, lines: lines.size }
  }
  // a category is full in a season when its share of games with a row is at least 70% of the latest full season's;
  // a season below that has the category's columns unknown in every game
  const seasons = Object.keys(statSinceCount).map(Number).sort((a, b) => a - b)
  const latest = seasons[seasons.length - 1]
  for (const c of Object.keys(catOf)) {
    const norm = Math.max(statSinceCount[latest]?.[c] ?? 0, statSinceCount[latest - 1]?.[c] ?? 0)
    for (const s of seasons) if ((statSinceCount[s]?.[c] ?? 0) >= 0.7 * norm && norm > 0) (seasonsWith[c] ??= []).push(s)
  }
  for (const p of players.values()) for (const gm of p.games) for (const [c, cols] of Object.entries(catOf)) if (!(seasonsWith[c] ?? []).includes(gm.season)) for (const col of cols) gm.stat[col] = NaN
  console.log(`player: schedule games joined to the spine ${joined}, unjoined ${unjoined}; team rows skipped ${teamRows}; stat_N fallbacks ${fallback}; rows only the .csv.gz had ${JSON.stringify(gzAdded)}`)
  console.log(`player: category coverage by season (% of games): ${JSON.stringify(statSinceCount)}`)
  // statSince: the first season a category is full in every later season too
  const statSince = {}
  for (const [c, cols] of Object.entries(catOf)) {
    const have = seasonsWith[c] ?? []
    let first = null
    for (let s = latest; s >= PLAYERS_FIRST_SEASON; s--) { if (have.includes(s)) first = s; else break }
    for (const col of cols) statSince[col] = first ?? latest + 1
  }
  console.log(`player: statSince ${JSON.stringify(statSince)}`)

  // rosters: position (the modal group over the seasons), class in the debut season, birth date
  const roster = new Map() // athlete id -> { pos: Map, born, classBy: Map(season -> class) }
  for (let s = PLAYERS_FIRST_SEASON; s <= CURRENT_SEASON; s++) {
    if (!has(`cfb_rosters_${s}.csv.gz`)) continue
    for (const r of csv(`cfb_rosters_${s}.csv.gz`)) {
      if (!r.athlete_id) continue
      const b = roster.get(r.athlete_id) ?? roster.set(r.athlete_id, { pos: new Map(), born: null, classBy: new Map() }).get(r.athlete_id)
      const grp = POS[r.position_abbreviation]
      if (grp) b.pos.set(grp, (b.pos.get(grp) ?? 0) + 1)
      if (!b.born && r.date_of_birth && r.date_of_birth !== 'NA') b.born = r.date_of_birth.slice(0, 10)
      if (r.experience_abbreviation) b.classBy.set(s, r.experience_abbreviation)
    }
  }
  // the team's game number that season, counted on the spine's schedule (so a game ESPN never had, like Hawai'i's four
  // 2006 home games, is a gap the window still counts) plus any ESPN game the spine lacks
  const tgnOf = new Map()
  const teamGames = {}
  let spineOnly = 0
  for (const [k, list] of teamSeasonGames) {
    const [team, season] = k.split('|')
    const spineId = byEspn.get(team)
    const sp = spineId ? teamSeason.get(`${spineId}|${season}`) ?? [] : []
    const all = sp.map(({ g, home }) => ({ key: null, sp: spine[g], post: spine[g].post, date: spine[g].date, home }))
    for (const g of list) { const m = all.find((x) => x.sp && (home => (home ? teams.get(x.sp.home)?.espn : teams.get(x.sp.away)?.espn) === team)(x.home) && dayDiff(x.date, g.date) <= 1 && (x.sp.hs === g.hs && x.sp.as === g.as || true) && !x.key && ((x.home ? teams.get(x.sp.away)?.espn : teams.get(x.sp.home)?.espn) === (g.home === team ? g.away : g.home))); if (m) m.key = g.key; else all.push({ key: g.key, sp: null, post: g.post, date: g.date }) }
    spineOnly += all.filter((x) => !x.key).length
    all.sort((a, b) => (a.post ? 1 : 0) - (b.post ? 1 : 0) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    all.forEach((g, i) => { if (g.key) tgnOf.set(`${g.key}|${team}`, i + 1) })
    ;(teamGames[`espn:${team}`] ??= {})[season] = [all.filter((g) => !g.post).length, all.length]
  }
  console.log(`player: ${spineOnly} team-games on the spine with no ESPN box (gaps the season windows count)`)
  const pteamIndex = new Map(), pteams = []
  const ptIdx = (espn) => { let i = pteamIndex.get(espn); if (i == null) { i = pteams.length; pteamIndex.set(espn, i); pteams.push({ id: `espn:${espn}`, name: espnTeams.get(espn) ?? `team ${espn}`, espn, slug: byEspn.get(espn) ?? null }) } return i }
  const entities = []
  const tally = { pos: {}, src: {}, censored: 0, noRoster: 0, born: 0 }
  for (const p of players.values()) {
    p.games.sort((a, b) => (a.g.date < b.g.date ? -1 : a.g.date > b.g.date ? 1 : 0))
    const first = p.games[0].g.season
    const ro = roster.get(p.id)
    if (!ro) tally.noRoster++
    // the roster's position group (the modal one over the seasons), else one read off the box score: ESPN's rosters
    // are "Unknown" for every player before 2014, and a quarterback with 1,000 attempts is a quarterback
    const rosterPos = ro && ro.pos.size ? [...ro.pos].sort((a, b) => b[1] - a[1])[0][0] : null
    const sum = (k) => p.games.reduce((t, gm) => t + Math.max(0, gm.stat[k] ?? 0), 0)
    const att = sum('att'), car = sum('car'), rec = sum('rec'), kick = sum('fga') + sum('xpa'), pnt = sum('pnt'), def = sum('tkl') + sum('dint') + sum('sack')
    const boxPos = att >= 30 && att >= car ? 'QB' : car >= 20 && car > rec ? 'RB' : rec >= 10 ? 'WR' : kick >= 5 ? 'K' : pnt >= 5 ? 'P' : def >= 3 ? 'DEF' : null
    const pos = rosterPos ?? boxPos
    const src = rosterPos ? 'roster' : boxPos ? 'box' : null
    tally.pos[pos ?? 'none'] = (tally.pos[pos ?? 'none'] ?? 0) + 1
    tally.src[src ?? 'none'] = (tally.src[src ?? 'none'] ?? 0) + 1
    // a player whose first ESPN season is the ledger's first may have played before it (ESPN's roster class is the
    // player's latest, not 2004's): four seasons from 2004 on prove a 2004 start, anything shorter is taken to have begun before
    const last = p.games[p.games.length - 1].g.season
    const cen = first === PLAYERS_FIRST_SEASON && last < PLAYERS_FIRST_SEASON + 3
    if (cen) tally.censored++
    if (ro?.born) tally.born++
    const rows = p.games.map(({ g, team, stat }) => {
      const home = team === g.home
      const pf = home ? g.hs : g.as, pa = home ? g.as : g.hs
      const opp = home ? g.away : g.home
      const oppMajor = home ? g.awayMajor : g.homeMajor
      const flags = (g.post ? F_POST : 0) | (home && !g.neutral ? F_HOME : 0) | (g.neutral ? F_NEUTRAL : 0) | (pf > pa ? F_WIN : 0) | (pf === pa ? F_TIE : 0) | (g.conf ? F_CONF : 0) | (oppMajor ? F_MAJOROPP : 0)
      return { day: dayOf(g.date), season: g.season, flags, team: ptIdx(team), opp: ptIdx(opp), tgn: tgnOf.get(`${g.key}|${team}`) ?? 0, pf, pa, rk: home ? g.hr : g.ar, ork: home ? g.ar : g.hr, stat }
    })
    entities.push({ id: p.id, name: p.name, born: ro?.born ?? null, debut: first, cen, pos, src, rows })
  }
  entities.sort((a, b) => a.rows[0].day - b.rows[0].day || a.name.localeCompare(b.name))
  console.log(`player: games by season ${JSON.stringify(perSeason)}`)
  console.log(`player: positions ${JSON.stringify(tally.pos)} by source ${JSON.stringify(tally.src)}, no roster row ${tally.noRoster}, censored ${tally.censored}, with a birth date ${tally.born}`)
  // the conference of each ESPN team by season, through the spine's id
  const pConf = {}
  for (const t of pteams) { const sid = byEspn.get(t.espn); if (sid && teamConf[sid]) pConf[t.id] = teamConf[sid] }
  writeLedger('player', entities, { firstSeason: PLAYERS_FIRST_SEASON, teamGames, teamsOf: pteams, statSince, confOf: pConf })
}
