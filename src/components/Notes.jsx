// What to read next, the citing ask and Ko-fi, and the Method notes: where
// the games come from and the rulings the words rest on, in folded sections
// (a reader opens the one they came to argue about; a crawler reads them all).
import { track } from '../lib/analytics.ts'

export const KOFI_URL = 'https://ko-fi.com/drewhooverdotcom'

/** the line at the foot of every page: the board, an entity page, a group page and its index; `from` names the page for the Ko-fi event */
export function Footer({ from = 'footer' }) {
  return (
    <footer>
      <a href="https://drewhoover.com/">drewhoover.com</a> · data rebuilt weekly in season ·{' '}
      <a href="https://github.com/DrewHoo/cfb-comparator">source & receipts</a> ·{' '}
      <a href={KOFI_URL} onClick={() => track('kofi', { from })}>buy me a coffee</a>
    </footer>
  )
}

export function Notes({ ledgers = {} }) {
  const built = Object.values(ledgers)[0]?.builtAt ?? ''
  return (
    <>
      <h2 className="notes-h">What to read next</h2>
      <div className="notes">
        <p>
          <a href="https://drewhoover.com/nfl-comparator/">NFL Comparator</a> — the same comparator over every NFL
          career since 1999, with a page for every player and what he leads.
        </p>
        <p>
          <a href="https://drewhoover.com/nba-comparator/">NBA Comparator</a> — the same comparator over every NBA
          career since 1946-47, Wilt and Jordan included, with a page for every player and what he leads.
        </p>
        <p>
          <a href="https://drewhoover.com/wnba-comparator/">WNBA Comparator</a> — the same comparator over every WNBA
          career since 1997.
        </p>
        <p>
          <a href="https://drewhoover.com/nhl-comparator/">NHL Comparator</a> — the same comparator over every NHL
          career since 1917-18, Gretzky and Howe included.
        </p>
        <p>
          <a href="https://drewhoover.com/cfb-streak-king/">College Football Streak King</a> — the longest active and
          all-time winning and losing streaks in college football, under any definition, every FBS game since 1936.
        </p>
        <p>
          <a href="https://drewhoover.com/hostile-territory/">Hostile Territory</a> — every head coach's true road
          record against AP top-10 teams since 1936.
        </p>
        <p>
          <a href="https://drewhoover.com/how-many-rings/">How Many Rings?</a> — every person on a
          national-championship staff since 1990, ranked by the number of rings they can claim.
        </p>
        <p>
          <a href="https://drewhoover.com/collegiate-championships/">Collegiate Championships</a> — which schools have
          won the most NCAA championships, across 33 sports.
        </p>
        <p>
          <a href="https://drewhoover.com/cfb-all-time-records/">CFB All-Time Records</a> — all-time win-loss, bowl and
          national-title records for every FBS program.
        </p>
      </div>

      <h2 className="notes-h">Using a comparison from here</h2>
      <div className="notes">
        <p>
          If a comparison from this page ends up in your article, broadcast, podcast or thread, please cite it: name
          the site and link to the board; the url encodes the comparison.
        </p>
        <p>
          The site is free and serves no ads. If you enjoyed using it, consider{' '}
          <a href={KOFI_URL} onClick={() => track('kofi', { from: 'notes' })}>buying me some server compute</a> or
          donating to The Internet Archive's <a href="https://archive.org/donate">Wayback Machine</a> (I am a monthly
          donor, FTR).
        </p>
      </div>

      <section className="notes" id="method" aria-label="Method">
        <h2>Method</h2>
        <p>
          Three ledgers, each a list of games in order with the result, the score and both teams' AP ranks at kickoff:
          every head coach's games as a major-college head coach and every program's games since 1869, from James
          Howell's scores; and every player's games since 2004, from ESPN's box scores. Rebuilt from the files of{' '}
          {String(built).slice(0, 10)}. The sections below say where each comes from, what the words mean, and where
          a published number differs from one here and why.
        </p>

        <details>
          <summary>Where the games come from</summary>
          <p>
            Every game of every major-college team since 1869 is from{' '}
            <a href="https://www.jhowell.net/cf/scores/ScoresIndex.htm">James Howell's college football scores</a>, the
            source College Football Streak King also builds on; from 1936 the games come through Streak King's own
            file, which carries the AP rank of both teams at kickoff from the{' '}
            <a href="https://www.collegepollarchive.com/">College Poll Archive</a>, that site's researched corrections
            and the head coach of every game. A team's games count from the seasons Howell lists it as major-college
            (his "FBS or the equivalent" list, back to the 1869 Rutgers–Princeton game), so Washington's 1908–15
            seasons under Gil Dobie, for instance, are not here, and neither are a coach's games at a school that
            wasn't major that year (Brian Kelly's Grand Valley State years, Jim Tressel's Youngstown State years).
            "Major-college" is the honest wall; the boards say "as a major-college head coach" where it bites.
          </p>
          <p>
            The <b>head coach</b> of a game is CFBD's coach of record resolved game by game against the results in
            Streak King (its researched rulings cover mid-season changes and interims) from 1936, and before that the
            coach Wikipedia's coach lists name for the season (one coach per season; a season with a mid-season change
            or co-coaches has no coach of record, and 3.6% of team-games have none). The pre-1936 coach file is in
            the repository under CC BY-SA 4.0, as Wikipedia's license asks. The coach ledger runs on the same games
            from 1869, but its first coach of record is Lucius Littauer, Harvard's in 1881, the sport's first head
            coach. Teams before him were run by their captains, so a coach board "since 1869" has no games before 1881.
          </p>
          <p>
            A <b>player's</b> games are ESPN's box scores, as published by{' '}
            <a href="https://github.com/sportsdataverse/cfbfastR-data">cfbfastR</a> (sportsdataverse), CC BY 4.0, 2004
            to today, joined to the same game spine for the ranks. Passing, rushing, receiving, interceptions, returns,
            kicking and punting are in every game from 2004; fumbles from 2016; kick returns from 2009; tackles, sacks
            and passes defended from 2024. A board whose stat forces a later start says so in the sentence, and the
            careers from before sit out, counted on the board. Positions are ESPN's roster position where it has one
            (every roster is blank before 2014), else read off the box score: a quarterback throws, a running back
            carries, and a receiver from before 2014 is listed with the wide receivers whether or not he was a tight end.
          </p>
        </details>

        <details>
          <summary>What the words mean</summary>
          <p>
            A <b>game</b> is a game the entity took part in: a coach's game, a program's game, a player's game with a
            line in the box score (there is no starter flag in a football box score, so a quarterback's "wins" are his
            team's results in the games he threw, ran or caught in). A <b>win</b> is the result of a game in the
            sequence; a tie is neither. "First N games at one school" is one tenure: a coach who left and came back
            has two. "Team games of a season" count the team's schedule, so a player who sat one has a gap the window
            still counts; a season that is over fills a longer window whole, so a 9-game 1936 ranks on a 12-game board
            as "all 9 games", and a career that is over fills a longer window the same way. Bowls and the playoff are
            in by default, the way coaches' records and (since 2002) the NCAA's season totals count them; the word
            beside the window switches to the regular season only. Conference championship games are regular-season
            games.
          </p>
          <p>
            <b>Ranked</b> and <b>top-10</b> read the AP poll in effect at kickoff, from 1936; before 1950 a game
            before the season's first poll has no rank in effect, and sits a coach or a program out of those boards for
            that window. A <b>road game</b> is one away from home and not at a neutral site. "Won by 21 or more" and
            "one-score" read the final margin. A clean line ("no interceptions thrown", "no fumbles") counts only in a
            game the player had ten pass attempts or five touches in. Ranks are competition ranks, ties included.
            "Still inside the window" lists the entities that haven't played the whole window yet, with their total so
            far. The panel reads a row against a peer: where their curves met, and what the subject needs over the next
            five games to match the peer there; the peer rides in the url, so a shared link opens the same comparison.
            A coach's, a team's or a player's page lists every comparison it leads, worded at the point where it
            stands out most.
          </p>
        </details>

        <details>
          <summary>Where a published number differs, and why</summary>
          <p>
            The boards reproduce the NCAA record book's famous numbers where the box scores and the spine can: Kirby
            Smart's 100th win in his 117th game, Joe Paterno's 409 and his 200th win in game 246, Bear Bryant's 323,
            Tom Osborne's 255-49-3, Knute Rockne's 105-12-5, Oklahoma's 47 straight, LSU's 726 points in 2019, Joe
            Burrow's 5,671 yards and 60 touchdowns, Ashton Jeanty's 2,601, Case Keenum's 19,217, Ja'Marr Chase's 1,780.
            The repository's gate checks them on every build.
          </p>
          <p>
            Every number here is an on-field result. The NCAA vacates wins (Paterno's 111, since restored; Bobby
            Bowden's 12; Nick Saban's five from 2007; Brian Kelly's 21 at Notre Dame) and these boards don't, so Saban
            reads 297 wins where the NCAA says 292, and his first 100 games at Alabama read 84 wins. A forfeit stands as
            it was played. The NCAA counts a tie as half a win in a winning percentage and lists George Woodruff's 100th
            win in his 109th game where Howell's Penn pages reach it in his 111th. Chris Petersen's 100th win is his
            117th game here and at Washington; the NCAA's book says 118. Walter Camp has 68 wins through five seasons
            here and 69 in the NCAA's count.
          </p>
          <p>
            ESPN's box scores have holes a season total can show: four 2006 Hawai'i home games never existed at ESPN,
            so Colt Brennan reads 42 touchdown passes for 2006 where the NCAA has 58, and one 2007 Texas Tech game is
            missing, which leaves Graham Harrell 48 completions and Michael Crabtree 15 catches short of the record
            book; a few depth players' receiving lines are missing inside games before 2008. A game the spine has and
            ESPN doesn't is a gap the season windows count. Sacks count against a quarterback's rushing yards, as the
            NCAA counts them (Harrell's 2007 rushing is negative). Reggie Bush's 2005 is here as played; the NCAA
            vacated it. A player whose first ESPN season is 2004 and whose career ran fewer than four seasons from it
            may have played before 2004 and sits out the career boards (his seasons still rank on the season boards);
            Adrian Peterson, a 2004 freshman, is one of them until a receipt says so.
          </p>
        </details>

        <details>
          <summary>Why the old names sit where they do</summary>
          <p>
            A career window favors the game as it was played before 1900: seasons of twelve games against colleges,
            athletic clubs and high schools, scores of 100 to nothing, and a coach who stayed a decade undefeated. So
            "most wins through the first 100 games" reads George Woodruff, Fielding Yost and Walter Camp before any
            living coach, and the modern names on these boards are the ones who were great from game one. The era word
            in the sentence is how to ask the fair question; its cuts are the game's own: 1880 and eleven-man football,
            1906 and the forward pass, 1936 and the AP poll, 1958 and the two-point conversion, 1978 and Division I-A,
            1998 and the BCS, 2014 and the College Football Playoff, 2024 and the twelve-team playoff. A stat's own wall
            (ranks from 1936, fumbles from 2016, tackles from 2024) is the first choice when it is later than the
            ledger's start. Before 1880 the games weren't eleven-man football and a third of the 1870s rows are ones
            Howell marks unverified; they are here because they are the record, and the era word takes them out.
          </p>
        </details>

        <p>
          A sibling of <a href="https://drewhoover.com/cfb-streak-king/">College Football Streak King</a>,{' '}
          <a href="https://drewhoover.com/hostile-territory/">Hostile Territory</a>,{' '}
          <a href="https://drewhoover.com/nfl-comparator/">NFL Comparator</a>,{' '}
          <a href="https://drewhoover.com/nba-comparator/">NBA Comparator</a> and{' '}
          <a href="https://drewhoover.com/wnba-comparator/">WNBA Comparator</a>.
        </p>
      </section>
    </>
  )
}
