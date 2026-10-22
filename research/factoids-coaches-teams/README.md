# Coach and team factoids (known-answer gates)

`factoids.json` holds 50 famous FBS coach and team numbers. Each one has the publisher's exact value, the window and N the publisher used, and a `scope` that says which games counted. Most rows come from the current NCAA record books: `Coaching.pdf` and `FBS.pdf` on the unversioned `fs.ncaa.org.s3.amazonaws.com` path, which run through the 2025 season. The yearly `fs.ncaa.org` paths stop at 2018/2022. When a viral claim came from a school, ESPN/AP or a news article, that source is attached, and the NCAA number sits beside it when the two disagree. Every page quoted is saved under `pages/` (keyed by sha1 of the URL; PDFs as extracted `.txt`). Every quote is a verbatim substring of that saved text. Check it with:

    node scripts/check-receipts.mjs --offline --pages research/factoids-coaches-teams/pages research/factoids-coaches-teams/factoids.json

Result at handoff: 92 receipts, 92 ok, 0 miss.

## Counts

- rows: 50 (36 coach, 14 team). By grade: 34 record-book, 8 publisher, 5 wikipedia, 3 article.
- rejections: 9 (wrong seeds, a stale Wikipedia attribution, an NCAA.com article that contradicts the NCAA book, typos)
- tried: 10 (dead URLs, paywalls, JS-rendered pages)
- leads: 9 (second numbers worth a receipt; rows cut to stay at 50)
- unverified: 7 (seeds no publisher states)

Sports-Reference was not needed. Every row had a source higher in the precedence order.

## Three definition disputes most likely to break the gates

1. **Vacated games.** The NCAA book removes them (^ rows): Saban 292, Bowden 377 (on-field 389), Kelly 297, Ohio State 2010 officially 0-1. Paterno's 111 wins were vacated in 2012 and restored in 2015, so 409 is current and 298 is what 2012-14 sources print. The NCAA still keeps scores from vacated games: USC's 63 straight games of 20+ points runs through its vacated 2004-05 seasons. The spine needs a "vacated" flag that removes the win but keeps the game and its score, and each gate has to say which mode it uses.
2. **Bowls, acting coaches and credited games.** NCAA coach records include bowl and playoff games. The real trap is who gets credit for a game. Ryan Day's NCAA line starts in 2018 (3-0 as acting coach), so his record is 45-6 over five seasons rather than 42-6. Harbaugh coached 9 games in 2023 but is credited with 12 wins. Swinney's 2008 interim games count toward his milestones. Kiffin left Ole Miss before its 2025 playoff games. Petersen missed Boise's 2013 bowl, and NCAA (118) and Washington/Georgia (117) disagree on when he reached 100 wins. Attribute every game to a credited coach, and keep "games on the sideline" separate.
3. **Non-major tenures.** The NCAA coaching lists use "record at four-year colleges only". That pulls in Kelly's 118 Division II wins at Grand Valley State, DeBoer's NAIA Sioux Falls years (114-16 over 10 seasons, against Alabama's 104-12 over nine), Bowden's Samford years, and Pop Warner's simultaneous Iowa State seasons (NCAA book 336-114-32; Wikipedia 319-106-32). An FBS-only spine will miss these totals on purpose. The Method section has to say so, and those rows should be gated FBS-only or marked "publisher scope differs".
