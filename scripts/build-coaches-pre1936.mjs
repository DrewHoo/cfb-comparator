// The coach of record for every major team-season before the AP poll, from
// Wikipedia's "<Program> football coach navbox" templates (fetched by the
// probe in research/probe-coaches-teams/downloads/wikipedia/). CFBD's
// /coaches rows would be the matching source for 1869–1935 and could not be
// fetched (the API's monthly quota was spent); the navboxes agree with CFBD's
// coach in every one of the 7,328 team-seasons from 1936 on where both name
// one, so they stand in. Writes data/ref/coaches-1869-1935.json, one row per
// team-season with the navbox line as its receipt, under CC BY-SA 4.0 (the
// navboxes' license; the file is an adaptation of them, and says so).
//
// Rulings: a season the navbox lists under two coaches in turn (a mid-season
// change) has no coach of record here, since nothing says at which game the
// change came; a season under two co-coaches has none either (the one-coach
// -per-game rule, as Streak King rules Utah 2004); "No coach" is none.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { ROOT, canon, lookup, slug, decodeEntities, stripTags } from './lib/names.mjs'
import { FIRST_SEASON, POLL_FIRST_SEASON } from './lib/window.mjs'

const PROBE = path.join(ROOT, 'research/probe-coaches-teams/downloads/wikipedia')
const NB = JSON.parse(fs.readFileSync(path.join(PROBE, 'navboxes.json'), 'utf8'))
const MAP = JSON.parse(fs.readFileSync(path.join(PROBE, 'navbox-map.json'), 'utf8'))
const PAGES = path.join(ROOT, 'research/pages')
fs.mkdirSync(PAGES, { recursive: true })

// Howell file -> canonical team id, by the names on the page's season headers
const fileId = {}
for (const f of fs.readdirSync(path.join(ROOT, 'data/raw/jhowell/teams'))) {
  const html = fs.readFileSync(path.join(ROOT, 'data/raw/jhowell/teams', f), 'latin1')
  const names = new Set()
  for (const m of html.matchAll(/<a name=(\d{4})>\d{4}-([^<]+?)\s*\(([^()]*)\)<\/a>/g)) names.add(m[2].trim())
  for (const n of [...names].sort((a, b) => a.length - b.length)) { const id = lookup(n); if (id) { fileId[f.replace('.htm', '')] = id; break } }
  if (!fileId[f.replace('.htm', '')]) { const id = lookup(f.replace('.htm', '')); if (id) fileId[f.replace('.htm', '')] = id }
}

const parseYears = (s) => {
  const ys = new Set()
  for (let part of s.split(',')) {
    part = part.trim()
    let m = /^(\d{4})\s*[–—-]\s*(\d{4}|\d{2})?\s*$/.exec(part)
    if (m) { const a = Number(m[1]); const b = m[2] ? (m[2].length === 4 ? Number(m[2]) : Number(String(a).slice(0, 2) + m[2])) : 2026; for (let y = a; y <= b; y++) ys.add(y); continue }
    m = /^(\d{4})$/.exec(part)
    if (m) ys.add(Number(m[1]))
  }
  return ys
}
const parseNavbox = (w) => {
  w = w.replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>|<!--[\s\S]*?-->/g, '')
  const items = []
  for (const raw of w.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('*')) continue
    const m = /\(([^()]*\d{4}[^()]*)\)\s*(?:\}\})?\s*$/.exec(line)
    if (!m) continue
    const ys = parseYears(m[1])
    if (!ys.size) continue
    const body = line.slice(1, m.index)
    const coaches = [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1].split('|').pop().trim())
    const noCoach = /no coach/i.test(body) && !coaches.length
    const interim = body.includes('#') || /interim/i.test(body)
    items.push({ coaches, noCoach, interim, years: ys, raw })
  }
  return items
}

const rows = []
const tally = { teams: 0, seasons: 0, named: 0, none: 0, split: 0, co: 0, noNavbox: [] }
for (const [file, template] of Object.entries(MAP)) {
  const team = fileId[file] ?? lookup(file)
  if (!team) { tally.noNavbox.push(file); continue }
  if (!template || !NB[template]) { tally.noNavbox.push(file); continue }
  tally.teams++
  const items = parseNavbox(NB[template].wikitext)
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(template).replace(/%3A/g, ':')}&action=raw`
  fs.writeFileSync(path.join(PAGES, `${createHash('sha1').update(url).digest('hex')}.txt`), NB[template].wikitext)
  for (let y = FIRST_SEASON; y < POLL_FIRST_SEASON; y++) {
    const cover = items.filter((it) => it.years.has(y))
    if (!cover.length) continue
    tally.seasons++
    const named = cover.filter((it) => !it.noCoach)
    if (!named.length) { tally.none++; continue }
    if (named.length > 1) { tally.split++; rows.push({ team, season: y, coach: null, note: `two coaches in turn: ${named.map((it) => it.coaches.join(' & ')).join(', then ')}; the game of the change is not on the navbox, so neither is credited here`, receipts: named.map((it) => ({ url, quote: it.raw.trim(), retrieved: '2026-10-22' })) }); continue }
    const it = named[0]
    if (it.coaches.length > 1) { tally.co++; rows.push({ team, season: y, coach: null, note: `co-coaches ${it.coaches.join(' & ')}; one coach per game, so neither is credited`, receipts: [{ url, quote: it.raw.trim(), retrieved: '2026-10-22' }] }); continue }
    tally.named++
    rows.push({ team, season: y, coach: it.coaches[0], interim: it.interim || undefined, receipts: [{ url, quote: it.raw.trim(), retrieved: '2026-10-22' }] })
  }
}
rows.sort((a, b) => a.team.localeCompare(b.team) || a.season - b.season)
const out = {
  version: 1, updated: '2026-10-22', license: 'CC BY-SA 4.0',
  note: `The head coach of record of every major-college team-season from ${FIRST_SEASON} to ${POLL_FIRST_SEASON - 1}, read from Wikipedia's "<Program> football coach navbox" templates (CC BY-SA 4.0; each row's receipt is the template's own line, fetched 2026-10-22). This file is an adaptation of those templates and carries their license. A row's coach is null where the navbox lists two coaches in turn (a mid-season change nothing here can place at a game) or co-coaches; a season the navbox calls "No coach" has no row. The build (scripts/build-ledgers.mjs) credits a coach with every game of his team's season; from ${POLL_FIRST_SEASON} the coaches come from CFBD's rows resolved game by game in College Football Streak King's payload instead.`,
  rows,
}
fs.writeFileSync(path.join(ROOT, 'data/ref', `coaches-${FIRST_SEASON}-${POLL_FIRST_SEASON - 1}.json`), JSON.stringify(out, null, 1))
console.log(`${tally.teams} teams, ${tally.seasons} team-seasons: ${tally.named} named, ${tally.none} with no coach, ${tally.split} with a mid-season change, ${tally.co} with co-coaches; no navbox or id for ${tally.noNavbox.join(', ')}`)
