// An entity's page: every comparison a coach, a team or a player leads among
// its kind, from its records file (scripts/build-records.mjs), scored and
// folded at load with RECORDS' knobs (src/lib/records.ts). Families by stat,
// the face of each expanded, the rest behind "more"; every row links to its
// board. `?tune=1` opens the tuner: a field per knob, the term table on
// every row, the knobs as a RECORDS literal to paste. The tuner re-scores
// and re-folds; it never re-words a row (the build picked each row's N under
// the shipped knobs).
import { useEffect, useMemo, useState } from 'react'
import { CoffeeIcon, ShareIcon } from './Icons.jsx'
import { Finder } from './Finder.jsx'
import { KOFI_URL } from './Notes.jsx'
import { useShare } from '../hooks/useShare.ts'
import { entityLead, entityText, fieldWords } from '../lib/share.ts'
import { track } from '../lib/analytics.ts'
import { seasonWords, spanWords } from '../lib/ledger.ts'
import { RECORDS, KNOB_PATHS, decodeEntity, knobAt, page, withKnob, statOf } from '../lib/records.ts'
import { statByKey } from '../lib/stats.ts'
import { KIND_ONE, breakerWords, placeWords, recordWords, runWords, he } from '../lib/words.ts'
import { toUrl } from '../lib/url.ts'

const BASE = import.meta.env.BASE_URL
/** the ledgers' first seasons, for the words; the prerender passes the real ones */
const FIRST = { coach: 1869, team: 1869, player: 2004 }

const KIND_WORDS = { held: 'leads', set: 'set it' }

function Terms({ r }) {
  return (
    <span className="terms">
      {Object.entries(r.terms).map(([k, v]) => <span key={k}><i>{k}</i> {v >= 0 ? '+' : '−'}{Math.abs(v).toFixed(1)}</span>)}
      <span><i>=</i> {r.score.toFixed(1)}</span>
    </span>
  )
}

/** the unit under a row's value: a reach counts games, a sum its stat, a count or streak games */
const unitWords = (r) => (r.shape.how === 'reach' ? 'games' : r.shape.how === 'sum' ? statByKey(r.shape.stat).noun : 'games')
const fmtVal = (n) => (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 }))

function Row({ r, tune, minN }) {
  const href = `${BASE}${toUrl({ query: { ...r.shape, n: r.at }, open: r.key })}`
  const run = runWords(r, minN)
  return (
    <div className={'rrow' + (r.live ? ' live' : '')}>
      <span className={'rkind ' + r.kind}>{r.live ? 'live' : KIND_WORDS[r.kind]}</span>
      <span className="rbody">
        <a className="rclaim" href={href} onClick={() => track('record', { entity: r.entity.name, words: recordWords(r) })}>{recordWords(r)}</a>
        <small>
          {placeWords(r)}{run ? ` · ${run}` : ''}{r.breaker ? ` · ${breakerWords(r)}` : ''}
          {r.folded.length > 0 && <span className="ralso"> · said {r.folded.length} other {r.folded.length === 1 ? 'way' : 'ways'}</span>}
        </small>
        {tune && <Terms r={r} />}
      </span>
      <span className={'rval' + (r.live ? ' otl' : '')}>
        {fmtVal(r.value)}
        <small>{unitWords(r)}</small>
      </span>
    </div>
  )
}

function FamilyBlock({ f, tune, minN }) {
  const [open, setOpen] = useState(false)
  const stat = statByKey(statOf(f.best))
  return (
    <section className="fam" aria-label={stat.noun}>
      <div className="fam-h"><span>{stat.noun}{f.best.season != null ? ' · a season' : ''}</span>{tune && <span>{f.best.score.toFixed(1)}</span>}</div>
      <Row r={f.best} tune={tune} minN={minN} />
      {open && f.rest.map((r, i) => <Row key={i} r={r} tune={tune} minN={minN} />)}
      {f.rest.length > 0 && !open && <button className="morebtn" onClick={() => setOpen(true)}>{f.rest.length} more</button>}
    </section>
  )
}

function Tuner({ knobs, onChange }) {
  const changed = KNOB_PATHS.filter((p) => knobAt(knobs, p) !== knobAt(RECORDS, p))
  const copy = async () => {
    const lines = changed.map((p) => `  ${p}: ${knobAt(knobs, p)},`).join('\n')
    try { await navigator.clipboard.writeText(`// RECORDS overrides from the tuner\n{\n${lines}\n}`) } catch {}
  }
  return (
    <section className="tuner" aria-label="The tuner">
      <div className="fam-h"><span>tuner · the score's knobs</span><span>{changed.length ? `${changed.length} changed` : 'defaults'}</span></div>
      <div className="knobs">
        {KNOB_PATHS.map((p) => (
          <label key={p} className={'knob' + (changed.includes(p) ? ' on' : '')}>
            <span>{p}</span>
            <input type="number" step="0.5" value={knobAt(knobs, p)} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(withKnob(knobs, p, v)) }} />
          </label>
        ))}
      </div>
      <div className="tuner-acts">
        <button className="morebtn" onClick={() => onChange(RECORDS)}>reset</button>
        <button className="morebtn" onClick={copy}>copy as RECORDS</button>
      </div>
    </section>
  )
}

export function EntityPage({ kind, id, preload, firstSeason = FIRST[kind] }) {
  const [file, setFile] = useState(preload ?? null)
  const [knobs, setKnobs] = useState(RECORDS)
  const [tune, setTune] = useState(false)
  const { copied, share: send } = useShare()

  useEffect(() => {
    if (file) return
    let live = true
    fetch(`${BASE}entities/${kind}/${id}.json`).then((r) => (r.ok ? r.json() : 'missing')).catch(() => 'missing').then((f) => { if (live) setFile(f) })
    return () => { live = false }
  }, [kind, id])

  // the tuner and its knobs: URL after mount, then localStorage, never during render
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tune')
      if (p === '1') localStorage.setItem('tune', '1')
      if (p === '0') localStorage.removeItem('tune')
      if (localStorage.getItem('tune') === '1') setTune(true)
      const saved = JSON.parse(localStorage.getItem('tune.knobs') ?? 'null')
      if (saved) setKnobs(Object.entries(saved).reduce((k, [p, v]) => withKnob(k, p, v), RECORDS))
    } catch {}
    track('entity page', { kind, entity: id })
  }, [kind, id])
  const changeKnobs = (k) => {
    setKnobs(k)
    try {
      const over = Object.fromEntries(KNOB_PATHS.filter((p) => knobAt(k, p) !== knobAt(RECORDS, p)).map((p) => [p, knobAt(k, p)]))
      localStorage.setItem('tune.knobs', JSON.stringify(over))
    } catch {}
  }

  const has = file && file !== 'missing'
  const rows = useMemo(() => (has ? decodeEntity(file, knobs) : []), [file, knobs])
  const fams = useMemo(() => (has ? page(rows, id) : []), [rows, id, file])
  const field = fieldWords(kind, null)
  // the tab's title, after mount (the prerender wrote the shipped one); the shipped knobs' face, not the tuner's
  useEffect(() => {
    if (!has) return
    const face = page(decodeEntity(file), id)[0]?.best
    document.title = entityText(kind, file.name, null, face, firstSeason).title
  }, [file, id, kind, firstSeason])
  // the share sheet, or "text url" on the clipboard: the page's lead line
  const share = () => {
    send(has ? entityLead(kind, file.name, null, fams[0]?.best, firstSeason) : window.location.href, window.location.href)
    track('share entity', { kind, entity: id })
  }

  const n = fams.reduce((s, f) => s + 1 + f.rest.length, 0)
  const pr = he(kind)
  return (
    <main>
      <div className="dateline">
        <span><a href={`${BASE}${kind === 'coach' ? '' : `?kind=${kind}`}`}>← the board</a> · drewhoover.com</span>
        <span className="dateline-acts">
          <Finder kind={kind} current={id} />
          <a className="ico" href={KOFI_URL} onClick={() => track('kofi', { from: `icons ${kind}` })} aria-label="Buy me a coffee"><CoffeeIcon /></a>
          <button className="ico" onClick={share} aria-label="Share this page"><ShareIcon /></button>
          {copied && <span className="toast">copied</span>}
        </span>
      </div>
      {file === 'missing' && <><h1>No page here</h1><p className="baserate">No file for <code>{id}</code>: {pr} leads nothing at any point, or the records haven't been built (<code>npm run records</code>).</p></>}
      {!file && <p className="loading">loading…</p>}
      {has && (
        <>
          <h1>{file.name}</h1>
          <p className="pmeta">{kind === 'player' ? `${file.pos ?? 'position unlisted'} · ` : `${KIND_ONE[kind]} · `}{spanWords(file.from, file.to)} · {kind === 'team' ? '' : `${file.teams.join(', ')} · `}{file.games.toLocaleString('en-US')} games{file.active ? ' · active' : ''}</p>
          <p className="baserate">
            Every comparison <b>{file.name}</b> leads among {field} since {seasonWords(firstSeason)}: {n} {n === 1 ? 'claim' : 'claims'} in {fams.length} {fams.length === 1 ? 'family' : 'families'}, the best first.
            A row leads its field now, or set a record that was later broken. Each links to its board.
          </p>
          {tune && <Tuner knobs={knobs} onChange={changeKnobs} />}
          {fams.map((f) => <FamilyBlock key={f.key} f={f} tune={tune} minN={knobs.minN[f.best.shape.seq]} />)}
          {fams.length === 0 && <p className="empty">Nothing {pr} leads at any point.</p>}
          <p className="notes" style={{ marginTop: 28 }}>
            A lead is an interval: the stretch of N where {pr} is first, worded at one N inside it. "One of 4" is a tie for first. A record "when {pr} got there" was first among the {kind === 'team' ? 'programs' : 'careers'} that had reached that point by then.
            Fields are {kind === 'team' ? 'programs' : 'careers'} that began in {seasonWords(firstSeason)} or later, or seasons where {pr} played half the team’s games. The method is in the <a href={`${BASE}#method`}>board's notes</a>.
          </p>
        </>
      )}
    </main>
  )
}
