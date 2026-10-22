// Fold the probe's outputs into coverage.json and print the README's tables.
//   node summarize.mjs <out-dir> <payload.json> <coverage.json to write>
import fs from 'node:fs';
import path from 'node:path';

const [OUT, PAYLOAD, COV] = process.argv.slice(2);
const J = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const hc = J('howell-coverage.json');
const holes = J('coach-holes.json');
const join = J('join.json');
const P = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));

// AP poll size by season, from the payload (max rank seen) and share of rank-unknown sides
const ap = {};
for (let i = 0; i < P.games.se.length; i++) {
  const se = P.games.se[i];
  const a = (ap[se] ??= { maxRank: 0, sides: 0, unknown: 0 });
  for (const r of [P.games.hr[i], P.games.ar[i]]) { a.sides++; if (r === -1) a.unknown++; a.maxRank = Math.max(a.maxRank, r); }
}
const eras = [];
for (const [se, a] of Object.entries(ap)) {
  const last = eras.at(-1);
  if (last && last.maxRank === a.maxRank) last.to = +se; else eras.push({ from: +se, to: +se, maxRank: a.maxRank });
}
const unknownByDecade = {};
for (const [se, a] of Object.entries(ap)) { const d = `${Math.floor(se / 10) * 10}s`; const u = (unknownByDecade[d] ??= { sides: 0, unknown: 0 }); u.sides += a.sides; u.unknown += a.unknown; }
console.log('AP max rank eras (payload):', JSON.stringify(eras));
console.log('rank-unknown (-1) sides by decade:', JSON.stringify(unknownByDecade));

// Wikipedia pre-1936 reconciliation
const pre = { match: 0, mismatch: 0, offSpine: 0 };
const preRows = [];
for (const s of join.sample) {
  const W = JSON.parse(fs.readFileSync(path.join(OUT, 'wiki-coaches.json'), 'utf8'))[s.coach];
}
const wiki = J('wiki-coaches.json');
for (const s of join.sample) {
  for (const row of wiki[s.coach].seasons) {
    if (!row.year || row.year < 1890 || row.year > 1935) continue;
    const mm = s.mismatches.find((m) => m.year === row.year && m.school === row.school);
    const off = s.offSpine.find((o) => o.startsWith(`${row.year} ${row.school.replace(/ football$/, '')}`));
    const st = mm ? 'mismatch' : off ? 'offSpine' : 'match';
    pre[st]++;
    preRows.push({ coach: s.coach, year: row.year, school: row.school, status: st });
  }
}
console.log('Wikipedia coach-season rows 1890-1935 vs Howell:', JSON.stringify(pre));

const cov = {
  generated: new Date().toISOString().slice(0, 10),
  sources: {
    games: 'James Howell team pages (data/raw/jhowell in cfb-streak-king, updated 2026-01-27), every season block, mirror-deduped',
    coaches_pre1936: 'Wikipedia "<Program> football coach navbox" templates, 997 fetched, 186 of 193 pre-1936 major teams mapped',
    coaches_1936on: 'CFBD /coaches 1936-2026 pull in cfb-streak-king; Streak King payload stints',
    cfbd_1869_1935: 'NOT FETCHED: HTTP 429 {"message":"Monthly call quota exceeded."} on 2026-10-21',
  },
  gamesPerSeason1869to1935: Object.fromEntries(Object.entries(hc.perSeason).map(([y, s]) => [y, { games: s.games, gamesBothMajor: s.gamesBothMajor, gamesVsNonMajor: s.gamesVsNonMajor, shareVsNonMajor: s.shareVsNonMajor, teamsWithPage: s.teamsWithPage, teamsInByconf: s.teamsInByconf, ties: s.ties, verifiedGreen: s.green, unverifiedRed: s.red }])),
  gamesPerDecade1869to1935: hc.perDecade,
  totals1869to1935: hc.totals1869to1935,
  mirrorCheck: { ...hc.mirror, examples: undefined },
  majorTeamsByYear: hc.byconf.majorCount,
  coachHolesPerDecade: Object.fromEntries(Object.entries(holes.perDecade).map(([d, v]) => [d, {
    majorTeamSeasons: v.teamSeasons ?? 0, teamGameRows: v.games ?? 0,
    navboxNamed: v.navboxNamed ?? 0, navboxNoCoach: v.navboxNoCoach ?? 0, navboxHole: v.navboxHole ?? 0, navboxMissing: v.navboxMissing ?? 0,
    navboxTwoPlusEntries: v.navboxMultiEntry ?? 0, navboxCoCoachEntry: v.navboxCoCoachEntry ?? 0,
    cfbdRow: d >= '1930s' ? v.cfbdRow ?? 0 : null, cfbdHole: d >= '1930s' ? v.cfbdHole ?? 0 : null,
    payloadGameSidesNoCoach: join.payloadCoachCoverage[d]?.noCoach ?? null, payloadMajorGameSides: join.payloadCoachCoverage[d]?.majorTeamGames ?? null,
    pre1936TeamGameRowsByNavboxKind: join.preCoachKinds[d] ?? null,
  }])),
  coachHolesNote: '1930s CFBD/payload columns cover 1936-1939 only. navboxMissing after 1935 is mostly teams the navbox map never tried (it maps pre-1936 teams only). payloadGameSidesNoCoach counts game sides of major team-seasons whose payload team has no stint covering the game.',
  navboxVsCfbd1936on: holes.navboxVsCfbd1936on,
  apRankEras: eras, apRankUnknownByDecade: unknownByDecade,
  wikipediaVsHowell1890to1935: pre,
};
fs.writeFileSync(COV, JSON.stringify(cov, null, 1));
console.log('wrote', COV);
