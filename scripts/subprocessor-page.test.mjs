// Tests for the subprocessor page (web/subprocessors.html, generated from web-src/pages/subprocessors.html), shipped dark: no link to it, no sitemap entry,
// and a noindex meta that surface-check rule 16 exempts by name. Read-only: nothing here writes web/ or reaches the network. Run: node --test scripts/subprocessor-page.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeAttribute } from './lib/rendered-text.mjs';
import { htmlTokens } from './lib/html-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
const NOINDEX = /<meta name="robots" content="noindex">/;

// Every spelling a link can take, in the attributes a browser follows a URL from: href (a link), src (a script, an image, a frame), action
// (a form), formaction (a button), poster (a video frame) and data (an object), and the url= of a refresh meta, whatever the order of its
// attributes and whether its values are quoted. Any quotes or none, any case, a trailing slash, .html, the full origin, a query or a fragment,
// a character reference in a value (decoded once, as the browser decodes it; an unknown named reference is kept as written), a
// percent-encoded path (decoded before it is compared), a relative path (resolved against a page of the site), and a trailing dot on the host.
const LINK_ATTR = /\s(?:href|src|action|formaction|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const SITE = 'https://kolwen.com/index.html';
// decodeAttribute throws on a named reference it does not know, so such a reference is held back as text and comes out as written.
const decodeHref = s => decodeAttribute(s.replace(/&([a-z][a-z0-9]*);/gi, (m, name) => {
  try { decodeAttribute(m); return m; } catch { return '&amp;' + name + ';'; }
}));
// the refresh metas, read by the tokenizer (their own attributes only, in any order); http-equiv is decoded once before it is compared, and the
// content is decoded once, as the browser decodes it, before its url= is read; the url read from it is not decoded again
// read with scripting on (a noscript's body is raw text, so a meta inside it is not a tag) and with scripting off (it is markup): both count.
// A meta outside any noscript is read by both modes, so the targets are a set: one meta, one target.
const refreshTargets = text => [...new Set([htmlTokens(text), htmlTokens(text, { scripting: false })].flatMap(tokens => tokens
  .filter(t => t.type === 'tag' && !t.closing && t.name === 'meta')
  .filter(t => decodeHref(t.attrs.get('http-equiv') ?? '').trim().toLowerCase() === 'refresh')
  .map(t => t.attrs.get('content'))
  .filter(c => c !== undefined)
  .map(c => (decodeHref(c).match(/url\s*=\s*["']?([^"']+)/i) || [])[1])
  .filter(Boolean)))];
const hrefsIn = text => [...[...text.matchAll(LINK_ATTR)].map(m => decodeHref(m[1] ?? m[2] ?? m[3])), ...refreshTargets(text)];
const resolvesTo = (href, target, base = SITE) => {
  let u;
  try { u = new URL(href.trim(), base); } catch { return false; }
  const host = u.hostname.replace(/\.$/, '');
  if (host !== 'kolwen.com' && host !== 'www.kolwen.com') return false;
  let path;
  try { path = decodeURIComponent(u.pathname); } catch { return false; }
  return path.replace(/\/+$/, '').replace(/\.html$/i, '').toLowerCase() === target;
};
// A head link (canonical or alternate) names the page itself; it is not a link to it (ORDER 1017j).
const linksTo = (text, target) => hrefsIn(text.replace(/<link\b[^>]*\brel="(?:canonical|alternate)"[^>]*>/gi, '')).filter(h => resolvesTo(h, target));

// A page's own language switch (a.lang-link) is a link to its twin, the other dark page, so it is not a link from elsewhere. The generator writes the switch as
// class then href. The exemption is only the twin's own switch, on the twin's own page (K-152): web/subprocessors.html and web/th/subprocessors.html, and the same
// pair for /legal. Its switch blocks (the header's and the footer's) are cut out by position, and only a block that holds exactly that one link is cut; any other
// page, and any block with another href, stays in the text, so every link in it is scanned.
const TWIN = { '/subprocessors': 'web/th/subprocessors.html', '/th/subprocessors': 'web/subprocessors.html', '/legal': 'web/th/legal.html', '/th/legal': 'web/legal.html' };
const CLOSE_DIV = '</div>';
const withoutOwnSwitches = (text, t) => {
  let out = '', i = 0;
  for (;;) {
    const a = text.indexOf('<div class="lswitch"', i);
    if (a < 0) return out + text.slice(i);
    const b = text.indexOf(CLOSE_DIV, a);
    if (b < 0) return out + text.slice(i);
    const end = b + CLOSE_DIV.length, block = text.slice(a, end);
    const own = block.split('href="').length === 2 && block.includes('class="lang-link" href="' + t + '"');
    out += text.slice(i, own ? a : end);
    i = end;
  }
};
const unexplainedHits = (text, file, targets) => targets.flatMap(t => {
  const scanned = TWIN[t] === file ? withoutOwnSwitches(text, t) : text;
  return linksTo(scanned, t).map(h => file + ' href="' + h + '"');
});

// The no-link scan over one tree: the pages, both language directories, the page templates and the shared block module. A test can plant a link in a copy
// of the tree and run the same scan, so each check is seen to report what it claims to (K-152).
const scanRoot = (root, targets) => {
  const sources = [
    ...readdirSync(join(root, 'web')).filter(f => f.endsWith('.html')).map(f => 'web/' + f),
    ...readdirSync(join(root, 'web', 'th')).filter(f => f.endsWith('.html')).map(f => 'web/th/' + f),
    ...readdirSync(join(root, 'web-src', 'pages')).map(f => 'web-src/pages/' + f),
    'scripts/lib/legal-render.mjs',
  ];
  return sources.flatMap(f => unexplainedHits(readFileSync(join(root, f), 'utf8'), f, targets));
};
// A temporary copy of the parts scanRoot reads; plant(dir) changes the copy, and the caller removes it.
const copyTree = plant => {
  const dir = mkdtempSync(join(tmpdir(), 'kolwen-subproc-'));
  cpSync(join(ROOT, 'web'), join(dir, 'web'), { recursive: true });
  cpSync(join(ROOT, 'web-src'), join(dir, 'web-src'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts', 'lib', 'legal-render.mjs'), join(dir, 'scripts', 'lib', 'legal-render.mjs'));
  plant(dir);
  return dir;
};
// Inserts text before the first occurrence of a marker in one file of the copy (no regular expression: the marker is a plain string).
const plantBefore = (dir, file, marker, add) => {
  const p = join(dir, file), text = readFileSync(p, 'utf8'), i = text.indexOf(marker);
  assert.ok(i >= 0, file + ' holds the marker ' + marker);
  writeFileSync(p, text.slice(0, i) + add + text.slice(i));
};

test('the subprocessor page is generated, carries noindex, and is in neither the sitemap nor any link', () => {
  assert.ok(existsSync(join(ROOT, 'web', 'subprocessors.html')), 'web/subprocessors.html is generated by node scripts/legal-pages.mjs --write');
  assert.match(read('web/subprocessors.html'), NOINDEX);
  assert.doesNotMatch(read('web/sitemap.xml'), /\/subprocessors</, 'not in the sitemap while dark');
  // both language directories are scanned, and both addresses of the page are targets (CodeRabbit 4601272494)
  const hits = scanRoot(ROOT, ['/subprocessors', '/th/subprocessors']);
  assert.deepEqual(hits, [], 'no page, template or shared block links to the subprocessor page');
});

test('the no-link check reads every spelling of a link, and reports none that points elsewhere', () => {
  const spellings = [
    "<a href='/subprocessors'>x</a>", '<a href=/subprocessors>x</a>', '<a HREF="/Subprocessors/">x</a>',
    '<a href="/subprocessors.html?lang=th#top">x</a>', '<a href="https://kolwen.com/subprocessors">x</a>', '<a href="./subprocessors">x</a>',
  ];
  for (const s of spellings) assert.equal(linksTo(s, '/subprocessors').length, 1, s);
  for (const s of ['<a href="/subprocessors-old">x</a>', '<a href="/subprocessors/x">x</a>', '<a href="https://example.com/subprocessors">x</a>']) assert.equal(linksTo(s, '/subprocessors').length, 0, s);
});

test('the no-link check decodes character references in an href and resolves a relative one', () => {
  const missed = [
    '<a href="&#x2f;subprocessors">x</a>', '<a href="/sub&#112;rocessors">x</a>', '<a href="&#47;subprocessors">x</a>',
    '<a href="../subprocessors">x</a>', '<a href="./../subprocessors/?x=1#y">x</a>',
  ];
  assert.deepEqual(missed.filter(s => linksTo(s, '/subprocessors').length !== 1), [], 'spellings of a link to the page that the check misses');
  const passed = ['<a href="../subprocessors-old">x</a>', '<a href="&#x2f;subprocessors-old">x</a>'];
  assert.deepEqual(passed.filter(s => linksTo(s, '/subprocessors').length !== 0), [], 'spellings that do not link to the page that the check reports');
});

test('the no-link check keeps an unknown reference as written and decodes the path before it compares', () => {
  // an unrelated href with an unknown named reference is no link to the page, and the check does not fail on it
  const unrelated = '<a href="https://example.com/?x=1&campaign;">x</a>';
  assert.doesNotThrow(() => linksTo(unrelated, '/subprocessors'));
  assert.deepEqual(linksTo(unrelated, '/subprocessors'), []);
  // a percent-encoded path is the path it encodes
  assert.equal(linksTo('<a href="/sub%70rocessors">x</a>', '/subprocessors').length, 1);
  // a malformed escape is not a match, and is not an error
  assert.deepEqual(linksTo('<a href="/%E0%A4%A">x</a>', '/subprocessors'), []);
});

test('the no-link check reads a src, an action and a refresh target, and a host with a trailing dot', () => {
  const missed = [
    '<script src="/subprocessors"></script>',
    "<form action='../subprocessors'></form>",
    '<meta http-equiv="refresh" content="0; url=/subprocessors">',
    '<a href="https://kolwen.com./subprocessors">x</a>',
    '<img src="https://kolwen.com./subprocessors/?x=1">',
  ];
  assert.deepEqual(missed.filter(s => linksTo(s, '/subprocessors').length !== 1), [], 'spellings of a link to the page that the check misses');
  const passed = ['<script src="https://example.com./subprocessors"></script>', '<meta http-equiv="refresh" content="0; url=/terms">'];
  assert.deepEqual(passed.filter(s => linksTo(s, '/subprocessors').length !== 0), [], 'spellings that do not link to the page that the check reports');
});

test('an unknown reference survives as written in the decoded href', () => {
  assert.deepEqual(hrefsIn('<a href="/a?x=1&campaign;">x</a>'), ['/a?x=1&campaign;']);
});

test('the no-link check reads formaction, poster, object data and any refresh meta, and decodes a refresh url once', () => {
  const missed = [
    '<button formaction="/subprocessors">x</button>',
    '<video poster="/subprocessors"></video>',
    '<object data="/subprocessors"></object>',
    '<meta content="0; url=/subprocessors" http-equiv="refresh">',
    '<meta http-equiv=refresh content=0;url=/subprocessors>',
  ];
  assert.deepEqual(missed.filter(s => linksTo(s, '/subprocessors').length !== 1), [], 'spellings of a link to the page that the check misses');
  const passed = ['<meta http-equiv="refresh" content="0; url=/&amp;#115;ubprocessors">', '<button formaction="/terms">x</button>'];
  assert.deepEqual(passed.filter(s => linksTo(s, '/subprocessors').length !== 0), [], 'spellings that do not link to the page, or that a browser reads once');
});

test('a refresh meta is read from its own attributes, and its http-equiv is decoded once', () => {
  assert.deepEqual(linksTo('<meta data-x="content=0; url=/subprocessors" http-equiv="refresh" content="0; url=/terms">', '/subprocessors'), []);
  assert.equal(linksTo('<meta http-equiv="refr&#101;sh" content="0; url=/subprocessors">', '/subprocessors').length, 1);
});

test('the subprocessor page is read as prose, and loads nothing from another origin', () => {
  const html = read('web/subprocessors.html');
  assert.match(html, /<html lang="en" data-job="prose">/);
  const urls = [...html.matchAll(/<(?:script|img|iframe)[^>]*\ssrc="([^"]*)"/gi)].map(m => m[1]).concat([...html.matchAll(/<link[^>]*\shref="([^"]*)"/gi)].map(m => m[1]));
  for (const u of urls) assert.ok(!/^(?:https?:)?\/\//.test(u) || u.startsWith('https://kolwen.com/'), 'loads ' + u);
});

test('rule 16 exempts exactly the three noindex pages by name, and no other production page carries noindex', () => {
  const set = /const NOINDEX_META_OK = new Set\(\[([^\]]*)\]\);/.exec(read('scripts/surface-check.mjs'));
  assert.ok(set, 'surface-check.mjs names the noindex exemption set');
  const OK = ['web/404.html', 'web/legal.html', 'web/subprocessors.html', 'web/th/404.html', 'web/th/legal.html', 'web/th/subprocessors.html'];
  assert.deepEqual([...set[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort(), [...OK].sort());
  const pages = [...readdirSync(join(ROOT, 'web')).filter(f => f.endsWith('.html')), ...readdirSync(join(ROOT, 'web', 'th')).filter(f => f.endsWith('.html')).map(f => 'th/' + f)];
  for (const f of pages.filter(f => !OK.includes('web/' + f))) {
    assert.doesNotMatch(read('web/' + f), NOINDEX, 'web/' + f + ' must stay indexable');
  }
});

test('a refresh meta inside a noscript is read: the no-link check scans with scripting off as well as on', () => {
  assert.equal(linksTo('<noscript><meta http-equiv="refresh" content="0; url=/subprocessors"></noscript>', '/subprocessors').length, 1);
});

// The legal hub is dark: noindex, out of the sitemap, and linked from no page, template or shared block (the same rule as the subprocessor page,
// named for /legal). KOLWEN_SITE_ROOT, when set, is the tree the witness reads instead of this repository: a test-only way to hold a temporary copy
// with a planted link or sitemap entry to the same assertion.
test('the legal hub is dark: noindex, no sitemap entry, and no page, template or shared block links to /legal', () => {
  const SITE = process.env.KOLWEN_SITE_ROOT || ROOT;
  const readSite = f => readFileSync(join(SITE, f), 'utf8');
  assert.match(readSite('web/legal.html'), NOINDEX);
  assert.doesNotMatch(readSite('web/sitemap.xml'), /\/legal</, 'no sitemap entry names the legal hub');
  // both language directories are scanned, and both addresses of the hub are targets (CodeRabbit 4601272494)
  const hits = scanRoot(SITE, ['/legal', '/th/legal']);
  assert.deepEqual(hits, [], 'no page, template or shared block links to the legal hub');
});

// ── K-152: a language-switch link to a dark page is not exempt on a public page. Each planted link is a hit, on an English and on a Thai page ──────────
const DARK = ['/subprocessors', '/th/subprocessors', '/legal', '/th/legal'];
const SWITCH = t => '<a class="lang-link" href="' + t + '" lang="en" hreflang="en">x</a>';
for (const t of DARK) for (const f of ['web/index.html', 'web/th/index.html']) {
  test(`K-152: a language-switch link to ${t} on ${f}, a public page and not that page's twin, is a hit`, () => {
    const dir = copyTree(d => plantBefore(d, f, '</main>', SWITCH(t)));
    try {
      const hits = scanRoot(dir, DARK);
      assert.ok(hits.includes(f + ' href="' + t + '"'), 'the planted switch-shaped link is reported: ' + JSON.stringify(hits));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
test('K-152: a switch-shaped link to /legal on the subprocessor page is a hit: only its own twin is exempt', () => {
  const dir = copyTree(d => plantBefore(d, 'web/subprocessors.html', '</main>', SWITCH('/legal')));
  try {
    const hits = scanRoot(dir, ['/legal', '/th/legal']);
    assert.ok(hits.includes('web/subprocessors.html href="/legal"'), JSON.stringify(hits));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('K-152 control: a plain link to /subprocessors on a public page is a hit', () => {
  const dir = copyTree(d => plantBefore(d, 'web/index.html', '</main>', '<a href="/subprocessors">x</a>'));
  try {
    const hits = scanRoot(dir, DARK);
    assert.ok(hits.includes('web/index.html href="/subprocessors"'), JSON.stringify(hits));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
