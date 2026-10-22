"""Fetch one ESPN summary per season 2004-2026 (game with the most categories in
the player box file), plus 2003 probes. 1.5 s between requests. Saves whole bodies.
usage: python3 -I fetch_espn_summaries.py <downloads_dir> [extra_ids_2003 ...]
"""
import csv, sys, os, time, json, subprocess, collections

D = sys.argv[1]
extra = sys.argv[2:]
out = os.path.join(D, 'espn_summary'); os.makedirs(out, exist_ok=True)
URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event={}'

def pick(year):
    cats = collections.defaultdict(set)
    with open(os.path.join(D, 'pb', f'player_box_{year}.csv'), newline='') as f:
        for r in csv.DictReader(f):
            cats[r['game_id']].add(r['category'])
    # most categories; tie -> smallest id for determinism
    return sorted(cats.items(), key=lambda kv: (-len(kv[1]), kv[0]))[0][0]

def get(eid, tag):
    path = os.path.join(out, f'summary_{tag}_{eid}.json')
    if os.path.exists(path):
        return path, 'cached'
    # python.org build lacks system CA bundle; use curl (whole body saved)
    r = subprocess.run(['curl', '-sS', '--compressed', '-A', 'Mozilla/5.0 probe', '-o', path,
                        '-w', '%{http_code}', URL.format(eid)], capture_output=True, text=True)
    status = r.stdout.strip()
    time.sleep(1.5)
    return path, status

log = []
for eid in extra:
    p, s = get(eid, '2003')
    log.append(('2003', eid, s))
for y in range(2004, 2027):
    eid = pick(y)
    p, s = get(eid, str(y))
    log.append((str(y), eid, s))
for row in log: print(*row)
