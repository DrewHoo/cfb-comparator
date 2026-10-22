"""Roster join and fill rates per season; game_rosters starter flag for sampled seasons.
usage: python3 -I rosters.py <downloads_dir> <out_json>
"""
import csv, gzip, sys, os, json, collections
csv.field_size_limit(10**8)
D, OUT = sys.argv[1], sys.argv[2]

def filled(v): return v is not None and v.strip() not in ('', 'NA', '-', 'Unknown', 'null', 'None')
res = {}
for y in range(2004, 2027):
    pb = {}
    with open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f):
            a = r['athlete_id']
            if a.lstrip('-').isdigit() and int(a) > 0: pb[(r['team_id'], a)] = r['category']
    pb_ids = {a for _, a in pb}
    ros = {}; ros_any = {}
    with gzip.open(os.path.join(D, 'ros', f'cfb_rosters_{y}.csv.gz'), 'rt', newline='') as f:
        for r in csv.DictReader(f):
            ros[(r['team_id'], r['athlete_id'])] = r; ros_any[r['athlete_id']] = r
    m_team = [ros[k] for k in pb if k in ros]
    m_any = [ros_any[a] for a in pb_ids if a in ros_any]
    def rate(rows, col): return round(sum(filled(r.get(col)) for r in rows) / len(rows), 4) if rows else None
    res[str(y)] = {
        'roster_rows': len(ros), 'pb_athlete_team_pairs': len(pb), 'pb_distinct_athletes': len(pb_ids),
        'share_pairs_with_roster_row_same_team': round(len(m_team) / len(pb), 4),
        'share_athletes_with_roster_row_any_team': round(len(m_any) / len(pb_ids), 4),
        'fill_among_matched': {c: rate(m_any, c) for c in ('position_abbreviation', 'date_of_birth', 'height', 'weight',
                                                            'experience_display_value', 'birth_place_city', 'cfbd_recruit_ids')},
        'position_values_top': collections.Counter(r['position_abbreviation'] for r in m_any).most_common(6),
        'experience_values': collections.Counter(r['experience_display_value'] for r in m_any).most_common(6),
        'division_values': dict(collections.Counter(r['division'] for r in ros.values())),
    }
    print(y, json.dumps({k: v for k, v in res[str(y)].items() if k not in ('position_values_top',)}))
gr = {}
for y in (2004, 2019):
    st = collections.Counter(); dnp = collections.Counter(); n = 0; pos_href_specific = 0
    with gzip.open(os.path.join(D, 'gros', f'game_rosters_{y}.csv.gz'), 'rt', newline='') as f:
        for r in csv.DictReader(f):
            n += 1; st[r['starter']] += 1; dnp[r['did_not_play']] += 1
            if not r['position_href'].rstrip('?lang=en&region=us').endswith('/positions/0'): pos_href_specific += 1
    gr[str(y)] = {'rows': n, 'starter_values': dict(st), 'did_not_play_values': dict(dnp),
                  'position_href_not_unknown_share': round(pos_href_specific / n, 4)}
    print('game_rosters', y, json.dumps(gr[str(y)]))
res['game_rosters_sample'] = gr
json.dump(res, open(OUT, 'w'), indent=1)
