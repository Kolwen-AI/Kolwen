// The rendered checks (build-qc.md W-A11Y-07, W-FMT-11, and the CSP the pages are served under), in a real headless browser, over every page of web/ in both languages:
//   reflow   a 320 CSS px wide viewport has no horizontal scroll (WCAG 2.2 SC 1.4.10): documentElement.scrollWidth <= clientWidth.
//   zoom     text at 200% (SC 1.4.4): the root font-size is set to 200%, as the visitor's own setting does, on a 1280 px window, and then
//            - the page does not scroll sideways, and
//            - no element's text is cut: an element with overflow hidden or clip whose content is larger than its box, and a text rectangle that sticks out of an ancestor that clips. Nothing else is
//              measured: a box that grows with its text is not a loss, and text a script moves is not read.
//   csp      the browser reports no Content-Security-Policy violation while the page loads under the real headers (a hash that no longer matches shows here, in a real browser). Only a CSP violation
//            fails it. What the browser says about the Permissions-Policy header (a feature name it does not know) is printed on a separate NOTE line and never fails the run.
// Each file is one language (web/<page>.html English, web/th/<page>.html Thai): nothing is clicked, and a page whose html lang is not its file's language fails (check name: language).
// And for the reading theme (layout-tokens.mjs), on the pages that declare data-job="prose", in the light and the dark colour scheme, each emulated on its own:
//   theme      the ground is the solid colour of the scheme (no background image), and the page says it supports both schemes;
//   contrast   every element that holds text has a computed text colour against the colour it really sits on of at least 4.5:1, or 3:1 for large text (SC 1.4.3). A translucent colour is composited
//              over what lies beneath it, up to the first opaque ground; the element's own opacity counts; a disabled control is exempt, as the standard exempts it. A background IMAGE is not
//              read (the reading theme has none; the default pages' faint gradient is outside this check);
//   lineheight the computed line height of the text of a prose page is at least 1.5 times its font size in the English document, and 1.65 in the Thai one (W-I18N-09, SC 1.4.8 as a target).
//   measure    no rendered line of Latin text in a prose page holds more than 80 characters (SC 1.4.8 as a target, never claimed as met). The line is read from the browser: each word of a text node is
//              asked for its box, the boxes are grouped into lines by their top, and the characters of a line are its words and the spaces between them. The Thai document is MEASURED, never failed:
//              Thai sets no spaces between words, so the WCAG character count does not transfer (W-I18N-14); its words are the ICU word segments (Intl.Segmenter, a dictionary), and what is recorded is the
//              column width in em of the Thai font size, and the characters per line, so a measure is taken from the rendered column and never borrowed from the Latin number.
// And for every page, the other way: a page that declares data-job="default" does not carry the reading theme's color-scheme, so the theme has not leaked into it (that the default pages
// render as they did is shown by comparing their screenshots, not by this check).
// And for every page, a resource asked for by host name: the browser resolves no host name (browser.mjs), so such a resource fails with net::ERR_NAME_NOT_RESOLVED, and that is a finding (check name:
// resources), never a silent miss.
// The pages are answered by scripts/lib/static-server.mjs (over HTTP, or over the DevTools channel for a browser that cannot reach a server on this machine) and driven by scripts/lib/browser.mjs
// (DevTools protocol over Node's own WebSocket; no dependency).
//
// WHERE IT RUNS. On Linux and macOS: the Chrome, Chromium or Edge found on the machine (scripts/lib/browser.mjs MAC and LINUX_NAMES; Edge is started with msImplicitSignin off, so it signs no account in). On Windows: the Blink headless shell INSIDE WSL (scripts/lib/wsl-route.mjs), never a Windows browser. With no route
// on this machine the run says so in one line and exits 3, "not run here": never a pass, and the pass is the pull request's CI (the rendered job) or a person's own browser looking at the pages. In
// CI (CI=true) a missing browser FAILS (exit 1): a silent skip in CI is the one outcome this script refuses.
// Exit codes: 0 passed, 1 findings (or no browser in CI), 2 a bad argument, 3 not run here.
// And for every page, in both languages, the Thai text is drawn by the site's own Thai face (check name: glyphs):
//   glyphs   every rendered element whose own text holds a Thai character (U+0E01-U+0E5B) is read for the faces the browser drew it with (the DevTools protocol's
//            CSS.getPlatformFontsForNode, which names each face's familyName, isCustomFont and glyphCount). It fails when a face that is not one the site ships (KW Sans Thai, KW Mono;
//            a system or browser default) drew it, or when no shipped KW Sans Thai face with glyphs draws it (the tofu case: a Latin face and no Thai one). A Latin face beside KW Sans Thai is
//            fine: KW Mono's unicode-range keeps Thai out of it. LIMIT: the protocol reports faces per ELEMENT, not per character, so a Thai character shaped by a face the site ships but that
//            lacks the glyph, in an element that also holds a face with Thai, is not seen; hidden text (the other language's document) is not read.
// And for every page, in both languages, the header's keyboard and layout (the header specs C1 to C4; check names: skip, header, keys). Each starts from a fresh load in its language:
//   skip     at rest the page's skip link (C1) is clipped away, not hidden, and its accessible name is the catalogue's shared.skip; the first Tab from a fresh load focuses it, inside the
//            viewport and unclipped; Enter on it moves focus to main#main; the other language's copy is display:none (out of the tab order). LIMIT: one viewport height (400 px), not every
//            height. Its contrast is NOT read here: the focused link takes the body's own pair (--txt on --bg), which the contrast check reads on the prose pages only, so on the default pages
//            the pair is named, not measured.
//   header   at 320 CSS px the header's visible items sit on at most two rows (C3's trigger for the menu decision) and each is inside the viewport; each header link's visible text is in its
//            accessible name (WCAG 2.5.3, Label in Name); no two header links share a name. LIMIT: the names are the page's aria-label or text, not the browser's full name computation.
//   keys     Tab from a fresh load visits the skip link, the mark, Pricing, English and ไทย in that order (C4); Space and Enter on the other language move the html lang and the focus to the
//            same-language header button now shown, and leave the scroll position unchanged; the language already shown changes neither. LIMIT: the scroll is 200 px into the page, so a page shorter
//            than 300 px fails as "cannot be read" rather than passing.
//   Not checked here (C1 to C4 list them): the dark and light schemes for the header checks (default scheme only), the Tab after Enter into main, axe and the Nu checker, text spacing at 320 px, visual order after wrapping, the footer's language toggle, a throwing localStorage, and keyboard traps.
// Usage: node scripts/rendered-check.mjs [--web <dir>] [--only reflow,zoom,csp,theme,contrast,lineheight,measure,glyphs,skip,header,keys] [--no-headers]
import { isMainModule } from './lib/entry-guard.mjs'; // by real path: a run through a junction or a symlink still runs
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { htmlPages } from './lib/web-files.mjs';
import { findRoute, launchBrowser, foreignCookies, EXIT_NOT_RUN_HERE, NAME_NOT_RESOLVED } from './lib/browser.mjs';
import { READING } from './lib/layout-tokens.mjs';
import { parseColor } from './lib/contrast.mjs';
import { reportField } from './lib/report-field.mjs';

export const ALL_CHECKS = ['reflow', 'zoom', 'csp', 'theme', 'contrast', 'lineheight', 'measure', 'glyphs', 'skip', 'header', 'keys', 'lang-url', 'm5', 'fragment'];
const READING_CHECKS = ['theme', 'contrast', 'lineheight', 'measure'];
export const MAX_LATIN_CHARS = 80; // SC 1.4.8 (AAA), the target the reading theme holds itself to
export const urlPathOf = file => (file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '').replace(/\/index$/, '/'));
// One language per file: web/th/* is Thai, every other page English (ORDER 1017j, one language per URL).
const langOf = file => (file.startsWith('th/') ? 'th' : 'en');

// ── page-side measurements, as functions whose source is sent to the page ────────────────────────────────────────
function measureReflow() {
  const de = document.documentElement;
  const over = [];
  if (de.scrollWidth > de.clientWidth) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 1) over.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' ends at ' + Math.round(r.right));
      if (over.length >= 4) break;
    }
  }
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, over };
}

function measureZoom() {
  const issues = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) issues.push('the page scrolls sideways: scrollWidth ' + de.scrollWidth + ' > clientWidth ' + de.clientWidth);
  const clips = v => v === 'hidden' || v === 'clip';
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const textRects = el => {
    const rects = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rc of range.getClientRects()) if (rc.width > 0 && rc.height > 0) rects.push(rc);
      }
    }
    return rects;
  };
  let read = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rects = textRects(el);
    if (!rects.length) continue;
    read++;
    if ((clips(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) || (clips(cs.overflowY) && el.scrollHeight > el.clientHeight + 1)) {
      issues.push('text is cut by its own box: ' + name(el) + ' (content ' + el.scrollWidth + 'x' + el.scrollHeight + ' in a box of ' + el.clientWidth + 'x' + el.clientHeight + ')');
    }
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (!clips(ac.overflowX) && !clips(ac.overflowY)) continue;
      const box = a.getBoundingClientRect();
      const left = box.left + a.clientLeft, top = box.top + a.clientTop, right = left + a.clientWidth, bottom = top + a.clientHeight;
      if (rects.some(rc => (clips(ac.overflowX) && (rc.left < left - 1 || rc.right > right + 1)) || (clips(ac.overflowY) && (rc.top < top - 1 || rc.bottom > bottom + 1)))) {
        issues.push('text of ' + name(el) + ' is cut by ' + name(a));
        break;
      }
    }
  }
  return { issues: issues.slice(0, 6), read };
}

function measureContrast() {
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = c => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const ratio = (f, b) => { const x = lum(over(f, b)), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const groundOf = el => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; } }
    let base = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 255, g: 255, b: 255, a: 1 };
    while (layers.length) base = over(layers.pop(), base);
    return base;
  };
  const opacityOf = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  let read = 0, worst = Infinity;
  const fails = [];
  for (const el of document.body.querySelectorAll('*')) {
    let own = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) own = true;
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest(':disabled')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    fg.a *= opacityOf(el);
    const bg = groundOf(el);
    const fontPx = parseFloat(cs.fontSize), large = fontPx >= 24 || (fontPx >= 18.66 && Number(cs.fontWeight) >= 700);
    const value = ratio(fg, bg), floor = large ? 3 : 4.5;
    read++;
    worst = Math.min(worst, value);
    if (value < floor) fails.push(name(el) + ' ' + value.toFixed(2) + ':1 (floor ' + floor + ') ' + cs.color + ' on rgb(' + Math.round(bg.r) + ', ' + Math.round(bg.g) + ', ' + Math.round(bg.b) + ')');
  }
  return { read, worst: Number.isFinite(worst) ? worst : null, fails: fails.slice(0, 6), failCount: fails.length };
}

function measureLineHeights(rootSelector) {
  const root = document.querySelector(rootSelector);
  const rows = [];
  for (const el of root.querySelectorAll('h1, h2, h3, p, li')) {
    let own = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) own = true;
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
    rows.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className : '', ratio: Number.isFinite(lh) ? lh / fs : null });
  }
  return rows;
}

function measureLines(rootSelector, locale) {
  const root = document.querySelector(rootSelector);
  const seg = locale === 'th' ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const blocks = new Map();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || getComputedStyle(el).display === 'none') continue;
    const block = el.closest('p, li, h1, h2, h3');
    if (!block || (block.classList.contains('pending') && !seg)) continue;
    // the Thai document holds Thai sentences and, where a source is English, English ones: the Thai measure is taken from the blocks that are Thai script
    if (seg && !/\p{Script=Thai}/u.test(block.textContent)) continue;
    const text = n.nodeValue;
    const pieces = seg ? [...seg.segment(text)].filter(s => s.isWordLike).map(s => [s.index, s.index + s.segment.length]) : [...text.matchAll(/\S+/g)].map(m => [m.index, m.index + m[0].length]);
    for (const [a, b] of pieces) {
      const range = document.createRange();
      range.setStart(n, a);
      range.setEnd(n, b);
      // a word that the browser breaks across lines has one box per line: its characters are shared between them by the width of each box
      const rects = [...range.getClientRects()].filter(r => r.width >= 1);
      if (!rects.length) continue;
      if (!blocks.has(block)) blocks.set(block, []);
      const total = rects.reduce((s, r) => s + r.width, 0);
      rects.forEach((rect, i) => blocks.get(block).push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, chars: (b - a) * (rect.width / total), first: i === 0 }));
    }
  }
  const lines = []; // { chars, block }
  let tall = 0;
  for (const [block, words] of blocks) {
    words.sort((x, y) => x.top - y.top || x.left - y.left);
    let cur = null;
    const lh = parseFloat(getComputedStyle(block).lineHeight) || 20;
    for (const w of words) {
      if (cur && w.top - cur.top < lh * 0.6) { cur.chars += w.chars + (seg || !w.first ? 0 : 1); cur.left = Math.min(cur.left, w.left); cur.right = Math.max(cur.right, w.right); } else { cur = { top: w.top, chars: w.chars, left: w.left, right: w.right, block }; lines.push(cur); }
    }
    tall += words.length ? 1 : 0;
  }
  // a line that is the last of its block is short by nature and is left out of the average, not out of the maximum
  const last = new Set();
  for (const [block] of blocks) { const mine = lines.filter(l => l.block === block); if (mine.length) last.add(mine[mine.length - 1]); }
  const full = lines.filter(l => !last.has(l));
  // the column is the text column: the box less its own inline padding (the 33em column is the max-width of the content, the inset sits outside it)
  const colCs = getComputedStyle(root);
  const col = root.getBoundingClientRect().width - parseFloat(colCs.paddingLeft) - parseFloat(colCs.paddingRight);
  const fontPx = parseFloat(getComputedStyle(root.querySelector('.legal p, .legal li') || root.querySelector('p, li')).fontSize); // the BODY text (a subtitle or a note before it is not the body)
  return { lines: lines.length, max: lines.reduce((m, l) => Math.max(m, l.chars), 0), average: full.length ? full.reduce((s, l) => s + l.chars, 0) / full.length : null, columnPx: col, fontPx, columnEm: col / fontPx };
}

function measureTheme() {
  const cs = getComputedStyle(document.body);
  return { job: document.documentElement.dataset.job ?? null, image: cs.backgroundImage, color: cs.backgroundColor, scheme: getComputedStyle(document.documentElement).colorScheme };
}

// ── glyphs: the Thai text of the page, by the face the browser drew each element's text with ──────────────────────────────────────────────────────
export const SITE_FACES = ['KW Sans Thai', 'KW Mono'];
export const SITE_THAI_FACE = 'KW Sans Thai';
// Page side: tags each rendered element whose own text holds a Thai character, once, in document order. A hidden element (the other language's document) has no client rect and is not read.
function tagThaiElements() {
  const found = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/[ก-๛]/.test(n.nodeValue)) continue;
    const el = n.parentElement;
    if (!el || el.hasAttribute('data-glyph-probe') || el.closest('script,style,noscript,template')) continue;
    if (el.getClientRects().length === 0) continue;
    el.setAttribute('data-glyph-probe', String(found.length));
    found.push({ tag: el.tagName.toLowerCase(), sample: n.nodeValue.trim().slice(0, 40) });
  }
  return found;
}
// The verdict on one element's faces (CSS.getPlatformFontsForNode's fonts): null when the site's own Thai face draws it and no other face but the site's own does, else the reason.
// A face is the site's own when the browser loaded it from a @font-face (isCustomFont) under one of the site's family names. The protocol reports a weight of a family under
// the name that the font file carries (KW Sans Thai SmBld, KW Sans Thai Medm), so the name matches as the family or the family followed by a space.
const isSiteFace = f => f.isCustomFont && SITE_FACES.some(s => f.familyName === s || (f.familyName || '').startsWith(s + ' '));
export function glyphVerdict(fonts) {
  const shipped = fonts.filter(isSiteFace);
  const other = fonts.filter(f => !shipped.includes(f));
  if (other.length) return `a face the site does not ship draws it (${other.map(f => reportField(f.familyName || 'unnamed')).join(', ')})`;
  const thai = shipped.find(f => f.familyName === SITE_THAI_FACE || (f.familyName || '').startsWith(SITE_THAI_FACE + ' '));
  if (!thai || !(thai.glyphCount > 0)) return `no ${SITE_THAI_FACE} face draws it (the faces: ${fonts.length ? fonts.map(f => reportField(f.familyName || 'unnamed')).join(', ') : 'none'})`;
  return null;
}
// Node side: each tagged element with the faces the protocol reports for it; the tags are removed again, so the page is left as it was.
export async function thaiElementFaces(page) {
  const tags = await page.evaluate(`(${tagThaiElements})()`);
  try {
    // The layout is forced and every font is loaded before the faces are read: a Thai face still loading would read as the fallback it is about to replace.
    await page.evaluate('(() => { void document.body.offsetWidth; return document.fonts.ready.then(() => true); })()');
    await page.send('DOM.enable');
    await page.send('CSS.enable');
    const { root } = await page.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-glyph-probe]' });
    const out = [];
    for (const nodeId of nodeIds) {
      // One element the browser cannot read (a node removed by a page update, say) is recorded as that element's own failure, and the run goes on to the next element.
      try {
        const { attributes } = await page.send('DOM.getAttributes', { nodeId });
        const at = attributes.indexOf('data-glyph-probe');
        const tag = tags[Number(attributes[at + 1])];
        const { fonts } = await page.send('CSS.getPlatformFontsForNode', { nodeId });
        out.push({ ...tag, fonts });
      } catch (e) {
        out.push({ tag: 'element', sample: '', fonts: null, error: e && e.message ? String(e.message) : String(e) });
      }
    }
    return out;
  } finally {
    await page.evaluate(`(() => { document.querySelectorAll('[data-glyph-probe]').forEach(e => e.removeAttribute('data-glyph-probe')); return true; })()`);
  }
}

// ── skip, header, keys: the header's keyboard and layout (the header specs C1 to C4, the design seat's order 2026-11-16b) ────────────────────────
// Every such check starts from a FRESH load in the language it measures: the language is put in the store and the page is loaded again, so the page script applies it on load and
// nothing is clicked (a click moves focus, which is the thing being checked). Keys go through Input.dispatchKeyEvent, so the browser's own key handling moves focus and presses.
// The catalogue strings come from web-src/i18n (the file, never a copy here); the header's names and order are read from the page.
const CATALOGUE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web-src', 'i18n');
const HEADER_CHECKS = ['skip', 'header', 'keys'];
const KEY_CODES = { Tab: { code: 'Tab', vk: 9 }, Enter: { code: 'Enter', vk: 13, text: '\r' }, Space: { code: 'Space', vk: 32, text: ' ' } };
// The store is cleared first: one page holds one browser context, and a press in an earlier case saves its language there, which would otherwise greet the next "fresh" load.
async function freshLoad(page, origin, path, lang, width = 1280, height = 400) {
  await page.setViewport(width, height);
  await page.goto(origin + path);
  await page.evaluate(`(() => { try { localStorage.removeItem('kolwen-lang'); } catch (e) {} return true; })()`);
  await page.goto(origin + path); // the page script reads the store on this load, so it sees the cleared one
  if (lang === 'th') {
    await page.evaluate(`(() => { try { localStorage.setItem('kolwen-lang', 'th'); } catch (e) {} return true; })()`);
    await page.goto(origin + path);
  }
}
async function pressKey(page, name) {
  const k = KEY_CODES[name];
  const base = { key: name === 'Space' ? ' ' : name, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk };
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(k.text ? { text: k.text, unmodifiedText: k.text } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
// What holds focus, named: a skip link by its language, the header's mark, its Pricing link, a header language button by its own language and the nav's language, or main.
function focusInfo() {
  const el = document.activeElement;
  if (!el || el === document.body) return { kind: 'body' };
  let kind = 'other:' + el.tagName.toLowerCase();
  if (el.matches('a.skip')) kind = 'skip:' + el.getAttribute('lang');
  else if (el.matches('.site-header a.hmark')) kind = 'mark';
  else if (el.matches('.site-header a:not(.lang-link)[href="/pricing"], .site-header a:not(.lang-link)[href="/th/pricing"]')) kind = 'pricing';
  else if (el.matches('.site-header a.lang-link')) kind = 'lang:' + el.getAttribute('hreflang');
  else if (el.tagName === 'MAIN') kind = 'main:' + el.id;
  const r = el.getBoundingClientRect();
  // The effective opacity: the product of the element's own and its ancestors' opacity (a focused link at opacity 0 is invisible, whatever its colour).
  let opacity = 1;
  for (let e = el; e; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
  return { kind, opacity, rect: { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }, clip: getComputedStyle(el).clipPath, vw: document.documentElement.clientWidth, vh: window.innerHeight };
}
// Presses Tab until the focus is `kind`, and returns that focus. When it is not reached, the focus returned is the last one, and `path` names every focus the presses passed.
async function tabTo(page, kind, max = 6) {
  const path = [];
  for (let i = 0; i <= max; i++) {
    const f = await page.evaluate(`(${focusInfo})()`);
    path.push(f.kind);
    if (f.kind === kind) return { ...f, path };
    if (i < max) await pressKey(page, 'Tab');
  }
  return { ...(await page.evaluate(`(${focusInfo})()`)), path };
}
// The skip link at rest: its copies, which of them is shown, and the clip of the shown one.
function skipRest(lang) {
  const shown = document.querySelector('a.skip[lang="' + lang + '"]');
  const cs = shown ? getComputedStyle(shown) : null;
  // The hit test: at rest, the browser must not hit the link at its centre. A clip-path that clips nothing (inset(0px)) passes the clip test and fails this one.
  let restHit = false;
  if (shown) {
    const r = shown.getBoundingClientRect();
    const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    restHit = !!h && (h === shown || shown.contains(h));
  }
  return { shown: !!shown, clip: cs ? cs.clipPath : null, display: cs ? cs.display : null, restHit };
}
// The header's visible items at the current width: the rows they sit on, whether any is outside the viewport, each link's visible text against its accessible name, and repeated names.
function measureHeader() {
  const navs = [...document.querySelectorAll('.site-header nav')].filter(n => n.getClientRects().length > 0);
  const nav = navs[0];
  if (!nav) return { navs: 0 };
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const items = [...nav.querySelectorAll('a, button')].filter(e => e.getClientRects().length > 0);
  // Rows by vertical overlap: an item joins a row when its box overlaps the row's band, so a link (44 px) and a button (34 px) centred on the same row are one row.
  const rows = [], outside = [];
  for (const e of items) {
    const r = e.getBoundingClientRect();
    const row = rows.find(w => r.top < w.b && r.bottom > w.t);
    if (row) { row.t = Math.min(row.t, r.top); row.b = Math.max(row.b, r.bottom); } else rows.push({ t: r.top, b: r.bottom });
    if (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh) outside.push(e.tagName.toLowerCase() + (e.getAttribute('hreflang') ? '[' + e.getAttribute('hreflang') + ']' : '') + (e.classList.contains('hmark') ? '.hmark' : ''));
  }
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const links = [...nav.querySelectorAll('a')].map(a => ({ name: norm(a.getAttribute('aria-label') || a.textContent), visible: norm(a.innerText || a.textContent) }));
  const notContained = links.filter(l => !l.name.includes(l.visible)).map(l => l.visible + ' is not in ' + l.name);
  const names = links.map(l => l.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  return { navs: navs.length, items: items.length, rows: rows.length, outside, notContained, dupes, vw, vh };
}
// The accessible name of a node, read through the protocol (the browser's own computation, not a re-derivation here).
async function accessibleName(page, selector) {
  await page.send('DOM.enable');
  const { root } = await page.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { nodes } = await page.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  return nodes && nodes[0] && nodes[0].name ? nodes[0].name.value : '';
}
// The addresses of the two languages: English at /<page>, Thai at /th/<page> (/th/ for the home page). englishOf takes either address back to the English one.
export const langPath = (englishPath, lang) => (lang === 'th' ? (englishPath === '/' ? '/th/' : '/th' + englishPath) : englishPath);
export const englishOf = path => path.replace(/^\/th(?=\/|$)/, '') || '/';
const pause = ms => new Promise(r => setTimeout(r, ms));
// The header checks on one page in one language. Each check runs in its own error boundary: one that throws records a finding, and the others still run.
export async function headerChecks(page, origin, path, lang, tag, checks, failures, measured) {
  const fail = (check, detail) => failures.push({ ...tag, check, detail });
  const wanted = HEADER_CHECKS.filter(c => checks.includes(c));
  if (!wanted.length) return;
  const guard = async (check, body) => {
    try { await body(); }
    catch (e) { fail(check, 'the check threw, so its readings are missing: ' + reportField(String(e && e.message ? e.message : e)).slice(0, 160)); }
  };
  if (checks.includes('skip')) await guard('skip', () => skipCheck(page, origin, path, lang, tag, fail, measured));
  if (checks.includes('header')) await guard('header', () => headerCheck(page, origin, path, lang, tag, fail, measured));
  if (checks.includes('keys')) await guard('keys', () => keysCheck(page, origin, path, lang, tag, fail, measured));
}
async function skipCheck(page, origin, path, lang, tag, fail, measured) {
  const label = JSON.parse(readFileSync(join(CATALOGUE_DIR, lang + '.json'), 'utf8')).shared.skip;
  await freshLoad(page, origin, path, lang);
  const rest = await page.evaluate(`(${skipRest})(String.fromCharCode(${charCodesOf(lang)}))`);
  measured.push({ ...tag, check: 'skip', rest: rest.shown, clip: rest.clip });
  if (!rest.shown) fail('skip', `no skip link in ${lang}`);
  else if (rest.clip === 'none' || rest.restHit) fail('skip', 'at rest the skip link is not clipped away, so it is visible before it is focused');
  const name = await accessibleName(page, `a.skip[lang="${lang}"]`);
  if (name !== label) fail('skip', `its accessible name is "${reportField(String(name))}", the catalogue string is "${reportField(label)}"`);
  await pressKey(page, 'Tab');
  const first = await page.evaluate(`(${focusInfo})()`);
  if (first.kind !== 'skip:' + lang) { fail('skip', `the first Tab from a fresh load focuses ${reportField(first.kind)}, not the skip link of ${lang}`); return; }
  const inside = first.rect.w > 0 && first.rect.h > 0 && first.rect.l >= 0 && first.rect.t >= 0 && first.rect.r <= first.vw && first.rect.b <= first.vh;
  if (!inside) fail('skip', `the focused skip link is not visible inside the viewport (${JSON.stringify(first.rect)} in ${first.vw}x${first.vh})`);
  if (first.clip !== 'none') fail('skip', `the focused skip link is still clipped (${reportField(first.clip)})`);
  if (first.opacity === 0) fail('skip', 'the focused skip link has an effective opacity of 0, so it is invisible while it holds focus');
  await pressKey(page, 'Enter');
  const after = await page.evaluate(`(${focusInfo})()`);
  if (after.kind !== 'main:main') fail('skip', `Enter on the skip link leaves focus on ${reportField(after.kind)}, not main#main`);
}
async function headerCheck(page, origin, path, lang, tag, fail, measured) {
  await freshLoad(page, origin, path, lang, 320, 400);
  const m = await page.evaluate(`(${measureHeader})()`);
  measured.push({ ...tag, check: 'header', rows: m.rows, items: m.items });
  if (!m.navs || m.items < 3) { fail('header', `the header's visible items at 320 px were ${m.items || 0}, so the header check measured too little`); return; }
  if (m.rows > 2) fail('header', `at 320 px the header items sit on ${m.rows} rows, past the two the design allows (C3's trigger: reopen the menu decision)`);
  for (const o of m.outside) fail('header', `at 320 px the header item ${reportField(o)} is outside the viewport`);
  for (const n of m.notContained) fail('header', `a header link's visible text is not in its accessible name: ${reportField(n)}`);
  for (const d of m.dupes) fail('header', `two header links share the label ${reportField(d)}`);
}
async function keysCheck(page, origin, path, lang, tag, fail, measured) {
  const other = lang === 'th' ? 'en' : 'th';
  await freshLoad(page, origin, path, lang);
  const order = [];
  for (let i = 0; i < 4; i++) {
    await pressKey(page, 'Tab');
    order.push((await page.evaluate(`(${focusInfo})()`)).kind);
  }
  const expected = ['skip:' + lang, 'mark', 'pricing', 'lang:' + other];
  measured.push({ ...tag, check: 'keys', order: order.join(' > ') });
  if (JSON.stringify(order) !== JSON.stringify(expected)) fail('keys', `Tab from a fresh load visits ${reportField(order.join(' > '))}, not ${reportField(expected.join(' > '))}`);
  // The other-language link is a plain link: Enter on it opens the page in the other language, at the other address.
  await freshLoad(page, origin, path, lang);
  const at = await tabTo(page, 'lang:' + other);
  if (at.kind !== 'lang:' + other) { fail('keys', `Tab does not reach the ${other} link from a fresh load (the focus passed ${reportField(at.path.join(' > '))})`); return; }
  await pressKey(page, 'Enter');
  // The 404 page has no address of its own: its switch goes to the other language's home, as switchHtml maps it.
  const wantPath = (path === '/404' || path === '/th/404') ? (other === 'th' ? '/th/' : '/') : langPath(englishOf(path), other);
  let now = null;
  for (let i = 0; i < 40 && now !== wantPath; i++) { await pause(150); now = await page.evaluate('location.pathname'); }
  if (now !== wantPath) { fail('keys', `Enter on the ${other} link leaves the address at ${reportField(String(now))}, not ${reportField(wantPath)}`); return; }
  const st = await page.evaluate('document.documentElement.lang');
  if (st !== other) fail('keys', `Enter on the ${other} link opens a page whose html lang is "${reportField(String(st))}"`);
  measured.push({ ...tag, check: 'keys', press: 'Enter ' + 'lang:' + other, lang: st, path: now });
}
// What the browser's own log says about a page's response headers, sorted. A Content-Security-Policy violation is what the csp check is for and fails it. A message about the Permissions-Policy
// header (the browser does not know a feature name that another engine, or a later version of the same one, does) is not a CSP violation: it is returned as a note and never fails the check, so
// the run is not red on the version of the browser the runner happens to ship. Any other message the browser files under 'security' (mixed content, say) is a note too: not this check's to fail.
export function classifyLogs(logs) {
  const violations = [], notes = [];
  for (const l of logs) {
    if (/permissions[- ]policy|feature[- ]policy/i.test(l.text)) notes.push({ kind: 'permissions-policy', text: l.text });
    else if (/content security policy/i.test(l.text)) violations.push(l);
    else if (l.source === 'security') notes.push({ kind: 'security', text: l.text });
  }
  return { violations, notes };
}

// ── the run ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Returns { failures: [{ page, lang, check, detail }], measured: [{ page, lang, check, ... }], notes: [{ page, lang, kind, text }] }. A note is something the browser said that is not a failure.
// Cookies for a failure line: the domain and the names, never a value (a cookie reaches this file with its value already dropped).
const jarDetail = (list, where) => {
  const by = new Map();
  for (const c of list) by.set(c.domain, [...(by.get(c.domain) ?? []), c.name]);
  const shown = [...by.entries()].sort().slice(0, 8).map(([d, names]) => `${reportField(d)} (${names.sort().slice(0, 12).map(reportField).join(', ')}${names.length > 12 ? ', ...' : ''})`).join('; ');
  return `${list.length} cookie(s) outside the served 127.0.0.1 origin in ${where}: ${shown}${by.size > 8 ? '; ...' : ''}`;
};
// The detail of a Content-Security-Policy violation: the browser's own message, which this run did not write, escaped (lib/report-field.mjs).
export const violationDetail = l => `the browser reports: ${reportField(l.text.slice(0, 200))}`;
// One FAIL line of a run. The detail arrives already escaped where it was built, so the line is one line by construction.
export const failLine = f => `FAIL ${reportField(f.page)} [${f.lang}] ${f.check}: ${f.detail}`;

// The head links of the page as the browser holds them: the canonical, the alternates, and og:locale. Paths only: the origin the page is served from is not the public one.
function headLinks() {
  const can = document.querySelector('link[rel="canonical"]');
  const alts = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => ({ hreflang: l.getAttribute('hreflang'), pathname: new URL(l.href).pathname }));
  const loc = document.querySelector('meta[property="og:locale"]');
  return { canonical: can ? new URL(can.href).pathname : null, alternates: alts, locale: loc ? loc.getAttribute('content') : null };
}
// What the head of a page must say, judged against its own address and language (the 404 page has none of its own, so no canonical and no alternates).
export function langUrlProblems(head, path, lang, file) {
  const out = [], english = englishOf(path);
  if (/(^|\/)404\.html$/.test(file)) {
    if (head.canonical !== null) out.push(`the 404 page carries a canonical link (${reportField(String(head.canonical))}); it has no address of its own`);
    if (head.alternates.length) out.push(`the 404 page carries ${head.alternates.length} alternate link(s); it has none`);
  } else {
    if (head.canonical !== path) out.push(`its canonical link is ${reportField(String(head.canonical))}, not its own address ${reportField(path)}`);
    for (const [hl, p] of [['en', english], ['th', langPath(english, 'th')], ['x-default', english]]) {
      const got = head.alternates.filter(a => a.hreflang === hl);
      if (got.length !== 1) out.push(`the ${hl} alternate link appears ${got.length} time(s), not once`);
      else if (got[0].pathname !== p) out.push(`the ${hl} alternate link points at ${reportField(got[0].pathname)}, not ${reportField(p)}`);
    }
    if (head.alternates.length !== 3) out.push(`the page carries ${head.alternates.length} alternate link(s), not three`);
  }
  const wantLocale = lang === 'th' ? 'th_TH' : 'en_US';
  if (head.locale !== wantLocale) out.push(`og:locale is ${reportField(String(head.locale))}, not ${wantLocale}`);
  return out;
}
// M5, measured: the English page is scrolled to its middle at the given width, the section at the top of the window is named, the other-language link is clicked, and the same
// section, looked up on the page the click opens, must sit at the top of the window. Without the page script's fragment the browser opens the top of the page instead.
// The one shape a section id can take: the slug of its heading (sectionIds, K-169). An id read from the page is code only through this pattern (CodeQL #65).
const SECTION_ID = /^[a-z0-9][a-z0-9-]*$/;
// CodeQL #65: the id read from the page is data, and it never reaches page code as a string. Page code gets only the character codes of an id that the pattern admits
// (String.fromCharCode of numbers), so no string sanitizer is in the flow. A regex test is a check, not a sanitizer CodeQL takes.
const sectionId = id => {
  if (typeof id !== 'string' || !SECTION_ID.test(id)) return null;
  return id;
};
// CodeQL #78: a string reaches page code only as the character codes it is built from (String.fromCharCode of numbers), never as a literal, so no string sanitizer is in the flow.
export const charCodesOf = s => [...s].map(c => c.charCodeAt(0)).join(',');
// The finding a read that throws becomes: the same words the header checks' boundary uses (CodeRabbit 4601272476).
const threwDetail = e => 'the check threw, so its readings are missing: ' + reportField(String(e && e.message ? e.message : e)).slice(0, 160);
async function measureFragmentSwitch(page, origin, path, width) {
  await page.setViewport(width, 800);
  await page.goto(origin + path);
  const before = await page.evaluate(`(() => { const max = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo(0, Math.floor(max / 2)); const hs = [...document.querySelectorAll('main h2[id]')].filter(h => h.getBoundingClientRect().top < 1); const h = hs[hs.length - 1]; return { id: h ? h.id : null, vh: window.innerHeight, max }; })()`);
  if (before.id !== null && sectionId(before.id) === null) return { id: null, error: `the heading id ${reportField(before.id)} is not a section id (the slug of a heading), so no measurement is taken on it` };
  if (!before.id) return { id: null, error: `no section heading is above the top of the window at ${width} px, scrolled to the middle of a ${before.max} px page, so the measurement has no section to follow` };
  const id = sectionId(before.id); // not null: the checks above returned for any other id, and for no heading
  const codes = charCodesOf(id);
  await page.evaluate(`document.querySelector('a.lang-link').click()`);
  // the switch goes to the other language: from the English file to Thai, from the Thai file to English (M5, both directions)
  const otherLang = /^\/th(\/|$)/.test(path) ? 'en' : 'th';
  const want = langPath(englishOf(path), otherLang);
  let now = null;
  for (let i = 0; i < 60 && now !== want; i++) { await pause(150); now = await page.evaluate('location.pathname'); }
  if (now !== want) return { id: before.id, error: `the other-language link did not open ${reportField(want)} (the address is ${reportField(String(now))})` };
  for (let i = 0; i < 20 && (await page.evaluate('document.readyState')) !== 'complete'; i++) await pause(150);
  await pause(200);
  const after = await page.evaluate(`(() => { const h = document.getElementById(String.fromCharCode(${codes})); return h ? h.getBoundingClientRect().top : null; })()`);
  return { id: before.id, after, vh: before.vh };
}
// K-179: a fragment landing, then the switch, in the browser. From `path#fragment` the language link is focused (the keyboard path) and activated (Enter is a click). The
// other address must carry the same fragment. The numbers say why it does not: where the target sits, and how far the page can scroll.
async function measureFragmentLanding(page, origin, path, width, fragment) {
  await page.setViewport(width, 800);
  // Leave the document first: a fragment jump within the same document fires no load event, so goto would wait for one that never comes.
  await page.goto('about:blank');
  await page.goto(origin + path + '#' + fragment);
  const before = await page.evaluate(`(() => { const h = document.getElementById(String.fromCharCode(${charCodesOf(fragment)})); const max = document.documentElement.scrollHeight - window.innerHeight; return { scrollY: window.scrollY, max, target: h ? h.getBoundingClientRect().top : null, vh: window.innerHeight }; })()`);
  await page.evaluate(`(() => { const a = document.querySelector('a.lang-link'); a.focus(); a.click(); })()`);
  const want = langPath(englishOf(path), /^\/th(\/|$)/.test(path) ? 'en' : 'th');
  let now = null;
  for (let i = 0; i < 60 && now !== want; i++) { await pause(150); now = await page.evaluate('location.pathname'); }
  if (now !== want) return { before, error: `the other-language link did not open ${reportField(want)} (the address is ${reportField(String(now))})` };
  await pause(200);
  return { before, hash: await page.evaluate('location.hash') };
}
export async function renderedChecks({ webDir, browser, checks = ALL_CHECKS, headers = true }) {
  const failures = [], measured = [], notes = [], languageFailed = new Set(), resourceSeen = new Set();
  const server = await browser.serve(webDir, { headers }); // a real server on 127.0.0.1, or the DevTools channel, whichever the browser can reach
  // A resource asked for by host name fails (the browser resolves none): one finding per page, language and address.
  const takeResourceFailures = (p, tag) => {
    for (const rf of p.resourceFailures.splice(0)) {
      if (rf.errorText !== NAME_NOT_RESOLVED) continue;
      const key = `${tag.page} ${tag.lang} ${rf.url}`;
      if (resourceSeen.has(key)) continue;
      resourceSeen.add(key);
      failures.push({ ...tag, check: 'resources', detail: `a resource was asked for by host name and could not be reached, because the browser resolves no host name: ${reportField(rf.url.slice(0, 160))}` });
    }
  };
  // Every page and language is measured in a browser context of its own (see browser.mjs): off the record, so it sees nothing of the profile's default context and leaves nothing in it. Before
  // the context is disposed its jar is read: any cookie from outside the served origin is a failure, names and domains only.
  let page = null, pageTag = null;
  const closePage = async () => {
    if (!page) return;
    const done = page;
    page = null;
    try {
      takeResourceFailures(done, pageTag);
      const bad = foreignCookies(await done.cookies());
      if (bad.length) failures.push({ ...pageTag, check: 'cookies', detail: jarDetail(bad, 'the browser context of this page') });
    } finally { await done.close(); }
  };
  try {
    for (const file of htmlPages(webDir)) {
      const path = urlPathOf(file);
      for (const lang of [langOf(file)]) {
        const tag = { page: file, lang };
        await closePage();
        page = await browser.newPage();
        pageTag = tag;
        const open = async width => {
          page.logs.length = 0;
          await page.setViewport(width, 800);
          await page.goto(server.origin + path);
          // The language is the file's own: nothing is clicked. A page whose html lang is not its file's language is measured in another language, so that is said, once.
          const got = await page.evaluate('document.documentElement.lang');
          if (got !== lang && !languageFailed.has(file + ' ' + lang)) {
            languageFailed.add(file + ' ' + lang);
            failures.push({ ...tag, check: 'language', detail: `the page's html lang is "${reportField(got)}", not "${lang}" (one language per file), so the measurements of this page would be those of another language` });
          }
          takeResourceFailures(page, tag);
        };
        if (checks.includes('reflow')) {
          await open(320);
          const m = await page.evaluate(`(${measureReflow})()`);
          measured.push({ ...tag, check: 'reflow', ...m });
          if (m.scrollWidth > m.clientWidth) failures.push({ ...tag, check: 'reflow', detail: `at 320 px the page scrolls sideways: scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}${m.over.length ? '; wider than the viewport: ' + m.over.map(reportField).join(', ') : ''}` });
        }
        if (checks.includes('lang-url')) {
          await open(320);
          // a read that throws is this check's finding, and the rest of the run goes on (CodeRabbit 4601272476)
          let head = null;
          try { head = await page.evaluate(`(${headLinks})()`); }
          catch (e) { failures.push({ ...tag, check: 'lang-url', detail: threwDetail(e) }); }
          if (head) {
            measured.push({ ...tag, check: 'lang-url', alternates: head.alternates.length });
            for (const p of langUrlProblems(head, path, lang, file)) failures.push({ ...tag, check: 'lang-url', detail: p });
          }
        }
        if (checks.includes('fragment') && (file === 'pricing.html' || file === 'th/pricing.html')) {
          for (const width of [1280, 390]) {
            let r;
            try { r = await measureFragmentLanding(page, server.origin, path, width, 'compare-title'); }
            catch (e) { r = { error: threwDetail(e) }; }
            measured.push({ ...tag, check: 'fragment', width, ...r });
            if (r.error) failures.push({ ...tag, check: 'fragment', detail: `at ${width} px: ${r.error}` });
            else if (r.hash !== '#compare-title') failures.push({ ...tag, check: 'fragment', detail: `at ${width} px, from ${path}#compare-title, the language switch (focus, then Enter) opens ${reportField(r.hash || 'no fragment')}, not #compare-title; before the switch the page was at ${Math.round(r.before.scrollY)} of ${Math.round(r.before.max)} px, and the target sat ${Math.round(r.before.target)} px from the top of the ${r.before.vh} px window` });
          }
        }
        if (checks.includes('m5') && (file === 'terms.html' || file === 'th/terms.html')) {
          for (const width of [1280, 390]) {
            let r;
            try { r = await measureFragmentSwitch(page, server.origin, path, width); }
            catch (e) { r = { id: null, error: threwDetail(e) }; }
            measured.push({ ...tag, check: 'm5', width, ...r });
            if (r.error) failures.push({ ...tag, check: 'm5', detail: r.error });
            else if (r.after === null) failures.push({ ...tag, check: 'm5', detail: `at ${width} px the section ${reportField(r.id)} is not on the page the other-language link opens` });
            else if (r.after < -2 || r.after > r.vh * 0.5) failures.push({ ...tag, check: 'm5', detail: `at ${width} px the section ${reportField(r.id)} that was at the top before the switch sits ${Math.round(r.after)} px from the top of the window after it (it should be at the top)` });
          }
        }
        if (READING_CHECKS.some(c => checks.includes(c))) {
          // the reading theme: per colour scheme, each emulated on its own (a prose page is light for a light device and dark for a dark one)
          for (const scheme of ['light', 'dark']) {
            await page.setColorScheme(scheme);
            await open(1280);
            const th = await page.evaluate(`(${measureTheme})()`);
            const stag = { ...tag, scheme };
            const wantBg = scheme === 'light' ? READING.light.bg : READING.dark.bg;
            // the theme is a property of the page's file, measured in that file's own language (one language per file, ORDER 1017j)
            if (checks.includes('theme')) {
              measured.push({ ...stag, check: 'theme', job: th.job, image: th.image, color: th.color, colorScheme: th.scheme });
              if (th.job === 'prose') {
                if (th.image !== 'none') failures.push({ ...stag, check: 'theme', detail: `a prose page has a background image (${reportField(th.image.slice(0, 60))}): the reading theme's ground is solid` });
                const got = parseColor(th.color), want = parseColor(wantBg);
                if (!got || got.r !== want.r || got.g !== want.g || got.b !== want.b) failures.push({ ...stag, check: 'theme', detail: `in the ${scheme} scheme the ground is ${reportField(th.color)}, expected ${wantBg}` });
                if (!/light/.test(th.scheme) || !/dark/.test(th.scheme)) failures.push({ ...stag, check: 'theme', detail: `color-scheme is "${reportField(th.scheme)}", expected light and dark` });
              } else if (th.job === 'default') {
                if (/light/.test(th.scheme) && /dark/.test(th.scheme)) failures.push({ ...stag, check: 'theme', detail: 'a default page carries the color-scheme of the reading theme (light dark): the theme leaked into it' });
              } else failures.push({ ...stag, check: 'theme', detail: `the page declares no job (data-job is ${reportField(th.job)})` });
            }
            if (th.job === 'prose') {
              if (checks.includes('contrast')) {
                const m = await page.evaluate(`(${measureContrast})()`);
                measured.push({ ...stag, check: 'contrast', read: m.read, worst: m.worst });
                if (m.read < 5) failures.push({ ...stag, check: 'contrast', detail: `only ${m.read} text elements were read, so the contrast check measured too little` });
                for (const x of m.fails) failures.push({ ...stag, check: 'contrast', detail: `under the floor in the ${scheme} scheme: ${reportField(x)}${m.failCount > m.fails.length ? ` (and ${m.failCount - m.fails.length} more)` : ''}` });
              }
              if (checks.includes('measure') && scheme === 'light') {
                const m = await page.evaluate(`(${measureLines})(String.fromCharCode(${charCodesOf('main')}), String.fromCharCode(${charCodesOf(lang)}))`);
                measured.push({ ...tag, check: 'measure', ...m });
                if (m.lines < (lang === 'th' ? 2 : 5)) failures.push({ ...tag, check: 'measure', detail: `only ${m.lines} lines were read` });
                if (lang === 'en' && m.max > MAX_LATIN_CHARS) failures.push({ ...tag, check: 'measure', detail: `a rendered line holds ${m.max} characters; the reading measure is at most ${MAX_LATIN_CHARS} (SC 1.4.8, as a target)` });
              }
              if (checks.includes('lineheight') && scheme === 'light') {
                const rows = await page.evaluate(`(${measureLineHeights})(String.fromCharCode(${charCodesOf('main')}))`);
                const want = lang === 'th' ? [1.65, 1.65] : [1.5, Infinity];
                const off = rows.filter(r => r.ratio === null || r.ratio < want[0] - 0.005 || r.ratio > want[1] + 0.005);
                const ratios = rows.map(r => r.ratio).filter(x => x !== null);
                measured.push({ ...tag, check: 'lineheight', read: rows.length, min: Math.min(...ratios), max: Math.max(...ratios) });
                if (rows.length < 5) failures.push({ ...tag, check: 'lineheight', detail: `only ${rows.length} text elements were read` });
                for (const r of off.slice(0, 4)) failures.push({ ...tag, check: 'lineheight', detail: `${reportField(r.tag)}${r.cls ? '.' + reportField(r.cls) : ''} has a line height of ${r.ratio === null ? 'normal' : r.ratio.toFixed(3)} times its size; the ${lang === 'th' ? 'Thai text is 1.65' : 'Latin text is at least 1.5'}` });
              }
            }
          }
          await page.setColorScheme('');
        }
        if (checks.includes('zoom') || checks.includes('csp')) {
          await open(1280);
          if (checks.includes('csp')) {
            const { violations, notes: said } = classifyLogs(page.logs);
            measured.push({ ...tag, check: 'csp', violations: violations.length, notes: said.length });
            for (const l of violations) failures.push({ ...tag, check: 'csp', detail: violationDetail(l) });
            for (const n of said) notes.push({ ...tag, kind: n.kind, text: n.text });
          }
          if (checks.includes('zoom')) {
            await page.evaluate(`document.documentElement.style.setProperty('font-size', '200%', 'important')`);
            await page.evaluate('document.fonts.ready.then(() => true)');
            const m = await page.evaluate(`(${measureZoom})()`);
            const rootPx = await page.evaluate('parseFloat(getComputedStyle(document.documentElement).fontSize)');
            measured.push({ ...tag, check: 'zoom', rootPx, textElementsRead: m.read, issues: m.issues.length });
            for (const issue of m.issues) failures.push({ ...tag, check: 'zoom', detail: `at 200% text: ${reportField(issue)}` });
            if (m.read === 0) failures.push({ ...tag, check: 'zoom', detail: 'no text element was read, so the zoom check measured nothing' });
          }
        }
        if (checks.includes('glyphs')) {
          await open(1280);
          const els = await thaiElementFaces(page);
          measured.push({ ...tag, check: 'glyphs', read: els.length });
          if (lang === 'th' && els.length === 0) failures.push({ ...tag, check: 'glyphs', detail: 'no Thai text element was read, so the glyphs check measured nothing' });
          for (const el of els) {
            if (el.error) { failures.push({ ...tag, check: 'glyphs', detail: `${reportField(el.tag)} "${reportField(el.sample)}": the browser could not read its faces: ${reportField(el.error.slice(0, 160))}` }); continue; }
            const why = glyphVerdict(el.fonts);
            if (why) failures.push({ ...tag, check: 'glyphs', detail: `${reportField(el.tag)} "${reportField(el.sample)}": ${why}` });
          }
        }
        await headerChecks(page, server.origin, path, lang, tag, checks, failures, measured);
      }
    }
  } finally { await closePage(); await server.close(); }
  // After every run: the profile's default context must hold no cookie from outside the served origin (Edge signs the computer's Microsoft account in there by itself unless it is told not to). Read, never cleared.
  const stray = foreignCookies(await browser.defaultCookies());
  if (stray.length) failures.push({ page: '(browser profile)', lang: '-', check: 'cookies', detail: jarDetail(stray, `the default context of the browser profile ${reportField(browser.profile)}`) });
  return { failures, measured, notes };
}

// ── the command line ─────────────────────────────────────────────────────────────────────────────────────────────
// The NOTE line of a run: the browser's messages about the response headers. Each message is text this run did not write, so each enters the line escaped (lib/report-field.mjs).
export function noteLine(notes) {
  const texts = [...new Set(notes.map(n => reportField(n.text.slice(0, 160))))].sort();
  return `NOTE rendered-check: the browser reported ${notes.length} message(s) about the response headers on ${new Set(notes.map(n => n.page)).size} page(s) that are not a CSP violation and do not fail this run: ${texts.join(' | ')}`;
}

async function main() {
  const args = process.argv.slice(2);
  const take = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('-h') || args.includes('--help')) { console.log('usage: node scripts/rendered-check.mjs [--web <dir>] [--only ' + ALL_CHECKS.join(',') + '] [--no-headers]\n  renders every page of web/ in a headless Chromium-family browser (on Windows the one inside WSL), in both languages: 320 px reflow, 200% text, no CSP violation, and the reading theme (ground, contrast per colour scheme, line heights, line length). KOLWEN_BROWSER names the binary.'); return; }
  const known = new Set(['--web', '--only', '--no-headers', '-h', '--help']);
  const bad = args.find((a, i) => a.startsWith('-') && !known.has(a));
  if (bad) { console.error('unknown argument ' + bad); process.exitCode = 2; return; }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const webDir = resolve(take('--web') ?? resolve(root, 'web'));
  const only = take('--only');
  const checks = only ? only.split(',') : ALL_CHECKS;
  if (checks.some(c => !ALL_CHECKS.includes(c))) { console.error('--only takes ' + ALL_CHECKS.join(', ')); process.exitCode = 2; return; }
  const route = findRoute();
  if (route.kind !== 'native' && route.kind !== 'wsl') {
    const msg = `${route.why}, so the rendered checks (${checks.join(', ')}) did not run here`;
    if (process.env.CI === 'true') { console.error('FAIL rendered-check: ' + msg + '. In CI a missing browser is a failure, never a skip.'); process.exitCode = 1; } else {
      console.log(`NOT RUN HERE rendered-check: ${msg}. This is not a pass: the pass is the pull request's CI (the rendered job), or a person's own browser looking at the pages.`);
      process.exitCode = EXIT_NOT_RUN_HERE;
    }
    return;
  }
  const browser = await launchBrowser({ route });
  try {
    const { failures, measured, notes } = await renderedChecks({ webDir, browser, checks, headers: !args.includes('--no-headers') });
    for (const f of failures) console.log(failLine(f));
    if (notes.length) console.log(noteLine(notes));
    for (const m of measured.filter(x => x.check === 'fragment')) console.log('FRAGMENT ' + JSON.stringify({ page: m.page, width: m.width, hash: m.hash ?? null, error: m.error ?? null, before: m.before && { scrollY: Math.round(m.before.scrollY), max: Math.round(m.before.max), target: m.before.target === null ? null : Math.round(m.before.target) } }));
    for (const m of measured.filter(x => x.check === 'm5')) console.log('M5 ' + JSON.stringify({ page: m.page, width: m.width, section: m.id, after_top_px: m.after === undefined ? null : Math.round(m.after * 10) / 10, window_height: m.vh, error: m.error ?? null }));
    const pages = new Set(measured.map(m => m.page)).size;
    if (failures.length) { console.error(`rendered-check FAILED: ${failures.length} finding(s) over ${pages} page(s)`); process.exitCode = 1; return; }
    console.log(`rendered-check passed: ${pages} page(s), one language per file, ${checks.join(' + ')} (${measured.length} measurements) in ${reportField(browser.label)}`);
  } finally { await browser.close(); }
}

if (isMainModule(import.meta.url)) main().catch(e => { console.error('FAIL rendered-check: ' + reportField(e && e.message ? e.message : e)); process.exitCode = 1; });
