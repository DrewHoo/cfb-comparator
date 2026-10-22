# Parse the saved Wikipedia coach pages: infobox overall_record, head-coach
# years/teams, and the "Head coaching record" table (CFB Yearly Record
# Subhead/Entry templates) into per-season rows.
#   python3 -I parse-wiki-coaches.py <wiki-download-dir> <out-json>
import json, os, re, sys

src, out = sys.argv[1], sys.argv[2]
DASH = r'[–—\-]'

def strip_refs(s):
    s = re.sub(r'<ref[^>]*/>', '', s)
    s = re.sub(r'<ref[^>]*>.*?</ref>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    return s

def templates(w, name):
    """Yield (start, body) of every {{name ...}} with balanced braces."""
    for m in re.finditer(r'\{\{\s*' + name + r'\b', w, re.I):
        i, depth = m.start(), 0
        j = i
        while j < len(w):
            if w.startswith('{{', j): depth += 1; j += 2; continue
            if w.startswith('}}', j):
                depth -= 1; j += 2
                if depth == 0: break
                continue
            j += 1
        yield i, w[i + 2:j - 2]

def params(body):
    # split on top-level pipes (not inside [[ ]] or {{ }})
    parts, cur, d1, d2, i = [], '', 0, 0, 0
    while i < len(body):
        if body.startswith('[[', i): d1 += 1; cur += '[['; i += 2; continue
        if body.startswith(']]', i): d1 -= 1; cur += ']]'; i += 2; continue
        if body.startswith('{{', i): d2 += 1; cur += '{{'; i += 2; continue
        if body.startswith('}}', i): d2 -= 1; cur += '}}'; i += 2; continue
        if body[i] == '|' and d1 == 0 and d2 == 0: parts.append(cur); cur = ''; i += 1; continue
        cur += body[i]; i += 1
    parts.append(cur)
    kv = {}
    for p in parts[1:]:
        if '=' in p:
            k, v = p.split('=', 1)
            kv[k.strip().lower()] = v.strip()
    return kv

def link_target(s):
    m = re.search(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', s or '')
    return (m.group(1).strip(), (m.group(2) or m.group(1)).strip()) if m else (strip_refs(s or '').strip(), strip_refs(s or '').strip())

def record(s):
    s = strip_refs(s or '')
    m = re.search(r'\{\{\s*Winning percentage\s*\|\s*(\d+)\s*\|\s*(\d+)\s*(?:\|\s*(\d+))?', s, re.I)
    if m: return [int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)]
    m = re.search(r'(\d+)\s*' + DASH + r'\s*(\d+)(?:\s*' + DASH + r'\s*(\d+))?', s)
    return [int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)] if m else None

res = {}
for f in sorted(os.listdir(src)):
    if not f.endswith('.json'): continue
    doc = json.load(open(os.path.join(src, f)))
    w = doc['wikitext']
    info = next((params(b) for _, b in templates(w, 'Infobox college coach')), None) or next((params(b) for _, b in templates(w, 'Infobox')), {})
    hc_jobs = []
    for k, v in info.items():
        m = re.match(r'coach_years(\d+)$', k)
        if m:
            team = strip_refs(info.get(f'coach_team{m.group(1)}', ''))
            hc_jobs.append({'years': strip_refs(v), 'team': link_target(team)[1] + (' ' + re.sub(r'\[\[[^\]]*\]\]', '', team).strip() if '(' in team else '')})
    # walk Subhead/Entry/Subtotal in document order
    evs = []
    for name, kind in (('CFB Yearly Record Subhead', 'sub'), ('CFB Yearly Record Entry', 'entry'), ('CFB Yearly Record Subtotal', 'subtotal'), ('CFB Yearly Record End', 'end')):
        for i, b in templates(w, name):
            evs.append((i, kind, params(b)))
    evs.sort(key=lambda e: e[0])
    seasons, subs, school, end = [], [], None, None
    for _, kind, p in evs:
        if kind == 'sub':
            school = link_target(p.get('name'))[0]
            subs.append({'school': school, 'start': p.get('startyear'), 'end': p.get('endyear'), 'conf': strip_refs(p.get('conf', ''))})
        elif kind == 'entry':
            yr = re.search(r'(\d{4})', link_target(p.get('year'))[1] or '')
            seasons.append({'year': int(yr.group(1)) if yr else None, 'school': school, 'label': link_target(p.get('name'))[1], 'seasonArticle': link_target(p.get('name'))[0], 'overall': record(p.get('overall')), 'overallRaw': strip_refs(p.get('overall', ''))[:80], 'bowl': strip_refs(p.get('bowlname', ''))[:40], 'bowlOutcome': p.get('bowloutcome', '')})
        elif kind == 'subtotal':
            subs and subs[-1].setdefault('subtotals', []).append({'name': p.get('name'), 'overall': record(p.get('overall'))})
        elif kind == 'end':
            end = record(p.get('overall'))
    rec_raw = strip_refs(info.get('overall_record', ''))
    res[doc['resolved']] = {
        'url': doc['url'], 'revid': doc['revid'], 'retrieved': doc['retrieved'],
        'infoboxOverallRaw': rec_raw[:160], 'infoboxOverall': record(rec_raw),
        'hcJobs': hc_jobs, 'subheads': subs, 'seasons': seasons, 'tableEnd': end,
        'seasonSum': [sum(s['overall'][i] for s in seasons if s['overall']) for i in range(3)],
    }
json.dump(res, open(out, 'w'), indent=1)
for k, v in res.items():
    print(f"{k:40s} infobox {v['infoboxOverall']} tableEnd {v['tableEnd']} seasonSum {v['seasonSum']} rows {len(v['seasons'])} first {min((s['year'] for s in v['seasons'] if s['year']), default=None)}")
print('schools:', sorted({s['school'] for v in res.values() for s in v['seasons']}))
