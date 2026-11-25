// Renders web/terms.html, web/privacy.html and web/refund.html from TERMS.md, PRIVACY.md and legal/thai-7day-clause.md (a library for
// scripts/legal-pages.mjs and its test; the pure functions take texts and return texts, nothing here reads or writes a file).
//
// WHAT IT RENDERS, in one sentence: every PASSAGE of a source is either shown as written (TEXT) or replaced by one pending line (HELD),
// and none is dropped, so for every source: passages = TEXT + HELD.
//
// A PASSAGE is a paragraph, a list item, or one paragraph of a block quote. Headings and HTML comments are structure, not passages.
// A passage is HELD when ANY of these holds:
//   1. it carries a counsel-pending marker, [pending legal review] or [รอที่ปรึกษากฎหมาย] (spaces inside tolerated);
//   2. it sits in a block quote whose FIRST passage carries a marker (a marker on a quote's head covers the whole quote, as in the Thai blocks);
//   3. it carries an unset placeholder: [N days], [N วัน] or a {{...}} token;
//   4. its anchor (its first eight words) is in the tracked hold list, scripts/lib/legal-holds.json.
// A held passage never shows its own text. Its pending line says only that the part waits for legal review.
//
// STATED LIMITS (what this does not do): it reads three Markdown shapes only (paragraphs, list items, block quotes) plus headings and
// comments; any other Markdown (a table, a link, an image, an HTML block) would pass through as escaped text, and the test fails on
// the first such passage a source gains. A nested list is shown flat. Headings are shown as written, held or not. The Thai view of a page
// shows the English TEXT passages in English (lang="en") because the sources have no full Thai text; the pending lines and the page
// frame are Thai. The hold list is matched by anchor, so two passages that open with the same eight words are held together.
import { MARK_EN, MARK_TH, PAGES, BANNER, PENDING, THAI_OWED, TEXT_TWINS, PENDING_LINES, REFUND_ROWS } from './legal-page-text.mjs';
import { activeSince } from './legal-state.mjs';
import { CONTROLLER_FILE, validateController, fillController } from './controller-slot.mjs';
import { t, html as tHtml, escText, escAttr, withCatalogue } from './i18n-catalogue.mjs';
import { renderTemplate } from './page-template.mjs';
import { tokensCss, readingMeta, VIEWPORT_META, JOBS } from './layout-tokens.mjs';
export { escText, escAttr };

export const SOURCES = { terms: 'TERMS.md', privacy: 'PRIVACY.md', clause: 'legal/thai-7day-clause.md', changelog: 'CHANGELOG.md' };
export const HOLD_REASON = 'awaits counsel';

const RE_MARK = [/\[pending\s+legal\s+review\]/i, /\[\s*รอ\s*ที่ปรึกษา\s*กฎหมาย\s*\]/];
const RE_PLACEHOLDER = /\[N\s*(?:days|วัน)\]|\{\{[^}]*\}\}/;
const hasMarker = text => RE_MARK.some(re => re.test(text));

export const anchorOf = text => text.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
const squash = s => s.replace(/\s+/g, ' ').trim();

// ── 1. Splitting a source into headings and passages ─────────────────────────────────────────────
export function splitSource(md) {
  const items = [];
  let cur = null, block = 0, inBlock = false;
  const close = () => { if (cur) { items.push(cur); cur = null; } };
  const start = (text, depth, list) => { close(); cur = { kind: 'passage', text, depth, list, block: depth > 0 ? block : 0 }; };
  // An HTML comment is structure: removed whole, newlines inside it kept, so a comment that spans lines (or ends with --!>) cannot become a passage.
  const noComments = md.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?--!?>/g, c => c.replace(/[^\n]/g, ''));
  for (const raw of noComments.split('\n')) {
    let s = raw, depth = 0, m;
    while ((m = /^\s*>\s?/.exec(s))) { s = s.slice(m[0].length); depth++; }
    const t = s.trim();
    if (depth === 0) inBlock = false;
    else if (!inBlock) { inBlock = true; block++; }
    if (t === '') { close(); continue; }
    const heading = /^(#{1,6})\s+(.*)$/.exec(t);
    if (heading) { close(); items.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() }); continue; }
    const item = /^([-*+]|[0-9]+[.)])\s+(.*)$/.exec(t);
    if (item) { start(item[2], depth, /^[0-9]/.test(item[1]) ? 'ol' : 'ul'); continue; }
    if (cur && cur.depth === depth) cur.text += ' ' + t;
    else start(t, depth, null);
  }
  close();
  // A marker on a block quote's first passage covers every passage of that quote.
  const head = new Map();
  for (const it of items) if (it.kind === 'passage' && it.block > 0 && !head.has(it.block)) head.set(it.block, hasMarker(it.text));
  for (const it of items) if (it.kind === 'passage') it.byMarker = hasMarker(it.text) || (it.block > 0 && head.get(it.block) === true);
  return items;
}

// ── 2. Which passages are held ──────────────────────────────────────────────────────────────────
// opts.holds: [{ file, anchor, reason }]; opts.active: true when the legal-state record says the Thai 7-day clause is in force, which
// lifts the LIST hold from the clause file's own passages (their markers and placeholders still hold).
export function classify(file, md, opts) {
  const { holds = [], active = false, noHold = false } = opts || {};
  const listed = new Set(holds.filter(h => h.file === file).map(h => h.anchor));
  const useList = !(file === SOURCES.clause && active);
  const items = splitSource(md);
  const used = new Set();
  const redundant = new Set();
  for (const it of items) {
    if (it.kind !== 'passage') continue;
    it.anchor = anchorOf(it.text);
    const auto = it.byMarker || RE_PLACEHOLDER.test(it.text);
    const byList = useList && listed.has(it.anchor);
    if (byList) (auto ? redundant : used).add(it.anchor);
    else if (listed.has(it.anchor) && !useList) used.add(it.anchor); // a lifted list hold still names a real passage, so it is not stale
    it.held = !noHold && (auto || byList);
  }
  const passages = items.filter(i => i.kind === 'passage');
  const held = passages.filter(p => p.held).length;
  return { items, stats: { passages: passages.length, text: passages.length - held, held }, used, redundant, listed };
}

// Every reason the hold list is not a sound list over these sources; an empty list means sound.
export function holdProblems(holds, perFile) {
  const out = [];
  const seen = new Set();
  const files = Object.values(SOURCES);
  for (const h of holds) {
    const id = h.file + ' :: ' + h.anchor;
    if (!files.includes(h.file)) { out.push(`hold entry names an unknown file: ${id}`); continue; }
    if (typeof h.anchor !== 'string' || !h.anchor.trim()) { out.push(`hold entry has no anchor (${h.file})`); continue; }
    if (h.reason !== HOLD_REASON) out.push(`hold entry reason must be exactly "${HOLD_REASON}" (no tool, lane, sheet or ticket name): ${id}`);
    if (seen.has(id)) out.push(`hold entry is listed twice: ${id}`);
    seen.add(id);
    const c = perFile[h.file];
    if (!c) continue;
    if (!c.used.has(h.anchor)) out.push(c.redundant.has(h.anchor)
      ? `hold entry is redundant, the passage is already held by a marker or placeholder: ${id}`
      : `hold entry matches no passage of its file (the source changed, or the anchor is mistyped): ${id}`);
  }
  return out;
}

// ── 3. Inline Markdown → HTML, and the plain text it must equal ──────────────────────────────────
// Escaping, never stripping: one function for text and one for attribute values, each covering & < > " and ' (written once in i18n-catalogue.mjs, which the catalogue values go through too).
const SLOT = String.fromCharCode(0xE000); // private-use delimiter for a code span parked while emphasis is read

export function inline(md) {
  const codes = [];
  let s = md.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return SLOT + (codes.length - 1) + SLOT; });
  s = escText(s);
  // the label excludes an opening bracket: a bracket with no closing one is then read once, not searched from again at every later bracket
  s = s.replace(/\[([^\][]+)\]\((https:\/\/[^)\s[(]+)\)/g, '<a href="$2">$1</a>'); // text and url are already escaped
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  return s.replace(new RegExp(SLOT + '([0-9]+)' + SLOT, 'g'), (_, i) => '<code>' + escText(codes[Number(i)]) + '</code>');
}
// The text a reader sees for a Markdown passage: its marks removed, nothing else changed.
export function plain(md) {
  const codes = [];
  let s = md.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return SLOT + (codes.length - 1) + SLOT; });
  s = s.replace(/\[([^\][]+)\]\(https:\/\/[^)\s[(]+\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1$2');
  return squash(s.replace(new RegExp(SLOT + '([0-9]+)' + SLOT, 'g'), (_, i) => codes[Number(i)]));
}

// ── 4. Rendering a source for one language ──────────────────────────────────────────────────────
function pendingFor(file, anchor, lang) {
  const o = PENDING_LINES.find(p => p.file === file && p.anchor === anchor);
  return o ? o[lang] : PENDING[lang];
}

export function renderSource(file, md, lang, opts) {
  const c = classify(file, md, opts);
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(`<${list.kind}>${list.rows.join('')}</${list.kind}>`); list = null; } };
  const enAttr = lang === 'th' ? ' lang="en"' : '';
  const errors = [];
  for (const it of c.items) {
    if (it.kind === 'heading') {
      if (it.level === 1) continue; // the page carries its own title
      flush();
      const tag = 'h' + Math.min(it.level, 3);
      out.push(`<${tag}${enAttr}>${inline(it.text)}</${tag}>`);
      continue;
    }
    let cls, body, attr = '';
    if (it.held) { cls = 'pending'; body = escText(pendingFor(file, it.anchor, lang)); }
    else {
      cls = 't';
      const twin = TEXT_TWINS.find(t => t.anchor === it.anchor);
      if (twin && plain(it.text) !== twin.en) errors.push(`the Thai twin for "${twin.anchor}" is out of step with the source passage`);
      if (twin && lang === 'th') { body = escText(twin.th); } else { body = inline(it.text); attr = enAttr; }
    }
    if (it.list) {
      if (!list || list.kind !== it.list) { flush(); list = { kind: it.list, rows: [] }; }
      list.rows.push(`<li class="${cls}"${attr}>${body}</li>`);
    } else { flush(); out.push(`<p class="${cls}"${attr}>${body}</p>`); }
  }
  flush();
  return { html: out.join('\n      '), stats: c.stats, errors };
}

function refundBody(clauseMd, termsClass, lang, opts) {
  const active = !!(opts && opts.active);
  const out = [];
  const errors = [];
  let heldRows = 0; // rows whose TERMS passage is held, shown as pending lines
  for (const r of REFUND_ROWS) {
    if (r.kind === 'pending' && !(r.en.startsWith(MARK_EN) && r.th.startsWith(MARK_TH))) errors.push(`refund row ${r.id} is pending and must begin with the marker of each language`);
    if (r.kind === 'text' && (hasMarker(r.en) || hasMarker(r.th))) errors.push(`refund row ${r.id} is shown as written and must not carry a marker`);
    if (r.id === 'R8' && active) {
      const c = renderSource(SOURCES.clause, clauseMd, lang, opts);
      errors.push(...c.errors);
      out.push(c.html);
      continue;
    }
    if (r.from) {
      // This row IS a passage of TERMS.md: shown the way the terms page shows it, or the generic pending line when the passage is held.
      const p = termsClass.items.find(i => i.kind === 'passage' && i.anchor === r.from);
      if (!p) { errors.push(`refund row ${r.id} names a TERMS.md passage that is not there (the anchor "${r.from}")`); continue; }
      if (p.held) { out.push(`<p class="pending">${escText(PENDING[lang])}</p>`); heldRows++; continue; }
      if (plain(p.text) !== r.en) errors.push(`refund row ${r.id}: the TERMS.md passage changed, so its Thai twin is out of step (update the row in scripts/lib/legal-page-text.mjs)`);
      out.push(`<p class="t">${escText(lang === 'en' ? plain(p.text) : r.th)}</p>`);
      continue;
    }
    out.push(`<p class="${r.kind === 'text' ? 't' : 'pending'}">${escText(r[lang])}</p>`);
  }
  const text = REFUND_ROWS.filter(r => r.kind === 'text').length - heldRows;
  const pending = REFUND_ROWS.filter(r => r.kind === 'pending').length + heldRows;
  return { html: out.join('\n      '), stats: { passages: REFUND_ROWS.length, text, held: pending }, errors };
}

// ── 5. The shared header and footer, and the page shell
// The header and the footer are written ONCE, here and nowhere else, and `legal-pages.mjs --write` puts them into every page between fixed markers (5a
// below). Their lines carry no indentation so each block is byte-identical wherever it sits, and `--check` compares it byte for byte.
// The header and footer rules use no page variable and no opacity: every text takes the colour its page gives it at full strength (WCAG 2.2 SC 1.4.3
// measures that colour against the page, and a test computes it), and hover changes the underline, not the colour. The same rules sit in every page's
// own style block, between markers.
// LAYOUT: the header and the footer are children of <body>, not of <main>, so their width does not depend on the page's own column (560px on the home
// page, 720px elsewhere, which made the same footer lay out in 3 columns on one page and 4 on another). The footer's five groups lay out by VIEWPORT
// width, the same on every page: 2 columns below 640px, 3 from 640px, 5 in one row from 1024px (the most common points in a read of 12 sites; market
// practice, not a standard). WCAG 2.2 SC 1.4.10 (reflow at 320px) is the one standard width: every track is minmax(0,1fr), every link may break
// anywhere, and the header's row wraps, so nothing in either has a width of its own.
// THE LANGUAGE is the page's own: each file is one language (its <html lang> and its own copies of the header, the footer and the text). A page has one <nav> and one footer,
// and the switch to the other language is a plain link to that language's copy of the page: no script, no stored choice (W-I18N-07, W-I18N-03).
export const HEADER_CSS = [
  "  .site-header{border-bottom:1px solid rgba(128,128,128,.35);padding-block:var(--kw-space-header-top) var(--kw-space-header-block);padding-inline:var(--kw-space-gutter-inline)}",
  "  .site-header nav{display:flex;flex-wrap:wrap;align-items:center;gap:4px 18px;width:100%;max-width:var(--kw-size-container-wide);margin:0 auto;font-size:var(--kw-font-size-header-link)}",
  "  .site-header a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:var(--kw-size-header-row);overflow-wrap:anywhere}",
  "  .site-header a:hover{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}",
  "  .site-header .hmark{gap:10px;font-weight:700;font-size:var(--kw-font-size-header-name);letter-spacing:.01em;margin-right:auto}",
  "  .site-header .hglyph,.site-footer .fglyph{flex:none;display:block;fill:var(--accent,var(--amber,#e8833a))}",
  "  .lswitch{display:inline-flex;align-items:center;gap:6px}",
  "  .lswitch a,.lswitch [aria-current=\"page\"]{font-size:var(--kw-font-size-header-switch);color:inherit;border:1px solid var(--kw-color-switch-border);border-radius:8px;padding:6px 12px;min-height:var(--kw-size-header-switch);display:inline-flex;align-items:center;text-decoration:none}",
  "  .lswitch a:hover{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}",
  "  .lswitch [aria-current=\"page\"]{border-color:currentColor;font-weight:600}",
  "  .site-header :focus-visible,.site-footer :focus-visible{outline:2px solid currentColor;outline-offset:2px}",
  // The skip link (C1): one per page, in the page's own language, written before the header. At rest it is clipped to nothing, not hidden: it stays in the tab order and in the
  // accessibility tree, and a display:none would take it out of both. On :focus-visible it appears at the header's top-left, inside the gutter, over the header, with the page's own tokens.
  ".skip{position:absolute;z-index:100;inset-block-start:var(--kw-space-header-top);inset-inline-start:max(var(--kw-space-inset-inline), env(safe-area-inset-left, 0px));display:inline-flex;align-items:center;min-height:var(--kw-size-header-row);padding-inline:var(--kw-space-button);color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:8px;font-size:var(--kw-font-size-header-link);text-decoration:none;clip-path:inset(50%)}",
  ".skip:focus-visible{clip-path:none;outline:2px solid currentColor;outline-offset:2px}",
].join('\n');

export const FOOTER_CSS = [
  "  .site-footer{display:block;margin-top:var(--kw-space-footer-offset);padding-block:var(--kw-space-footer-top) var(--kw-space-footer-end);padding-inline:var(--kw-space-gutter-inline);border-top:1px solid rgba(128,128,128,.35);font-size:var(--kw-font-size-4);line-height:1.7}",
  "  .site-footer .fwrap{width:100%;max-width:var(--kw-size-container-wide);margin:0 auto;display:flex;flex-direction:column;gap:28px}",
  "  .site-footer .fbrand{display:flex;align-items:center;gap:10px;margin:0;font-size:var(--kw-font-size-10);font-weight:700;letter-spacing:.01em}",
  "  .site-footer .fgroups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 18px}",
  "  @media (min-width:640px){.site-footer .fgroups{grid-template-columns:repeat(3,minmax(0,1fr))}}",
  "  @media (min-width:1024px){.site-footer .fgroups{grid-template-columns:repeat(5,minmax(0,1fr))}}",
  "  .site-footer .fgroup{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}",
  "  .site-footer .fh{font-size:var(--kw-font-size-1);letter-spacing:.04em;text-transform:uppercase;margin:0}",
  "  .site-footer a{color:inherit;text-decoration:underline;text-underline-offset:3px;display:inline-block;padding:5px 0;min-height:32px;overflow-wrap:anywhere}",
  "  .site-footer a:hover{text-decoration-thickness:2px}",
  "  .site-footer .fbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgba(128,128,128,.25);padding-top:16px}",
  "  .fine{font-size:var(--kw-font-size-1);margin:0}"].join('\n');

// The Kolwen mark, on one line (the blocks carry no indentation). The fill is CSS (HEADER_CSS), so a light page can give it its darker on-light colour.
export const markSvg = (size, cls) => `<svg class="${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><rect x="8.5" y="9.1" width="64.3" height="25"/><rect x="17.85" y="46.25" width="64.3" height="19.66"/><rect x="27.2" y="75.46" width="64.3" height="15.45"/></svg>`;

// The footer: five groups of links. The addresses are the code's (a link target is not translated); every word the footer shows is a catalogue key of the shared group (web-src/i18n/<tag>.json), read through t().
const FOOTER_GROUPS = [
  [null, [['/', 'home']]],
  ['group-product', [['/pricing', 'pricing'], ['/changelog', 'changelog']]],
  ['group-legal', [['/terms', 'terms'], ['/privacy', 'privacy'], ['/refund', 'refund']]],
  ['group-code', [['https://github.com/Kolwen-AI/Kolwen', 'github'], ['https://huggingface.co/kolwen', 'huggingface'], ['https://www.npmjs.com/package/kolwen', 'npm'], ['/llms.txt', 'llms']]],
  ['group-contact', [['mailto:info@kolwen.com', 'email'], ['mailto:support@kolwen.com', 'support'], ['mailto:abuse@kolwen.com', 'abuse'], ['mailto:appeals@kolwen.com', 'appeals'], ['https://kolwen.com/.well-known/security.txt', 'security']]],
];
const NAMES = new Set(['github', 'huggingface', 'npm', 'llms']); // product names, in the shared.names group; every other link label is in shared.footer
// A render parameter for the commercial registration number and the DBD mark: { en: 'text', th: 'text' }, or null. It prints NOTHING until it is set (no
// placeholder text, no empty element), and is set only after the registration and the lawyer's issue are in.
export const REGISTRATION = null;
// A page's own address: the English page keeps its path (/, /terms); the Thai page of the same page is under /th/ (/th/, /th/terms). The English address is the default
// and the x-default, so nothing assumes a Thai reader (ORDER 1017j CONTINUE 152).
export const LANGS = ['en', 'th'];
// The switch is a plain link now: no live button is written, so rule 17 allows none.
export const SWITCH_BUTTONS = [];
export const urlOf = (path, lang) => (lang === 'th' ? (path === '/' ? '/th/' : '/th' + path) : path);
// The site's own page addresses. A Thai page writes these under /th/ (its links to each other and to the header and footer); no other address is rewritten.
export const PAGE_PATHS = ['/', '/pricing', '/changelog', '/terms', '/privacy', '/refund', '/accessibility', '/legal', '/subprocessors', '/status'];
const localHref = (u, lang) => (PAGE_PATHS.includes(u) ? urlOf(u, lang) : u);
// The file of a page in one language: web/terms.html is English, web/th/terms.html is Thai.
export const fileOf = (file, lang) => (lang === 'th' ? file.replace(/^web\//, 'web/th/') : file);
// A whole page's links to its own site pages, in the Thai file. Only an exact href to one of PAGE_PATHS moves.
// The language switch's own link is left alone: it names the OTHER language's address, which the shared block already holds (its render is the page's context).
export const localizeLinks = (html, lang) => (lang === 'en' ? html : html.replace(/<a\b[^>]*>/g, tag => (tag.includes('class="lang-link"') ? tag : tag.replace(/href="(\/[^"]*)"/g, (m, p) => (PAGE_PATHS.includes(p) ? `href="${urlOf(p, 'th')}"` : m)))));

export const siteFooterHtml = (ctx, registration = REGISTRATION) => {
  const { lang } = ctx;
  const reg = registration && registration[lang] ? `<p class="fine freg">${escText(registration[lang])}</p>` : '';
  const label = key => tHtml(lang, NAMES.has(key) ? 'shared.names.' + key : 'shared.footer.' + key);
  return [`<footer class="site-footer" lang="${lang}">`, '<div class="fwrap">', `<p class="fbrand">${markSvg(24, 'fglyph')}${tHtml(lang, 'shared.brand')}</p>`,
    `<nav class="fgroups" aria-label="${escAttr(t(lang, 'shared.footer.label'))}">`,
    ...FOOTER_GROUPS.map(([head, links]) => `<div class="fgroup"><p class="fh">${head ? label(head) : tHtml(lang, 'shared.brand')}</p>${links.map(([u, key]) => `<a href="${escAttr(localHref(u, lang))}">${label(key)}</a>`).join('')}</div>`),
    '</nav>', '<div class="fbar">', `<p class="fine">${tHtml(lang, 'shared.footer.note')}</p>`, reg, switchHtml(ctx), '</div>', '</div>', '</footer>'].filter(Boolean).join('\n');
};

// The language switch: the current language as text (aria-current), the other as a plain link to the same page in that language.
// The link carries the class the page script reads (the section it keeps), its lang and hreflang.
const switchHtml = ctx => {
  const { lang } = ctx;
  const other = lang === 'th' ? 'en' : 'th';
  const to = urlOf(ctx.path ?? '/', other);
  return `<div class="lswitch" role="group" aria-label="${escAttr(t(lang, 'shared.header.language'))}"><span lang="${lang}" aria-current="page">${tHtml('en', 'shared.switch.' + lang)}</span><a class="lang-link" href="${escAttr(to)}" lang="${other}" hreflang="${other}">${tHtml('en', 'shared.switch.' + other)}</a></div>`;
};

// The skip link (C1): one per page, in the page's language, immediately before the header. Its target is the page's main (id="main", tabindex="-1").
const skipLinkHtml = lang => `<a class="skip" href="#main" lang="${lang}">${tHtml(lang, 'shared.skip')}</a>`;
// The header: the skip link, then the Kolwen mark linking to the home page, Pricing, and the switch. No Dashboard and no Sign in until the service exists.
export const siteHeaderHtml = ctx => {
  const { lang } = ctx;
  return [skipLinkHtml(lang), '<header class="site-header">',
    `<nav lang="${lang}" aria-label="${escAttr(t(lang, 'shared.header.label'))}">`,
    `<a class="hmark" href="${urlOf('/', lang)}" aria-label="${escAttr(t(lang, 'shared.header.home'))}">${markSvg(26, 'hglyph')}<span>${tHtml(lang, 'shared.brand')}</span></a>`,
    `<a href="${urlOf('/pricing', lang)}">${tHtml(lang, 'shared.header.pricing')}</a>`, switchHtml(ctx), '</nav>', '</header>'].join('\n');
};

// The head links of a page: the canonical (its own address), the three alternates (en, th and x-default, which is the English address), and the Open Graph URL and locales.
// The 404 pages have no address of their own, so they carry no canonical and no alternates (only the locale).
export const siteLinksHtml = ctx => {
  const { lang, path } = ctx;
  const locale = [`<meta property="og:locale" content="${lang === 'th' ? 'th_TH' : 'en_US'}">`, `<meta property="og:locale:alternate" content="${lang === 'th' ? 'en_US' : 'th_TH'}">`];
  if (path === null || path === undefined) return locale.join('\n');
  const self = 'https://kolwen.com' + urlOf(path, lang), en = 'https://kolwen.com' + urlOf(path, 'en'), th = 'https://kolwen.com' + urlOf(path, 'th');
  return [`<link rel="canonical" href="${escAttr(self)}">`, `<link rel="alternate" hreflang="en" href="${escAttr(en)}">`, `<link rel="alternate" hreflang="th" href="${escAttr(th)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escAttr(en)}">`, `<meta property="og:url" content="${escAttr(self)}">`, ...locale].join('\n');
};

// What is true only of pages that store the language choice (not of the 404 page), so it is not in the shared block. The fonts are the site's own files and need no mention here.
export const pageNoteHtml = lang => `<p class="fine">${tHtml(lang, 'shared.page.note')}</p>`;
// The footer blocks a page holds, in document order.
export const footersOf = html => html.match(/<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/g) || [];

// ── 5a. The blocks the build-time sync owns, and the markers around them (the one place the marker names are written) ──
// Every one of the seven pages is generated and carries each block between its markers: the four legal pages from `shell()` below, and home, pricing and the 404 page from their templates
// (`{{block:name}}`, section 5c). So one edit to the header, the footer or the page script reaches all seven pages in one `node scripts/legal-pages.mjs --write`, and `--check` names the block
// that drifted. A marker pair is a fixed comment: an HTML comment in the body, a CSS comment in a style block, a JS comment in the script. scripts/lib/page-sync.mjs reads them.
// The one stylesheet that names every typeface: web/fonts/fonts.css, same-origin, so a page fetches its fonts from the site itself and from no one else.
export const FONT_LINK = '<link rel="stylesheet" href="/fonts/fonts.css">';
const htmlPair = name => ({ name, begin: `<!-- ${name}:begin -->`, end: `<!-- ${name}:end -->` });
const cssPair = name => ({ name, begin: `/* ${name}:begin */`, end: `/* ${name}:end */` });
// THE ORDER OF THIS ARRAY IS THE ONE EXPECTED DOCUMENT ORDER of the pairs in every page (each file is one language, so each carries every block once): the head links and the font
// manifest first, the layout tokens, the header, footer and reader-without-script rules in the style block, then the header, the footer and the page script at the end of the body.
// Each render takes the page's context ({ lang, path }): the head links, the header and the footer are the page's own. scripts/lib/page-sync.mjs reads the pairs in this order and
// refuses (--check and --write) a page whose pairs overlap, nest or stand in another order.
export const SYNC_BLOCKS = [
  { ...htmlPair('site-links'), label: 'head links', shared: 'head links', render: ctx => siteLinksHtml(ctx) },
  { ...htmlPair('site-fonts'), label: 'font manifest link', shared: 'font manifest link', render: () => FONT_LINK },
  { ...cssPair('site-tokens-css'), label: 'layout tokens', shared: 'layout tokens', render: () => tokensCss() },
  { ...cssPair('site-header-css'), label: 'header css', shared: 'header rules', render: () => HEADER_CSS },
  { ...cssPair('site-footer-css'), label: 'footer css', shared: 'footer rules', render: () => FOOTER_CSS },
  { ...cssPair('site-noscript-css'), label: 'noscript css', shared: 'rules for a reader without script', render: () => NOSCRIPT_STYLE },
  { ...htmlPair('site-header'), label: 'header', shared: 'header', render: ctx => siteHeaderHtml(ctx) },
  { ...htmlPair('site-footer'), label: 'footer', shared: 'footer', render: ctx => siteFooterHtml(ctx) },
  { ...cssPair('site-script'), label: 'page script', shared: 'page script', render: () => SCRIPT },
];
const BLOCK = Object.fromEntries(SYNC_BLOCKS.map(b => [b.name, b]));
// A block as a page carries it: begin marker, the render for the page's context, end marker, with the end marker at the start of its line.
export const fenced = (name, ctx = {}) => `${BLOCK[name].begin}\n${BLOCK[name].render(ctx) ? BLOCK[name].render(ctx) + '\n' : ''}${BLOCK[name].end}`;
// The blocks of one page, as a list whose render is bound to that page's context (page-sync reads them with render()).
export const syncBlocksAt = ctx => SYNC_BLOCKS.map(b => ({ ...b, render: () => b.render(ctx) }));
// The renders of one page for a template's {{block:name}} slots.
export const blocksAt = ctx => Object.fromEntries(SYNC_BLOCKS.map(b => [b.name, () => fenced(b.name, ctx)]));

export const pageScriptHtml = () => `<script>\n${fenced('site-script')}\n</script>`;

// THE PLAN TABLE SCROLLS, THE PAGE DOES NOT (WCAG 2.2 SC 1.4.10). The comparison table of the pricing page is a data table, and the criterion exempts "parts of the content which require two-dimensional layout
// for usage or meaning"; its Note 2 names "data tables (not individual cells)" among them (w3.org/WAI/WCAG22/Understanding/reflow.html, read 2026-10-19). So the table may be wider than the viewport and scroll
// sideways INSIDE its wrapper (`.plans-wrap`, overflow-x:auto), as long as the page around it does not (the rendered check's reflow test reads the page's scrollWidth); each cell must still reflow.
// Measured at 320 px, in the English document: the table needs 275.6 px with the font hinting off and 290 px with FreeType's medium or full hinting (a Linux browser may apply either), against 238 px of card
// content. With the hinting off it ended 3.4 px before the viewport's edge (past the card's own border); with medium or full hinting it ended 11 px past the edge, and the whole page scrolled sideways.
// The wrapper is a named region and takes focus (role=region, aria-label from the catalogue, tabindex=0), because a scrolling box with no focusable content cannot be scrolled by keyboard in every browser
// (SC 2.1.1); its focus ring is the site's own.
// ── 5b. The page shell (the site's own: fonts, colours, the language toggle and its noscript rule) ──
// One style block serves the four generated pages (terms, privacy, refund, changelog) AND web/pricing.html, so the five share one CSP hash (surface-check rule 13). The pricing template
// takes it whole as {{raw:style}}; `legal-pages.mjs --check` fails if the page's style block is not byte-for-byte this one.
export const STYLE = `
${fenced('site-tokens-css')}
  :root{--bg:#0f0d0b;--bg2:#15130f;--card:#1a1714;--line:rgba(255,255,255,.08);--txt:#ece4d9;--txt2:#a89a8c;--quiet:#a2968a;--accent:#e8833a;--accent2:#ffbb7a}
  *{box-sizing:border-box;margin:0}
  body{background:radial-gradient(circle at 20% 0%,rgba(232,131,58,.07),transparent 55%),var(--bg);color:var(--txt);font-family:'KW Sans Thai',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:stretch;padding:0;line-height:var(--kw-line-height-body)}
  body{container-type:inline-size}
  html[data-job="default"]{color-scheme:dark}
  main{flex:1 0 auto;width:100%;max-width:var(--kw-size-container-reading);margin:0 auto;padding-block:var(--kw-space-inset-block-start) 0;padding-inline:var(--kw-space-gutter-inline);display:flex;flex-direction:column;gap:var(--kw-space-section)}
  a:focus-visible,button:focus-visible,.plans-wrap:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}
  .mark{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none}
  .glyph{flex:none;display:block}
  .name{font-size:var(--kw-font-size-display);font-weight:700;letter-spacing:.01em}
  .thai{font-size:var(--kw-font-size-7);color:var(--quiet);font-weight:500}
  h1{font-size:var(--kw-font-size-title);font-weight:600;line-height:1.5}
  .sub{color:var(--txt2);font-size:var(--kw-font-size-6);margin-top:8px}
  .card{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:18px 20px;display:flex;flex-direction:column;gap:10px}
  .card h2,.card h3{font-size:var(--kw-font-size-3);font-weight:600;color:var(--quiet);letter-spacing:.04em;text-transform:uppercase;font-family:'KW Mono','KW Sans Thai',monospace}
  .card p,.card li{font-size:var(--kw-font-size-6);color:var(--txt2)}
  .card strong{color:var(--txt);font-weight:600}
  .card ul{padding-left:20px;display:flex;flex-direction:column;gap:6px}
  .card code{font-family:'KW Mono','KW Sans Thai',monospace;font-size:var(--kw-font-size-4);color:var(--txt)}
  .plans-wrap{overflow-x:auto;color-scheme:dark;max-height:calc(100vh - var(--kw-space-inset-block-start));max-height:calc(100svh - var(--kw-space-inset-block-start))}
  @supports (scrollbar-color:auto){.plans-wrap{scrollbar-color:var(--quiet) var(--bg2)}}
  @media (min-width:1024px){.plans-wrap{overflow-x:visible;max-height:none}}
  .plans{width:100%;border-collapse:collapse;font-size:var(--kw-font-size-5)}
  .plans caption{text-align:left;padding:0 0 8px;font-size:var(--kw-font-size-2);color:var(--quiet);font-family:'KW Mono','KW Sans Thai',monospace}
  .plans th,.plans td{text-align:left;padding:8px var(--kw-space-cell) 8px 0;font-size:var(--kw-font-size-cell);border-bottom:1px solid var(--line);color:var(--txt2);font-weight:400;vertical-align:middle}
  .plans thead th{font-size:var(--kw-font-size-2);color:var(--quiet);font-family:'KW Mono','KW Sans Thai',monospace}
  .plans tbody th{color:var(--txt);font-weight:600}
  .plans tbody th small{display:block;font-size:var(--kw-font-size-2);color:var(--quiet);font-weight:400}
  .plans thead th{position:sticky;top:0;background:var(--card);z-index:1;box-shadow:inset 0 -1px 0 var(--line)}
  .plans tbody th,.plans thead th:first-child{position:sticky;left:0;background:var(--card)}
  .plans thead th:first-child{z-index:2}
  .plans button,.pcard button{font:inherit;font-size:var(--kw-font-size-2);color:var(--quiet);background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 12px;min-height:34px;cursor:not-allowed}
  .plans button{padding-inline:var(--kw-space-button)}
  .ch{display:flex;flex-wrap:wrap;gap:8px}
  .ch a{color:var(--txt);text-decoration:none;font-size:var(--kw-font-size-4);border:1px solid var(--line);border-radius:9px;padding:7px 12px;background:var(--bg2);display:inline-flex;align-items:center;gap:7px;min-height:44px}
  .ch a:hover{border-color:rgba(232,131,58,.4);color:var(--accent2)}
  footer{margin-top:6px;font-size:var(--kw-font-size-1);color:var(--quiet);display:flex;flex-direction:column;gap:4px}
  .banner{border:1px solid rgba(232,131,58,.45);background:rgba(232,131,58,.08);border-radius:10px;padding:12px 14px;font-size:var(--kw-font-size-body);color:var(--txt);margin-top:14px}
  .legal{display:flex;flex-direction:column;gap:14px}
  .legal > * + *{margin-top:0}
  .legal h2{font-size:var(--kw-font-size-9);font-weight:600;line-height:1.5;margin-top:14px}
  .legal h3{font-size:var(--kw-font-size-8);font-weight:600;line-height:1.5;margin-top:6px}
  .legal p,.legal li{font-size:var(--kw-font-size-body);color:var(--txt2);overflow-wrap:anywhere}
  .legal strong{color:var(--txt);font-weight:600}
  .legal ul,.legal ol{padding-left:22px;display:flex;flex-direction:column;gap:8px}
  .legal code{font-family:'KW Mono','KW Sans Thai',monospace;font-size:var(--kw-font-size-3);color:var(--txt);overflow-wrap:anywhere}
  .pending{color:var(--quiet) !important;font-style:italic}
  .bill{display:flex;flex-wrap:wrap;gap:8px;align-items:center;position:relative}
  .bill > input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
  .bill > label{font-size:var(--kw-font-size-4);color:var(--quiet);background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:8px 14px;min-height:40px;display:inline-flex;align-items:center;cursor:pointer}
  .bill > input:checked + label{color:var(--accent2);border-color:rgba(232,131,58,.55);background:rgba(232,131,58,.10)}
  .bill > input:focus-visible + label{outline:2px solid var(--accent2);outline-offset:2px}
  .bill .pcards{flex-basis:100%;display:grid;gap:14px;grid-template-columns:minmax(0,1fr);margin-top:6px}
  @media (min-width:640px){.bill .pcards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (min-width:1024px){.bill .pcards{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media (min-width:640px){.wide-card{--pw:min(var(--kw-size-container-wide),100cqw - 2 * var(--kw-space-inset-inline));width:var(--pw);margin-inline:calc((100% - var(--pw)) / 2)}}
  @media (min-width:640px){.wide-card > :not(.bill):not(.plans-wrap){max-width:calc(var(--kw-size-container-reading) - 2 * var(--kw-space-inset-inline));margin-inline:auto}}
  .bill > input[value="y"]:checked ~ .pcards .mo{display:none}
  .bill > input[value="m"]:checked ~ .pcards .yr{display:none}
  .pcard{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:16px 18px;display:flex;flex-direction:column;gap:8px}
  .pcard h3{font-size:var(--kw-font-size-9);font-weight:600;color:var(--txt);font-family:inherit;text-transform:none;letter-spacing:0}
  .faq h3{font-size:var(--kw-font-size-7);font-weight:600;color:var(--txt);font-family:inherit;text-transform:none;letter-spacing:0}
  .card a,.legal a{color:var(--accent2)}
  .pcard .badge{font-size:var(--kw-font-size-2);color:var(--quiet);font-family:'KW Mono','KW Sans Thai',monospace}
  .pcard .price{font-size:var(--kw-font-size-11);font-weight:700;color:var(--txt)}
  .pcard ul{padding-left:18px;display:flex;flex-direction:column;gap:5px}
  .pcard li{font-size:var(--kw-font-size-5);color:var(--txt2)}
  .note{font-size:var(--kw-font-size-3);color:var(--quiet)}
${fenced('site-header-css')}
${fenced('site-footer-css')}
  [hidden]{display:none !important}
  @media (max-width:359px){.plans th,.plans td{padding-right:2px}}
`;

// What a reader without script gets: no switch (it would do nothing), the Thai document shown under the English one, and the Thai header and footer shown too.
// What a reader without script gets. Each file is one language, the switch is a plain link and the page script only adds the section fragment, so no rule is needed.
export const NOSCRIPT_STYLE = '';

// The page script. A page's language is its own address (no choice is stored), so the script does two small things and nothing else:
//   1. it removes the one key a version before this one kept in the browser, so nothing is stored any more;
//   2. following the other-language link keeps the reader's place (M5): the link goes to the same section of the other page. The section is the last h2 whose top is above the top of
//      the viewport; each language's h2 carries the same id (the renderer writes them in order), so the other page's section has the same id. With no such h2, the link goes to the top.
// With the script blocked, the link still works and lands at the top of the other page.
export const SCRIPT = `(function () {
  try { localStorage.removeItem('kolwen-lang'); } catch (e) {}
  function sectionAbove() {
    var found = null, hs = document.querySelectorAll('main h2[id]');
    for (var i = 0; i < hs.length; i++) { if (hs[i].getBoundingClientRect().top < 1) found = hs[i].id; else break; }
    return found;
  }
  // K-179: focusing the language link (Tab) scrolls the page to the top, where no section is above, so the last section read while nothing had the link's focus is kept. A
  // keyboard activation (detail 0) uses it when the live read is empty; a mouse click reads the live section only, as before.
  // The section the page opened at, when its fragment names one, is known before any scroll event (K-179), so it starts the remembered value.
  function hashSection() { var h = location.hash.slice(1), el = h && document.getElementById(h); return el && el.tagName === 'H2' && el.closest('main') ? h : null; }
  var links = document.querySelectorAll('a.lang-link'), kept = hashSection();
  function languageFocused() { var a = document.activeElement; return !!a && a.classList.contains('lang-link'); }
  window.addEventListener('scroll', function () { var s = sectionAbove(); if (s || !languageFocused()) kept = s; }, { passive: true });
  // K-181: every activation writes the href, so an address a keyboard switch left behind is never reused: no fragment when no section applies. A page the browser restores from
  // its back-forward cache (persisted) keeps the last href and the remembered section of the earlier visit, so both are reset to the page's own address.
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (e) {
      var id = sectionAbove() || (e.detail === 0 ? kept : null);
      this.href = this.href.split('#')[0] + (id ? '#' + id : '');
    });
  }
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    kept = hashSection();
    for (var j = 0; j < links.length; j++) links[j].href = links[j].href.split('#')[0];
  });
  // The status page is the one page with a [data-status] element. It reads /status.json, the last health check the Worker stored, and writes the state, the time and one row per
  // probed page as text: the numbers, paths and times come from the data, and every word on the page comes from the catalogue. Without the fetch the page keeps its unavailable line.
  if (document.querySelector('[data-status]')) {
    fetch('/status.json', { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('status ' + res.status); return res.json(); })
      .then(showStatus)
      .catch(function () { /* the page keeps its unavailable line */ });
  }

  function showStatus(data) {
    var state = 'none';
    if (data.checked) state = data.probes.every(function (p) { return p.ok; }) ? 'ok' : 'failing';
    var lines = document.querySelectorAll('[data-state]');
    for (var i = 0; i < lines.length; i++) lines[i].hidden = lines[i].getAttribute('data-state') !== state;
    if (!data.checked) return;
    var times = document.querySelectorAll('[data-fill="checked"]');
    for (var j = 0; j < times.length; j++) { times[j].textContent = data.checked; times[j].setAttribute('datetime', data.checked); }
    var lists = document.querySelectorAll('[data-fill="probes"]');
    for (var k = 0; k < lists.length; k++) {
      lists[k].textContent = '';
      var labels = marks(lists[k]);
      for (var m = 0; m < data.probes.length; m++) lists[k].appendChild(probeRow(data.probes[m], labels));
    }
  }

  // A row's OK and FAIL labels come from the language section that holds its list, so a Thai row says ผ่าน or ไม่ผ่าน.
  function marks(list) {
    var lang = list.closest('[lang]');
    return { ok: lang.querySelector('[data-mark="ok"]').textContent, fail: lang.querySelector('[data-mark="fail"]').textContent };
  }

  function probeRow(p, labels) {
    var li = document.createElement('li');
    var path = document.createElement('span');
    path.className = 'path';
    path.textContent = p.path;
    var code = document.createElement('span');
    code.textContent = p.status ? String(p.status) : '-';
    var ms = document.createElement('span');
    ms.textContent = p.ms + ' ms';
    var mark = document.createElement('span');
    mark.textContent = p.ok ? labels.ok : labels.fail;
    li.appendChild(path);
    li.appendChild(code);
    li.appendChild(ms);
    li.appendChild(mark);
    return li;
  }
})();`;


// `job` is the page's declaration of what it is for (layout-tokens.mjs, THE READING THEME): a prose page is read top to bottom and takes the reading theme, and says so on <html> and in its theme-color.
// `lang` is the language of this file (one language per file): <html lang>, the header, the footer, the head links and every text of the page are that language's.
export function shell({ lang, title, description, path, body, job }) {
  if (!JOBS.includes(job)) throw new Error(`the page ${path} declares no job (one of ${JOBS.join(', ')})`);
  const ctx = { lang, path };
  const html = `<!DOCTYPE html>
<html lang="${lang}" data-job="${job}">
<head>
<meta charset="utf-8">
${VIEWPORT_META}
<title>${escText(title)}</title>
${description ? `<meta name="description" content="${escAttr(description)}">` : ''}
${fenced('site-links', ctx)}
<meta property="og:type" content="website">
<meta property="og:title" content="${escAttr(title)}">
${description ? `<meta property="og:description" content="${escAttr(description)}">` : ''}
<meta property="og:image" content="https://kolwen.com/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escAttr(t(lang, 'shared.share.image-alt'))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(title)}">
${description ? `<meta name="twitter:description" content="${escAttr(description)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${job === 'prose' ? readingMeta() : '<meta name="theme-color" content="#15130f">'}
${fenced('site-fonts', ctx)}
<style>${STYLE}</style>
<noscript><style>
${fenced('site-noscript-css', ctx)}
</style></noscript>
</head>
<body>
${fenced('site-header', ctx)}
<main id="main" tabindex="-1">
${body}
</main>
${fenced('site-footer', ctx)}
${pageScriptHtml()}
</body>
</html>
`;
  return localizeLinks(sectionIdsFor(path, lang, html), lang);
}

// K-169: each h2 takes its id from its own heading text, not from its place on the page, so inserting a section moves no other id. A legal page's Thai file renders
// the same English heading text, so one section has one id in both files (the switch's fragment, M5). A template page whose Thai headings differ carries its ids in
// the template. The old positional fragments, s-1, s-2 ..., are kept by a frozen map (legal-section-legacy.mjs, by path and language): each is an empty span before
// its heading, so `#s-N` still reaches the section it reached. The span is not an h2, so the language switch does not read it.
// One pass over the entities: each is decoded once, so an escaped entity (`&amp;lt;`) stays text (`&lt;`) and is never decoded again (CodeQL #75).
const HEADING_ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
export function headingText(inner) {
  return inner.replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, name) => HEADING_ENTITY[name]).replace(/\s+/g, ' ').trim();
}
import { LEGACY_SECTIONS } from './legal-section-legacy.mjs';
// A heading must slug to a non-empty ASCII id (a Thai-only heading needs an explicit id in its source), and editing a heading's text changes its id: give it an explicit id before renaming it.
const slugOf = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
export function sectionIds(html, legacy = {}) {
  const aliasOf = new Map(Object.entries(legacy).map(([id, text]) => [text, id]));
  const used = new Map([...html.matchAll(/\sid="([^"]+)"/g)].map(m => [m[1], 'an id already on the page']));
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    const text = headingText(inner);
    const alias = aliasOf.get(text);
    if (alias) aliasOf.delete(text);
    const span = alias ? `<span id="${alias}"></span>` : '';
    if (attrs && /\sid=/.test(attrs)) return `<h2${attrs}>${span}${inner}</h2>`;
    // A collision is an error, never a positional suffix: a suffix would give the later heading a new fragment and move every section after it.
    const id = slugOf(text);
    if (used.has(id)) throw new Error(`two headings slug to the id "${id}": "${used.get(id)}" and "${text}". Give one of them an explicit id in its source.`);
    used.set(id, text);
    return `<h2 id="${id}"${attrs || ''}>${span}${inner}</h2>`;
  });
}
const K_LEGACY = LEGACY_SECTIONS;
export function sectionIdsFor(path, lang, html) {
  return sectionIds(html, (K_LEGACY[path] || {})[lang] || {});
}


function docHtml(lang, title, body, draft = true, note = '') {
  return `    <div>
      <h1>${escText(title)}</h1>${note ? `
      <p class="sub">${escText(note)}</p>` : ''}${draft ? `
      <p class="banner" role="note">${escText(BANNER[lang])}</p>` : ''}
    </div>
    <div class="legal">
      ${body}${draft ? `
      <p class="pending">${escText(THAI_OWED[lang])}</p>` : ''}
    </div>

${pageNoteHtml(lang)}`;
}

// ── 5c. The four site pages, from their templates and the language catalogue ──────────────────────────────────
// Home, pricing, the 404 page and the status page are templates (web-src/pages/<group>.html) whose slots are filled from web-src/i18n/<tag>.json, and the shared blocks come in whole as
// {{block:name}}, so these pages are all generated and none has a part that is kept by hand (build-qc.md C-FMT-02). The group is the top-level key of the catalogue that the page reads (with `shared`): a page that
// moves to another domain keeps its strings. The status page is unannounced (no link, not in the sitemap; it carries no noindex, which surface-check rule 16 refuses on a production page). The subprocessor page is unannounced the same way; it carries the one noindex that rule 16 exempts by name; its reading of /status.json is part of the shared inline page script, which runs it only on a page with [data-status].
// `path` is the English address of the page (the Thai file's address is /th/ followed by it); null for the 404 page, which has no address of its own.
export const SITE_PAGES = [
  { group: 'home', template: 'web-src/pages/home.html', file: 'web/index.html', path: '/' },
  { group: 'pricing', template: 'web-src/pages/pricing.html', file: 'web/pricing.html', path: '/pricing' },
  { group: 'notfound', template: 'web-src/pages/notfound.html', file: 'web/404.html', path: null },
  { group: 'status', template: 'web-src/pages/status.html', file: 'web/status.html', path: '/status' },
  // The subprocessor page: prose, unannounced; its noindex is exempted by name in surface-check rule 16.
  { group: 'subprocessors', template: 'web-src/pages/subprocessors.html', file: 'web/subprocessors.html', path: '/subprocessors' },
  { group: 'legal', template: 'web-src/pages/legal.html', file: 'web/legal.html', path: '/legal' },
  { group: 'accessibility', template: 'web-src/pages/accessibility.html', file: 'web/accessibility.html', path: '/accessibility' },
];
// templates: { group: source }, messages: { lang: { key: value } }. Each page is written twice, once per language, in its own file (fileOf). Returns
// { pages: { 'web/index.html': html, 'web/th/index.html': html, ... }, contexts: { file: { lang, path } }, problems: [line] }.
// The shared blocks and the template's slots read the page's language and address; withCatalogue puts the caller's `messages` in place for the whole render.
// The template's own <html lang="en"> line (outside every language region) takes the page's language.
const setHtmlLang = (html, lang) => html.replace('<html lang="en"', '<html lang="' + lang + '"');
export function renderSitePages({ templates, messages }) {
  return withCatalogue(messages, () => {
    const pages = {}, contexts = {}, problems = [];
    for (const p of SITE_PAGES) {
      if (typeof templates[p.group] !== 'string') { problems.push(`${p.template} is missing`); continue; }
      for (const lang of LANGS) {
        const ctx = { lang, path: p.path };
        const file = fileOf(p.file, lang);
        try {
          pages[file] = localizeLinks(sectionIdsFor(p.path, lang, setHtmlLang(renderTemplate(templates[p.group], { lang, messages, blocks: blocksAt(ctx), raw: { style: STYLE, script: pageScriptHtml(), reading: readingMeta() } }), lang)), lang);
          contexts[file] = ctx;
        } catch (e) { problems.push(`${p.template} (${lang}): ${e.message}`); }
      }
    }
    return { pages, contexts, problems };
  });
}

// ── 6. The four pages ──────────────────────────────────────────────────────────────────────────
// inputs: { terms, privacy, clause, changelog (CHANGELOG.md, optional: without it the changelog page is not rendered), state (the parsed legal-state record), holds (the parsed hold list) }.
// Returns { pages: { 'web/terms.html': html, ... }, report: [line], problems: [line] }.
export function renderPages(inputs) {
  const { state, holds } = inputs;
  const problems = [];
  // The controller name (scripts/lib/controller-slot.mjs): a record with no name is the record of today. The slot is filled in PRIVACY.md only, and the other sources refuse it.
  const controller = inputs.controller ?? { schema: 1, name: '' };
  problems.push(...validateController(controller).map(p => `${CONTROLLER_FILE}: ${p}`));
  const filled = {};
  for (const [key, file] of [['terms', SOURCES.terms], ['privacy', SOURCES.privacy], ['clause', SOURCES.clause], ['changelog', SOURCES.changelog]]) {
    if (typeof inputs[key] !== 'string') continue;
    const f = fillController(file, inputs[key], controller);
    filled[key] = f.text;
    problems.push(...f.problems);
  }
  const { terms, privacy, clause, changelog } = filled;
  const since = state ? activeSince(state) : null;
  const active = since !== null;
  const clauseText = active ? clause.split('{{since}}').join(since) : clause;
  const opts = { holds: holds.holds, active };
  const report = [];
  const pages = {}, contexts = {};

  const perFile = {
    [SOURCES.terms]: classify(SOURCES.terms, terms, opts),
    [SOURCES.privacy]: classify(SOURCES.privacy, privacy, opts),
    [SOURCES.clause]: classify(SOURCES.clause, clauseText, opts),
  };
  problems.push(...holdProblems(holds.holds, perFile));
  for (const p of PENDING_LINES) if (!(perFile[p.file] && perFile[p.file].items.some(i => i.kind === 'passage' && i.held && i.anchor === p.anchor))) problems.push(`the specific pending line for "${p.anchor}" matches no held passage of ${p.file}`);

  // Each legal page is two files: the English one and the Thai one. Each carries only its language's document, its header, its footer and its address.
  const done = (key, lines, draft = true) => {
    const P = PAGES[key];
    for (const lang of LANGS) {
      const file = fileOf(P.file, lang);
      pages[file] = shell({
        // The English file has the English description; the Thai file has the Thai one when the page has one, and none otherwise (no Thai description exists for the legal pages).
        lang, title: lang === 'en' ? P.metaTitleEn : P.metaTitleTh, description: lang === 'en' ? P.descEn : (P.descTh || ''), path: P.path, job: P.job,
        body: docHtml(lang, lang === 'en' ? P.titleEn : P.titleTh, lines[lang].html, draft, lang === 'en' ? '' : (P.noteTh || '')),
      });
      contexts[file] = { lang, path: P.path };
      problems.push(...lines[lang].errors.map(e => `${file} (${lang}): ${e}`));
    }
    return lines.en.stats;
  };

  const say = (page, src, s, extra) => report.push(`${page}: ${src} ${s.passages} passages = ${s.text} shown as written + ${s.held} pending lines${extra || ''}`);
  for (const [key, srcKey, mdText] of [['terms', 'terms', terms], ['privacy', 'privacy', privacy]]) {
    const file = SOURCES[srcKey];
    const en = renderSource(file, mdText, 'en', opts), th = renderSource(file, mdText, 'th', opts);
    say(PAGES[key].file, file, done(key, { en, th }));
  }
  const ren = refundBody(clauseText, perFile[SOURCES.terms], 'en', opts), rth = refundBody(clauseText, perFile[SOURCES.terms], 'th', opts);
  const rs = done('refund', { en: ren, th: rth });
  say(PAGES.refund.file, 'refund rows', rs);
  const cs = perFile[SOURCES.clause].stats;
  report.push(`${PAGES.refund.file}: ${SOURCES.clause} ${cs.passages} passages = ${cs.text} shown as written + ${cs.held} held${active ? ` (in force since ${since}: shown in place of R8)` : ' (not in force: held, shown as the one pending line R8)'}`);
  // The changelog: the repository's own CHANGELOG.md, every passage shown as written (nothing in it waits for counsel, so no hold applies).
  if (typeof changelog === 'string') {
    const o = { holds: [], noHold: true };
    const en = renderSource(SOURCES.changelog, changelog, 'en', o), th = renderSource(SOURCES.changelog, changelog, 'th', o);
    say(PAGES.changelog.file, SOURCES.changelog, done('changelog', { en, th }, false));
  }
  return { pages, contexts, report, problems };
}
