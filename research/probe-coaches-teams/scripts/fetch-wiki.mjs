// Fetch Wikipedia pages' wikitext through the MediaWiki API, one request per
// 1.5 s, cached.
//   node fetch-wiki.mjs <download-dir> "<Title>" ["<Title>" ...]
// Saves <dir>/<Title_with_underscores>.json = { title, resolved, revid, timestamp, url, wikitext }
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...titles] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'cfb-comparator-probe/0.1 (drewhoover.com; research probe)';
let first = true;
for (const t of titles) {
  const file = path.join(dir, t.replace(/[^A-Za-z0-9.]+/g, '_') + '.json');
  if (fs.existsSync(file)) { console.log('cached', t); continue; }
  if (!first) await sleep(3000);
  first = false;
  const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=revisions&rvprop=content|ids|timestamp&rvslots=main&titles=${encodeURIComponent(t)}`;
  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(u, { headers: { 'User-Agent': UA } });
    if (res.status !== 429) break;
    const wait = Math.max(Number(res.headers.get('retry-after') ?? 0) * 1000, 10000 * (attempt + 1));
    console.log(t, '429, waiting', wait, 'ms');
    await sleep(wait);
  }
  if (!res.ok) { console.log(t, res.status); continue; }
  const j = await res.json();
  const p = j.query?.pages?.[0];
  const rev = p?.revisions?.[0];
  if (!rev) { console.log(t, 'missing', JSON.stringify(j.query).slice(0, 200)); continue; }
  const resolved = p.title;
  fs.writeFileSync(file, JSON.stringify({ title: t, resolved, revid: rev.revid, timestamp: rev.timestamp, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, '_'))}`, retrieved: new Date().toISOString().slice(0, 10), wikitext: rev.slots.main.content }));
  console.log(t, '->', resolved, rev.revid, rev.slots.main.content.length);
}
