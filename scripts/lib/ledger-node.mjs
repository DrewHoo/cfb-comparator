// A ledger for a script: src/data/<kind>.json plus every column, gunzipped
// and decoded. The page loads columns one at a time (src/lib/load.ts); a
// script wants them all.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { decodeLedger } from '../../src/lib/ledger.ts'

export const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data')

export function readLedgerFile(kind) {
  return JSON.parse(fs.readFileSync(path.join(DATA, `${kind}.json`), 'utf8'))
}

/** every column of a kind, by name, as bytes */
export function readCols(kind, names = null) {
  const out = {}
  const dir = path.join(DATA, 'cols', kind)
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.bin.gz')) continue
    const name = f.replace('.bin.gz', '')
    if (names && !names.includes(name)) continue
    out[name] = new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))))
  }
  return out
}

export function loadLedger(kind) {
  return decodeLedger(readLedgerFile(kind), readCols(kind))
}

/** every kind that has been built */
export const builtKinds = () => ['player', 'coach', 'team'].filter((k) => fs.existsSync(path.join(DATA, `${k}.json`)))
