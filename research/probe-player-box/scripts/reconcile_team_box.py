"""Within-game completeness: sum of player rows vs espn_cfb_team_box totals per (game, team).
usage: python3 -I reconcile_team_box.py <downloads_dir> <out_json>
"""
import csv, sys, os, json, collections
D, OUT = sys.argv[1], sys.argv[2]

def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def is_team_row(r):
    a = r['athlete_id'].strip()
    return (not a.lstrip('-').isdigit()) or int(a) <= 0

res = {}
for y in range(2004, 2027):
    agg = collections.defaultdict(lambda: collections.Counter())
    with open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f):
            k = (r['game_id'], r['team_id']); c = r['category']; tr = is_team_row(r)
            if c == 'passing':
                agg[k]['pass'] += num(r['passingYards']) or 0
                ca = r['completions/passingAttempts'].split('/')
                if len(ca) == 2 and ca[1].isdigit(): agg[k]['att'] += int(ca[1])
                if tr: agg[k]['pass_teamrow'] += num(r['passingYards']) or 0
            elif c == 'rushing':
                agg[k]['rush'] += num(r['rushingYards']) or 0
                agg[k]['car'] += num(r['rushingAttempts']) or 0
                if tr: agg[k]['rush_teamrow'] += num(r['rushingYards']) or 0
                agg[k]['neg_rush_rows'] += (num(r['rushingYards']) or 0) < 0
            elif c == 'receiving':
                agg[k]['rec'] += num(r['receivingYards']) or 0
    tb = {}
    with open(os.path.join(D, 'tb', f'team_box_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f): tb[(r['game_id'], r['team_id'])] = r
    n = 0; m = collections.Counter(); absd = collections.Counter(); ex = collections.defaultdict(list); diffs = collections.defaultdict(list)
    for k, t in tb.items():
        if k not in agg: m['team_box_side_without_player_rows'] += 1; continue
        a = agg[k]; n += 1
        tp, tr_, tra = num(t['netPassingYards']), num(t['rushingYards']), num(t['rushingAttempts'])
        ca = t['completionAttempts'].split('/'); tatt = int(ca[1]) if len(ca) == 2 and ca[1].isdigit() else None
        checks = {'pass_eq_netPassing': (a['pass'], tp), 'rush_eq_team_rush': (a['rush'], tr_),
                  'rush_excl_teamrows_eq_team_rush': (a['rush'] - a['rush_teamrow'], tr_),
                  'car_eq_team_att': (a['car'], tra), 'att_eq_team_att': (a['att'], tatt),
                  'rec_eq_pass': (a['rec'], a['pass'])}
        for name, (x, yv) in checks.items():
            if yv is None: m[name + '_na'] += 1; continue
            if abs(x - yv) < 0.5: m[name] += 1
            else:
                absd[name] += abs(x - yv); diffs[name].append(yv - x)
                if len(ex[name]) < 3: ex[name].append([k[0], k[1], x, yv])
    res[str(y)] = {'team_sides_compared': n, 'match_counts': dict(m),
                   'match_share': {k: round(v / n, 4) for k, v in m.items() if not k.endswith('_na') and k != 'team_box_side_without_player_rows'},
                   'mean_abs_diff_when_mismatch': {k: round(absd[k] / max(1, n - m[k]), 1) for k in absd},
                   'examples': ex,
                   'mismatch_profile_team_minus_players': {k: {'n': len(v), 'positive': sum(d > 0 for d in v),
                        'abs_le_5': sum(abs(d) <= 5 for d in v), 'abs_le_20': sum(abs(d) <= 20 for d in v),
                        'abs_gt_50': sum(abs(d) > 50 for d in v), 'median': sorted(v)[len(v)//2]} for k, v in diffs.items()}}
    print(y, json.dumps({'n': n, 'share': res[str(y)]['match_share'], 'no_rows': m['team_box_side_without_player_rows']}))
    print('   profile', json.dumps({k: v for k, v in res[str(y)]['mismatch_profile_team_minus_players'].items() if k in ('pass_eq_netPassing', 'rush_eq_team_rush', 'rec_eq_pass', 'car_eq_team_att')}))
json.dump(res, open(OUT, 'w'), indent=1)
