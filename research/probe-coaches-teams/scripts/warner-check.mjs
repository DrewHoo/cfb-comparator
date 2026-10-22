// one-off: Warner's computed seasons vs his Wikipedia rows (pre-1936 navbox attribution)
import fs from 'node:fs';
const OUT = process.argv[2];
const H = JSON.parse(fs.readFileSync(OUT + '/howell-all.json', 'utf8'));
const NAV = JSON.parse(fs.readFileSync(OUT + '/coach-holes.json', 'utf8')).navboxItems;
const W = JSON.parse(fs.readFileSync(OUT + '/wiki-coaches.json', 'utf8'))['Pop Warner'].seasons;
const by = {};
for (const [file, items] of Object.entries(NAV)) for (const it of items) if (it.coaches.some((c) => c === 'Pop Warner')) for (const y of it.years) if (y <= 1935) {
  const rs = H.rows.filter((r) => r.file === file && r.se === y);
  if (rs.length) by[`${y} ${file}${it.coaches.length > 1 ? ' (co: ' + it.coaches.join(' & ') + ')' : ''}`] = ['W', 'L', 'T'].map((x) => rs.filter((r) => r.res === x).length).join('-');
}
for (const [k, v] of Object.entries(by).sort()) { const y = +k.slice(0, 4); console.log(k, 'howell', v, '| wiki rows that year:', W.filter((s) => s.year === y).map((s) => s.school.replace(/ football$/, '') + ' ' + s.overallRaw).join('; ')); }
