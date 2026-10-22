// Runs after `vite build`. Bakes the rendered board into dist/index.html and
// writes the <head> from site.config.js, then each named board at its own
// path, then a page per entity with a records file (dist/<kind>/<id>/
// index.html, the file embedded so the hydrate matches, and og.png, its own
// social card), the sitemap, llms.txt, and the ledgers for the share worker
// (dist/data/).
//
// Without this the deployed page is `<div id="root"></div>` and every word on
// it exists only after React runs. Google usually renders JS in a deferred
// second pass; Bing, DuckDuckGo, social unfurlers, and the LLM crawlers
// largely don't. Prerendering makes the content plain HTML.
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../site.config.js'
import pkg from '../package.json' with { type: 'json' }
import { loadLedger, builtKinds, DATA } from './lib/ledger-node.mjs'
import { spanWords } from '../src/lib/ledger.ts'
import { decodeEntity, page } from '../src/lib/records.ts'
import { placeWords, recordWords, KIND_ONE } from '../src/lib/words.ts'
import { entityText, everyWords } from '../src/lib/share.ts'
import { LANDINGS, landingTitle } from '../src/lib/landing.ts'
import { evaluate, eraBound, DEFAULT_QUERY } from '../src/lib/query.ts'
import { toUrl } from '../src/lib/url.ts'
import { queryWords, rowName, rowWords, eraWords } from '../src/lib/words.ts'
import { itemListOf, boardItems, entityItems, subjectOf } from './lib/jsonld.mjs'
import { llmsText } from './lib/llms.mjs'
import { toPng } from './lib/og.mjs'
import { entityCard } from './lib/og-entity.mjs'
import { groupCard } from './lib/og-group.mjs'
import { groupData, groupDescription, groupH1, groupLead, groupTitle, groupPath, schoolsOf, confSlug, FBS_CONFS, GROUP_POS, POS_SLUG, MIN_GAMES } from '../src/lib/groups.ts'
import { POS_WORDS } from '../src/lib/words.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SLUG = pkg.name
const ORIGIN = `https://${config.domain}`
const SITE = `${ORIGIN}/${SLUG}/`
const OUT = path.join(ROOT, 'dist/index.html')
const KINDS = builtKinds()

// the ledgers as files, for the share worker (workers/share), which runs the engine at the edge on the same columns the page fetches
for (const kind of KINDS) {
  fs.mkdirSync(path.join(ROOT, 'dist/data/cols', kind), { recursive: true })
  fs.copyFileSync(path.join(DATA, `${kind}.json`), path.join(ROOT, 'dist/data', `${kind}.json`))
  for (const f of fs.readdirSync(path.join(DATA, 'cols', kind))) if (f.endsWith('.bin.gz')) fs.copyFileSync(path.join(DATA, 'cols', kind, f), path.join(ROOT, 'dist/data/cols', kind, f))
}

const ledgers = Object.fromEntries(KINDS.map((k) => [k, loadLedger(k)]))
const C = ledgers[DEFAULT_QUERY.kind]
const SEASONS = spanWords(C.firstSeason, C.currentSeason)

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' })
const { default: App } = await vite.ssrLoadModule('/src/App.jsx')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** the head for one page: its title, description, canonical and OG (the board's card unless the page has its own), the embeds, its JSON-LD */
function headFor({ url, title, description, jsonLd, image = { url: `${SITE}og.png`, alt: config.ogImageAlt } }) {
  return `
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(config.domain)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image.url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(image.alt)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${image.url}" />

    <!-- Cross-site chrome served by the index site: back bar, comments, analytics. -->
    <script src="${ORIGIN}/embed/back-bar.js" data-section="sports" async></script>
    <script src="${ORIGIN}/embed/giscus.js" async></script>
    <script src="${ORIGIN}/embed/analytics.js" async></script>

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>`
}

const template = fs.readFileSync(OUT, 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('prerender: could not find an empty #root in dist/index.html')
if (!/<title>[^<]*<\/title>/.test(template)) throw new Error('prerender: could not find <title> in dist/index.html')

function pageHtml({ title, head, appHtml, embed }) {
  let html = template
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace('</head>', head)
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  if (embed) html = html.replace('<script type="module"', `<script id="entity-data" type="application/json">${JSON.stringify(embed).replace(/</g, '\\u003c')}</script>\n    <script type="module"`)
  return html
}

const crumbs = (...rest) => ({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: config.domain, item: `${ORIGIN}/` }, { '@type': 'ListItem', position: 2, name: config.title, item: SITE }, ...rest.map((r, i) => ({ '@type': 'ListItem', position: 3 + i, ...r }))] })
const webPage = (url, name, description, extra = {}) => ({ '@type': 'WebPage', '@id': url, url, name, description, isPartOf: { '@type': 'WebSite', url: `${ORIGIN}/`, name: config.domain }, ...extra })

// who has a page, for the ItemLists' links
const indexOf = {}
const hasPage = {}
for (const kind of KINDS) {
  const f = path.join(ROOT, 'dist/entities', kind, 'index.json')
  indexOf[kind] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []
  hasPage[kind] = new Set(indexOf[kind].filter((e) => e.n).map((e) => e.id))
}
const entityUrl = (kind) => (id) => `${SITE}${kind}/${encodeURIComponent(id)}/`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const lead = (board, q) => (board.ranked[0] && board.ranked[0].value != null ? `${rowName(board.ranked[0])} leads with ${rowWords(board.ranked[0], q)}.` : '')

// the board: its title carries the default query
const appHtml = renderToString(React.createElement(App, { ledgers: { [C.kind]: C } }))
const rootBoard = evaluate(C, DEFAULT_QUERY)
const rootTitle = `${cap(queryWords(DEFAULT_QUERY))}, and every coach, team and player at the same point since ${C.firstSeason} · ${config.title}`
const jsonLd = { '@context': 'https://schema.org', '@graph': [webPage(SITE, rootTitle, config.description), crumbs(), itemListOf({ name: cap(queryWords(DEFAULT_QUERY)), url: SITE, items: boardItems(rootBoard, DEFAULT_QUERY, C, { entityUrl: entityUrl('coach'), pages: hasPage.coach }) })] }
fs.writeFileSync(OUT, pageHtml({ title: rootTitle, head: headFor({ url: SITE, title: rootTitle, description: `${lead(rootBoard, DEFAULT_QUERY)} ${config.description}`.trim(), jsonLd }), appHtml }))
const words = appHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
console.log(`prerendered ${(appHtml.length / 1024).toFixed(0)}KB into #root (~${words} words); head written for ${SITE}`)

// the named boards: the board on each query at its own path
const llmsBoards = []
for (const l of LANDINGS) {
  const L = ledgers[l.query.kind]
  if (!L) continue
  const board = evaluate(L, l.query)
  const url = `${SITE}${l.slug}/`
  const bound = eraBound(l.query, board)
  const title = landingTitle(l, bound, config.title)
  const lead1 = lead(board, l.query)
  const description = `${lead1} ${everyWords(l.query)}${eraWords(bound)} ranked at the same point: ${queryWords(l.query, bound)}. Open a row to read it against a peer.`.replace(/\s+/g, ' ').trim()
  const html = renderToString(React.createElement(App, { path: `/${SLUG}/${l.slug}/`, ledgers: { [L.kind]: L } }))
  const ld = { '@context': 'https://schema.org', '@graph': [webPage(url, title, description), crumbs({ name: l.h1, item: url }), itemListOf({ name: l.h1, url, items: boardItems(board, l.query, L, { entityUrl: entityUrl(L.kind), pages: hasPage[L.kind] }) })] }
  const image = { url: `${SITE}share/og.png${toUrl({ query: l.query, open: null })}`, alt: `${l.h1}, on a dark leaderboard.` }
  const dir = path.join(ROOT, 'dist', l.slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml({ title, head: headFor({ url, title, description, jsonLd: ld, image }), appHtml: html }))
  llmsBoards.push({ h1: l.h1, url, lead: lead1 })
}
console.log(`prerendered ${llmsBoards.length} named boards`)

// a page per entity with a records file (scripts/build-records.mjs), and its card
const urls = [SITE, ...llmsBoards.map((b) => b.url)]
const llmsEntities = {}
const counts = {}
const pending = new Set()
const draw = async (svg, file) => {
  const p = toPng(svg, file).finally(() => pending.delete(p))
  pending.add(p)
  if (pending.size >= 8) await Promise.race(pending)
}
const t0 = Date.now()
for (const kind of KINDS) {
  const L = ledgers[kind]
  let n = 0
  llmsEntities[kind] = []
  for (const entry of indexOf[kind]) {
    if (!entry.n) continue
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/entities', kind, `${entry.id}.json`), 'utf8'))
    const url = entityUrl(kind)(entry.id)
    const html = renderToString(React.createElement(App, { path: `/${SLUG}/${kind}/${encodeURIComponent(entry.id)}/`, preload: file }))
    const fams = page(decodeEntity(file), file.id)
    const face = fams[0]?.best
    const { title, description } = entityText(kind, file.name, null, face, L.firstSeason, config.title)
    const ld = { '@context': 'https://schema.org', '@graph': [webPage(url, title, description, { about: subjectOf(kind, file.name) }), crumbs({ name: file.name, item: url }), itemListOf({ name: `What ${file.name} leads`, url, items: entityItems(fams) })] }
    if (llmsEntities[kind].length < 5 && face) llmsEntities[kind].push({ name: file.name, url, lead: description.split('. ')[0] + '.' })
    const dir = path.join(ROOT, 'dist', kind, entry.id)
    fs.mkdirSync(dir, { recursive: true })
    const image = { url: `${url}og.png`, alt: face ? `${file.name}: ${recordWords(face)}, ${placeWords(face)}. The ${KIND_ONE[kind]}'s page on ${config.title}, on a dark background.` : `${file.name}'s page on ${config.title}, on a dark background.` }
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml({ title, head: headFor({ url, title, description, jsonLd: ld, image }), appHtml: html, embed: file }))
    await draw(entityCard(file, fams, { seasons: spanWords(L.firstSeason, L.currentSeason) }), path.join(dir, 'og.png'))
    urls.push(url)
    n++
  }
  counts[kind] = n
}
await Promise.all(pending)
console.log(`prerendered ${JSON.stringify(counts)} entity pages, each with its card, in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

// the group pages: the best players of each position at each school and in each conference, with a card each,
// and the two index pages that reach them all
const llmsGroups = []
if (ledgers.player) {
  const P = ledgers.player
  const t1 = Date.now()
  const index = { school: [], conference: [] }
  const groups = [
    ...schoolsOf(P).flatMap((sc) => GROUP_POS.map((pos) => ({ kind: 'school', id: sc.id, name: sc.name, pos }))),
    ...FBS_CONFS.filter((c) => P.confs.includes(c)).flatMap((c) => GROUP_POS.map((pos) => ({ kind: 'conference', id: confSlug(c), name: c, pos }))),
  ]
  let n = 0
  for (const g of groups) {
    const d = groupData(P, g)
    if (d.rows.length < MIN_GAMES) continue
    const url = `${SITE}${groupPath(g).slice(1)}`
    const title = groupTitle(d, config.title)
    const description = groupDescription(d)
    const html = renderToString(React.createElement(App, { path: `/${SLUG}${groupPath(g)}`, preload: d }))
    const ld = { '@context': 'https://schema.org', '@graph': [webPage(url, title, description, g.kind === 'school' ? { about: { '@type': 'SportsTeam', name: g.name, sport: 'American football' } } : {}), crumbs({ name: groupH1(d), item: url }), itemListOf({ name: groupH1(d), url, items: d.rows.slice(0, 10).map((r) => ({ name: `${r.name}: ${r.totals[0]?.toLocaleString('en-US')} ${d.metrics[0]}`, ...(hasPage.player?.has(r.id) ? { url: entityUrl('player')(r.id) } : {}) })) })] }
    const dir = path.join(ROOT, 'dist', g.kind, g.id, POS_SLUG[g.pos])
    fs.mkdirSync(dir, { recursive: true })
    const image = { url: `${url}og.png`, alt: `${groupH1(d)}: ${groupLead(d)} On a dark background.` }
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml({ title, head: headFor({ url, title, description, jsonLd: ld, image }), appHtml: html, embed: d }))
    await draw(groupCard(d), path.join(dir, 'og.png'))
    urls.push(url)
    const entry = index[g.kind].find((e) => e.id === g.id) ?? (index[g.kind].push({ id: g.id, name: g.name, pos: [] }), index[g.kind][index[g.kind].length - 1])
    entry.pos.push(g.pos)
    if (g.kind === 'conference' || (g.pos === 'QB' && llmsGroups.length < 20)) llmsGroups.push({ h1: groupH1(d), url, lead: groupLead(d) })
    n++
  }
  for (const kind of ['school', 'conference']) {
    const url = `${SITE}${kind}/`
    const title = `${kind === 'school' ? 'Every school' : 'Every conference'}'s best players by position, since ${P.firstSeason} · ${config.title}`
    const description = `The best quarterbacks, running backs, receivers, defenders, kickers and punters ${kind === 'school' ? 'at every FBS school' : 'in every FBS conference'} since ${P.firstSeason}, each with the players' numbers drawn game by game.`
    const html = renderToString(React.createElement(App, { path: `/${SLUG}/${kind}/`, preload: { items: index[kind] } }))
    const ld = { '@context': 'https://schema.org', '@graph': [webPage(url, title, description), crumbs({ name: title.split(' · ')[0], item: url })] }
    fs.mkdirSync(path.join(ROOT, 'dist', kind), { recursive: true })
    fs.writeFileSync(path.join(ROOT, 'dist', kind, 'index.html'), pageHtml({ title, head: headFor({ url, title, description, jsonLd: ld }), appHtml: html, embed: { items: index[kind] } }))
    urls.push(url)
  }
  await Promise.all(pending)
  console.log(`prerendered ${n} group pages (${index.school.length} schools, ${index.conference.length} conferences) with cards in ${((Date.now() - t1) / 1000).toFixed(1)}s`)
}
await vite.close()

fs.writeFileSync(path.join(ROOT, 'dist/llms.txt'), llmsText({ site: SITE, title: config.title, description: config.description, firstSeason: C.firstSeason, currentSeason: C.currentSeason, landings: llmsBoards, entities: llmsEntities, counts, groups: llmsGroups }))

const lastmod = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(ROOT, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`)
console.log(`sitemap: ${urls.length} URLs`)
