import { describe, expect, it } from 'vitest'
import { loadLedger } from '../../scripts/lib/ledger-node.mjs'
import { groupData, groupH1, groupPath, confSlug, schoolsOf } from './groups.ts'

const P = loadLedger('player')

describe('the group pages', () => {
  it("Alabama's receivers rank by receiving yards at Alabama, the top rows carrying curves", () => {
    const d = groupData(P, { kind: 'school', id: 'alabama', name: 'Alabama', pos: 'WR' })
    expect(d.rows.length).toBeGreaterThan(20)
    expect(d.rows[0].name).toBe('DeVonta Smith')
    expect(d.rows[0].totals[0]).toBe(3965)
    expect(d.rows[0].curves?.[0]?.at(-1)).toBe(3965)
    expect(d.rows[8].curves).toBeUndefined()
    expect(groupH1(d)).toBe("Alabama's best wide receivers since 2004")
    expect(groupPath(d)).toBe('/school/alabama/wide-receivers/')
  })
  it("a conference's players count the games their team played as a member", () => {
    const d = groupData(P, { kind: 'conference', id: confSlug('SEC'), name: 'SEC', pos: 'QB' })
    expect(confSlug('Big Ten')).toBe('big-ten')
    const burrow = d.rows.find((r) => r.name === 'Joe Burrow')
    // his LSU seasons only: Ohio State's games were Big Ten games
    expect(burrow?.from).toBe(2018)
    expect(burrow?.totals[0]).toBe(8565)
  })
  it('every school with pages has the spine id as its address', () => {
    const s = schoolsOf(P)
    expect(s.find((x) => x.id === 'alabama')?.name).toBe('Alabama')
    expect(s.every((x) => !x.id.startsWith('espn:'))).toBe(true)
  })
})
