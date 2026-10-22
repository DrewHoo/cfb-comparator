// The share worker: sits on drewhoover.com/cfb-comparator/* in front of
// GitHub Pages and makes a shared URL unfurl as itself. GitHub Pages serves
// one HTML for every query string; this is the piece that makes every board
// and every open row read as its own page.
//
//   <head> rewrite  the board address (/cfb-comparator/) whose query says
//                   more than the root (a slot off its default, or a row
//                   open with ?t=) gets its own title, description and og
//                   tags, worded by src/lib/share.ts (pure); a crawler's
//                   request also gets the leader or the open row's claim,
//                   read from the ledger. Entity pages (/coach/<id>/,
//                   /team/<id>/, /player/<id>/) are prerendered files with
//                   their own heads: untouched.
//   /share/og.png   the board drawn on demand (card.ts): the worker fetches
//                   the query's ledger the prerender publishes (dist/data/
//                   <kind>.json and the gzipped columns in dist/data/cols/
//                   <kind>/), runs the site's own evaluate, and renders the
//                   top of the board; with a row open (?t=), the row read
//                   against its peer (vs=, else the leader): both sides,
//                   the panel's lines, its chart. Cached at the edge.
//
// Three ledgers, loaded as a query asks for its kind, once per isolate per
// UTC day, then only the stat columns a query reads. Every column is a byte
// or two a game, so even all three stay well inside 128MB.
//
// Anything else — and anything that goes wrong — passes through untouched:
// this worker must never be the reason the site is down.
//
// Deploy: npx wrangler deploy -c workers/share/wrangler.jsonc (deploy.yml
// does it after every push to main). To see a card locally: npm run build,
// npx vite preview --port 4175, then npm run worker:dev (port 8789) and open
// http://localhost:8789/cfb-comparator/share/og.png?n=100

import type { ColName, Kind, Ledger, LedgerFile } from '../../src/lib/ledger.ts';
import { spanWords, STAT_COLS } from '../../src/lib/ledger.ts';
import { ensureCols, loadLedger as loadColumns, type ColUrl } from '../../src/lib/load.ts';
import { evaluate, queryCols, type Board, type Query, type Row } from '../../src/lib/query.ts';
import { parseUrl, toUrl, parseAddress } from '../../src/lib/url.ts';
import { landingFromPath } from '../../src/lib/landing.ts';
import { eraBound } from '../../src/lib/query.ts';
import { his, queryWords, rankWords, rowName, rowWords, seqWords, unitWords } from '../../src/lib/words.ts';
import { countWords, statByKey } from '../../src/lib/stats.ts';
import { cardHeading, cardRows, isShared, shareDescription, shareTitle, SITE as SITE_NAME } from '../../src/lib/share.ts';
import { compare, crossingWords, matchWords, peerOf } from '../../src/lib/compare.ts';
import { renderCard, type Card } from './card.ts';

interface Env { ORIGIN?: string; NO_REPORT?: string }

const BASE = '/cfb-comparator';
/** the Mixpanel `site` prop */
const SITE = 'cfb-comparator';
// the committed ledgers, for the window between a worker deploy and the next Pages deploy
const RAW = 'https://raw.githubusercontent.com/DrewHoo/cfb-comparator/main/src/data';

// Analytics: one Mixpanel event per link preview, sent server-side to the
// index site's project (the public token its embed carries; a project token
// only writes). The client embed never sees an unfurl, because the bot that
// fetches a shared link runs no script, so this is the only place a share
// can be counted. Nothing personal goes: the crawler's name, its user agent
// only when it is a crawler, the country Cloudflare saw, the URL itself and
// its slots. A browser's visit is the embed's to count, so the head rewrite
// reports crawlers only; the card is reported whoever asked for it.
const MIXPANEL_TOKEN = '1c6a0f45b8a5768185a8d9a2f4d65452';
const AGENTS: [RegExp, string][] = [
  [/Slackbot|Slack-ImgProxy/i, 'slack'],
  [/Discordbot/i, 'discord'],
  [/TelegramBot/i, 'telegram'],
  [/WhatsApp/i, 'whatsapp'],
  [/LinkedInBot/i, 'linkedin'],
  [/redditbot/i, 'reddit'],
  [/Bluesky/i, 'bluesky'],
  [/Mastodon/i, 'mastodon'],
  [/Facebot.*Twitterbot|Twitterbot.*Facebot/i, 'imessage'],
  [/Twitterbot/i, 'twitter'],
  [/facebookexternalhit|Facebot/i, 'facebook'],
  [/Googlebot/i, 'google'],
  [/bingbot/i, 'bing'],
  [/Applebot/i, 'apple'],
  [/bot|crawler|spider|preview|fetch|embed|scraper/i, 'other-bot'],
];
const agentOf = (ua: string | null): string => AGENTS.find(([re]) => re.test(ua ?? ''))?.[1] ?? 'browser';

function report(env: Env, ctx: ExecutionContext, request: Request, event: string, props: Record<string, unknown>) {
  if (env.NO_REPORT) return;
  try {
    const ua = request.headers.get('user-agent');
    const agent = agentOf(ua);
    const body = [{
      event,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: `unfurl:${agent}`,
        $insert_id: crypto.randomUUID(),
        time: Math.floor(Date.now() / 1000),
        site: SITE,
        agent,
        crawler: agent === 'browser' ? null : (ua ?? '').slice(0, 200),
        country: (request as Request & { cf?: { country?: string } }).cf?.country ?? null,
        ...props,
      },
    }];
    ctx.waitUntil(fetch('https://api.mixpanel.com/track?ip=0', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/plain' },
      body: JSON.stringify(body),
    }).then((r) => r.body?.cancel()).catch(() => {}));
  } catch {}
}
/** The URL itself and its slots, for an event. */
const urlProps = (url: URL) => {
  const { query: q, open, vs } = parseUrl(url.search);
  return {
    url: url.href,
    $current_url: url.href,
    path: url.pathname.replace(BASE, '') || '/',
    words: queryWords(q),
    kind: q.kind, pos: q.pos, stat: q.stat, how: q.how, n: q.n, seq: q.seq, scope: q.scope, since: q.since, dir: q.dir,
    tests: q.tests.map((t) => `${t.stat}:${t.min}${t.max != null ? `-${t.max}` : ''}`).join(',') || null,
    t: open,
    vs: vs ?? null,
  };
};

/** Bump on any change to what the card draws or how a URL reads; it keys the edge cache. */
const CARD_VERSION = '2026-10-22c';

const edge = (ttl: number) => ({ cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': ttl, '400-599': 30 } } }) as RequestInit;
// a fresh cache key each UTC day: GitHub Pages ignores query strings, and a
// 404 cached before a Pages deploy must not outlive the day it happened on
const dayKey = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

// a kind's ledger, its entities and base columns, decoded once per isolate
// per UTC day; a query's stat columns join it as queries ask for them. A
// failed load clears the slot so the next request retries rather than
// inheriting the failure. `cols` is where this ledger's columns live: the
// origin, or raw GitHub when the origin had no ledger (the columns must
// come from the same build as the entities, or their lengths won't match).
interface Loaded { L: Ledger; cols: ColUrl }
const ledgerCache: Partial<Record<Kind, { day: string; ledger: Promise<Loaded> }>> = {};

/** what the isolate holds for a ledger's columns, in MB */
const heldMB = (L: Ledger) => {
  let b = L.date.byteLength + L.season.byteLength + L.flags.byteLength + L.team.byteLength + L.tgn.byteLength + L.pf.byteLength + L.pa.byteLength + L.rk.byteLength + L.ork.byteLength + (L.opp?.byteLength ?? 0);
  for (const k of STAT_COLS) b += L.col[k]?.byteLength ?? 0;
  return Math.round(b / 1e5) / 10;
};

function loadLedger(origin: string, kind: Kind): Promise<Loaded> {
  const day = dayKey();
  if (ledgerCache[kind]?.day !== day) {
    const ledger = (async () => {
      const t0 = Date.now();
      let root = `${origin}${BASE}/data`;
      let res = await fetch(`${root}/${kind}.json?d=${day}`, edge(3600));
      if (!res.ok) { await res.body?.cancel(); root = RAW; res = await fetch(`${RAW}/${kind}.json?d=${day}`, edge(3600)); }
      if (!res.ok) throw new Error(`ledger ${kind} ${res.status}`);
      const file = (await res.json()) as LedgerFile;
      const cols: ColUrl = (name: ColName) => `${root}/cols/${kind}/${name}.bin.gz?d=${day}`;
      const L = await loadColumns(file, cols, [], edge(3600));
      console.log(JSON.stringify({ event: 'ledger_loaded', kind, from: root, ms: Date.now() - t0, entities: L.entities.length, games: L.n, columnsMB: heldMB(L) }));
      return { L, cols };
    })().catch((e) => { ledgerCache[kind] = undefined; throw e; });
    ledgerCache[kind] = { day, ledger };
  }
  return ledgerCache[kind]!.ledger;
}

/** the query's ledger with its columns on it. A column that won't attach (a Pages deploy landed between the
 *  entities and this column, so the game counts differ) drops the day's ledger and loads it once more, fresh. */
async function ledgerFor(origin: string, q: Query): Promise<Ledger> {
  const names = queryCols(q);
  const first = await loadLedger(origin, q.kind);
  try {
    await ensureCols(first.L, first.cols, names, edge(3600));
    return first.L;
  } catch (e) {
    console.log(JSON.stringify({ event: 'columns_failed', kind: q.kind, names, error: String(e) }));
    if (ledgerCache[q.kind] && (await ledgerCache[q.kind]!.ledger.catch(() => null)) === first) ledgerCache[q.kind] = undefined;
    const again = await loadLedger(origin, q.kind);
    await ensureCols(again.L, again.cols, names, edge(3600));
    return again.L;
  }
}

const findRow = (board: Board, key: string | null): Row | null => (key ? [...board.ranked, ...board.onTheWay].find((r) => r.key === key) ?? null : null);

const fmtN = (n: number) => n.toLocaleString('en-US');

/** the unit under a side's number: the stat for a total, else the games (or seasons) counted */
const unitOf = (q: Query): string => (q.how === 'sum' ? statByKey(q.stat).noun : q.how === 'reach' ? seqWords(q.seq === 'tenure' ? 'games' : q.seq, 2, q.kind) : 'games');

/** the comparison's card: both sides, the panel's lines, its chart (the panel's reading, from compare.ts) */
function compareCard(L: Ledger, q: Query, board: Board, row: Row, peer: Row): Card {
  const stat = statByKey(q.stat);
  const value = (r: Row) => (r.value == null ? '—' : fmtN(r.value));
  const claim = (r: Row) => (r.value == null ? `${fmtN(r.reached)} ${seqWords(q.seq, r.reached, q.kind)} so far` : r.season != null ? `${r.team}'s first ${q.n} games of ${r.season}` : q.how === 'reach' ? `to ${countWords(q.n, stat)}` : r.stint != null ? `through ${his(q.kind)} first ${fmtN(r.reached)} games at ${r.team}` : `through ${his(q.kind)} first ${fmtN(r.reached)} ${seqWords(q.seq, r.reached, q.kind)}`);
  const cmp = compare(L, row, peer, q);
  const lines: string[] = [];
  if (cmp) {
    lines.push(cmp.xs[0] ? `${row.entity.name} ${crossingWords(cmp.xs[0], peer, q)}.` : 'Their curves never met.');
    const m = matchWords(row, peer, cmp, q);
    if (m) lines.push(m);
  } else {
    lines.push(`${row.entity.name}: ${rowWords(row, q)}.`);
    if (peer.value != null) lines.push(`${peer.entity.name}: ${rowWords(peer, q)}.`);
  }
  const field = board.ranked.length;
  const place = (r: Row) => (r.complete && r.value != null ? rankWords(r, field) : 'inside the window');
  const bound = eraBound(q, board);
  return {
    heading: `${rowName(row)} vs ${rowName(peer)}`,
    words: queryWords(q, bound),
    sides: [
      { name: rowName(row), value: value(row), unit: unitOf(q), claim: `${place(row)} · ${claim(row)}` },
      { name: rowName(peer), value: value(peer), unit: unitOf(q), claim: `${place(peer)} · ${claim(peer)}` },
    ],
    lines,
    chart: cmp ? { me: cmp.me, them: cmp.them, n: cmp.n, unit: q.seq === 'seasons' ? 'season' : 'game' } : null,
    footer: `${spanWords(bound ?? L.firstSeason, L.currentSeason)} · ${fmtN(field)} ${unitWords(q)} with the whole window · drewhoover.com`,
  };
}

async function ogCard(origin: string, search: string): Promise<Response> {
  const { query, open, vs } = parseUrl(search);
  const L = await ledgerFor(origin, query);
  const board = evaluate(L, query);
  const row = findRow(board, open);
  const peer = row ? peerOf(board, row, vs) : null;
  const res = renderCard(row && peer ? compareCard(L, query, board, row, peer) : {
    heading: cardHeading(query),
    words: queryWords(query, eraBound(query, board)),
    rows: cardRows(board, query, open),
    footer: `${spanWords(eraBound(query, board) ?? L.firstSeason, L.currentSeason)} · ${fmtN(board.ranked.length)} ${unitWords(query)} with the whole window · drewhoover.com`,
  });
  // buffer the render: workers-og streams lazily, and a failure mid-stream
  // would otherwise ship a 200 with an empty body
  const png = await res.arrayBuffer();
  if (!png.byteLength) throw new Error('empty render');
  return new Response(png, {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600, s-maxage=43200' },
  });
}

/** The og image URL for a board URL: the same slots, in the one order toUrl writes them. */
const ogImageUrl = (origin: string, search: string) => `${origin}${BASE}/share/og.png${toUrl(parseUrl(search))}`;

const content = (text: string) => ({
  element(e: Element) { e.setAttribute('content', text); },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.ORIGIN ?? 'https://drewhoover.com';

    // the dynamic card, cached at the edge under this deploy's version
    if (url.pathname === `${BASE}/share/og.png`) {
      try {
        const canon = toUrl(parseUrl(url.search));
        const key = new Request(`${url.origin}${url.pathname}?v=${CARD_VERSION}&${canon.slice(1)}`, { method: 'GET' });
        const cached = await caches.default.match(key);
        report(env, ctx, request, 'share card', { ...urlProps(url), cached: !!cached });
        if (cached) return cached;
        const res = await ogCard(origin, url.search);
        ctx.waitUntil(caches.default.put(key, res.clone()));
        return res;
      } catch (e) {
        console.log(JSON.stringify({ event: 'og_render_failed', url: url.search, error: String((e as Error)?.stack ?? e) }));
        // the committed board image, so a share still carries something
        return Response.redirect(`${origin}${BASE}/og.png`, 302);
      }
    }

    // everything else: origin, with <head> rewritten where the URL says more
    // than the prerendered page could. A same-zone subrequest skips the
    // worker and lands on GitHub Pages (and lets `wrangler dev` hit a local origin).
    const headers = new Headers(request.headers);
    headers.delete('accept-encoding');
    const res = await fetch(new Request(`${origin}${url.pathname}${url.search}`, { method: request.method, headers }));
    try {
      if (request.method !== 'GET') return res;
      // the board address, or a named board's path with a query string on top: entity pages, a bare named board and every other file have their own heads
      const landing = landingFromPath(url.pathname, BASE);
      if (!landing && url.pathname !== `${BASE}/` && url.pathname !== BASE) return res;
      if (landing && !url.search) return res;
      if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
      const state = parseAddress(url.pathname, url.search, BASE);
      const { query, open, vs } = state;
      if (!landing && !isShared(query, open)) return res;
      const crawler = agentOf(request.headers.get('user-agent')) !== 'browser';
      if (crawler) report(env, ctx, request, 'share unfurl', urlProps(url));
      // a crawler's description names the leader, or the open row read against its peer (vs=, else the leader),
      // from the ledger; a browser's is the pure sentence, and the page sets its own title once it hydrates
      let L: Ledger | null = null, board: Board | null = null, openRow: Row | null = null, peer: Row | null = null, firstSeason = query.kind === 'player' ? 2004 : 1869;
      if (crawler) {
        try {
          L = await ledgerFor(origin, query);
          board = evaluate(L, query);
          openRow = findRow(board, open);
          peer = openRow ? peerOf(board, openRow, vs) : null;
          firstSeason = L.firstSeason;
        } catch (e) {
          console.log(JSON.stringify({ event: 'share_board_failed', url: url.search, error: String(e) }));
          L = null; board = null; openRow = null; peer = null;
        }
      }
      const title = shareTitle(query, openRow, peer, board ? eraBound(query, board) : null);
      const description = shareDescription(query, L, board, openRow, firstSeason, peer);
      const img = ogImageUrl(origin, toUrl(state));
      return new HTMLRewriter()
        .on('title', { element(e) { e.setInnerContent(title); } })
        .on('meta[name="description"]', content(description))
        .on('meta[property="og:title"]', content(title))
        .on('meta[property="og:description"]', content(description))
        .on('meta[property="og:url"]', content(`${origin}${url.pathname}${url.search}`))
        .on('meta[property="og:image"]', content(img))
        .on('meta[property="og:image:alt"]', content(`${title.replace(` · ${SITE_NAME}`, '')}, on a dark leaderboard.`))
        .on('meta[name="twitter:image"]', content(img))
        .on('meta[name="twitter:title"]', content(title))
        .on('meta[name="twitter:description"]', content(description))
        .transform(res);
    } catch (e) {
      console.log(JSON.stringify({ event: 'share_rewrite_failed', url: url.pathname + url.search, error: String(e) }));
      return res;
    }
  },
} satisfies ExportedHandler<Env>;
