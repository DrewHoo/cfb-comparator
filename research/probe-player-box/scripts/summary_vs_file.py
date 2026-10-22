"""Fidelity: for each season's probe game, ESPN summary athlete lines vs player_box rows.
usage: python3 -I summary_vs_file.py <downloads_dir> <stat_layout_raw_json>
"""
import csv, sys, os, json, glob, collections
D, L = sys.argv[1], sys.argv[2]
lay = json.load(open(L))
COL = {'passing': ['completions/passingAttempts', 'passingYards'], 'rushing': ['rushingAttempts', 'rushingYards'],
       'receiving': ['receptions', 'receivingYards']}
for y, v in sorted(lay.items()):
    eid = v['probe_event_id']
    j = json.load(open(glob.glob(os.path.join(D, 'espn_summary', f'summary_{y}_{eid}.json'))[0]))
    s = {}
    for t in j['boxscore']['players']:
        for st in t['statistics']:
            for a in st.get('athletes', []):
                s[(t['team']['id'], a['athlete']['id'], st['name'])] = a['stats']
    f = {}
    for r in csv.DictReader(open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='')):
        if r['game_id'] == eid: f[(r['team_id'], r['athlete_id'], r['category'])] = r
    mism = 0
    for k, stats in s.items():
        if k in f and k[2] in COL:
            if [f[k][c] for c in COL[k[2]]] != stats[:2]: mism += 1
    print(y, eid, 'summary lines', len(s), 'file rows', len(f), 'summary-only', len(set(s) - set(f)),
          'file-only', len(set(f) - set(s)), 'value mismatches (first two stats, pass/rush/rec)', mism,
          'summary-only cats', dict(collections.Counter(k[2] for k in set(s) - set(f))),
          'file-only cats', dict(collections.Counter(k[2] for k in set(f) - set(s))))
