# CFBD /coaches season rows vs Howell's results, 1936-1959 (the stand-in for
# the 1869-1935 reconciliation the quota blocked): per team-season, does the
# sum of CFBD's coach rows equal Howell's season W-L-T, and for multi-coach
# seasons does some ordering of the rows tile the result sequence as prefixes
# (the idea in cfb-streak-king/scripts/lib/coach.mjs)? Also the fill rate of
# games/wins/losses/ties per decade.
#   python3 -I cfbd-vs-howell.py <howell-all.json> <cfbd-coaches-from-1936.json> <name-aliases.json> [first last]
import json, re, sys, unicodedata, collections, itertools

H = json.load(open(sys.argv[1])); CF = json.load(open(sys.argv[2])); AL = json.load(open(sys.argv[3]))
A, B = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1936, 1959)
def slug(s):
    s = unicodedata.normalize('NFD', str(s)); s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', s.lower().replace('&', ' and '))
alias = {slug(k): v for k, v in AL['aliases'].items()}; alias.update({slug(k): k for k in AL['canonical']})

res = collections.defaultdict(list)
for r in sorted(H['rows'], key=lambda r: r['date']):
    if A <= r['se'] <= B:
        tid = alias.get(slug(r['name']))
        if tid: res[(tid, r['se'])].append(r['res'])
rows = collections.defaultdict(list)
fill = collections.Counter()
for c in CF:
    for s in c.get('seasons') or []:
        y = s.get('year')
        if not y: continue
        d = f'{y // 10 * 10}s'
        fill[(d, 'rows')] += 1
        for k in ('games', 'wins', 'losses', 'ties'):
            if s.get(k) is not None: fill[(d, k)] += 1
        if A <= y <= B:
            tid = alias.get(slug(s.get('school') or ''))
            if tid: rows[(tid, y)].append({'n': f"{c['firstName']} {c['lastName']}", 'g': s.get('games') or 0, 'w': s.get('wins') or 0, 'l': s.get('losses') or 0, 't': s.get('ties') or 0})

def tiles(results, rs):
    for perm in itertools.permutations(rs):
        i, ok = 0, True
        for c in perm:
            w = l = t = 0
            while i < len(results) and (w, l, t) != (c['w'], c['l'], c['t']):
                x = results[i]; w += x == 'W'; l += x == 'L'; t += x == 'T'; i += 1
                if w > c['w'] or l > c['l'] or t > c['t']: break
            if (w, l, t) != (c['w'], c['l'], c['t']): ok = False; break
        if ok: return [p['n'] for p in perm], len(results) - i
    return None, None

stat = collections.Counter(); ex = collections.defaultdict(list)
for k, results in res.items():
    rs = [r for r in rows.get(k, []) if r['g'] > 0]
    hw = (results.count('W'), results.count('L'), results.count('T'))
    if not rs: stat['noCfbdRow'] += 1; continue
    cw = tuple(sum(r[x] for r in rs) for x in ('w', 'l', 't'))
    kind = 'single' if len(rs) == 1 else 'multi'
    if cw == hw: stat[f'{kind}:sumExact'] += 1
    else:
        stat[f'{kind}:sumDiffers'] += 1
        len(ex[kind]) < 10 and ex[kind].append(f"{k[0]} {k[1]}: howell {'-'.join(map(str, hw))} cfbd {'-'.join(map(str, cw))} {[r['n'] for r in rs]}")
    if kind == 'multi':
        order, left = tiles(results, rs)
        stat['multi:prefixTiles' if order else 'multi:prefixFails'] += 1
        if order and left: stat['multi:prefixTilesWithTrailingGames'] += 1
print(f'CFBD vs Howell, {A}-{B}, Howell major team-seasons with a canonical id: {len(res)}')
for k in sorted(stat): print(f'  {k}: {stat[k]}')
for k, v in ex.items():
    print(f'  {k} examples:'); [print('    ' + e) for e in v]
print('CFBD fill rate per decade (rows; games, wins, losses, ties non-null):')
for d in sorted({d for d, _ in fill}):
    print(f"  {d}: rows {fill[(d, 'rows')]}, games {fill[(d, 'games')]}, wins {fill[(d, 'wins')]}, losses {fill[(d, 'losses')]}, ties {fill[(d, 'ties')]}")
