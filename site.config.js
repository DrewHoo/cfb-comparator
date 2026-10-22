// The one file to edit when you start a project from this template.
// The URL slug is NOT here: it is the "name" in package.json, and it has to
// equal the GitHub repo name, because the site serves at https://<domain>/<repo>/.
import { FIRST_SEASON, PLAYERS_FIRST_SEASON } from './scripts/lib/window.mjs'

export default {
  domain: 'drewhoover.com',
  title: 'College Football Comparator',
  description:
    `Compare college football head coaches, teams and players at the same point: wins through the first 50 games as a head coach, fastest to 100 wins, points through a season's first 6 games, passing yards through a team's first 10. Build the comparison, see who stacks up: every head coach and program since ${FIRST_SEASON}, every player since ${PLAYERS_FIRST_SEASON}.`,
  ogSubtitle: 'Same point in the career. Who stacks up.',
  ogImageAlt: 'A ranked list of college football head coaches compared at the same point in their careers, on a dark background.',
  accent: '#c36c36',
}
