import { useEffect, useMemo, useRef, useState } from 'react'
import { Sentence } from './components/Sentence.jsx'
import { Board, rowId } from './components/Board.jsx'
import { Panel } from './components/Panel.jsx'
import { Notes, KOFI_URL } from './components/Notes.jsx'
import { EntityPage } from './components/EntityPage.jsx'
import { Finder, loadIndex } from './components/Finder.jsx'
import { CoffeeIcon, ShareIcon } from './components/Icons.jsx'
import { useShare } from './hooks/useShare.ts'
import { hasCols, spanWords } from './lib/ledger.ts'
import { ensureCols } from './lib/load.ts'
import { evaluate, normalize, queryCols, eraBound, DEFAULT_QUERY, DEFAULT_BY_KIND } from './lib/query.ts'
import { parseAddress, hrefOf, toUrl } from './lib/url.ts'
import { landingFor, landingFromPath, landingTitle } from './lib/landing.ts'
import { Landings } from './components/Landings.jsx'
import { rowName, rowWords, queryWords, everyWordsPlain } from './lib/words.ts'
import { peerOf } from './lib/compare.ts'
import { shareText, shareTitle, SITE } from './lib/share.ts'
import { track } from './lib/analytics.ts'
import { writeUrl } from './urlState.js'
import { colUrl } from './ledger-client.js'

/** the open row's top, clear of the index site's sticky back bar */
const BACK_BAR = 64

/** the route from a pathname: the board, or an entity's page at <kind>/<id>/ */
export function parseRoute(path) {
  const base = import.meta.env.BASE_URL
  const rel = (path ?? '').startsWith(base) ? path.slice(base.length) : (path ?? '').replace(/^\//, '')
  const m = /^(player|coach|team)\/([^/]+)\/?$/.exec(rel)
  if (m) return { kind: m[1], id: decodeURIComponent(m[2]) }
  return { kind: 'board', landing: landingFromPath(`/${rel}`) }
}

/** `path`, `preload` and `ledgers` come from the prerender or main.jsx, never from window during render */
export default function App({ path = '', preload = null, ledgers = {}, fetchLedger = null }) {
  const route = parseRoute(path)
  if (route.kind !== 'board') return <EntityPage kind={route.kind} id={route.id} preload={preload} />
  return <BoardApp ledgers={ledgers} fetchLedger={fetchLedger} initial={route.landing?.query ?? DEFAULT_QUERY} />
}

function BoardApp({ ledgers: initialLedgers, fetchLedger, initial }) {
  // a named board's path seeds its query, so the prerender and the hydrate agree; the address's query string reads on top after mount
  const [query, setQuery] = useState(initial)
  const [open, setOpen] = useState(null)
  const [vs, setVs] = useState(null)
  // the ledgers loaded so far, by kind; bumps when one arrives or a column the query reads does
  const ledgersRef = useRef(initialLedgers)
  const [, setLoaded] = useState(0)
  const [pages, setPages] = useState({})
  const { copied, share } = useShare()
  // a `t=` deep link lands on its row once the board has rendered it
  const landOn = useRef(null)
  const booted = useRef(false)
  // the prerendered title, for the bare address
  const rootTitle = useRef(null)
  const lastBoard = useRef(null)
  const lastKind = useRef(initial.kind)

  // URL state after mount, never during render: the prerender has no window
  useEffect(() => {
    const s = parseAddress(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    setQuery(s.query)
    setOpen(s.open)
    setVs(s.vs)
    landOn.current = s.open
    rootTitle.current = document.title
    booted.current = true
    track('query', { words: queryWords(s.query), kind: s.query.kind })
  }, [])

  // who has a page, so the panel links only where one exists
  useEffect(() => {
    let live = true
    loadIndex(query.kind).then((list) => { if (live) setPages((p) => ({ ...p, [query.kind]: new Set(list.filter((e) => e.n > 0).map((e) => e.id)) })) })
    return () => { live = false }
  }, [query.kind])

  // the query's ledger, and the columns it reads (and the opponent, for an open row's ledger), fetched as needed
  const L = ledgersRef.current[query.kind] ?? null
  const need = useMemo(() => [...queryCols(query), ...(open ? ['opp'] : [])], [query, open])
  const ready = !!L && hasCols(L, queryCols(query))
  useEffect(() => {
    let live = true
    const kind = query.kind
    const have = ledgersRef.current[kind]
    if (!have) {
      if (!fetchLedger) return
      fetchLedger(kind, need).then((ledger) => { if (!live) return; ledgersRef.current = { ...ledgersRef.current, [kind]: ledger }; setLoaded((n) => n + 1) }).catch((e) => console.error(e))
      return () => { live = false }
    }
    if (hasCols(have, need)) return
    ensureCols(have, colUrl(kind), need).then(() => { if (live) setLoaded((n) => n + 1) }).catch((e) => console.error(e))
    return () => { live = false }
  }, [query.kind, need, fetchLedger])

  // the board stays put while its next columns load (a kind switch shows the last board until the new ledger is in)
  const board = useMemo(() => (ready ? (lastBoard.current = evaluate(L, query)) : lastBoard.current), [L, query, ready])
  if (ready) lastKind.current = query.kind
  const boardKind = lastKind.current
  const bound = board ? eraBound(query, board) : query.since
  const row = useMemo(() => (board && open ? [...board.ranked, ...board.onTheWay].find((r) => r.key === open) ?? null : null), [board, open])
  const peer = useMemo(() => (row ? peerOf(board, row, vs) : null), [board, row, vs])

  useEffect(() => {
    if (!landOn.current || !row) return
    landOn.current = null
    const el = document.getElementById(rowId(row.key))
    if (el) requestAnimationFrame(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - BACK_BAR }))
  }, [row])

  // the tab says what the share worker would: the sentence, or the open comparison; the page's own title at the bare address
  useEffect(() => {
    if (!booted.current) return
    const l = landingFor(query)
    document.title = l && !row ? landingTitle(l, bound, SITE) : toUrl({ query, open: row?.key ?? null, vs }) ? shareTitle(query, row, peer, bound) : rootTitle.current
  }, [query, row, peer, vs, bound])

  const change = (q) => {
    // a kind switch starts from that kind's own default board
    const next = normalize(q.kind !== query.kind ? { ...q, ...DEFAULT_BY_KIND[q.kind], tests: [] } : q)
    // a change that drops the open row out of the field closes it
    const drops = row != null && (next.kind !== query.kind || next.seq !== query.seq || (next.kind === 'player' && next.pos !== 'ALL' && row.entity.pos !== next.pos))
    setQuery(next)
    if (drops) { setOpen(null); setVs(null) }
    writeUrl(hrefOf({ query: next, open: drops ? null : open, vs: drops ? null : vs }), 'replace')
    track('query', { words: queryWords(next), kind: next.kind })
  }
  const openRow = (key) => {
    const next = open === key ? null : key
    setOpen(next)
    setVs(null)
    writeUrl(hrefOf({ query, open: next }), 'replace')
    if (next) track('open', { entity: next, kind: query.kind })
  }
  // the finder, for an entity with no page: open its row and land on it, wherever it is on the board; a season board opens its latest season
  const findEntity = (e) => {
    const all = [...(board?.ranked ?? []), ...(board?.onTheWay ?? [])]
    const key = query.seq === 'teamGames' ? all.filter((r) => r.entity.id === e.id).sort((a, b) => b.season - a.season)[0]?.key ?? null : query.seq === 'tenure' ? all.filter((r) => r.entity.id === e.id).pop()?.key ?? null : e.id
    if (!key) return
    landOn.current = key
    setOpen(key)
    setVs(null)
    writeUrl(hrefOf({ query, open: key }), 'replace')
    track('open', { entity: key, kind: query.kind, from: 'finder' })
  }
  // the peer the panel reads against, in the URL so a shared link opens the same comparison
  const setPeer = (key) => {
    setVs(key)
    writeUrl(hrefOf({ query, open, vs: key }), 'replace')
    track('peer', { entity: open, vs: key })
  }
  const onShare = () => {
    share(shareText(query, board, row), window.location.href)
    track('share', { words: queryWords(query), entity: open, vs: peer?.key ?? null })
  }

  const shown = L ?? ledgersRef.current[boardKind] ?? Object.values(ledgersRef.current)[0] ?? null
  const first = shown?.firstSeason ?? 1869, current = shown?.currentSeason ?? 2026
  const since = bound ?? first
  const landing = landingFor(query)
  const leader = board?.ranked[0] && board.ranked[0].value != null ? board.ranked[0] : null
  return (
    <main>
      <div className="dateline">
        <span>{`drewhoover.com · ${spanWords(first, current)}`}<span className="dateline-upd"> · updated {String(shown?.builtAt ?? '').slice(0, 10)}</span></span>
        <span className="dateline-acts">
          <Finder kind={query.kind} current={row?.entity.id ?? null} onPick={findEntity} />
          <a className="ico" href={KOFI_URL} onClick={() => track('kofi', { from: 'icons board' })} aria-label="Buy me a coffee"><CoffeeIcon /></a>
          <button className="ico" onClick={onShare} aria-label="Share this board"><ShareIcon /></button>
          {copied && <span className="toast">copied</span>}
        </span>
      </div>
      <h1 className={landing ? 'landing-h1' : undefined}>{landing ? landing.h1 : 'College Football Comparator'}</h1>
      {landing && leader && <p className="landing-line">{rowName(leader)} leads with {rowWords(leader, query)}.</p>}
      <Sentence query={query} ledger={shown} bound={bound} onChange={change} />
      <p className="baserate">
        {!landing && <span className="sr-only">{queryWords(query, bound)}. </span>}
        Same point, {everyWordsPlain(query)} since {since}.
        {leader && <> The leader: <b>{rowName(leader)}</b>, {leader.value.toLocaleString('en-US')}.</>}
        {!ready && <span className="dateline-upd"> loading…</span>}
      </p>
      {board
        ? <Board board={board} query={board === lastBoard.current && !ready ? { ...query, kind: boardKind } : query} open={open} onOpen={openRow} panel={row && L && ready && <Panel key={row.key} L={L} row={row} board={board} query={query} peerKey={vs} onPeer={setPeer} hasPage={pages[query.kind]?.has(row.entity.id) ?? false} onClose={() => openRow(row.key)} />} />
        : <p className="loading">loading…</p>}
      <Landings current={landing?.slug ?? null} />
      <Notes ledgers={ledgersRef.current} />
      <footer>
        <a href="https://drewhoover.com/">drewhoover.com</a> · data rebuilt weekly in season ·{' '}
        <a href="https://github.com/DrewHoo/cfb-comparator">source & receipts</a> ·{' '}
        <a href={KOFI_URL} onClick={() => track('kofi', { from: 'footer' })}>buy me a coffee</a>
      </footer>
    </main>
  )
}
