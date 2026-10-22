"""Row-key diff between the stale player_box_<y>.csv.gz (Jul 2026) and fresh .csv (Oct 2026).
usage: python3 -I gz_vs_csv.py <downloads_dir> <out_json>
"""
import csv, gzip, sys, os, json, collections
D, OUT = sys.argv[1], sys.argv[2]
k = lambda r: (r['game_id'], r['team_id'], r['athlete_id'], r['category'])
res = {}
for y in range(2004, 2026):
    gz = list(csv.DictReader(gzip.open(os.path.join(D, 'pbgz', f'player_box_{y}.csv.gz'), 'rt', newline='')))
    fr = list(csv.DictReader(open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='')))
    G = collections.Counter(map(k, gz)); F = collections.Counter(map(k, fr))
    go = list((G - F).elements()); fo = list((F - G).elements())
    gmap = {k(r): r for r in gz}
    # value diffs on shared keys for yards columns
    fmap = {k(r): r for r in fr}
    vdiff = 0
    for key in set(G) & set(F):
        a, b = gmap[key], fmap[key]
        for c in ('passingYards', 'rushingYards', 'receivingYards'):
            av = a.get(c) or (a.get('stat_2') if c == 'passingYards' and a['category'] == 'passing' else '')
            if (av or '') != (b.get(c) or ''):
                vdiff += 1; break
    res[str(y)] = {'gz_only_rows': len(go), 'gz_only_by_cat': dict(collections.Counter(x[3] for x in go)),
                   'gz_only_athletes': len({x[2] for x in go}),
                   'gz_only_yards_lost': {c: sum(float(gmap[x].get(c) or 0) for x in go) for c in ('rushingYards', 'receivingYards', 'passingYards')},
                   'fresh_only_rows': len(fo), 'fresh_only_by_cat': dict(collections.Counter(x[3] for x in fo)),
                   'shared_rows_with_yards_diff': vdiff}
    print(y, json.dumps(res[str(y)]))
json.dump(res, open(OUT, 'w'), indent=1)
