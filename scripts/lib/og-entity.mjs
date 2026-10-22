// An entity page's social card: its name, the career line, and the faces of
// its best families with their values, in the page's own look, inside the
// safe column. Drawn by scripts/prerender.mjs for every entity page, to
// dist/<kind>/<id>/og.png.
import config from '../../site.config.js'
import { spanWords } from '../../src/lib/ledger.ts'
import { placeWords, recordWords, KIND_ONE } from '../../src/lib/words.ts'
import { CREAM, FAINT, INK, RUST, dashed, fit, footer, frame, masthead, safeL, safeR, sizeToFit, text } from './og.mjs'

const KIND = { held: 'LEADS', set: 'SET IT' }

export function entityCard(file, fams, { W = 1200, H = 630, seasons } = {}) {
  const L = safeL(W), R = safeR(W)
  const top = 206, rowH = 66
  const faces = fams.slice(0, Math.floor((H - 60 - top) / rowH)).map((f) => f.best).filter(Boolean)
  const who = file.kind === 'player' ? (file.pos ?? 'player') : KIND_ONE[file.kind]
  const sub = `${who} · ${spanWords(file.from, file.to)}${file.kind === 'team' ? '' : ` · ${file.teams.slice(0, 4).join(', ')}`} · ${file.games.toLocaleString('en-US')} games${file.active ? ' · active' : ''}`
  const parts = masthead(W, { brand: config.title.toUpperCase(), heading: file.name, sub })
  if (!faces.length) parts.push(text('Nothing it leads at any point.', { x: W / 2, y: top + 30, font: 'Serif', size: 22, fill: FAINT, anchor: 'middle' }))
  let y = top
  for (const r of faces) {
    const kind = r.live ? 'LIVE' : KIND[r.kind]
    const value = Number.isInteger(r.value) ? r.value.toLocaleString('en-US') : r.value.toFixed(1)
    parts.push(text(value, { x: L + 100, y: y + 30, font: 'Graduate', size: sizeToFit(value, 'Graduate', 28, 100, 0, 18), fill: r.live ? RUST : CREAM, anchor: 'end' }))
    const tx = L + 120
    parts.push(text(fit(recordWords(r), 'Serif', 22, R - tx), { x: tx, y: y + 21, font: 'Serif', size: 22, fill: INK }))
    const line = `${kind} · ${placeWords(r)}`
    parts.push(text(fit(line.toUpperCase(), 'Mono', 12, R - tx, 1), { x: tx, y: y + 44, font: 'Mono', size: 12, spacing: 1, fill: FAINT }))
    y += rowH
    if (r !== faces[faces.length - 1]) parts.push(dashed(L, y - 14, R))
  }
  parts.push(...footer(W, H, `${seasons} · ${config.domain}/cfb-comparator`))
  return frame(W, H, parts)
}
