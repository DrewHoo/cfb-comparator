// Mines what every entity leads (src/lib/records.ts) over each of the three
// ledgers, the whole field, and writes one file per entity with a row to
// public/entities/<kind>/<id>.json, plus public/entities/<kind>/index.json:
// every entity of the kind (the finder lists everyone), with `n` its rows
// and `top` its best score (0 and null without a page), the best first.
// Runs before `vite build` so the files ship with the site, and on its own
// (`npm run records`) for the dev server. Nothing here is committed; the
// ledgers in src/data are the source.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { loadLedger, builtKinds } from './lib/ledger-node.mjs'
import { encodeEntity, mine, shapesFor } from '../src/lib/records.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ONLY = process.argv.slice(2)
const kinds = builtKinds().filter((k) => !ONLY.length || ONLY.includes(k))

for (const kind of kinds) {
  const OUT = path.join(ROOT, 'public/entities', kind)
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const t0 = Date.now()
  const L = loadLedger(kind)
  const t1 = Date.now()
  const shapes = shapesFor(kind)
  const rows = mine(L, shapes)
  const t2 = Date.now()
  const by = new Map()
  for (const r of rows) (by.get(r.entity.id) ?? by.set(r.entity.id, []).get(r.entity.id)).push(r)

  const index = []
  let bytes = 0, gz = 0, biggest = { id: null, name: '', bytes: 0, gz: 0 }
  for (const p of L.entities) {
    const own = by.get(p.id) ?? []
    const file = encodeEntity(L, p, own)
    if (own.length) {
      const json = JSON.stringify(file)
      fs.writeFileSync(path.join(OUT, `${p.id}.json`), json)
      const z = zlib.gzipSync(json).length
      bytes += json.length; gz += z
      if (json.length > biggest.bytes) biggest = { id: p.id, name: p.name, bytes: json.length, gz: z }
    }
    index.push({ id: p.id, name: p.name, pos: p.pos, from: file.from, to: file.to, games: file.games, n: own.length, top: own.length ? Math.round(Math.max(...own.map((r) => r.score)) * 10) / 10 : null })
  }
  // the best pages first, then the biggest careers (what the finder lists before anything is typed)
  index.sort((a, b) => (b.top ?? -Infinity) - (a.top ?? -Infinity) || b.games - a.games || a.name.localeCompare(b.name))
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`
  console.log(`${kind}: ${L.entities.length} entities, ${L.n} games, loaded in ${((t1 - t0) / 1000).toFixed(1)}s; ${shapes.length} shapes, ${rows.length} rows, mined in ${((t2 - t1) / 1000).toFixed(1)}s`)
  console.log(`${kind}: ${by.size} of ${L.entities.length} with a page: ${kb(bytes)} raw, ${kb(gz)} gzipped; the biggest ${biggest.name} (${biggest.id}) ${kb(biggest.bytes)}, ${kb(biggest.gz)} gzipped`)
}
