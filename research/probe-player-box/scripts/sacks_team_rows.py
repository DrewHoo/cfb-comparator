"""Where do sacks and kneels live? Team-row profile and QB rushing lines.
usage: python3 -I sacks_team_rows.py <downloads_dir>
"""
import csv, sys, os, collections
D = sys.argv[1]
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0
for y in (2010, 2016, 2019, 2025):
    tr = [r for r in csv.DictReader(open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline=''))
          if r['category'] == 'rushing']
    team = [r for r in tr if not r['athlete_id'].isdigit()]
    neg = sum(num(r['rushingYards']) < 0 for r in team)
    print(y, 'team rushing rows', len(team), 'negative-yard', neg, 'yards', sum(num(r['rushingYards']) for r in team),
          'carries', sum(num(r['rushingAttempts']) for r in team))
    for name in ('Joe Burrow', 'Case Keenum', 'Bryce Young', 'Fernando Mendoza', 'Cam Ward'):
        rr = [r for r in tr if r['athlete_name'] == name]
        if rr:
            print('   ', name, 'rush car', sum(num(r['rushingAttempts']) for r in rr), 'yds', sum(num(r['rushingYards']) for r in rr),
                  'games w/ negative rushing', sum(num(r['rushingYards']) < 0 for r in rr))
