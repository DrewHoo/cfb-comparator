// The probe's coach-game join, used for the Wikipedia sample table and the
// known-answer checks.
//   games: Howell team-page rows for 1869-1935, Streak King's payload for 1936-2026
//   coach of record: Wikipedia coach navboxes per team-season before 1936
//     (whole season to the one named coach; seasons with 2+ entries left
//     unresolved), the payload's stints (CFBD + coach-overrides) from 1936
//   node join.mjs <payload.json> <out-dir> <name-aliases.json> [<navboxes.json>]   (reads <out>/howell-all.json,
//     coach-holes.json (parsed navboxes), navbox-map.json, wiki-coaches.json)
import fs from 'node:fs';
import path from 'node:path';

const [PAYLOAD, OUT] = process.argv.slice(2);
const J = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const P = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const H = J('howell-all.json');
const NAV = J('coach-holes.json').navboxItems;
const NB_RAW = JSON.parse(fs.readFileSync(process.argv[5] ?? path.join(OUT, '..', 'downloads', 'wiki-navbox', 'navboxes.json'), 'utf8'));
const NB_MAP = J('navbox-map.json');
const WIKI = J('wiki-coaches.json');
const log = [];
const say = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };

// ---------- navbox targets (page titles) per team-season, pre-1936 ----------
const DASH = '[–—-]';
const navTargets = {}; // file -> [{ targets, years:Set, noCoach }]
for (const [file, title] of Object.entries(NB_MAP)) {
  if (!title || !NB_RAW[title]) continue;
  const w = NB_RAW[title].wikitext.replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>|<!--[\s\S]*?-->/g, '');
  const items = [];
  for (const raw of w.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('*')) continue;
    const m = /\(([^()]*\d{4}[^()]*)\)\s*(?:\}\})?\s*$/.exec(line);
    if (!m) continue;
    const years = new Set();
    for (const part of m[1].split(',')) {
      const r = new RegExp(`^\\s*(\\d{4})\\s*${DASH}\\s*(\\d{4}|\\d{2})?\\s*$`).exec(part);
      if (r) { const a = +r[1]; const b = r[2] ? (r[2].length === 4 ? +r[2] : +(String(a).slice(0, 2) + r[2])) : 2026; for (let y = a; y <= b; y++) years.add(y); continue; }
      if (/^\s*\d{4}\s*$/.test(part)) years.add(+part.trim());
    }
    const targets = [...line.slice(1, m.index).matchAll(/\[\[([^\]|]+)/g)].map((x) => x[1].trim());
    items.push({ targets, years, noCoach: /no coach/i.test(line) && !targets.length, interim: line.includes('#') });
  }
  navTargets[file] = items;
}
function navCoach(file, se) {
  const items = navTargets[file];
  if (!items) return { kind: 'noNavbox' };
  const cover = items.filter((it) => it.years.has(se));
  if (!cover.length) return { kind: 'hole' };
  const named = cover.filter((it) => !it.noCoach);
  if (!named.length) return { kind: 'noCoach' };
  if (named.length > 1) return { kind: 'multi', targets: named.map((it) => it.targets.join(' & ')) };
  return { kind: named[0].targets.length > 1 ? 'co' : 'one', targets: named[0].targets };
}

// ---------- Howell pre-1936 games by file-season, date order ----------
const howell = new Map(); // `${file}|${se}` -> rows
for (const r of H.rows) {
  if (r.se > 1935) continue;
  const k = `${r.file}|${r.se}`;
  (howell.get(k) ?? howell.set(k, []).get(k)).push(r);
}
for (const rs of howell.values()) rs.sort((a, b) => a.date.localeCompare(b.date));

// ---------- payload decode ----------
const g = P.games;
const N = g.se.length;
const teams = P.teams;
const ord = { h: new Int32Array(N), a: new Int32Array(N) };
{
  const cnt = new Map();
  const nx = (ti, se) => { const k = `${ti}|${se}`; const n = cnt.get(k) ?? 0; cnt.set(k, n + 1); return n; };
  for (let i = 0; i < N; i++) { ord.h[i] = nx(g.hi[i], g.se[i]); ord.a[i] = nx(g.ai[i], g.se[i]); }
}
const stintAt = (ti, se, o) => {
  let cur = null;
  for (const s of teams[ti].hc ?? []) { if (s[1] < se || (s[1] === se && s[2] <= o)) cur = s; else break; }
  return cur;
};
const isMajor = (ti, se) => (teams[ti].major ?? []).some(([a, b]) => a <= se && se <= b);
const epDate = (ep) => new Date(ep * 86400000).toISOString().slice(0, 10);
const POST = 4;
// side rows: one per team per game
const sideRows = []; // { se, date, team, opp, res, pf, pa, post, oppRank, coach, major }
for (let i = 0; i < N; i++) {
  for (const side of ['h', 'a']) {
    const ti = side === 'h' ? g.hi[i] : g.ai[i];
    const oi = side === 'h' ? g.ai[i] : g.hi[i];
    const pf = side === 'h' ? g.hs[i] : g.as[i];
    const pa = side === 'h' ? g.as[i] : g.hs[i];
    const st = stintAt(ti, g.se[i], ord[side][i]);
    sideRows.push({
      src: 'payload', se: g.se[i], date: epDate(g.ep[i]), team: teams[ti].id, opp: teams[oi]?.id, res: pf > pa ? 'W' : pf < pa ? 'L' : 'T', pf, pa,
      post: !!(g.fl[i] & POST), oppRank: side === 'h' ? g.ar[i] : g.hr[i], coach: st ? P.coachNames[st[0]] : null, interim: st ? !!st[3] : false, major: isMajor(ti, g.se[i]),
    });
  }
}
// payload coach coverage per decade for major team-seasons
const payCov = {};
for (const r of sideRows) {
  if (!r.major || r.se > 2025) continue;
  const d = `${Math.floor(r.se / 10) * 10}s`;
  const c = (payCov[d] ??= { majorTeamGames: 0, noCoach: 0, noCoachTeams: new Set() });
  c.majorTeamGames++;
  if (!r.coach) { c.noCoach++; c.noCoachTeams.add(r.team); }
}
say('payload: major-team game sides with no coach of record, per decade');
for (const [d, c] of Object.entries(payCov)) say(`  ${d} ${c.noCoach} of ${c.majorTeamGames} (${[...c.noCoachTeams].slice(0, 8).join(', ')}${c.noCoachTeams.size > 8 ? ', ...' : ''})`);

// pre-1936 side rows with navbox coach
const preRows = [];
const preCov = {};
for (const [k, rs] of howell) {
  const [file, se] = [k.split('|')[0], +k.split('|')[1]];
  const c = navCoach(file, se);
  const d = `${Math.floor(se / 10) * 10}s`;
  const pc = (preCov[d] ??= { one: 0, co: 0, multi: 0, noCoach: 0, hole: 0, noNavbox: 0 });
  pc[c.kind] += rs.length;
  for (const r of rs) {
    preRows.push({ src: 'howell', se, date: r.date, team: file, opp: r.oppFile ?? `x:${r.oppName}`, res: r.res, pf: r.pf, pa: r.pa, post: /bowl/i.test(r.note), oppRank: -1, coach: c.kind === 'one' || c.kind === 'co' ? c.targets.join(' & ') : null, coachTargets: c.targets ?? [], coachKind: c.kind, major: true });
  }
}
say('pre-1936 team-game rows by navbox coach kind, per decade (one = one coach named, co = co-coaches, multi = 2+ entries that season, unresolved)');
for (const [d, c] of Object.entries(preCov).sort()) say(`  ${d} ${JSON.stringify(c)}`);

// ---------- coach identity: Wikipedia page title -> payload name ----------
const PAYNAME = { 'Gil Dobie': 'Gilmour Dobie', 'Robert Neyland': 'Bob Neyland', 'Brian Kelly (American football coach)': 'Brian Kelly' };
const payName = (t) => PAYNAME[t] ?? t;
function career(title, { onlyMajor = true } = {}) {
  const pre = preRows.filter((r) => r.coachTargets.includes(title));
  const post = sideRows.filter((r) => r.coach === payName(title) && r.se <= 2026 && (!onlyMajor || r.major));
  return [...pre, ...post].sort((a, b) => a.date.localeCompare(b.date));
}
const rec = (rows) => rows.reduce((a, r) => (a[r.res === 'W' ? 0 : r.res === 'L' ? 1 : 2]++, a), [0, 0, 0]);
const fmt = (r) => r.join('-');

// ---------- Wikipedia sample table ----------
const HOWELL_FILE = { 'Notre Dame Fighting Irish football': 'NotreDame', 'Michigan Wolverines football': 'Michigan', 'Chicago Maroons football': 'Chicago', 'Carlisle Indians football': 'Carlisle', 'Cornell Big Red football': 'Cornell', 'Georgia Bulldogs football': 'Georgia', 'Pittsburgh Panthers football': 'Pittsburgh', 'Stanford Cardinal football': 'Stanford', 'Temple Owls football': 'Temple', 'Yale Bulldogs football': 'Yale', 'Nebraska Cornhuskers football': 'Nebraska', 'Kansas Jayhawks football': 'Kansas', 'Washington Huskies football': 'Washington', 'Navy Midshipmen football': 'Navy', 'Boston College Eagles football': 'BostonCollege', 'Auburn Tigers football': 'Auburn', 'Clemson Tigers football': 'Clemson', 'Georgia Tech Yellow Jackets football': 'GeorgiaTech', 'Penn Quakers football': 'Pennsylvania', 'Washington & Jefferson Presidents football': 'WashingtonJefferson', 'Rice Owls football': 'Rice', 'Illinois Fighting Illini football': 'Illinois', 'Tennessee Volunteers football': 'Tennessee', 'Minnesota Golden Gophers football': 'Minnesota', 'Princeton Tigers football': 'Princeton', 'Lafayette Leopards football': 'Lafayette', 'Alabama Crimson Tide football': 'Alabama', 'Duke Blue Devils football': 'Duke', 'Pacific Tigers football': 'Pacific', 'Akron Zips football': 'Akron', 'Oberlin Yeomen football': 'Oberlin', 'Springfield Pride football': 'Springfield', 'San Jose State Spartans football': 'SanJoseState', 'Wesleyan Battling Bishops football': 'OhioWesleyan', 'North Dakota State Bison football': 'NorthDakotaState' };
const PAY_ID = { 'Notre Dame Fighting Irish football': 'notre-dame', 'Michigan Wolverines football': 'michigan', 'Chicago Maroons football': 'chicago', 'Cornell Big Red football': 'cornell', 'Pittsburgh Panthers football': 'pittsburgh', 'Stanford Cardinal football': 'stanford', 'Temple Owls football': 'temple', 'Boston College Eagles football': 'boston-college', 'Illinois Fighting Illini football': 'illinois', 'Tennessee Volunteers football': 'tennessee', 'Minnesota Golden Gophers football': 'minnesota', 'Princeton Tigers football': 'princeton', 'Alabama Crimson Tide football': 'alabama', 'Duke Blue Devils football': 'duke', 'Pacific Tigers football': 'pacific', 'Maryland Terrapins football': 'maryland', 'Kentucky Wildcats football': 'kentucky', 'Texas A&M Aggies football': 'texas-am', 'Oklahoma Sooners football': 'oklahoma', 'Penn State Nittany Lions football': 'penn-state', 'Samford Bulldogs football': 'samford', 'West Virginia Mountaineers football': 'west-virginia', 'Florida State Seminoles football': 'florida-state', 'Toledo Rockets football': 'toledo', 'Michigan State Spartans football': 'michigan-state', 'LSU Tigers football': 'lsu', 'Nebraska Cornhuskers football': 'nebraska', 'Denison Big Red football': 'denison', 'Miami RedHawks football': 'miami-oh', 'Ohio State Buckeyes football': 'ohio-state', 'Georgia Bulldogs football': 'georgia', 'Bowling Green Falcons football': 'bowling-green', 'Utah Utes football': 'utah', 'Florida Gators football': 'florida', 'Grand Valley State Lakers football': 'grand-valley-state', 'Central Michigan Chippewas': 'central-michigan', 'Cincinnati Bearcats football': 'cincinnati', 'Youngstown State Penguins football': 'youngstown-state', 'Lafayette Leopards football': 'lafayette', 'Navy Midshipmen football': 'navy', 'Washington Huskies football': 'washington', 'Kansas Jayhawks football': 'kansas', 'Yale Bulldogs football': 'yale', 'Rice Owls football': 'rice', 'Auburn Tigers football': 'auburn', 'Clemson Tigers football': 'clemson', 'Georgia Tech Yellow Jackets football': 'georgia-tech', 'Penn Quakers football': 'pennsylvania' };
const paySeason = (id, se) => sideRows.filter((r) => r.team === id && r.se === se);
const sample = [];
for (const [title, w] of Object.entries(WIKI)) {
  const rows = [];
  for (const s of w.seasons) {
    if (!s.year || !s.overall) { rows.push({ ...s, status: 'unparsed' }); continue; }
    let status, computed = null, note = '';
    if (s.year <= 1935) {
      const file = HOWELL_FILE[s.school];
      const hr = file ? howell.get(`${file}|${s.year}`) : null;
      if (!hr) status = 'offSpine';
      else {
        const nc = navCoach(file, s.year);
        computed = rec(hr);
        if (!(nc.targets ?? []).includes(title)) note = `navbox: ${nc.kind} ${JSON.stringify(nc.targets ?? [])}`;
        status = fmt(computed) === fmt(s.overall) ? 'match' : 'mismatch';
      }
    } else {
      const id = PAY_ID[s.school];
      const ti = teams.findIndex((t) => t.id === id);
      if (ti < 0 || !isMajor(ti, s.year)) status = 'offSpine';
      else {
        const mine = paySeason(id, s.year).filter((r) => r.coach === payName(title));
        computed = rec(mine);
        const all = rec(paySeason(id, s.year));
        if (fmt(all) !== fmt(computed)) note = `team season ${fmt(all)}; coaches ${[...new Set(paySeason(id, s.year).map((r) => r.coach))].join(' / ')}`;
        status = fmt(computed) === fmt(s.overall) ? 'match' : 'mismatch';
      }
    }
    rows.push({ year: s.year, school: s.school, wiki: fmt(s.overall), computed: computed && fmt(computed), status, note, raw: s.overallRaw });
  }
  const c = { match: 0, mismatch: 0, offSpine: 0, unparsed: 0 };
  for (const r of rows) c[r.status]++;
  const car = career(title);
  sample.push({ coach: title, url: w.url, revid: w.revid, infobox: w.infoboxOverall && fmt(w.infoboxOverall), infoboxRaw: w.infoboxOverallRaw, tableSeasonSum: fmt(w.seasonSum), computedMajorCareer: fmt(rec(car)), computedSeasons: [...new Set(car.map((r) => `${r.team}|${r.se}`))].length, counts: c, mismatches: rows.filter((r) => r.status === 'mismatch'), offSpine: rows.filter((r) => r.status === 'offSpine').map((r) => `${r.year} ${r.school.replace(/ football$/, '')} ${r.wiki}`), offSpineRecord: fmt(rows.filter((r) => r.status === 'offSpine').reduce((a, r) => { const [x, y, z] = r.wiki.split('-').map(Number); return [a[0] + x, a[1] + y, a[2] + z]; }, [0, 0, 0])) });
}
say('\nWikipedia sample: per coach');
for (const s of sample) say(`  ${s.coach}: infobox ${s.infobox} | table season sum ${s.tableSeasonSum} | computed (major seasons) ${s.computedMajorCareer} | seasons match ${s.counts.match}, mismatch ${s.counts.mismatch}, off-spine ${s.counts.offSpine} (${s.offSpineRecord}), unparsed ${s.counts.unparsed}`);
say('\nWikipedia sample: every mismatched season');
for (const s of sample) for (const m of s.mismatches) say(`  ${s.coach} ${m.year} ${m.school.replace(/ football$/, '')}: wiki ${m.wiki} computed ${m.computed} ${m.note}`);

// ---------- known-answer checks ----------
const ka = [];
const KA = (name, published, computed, why) => { ka.push({ name, published, computed, why }); say(`  ${name}: published ${published} | computed ${computed}${why ? ' | ' + why : ''}`); };
const longestWinRun = (rows) => { let best = 0, cur = 0, end = null, bestEnd = null; for (const r of rows) { if (r.res === 'W') { cur++; if (cur > best) { best = cur; bestEnd = r.date; } } else cur = 0; } return [best, bestEnd]; };
const byTeam = (rows, team) => rows.filter((r) => r.team === team);
const firstN = (rows, n) => rows.slice(0, n);
const inSeasons = (rows, a, b) => rows.filter((r) => r.se >= a && r.se <= b);
const wikiRows = (title, pred) => WIKI[title].seasons.filter(pred).reduce((a, s) => [a[0] + s.overall[0], a[1] + s.overall[1], a[2] + s.overall[2]], [0, 0, 0]);
say('\nKnown-answer checks');
{
  const c = career('Knute Rockne');
  KA('Knute Rockne career', '105-12-5', fmt(rec(c)), `Howell Notre Dame 1918-1930 (${c.length} games) x navbox`);
}
{
  const c = career('Bud Wilkinson');
  const [n, end] = longestWinRun(c);
  KA('Bud Wilkinson longest win streak', '47 (1953-1957)', `${n} (ended after ${end})`, 'payload, Oklahoma, ties break a run');
  KA('Bud Wilkinson career', '145-29-4', fmt(rec(c)), '');
}
{
  const c = career('Bear Bryant');
  KA('Bear Bryant career wins', '323 (all four schools, bowls included)', `${rec(c)[0]} (${fmt(rec(c))})`, 'payload: Maryland 1945, Kentucky, Texas A&M, Alabama');
  KA('Bear Bryant at Alabama', '232-46-9', fmt(rec(byTeam(c, 'alabama'))), '');
  KA('Bear Bryant career excluding bowls', '-', fmt(rec(c.filter((r) => !r.post))), 'scope check');
}
{
  const c = career('Joe Paterno');
  const vac = inSeasons(c, 1998, 2011).filter((r) => r.res === 'W').length;
  KA('Joe Paterno on-field wins', '409 (restored 2015)', `${rec(c)[0]} (${fmt(rec(c))})`, '');
  KA('Joe Paterno with 1998-2011 wins vacated (2012-2015 official)', '298', `${rec(c)[0] - vac} (vacating ${vac} wins 1998-2011)`, '');
}
{
  const c = career('Bobby Bowden');
  const samford = wikiRows('Bobby Bowden', (s) => /Samford/.test(s.school));
  const vacated2006_07 = 12;
  KA('Bobby Bowden major-college on-field', '-', fmt(rec(c)), `payload: WVU 1970-75 ${fmt(rec(byTeam(c, 'west-virginia')))}, FSU 1976-2009 ${fmt(rec(byTeam(c, 'florida-state')))}`);
  KA('Bobby Bowden all on-field (+ Howard/Samford from Wikipedia rows)', '389', `${rec(c)[0] + samford[0]} (Samford ${fmt(samford)})`, '');
  KA('Bobby Bowden official (12 FSU wins 2006-07 vacated)', '377', `${rec(c)[0] + samford[0] - vacated2006_07}`, 'the 12 vacated games are a researched list; the payload has no vacated flag');
}
{
  const c = career('Nick Saban');
  const on = rec(c);
  KA('Nick Saban career on-field (through 2023, his last season)', '292-71-1 official', fmt(on), 'payload: Toledo 1990, Michigan State, LSU, Alabama');
  KA('Nick Saban official (2007 Alabama: 5 wins vacated)', '292', `${on[0] - 5}`, 'the 5 vacated 2007 wins are a ruling, not in the payload');
  const a = rec(byTeam(c, 'alabama'));
  KA('Nick Saban at Alabama on-field / official', '206-29 official (201? per vacated)', `${fmt(a)} on-field, ${a[0] - 5} wins official`, '');
}
{
  const c = byTeam(career('Kirby Smart'), 'georgia');
  KA('Kirby Smart first 100 games at Georgia', '- (CFBD/ESPN: n/a)', `${fmt(rec(firstN(c, 100)))} (game 100 on ${c[99]?.date})`, `${c.length} Georgia games in the payload through 2026 to date, record ${fmt(rec(c))}`);
}
{
  const c = byTeam(career('Urban Meyer'), 'ohio-state');
  KA('Urban Meyer first 24 games at Ohio State', '24-0', fmt(rec(firstN(c, 24))), `game 24 on ${c[23]?.date}`);
  KA('Urban Meyer major career', '187-32', fmt(rec(career('Urban Meyer'))), 'Bowling Green, Utah (2004 Fiesta credited to Meyer by coach-overrides), Florida, Ohio State');
}
{
  const c = inSeasons(byTeam(career('Fielding H. Yost'), 'Michigan'), 1901, 1905);
  KA('Fielding Yost Michigan 1901-05', '55-1-1', fmt(rec(c)), 'Howell Michigan x navbox');
  KA('Fielding Yost career, major seasons only', '198-35-12', fmt(rec(career('Fielding H. Yost'))), 'Ohio Wesleyan 1897 and Stanford 1900 (and San Jose Normal) are not on the spine');
}
{
  KA('Tom Osborne career', '255-49-3', fmt(rec(career('Tom Osborne'))), '');
  const c = byTeam(career('Woody Hayes'), 'ohio-state');
  KA('Woody Hayes at Ohio State', '205-61-10', fmt(rec(c)), '');
  KA('Woody Hayes career major only', '238-72-10 incl. Denison', fmt(rec(career('Woody Hayes'))), 'Denison 1946-48 is off the spine; Miami (OH) 1949-50 is it major then?');
}
{
  const c = career('Brian Kelly (American football coach)');
  const gv = wikiRows('Brian Kelly (American football coach)', (s) => /Grand Valley/.test(s.school));
  KA('Brian Kelly major career (payload)', '-', fmt(rec(c)), `+ Grand Valley State ${fmt(gv)} (Wikipedia rows) = ${rec(c)[0] + gv[0]} wins on-field; ND vacated 21 (2012-13)`);
  const t = career('Jim Tressel');
  const ys = wikiRows('Jim Tressel', (s) => /Youngstown/.test(s.school));
  KA('Jim Tressel major career (payload)', '-', fmt(rec(t)), `+ Youngstown State ${fmt(ys)}; Ohio State vacated the 2010 season (12 wins)`);
}
// co-head / acting coach examples from the payload
const seasonCoaches = (id, se) => paySeason(id, se).map((r) => `${r.date} ${r.res} ${r.coach}${r.interim ? ' (interim)' : ''}`);
say('\nMichigan 2023 as the payload credits it:'); for (const s of seasonCoaches('michigan', 2023)) say('  ' + s);
say('Utah 2004 last games:'); for (const s of seasonCoaches('utah', 2004).slice(-2)) say('  ' + s);
// rank fields demo
{
  const c = career('Nick Saban');
  const t10 = c.filter((r) => r.oppRank >= 1 && r.oppRank <= 10);
  const unknown = career('Frank Leahy').filter((r) => r.oppRank === -1).length;
  say(`\nvs AP top 10 (payload oppRank 1-10): Saban ${fmt(rec(t10))} in ${t10.length}; Leahy games with no poll in effect (-1): ${unknown}`);
}

// ---------- team ledger: the move-up rule over pre-1936 ----------
{
  // the payload's spans are byconf's with wartime gaps bridged (fbs-span-bridges.json); use them where a file maps
  const AL = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
  const alias = new Map([...Object.entries(AL.aliases).map(([k, v]) => [slug(k), v]), ...Object.keys(AL.canonical).map((k) => [slug(k), k])]);
  const payMajor = new Map(teams.map((t) => [t.id, t.major]));
  const spans = {};
  let bridged = 0;
  for (const [file, ss] of Object.entries(H.spans)) {
    const id = alias.get(slug(H.names[file] ?? H.spanNames[file] ?? file));
    const pm = id && payMajor.get(id);
    if (pm && pm.length) { spans[file] = pm; if (pm.length !== ss.length) bridged++; } else spans[file] = ss;
  }
  say(`(spans: ${bridged} files take the payload's bridged spans)`);
  let teamsLate = 0, gamesLost = 0; const ex = [];
  for (const [file, ss] of Object.entries(spans)) {
    const latest = ss.at(-1)[0];
    const pre = H.rows.filter((r) => r.file === file && r.se <= 1935 && r.se < latest).length;
    if (pre) { teamsLate++; gamesLost += pre; ex.length < 12 && ex.push(`${file} latest move-up ${latest}: ${pre} pre-1936 games fall outside`); }
  }
  const allPre = H.rows.filter((r) => r.se <= 1935).length;
  say(`\nTeam ledger under Streak King's latest-move-up rule: ${teamsLate} teams lose pre-1936 games, ${gamesLost} of ${allPre} pre-1936 team-game rows fall before their team's latest move up`);
  for (const e of ex) say('  ' + e);
}

fs.writeFileSync(path.join(OUT, 'join.json'), JSON.stringify({ sample, knownAnswers: ka, payloadCoachCoverage: Object.fromEntries(Object.entries(payCov).map(([d, c]) => [d, { ...c, noCoachTeams: [...c.noCoachTeams] }])), preCoachKinds: preCov }, null, 1));
fs.writeFileSync(path.join(OUT, 'join.txt'), log.join('\n') + '\n');
