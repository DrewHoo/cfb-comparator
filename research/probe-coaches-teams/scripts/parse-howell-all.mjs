// Howell team pages, every season (the FIRST_SEASON=1936 filter of
// cfb-streak-king/scripts/data/parse-jhowell.mjs lifted), keyed by FILE name
// rather than the alias table so pre-1936 names (Carlisle, Chicago, ...) need
// no alias entries.
//   node parse-howell-all.mjs <jhowell-raw-dir> <out-dir>
// Writes <out>/howell-all.json:
//   { spans: { File: [[a,b],...] }, names: { File: displayName },
//     rows: [{ se, file, name, conf, date, at, opp, oppFile|null, oppName, res, pf, pa, city, note, color }] }
// one row per team-page row (a game between two files appears twice).
import fs from 'node:fs';
import path from 'node:path';

const [RAW, OUT] = process.argv.slice(2);
if (!RAW || !OUT) throw new Error('usage: parse-howell-all.mjs <jhowell-raw-dir> <out-dir>');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#160': ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, c) => ENT[c] ?? (c[0] === '#' ? String.fromCodePoint(c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : m));
const strip = (h) => h.replace(/<[^>]*>/g, '');
const text = (h) => decode(strip(h)).replace(/\s+/g, ' ').trim();

// --- byconf spans, by file ---
const byconf = fs.readFileSync(path.join(RAW, 'byconf.htm'), 'latin1');
const spans = {};
const spanName = {};
const linkRe = /<a href="([^"#]+\.htm)">([\s\S]*?)<\/a>/g;
let m;
while ((m = linkRe.exec(byconf))) {
  const t = text(m[2]);
  const nm = /^(.*?)\s*\(([\d\s,\-present]+)\)\s*$/.exec(t);
  if (!nm) continue;
  const file = m[1].replace(/\.htm$/, '');
  const ss = [];
  for (const part of nm[2].split(',')) {
    const p = part.trim();
    const r = /^(\d{4})\s*-\s*(\d{4}|present)$/.exec(p);
    if (r) ss.push([Number(r[1]), r[2] === 'present' ? 9999 : Number(r[2])]);
    else if (/^\d{4}$/.test(p)) ss.push([Number(p), Number(p)]);
  }
  if (!ss.length) continue;
  spans[file] = [...(spans[file] ?? []), ...ss].sort((a, b) => a[0] - b[0]);
  spanName[file] = nm[1];
}

// --- team pages ---
const rows = [];
const names = {};
const colorName = { '#00FF00': 'green', '#FFFF00': 'yellow', '#FF0000': 'red' };
const files = fs.readdirSync(path.join(RAW, 'teams')).filter((f) => f.endsWith('.htm'));
for (const f of files) {
  const file = f.replace(/\.htm$/, '');
  const html = fs.readFileSync(path.join(RAW, 'teams', f), 'latin1');
  const headRe = /<a name=(\d{4})>\d{4}-([^<]+?)\s*\(([^()]*)\)<\/a>/g;
  const heads = [];
  let hm;
  while ((hm = headRe.exec(html))) heads.push({ year: Number(hm[1]), name: hm[2].trim(), conf: hm[3].trim(), at: hm.index });
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    names[file] ??= h.name;
    const block = html.slice(h.at, heads[i + 1]?.at ?? html.length);
    const trRe = /<tr>([\s\S]*?)<\/tr>/g;
    let tr;
    while ((tr = trRe.exec(block))) {
      const tds = [...tr[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
      const raw = tds.map((c) => c[2]);
      const cells = raw.map(text);
      const md = /^(\d{1,2})\/(\d{1,2})$/.exec(cells[0] ?? '');
      if (!md || cells.length < 6) continue;
      const [mo, da] = [Number(md[1]), Number(md[2])];
      const y = mo <= 2 ? h.year + 1 : h.year;
      const pf = cells[4] === '' ? null : Number(cells[4]);
      const pa = cells[5] === '' ? null : Number(cells[5]);
      const href = /<a href="([^"#]+)\.htm/.exec(raw[2]);
      const bg = /bgcolor="([^"]+)"/i.exec(tds[0][1]);
      rows.push({
        se: h.year, file, name: h.name, conf: h.conf,
        date: `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`,
        at: cells[1], oppFile: href ? href[1] : null,
        oppName: cells[2].replace(/^\*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim(),
        oppTag: (/\(([^)]*)\)\s*$/.exec(cells[2]) ?? [])[1] ?? '',
        confGame: cells[2].startsWith('*'),
        res: cells[3], pf, pa, city: cells[6] ?? '', note: cells[7] ?? '',
        color: bg ? colorName[bg[1].toUpperCase()] ?? 'white' : 'white',
      });
    }
  }
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'howell-all.json'), JSON.stringify({ spans, spanNames: spanName, names, rows }));
const res = {};
for (const r of rows) res[r.res] = (res[r.res] ?? 0) + 1;
console.log(`files ${files.length}, byconf files with spans ${Object.keys(spans).length}, rows ${rows.length}`);
console.log('result cell values', JSON.stringify(res));
const bad = rows.filter((r) => !Number.isFinite(r.pf) || !Number.isFinite(r.pa));
console.log('rows with a non-numeric score', bad.length, JSON.stringify(bad.slice(0, 5)));
