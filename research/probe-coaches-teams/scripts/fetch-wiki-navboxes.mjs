// List every "<Program> football coach navbox" template on Wikipedia (search,
// namespace 10), then fetch their wikitext 50 titles per request. 3 s apart.
//   node fetch-wiki-navboxes.mjs <download-dir>
// Writes <dir>/navbox-titles.json and <dir>/navboxes.json { title: { revid, wikitext } }.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
fs.mkdirSync(dir, { recursive: true });
const UA = 'cfb-comparator-probe/0.1 (drewhoover.com; research probe)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(params) {
  const u = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let a = 0; a < 5; a++) {
    const res = await fetch(u, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { console.log('429, waiting'); await sleep(15000 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`${res.status} ${u}`);
    await sleep(3000);
    return res.json();
  }
  throw new Error('429 x5');
}
const titlesFile = path.join(dir, 'navbox-titles.json');
let titles = fs.existsSync(titlesFile) ? JSON.parse(fs.readFileSync(titlesFile, 'utf8')) : null;
if (!titles) {
  titles = new Set();
  let offset = 0;
  for (;;) {
    const j = await get({ action: 'query', list: 'search', srsearch: 'intitle:"football coach navbox"', srnamespace: '10', srlimit: '500', sroffset: String(offset), srprop: '' });
    for (const s of j.query.search) titles.add(s.title);
    console.log('search offset', offset, 'got', j.query.search.length, 'total hits', j.query.searchinfo?.totalhits);
    if (!j.continue) break;
    offset = j.continue.sroffset;
  }
  titles = [...titles].filter((t) => / football coach navbox$/i.test(t)).sort();
  fs.writeFileSync(titlesFile, JSON.stringify(titles, null, 1));
}
console.log('navbox titles', titles.length);
const outFile = path.join(dir, 'navboxes.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const todo = titles.filter((t) => !out[t]);
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const j = await get({ action: 'query', prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', titles: batch.join('|') });
  for (const p of j.query.pages) {
    const rev = p.revisions?.[0];
    if (rev) out[p.title] = { revid: rev.revid, wikitext: rev.slots.main.content };
  }
  console.log('fetched', Object.keys(out).length);
  fs.writeFileSync(outFile, JSON.stringify(out));
}
fs.writeFileSync(path.join(dir, 'navboxes-retrieved.txt'), new Date().toISOString() + '\n');
