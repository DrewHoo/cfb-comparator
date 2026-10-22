import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import { ledgerUrl, colUrl } from './ledger-client.js'
import { loadLedger } from './lib/load.ts'
import { queryCols, DEFAULT_QUERY } from './lib/query.ts'
import { parseAddress } from './lib/url.ts'
import './styles.css'

// The markup is already in the HTML: scripts/prerender.mjs bakes it in at
// build time so crawlers get the whole page without running anything.
// Hydrate onto it rather than throwing it away. The dev server has no baked
// markup, so fall back to a plain render there.
//
// The board needs its ledger to render the same rows the prerender did, so
// the address's kind (head coaches by default) loads with the base columns
// and the address's own columns before the hydrate; the page is readable
// meanwhile. An entity page carries its records file in the HTML and needs
// no ledger. The other kinds load when the reader switches to them.
const root = document.getElementById('root')
const path = window.location.pathname
const data = document.getElementById('entity-data')
let preload = null
try { preload = data ? JSON.parse(data.textContent) : null } catch {}

/** a kind's ledger with the base columns and `extra`, fetched as assets */
export const fetchLedger = async (kind, extra = []) => loadLedger(await (await fetch(ledgerUrl(kind))).json(), colUrl(kind), extra)

const mount = (ledgers) => {
  const app = (
    <React.StrictMode>
      <App path={path} preload={preload} ledgers={ledgers} fetchLedger={fetchLedger} />
    </React.StrictMode>
  )
  if (root.firstChild) hydrateRoot(root, app)
  else createRoot(root).render(app)
}

if (/\/(player|coach|team)\/[^/]+\/?$/.test(path)) mount({})
else {
  let q = DEFAULT_QUERY
  try { q = parseAddress(path, window.location.search, import.meta.env.BASE_URL).query } catch {}
  // the prerendered markup is the default board (head coaches), so that ledger always loads for the hydrate; an
  // address on another kind loads its ledger too and flips to it after mount
  const loads = [fetchLedger(DEFAULT_QUERY.kind, [...new Set([...queryCols(DEFAULT_QUERY), ...(q.kind === DEFAULT_QUERY.kind ? queryCols(q) : [])])])]
  if (q.kind !== DEFAULT_QUERY.kind) loads.push(fetchLedger(q.kind, queryCols(q)))
  Promise.all(loads).then(([C, other]) => mount(other ? { [DEFAULT_QUERY.kind]: C, [q.kind]: other } : { [DEFAULT_QUERY.kind]: C })).catch((e) => {
    console.error(e)
    const p = document.createElement('p')
    p.className = 'loading'
    p.textContent = 'The ledger did not load; reload the page.'
    root.append(p)
  })
}
