// Where the page finds its ledgers: one entity file and one column directory
// per kind (player, coach, team), fetched as hashed assets as a kind is
// needed (src/lib/load.ts). Nothing is bundled: the player file alone is
// 6 MB, and the default board is the head coaches'.
const files = import.meta.glob('./data/*.json', { query: '?url', import: 'default', eager: true })
const cols = import.meta.glob('./data/cols/*/*.bin.gz', { query: '?url', import: 'default', eager: true })

/** the asset URL of a kind's entity file */
export const ledgerUrl = (kind) => {
  const u = files[`./data/${kind}.json`]
  if (!u) throw new Error(`no ledger for ${kind}`)
  return u
}

/** the asset URL of a kind's column */
export const colUrl = (kind) => (name) => {
  const u = cols[`./data/cols/${kind}/${name}.bin.gz`]
  if (!u) throw new Error(`no column ${kind}/${name}`)
  return u
}
