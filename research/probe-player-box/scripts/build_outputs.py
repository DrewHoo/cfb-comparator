"""Assemble stat-layout.json and coverage.json for the ledger builder, and markdown tables for the README.
usage: python3 -I build_outputs.py <out_dir> <research_dir>
"""
import json, sys, os
O, R = sys.argv[1], sys.argv[2]
ld = lambda n: json.load(open(os.path.join(O, n)))
raw = ld('stat-layout.json'); cov = ld('coverage.json'); tgc = ld('team_game_coverage.json')
rec = ld('reconcile_team_box.json'); gap = ld('inside_game_gaps.json'); gz = ld('gz_vs_csv.json')
ros = ld('rosters.json'); siz = ld('sizes.json'); ka = ld('known_answers.json')

layout = {'_meta': {
    'authority': 'ESPN site summary API boxscore.players[].statistics[] for one game per season (saved under downloads/espn_summary/)',
    'how_to_read': 'season -> category -> labels in ESPN order. _columns gives the player_box .csv column for each position (ESPN keys). '
                   'The fresh .csv assets carry these named columns in every season; only the stale .csv.gz assets have stat_1..stat_5.',
    'probe_events': {y: v['probe_event_id'] for y, v in raw.items()},
    'label_key_mismatch': {y: {c: [len(d['labels']), len(d['keys'])] for c, d in v['categories'].items() if len(d['labels']) != len(d['keys'])}
                           for y, v in raw.items() if any(len(d['labels']) != len(d['keys']) for d in v['categories'].values())},
    '_columns': {c: d['keys'] for c, d in raw['2025']['categories'].items()},
}}
for y, v in sorted(raw.items()):
    layout[y] = {c: d['labels'] for c, d in v['categories'].items()}
json.dump(layout, open(os.path.join(R, 'stat-layout.json'), 'w'), indent=1)

seasons = {}
for y in map(str, range(2004, 2027)):
    c = cov['seasons'][y]; t = tgc[y]; r = rec[y]; g = gap[y]; ro = ros[y]
    seasons[y] = {
        'pb_rows': c['pb_rows'], 'pb_games': c['pb_games'], 'pb_postseason_games': c['pb_postseason_games'],
        'espn_sched_final_by_class': c['espn_sched_final_by_class'], 'cfbd_sched_completed_by_class': c['cfbd_sched_completed_by_class'],
        'cfbd_sched_season_types': c['cfbd_sched_season_types'],
        'espn_final_fbs_games_missing_from_pb': c['espn_final_fbs_games_missing_from_pb'],
        'cfbd_completed_fbs_games_missing_from_pb': c['cfbd_completed_fbs_games_missing_from_pb'],
        'games_espn_never_had': t['games_espn_never_had'], 'games_espn_never_had_examples': t['games_espn_never_had_examples'],
        'fbs_team_games_universe': t['fbs_team_games_universe'], 'fbs_team_games_with_rows': t['fbs_team_games_with_rows'],
        'fbs_team_game_coverage': t['fbs_team_game_coverage'], 'worst_teams_missing': t['worst_teams_missing'],
        'sample20_fbs_teams': {'rows_[team_id, sched_games, games_with_any_row, games_with_passing_row]': c['sample20'], 'totals': c['sample20_totals']},
        'side_presence_in_present_games': c['side_presence'],
        'categories_rows': c['pb_categories'], 'category_game_coverage': c['pb_category_game_coverage'],
        'category_blank_primary_rate': c['pb_blank_primary_rate'], 'category_all_blank_rate': c['pb_all_blank_rate'],
        'nonnumeric_values_top': c['pb_nonnumeric_values_top'],
        'team_rows_by_category': c['pb_team_rows'], 'dup_rows_same_game_team_athlete_category': c['pb_dup_game_team_athlete_category'],
        'inside_game': {'fbs_sides_receiving_short_of_passing_gt20': g.get('fbs_rec_short_gt20', 0), 'fbs_sides': g.get('fbs_sides', 0),
                        'fbs_rec_short_share': g['fbs_rec_short_share'], 'nonfbs_rec_short_share': g['nonfbs_rec_short_share'],
                        'fbs_sides_carries_short_of_team_box_gt5': g.get('fbs_carries_short_gt5', 0)},
        'team_box_reconcile_match_share': r['match_share'],
        'schedule_join': {'pb_games_not_in_espn_sched': c['pb_games_not_in_espn_sched'], 'fields_filled': c['pb_games_sched_field_filled'],
                          'utc_date_ne_et_date_games': c['pb_games_utc_date_ne_et_date'], 'neutral_site_true_share': c['neutral_site_true_share']},
        'rosters': {k: ro[k] for k in ('share_pairs_with_roster_row_same_team', 'share_athletes_with_roster_row_any_team', 'fill_among_matched', 'experience_values')},
        'stale_csv_gz_diff': gz.get(y), 'stale_csv_gz_layout': cov['stale_csv_gz_vs_csv'].get(y),
        'bytes': siz['by_tag_season']['espn_cfb_player_box'].get(y), 'bytes_gzip6_fresh_csv': siz['player_box_fresh_csv_gzip6_by_season'].get(y),
    }
    if y == '2026':
        seasons[y]['running_season'] = {k: c[k] for k in ('final_games_by_utc_date_last12', 'pb_max_game_date', 'sched_scheduled_not_final')}
out = {'seasons': seasons, 'totals_bytes': siz['totals_bytes'], 'known_answers': ka['checks'], 'id_stability': ka['id_stability'],
       'dup_ids_same_name_team': ka['dup_ids_same_name_team'], 'game_rosters_sample': ros['game_rosters_sample']}
json.dump(out, open(os.path.join(R, 'coverage.json'), 'w'), indent=1)

# markdown tables
L = []
L.append('| season | pb games | ESPN final FBS-FBS / FBS-FCS | CFBD completed FBS-FBS / FBS-FCS | ESPN-final FBS games w/o rows | games ESPN never had | FBS team-game coverage | sample-20 sched / any row / passing row | FBS sides rec short >20 yds | FBS sides carries short >5 | defensive games | kickReturns games | neutral true | pb bytes (csv) |')
L.append('|' + '---|' * 15)
for y, s in seasons.items():
    e = s['espn_sched_final_by_class']; cf = s['cfbd_sched_completed_by_class']; m = s['espn_final_fbs_games_missing_from_pb']
    st = s['sample20_fbs_teams']['totals']; ig = s['inside_game']; cg = s['category_game_coverage']
    L.append(f"| {y} | {s['pb_games']} | {e.get('fbs_fbs',0)} / {e.get('fbs_fcs',0)} | {cf.get('fbs_fbs',0)} / {cf.get('fbs_fcs',0)} | "
             f"{m.get('fbs_fbs',0)+m.get('fbs_fcs',0)} | {s['games_espn_never_had']} | {s['fbs_team_game_coverage']:.4f} | "
             f"{st['sched_games']} / {st['with_any_row']} / {st['with_passing_row']} | {ig['fbs_sides_receiving_short_of_passing_gt20']} ({ig['fbs_rec_short_share']:.1%}) | "
             f"{ig['fbs_sides_carries_short_of_team_box_gt5']} | {cg.get('defensive',0)} | {cg.get('kickReturns',0)} | {s['schedule_join']['neutral_site_true_share']:.3f} | {s['bytes'].get('csv')} |")
L.append('')
L.append('| season | rows | team rows | categories present (rows) | blank-primary max | adjQBR "--" rows | dup keys | UTC date != ET date |')
L.append('|' + '---|' * 8)
for y, s in seasons.items():
    tr = sum(s['team_rows_by_category'].values())
    qbr = sum(v[3] for v in s['nonnumeric_values_top'] if v[1] == 'adjQBR')
    cats = ', '.join(f"{k} {v}" for k, v in s['categories_rows'].items())
    L.append(f"| {y} | {s['pb_rows']} | {tr} | {cats} | {max(s['category_blank_primary_rate'].values())} | {qbr} | {s['dup_rows_same_game_team_athlete_category']} | {s['schedule_join']['utc_date_ne_et_date_games']} |")
L.append('')
L.append('| season | athletes | roster row (same team) | position | birth date | height | weight | class (experience) | Senior share of matched |')
L.append('|' + '---|' * 9)
for y, s in seasons.items():
    ro = s['rosters']; f = ro['fill_among_matched']; ev = dict(ro['experience_values']); tot = sum(ev.values())
    L.append(f"| {y} | {ros[y]['pb_distinct_athletes']} | {ro['share_pairs_with_roster_row_same_team']:.3f} | {f['position_abbreviation']:.3f} | {f['date_of_birth']:.3f} | "
             f"{f['height']:.3f} | {f['weight']:.3f} | {f['experience_display_value']:.3f} | {ev.get('Senior',0)/tot:.2f} |")
L.append('')
L.append('| check | file | published | diff | games in file | of which postseason | athlete_id |')
L.append('|---|---|---|---|---|---|---|')
for k in ka['checks']:
    L.append(f"| {k['label']} | {k['file_value']:g} | {k['published']} | {k['diff_file_minus_published']:+g} | {k['games']} | {k['postseason_part']:g} | {', '.join(k['athlete_ids'])} |")
L.append('')
L.append('| season | pass = team netPassing | rush (incl. Team rows) = team rush | rush excl. Team rows = team rush | carries = team carries | receiving = passing |')
L.append('|---|---|---|---|---|---|')
for y in map(str, range(2004, 2027)):
    ms = rec[y]['match_share']
    L.append(f"| {y} | {ms.get('pass_eq_netPassing',0):.3f} | {ms.get('rush_eq_team_rush',0):.3f} | {ms.get('rush_excl_teamrows_eq_team_rush',0):.3f} | {ms.get('car_eq_team_att',0):.3f} | {ms.get('rec_eq_pass',0):.3f} |")
open(os.path.join(O, 'tables.md'), 'w').write('\n'.join(L) + '\n')
print('\n'.join(L))
