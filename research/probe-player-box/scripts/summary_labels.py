"""Read saved ESPN summaries; emit stat-layout.json (season -> category -> {labels, keys})
and a 2003 athletes report.
usage: python3 -I summary_labels.py <downloads_dir> <out_json>
"""
import json, sys, os, glob, re

D, OUT = sys.argv[1], sys.argv[2]
layout = {}
for p in sorted(glob.glob(os.path.join(D, 'espn_summary', 'summary_*.json'))):
    tag, eid = re.match(r'.*summary_(\d+)_(\d+)\.json', p).groups()
    j = json.load(open(p))
    bs = j.get('boxscore', {})
    players = bs.get('players', [])
    n_ath = 0; cats = {}
    for team in players:
        for st in team.get('statistics', []):
            ath = st.get('athletes', [])
            n_ath += len(ath)
            c = cats.setdefault(st['name'], {'labels': st.get('labels', []), 'keys': st.get('keys', []),
                                             'descriptions': st.get('descriptions', []), 'athlete_rows': 0,
                                             'has_totals': bool(st.get('totals'))})
            c['athlete_rows'] += len(ath)
    team_stat_labels = [s.get('label') for t in bs.get('teams', []) for s in t.get('statistics', [])][:40]
    date = j.get('header', {}).get('competitions', [{}])[0].get('date')
    if tag == '2003':
        print(f"2003 probe {eid} date={date} boxscore.players teams={len(players)} athlete_rows={n_ath} "
              f"categories={sorted(cats)} team_stat_labels={len(team_stat_labels)} code={j.get('code')}")
        continue
    layout[tag] = {'probe_event_id': eid, 'event_date': date, 'categories': cats}
    print(tag, eid, 'athlete_rows', n_ath, {k: v['labels'] for k, v in cats.items()})
json.dump(layout, open(OUT, 'w'), indent=1)
