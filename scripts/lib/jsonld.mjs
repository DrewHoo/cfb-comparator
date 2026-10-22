// JSON-LD pieces the prerender puts in a page's @graph: a ranked list for a
// board (its top rows, each linking to the entity's page when it has one)
// and for an entity page (its family faces). Pure; the words are words.ts's,
// so the list says what the page says.
import { recordWords, rowName, rowWords } from '../../src/lib/words.ts'

/** An ItemList: `items` in order, each `{ name, url? }`. */
export const itemListOf = ({ name, url, items }) => ({
  '@type': 'ItemList',
  name,
  ...(url ? { url } : {}),
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.url ? { url: it.url } : {}) })),
})

/** A board's top n ranked rows as items, with the entity's page where `pages` has its id. */
export function boardItems(board, q, _L, { entityUrl, pages = new Set(), n = 10 }) {
  return board.ranked.slice(0, n).map((r) => ({
    name: `${rowName(r)}: ${rowWords(r, q)}`,
    ...(pages.has(r.entity.id) ? { url: entityUrl(r.entity.id) } : {}),
  }))
}

/** An entity page's family faces as items. */
export const entityItems = (fams) => fams.map((f) => ({ name: recordWords(f.best) }))

/** the schema.org type of a kind's page subject */
export const subjectOf = (kind, name) => (kind === 'team' ? { '@type': 'SportsTeam', name, sport: 'American football' } : { '@type': 'Person', name })
