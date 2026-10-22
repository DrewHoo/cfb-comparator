"""Per-season coverage, layout and quality probe of espn_cfb_player_box (.csv assets)
against espn_cfb_schedules and the cfbfastR-data CFBD schedules.
usage: python3 -I coverage.py <downloads_dir> <out_dir>
writes <out_dir>/coverage.json and prints a readable report.
"""
import csv, sys, os, json, gzip, random, collections, datetime
from zoneinfo import ZoneInfo

D, OUT = sys.argv[1], sys.argv[2]
ET = ZoneInfo('America/New_York')
SEASONS = range(2004, 2027)

# category -> columns that belong to it (named layout)
CATCOLS = {
    'passing': ['completions/passingAttempts', 'passingYards', 'yardsPerPassAttempt', 'passingTouchdowns', 'interceptions', 'adjQBR'],
    'rushing': ['rushingAttempts', 'rushingYards', 'yardsPerRushAttempt', 'rushingTouchdowns', 'longRushing'],
    'receiving': ['receptions', 'receivingYards', 'yardsPerReception', 'receivingTouchdowns', 'longReception'],
    'fumbles': ['fumbles', 'fumblesLost', 'fumblesRecovered'],
    'defensive': ['totalTackles', 'soloTackles', 'sacks', 'tacklesForLoss', 'passesDefended', 'hurries', 'defensiveTouchdowns'],
    'interceptions': ['interceptions', 'interceptionYards', 'interceptionTouchdowns'],
    'kickReturns': ['kickReturns', 'kickReturnYards', 'yardsPerKickReturn', 'longKickReturn', 'kickReturnTouchdowns'],
    'puntReturns': ['puntReturns', 'puntReturnYards', 'yardsPerPuntReturn', 'longPuntReturn', 'puntReturnTouchdowns'],
    'kicking': ['fieldGoalsMade/fieldGoalAttempts', 'fieldGoalPct', 'longFieldGoalMade', 'extraPointsMade/extraPointAttempts', 'totalKickingPoints'],
    'punting': ['punts', 'puntYards', 'grossAvgPuntYards', 'touchbacks', 'puntsInside20', 'longPunt'],
}
PRIMARY = {'passing': 'passingYards', 'rushing': 'rushingYards', 'receiving': 'receivingYards', 'fumbles': 'fumbles',
           'defensive': 'totalTackles', 'interceptions': 'interceptions', 'kickReturns': 'kickReturns',
           'puntReturns': 'puntReturns', 'kicking': 'fieldGoalsMade/fieldGoalAttempts', 'punting': 'punts'}
STATN = ['stat_1', 'stat_2', 'stat_3', 'stat_4', 'stat_5']

def blank(v):
    return v is None or v.strip() in ('', 'NA', '--', '-')

def is_team_row(r):
    aid = r['athlete_id'].strip()
    return (not aid.lstrip('-').isdigit()) or int(aid) <= 0 or r['athlete_name'].strip().lower().endswith('team')

def load_espn_sched(y):
    g = {}
    with open(os.path.join(D, 'sch', f'cfb_schedule_{y}.csv'), newline='') as f:
        for r in csv.DictReader(f):
            g[r['game_id']] = r
    return g

def load_cfbd_sched(y):
    g = {}
    p = os.path.join(D, 'cfbd_sch', f'cfb_schedules_{y}.csv')
    with open(p, newline='') as f:
        for r in csv.DictReader(f):
            g[r['game_id']] = r
    return g

def cls(h, a, fbs):
    n = (h in fbs) + (a in fbs)
    return {2: 'fbs_fbs', 1: 'fbs_fcs', 0: 'other'}[n]

result = {}
for y in SEASONS:
    R = {}
    es = load_espn_sched(y)
    cs = load_cfbd_sched(y)
    fbs = set()
    for r in cs.values():
        if r['home_division'] == 'fbs': fbs.add(r['home_id'])
        if r['away_division'] == 'fbs': fbs.add(r['away_id'])
    R['fbs_teams_in_cfbd'] = len(fbs)
    es_final = {k: v for k, v in es.items() if v['status'] == 'STATUS_FINAL'}
    R['espn_sched_games'] = len(es); R['espn_sched_final'] = len(es_final)
    R['espn_sched_status'] = dict(collections.Counter(v['status'] for v in es.values()))
    R['espn_sched_final_by_class'] = dict(collections.Counter(cls(v['home_id'], v['away_id'], fbs) for v in es_final.values()))
    R['espn_sched_final_postseason'] = sum(1 for v in es_final.values() if v['season_type'] == '3')
    cs_done = {k: v for k, v in cs.items() if v['completed'].upper() == 'TRUE'}
    cc = collections.Counter()
    for v in cs_done.values():
        d = (v['home_division'] == 'fbs') + (v['away_division'] == 'fbs')
        cc[{2: 'fbs_fbs', 1: 'fbs_fcs', 0: 'other'}[d]] += 1
    R['cfbd_sched_completed_by_class'] = dict(cc)
    R['cfbd_sched_season_types'] = dict(collections.Counter(v['season_type'] for v in cs_done.values()))
    cfbd_fbs_ids = {k for k, v in cs_done.items() if 'fbs' in (v['home_division'], v['away_division'])}
    espn_fbs_ids = {k for k, v in es_final.items() if cls(v['home_id'], v['away_id'], fbs) != 'other'}
    R['fbs_games_espn_not_cfbd'] = len(espn_fbs_ids - cfbd_fbs_ids)
    R['fbs_games_cfbd_not_espn'] = len(cfbd_fbs_ids - espn_fbs_ids)

    # player box
    rows = []
    with open(os.path.join(D, 'pb', f'player_box_{y}.csv'), newline='') as f:
        rd = csv.DictReader(f); header = rd.fieldnames
        for r in rd: rows.append(r)
    R['pb_rows'] = len(rows)
    R['pb_columns'] = len(header)
    R['pb_has_statN'] = [c for c in header if c.startswith('stat_')]
    R['pb_missing_named_cols'] = sorted({c for cs_ in CATCOLS.values() for c in cs_} - set(header))
    games = collections.defaultdict(lambda: collections.defaultdict(set))  # gid -> team -> cats
    cat_rows = collections.Counter(); cat_blank_primary = collections.Counter(); cat_all_blank = collections.Counter()
    team_rows = collections.Counter(); nonnum = collections.Counter()
    dupkey = collections.Counter(); dupfull = collections.Counter()
    for r in rows:
        c = r['category']; cat_rows[c] += 1
        games[r['game_id']][r['team_id']].add(c)
        if is_team_row(r): team_rows[c] += 1
        cols = [x for x in CATCOLS.get(c, []) if x in r]
        if PRIMARY.get(c) in r and blank(r[PRIMARY[c]]): cat_blank_primary[c] += 1
        if cols and all(blank(r[x]) for x in cols) and all(blank(r.get(s)) for s in STATN): cat_all_blank[c] += 1
        for x in cols:
            v = r[x].strip()
            if v and v not in ('NA',):
                try: float(v.replace('/', '').replace('-', '0', 1) if '/' in v else v)
                except ValueError: nonnum[(c, x, v)] += 1
        dupkey[(r['game_id'], r['team_id'], r['athlete_id'], c)] += 1
        dupfull[tuple(r.values())] += 1
    R['pb_games'] = len(games)
    R['pb_categories'] = dict(cat_rows)
    R['pb_category_game_coverage'] = {c: sum(1 for g in games.values() if any(c in s for s in g.values())) for c in cat_rows}
    R['pb_blank_primary_rate'] = {c: round(cat_blank_primary[c] / cat_rows[c], 4) for c in cat_rows}
    R['pb_all_blank_rate'] = {c: round(cat_all_blank[c] / cat_rows[c], 4) for c in cat_rows}
    R['pb_team_rows'] = dict(team_rows)
    R['pb_nonnumeric_values_top'] = [list(k) + [n] for k, n in nonnum.most_common(8)]
    R['pb_dup_game_team_athlete_category'] = sum(n - 1 for n in dupkey.values() if n > 1)
    R['pb_dup_identical_rows'] = sum(n - 1 for n in dupfull.values() if n > 1)
    dup_examples = [list(k) for k, n in dupkey.items() if n > 1][:3]
    R['pb_dup_examples'] = dup_examples
    # games vs schedules
    pbg = set(games)
    R['pb_games_not_in_espn_sched'] = len(pbg - set(es))
    R['pb_games_not_final_in_espn_sched'] = len(pbg - set(es_final))
    byc = collections.Counter(); miss = collections.Counter(); sides = collections.Counter()
    for gid, v in es_final.items():
        k = cls(v['home_id'], v['away_id'], fbs)
        if k == 'other': continue
        byc[k] += 1
        if gid not in games: miss[k] += 1; continue
        t = games[gid]
        for side in ('home_id', 'away_id'):
            tid = v[side]
            div = 'fbs' if tid in fbs else 'nonfbs'
            sides[(k, div, 'present' if tid in t else 'missing')] += 1
    R['espn_final_fbs_games_missing_from_pb'] = dict(miss)
    R['espn_final_fbs_games_missing_ids'] = sorted(g for g, v in es_final.items()
                                                   if cls(v['home_id'], v['away_id'], fbs) != 'other' and g not in games)[:12]
    cm = collections.Counter(); cmx = []
    for gid, v in cs_done.items():
        d = (v['home_division'] == 'fbs') + (v['away_division'] == 'fbs')
        if d == 0: continue
        k = 'fbs_fbs' if d == 2 else 'fbs_fcs'
        if gid not in games:
            cm[k] += 1
            if len(cmx) < 6: cmx.append([gid, v['start_date'][:10], v['away_team'], v['home_team'], v['away_division'], v['home_division']])
    R['cfbd_completed_fbs_games_missing_from_pb'] = dict(cm)
    R['cfbd_missing_examples'] = cmx
    R['espn_final_fbs_games_coverage'] = {k: round(1 - miss[k] / byc[k], 4) for k in byc}
    R['side_presence'] = {'|'.join(k): n for k, n in sorted(sides.items())}
    R['pb_postseason_games'] = sum(1 for g in pbg if es.get(g, {}).get('season_type') == '3')
    # sample 20 FBS teams
    team_games = collections.defaultdict(list)
    for gid, v in es_final.items():
        for side in ('home_id', 'away_id'):
            if v[side] in fbs: team_games[v[side]].append(gid)
    pool = sorted(t for t in team_games)
    samp = random.Random(y).sample(pool, min(20, len(pool)))
    srows = []
    for t in sorted(samp, key=int):
        gl = team_games[t]
        n_pass = sum(1 for g in gl if 'passing' in games.get(g, {}).get(t, set()))
        n_any = sum(1 for g in gl if t in games.get(g, {}))
        srows.append([t, len(gl), n_any, n_pass])
    R['sample20'] = srows
    R['sample20_totals'] = {'sched_games': sum(r[1] for r in srows), 'with_any_row': sum(r[2] for r in srows),
                            'with_passing_row': sum(r[3] for r in srows)}
    # date join
    fields_ok = collections.Counter()
    utc_trap = 0; utc_trap_ex = []
    for g in pbg:
        v = es.get(g)
        if not v: continue
        for fld in ('game_date', 'home_id', 'away_id', 'home_score', 'away_score', 'neutral_site'):
            if not blank(v.get(fld)): fields_ok[fld] += 1
        try:
            dt = datetime.datetime.strptime(v['game_date'], '%Y-%m-%dT%H:%MZ').replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            fields_ok['date_unparsed'] += 1; continue
        if dt.date() != dt.astimezone(ET).date():
            utc_trap += 1
            if len(utc_trap_ex) < 2: utc_trap_ex.append([g, v['game_date'], str(dt.astimezone(ET)), v['away_team'], v['home_team']])
    R['pb_games_sched_field_filled'] = dict(fields_ok)
    R['pb_games_utc_date_ne_et_date'] = utc_trap
    R['utc_trap_examples'] = utc_trap_ex
    R['neutral_site_true_share'] = round(sum(1 for g in pbg if es.get(g, {}).get('neutral_site') == 'true') / max(1, len(pbg)), 4)
    # running season freshness
    if y == 2026:
        bydate = collections.defaultdict(lambda: [0, 0])
        for gid, v in es_final.items():
            dte = v['game_date'][:10]
            bydate[dte][0] += 1
            if gid in games: bydate[dte][1] += 1
        R['final_games_by_utc_date_last12'] = {k: v for k, v in sorted(bydate.items())[-12:]}
        R['pb_max_game_date'] = max(es[g]['game_date'] for g in pbg if g in es)
        R['sched_scheduled_not_final'] = sum(1 for v in es.values() if v['status'] != 'STATUS_FINAL')
    result[str(y)] = R
    print(y, json.dumps({k: R[k] for k in ['pb_rows', 'pb_games', 'espn_sched_final', 'espn_sched_final_by_class',
          'cfbd_sched_completed_by_class', 'espn_final_fbs_games_coverage', 'pb_team_rows', 'sample20_totals',
          'pb_dup_game_team_athlete_category', 'pb_dup_identical_rows', 'pb_games_utc_date_ne_et_date']}))

# stale csv.gz vs fresh csv
gzcmp = {}
for y in range(2004, 2026):
    p = os.path.join(D, 'pbgz', f'player_box_{y}.csv.gz')
    if not os.path.exists(p): continue
    with gzip.open(p, 'rt', newline='') as f:
        rd = csv.DictReader(f); hdr = rd.fieldnames
        n = 0; gids = set(); statn_cats = collections.Counter(); cats = collections.Counter()
        for r in rd:
            n += 1; gids.add(r['game_id']); cats[r['category']] += 1
            if any(not blank(r.get(s)) for s in STATN): statn_cats[r['category']] += 1
    gzcmp[str(y)] = {'rows': n, 'games': len(gids), 'has_statN_cols': any(h.startswith('stat_') for h in hdr),
                     'categories_with_data_in_statN': dict(statn_cats), 'fresh_csv_rows': result[str(y)]['pb_rows'],
                     'fresh_csv_games': result[str(y)]['pb_games']}
    print('gz', y, json.dumps(gzcmp[str(y)]))
json.dump({'seasons': result, 'stale_csv_gz_vs_csv': gzcmp}, open(os.path.join(OUT, 'coverage.json'), 'w'), indent=1)
