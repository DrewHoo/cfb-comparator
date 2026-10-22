"""Asset sizes per season from the saved GitHub release-asset listings, plus local gzip of fresh csv.
usage: python3 -I sizes.py <downloads_dir> <out_json>
"""
import json, sys, os, glob, re, gzip, collections
D, OUT = sys.argv[1], sys.argv[2]
res = collections.defaultdict(dict)
for tag in ('espn_cfb_player_box', 'espn_cfb_schedules', 'espn_cfb_rosters', 'espn_cfb_game_rosters', 'espn_cfb_team_box'):
    assets = []
    for p in sorted(glob.glob(os.path.join(D, 'gh', f'assets_{tag}_p*.json'))):
        assets += json.load(open(p))
    for a in assets:
        m = re.match(r'.*_(\d{4})\.(csv\.gz|csv|parquet|rds)$', a['name'])
        if m: res[tag].setdefault(m.group(1), {})[m.group(2)] = a['size']
tot = {}
for tag, by in res.items():
    tot[tag] = {ext: sum(v.get(ext, 0) for v in by.values()) for ext in ('csv', 'csv.gz', 'parquet')}
# gzip -6 of the fresh player box csv (what a committed ledger source would weigh)
local = {}
for p in sorted(glob.glob(os.path.join(D, 'pb', 'player_box_*.csv'))):
    y = re.search(r'(\d{4})', os.path.basename(p)).group(1)
    local[y] = len(gzip.compress(open(p, 'rb').read(), 6))
tot['player_box_fresh_csv_gzip6_local'] = sum(local.values())
out = {'by_tag_season': res, 'totals_bytes': tot, 'player_box_fresh_csv_gzip6_by_season': local}
json.dump(out, open(OUT, 'w'), indent=1)
print(json.dumps(tot, indent=1))
print('pb csv by season', {y: v.get('csv') for y, v in sorted(res['espn_cfb_player_box'].items())})
print('pb gzip6 by season', local)
