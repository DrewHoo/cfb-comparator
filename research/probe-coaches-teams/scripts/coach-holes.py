# Coach-of-record coverage per Howell major team-season, from two sources:
#   (a) Wikipedia "<Program> football coach navbox" templates (every season 1869-2025)
#   (b) CFBD /coaches rows (the local 1936-2026 pull; the 1869-1935 pull was
#       refused with HTTP 429 "Monthly call quota exceeded", see fetch-cfbd-1.txt)
# and a cross-check of (a) against (b) where both exist.
#   python3 -I coach-holes.py <howell-all.json> <navboxes.json> <navbox-map.json> <cfbd-coaches-from-1936.json> <name-aliases.json> <out.json>
import json, re, sys, unicodedata, collections

H = json.load(open(sys.argv[1])); NB = json.load(open(sys.argv[2])); MAP = json.load(open(sys.argv[3]))
CF = json.load(open(sys.argv[4])); AL = json.load(open(sys.argv[5])); OUT = sys.argv[6]
DASH = '–—-'

def slug(s):
    s = unicodedata.normalize('NFD', str(s)); s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', s.lower().replace('&', ' and '))
alias = {slug(k): v for k, v in AL['aliases'].items()}
alias.update({slug(k): k for k in AL['canonical']})

# --- Howell major team-seasons (a team page carries only its major seasons) ---
seasons = collections.defaultdict(set)   # file -> {season}
names = collections.defaultdict(set)
games = collections.Counter()
for r in H['rows']:
    if r['se'] <= 2025:
        seasons[r['file']].add(r['se']); names[r['file']].add(r['name']); games[(r['file'], r['se'])] += 1
file_id = {}
for f, ns in names.items():
    for n in sorted(ns, key=len):
        if slug(n) in alias: file_id[f] = alias[slug(n)]; break

# --- navbox parse ---
def parse_years(s):
    ys = set()
    for part in s.split(','):
        part = part.strip()
        m = re.match(r'^(\d{4})\s*[' + DASH + r']\s*(\d{4}|\d{2})?\s*$', part)
        if m:
            a = int(m.group(1)); b = m.group(2)
            b = (int(b) if len(b) == 4 else int(str(a)[:2] + b)) if b else 2026
            ys.update(range(a, b + 1)); continue
        m = re.match(r'^(\d{4})$', part)
        if m: ys.add(int(m.group(1)))
    return ys
def parse_navbox(w):
    w = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>|<!--.*?-->', '', w, flags=re.S)
    items = []
    for line in w.split('\n'):
        line = line.strip()
        if not line.startswith('*'): continue
        m = re.search(r'\(([^()]*\d{4}[^()]*)\)\s*(?:\}\})?\s*$', line)
        if not m: continue
        ys = parse_years(m.group(1))
        if not ys: continue
        body = line[1:m.start()]
        coaches = [ (x.split('|')[-1]).strip() for x in re.findall(r'\[\[([^\]]+)\]\]', body)]
        nocoach = bool(re.search(r'no coach', body, re.I))
        interim = '#' in body or 'interim' in body.lower()
        items.append({'coaches': coaches, 'noCoach': nocoach and not coaches, 'interim': interim, 'years': sorted(ys), 'raw': line[:120]})
    return items
nav = {}
for f, t in MAP.items():
    if t and t in NB: nav[f] = parse_navbox(NB[t]['wikitext'])

# --- CFBD rows by canonical team id ---
cf = collections.defaultdict(list)  # (id, year) -> [names]
cf_school_unmatched = collections.Counter()
for c in CF:
    nm = f"{c['firstName']} {c['lastName']}".strip()
    for s in c.get('seasons') or []:
        if not s.get('school') or not s.get('year'): continue
        tid = alias.get(slug(s['school']))
        if not tid: cf_school_unmatched[s['school']] += 1; continue
        cf[(tid, s['year'])].append({'n': nm, 'last': c['lastName'], 'g': s.get('games'), 'w': s.get('wins'), 'l': s.get('losses'), 't': s.get('ties')})

def decade(y): return f'{y // 10 * 10}s'
per = collections.defaultdict(lambda: collections.Counter())
holes_examples = collections.defaultdict(list)
cross = collections.Counter(); cross_mis = []
for f, ss in seasons.items():
    items = nav.get(f)
    for y in sorted(ss):
        d = per[decade(y)]
        d['teamSeasons'] += 1; d['games'] += games[(f, y)]
        if items is None:
            d['navboxMissing'] += 1
        else:
            cover = [it for it in items if y in it['years']]
            named = [c for it in cover if not it['noCoach'] for c in it['coaches']]
            if not cover: d['navboxHole'] += 1; d['navboxHoleGames'] += games[(f, y)]; len(holes_examples[decade(y)]) < 8 and holes_examples[decade(y)].append(f'{f} {y}')
            elif not named: d['navboxNoCoach'] += 1; d['navboxNoCoachGames'] += games[(f, y)]
            else:
                d['navboxNamed'] += 1
                if len([it for it in cover if not it['noCoach']]) > 1: d['navboxMultiEntry'] += 1
                if any(len(it['coaches']) > 1 for it in cover): d['navboxCoCoachEntry'] += 1
        if y >= 1936:
            tid = file_id.get(f)
            rows = cf.get((tid, y)) if tid else None
            if rows: d['cfbdRow'] += 1
            else: d['cfbdHole'] += 1; d['cfbdHoleGames'] += games[(f, y)]
            if rows and items is not None:
                cover = [c for it in items if y in it['years'] and not it['noCoach'] for c in it['coaches']]
                if cover:
                    lasts_nb = {slug(c.split()[-1]) for c in cover}
                    lasts_cf = {slug(r['last'].split()[-1]) for r in rows if r['g']}
                    if lasts_nb & lasts_cf: cross['agree'] += 1
                    else:
                        cross['disagree'] += 1
                        len(cross_mis) < 25 and cross_mis.append(f"{f} {y}: navbox {cover} vs cfbd {[r['n'] for r in rows]}")
for d in per.values():
    d['navboxCovered'] = d['navboxNamed'] + d['navboxNoCoach']
pre = collections.Counter()
for k, d in per.items():
    if int(k[:4]) < 1936: pre.update(d)
out = {
    'note': 'Team-seasons are Howell major team-seasons (a season block on a team page), 1869-2025. navboxHole = navbox exists but names nobody for that season; navboxNoCoach = the navbox says "No coach" for it; navboxMissing = the team has no navbox (or the map has none). cfbd* only from 1936 (no pre-1936 pull).',
    'perDecade': {k: dict(per[k]) for k in sorted(per)}, 'pre1936Totals': dict(pre),
    'navboxHoleExamples': holes_examples, 'navboxVsCfbd1936on': dict(cross), 'navboxVsCfbdDisagreements': cross_mis,
    'filesWithoutNavbox': sorted(f for f in seasons if f not in nav and min(seasons[f]) <= 1935),
    'cfbdSchoolsUnmatched': dict(cf_school_unmatched.most_common(15)),
    'navboxItems': nav,
}
json.dump(out, open(OUT, 'w'), indent=1)
cols = ['teamSeasons', 'games', 'navboxNamed', 'navboxNoCoach', 'navboxHole', 'navboxMissing', 'navboxMultiEntry', 'navboxCoCoachEntry', 'cfbdRow', 'cfbdHole']
print('decade', *cols, sep='\t')
for k in sorted(per): print(k, *[per[k][c] for c in cols], sep='\t')
print('pre-1936 totals', {c: pre[c] for c in cols + ['navboxNoCoachGames', 'navboxHoleGames']})
print('navbox vs cfbd 1936+', dict(cross)); print('\n'.join(cross_mis[:25]))
print('files (pre-1936 major) without navbox:', out['filesWithoutNavbox'])
print('hole examples', json.dumps(holes_examples))
print('cfbd schools unmatched (top)', out['cfbdSchoolsUnmatched'])

# diagnostic: which files carry the CFBD holes
hf = collections.Counter()
for f, ss in seasons.items():
    for y in ss:
        if y >= 1936:
            tid = file_id.get(f)
            if not (tid and cf.get((tid, y))): hf[(f, tid)] += 1
print('cfbd hole files (file, canon id): seasons', hf.most_common(40))
