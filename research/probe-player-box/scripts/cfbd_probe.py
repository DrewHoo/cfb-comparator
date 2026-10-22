"""Probe CFBD /games/players for one week of 2001-2004. Key read from an env file,
never printed or written. 1.5 s spacing. Saves whole bodies.
usage: python3 -I cfbd_probe.py <env_file> <downloads_dir>
"""
import sys, os, time, json, subprocess

ENV, D = sys.argv[1], sys.argv[2]
key = None
for line in open(ENV):
    line = line.strip()
    if line.startswith('CFBD_API_KEY='):
        key = line.split('=', 1)[1].strip().strip('"').strip("'")
assert key, 'no key'
out = os.path.join(D, 'cfbd'); os.makedirs(out, exist_ok=True)
for year, week in [(2001, 5), (2002, 5), (2003, 5), (2004, 5)]:
    url = f'https://api.collegefootballdata.com/games/players?year={year}&week={week}&seasonType=regular'
    path = os.path.join(out, f'games_players_{year}_w{week}.json')
    # key passed via curl config on stdin so it never appears in argv / ps
    cfg = f'header = "Authorization: Bearer {key}"\n'
    r = subprocess.run(['curl', '-sS', '--compressed', '-K', '-', '-o', path, '-w', '%{http_code}', url],
                       input=cfg, capture_output=True, text=True)
    status = r.stdout.strip()
    try:
        j = json.load(open(path))
    except Exception:
        j = None
    n_games = len(j) if isinstance(j, list) else None
    n_ath = 0; cats = {}
    if isinstance(j, list):
        for g in j:
            for t in g.get('teams', []):
                for c in t.get('categories', []):
                    for ty in c.get('types', []):
                        cats.setdefault(c['name'], set()).add(ty['name'])
                        n_ath += len(ty.get('athletes', []))
    print(year, week, 'http', status, 'games', n_games, 'athlete-stat entries', n_ath,
          {k: sorted(v) for k, v in cats.items()})
    time.sleep(1.5)
