// Team-name canonicalization through data/ref/name-aliases.json (College
// Football Streak King's file, validated there against cfbfastR, jhowell and
// the College Poll Archive). Any source name with no alias entry is
// collected, not silently dropped.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const aliasDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ref/name-aliases.json'), 'utf8'))

/** loose key: lowercase, no accents, no punctuation */
export function slug(name) {
  return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '')
}

const aliasIndex = new Map()
for (const [raw, key] of Object.entries(aliasDoc.aliases)) aliasIndex.set(slug(raw), key)
for (const key of Object.keys(aliasDoc.canonical)) aliasIndex.set(slug(key), key)

export const unmatched = new Map()

export function canon(name, source) {
  if (!name) return null
  const hit = aliasIndex.get(slug(name))
  if (hit) return hit
  const key = `${name} [${source}]`
  unmatched.set(key, (unmatched.get(key) ?? 0) + 1)
  return null
}
/** canon() without recording a miss */
export const lookup = (name) => (name ? aliasIndex.get(slug(name)) ?? null : null)
export const display = (key) => aliasDoc.canonical[key] ?? key

export function reportUnmatched(label) {
  const rows = [...unmatched.entries()].sort((a, b) => b[1] - a[1])
  if (!rows.length) return
  console.error(`${label}: ${rows.length} unmatched name(s): ${rows.slice(0, 40).map(([k, n]) => `${k} ×${n}`).join(' · ')}`)
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#160': ' ' }
export const stripTags = (html) => html.replace(/<[^>]*>/g, '')
export const decodeEntities = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
  if (ENTITIES[code] !== undefined) return ENTITIES[code]
  if (code[0] === '#') { const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  return m
})
