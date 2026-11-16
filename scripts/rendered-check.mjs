// The rendered checks (build-qc.md W-A11Y-07, W-FMT-11, and the CSP the pages are served under), in a real headless browser, over every page of web/ in both languages:
//   reflow   a 320 CSS px wide viewport has no horizontal scroll (WCAG 2.2 SC 1.4.10): documentElement.scrollWidth <= clientWidth.
//   zoom     text at 200% (SC 1.4.4): the root font-size is set to 200%, as the visitor's own setting does, on a 1280 px window, and then
//            - the page does not scroll sideways, and
//            - no element's text is cut: an element with overflow hidden or clip whose content is larger than its box, and a text rectangle that sticks out of an ancestor that clips. Nothing else is
//              measured: a box that grows with its text is not a loss, and text a script moves is not read.
//   csp      the browser reports no Content-Security-Policy violation while the page loads under the real headers (a hash that no longer matches shows here, in a real browser). Only a CSP violation
//            fails it. What the browser says about the Permissions-Policy header (a feature name it does not know) is printed on a separate NOTE line and never fails the run.
// Before any check, the language of the page is set by pressing its switch, and a page whose switch does not set the wanted lang fails (check name: language).
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

export const ALL_CHECKS = ['reflow', 'zoom', 'csp', 'theme', 'contrast', 'lineheight', 'measure', 'glyphs', 'skip', 'header', 'keys'];
const READING_CHECKS = ['theme', 'contrast', 'lineheight', 'measure'];
export const MAX_LATIN_CHARS = 80; // SC 1.4.8 (AAA), the target the reading theme holds itself to
export const urlPathOf = file => (file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '').replace(/\/index$/, '/'));

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
  const col = root.getBoundingClientRect().width;
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
  else if (el.matches('.site-header a[href="/pricing"]')) kind = 'pricing';
  else if (el.matches('.site-header [data-lang-set]')) kind = 'switch:' + el.getAttribute('data-lang-set') + '@' + el.closest('nav').getAttribute('lang');
  else if (el.tagName === 'MAIN') kind = 'main:' + el.id;
  const r = el.getBoundingClientRect();
  return { kind, rect: { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }, clip: getComputedStyle(el).clipPath, vw: document.documentElement.clientWidth, vh: window.innerHeight };
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
  const other = document.querySelector('a.skip[lang="' + (lang === 'th' ? 'en' : 'th') + '"]');
  const cs = shown ? getComputedStyle(shown) : null;
  return { shown: !!shown, clip: cs ? cs.clipPath : null, display: cs ? cs.display : null, otherDisplay: other ? getComputedStyle(other).display : null };
}
// The header's visible items at the current width: the rows they sit on, whether any is outside the viewport, each link's visible text against its accessible name, and repeated names.
function measureHeader() {
  const navs = [...document.querySelectorAll('.site-header nav')].filter(n => n.getClientRects().length > 0);
  const nav = navs[0];
  if (!nav) return { navs: 0 };
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const items = [...nav.querySelectorAll('a, button')].filter(e => e.getClientRects().length > 0);
  const tops = [], outside = [];
  for (const e of items) {
    const r = e.getBoundingClientRect();
    if (!tops.some(t => Math.abs(t - r.top) < 2)) tops.push(r.top);
    if (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh) outside.push(e.tagName.toLowerCase() + (e.getAttribute('data-lang-set') ? '[' + e.getAttribute('data-lang-set') + ']' : '') + (e.classList.contains('hmark') ? '.hmark' : ''));
  }
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const links = [...nav.querySelectorAll('a')].map(a => ({ name: norm(a.getAttribute('aria-label') || a.textContent), visible: norm(a.innerText || a.textContent) }));
  const notContained = links.filter(l => !l.name.includes(l.visible)).map(l => l.visible + ' is not in ' + l.name);
  const names = links.map(l => l.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  return { navs: navs.length, items: items.length, rows: tops.length, outside, notContained, dupes, vw, vh };
}
// The scroll position a key press must not change: the page is scrolled to 200 px (or to its end, if shorter) and the position read back after the press.
const SCROLL_TO = `(() => { const max = document.documentElement.scrollHeight - window.innerHeight; const y = Math.min(200, Math.max(0, max)); window.scrollTo(0, y); return { max, y: window.scrollY }; })()`;
const LANG_STATE = `(() => ({ lang: document.documentElement.lang, y: window.scrollY }))()`;
// The accessible name of a node, read through the protocol (the browser's own computation, not a re-derivation here).
async function accessibleName(page, selector) {
  await page.send('DOM.enable');
  const { root } = await page.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { nodes } = await page.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  return nodes && nodes[0] && nodes[0].name ? nodes[0].name.value : '';
}
// The verdict of the three checks on one page in one language. Each adds its findings to `failures` and its readings to `measured`.
export async function headerChecks(page, origin, path, lang, tag, checks, failures, measured) {
  const fail = (check, detail) => failures.push({ ...tag, check, detail });
  const wanted = HEADER_CHECKS.filter(c => checks.includes(c));
  if (!wanted.length) return;
  const other = lang === 'th' ? 'en' : 'th';
  if (checks.includes('skip')) {
    const label = JSON.parse(readFileSync(join(CATALOGUE_DIR, lang + '.json'), 'utf8')).shared.skip;
    await freshLoad(page, origin, path, lang);
    const rest = await page.evaluate(`(${skipRest})(${JSON.stringify(lang)})`);
    measured.push({ ...tag, check: 'skip', rest: rest.shown, clip: rest.clip });
    if (!rest.shown) fail('skip', `no skip link in ${lang}`);
    else if (rest.clip === 'none') fail('skip', 'at rest the skip link is not clipped away, so it is visible before it is focused');
    if (rest.shown && rest.otherDisplay !== 'none') fail('skip', `the ${other} copy of the skip link is not hidden (display ${rest.otherDisplay}), so it would sit in the tab order too`);
    const name = await accessibleName(page, `a.skip[lang="${lang}"]`);
    if (name !== label) fail('skip', `its accessible name is "${reportField(String(name))}", the catalogue string is "${reportField(label)}"`);
    await pressKey(page, 'Tab');
    const first = await page.evaluate(`(${focusInfo})()`);
    if (first.kind !== 'skip:' + lang) fail('skip', `the first Tab from a fresh load focuses ${reportField(first.kind)}, not the skip link of ${lang}`);
    else {
      const inside = first.rect.w > 0 && first.rect.h > 0 && first.rect.l >= 0 && first.rect.t >= 0 && first.rect.r <= first.vw && first.rect.b <= first.vh;
      if (!inside) fail('skip', `the focused skip link is not visible inside the viewport (${JSON.stringify(first.rect)} in ${first.vw}x${first.vh})`);
      if (first.clip !== 'none') fail('skip', `the focused skip link is still clipped (${reportField(first.clip)})`);
      await pressKey(page, 'Enter');
      const after = await page.evaluate(`(${focusInfo})()`);
      if (after.kind !== 'main:main') fail('skip', `Enter on the skip link leaves focus on ${reportField(after.kind)}, not main#main`);
    }
  }
  if (checks.includes('header')) {
    await freshLoad(page, origin, path, lang, 320, 400);
    const m = await page.evaluate(`(${measureHeader})()`);
    measured.push({ ...tag, check: 'header', rows: m.rows, items: m.items });
    if (!m.navs || m.items < 4) fail('header', `the header's visible items at 320 px were ${m.items || 0}, so the header check measured too little`);
    else {
      if (m.rows > 2) fail('header', `at 320 px the header items sit on ${m.rows} rows, past the two the design allows (C3's trigger: reopen the menu decision)`);
      for (const o of m.outside) fail('header', `at 320 px the header item ${reportField(o)} is outside the viewport`);
      for (const n of m.notContained) fail('header', `a header link's visible text is not in its accessible name: ${reportField(n)}`);
      for (const d of m.dupes) fail('header', `two header links share the label ${reportField(d)}`);
    }
  }
  if (checks.includes('keys')) {
    await freshLoad(page, origin, path, lang);
    const order = [];
    for (let i = 0; i < 5; i++) {
      await pressKey(page, 'Tab');
      order.push((await page.evaluate(`(${focusInfo})()`)).kind);
    }
    const expected = ['skip:' + lang, 'mark', 'pricing', 'switch:en@' + lang, 'switch:th@' + lang];
    measured.push({ ...tag, check: 'keys', order: order.join(' > ') });
    if (JSON.stringify(order) !== JSON.stringify(expected)) fail('keys', `Tab from a fresh load visits ${reportField(order.join(' > '))}, not ${reportField(expected.join(' > '))}`);
    // The language switch: pressed with Space and with Enter, the other language moves the focus to the same-language button of the header now shown, and the page does not jump;
    // the language already shown moves nothing. Each press is a fresh load, so the focus starts where a keyboard visitor's would.
    const cases = lang === 'en'
      ? [{ to: 'switch:th@en', key: 'Space', next: 'th' }, { to: 'switch:th@en', key: 'Enter', next: 'th' }, { to: 'switch:en@en', key: 'Enter', next: 'en' }]
      : [{ to: 'switch:en@th', key: 'Enter', next: 'en' }, { to: 'switch:th@th', key: 'Space', next: 'th' }];
    for (const c of cases) {
      await freshLoad(page, origin, path, lang);
      const at = await tabTo(page, c.to);
      if (at.kind !== c.to) { fail('keys', `Tab does not reach ${reportField(c.to)} from a fresh load (the focus passed ${reportField(at.path.join(' > '))})`); continue; }
      const sc = await page.evaluate(SCROLL_TO);
      if (sc.max < 100) { fail('keys', `the page scrolls only ${sc.max} px at this height, so the scroll position cannot be read`); continue; }
      await pressKey(page, c.key);
      const st = await page.evaluate(LANG_STATE);
      const fo = await page.evaluate(`(${focusInfo})()`);
      const want = 'switch:' + c.next + '@' + c.next;
      if (st.lang !== c.next) fail('keys', `${c.key} on the ${reportField(c.to)} button leaves html lang "${reportField(st.lang)}", not "${c.next}"`);
      if (fo.kind !== want) fail('keys', `${c.key} on ${reportField(c.to)} leaves focus on ${reportField(fo.kind)}, not on ${reportField(want)}`);
      if (st.y !== sc.y) fail('keys', `${c.key} on ${reportField(c.to)} moves the page from ${sc.y} to ${st.y}`);
      measured.push({ ...tag, check: 'keys', press: c.key + ' ' + c.to, lang: st.lang, focus: fo.kind, y: [sc.y, st.y] });
    }
  }
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
      for (const lang of ['en', 'th']) {
        const tag = { page: file, lang };
        await closePage();
        page = await browser.newPage();
        pageTag = tag;
        const open = async width => {
          page.logs.length = 0;
          await page.setViewport(width, 800);
          await page.goto(server.origin + path);
          // The page script remembers the language in localStorage (one key) of its context, and the context is new for every page and language: still, the language is chosen by pressing its switch on every load, never assumed.
          const got = await page.evaluate(`(() => { const b = document.querySelector('[data-lang-set="${lang}"]'); if (b) b.click(); return document.documentElement.lang; })()`);
          // a page whose switch is missing, or does not set the language, would be measured in the language it opens in, not the one asked for: say so, once
          if (got !== lang && !languageFailed.has(file + ' ' + lang)) {
            languageFailed.add(file + ' ' + lang);
            failures.push({ ...tag, check: 'language', detail: `the language switch did not set lang="${lang}" (the page reports lang="${reportField(got)}"), so the measurements of this page in ${lang} would be those of another language` });
          }
          takeResourceFailures(page, tag);
        };
        if (checks.includes('reflow')) {
          await open(320);
          const m = await page.evaluate(`(${measureReflow})()`);
          measured.push({ ...tag, check: 'reflow', ...m });
          if (m.scrollWidth > m.clientWidth) failures.push({ ...tag, check: 'reflow', detail: `at 320 px the page scrolls sideways: scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}${m.over.length ? '; wider than the viewport: ' + m.over.map(reportField).join(', ') : ''}` });
        }
        if (READING_CHECKS.some(c => checks.includes(c))) {
          // the reading theme: per colour scheme, each emulated on its own (a prose page is light for a light device and dark for a dark one)
          for (const scheme of ['light', 'dark']) {
            await page.setColorScheme(scheme);
            await open(1280);
            const th = await page.evaluate(`(${measureTheme})()`);
            const stag = { ...tag, scheme };
            const wantBg = scheme === 'light' ? READING.light.bg : READING.dark.bg;
            if (checks.includes('theme') && lang === 'en') {
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
                const m = await page.evaluate(`(${measureLines})(${JSON.stringify(lang === 'th' ? '#doc-th' : '#doc-en')}, ${JSON.stringify(lang)})`);
                measured.push({ ...tag, check: 'measure', ...m });
                if (m.lines < (lang === 'th' ? 2 : 5)) failures.push({ ...tag, check: 'measure', detail: `only ${m.lines} lines were read` });
                if (lang === 'en' && m.max > MAX_LATIN_CHARS) failures.push({ ...tag, check: 'measure', detail: `a rendered line holds ${m.max} characters; the reading measure is at most ${MAX_LATIN_CHARS} (SC 1.4.8, as a target)` });
              }
              if (checks.includes('lineheight') && scheme === 'light') {
                const rows = await page.evaluate(`(${measureLineHeights})(${JSON.stringify(lang === 'th' ? '#doc-th' : '#doc-en')})`);
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
    const pages = new Set(measured.map(m => m.page)).size;
    if (failures.length) { console.error(`rendered-check FAILED: ${failures.length} finding(s) over ${pages} page(s)`); process.exitCode = 1; return; }
    console.log(`rendered-check passed: ${pages} page(s) x 2 languages, ${checks.join(' + ')} (${measured.length} measurements) in ${reportField(browser.label)}`);
  } finally { await browser.close(); }
}

if (isMainModule(import.meta.url)) main().catch(e => { console.error('FAIL rendered-check: ' + reportField(e && e.message ? e.message : e)); process.exitCode = 1; });
