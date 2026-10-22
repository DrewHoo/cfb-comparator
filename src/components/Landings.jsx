// The named boards (landing.ts), listed under the board as real links, by
// kind, so a crawler reaches every one from the root and a reader finds the
// boards worth a look. The current one is marked.
import { LANDINGS } from '../lib/landing.ts'
import { KIND_WORDS } from '../lib/words.ts'

const BASE = import.meta.env.BASE_URL
const KINDS = ['coach', 'team', 'player']

export function Landings({ current = null }) {
  return (
    <section className="landings" aria-label="Named boards">
      <h2 className="notes-h">More boards</h2>
      {KINDS.map((kind) => (
        <div key={kind}>
          <div className="landing-kind">{KIND_WORDS[kind]}</div>
          <ul className="landing-list">
            {LANDINGS.filter((l) => l.query.kind === kind).map((l) => (
              <li key={l.slug}>{l.slug === current ? <b>{l.h1}</b> : <a href={`${BASE}${l.slug}/`}>{l.h1}</a>}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
