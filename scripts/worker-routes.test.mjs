// The paths the Worker answers itself are listed twice: WORKER_ROUTES in worker/index.mjs, and assets.run_worker_first in wrangler.jsonc. A browser's navigation to a path no asset matches
// is answered by the assets pipeline (the 404 page) unless the path runs the Worker first, so the two lists must be equal, and every path in them must get the Worker's own answer.
// The config is read with the room's reader (scripts/lib/wrangler-jsonc.mjs). No test reaches the network or a real store. Run: node --test scripts/worker-routes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jsoncWithoutComments } from './lib/wrangler-jsonc.mjs';
import * as worker from '../worker/index.mjs';
import { MTA_STS_HOST, MTA_STS_PATH } from '../worker/mta-sts.mjs';

const config = (() => {
  const text = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  return JSON.parse(jsoncWithoutComments(text));
})();

// The assets stub: every request it is asked for is marked, so a test can tell the Worker's answer from the assets pipeline's.
const ASSETS = { fetch: async () => new Response('from assets', { status: 200, headers: { 'x-answered-by': 'assets' } }) };
const kv = () => ({ get: async () => null, put: async () => {}, delete: async () => {} });

test('wrangler.jsonc lists the Worker\'s own routes in assets.run_worker_first, and only those', () => {
  const listed = config.assets?.run_worker_first;
  assert.ok(Array.isArray(listed), 'assets.run_worker_first is an array of paths');
  assert.ok(Array.isArray(worker.WORKER_ROUTES), 'worker/index.mjs exports WORKER_ROUTES, the list the Worker answers itself');
  assert.deepEqual([...listed].sort(), [...worker.WORKER_ROUTES].sort(), 'run_worker_first equals WORKER_ROUTES, as sets');
  assert.equal(new Set(listed).size, listed.length, 'no path is listed twice');
});

test('every path in WORKER_ROUTES gets the Worker\'s own answer from fetch, never the assets stub', async () => {
  for (const path of worker.WORKER_ROUTES) {
    // The MTA-STS path answers on its own host only (the policy host), so it is asked there; every other route on kolwen.com.
    const host = path === MTA_STS_PATH ? MTA_STS_HOST : 'kolwen.com';
    const res = await worker.default.fetch(new Request('https://' + host + path, { headers: { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', accept: 'text/html' } }), { ASSETS, STATUS: kv(), SUBSCRIBE: 'off', SUBSCRIBERS: kv() });
    assert.equal(res.headers.get('x-answered-by'), null, path + ' was answered by the assets, not by the Worker');
  }
});

test('a path outside WORKER_ROUTES still goes to the assets, so the 404 page and the static files are unchanged', async () => {
  const res = await worker.default.fetch(new Request('https://kolwen.com/no-such-page'), { ASSETS, STATUS: kv() });
  assert.equal(res.headers.get('x-answered-by'), 'assets');
});

// MTA-STS (RFC 8461): the policy is served on its own host only. The body is the one in the design (testing mode, CRLF line endings, each line ended).
const MTA_STS = 'https://mta-sts.kolwen.com/.well-known/mta-sts.txt';
const POLICY = 'version: STSv1\r\nmode: testing\r\nmx: *.mx.cloudflare.net\r\nmax_age: 86400\r\n';
test('MTA-STS: the policy host answers the policy, byte for byte, as text/plain through secured(), and HEAD answers as GET without a body', async () => {
  const get = await worker.default.fetch(new Request(MTA_STS), { ASSETS, STATUS: kv() });
  assert.equal(get.headers.get('x-answered-by'), null, 'answered by the Worker, not the assets');
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.ok(get.headers.get('content-security-policy'), 'through secured(): the global headers are on the answer');
  assert.equal(await get.text(), POLICY, 'the policy body, byte for byte, CRLF line endings');
  const head = await worker.default.fetch(new Request(MTA_STS, { method: 'HEAD' }), { ASSETS, STATUS: kv() });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '', 'HEAD has no body');
  assert.equal(head.headers.get('content-length'), String(new TextEncoder().encode(POLICY).length));
});
test('MTA-STS: the same path on any other host, and any other method on the policy host, answers as it does today, from the assets', async () => {
  for (const url of ['https://kolwen.com/.well-known/mta-sts.txt', 'https://www.kolwen.com/.well-known/mta-sts.txt', 'https://example.org/.well-known/mta-sts.txt']) {
    const res = await worker.default.fetch(new Request(url), { ASSETS, STATUS: kv() });
    assert.equal(res.headers.get('x-answered-by'), 'assets', url);
  }
  const post = await worker.default.fetch(new Request(MTA_STS, { method: 'POST' }), { ASSETS, STATUS: kv() });
  assert.equal(post.headers.get('x-answered-by'), 'assets', 'POST on the policy host');
});

// workerd starts the main module with every named export as an entrypoint, and rejects a primitive one ("Incorrect type for map entry", Verify on #200). So each named
// export other than the default must be a function or an object (an array, as WORKER_ROUTES is, is an object).
test('workerd starts the main module: every named export other than default is a function or an object, never a primitive (Verify on #200)', () => {
  for (const [name, value] of Object.entries(worker)) {
    if (name === 'default') continue;
    assert.ok(typeof value === 'function' || (typeof value === 'object' && value !== null), `${name} is a ${typeof value}: workerd rejects a primitive named export of the main module`);
  }
});
