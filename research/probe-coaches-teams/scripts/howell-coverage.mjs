// Coverage of Howell's pages before 1936 (and a few reference years after).
//   node howell-coverage.mjs <out-dir>   (reads <out>/howell-all.json, writes <out>/howell-coverage.json)
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const H = JSON.parse(fs.readFileSync(path.join(OUT, 'howell-all.json'), 'utf8'));
const { spans, rows } = H;
const LAST = 1935;
const inSpan = (file, y) => (spans[file] ?? []).some(([a, b]) => a <= y && y <= b);

// --- per-team ---
const perTeam = {};
for (const r of rows) {
  const t = (perTeam[r.file] ??= { seasons: new Set(), gamesPre1936: 0, first: 9999, seasonsOutsideSpan: new Set() });
  t.first = Math.min(t.first, r.se);
  if (r.se <= LAST) { t.seasons.add(r.se); t.gamesPre1936++; }
  if (!inSpan(r.file, r.se)) t.seasonsOutsideSpan.add(r.se);
}
const teamTable = Object.entries(perTeam)
  .map(([file, t]) => ({ file, first: t.first, seasonsPre1936: t.seasons.size, gamesPre1936: t.gamesPre1936, seasonsOutsideByconfSpan: [...t.seasonsOutsideSpan].sort() }))
  .sort((a, b) => a.first - b.first || a.file.localeCompare(b.file));

// --- dedupe ---
const key = (r) => `${r.se}|${r.date}|${[r.file, r.oppFile].sort().join('|')}`;
const byKey = new Map();
for (const r of rows) {
  if (!r.oppFile) continue;
  const k = key(r);
  (byKey.get(k) ?? byKey.set(k, []).get(k)).push(r);
}
const mirror = { pairs: 0, singles: 0, triples: 0, scoreDisagree: 0, resultDisagree: 0, siteDisagree: 0, oppFileHasNoSeason: 0, examples: [] };
const seasonsOf = new Map();
for (const r of rows) (seasonsOf.get(r.file) ?? seasonsOf.set(r.file, new Set()).get(r.file)).add(r.se);
for (const [k, rs] of byKey) {
  if (rs[0].se > LAST) continue;
  if (rs.length === 1) {
    mirror.singles++;
    if (!seasonsOf.get(rs[0].oppFile)?.has(rs[0].se)) mirror.oppFileHasNoSeason++;
    if (mirror.examples.length < 12) mirror.examples.push({ k, row: `${rs[0].file} ${rs[0].at} ${rs[0].oppName} ${rs[0].res} ${rs[0].pf}-${rs[0].pa}`, oppHasSeason: !!seasonsOf.get(rs[0].oppFile)?.has(rs[0].se) });
    continue;
  }
  if (rs.length > 2) { mirror.triples++; continue; }
  mirror.pairs++;
  const [a, b] = rs;
  if (a.pf !== b.pa || a.pa !== b.pf) mirror.scoreDisagree++;
  const flip = { W: 'L', L: 'W', T: 'T' };
  if (flip[a.res] !== b.res) mirror.resultDisagree++;
  const siteOk = (a.at === 'vs.' && b.at === 'vs.' && a.city && a.city === b.city) || (a.at === '@' && b.at === 'vs.' && !b.city) || (b.at === '@' && a.at === 'vs.' && !a.city) || (a.at === 'vs.' && b.at === 'vs.' && a.city && b.city);
  if (!siteOk) mirror.siteDisagree++;
}

// --- per season ---
const perSeason = {};
for (let y = 1869; y <= LAST; y++) perSeason[y] = { teamRows: 0, games: 0, gamesVsNonMajor: 0, gamesBothMajor: 0, teamsWithPage: 0, teamsInByconf: 0, green: 0, yellow: 0, red: 0, white: 0, ties: 0 };
const seen = new Set();
const teamsWithPage = {};
for (const r of rows) {
  if (r.se > LAST) continue;
  const s = perSeason[r.se];
  s.teamRows++;
  (teamsWithPage[r.se] ??= new Set()).add(r.file);
  if (!r.oppFile) {
    s.games++; s.gamesVsNonMajor++; s[r.color]++; if (r.res === 'T') s.ties++;
    continue;
  }
  const k = key(r);
  if (seen.has(k)) continue;
  seen.add(k);
  s.games++; s.gamesBothMajor++; s[r.color]++; if (r.res === 'T') s.ties++;
}
for (let y = 1869; y <= LAST; y++) {
  perSeason[y].teamsWithPage = teamsWithPage[y]?.size ?? 0;
  perSeason[y].teamsInByconf = Object.keys(spans).filter((f) => inSpan(f, y)).length;
  perSeason[y].shareVsNonMajor = perSeason[y].games ? +(perSeason[y].gamesVsNonMajor / perSeason[y].games).toFixed(3) : null;
}
const decade = (y) => `${Math.floor(y / 10) * 10}s`;
const perDecade = {};
for (const [y, s] of Object.entries(perSeason)) {
  const d = (perDecade[decade(+y)] ??= { seasons: 0, games: 0, gamesVsNonMajor: 0, gamesBothMajor: 0, green: 0, yellow: 0, red: 0, white: 0, ties: 0, maxTeams: 0 });
  d.seasons++;
  for (const f of ['games', 'gamesVsNonMajor', 'gamesBothMajor', 'green', 'yellow', 'red', 'white', 'ties']) d[f] += s[f];
  d.maxTeams = Math.max(d.maxTeams, s.teamsWithPage);
}
for (const d of Object.values(perDecade)) d.shareVsNonMajor = +(d.gamesVsNonMajor / d.games).toFixed(3);
const totals = Object.values(perSeason).reduce((a, s) => ({ teamRows: a.teamRows + s.teamRows, games: a.games + s.games, vsNonMajor: a.vsNonMajor + s.gamesVsNonMajor }), { teamRows: 0, games: 0, vsNonMajor: 0 });

// --- byconf shape ---
const spanFiles = Object.keys(spans);
const majorIn = (y) => spanFiles.filter((f) => inSpan(f, y));
const byconf = {
  files: spanFiles.length,
  earliestStart: Math.min(...spanFiles.map((f) => spans[f][0][0])),
  filesWithMultipleSpans: spanFiles.filter((f) => spans[f].length > 1).length,
  filesStartingBefore1936: spanFiles.filter((f) => spans[f][0][0] < 1936).length,
  filesWhoseAllSpansEndBefore1936: spanFiles.filter((f) => spans[f].every(([, b]) => b < 1936)).map((f) => `${f} ${JSON.stringify(spans[f])}`),
  majorCount: Object.fromEntries([1869, 1875, 1880, 1890, 1900, 1910, 1920, 1930, 1935, 1936, 1950].map((y) => [y, majorIn(y).length])),
  majorIn1900: majorIn(1900),
  examples: Object.fromEntries(['Michigan', 'NotreDame', 'Alabama', 'Chicago', 'Carlisle', 'Yale', 'Princeton', 'Rutgers', 'Harvard', 'Sewanee', 'Centre', 'WashingtonJefferson', 'Oberlin', 'Akron', 'Texas', 'Stanford', 'Penn', 'Clemson', 'Pittsburgh', 'Temple', 'Cornell', 'Georgia', 'Auburn', 'GeorgiaTech', 'Rice', 'Illinois', 'Minnesota', 'Oklahoma', 'Tennessee', 'Ohio State'.replace(' ', '')].map((f) => [f, spans[f] ?? null])),
  maxSpansOneTeam: spanFiles.map((f) => [f, spans[f].length]).sort((a, b) => b[1] - a[1]).slice(0, 8),
};
const pagesWithoutSpan = Object.keys(perTeam).filter((f) => !spans[f]);
const seasonsOutsideSpan = teamTable.filter((t) => t.seasonsOutsideByconfSpan.length).map((t) => `${t.file}: ${t.seasonsOutsideByconfSpan.length} seasons (${t.seasonsOutsideByconfSpan.slice(0, 6).join(',')}${t.seasonsOutsideByconfSpan.length > 6 ? ',...' : ''})`);
const earliestRow = rows.reduce((a, r) => (r.date < a.date ? r : a));

const out = { totals1869to1935: totals, perDecade, perSeason, mirror, byconf, pagesWithoutSpan, seasonsOutsideSpan, teamTable, earliestRow };
fs.writeFileSync(path.join(OUT, 'howell-coverage.json'), JSON.stringify(out, null, 1));
console.log('totals 1869-1935', JSON.stringify(totals));
console.log('per decade'); for (const [d, v] of Object.entries(perDecade)) console.log(' ', d, JSON.stringify(v));
console.log('mirror', JSON.stringify({ ...mirror, examples: undefined }));
console.log('mirror single examples', JSON.stringify(mirror.examples, null, 0));
console.log('byconf', JSON.stringify({ ...byconf, majorIn1900: undefined, examples: undefined }));
console.log('majorIn1900', byconf.majorIn1900.join(' '));
console.log('examples', JSON.stringify(byconf.examples));
console.log('pages with no byconf span', pagesWithoutSpan.join(' '));
console.log('seasons on a page outside its byconf span:', seasonsOutsideSpan.length); for (const s of seasonsOutsideSpan.slice(0, 15)) console.log('  ', s);
console.log('teams with pre-1936 seasons', teamTable.filter((t) => t.seasonsPre1936).length, 'of', teamTable.length);
console.log('earliest row', JSON.stringify(earliestRow));
console.log('first 25 teams by first season'); for (const t of teamTable.slice(0, 25)) console.log('  ', t.file, t.first, t.seasonsPre1936, t.gamesPre1936);
