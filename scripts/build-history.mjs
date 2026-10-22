// The game spine before the AP poll: every game of every major team from
// 1869 to 1935, parsed once from James Howell's pages (data/raw/jhowell,
// copied from College Football Streak King's cache, which fetches them from
// jhowell.net) into data/history/games-1869-1935.json.gz, committed, so CI
// never reads Howell. From 1936 on the spine is Streak King's payload
// (scripts/fetch.mjs), which carries the same pages with that repo's errata,
// the AP ranks and the coaches.
//
// Howell's pages: byconf.htm lists the "major" teams with their spans
// ("Boston College (1901-1902, 1919, 1937-1942, 1944-present)"); a team page
// has a header per season ("<a name=1985>1985-Alabama (SEC)</a>") and one
// row per game: M/D | '@' or 'vs.' | [*]Opponent | W/L/T | pf | pa | [@ City,
// ST]. A '*' marks a conference game; a linked opponent was major that
// season. A game between two major teams appears on both pages; this keeps
// one row per game. The parser is Streak King's, with its 1936 filter lifted.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ROOT, canon, lookup, slug, decodeEntities, stripTags, reportUnmatched, display } from './lib/names.mjs'
import { FIRST_SEASON, POLL_FIRST_SEASON } from './lib/window.mjs'

const RAW = path.join(ROOT, 'data/raw/jhowell')
const OUT = path.join(ROOT, 'data/history')
fs.mkdirSync(OUT, { recursive: true })
const LAST = POLL_FIRST_SEASON - 1

// --- byconf: the major spans, every year
const byconf = fs.readFileSync(path.join(RAW, 'byconf.htm'), 'latin1')
const spans = {}
const linkRe = /<a href="([^"#]+\.htm)">([\s\S]*?)<\/a>/g
let m
while ((m = linkRe.exec(byconf))) {
  const text = decodeEntities(stripTags(m[2])).replace(/\s+/g, ' ').trim()
  const nm = /^(.*?)\s*\(([\d\s,\-present]+)\)\s*$/.exec(text)
  if (!nm) continue
  const id = canon(nm[1], 'byconf') ?? `x:${slug(nm[1])}`
  for (const part of nm[2].split(',')) {
    const p = part.trim()
    const range = /^(\d{4})\s*-\s*(\d{4}|present)$/.exec(p)
    if (range) (spans[id] ??= []).push([Number(range[1]), range[2] === 'present' ? 9999 : Number(range[2])])
    else if (/^\d{4}$/.test(p)) (spans[id] ??= []).push([Number(p), Number(p)])
  }
}
const bridges = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ref/fbs-span-bridges.json'), 'utf8')).teams
for (const id of Object.keys(spans)) {
  const sat = new Set((bridges[id] ?? []).flatMap((b) => b.seasons))
  const merged = []
  for (const s of spans[id].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1)
    let bridged = !!last
    for (let y = (last?.[1] ?? 0) + 1; bridged && y < s[0]; y++) bridged = sat.has(y)
    if (last && bridged) last[1] = Math.max(last[1], s[1])
    else merged.push([...s])
  }
  spans[id] = merged
}
const isMajor = (id, season) => (spans[id] ?? []).some(([a, b]) => a <= season && b >= season)

// --- the team pages
const oppId = (cell, linked) => {
  const name = cell.replace(/^\*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (!linked) return lookup(name) ?? `x:${slug(name)}`
  return canon(name, 'jhowell') ?? `x:${slug(name)}`
}
const names = {} // id -> display name as Howell writes it
const games = new Map() // key -> row
const conf = {} // id -> { season: confName }
let rows = 0, dupes = 0, disagree = 0
const files = fs.readdirSync(path.join(RAW, 'teams')).filter((f) => f.endsWith('.htm'))
for (const f of files) {
  const html = fs.readFileSync(path.join(RAW, 'teams', f), 'latin1')
  const headRe = /<a name=(\d{4})>\d{4}-([^<]+?)\s*\(([^()]*)\)<\/a>/g
  const heads = []
  let hm
  while ((hm = headRe.exec(html))) heads.push({ year: Number(hm[1]), name: hm[2].trim(), confName: hm[3].trim(), at: hm.index })
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]
    if (h.year < FIRST_SEASON || h.year > LAST) continue
    const id = canon(h.name, 'jhowell') ?? `x:${slug(h.name)}`
    names[id] ??= display(id) !== id ? display(id) : h.name
    ;(conf[id] ??= {})[h.year] = h.confName
    const block = html.slice(h.at, heads[i + 1]?.at ?? html.length)
    const trRe = /<tr>([\s\S]*?)<\/tr>/g
    let tr
    while ((tr = trRe.exec(block))) {
      const raw = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])
      const cells = raw.map((c) => decodeEntities(stripTags(c)).replace(/\s+/g, ' ').trim())
      const md = /^(\d{1,2})\/(\d{1,2})$/.exec(cells[0] ?? '')
      if (!md || cells.length < 6) continue
      const [mo, da] = [Number(md[1]), Number(md[2])]
      const y = mo <= 2 ? h.year + 1 : h.year
      const pf = Number(cells[4]), pa = Number(cells[5])
      if (!Number.isFinite(pf) || !Number.isFinite(pa)) continue
      const linked = /<a href/.test(raw[2])
      const opp = oppId(cells[2], linked)
      const oppName = cells[2].replace(/^\*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()
      names[opp] ??= display(opp) !== opp ? display(opp) : oppName
      const confGame = cells[2].startsWith('*')
      const away = cells[1] === '@'
      const city = cells[6] ?? ''
      const date = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`
      // one row per game whichever page it came from: keyed by the date and the pair, since a neutral-site game reads "vs." on both pages
      const key = `${date}|${[id, opp].sort().join('|')}`
      rows++
      const seen = games.get(key)
      if (seen) {
        dupes++
        const hs2 = away ? pa : pf, as2 = away ? pf : pa
        const sameScore = (seen.home === id && seen.hs === pf && seen.as === pa) || (seen.home === opp && seen.hs === pa && seen.as === pf)
        if (!sameScore) { disagree++; console.warn(`score disagrees: ${key} ${seen.home} ${seen.hs}-${seen.as} vs ${id} ${pf}-${pa}`) }
        seen.conf = seen.conf || confGame
        // the second page's '@' says the first team hosted; both 'vs.' with a city is neutral
        if (away && seen.home !== opp) { seen.home = opp; seen.away = id; seen.hs = pa; seen.as = pf }
        if (!away && seen.home === id) seen.neutral = seen.neutral || !!city
        continue
      }
      const home = away ? opp : id, visitor = away ? id : opp
      const neutral = !!city
      games.set(key, { se: h.year, date, home, away: visitor, hs: away ? pa : pf, as: away ? pf : pa, neutral, conf: confGame, post: mo <= 1 || (mo === 12 && da >= 15 && /bowl|classic/i.test(cells[7] ?? '')) })
    }
  }
}
const list = [...games.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.home < b.home ? -1 : 1))
for (const g of list) { g.homeMajor = isMajor(g.home, g.se); g.awayMajor = isMajor(g.away, g.se) }
const perSeason = {}
for (const g of list) perSeason[g.se] = (perSeason[g.se] ?? 0) + 1
const out = { v: 1, builtAt: new Date().toISOString(), note: `Every game of every major team ${FIRST_SEASON}–${LAST} from James Howell's pages (jhowell.net), one row per game; a game between two major teams was read from both pages and the scores agreed in all but ${disagree}. 'neutral' is Howell's off-campus marker (a city after the opponent), which before 1936 also catches a team's alternate home field. 'post' is a January game, or a late-December one named as a bowl.`, spans, names, conf, games: list }
fs.writeFileSync(path.join(OUT, `games-${FIRST_SEASON}-${LAST}.json.gz`), zlib.gzipSync(JSON.stringify(out), { level: 9 }))
console.log(`${files.length} pages, ${rows} rows, ${list.length} games ${FIRST_SEASON}–${LAST} (${dupes} read from both pages, ${disagree} score disagreements); ${Object.keys(spans).length} teams with major spans, ${Object.keys(names).length} names`)
console.log(`games by decade: ${Object.entries(perSeason).reduce((acc, [y, n]) => { const d = Math.floor(y / 10) * 10; acc[d] = (acc[d] ?? 0) + n; return acc }, {}) && JSON.stringify(Object.entries(perSeason).reduce((acc, [y, n]) => { const d = Math.floor(y / 10) * 10; acc[d] = (acc[d] ?? 0) + n; return acc }, {}))}`)
reportUnmatched('jhowell')
