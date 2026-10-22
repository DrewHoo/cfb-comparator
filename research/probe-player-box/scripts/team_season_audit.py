"""For a team-season, list every game in the CFBD and ESPN schedules and whether the player box
has it, plus one player's line in each game.
usage: python3 -I team_season_audit.py <downloads_dir> <season> <team_id> <player name>
"""
import csv, sys, os
D, y, tid, pname = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
es = {r['game_id']: r for r in csv.DictReader(open(os.path.join(D, 'sch', f'cfb_schedule_{y}.csv'), newline=''))}
cs = {r['game_id']: r for r in csv.DictReader(open(os.path.join(D, 'cfbd_sch', f'cfb_schedules_{y}.csv'), newline=''))}
pb = [r for r in csv.DictReader(open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='')) if r['team_id'] == tid]
pbg = {r['game_id'] for r in pb}
line = {}
for r in pb:
    if r['athlete_name'] == pname:
        line.setdefault(r['game_id'], []).append(f"{r['category']}:" + ','.join(
            r[c] for c in ('completions/passingAttempts', 'passingYards', 'passingTouchdowns', 'rushingAttempts', 'rushingYards', 'rushingTouchdowns') if r.get(c)))
games = {}
for g, r in es.items():
    if tid in (r['home_id'], r['away_id']): games.setdefault((r['game_date'][:10], r['away_team'], r['home_team']), {})['espn'] = g
for g, r in cs.items():
    if tid in (r['home_id'], r['away_id']): games.setdefault((r['start_date'][:10], r['away_team'], r['home_team']), {})['cfbd'] = g
for k in sorted(games):
    v = games[k]; ids = set(v.values())
    print(k[0], f"{k[1]} @ {k[2]}", 'espn=' + v.get('espn', '-'), 'cfbd=' + v.get('cfbd', '-'),
          'in_pb=' + str(bool(ids & pbg)), ' | '.join(sum((line.get(i, []) for i in ids), [])))
