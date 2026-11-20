// Tests for the one reader of web/_headers (scripts/lib/headers-file.mjs): a detach line (`! Name`) is a removal of a header from its rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHeadersFile, declarations, parsePolicy, patternMatches } from './lib/headers-file.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');
// K-175: the shipped list is read from web/ (every image and font file there), never written by hand.
const shippedFiles = readdirSync(WEB, { recursive: true }).map(p => '/' + String(p).split('\\').join('/')).filter(p => /\.(png|jpe?g|svg|ico|woff2)$/i.test(p));

test('K-175: every shipped font file has its own one-year immutable rule, every one-year rule names a shipped font file, and a missing font path matches none', () => {
  const file = process.env.KOLWEN_HEADERS_FILE || join(WEB, '_headers');
  const rules = parseHeadersFile(readFileSync(file, 'utf8'));
  const year = rules.filter(r => r.headers.some(h => h.name === 'Cache-Control' && /max-age=31536000/.test(h.value)));
  const fonts = shippedFiles.filter(p => p.startsWith('/fonts/') && p.endsWith('.woff2'));
  assert.ok(fonts.length > 0, `${file}: web/ holds font files to read`);
  for (const f of fonts) assert.ok(year.some(r => r.pattern === f), `${file}: ${f} has its own one-year rule`);
  assert.deepEqual(year.map(r => r.pattern).filter(p => !fonts.includes(p)), [], `${file}: every one-year rule names a shipped font file`);
  for (const missing of ['/fonts/thai/kw-sans-thai-400.0000000000.woff2', '/fonts/mono/kw-mono-400.0000000000.woff2']) {
    assert.deepEqual(year.filter(r => patternMatches(r.pattern, missing)).map(r => r.pattern), [], `${missing} matches a one-year rule`);
  }
});

test('a detach line in a rule is kept as a removal of that header, and never as one of the rule\'s headers', () => {
  const rules = parseHeadersFile('/*\n  X-Frame-Options: DENY\n  ! Content-Security-Policy\n');
  assert.deepEqual(rules[0].removes, [{ name: 'Content-Security-Policy', line: 3 }]);
  assert.deepEqual(rules[0].headers.map(h => h.name), ['X-Frame-Options']);
  assert.deepEqual(declarations(rules, 'Content-Security-Policy'), []);
});

test('a rule with no detach line has no removals, and its headers are read as before', () => {
  const rules = parseHeadersFile('/a\n  Cache-Control: no-store\n');
  assert.deepEqual(rules[0].removes, []);
  assert.deepEqual(rules[0].headers, [{ name: 'Cache-Control', value: 'no-store', line: 2 }]);
});

// The served policy limits connections to the site itself. The connection control of a page is connect-src (fetch, XMLHttpRequest, WebSocket,
// EventSource); when it is absent it falls back to default-src (CSP Level 3, "directive fallback list", https://www.w3.org/TR/CSP3/#directive-fallback-list).
// KOLWEN_HEADERS_FILE, when set, is read instead of web/_headers: a test-only way to hold a temporary copy to the same assertion.
test('the served policy limits connections to the site itself: connect-src is \'self\', or default-src is \'self\' with no connect-src of its own', () => {
  const file = process.env.KOLWEN_HEADERS_FILE || join(ROOT, 'web', '_headers');
  const rules = parseHeadersFile(readFileSync(file, 'utf8'));
  const star = rules.find(r => r.pattern === '/*');
  assert.ok(star, `${file}: the /* rule exists`);
  const csp = star.headers.find(h => h.name.toLowerCase() === 'content-security-policy');
  assert.ok(csp, `${file}: the /* rule has a Content-Security-Policy`);
  const { dirs } = parsePolicy(csp.value);
  const connect = dirs.get('connect-src'), fallback = dirs.get('default-src') || [];
  const limited = connect ? connect.length === 1 && connect[0] === "'self'" : fallback.length === 1 && fallback[0] === "'self'";
  assert.ok(limited, `${file}: connect-src is ${connect ? connect.join(' ') : 'absent'}, and with no connect-src the connection control falls back to default-src, which is ${fallback.join(' ') || 'absent'}; under CSP Level 3 "directive fallback" (https://www.w3.org/TR/CSP3/#directive-fallback-list) neither limits connections to 'self'`);
});

// K-170: a one-day image rule is named for each shipped image, so a missing image path matches none. Cloudflare JOINS the values of every matching
// rule, so a wildcard image rule could never sit beside a named one.
test('a missing .jpg, .png or .svg path matches no one-day Cache-Control rule, and every shipped image has a rule of its own (K-170)', () => {
  const file = process.env.KOLWEN_HEADERS_FILE || join(ROOT, 'web', '_headers');
  const rules = parseHeadersFile(readFileSync(file, 'utf8'));
  const oneDay = rules.filter(r => r.headers.some(h => h.name === 'Cache-Control' && /max-age=86400/.test(h.value)));
  for (const missing of ['/no-such-image.jpg', '/no-such-image.png', '/no-such-image.svg']) {
    const hits = oneDay.filter(r => patternMatches(r.pattern, missing)).map(r => r.pattern);
    assert.deepEqual(hits, [], `${file}: ${missing} matches a one-day rule`);
  }
  assert.deepEqual(oneDay.filter(r => r.pattern.includes('*')).map(r => r.pattern), [], `${file}: no one-day rule is a wildcard`);
  for (const shipped of ['/og.jpg', '/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', '/band-404.svg', '/band-home.svg']) {
    assert.ok(oneDay.some(r => r.pattern === shipped), `${file}: ${shipped} has its own named one-day rule`);
  }
});
