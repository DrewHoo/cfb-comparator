import { describe, expect, it } from 'vitest'
import { LANDINGS, landingFor, landingFromPath, queryKey } from './landing.ts'
import { DEFAULT_QUERY } from './query.ts'
import { statByKey } from './stats.ts'

describe('the named boards', () => {
  it('have distinct slugs and queries, and none is the default query', () => {
    expect(new Set(LANDINGS.map((l) => l.slug)).size).toBe(LANDINGS.length)
    expect(new Set(LANDINGS.map((l) => queryKey(l.query))).size).toBe(LANDINGS.length)
    expect(landingFor(DEFAULT_QUERY)).toBeNull()
  })
  it('each reads back from its path, and its stat belongs to its kind', () => {
    for (const l of LANDINGS) {
      expect(landingFromPath(`/cfb-comparator/${l.slug}/`, '/cfb-comparator')).toBe(l)
      expect(statByKey(l.query.stat).kinds).toContain(l.query.kind)
      for (const t of l.query.tests) expect(statByKey(t.stat).kinds).toContain(l.query.kind)
    }
  })
})
