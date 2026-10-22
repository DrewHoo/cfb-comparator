// The query as a sentence: who · did what · how much · over which games ·
// against whom, every word that can change a Picker. The shape of the
// sentence follows `how` (a total, a count of games, every game, a streak,
// a race to a number); src/lib/words.ts says the same sentence in prose.
import { useEffect, useRef, useState } from 'react'
import { Picker } from './Picker.jsx'
import { Chevron } from './Icons.jsx'
import { POSITIONS, seasonWords } from '../lib/ledger.ts'
import { statByKey, statsFor, isUnit } from '../lib/stats.ts'
import { POS_WORDS, KIND_WORDS, testWords, seqWords } from '../lib/words.ts'

// who: the three kinds, with a player board's position groups under "players"
const WHO_OPTIONS = [
  { value: 'coach', label: KIND_WORDS.coach },
  { value: 'team', label: KIND_WORDS.team },
  ...POSITIONS.map((p) => ({ value: `player:${p}`, label: POS_WORDS[p], hint: p === 'ALL' ? 'since 2004' : '' })),
]
const whoValue = (q) => (q.kind === 'player' ? `player:${q.pos}` : q.kind)
const parseWho = (v) => (v.startsWith('player:') ? { kind: 'player', pos: v.slice(7) } : { kind: v, pos: 'ALL' })

// how + dir in one word: what the sentence says before the stat
const HOW_OPTIONS = [
  { value: 'sum:most', label: 'with the most' },
  { value: 'sum:fewest', label: 'with the fewest' },
  { value: 'count:most', label: 'with the most games of' },
  { value: 'count:fewest', label: 'with the fewest games of' },
  { value: 'every:most', label: 'with every game at' },
  { value: 'streak:most', label: 'with the longest streak of' },
  { value: 'reach:fewest', label: 'fastest to' },
  { value: 'reach:most', label: 'slowest to' },
]

const SCOPE_OPTIONS = [
  { value: 'all', label: 'bowls included' },
  { value: 'reg', label: 'regular season only' },
]

// the eras: as far back as the data goes for this kind and stat, then the game's own breakpoints
export const ERAS = [
  [1880, 'eleven-man football'],
  [1906, 'the forward pass'],
  [1936, 'the AP poll'],
  [1958, 'the two-point conversion'],
  [1978, 'Division I-A'],
  [1998, 'the BCS'],
  [2014, 'the College Football Playoff'],
  [2024, 'the 12-team playoff'],
]
const eraOptions = (ledger, bound) => {
  const first = ledger?.firstSeason ?? 1869, current = ledger?.currentSeason ?? 2026
  return [
    { value: 0, label: `since ${seasonWords(bound ?? first)}`, hint: bound ? 'as far back as the data records it' : 'the whole ledger' },
    ...ERAS.filter(([y]) => y > (bound ?? first) && y < current).map(([y, hint]) => ({ value: y, label: `since ${seasonWords(y)}`, hint })),
  ]
}

/** every threshold of every stat of the kind, as one test each: "300+ passing yards", "a shutout" */
function testOptions(kind) {
  const out = []
  for (const s of statsFor(kind)) {
    if (isUnit(s)) { out.push({ value: `${s.key}:1`, label: testWords({ stat: s.key, min: 1 }) }); continue }
    if (s.thresholds[0] === 0) out.push({ value: `${s.key}:0-0`, label: testWords({ stat: s.key, min: 0, max: 0 }) })
    for (const t of s.thresholds) if (t > 0) out.push({ value: `${s.key}:${t}`, label: testWords({ stat: s.key, min: t }) })
  }
  return out
}
const testValue = (t) => `${t.stat}:${t.min}${t.max != null ? `-${t.max}` : ''}`
const parseTest = (v) => { const m = /^([a-z0-9]+):(\d+)(?:-(\d+))?$/.exec(v); return m[3] == null ? { stat: m[1], min: Number(m[2]) } : { stat: m[1], min: Number(m[2]), max: Number(m[3]) } }

// the number in the sentence: a text box that holds what is typed (an empty box while retyping included) and
// commits every whole number above zero as it is typed; focus selects the number so typing replaces it; leaving
// the box empty puts the value back. Typing commits without tracking; leaving the box tracks the query once,
// and only if the number moved while it had focus (the steppers and the arrow keys track per press)
function NumberWord({ value, onChange, step = 1, wide, label }) {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const atFocus = useRef(value)
  useEffect(() => { if (!editing) setDraft(String(value)) }, [value, editing])
  const parse = (s) => { const v = Number(s); return s !== '' && Number.isInteger(v) && v > 0 ? v : null }
  const commit = (s) => { const v = parse(s); if (v != null && v !== value) onChange(v, { track: false }) }
  const leave = () => { setEditing(false); const v = parse(draft) ?? value; if (v !== atFocus.current) onChange(v) }
  const shown = editing ? draft : String(value)
  return (
    <span className="nwrap">
      <button className="nstep" onClick={() => onChange(Math.max(1, value - step))} aria-label={`${label} down`}><Chevron left /></button>
      <input className={'nin' + (wide ? ' wide' : '')} type="text" inputMode="numeric" pattern="[0-9]*" value={shown} aria-label={label}
        style={{ width: `${Math.max(wide ? 5 : 3, shown.length + 1)}ch` }}
        onFocus={(e) => { setEditing(true); setDraft(String(value)); atFocus.current = value; e.target.select() }}
        onChange={(e) => { const s = e.target.value.replace(/[^0-9]/g, ''); setDraft(s); commit(s) }}
        onBlur={leave}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'ArrowUp') { e.preventDefault(); onChange(value + step) } else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, value - step)) } }} />
      <button className="nstep" onClick={() => onChange(value + step)} aria-label={`${label} up`}><Chevron /></button>
    </span>
  )
}

export function Sentence({ query, ledger, bound = null, onChange }) {
  const set = (patch, opts) => onChange({ ...query, ...patch }, opts)
  const kind = query.kind
  const seqOptions = [
    { value: 'games', label: seqWords('games', query.n, kind), hint: kind === 'coach' ? 'as a major-college head coach' : kind === 'team' ? 'as a major-college program' : '' },
    ...(kind !== 'team' ? [{ value: 'tenure', label: seqWords('tenure', query.n, kind) }] : []),
    { value: 'seasons', label: seqWords('seasons', query.n, kind) },
    { value: 'teamGames', label: `${kind === 'team' ? '' : 'team '}${seqWords('teamGames', query.n, kind)}` },
  ]
  const isTest = query.how === 'count' || query.how === 'every' || query.how === 'streak'
  const stats = statsFor(kind)
  const statOptions = stats.map((s) => ({ value: s.key, label: s.noun }))
  const tests = testOptions(kind)
  const setTest = (i, v) => set({ tests: query.tests.map((t, k) => (k === i ? parseTest(v) : t)) })
  const addTest = () => {
    const used = new Set(query.tests.map((t) => t.stat))
    const next = stats.find((s) => !used.has(s.key) && s.key !== 'win' && s.key !== 'loss') ?? stats[0]
    set({ tests: [...query.tests, { stat: next.key, min: next.thresholds[Math.min(1, next.thresholds.length - 1)] }] })
  }
  const stat = statByKey(query.stat)
  const reachSeq = seqOptions.filter((o) => o.value === 'games' || o.value === 'tenure')
  const whose = kind === 'team' ? 'the' : 'their'

  return (
    <div className="sentence" role="group" aria-label="The comparison">
      <Picker value={whoValue(query)} options={WHO_OPTIONS} onChange={(v) => set(parseWho(v))} ariaLabel="Who" />
      <Picker value={`${query.how}:${query.dir}`} options={HOW_OPTIONS} onChange={(v) => { const [how, dir] = v.split(':'); set({ how, dir }) }} ariaLabel="How the games count" />
      {query.how === 'reach' && (
        <>
          <NumberWord value={query.n} onChange={(n, opts) => set({ n }, opts)} step={stat.tick ?? 1} wide label="The target" />
          <Picker value={query.stat} options={statOptions} onChange={(stat) => set({ stat })} ariaLabel="The stat" />
          <span>by</span>
          <Picker value={query.seq} options={reachSeq} onChange={(seq) => set({ seq })} ariaLabel="Counting what" />
        </>
      )}
      {query.how === 'sum' && (
        <>
          <Picker value={query.stat} options={statOptions} onChange={(stat) => set({ stat })} ariaLabel="The stat" />
          <span>through {query.seq === 'teamGames' && kind !== 'team' ? 'their team’s' : whose} first</span>
        </>
      )}
      {isTest && (
        <>
          {query.tests.map((t, i) => (
            <span key={i} className="nwrap">
              {i > 0 && <span>and&nbsp;</span>}
              <Picker value={testValue(t)} options={tests} onChange={(v) => setTest(i, v)} ariaLabel={`Test ${i + 1}`} />
              {query.tests.length > 1 && <button className="xbtn" onClick={() => set({ tests: query.tests.filter((_, k) => k !== i) })} aria-label="Remove this test">×</button>}
            </span>
          ))}
          {query.tests.length < 3 && <button className="addbtn" onClick={addTest} aria-label="Add a test">+</button>}
          <span>in {query.seq === 'teamGames' && kind !== 'team' ? 'their team’s' : whose} first</span>
        </>
      )}
      {query.how !== 'reach' && (
        <>
          <NumberWord value={query.n} onChange={(n, opts) => set({ n }, opts)} label="The window" />
          <Picker value={query.seq} options={seqOptions} onChange={(seq) => set({ seq })} ariaLabel="Counting what" />
        </>
      )}
      <span>·</span>
      <Picker value={query.scope} options={SCOPE_OPTIONS} onChange={(scope) => set({ scope })} ariaLabel="Bowls" />
      <span>·</span>
      <Picker value={query.since ?? 0} options={eraOptions(ledger, query.since == null ? bound : null)} onChange={(v) => set({ since: v || null })} ariaLabel="Era" />
    </div>
  )
}
