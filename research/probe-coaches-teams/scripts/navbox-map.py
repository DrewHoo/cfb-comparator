# Map each Howell team file with a season before 1936 to a Wikipedia
# "<Program> football coach navbox" title. Auto-match on the name prefix
# (shortest mascot wins), then MANUAL overrides; prints the map for review.
#   python3 -I navbox-map.py <howell-all.json> <navbox-titles.json> <out-map.json>
import json, re, sys

H = json.load(open(sys.argv[1]))
titles = json.load(open(sys.argv[2]))
pre = sorted({r['file'] for r in H['rows'] if r['se'] <= 1935})
names = {}
for r in H['rows']:
    if r['se'] <= 1935: names.setdefault(r['file'], set()).add(r['name'])

MANUAL = {  # Howell file -> navbox program (checked by eye against the title list)
    'Pennsylvania': 'Penn Quakers', 'Army': 'Army Black Knights', 'Navy': 'Navy Midshipmen',
    'Miami(Florida)': 'Miami Hurricanes', 'Miami(Ohio)': 'Miami RedHawks', 'SouthernCalifornia': 'USC Trojans',
    'Pittsburgh': 'Pittsburgh Panthers', 'Mississippi': 'Ole Miss Rebels', 'LouisianaState': 'LSU Tigers',
    'TexasChristian': 'TCU Horned Frogs', 'SouthernMethodist': 'SMU Mustangs', 'Brigham Young': 'BYU Cougars',
    'BrighamYoung': 'BYU Cougars', 'California': 'California Golden Bears', 'Washington': 'Washington Huskies',
    'WashingtonJefferson': 'Washington & Jefferson Presidents', 'Virginia': 'Virginia Cavaliers', 'Kansas': 'Kansas Jayhawks',
    'Iowa': 'Iowa Hawkeyes', 'Indiana': 'Indiana Hoosiers', 'Michigan': 'Michigan Wolverines', 'Texas': 'Texas Longhorns',
    'Florida': 'Florida Gators', 'Georgia': 'Georgia Bulldogs', 'Oregon': 'Oregon Ducks', 'Ohio': 'Ohio Bobcats',
    'Kentucky': 'Kentucky Wildcats', 'Tennessee': 'Tennessee Volunteers', 'Oklahoma': 'Oklahoma Sooners',
    'Alabama': 'Alabama Crimson Tide', 'Arizona': 'Arizona Wildcats', 'Colorado': 'Colorado Buffaloes', 'Utah': 'Utah Utes',
    'Idaho': 'Idaho Vandals', 'Montana': 'Montana Grizzlies', 'Nevada': 'Nevada Wolf Pack', 'Wyoming': 'Wyoming Cowboys',
    'NorthCarolina': 'North Carolina Tar Heels', 'SouthCarolina': 'South Carolina Gamecocks', 'Missouri': 'Missouri Tigers',
    'Nebraska': 'Nebraska Cornhuskers', 'Illinois': 'Illinois Fighting Illini', 'Minnesota': 'Minnesota Golden Gophers',
    'Wisconsin': 'Wisconsin Badgers', 'Maryland': 'Maryland Terrapins', 'Delaware': 'Delaware Fightin\' Blue Hens',
    'Columbia': 'Columbia Lions', 'Cornell': 'Cornell Big Red', 'Brown': 'Brown Bears', 'Harvard': 'Harvard Crimson',
    'Yale': 'Yale Bulldogs', 'Princeton': 'Princeton Tigers', 'Dartmouth': 'Dartmouth Big Green', 'Rutgers': 'Rutgers Scarlet Knights',
    'Temple': 'Temple Owls', 'Boston College': 'Boston College Eagles', 'BostonCollege': 'Boston College Eagles',
    'Massachusetts': 'UMass Minutemen', 'Cornell(Iowa)': 'Cornell Rams', 'Trinity(Connecticut)': 'Trinity Bantams',
    'Union(NewYork)': 'Union Garnet Chargers', 'Southwestern(Texas)': 'Southwestern Pirates', 'Centre': 'Centre Colonels',
    'Sewanee': 'Sewanee Tigers', 'Chicago': 'Chicago Maroons', 'Carlisle': 'Carlisle Indians', 'Haskell': 'Haskell Fighting Indians',
    'Wesleyan': 'Wesleyan Cardinals', 'Williams': 'Williams Ephs', 'Amherst': 'Amherst Mammoths', 'Tufts': 'Tufts Jumbos',
    'MIT': 'MIT Engineers', 'Stevens': 'Stevens Ducks', 'WorcesterTech': 'WPI Engineers', 'Springfield': 'Springfield Pride',
    'Samford': 'Samford Bulldogs', 'Birmingham-Southern': 'Birmingham–Southern Panthers', 'SpringHill': 'Spring Hill Badgers',
    'MississippiCollege': 'Mississippi College Choctaws', 'Oglethorpe': 'Oglethorpe Stormy Petrels', 'Newberry': 'Newberry Wolves',
    'Cumberland': 'Cumberland Phoenix', 'Maryville': 'Maryville Scots', 'Millsaps': 'Millsaps Majors', 'Nashville': 'Nashville Garnet and Blue',
    'TennesseeMedical': 'University of Tennessee Medical Department', 'Phillips': 'Phillips Haymakers', 'Regis': 'Regis Rangers',
    'Whitman': 'Whitman Fighting Missionaries', 'Beloit': 'Beloit Buccaneers', 'Coe': 'Coe Kohawks', 'Drury': 'Drury Panthers',
    'Knox': 'Knox Prairie Fire', 'LakeForest': 'Lake Forest Foresters', 'Lawrence': 'Lawrence Vikings', 'Lombard': 'Lombard Olive',
    'Simpson': 'Simpson Storm', 'Wabash': 'Wabash Little Giants', 'Butler': 'Butler Bulldogs', 'Bates': 'Bates Bobcats',
    'Bowdoin': 'Bowdoin Polar Bears', 'Colby': 'Colby Mules', 'Hamilton': 'Hamilton Continentals', 'Maine': 'Maine Black Bears',
    'NewHampshire': 'New Hampshire Wildcats', 'Vermont': 'Vermont Catamounts', 'Dickinson': 'Dickinson Red Devils',
    'FranklinMarshall': 'Franklin & Marshall Diplomats', 'Haverford': 'Haverford Fords', 'Swarthmore': 'Swarthmore Garnet Tide',
    'WestVirginiaWesleyan': 'West Virginia Wesleyan Bobcats', 'Lafayette': 'Lafayette Leopards', 'Lehigh': 'Lehigh Mountain Hawks',
    'Bucknell': 'Bucknell Bison', 'HolyCross': 'Holy Cross Crusaders', 'Georgetown': 'Georgetown Hoyas', 'Fordham': 'Fordham Rams',
    'Villanova': 'Villanova Wildcats', 'Detroit': 'Detroit Titans', 'Marquette': 'Marquette Golden Avalanche', 'Duquesne': 'Duquesne Dukes',
    'StMarys(California)': "Saint Mary's Gaels", 'SantaClara': 'Santa Clara Broncos', 'SanFrancisco': 'San Francisco Dons',
    'Gonzaga': 'Gonzaga Bulldogs', 'Creighton': 'Creighton Bluejays', 'Drake': 'Drake Bulldogs', 'Grinnell': 'Grinnell Pioneers',
    'Washington(Missouri)': 'Washington University Bears', 'SaintLouis': 'Saint Louis Billikens', 'StLouis': 'Saint Louis Billikens',
    'Centenary': 'Centenary Gentlemen', 'Furman': 'Furman Paladins', 'TheCitadel': 'The Citadel Bulldogs', 'Citadel': 'The Citadel Bulldogs',
    'WashingtonLee': 'Washington and Lee Generals', 'VirginiaMilitary': 'VMI Keydets', 'VMI': 'VMI Keydets', 'VirginiaTech': 'Virginia Tech Hokies',
    'NorthCarolinaState': 'NC State Wolfpack', 'Davidson': 'Davidson Wildcats', 'Wofford': 'Wofford Terriers', 'Tulane': 'Tulane Green Wave',
    'Vanderbilt': 'Vanderbilt Commodores', 'Mercer': 'Mercer Bears', 'Howard': 'Howard Bison', 'FortBenning': 'Fort Benning Doughboys',
    'MareIslandMarines': 'Mare Island Marines', 'Arkansas': 'Arkansas Razorbacks', 'Baylor': 'Baylor Bears', 'Rice': 'Rice Owls',
    'TexasAM': 'Texas A&M Aggies', 'TexasA&M': 'Texas A&M Aggies', 'Auburn': 'Auburn Tigers', 'Clemson': 'Clemson Tigers',
    'GeorgiaTech': 'Georgia Tech Yellow Jackets', 'Duke': 'Duke Blue Devils', 'WakeForest': 'Wake Forest Demon Deacons',
    'MississippiState': 'Mississippi State Bulldogs', 'Stanford': 'Stanford Cardinal', 'NotreDame': 'Notre Dame Fighting Irish',
    'OhioState': 'Ohio State Buckeyes', 'PennState': 'Penn State Nittany Lions', 'Purdue': 'Purdue Boilermakers',
    'Northwestern': 'Northwestern Wildcats', 'MichiganState': 'Michigan State Spartans', 'IowaState': 'Iowa State Cyclones',
    'KansasState': 'Kansas State Wildcats', 'OklahomaState': 'Oklahoma State Cowboys', 'OregonState': 'Oregon State Beavers',
    'WashingtonState': 'Washington State Cougars', 'UCLA': 'UCLA Bruins', 'Syracuse': 'Syracuse Orange', 'WestVirginia': 'West Virginia Mountaineers',
    'Colgate': 'Colgate Raiders', 'BostonUniversity': 'Boston University Terriers', 'NewYorkUniversity': 'NYU Violets', 'NYU': 'NYU Violets',
    'Manhattan': 'Manhattan Jaspers', 'CarnegieMellon': 'Carnegie Mellon Tartans', 'Carnegie Tech': 'Carnegie Mellon Tartans',
    'Arizona State': 'Arizona State Sun Devils', 'ArizonaState': 'Arizona State Sun Devils', 'TexasTech': 'Texas Tech Red Raiders',
    'Tulsa': 'Tulsa Golden Hurricane', 'Louisville': 'Louisville Cardinals', 'Cincinnati': 'Cincinnati Bearcats', 'Xavier': 'Xavier Musketeers',
    'NewMexico': 'New Mexico Lobos', 'ColoradoState': 'Colorado State Rams', 'UtahState': 'Utah State Aggies', 'Denver': 'Denver Pioneers',
    'ColoradoCollege': 'Colorado College Tigers', 'ColoradoMines': 'Colorado School of Mines Orediggers', 'Hardin-Simmons': 'Hardin–Simmons Cowboys',
    'Texas-ElPaso': 'UTEP Miners', 'NorthTexas': 'North Texas Mean Green', 'Loyola(Illinois)': 'Loyola Ramblers', 'Loyola(California)': 'Loyola Lions',
    'Catholic': 'Catholic University Cardinals', 'Kentucky State': 'Kentucky State Thorobreds', 'SanJoseState': 'San Jose State Spartans',
    'CarnegieTech': 'Carnegie Mellon Tartans', 'DetroitMercy': 'Detroit Titans', 'Hampden-Sydney': 'Hampden–Sydney Tigers',
    'Loyola(NewOrleans)': 'Loyola Wolf Pack', 'LoyolaMarymount': 'Loyola Lions', 'Tennessee-Chattanooga': 'Chattanooga Mocs',
    'VirginiaMilitaryInstitute': 'VMI Keydets', 'WesternState': 'Western Colorado Mountaineers', 'StMarys': "Saint Mary's Gaels",
    'FresnoState': 'Fresno State Bulldogs', 'Pacific': 'Pacific Tigers', 'Oberlin': 'Oberlin Yeomen', 'Akron': 'Akron Zips',
}
ALT = {}  # program -> alternate navbox names tried when the first is missing
tset = set(titles)
def navbox(prog): return f'Template:{prog} football coach navbox'

out, report = {}, []
for f in pre:
    nm = sorted(names[f], key=len)[0]
    cand = None
    if f in MANUAL and navbox(MANUAL[f]) in tset: cand = navbox(MANUAL[f])
    if not cand:
        for n in sorted(names[f], key=len):
            pref = f'Template:{n} '
            hits = [t for t in titles if t.startswith(pref) and t.endswith(' football coach navbox')]
            hits = [t for t in hits if not re.match(re.escape(pref) + r'(State|Tech|A&M|Christian|Methodist|Wesleyan)\b', t)]
            if hits: cand = min(hits, key=len); break
    out[f] = cand
    report.append((f, '/'.join(sorted(names[f])), cand, 'manual' if f in MANUAL and cand == navbox(MANUAL[f]) else 'auto'))
json.dump(out, open(sys.argv[3], 'w'), indent=1)
for r in report: print(*r, sep=' | ')
print('mapped', sum(1 for v in out.values() if v), 'of', len(out))
