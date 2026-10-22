"""Known-answer checks and athlete-id stability, computed from the fresh player_box .csv files.
usage: python3 -I known_answers.py <downloads_dir> <out_json>
"""
import csv, sys, os, json, re, collections
D, OUT = sys.argv[1], sys.argv[2]

def norm(s): return re.sub(r"[^a-z]", "", s.lower())
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0

# (label, name, seasons, stat column, category, published, kind)
CHECKS = [
    ('Matt Leinart 2004 passing yards', 'Matt Leinart', [2004], 'passingYards', 'passing', 3322, 'sum'),
    ('Matt Leinart 2004 passing TDs', 'Matt Leinart', [2004], 'passingTouchdowns', 'passing', 33, 'sum'),
    ('Reggie Bush 2005 rushing yards', 'Reggie Bush', [2005], 'rushingYards', 'rushing', 1740, 'sum'),
    ('Colt Brennan 2006 passing TDs', 'Colt Brennan', [2006], 'passingTouchdowns', 'passing', 58, 'sum'),
    ('Tim Tebow 2007 rushing TDs', 'Tim Tebow', [2007], 'rushingTouchdowns', 'rushing', 23, 'sum'),
    ('Tim Tebow 2007 passing TDs', 'Tim Tebow', [2007], 'passingTouchdowns', 'passing', 32, 'sum'),
    ('Joe Burrow 2019 passing yards', 'Joe Burrow', [2019], 'passingYards', 'passing', 5671, 'sum'),
    ('Joe Burrow 2019 passing TDs', 'Joe Burrow', [2019], 'passingTouchdowns', 'passing', 60, 'sum'),
    ('Melvin Gordon 2014 rushing yards', 'Melvin Gordon', [2014], 'rushingYards', 'rushing', 2587, 'sum'),
    ('Melvin Gordon 2014 best game rushing', 'Melvin Gordon', [2014], 'rushingYards', 'rushing', 408, 'max'),
    ('Samaje Perine 2014 best game rushing', 'Samaje Perine', [2014], 'rushingYards', 'rushing', 427, 'max'),
    ("Ja'Marr Chase 2019 receiving yards", "Ja'Marr Chase", [2019], 'receivingYards', 'receiving', 1780, 'sum'),
    ('Ashton Jeanty 2024 rushing yards', 'Ashton Jeanty', [2024], 'rushingYards', 'rushing', 2601, 'sum'),
    ('Case Keenum career passing yards 2007-2011', 'Case Keenum', [2007, 2008, 2009, 2010, 2011], 'passingYards', 'passing', 19217, 'sum'),
    ('DeVonta Smith 2020 receiving yards', 'DeVonta Smith', [2020], 'receivingYards', 'receiving', 1856, 'sum'),
]
needed = collections.defaultdict(set)
for c in CHECKS:
    for y in c[2]: needed[y].add(norm(c[1]))
for y in range(2015, 2020): needed[y].add(norm('Joe Burrow'))

sched = {}
rows = collections.defaultdict(list)  # (season, normname) -> rows
dup_name_team = {}
for y in range(2004, 2027):
    with open(os.path.join(D, 'sch', f'cfb_schedule_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f): sched[r['game_id']] = r
    ids = collections.defaultdict(set)
    with open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f):
            aid = r['athlete_id']
            if aid.lstrip('-').isdigit() and int(aid) > 0:
                ids[(r['team_id'], norm(r['athlete_name']))].add(aid)
            n = norm(r['athlete_name'])
            for want in needed.get(y, ()):
                # prefix match so suffixes (III, Jr.) still join; the athlete_ids found are reported
                if n.startswith(want): rows[(y, want)].append(r)
    d = {k: sorted(v) for k, v in ids.items() if len(v) > 1 and k[1]}
    dup_name_team[str(y)] = {'name_team_pairs': len(ids), 'pairs_with_multiple_ids': len(d),
                             'examples': [[k[0], k[1], v] for k, v in list(d.items())[:4]]}

out = {'checks': [], 'id_stability': {}, 'dup_ids_same_name_team': dup_name_team}
for label, name, seasons, col, cat, pub, kind in CHECKS:
    rr = [r for y in seasons for r in rows[(y, norm(name))] if r['category'] == cat]
    idset = collections.Counter(r['athlete_id'] for r in rr)
    teams = collections.Counter(r['team_id'] for r in rr)
    per_game = collections.Counter()
    for r in rr: per_game[r['game_id']] += num(r[col])
    dup_games = sum(1 for g, n in collections.Counter(r['game_id'] for r in rr).items() if n > 1)
    post = sum(num(r[col]) for r in rr if sched.get(r['game_id'], {}).get('season_type') == '3')
    val = (max(per_game.values()) if per_game else 0) if kind == 'max' else sum(per_game.values())
    best = max(per_game, key=per_game.get) if per_game else None
    by_season = collections.Counter()
    for r in rr: by_season[r['season']] += num(r[col])
    rec = {'label': label, 'file_value': val, 'published': pub, 'diff_file_minus_published': val - pub,
           'games': len(per_game), 'postseason_part': post, 'athlete_ids': dict(idset), 'team_ids': dict(teams),
           'names_matched': sorted({r['athlete_name'] for r in rr}), 'games_with_duplicate_rows': dup_games, 'by_season': dict(by_season)}
    if kind == 'max' and best:
        s = sched.get(best, {})
        rec['best_game'] = [best, s.get('game_date'), s.get('away_team'), s.get('home_team')]
    out['checks'].append(rec)
    print(json.dumps(rec))

for name, seasons in [('Case Keenum', range(2007, 2012)), ('Joe Burrow', range(2015, 2020))]:
    st = {}
    for y in seasons:
        rr = rows[(y, norm(name))]
        st[str(y)] = {'ids': sorted({r['athlete_id'] for r in rr}), 'teams': sorted({r['team_id'] for r in rr}), 'rows': len(rr)}
    out['id_stability'][name] = st
    print(name, json.dumps(st))
print('dup ids', json.dumps({y: (v['pairs_with_multiple_ids'], v['name_team_pairs']) for y, v in dup_name_team.items()}))
json.dump(out, open(OUT, 'w'), indent=1)
