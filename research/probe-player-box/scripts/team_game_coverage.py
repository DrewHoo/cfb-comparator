"""Honest FBS team-game coverage per season: union of CFBD completed games (deduped) and ESPN
final games, vs games present in the player box. CFBD ids < 10,000,000 are CFBD-native (ESPN
never had the event).
usage: python3 -I team_game_coverage.py <downloads_dir> <out_json>
"""
import csv, sys, os, json, collections
D, OUT = sys.argv[1], sys.argv[2]
res = {}
for y in range(2004, 2027):
    cs = list(csv.DictReader(open(os.path.join(D, 'cfbd_sch', f'cfb_schedules_{y}.csv'), newline='')))
    es = {r['game_id']: r for r in csv.DictReader(open(os.path.join(D, 'sch', f'cfb_schedule_{y}.csv'), newline=''))}
    pbg = collections.defaultdict(set)
    with open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f): pbg[r['game_id']].add(r['team_id'])
    fbs = {r['home_id'] for r in cs if r['home_division'] == 'fbs'} | {r['away_id'] for r in cs if r['away_division'] == 'fbs'}
    done = [r for r in cs if r['completed'].upper() == 'TRUE']
    espn_like = {(r['start_date'][:10], r['home_id'], r['away_id']) for r in done if int(r['game_id']) >= 10_000_000}
    native = [r for r in done if int(r['game_id']) < 10_000_000 and (r['home_division'] == 'fbs' or r['away_division'] == 'fbs')]
    native_dup = [r for r in native if (r['start_date'][:10], r['home_id'], r['away_id']) in espn_like]
    native_only = [r for r in native if (r['start_date'][:10], r['home_id'], r['away_id']) not in espn_like]
    # universe of FBS team-games: ESPN final games + CFBD-native-only games
    tg = 0; tg_in = 0; miss_by_team = collections.Counter()
    for g, r in es.items():
        if r['status'] != 'STATUS_FINAL': continue
        for side in ('home_id', 'away_id'):
            if r[side] in fbs:
                tg += 1
                if r[side] in pbg.get(g, ()): tg_in += 1
                else: miss_by_team[r[side]] += 1
    for r in native_only:
        for side in ('home_id', 'away_id'):
            if r[side] in fbs: tg += 1; miss_by_team[r[side]] += 1
    res[str(y)] = {'cfbd_native_id_fbs_games': len(native), 'cfbd_native_dup_of_espn_game': len(native_dup),
                   'games_espn_never_had': len(native_only),
                   'games_espn_never_had_examples': [[r['game_id'], r['start_date'][:10], r['away_team'], r['home_team']] for r in native_only[:6]],
                   'fbs_team_games_universe': tg, 'fbs_team_games_with_rows': tg_in,
                   'fbs_team_game_coverage': round(tg_in / tg, 4) if tg else None,
                   'fbs_teams_missing_any_game': len(miss_by_team),
                   'worst_teams_missing': miss_by_team.most_common(5)}
    print(y, json.dumps({k: v for k, v in res[str(y)].items() if k != 'games_espn_never_had_examples'}))
json.dump(res, open(OUT, 'w'), indent=1)
