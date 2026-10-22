"""Inside-game row gaps by side class: team-games where the receiving rows fall short of the
passing rows by >20 yds, or rushing carries fall short of team-box carries by >5.
usage: python3 -I inside_game_gaps.py <downloads_dir> <out_json>
"""
import csv, sys, os, json, collections
D, OUT = sys.argv[1], sys.argv[2]
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0
res = {}
for y in range(2004, 2027):
    cs = list(csv.DictReader(open(os.path.join(D, 'cfbd_sch', f'cfb_schedules_{y}.csv'), newline='')))
    fbs = {r['home_id'] for r in cs if r['home_division'] == 'fbs'} | {r['away_id'] for r in cs if r['away_division'] == 'fbs'}
    a = collections.defaultdict(collections.Counter)
    for r in csv.DictReader(open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='')):
        k = (r['game_id'], r['team_id'])
        if r['category'] == 'passing': a[k]['pass'] += num(r['passingYards'])
        elif r['category'] == 'receiving': a[k]['rec'] += num(r['receivingYards'])
        elif r['category'] == 'rushing': a[k]['car'] += num(r['rushingAttempts'])
    tb = {(r['game_id'], r['team_id']): r for r in csv.DictReader(open(os.path.join(D, 'tb', f'team_box_{y}.csv'), newline=''))}
    c = collections.Counter()
    for k, v in a.items():
        side = 'fbs' if k[1] in fbs else 'nonfbs'
        c[side + '_sides'] += 1
        if v['pass'] - v['rec'] > 20: c[side + '_rec_short_gt20'] += 1
        t = tb.get(k)
        if t and num(t['rushingAttempts']) - v['car'] > 5: c[side + '_carries_short_gt5'] += 1
    res[str(y)] = dict(c)
    res[str(y)]['fbs_rec_short_share'] = round(c['fbs_rec_short_gt20'] / max(1, c['fbs_sides']), 4)
    res[str(y)]['nonfbs_rec_short_share'] = round(c['nonfbs_rec_short_gt20'] / max(1, c['nonfbs_sides']), 4)
    print(y, json.dumps(res[str(y)]))
json.dump(res, open(OUT, 'w'), indent=1)
