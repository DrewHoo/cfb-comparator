# Characterize sportsdataverse espn_cfb_coach_careers/coach_careers.csv.
#   python3 -I espn-careers.py <coach_careers.csv>
import csv, sys, collections
rows = list(csv.DictReader(open(sys.argv[1], newline='')))
print('rows', len(rows), 'columns', len(rows[0]))
print('roles', dict(collections.Counter(r['role'] for r in rows)))
fs = [int(r['first_season']) for r in rows if r['first_season']]
ls = [int(r['last_season']) for r in rows if r['last_season']]
print('first_season min/max', min(fs), max(fs), 'last_season min/max', min(ls), max(ls))
print('has any of wins/losses/ties/record column:', [c for c in rows[0] if c in ('wins','losses','ties','record','w','l')])
print('win-ish columns:', [c for c in rows[0] if 'win' in c][:12])
for name in ('Nick Saban', 'Kirby Smart', 'Urban Meyer', 'Brian Kelly'):
    for r in rows:
        if r['coach'] == name:
            print(name, {k: r[k] for k in ('role', 'teams', 'seasons', 'first_season', 'last_season', 'games', 'games_home', 'wins_home', 'games_away', 'wins_away', 'games_neutral_site', 'wins_neutral_site')})
