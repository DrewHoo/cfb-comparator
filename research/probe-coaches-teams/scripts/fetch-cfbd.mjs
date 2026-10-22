// CFBD fetches for the probe (at most ~10 calls, 1.5 s apart). The key is read
// from the env file and never printed or written.
//   node fetch-cfbd.mjs <env-file> <download-dir> <path?query> [<path?query> ...]
// Each body is saved as <download-dir>/<slug of path+query>.json; a file that
// already exists is not re-fetched.
import fs from 'node:fs';
import path from 'node:path';

const [envFile, dir, ...reqs] = process.argv.slice(2);
process.loadEnvFile(envFile);
const key = process.env.CFBD_API_KEY;
if (!key) throw new Error('no CFBD_API_KEY in env file');
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [i, q] of reqs.entries()) {
  const file = path.join(dir, q.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '-') + '.json');
  if (fs.existsSync(file)) { console.log('cached', file); continue; }
  if (i) await sleep(1600);
  const res = await fetch(`https://api.collegefootballdata.com${q}`, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  const body = await res.text();
  console.log(q, res.status, `${body.length} bytes`, res.headers.get('x-calllimit-remaining') ?? '');
  if (res.ok) fs.writeFileSync(file, body);
  else console.log('  body:', body.slice(0, 300));
}
