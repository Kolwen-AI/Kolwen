// The text the generated pages ADD to what their sources say (the three legal sources, and CHANGELOG.md for the changelog page; data only; scripts/lib/legal-render.mjs and scripts/legal-pages.mjs use it).
//
// Everything a page shows is one of three things: a source passage shown as written, a pending line standing in for a held passage, or
// a line below. Nothing below states a legal conclusion: each line is a status, a fact the repository backs, or a pending line.
// Every pending line begins with the counsel-pending marker of its language, and render() refuses a pending row that does not.

export const MARK_EN = '[pending legal review]';
export const MARK_TH = '[รอที่ปรึกษากฎหมาย]';

export const PAGES = {
  terms: {
    file: 'web/terms.html', path: '/terms', job: 'prose',
    metaTitleEn: 'Kolwen terms of use: a draft that is not yet in force', metaTitleTh: 'ข้อกำหนดการใช้งาน Kolwen: ฉบับร่างที่ยังไม่มีผลบังคับใช้',
    titleEn: 'Terms', titleTh: 'ข้อกำหนด',
    descEn: 'Kolwen terms: a draft, not in force. Nothing is for sale, and parts of it wait for review by counsel.',
    descTh: 'ข้อกำหนดของ Kolwen: ฉบับร่าง ยังไม่มีผลใช้บังคับ ยังไม่มีสินค้าให้ซื้อ และบางส่วนรอที่ปรึกษากฎหมายตรวจสอบ',
  },
  privacy: {
    file: 'web/privacy.html', path: '/privacy', job: 'prose',
    metaTitleEn: 'Kolwen privacy notice: what the site does today (draft)', metaTitleTh: 'นโยบายความเป็นส่วนตัวของ Kolwen: เว็บไซต์ทำอะไรในวันนี้ (ฉบับร่าง)',
    titleEn: 'Privacy', titleTh: 'ความเป็นส่วนตัว',
    descEn: 'Kolwen privacy notice: a draft. It states what this site does today, and parts of it wait for review by counsel.',
    descTh: 'นโยบายความเป็นส่วนตัวของ Kolwen: ฉบับร่าง ระบุสิ่งที่เว็บไซต์ทำในวันนี้ และบางส่วนรอที่ปรึกษากฎหมายตรวจสอบ',
  },
  refund: {
    file: 'web/refund.html', path: '/refund', job: 'prose',
    metaTitleEn: 'Kolwen refund terms: a draft, and nothing is for sale yet', metaTitleTh: 'การคืนเงินของ Kolwen: ฉบับร่าง และยังไม่มีสินค้าขาย',
    titleEn: 'Refunds', titleTh: 'การคืนเงิน',
    descEn: 'Kolwen refund terms: a draft. Nothing is for sale yet, and parts of it wait for review by counsel.',
    descTh: 'การคืนเงินของ Kolwen: ฉบับร่าง ยังไม่มีสินค้าให้ซื้อ และบางส่วนรอที่ปรึกษากฎหมายตรวจสอบ',
  },
};

PAGES.changelog = {
  file: 'web/changelog.html', path: '/changelog', job: 'prose',
  metaTitleEn: 'Kolwen changelog: the changes recorded in the repository', metaTitleTh: 'บันทึกการเปลี่ยนแปลงของ Kolwen จากที่เก็บโค้ด',
  titleEn: 'Changelog', titleTh: 'บันทึกการเปลี่ยนแปลง',
  // The log is kept in English; the Thai view says so (a status statement, no obligation).
  noteTh: 'บันทึกการเปลี่ยนแปลงนี้เขียนเป็นภาษาอังกฤษ',
  descEn: "Kolwen's changelog, rendered from the repository's CHANGELOG.md. No product has shipped yet.",
  descTh: 'บันทึกการเปลี่ยนแปลงของ Kolwen แสดงจากไฟล์ CHANGELOG.md ของที่เก็บโค้ด ยังไม่มีผลิตภัณฑ์ใดออกสู่สาธารณะ',
};

export const BANNER = {
  en: 'This page is a draft. It is not in force, nothing is for sale, and parts of it wait for review by counsel.',
  th: 'หน้านี้เป็นฉบับร่าง ยังไม่มีผลใช้บังคับ ยังไม่มีสินค้าให้ซื้อ และบางส่วนรอที่ปรึกษากฎหมายตรวจสอบ',
};

// Stands in for ONE held passage; the passage text itself is never shown.
export const PENDING = {
  en: MARK_EN + ' This part is waiting for legal review and is not shown yet.',
  th: MARK_TH + ' ส่วนนี้รอที่ปรึกษากฎหมายตรวจสอบ จึงยังไม่แสดง',
};

// Once at the foot of every legal page.
export const THAI_OWED = {
  en: MARK_EN + ' Full Thai versions of the Terms, the Refunds and the Privacy pages, equal in substance to the English, are still to come.',
  th: MARK_TH + ' ฉบับภาษาไทยเต็มของข้อกำหนด การคืนเงิน และความเป็นส่วนตัว ที่เนื้อหาเท่ากับฉบับภาษาอังกฤษ ยังจะตามมา',
};

// A TEXT passage whose Thai twin is supplied here. The English must equal the source passage (checked at render, so a source edit cannot drift from it).
export const TEXT_TWINS = [
  {
    anchor: "The site itself writes nothing to your browser's",
    en: "The site itself writes nothing to your browser's storage and sets no cookie. It keeps no language choice: English and Thai are two addresses, and the switch between them is a link. An earlier version kept your language choice in your browser's localStorage, under one key, kolwen-lang. Each page now tries to remove that one key when it loads. The attempt works only where the page's script runs and your browser lets it reach localStorage. If scripts or storage are blocked, or the removal fails, the key stays, and you can delete it yourself in your browser's site data settings. No page reads or writes that key, and our pages do nothing else with your browser's storage.",
    th: "ตัวเว็บไซต์เองไม่เขียนสิ่งใดลงในที่เก็บข้อมูลของเบราว์เซอร์ของคุณ และไม่ตั้งคุกกี้ ไม่จำภาษาที่คุณเลือก ภาษาอังกฤษกับภาษาไทยเป็นสองที่อยู่แยกกัน และการสลับระหว่างสองภาษาเป็นเพียงลิงก์ เวอร์ชันก่อนหน้าเคยจำภาษาที่คุณเลือกไว้ใน localStorage ของเบราว์เซอร์ภายใต้คีย์เดียวคือ kolwen-lang ตอนนี้ทุกหน้าจะพยายามลบคีย์นั้นเมื่อโหลดหน้า การลบทำงานได้เฉพาะเมื่อสคริปต์ของหน้าทำงานและเบราว์เซอร์อนุญาตให้หน้าเข้าถึง localStorage หากสคริปต์หรือที่เก็บข้อมูลถูกบล็อก หรือการลบล้มเหลว คีย์จะยังอยู่ และคุณลบเองได้ในการตั้งค่าข้อมูลเว็บไซต์ของเบราว์เซอร์ ไม่มีหน้าใดอ่านหรือเขียนคีย์นั้น และหน้าของเราไม่ทำสิ่งอื่นใดกับที่เก็บข้อมูลของเบราว์เซอร์",
  },
  {
    anchor: "*Measured on 2026-11-18: in `web/`, the one storage",
    en: "Measured on 2026-11-18: in web/, the one storage call is localStorage.removeItem('kolwen-lang'), which each of the 22 pages runs inside a try that ignores a failure; nothing calls setItem or getItem, and no page sets a cookie. No code in web/ uses sessionStorage, indexedDB or document.cookie.",
    th: "วัดผลเมื่อ 2026-11-18: ใน web/ การเรียกใช้ที่เก็บข้อมูลมีเพียงจุดเดียวคือ localStorage.removeItem('kolwen-lang') ซึ่งแต่ละหน้าทั้ง 22 หน้ารันภายใน try ที่ไม่สนใจความล้มเหลว ไม่มีส่วนใดเรียก setItem หรือ getItem และไม่มีหน้าใดตั้งคุกกี้ โค้ดใน web/ ไม่ใช้ sessionStorage, indexedDB หรือ document.cookie",
  },
  {
    anchor: "Static pages, served by a Cloudflare Worker. **The",
    en: "Static pages, served by a Cloudflare Worker. The Worker runs one small script of ours (worker/index.mjs). It hands every request for a path with no static file to the pages, so a missing page gets the 404 page, except that it answers /status.json and /subscribe itself, and every 15 minutes it requests fourteen of our own addresses, the seven pages in English and the same seven in Thai, to check that they answer. It does not log, keep or store a visitor's request itself, and there is no database and no storage of visitor data on our side. The status record holds only the time, each page check's result, and which result the owner was last told of. A subscriber store is built and switched off: while it is switched off, no address can be stored, and no mail goes to a subscriber in this build. Once an alert address is set, the Worker tries to mail the owner when the result of its checks changes: from all passing to a failure, with each failed check's path, HTTP status or error (a timeout or a network error), timing and content-type result, the number of failed checks and the UTC time; and from failing back to all passing, with a recovery note. Once the status record is bound and can be read, a failure that goes on is not mailed again once the owner has been told, and a send that fails is tried again by the next run that still finds the failure (until then, and whenever the record cannot be read, every failing check run is mailed), and no visitor data is in either mail (a send that fails is logged by its error class only). Until an address is set, nothing is sent.",
    th: "หน้าคงที่ให้บริการโดย Cloudflare Worker Worker ทำงานด้วยสคริปต์ขนาดเล็กของเราหนึ่งไฟล์ (worker/index.mjs) สำหรับทุกคำขอไปยังพาธที่ไม่มีไฟล์คงที่ Worker ส่งคำขอนั้นไปยังหน้าเว็บ ดังนั้นพาธที่ไม่มีหน้าจะได้หน้า 404 ยกเว้นที่ Worker ตอบเองที่ /status.json และ /subscribe และทุก 15 นาที Worker ขอที่อยู่ของเราสิบสี่รายการ คือเจ็ดหน้าภาษาอังกฤษและเจ็ดหน้าชุดเดียวกันในภาษาไทย เพื่อตรวจว่าตอบสนองหรือไม่ ตัว Worker เองไม่บันทึก ไม่เก็บ และไม่จัดเก็บคำขอของผู้เข้าชม ไม่มีฐานข้อมูล และไม่มีการจัดเก็บข้อมูลของผู้เข้าชมฝั่งเรา บันทึกสถานะเก็บเพียงเวลา ผลการตรวจของแต่ละหน้า และผลที่เจ้าของได้รับแจ้งครั้งล่าสุด ระบบเก็บผู้สมัครรับข่าวสารถูกสร้างไว้แต่ปิดอยู่ ขณะที่ปิด ไม่มีที่อยู่ใดถูกเก็บ และไม่มีอีเมลส่งถึงผู้สมัครในการสร้างนี้ เมื่อตั้งที่อยู่สำหรับการแจ้งเตือนแล้ว Worker พยายามส่งอีเมลถึงเจ้าของเมื่อผลการตรวจเปลี่ยน คือจากทุกรายการผ่านเป็นมีรายการล้มเหลว โดยระบุพาธ สถานะ HTTP หรือข้อผิดพลาดของแต่ละรายการที่ล้มเหลว (เวลาหมดหรือข้อผิดพลาดของเครือข่าย) เวลาที่ใช้ ผลประเภทเนื้อหา จำนวนรายการที่ล้มเหลว และเวลา UTC และจากล้มเหลวกลับเป็นทุกรายการผ่าน พร้อมหมายเหตุการกู้คืน เมื่อบันทึกสถานะถูกผูกไว้และอ่านได้ ความล้มเหลวที่ยังคงอยู่จะไม่ถูกส่งอีเมลซ้ำหลังเจ้าของได้รับแจ้งแล้ว และการส่งที่ล้มเหลวจะถูกลองใหม่ในรอบถัดไปที่ยังพบความล้มเหลวนั้น (ระหว่างนั้น และทุกครั้งที่อ่านบันทึกไม่ได้ ทุกการตรวจที่ล้มเหลวจะถูกส่งอีเมล) อีเมลทั้งสองแบบไม่มีข้อมูลของผู้เข้าชม (การส่งที่ล้มเหลวถูกบันทึกโดยประเภทข้อผิดพลาดเท่านั้น) จนกว่าจะตั้งที่อยู่ ไม่มีอีเมลใดถูกส่ง",
  },
  {
    anchor: 'Payment for a key, a subscription or credits',
    en: "Payment for a key, a subscription or credits is taken by Paddle as the merchant of record, under Paddle's own buyer terms. These Terms cover the licence to use Kolwen and Kolwen's own policies; the purchase contract itself sits with Paddle.",
    th: 'Paddle เป็นผู้รับชำระเงินสำหรับคีย์ การสมัครสมาชิก หรือเครดิต ในฐานะผู้ขายตามกฎหมาย (merchant of record) ตามข้อกำหนดผู้ซื้อของ Paddle เอง ข้อกำหนดนี้ครอบคลุมสิทธิใช้ Kolwen และนโยบายของ Kolwen เอง ส่วนสัญญาซื้อขายอยู่กับ Paddle',
  },
];

// A held passage that shows a specific pending line instead of the generic one. Each line states a status only.
export const PENDING_LINES = [
  {
    // The owner's own rule for the term, held as a pending line: only legal working days in Thailand count; counsel words the definition.
    file: 'TERMS.md', anchor: '**Business days.** In this section a business day',
    en: MARK_EN + ' In this section only legal working days in Thailand count as business days. The exact definition is waiting for review.',
    th: MARK_TH + ' ในหัวข้อนี้นับเฉพาะวันทำการตามกฎหมายของประเทศไทยเป็นวันทำการ คำจำกัดความที่แน่นอนรอการตรวจสอบ',
  },
];

// The refund page: rows in order. kind 'text' is a statement shown as written; kind 'pending' is a pending line whose content is a status.
// A row with `from` (the first eight words of a TERMS.md passage) IS that passage: its English is the passage's text and it follows the passage's hold,
// so the refund page cannot keep promising what the terms page no longer says. `en` then records the wording the Thai `th` was written against.
export const REFUND_ROWS = [
  {
    id: 'R1', kind: 'text', from: '**An unredeemed key is refunded in full within',
    en: 'An unredeemed key is refunded in full within 14 days of purchase. Nothing was used, so the key is simply voided.',
    th: 'คีย์ที่ยังไม่ได้ใช้ได้รับเงินคืนเต็มจำนวนภายใน 14 วันนับจากวันซื้อ เพราะยังไม่ได้ใช้อะไร คีย์จึงถูกยกเลิก',
  },
  {
    id: 'R2', kind: 'text', from: '[pending legal review] **By Kolwen without cause.** Kolwen',
    en: "By Kolwen without cause. Kolwen refunds the unused part: a key's remaining days, a subscription's remaining current period, and unused credits at the price paid.",
    th: 'เมื่อ Kolwen เลิกสัญญาโดยไม่มีเหตุ Kolwen คืนเงินส่วนที่ยังไม่ได้ใช้ ได้แก่วันที่เหลือของคีย์ รอบปัจจุบันที่เหลือของการสมัครสมาชิก และเครดิตที่ยังไม่ได้ใช้ตามราคาที่จ่าย',
  },
  {
    id: 'R3', kind: 'text',
    en: "Payments are taken by Paddle as the merchant of record. Paddle's standard refund policy is at https://www.paddle.com/legal/refund-policy.",
    th: 'Paddle เป็นผู้รับชำระเงินในฐานะผู้ขายตามกฎหมาย (merchant of record) นโยบายคืนเงินมาตรฐานของ Paddle อยู่ที่ https://www.paddle.com/legal/refund-policy',
  },
  {
    id: 'R4', kind: 'pending',
    en: MARK_EN + ' To ask for a refund, you can use Paddle, the merchant of record, or write to Kolwen at support@kolwen.com.',
    th: MARK_TH + ' หากต้องการขอเงินคืน ใช้ Paddle ผู้ขายตามกฎหมาย (merchant of record) หรือเขียนถึง Kolwen ที่ support@kolwen.com ได้',
  },
  {
    id: 'R5', kind: 'pending',
    en: MARK_EN + " How Paddle's refund policy and the 14-day refund above fit together is waiting for review.",
    th: MARK_TH + ' วิธีที่นโยบายคืนเงินของ Paddle กับการคืนเงินภายใน 14 วันข้างต้นทำงานร่วมกันนั้น รอการตรวจสอบ',
  },
  {
    // Neutral by the head's ruling: the page promises neither a deduction nor no deduction.
    id: 'R6', kind: 'pending',
    en: MARK_EN + ' Whether a refund of a subscription requested within 7 days of purchase deducts the days you used is waiting for review.',
    th: MARK_TH + ' การขอเงินคืนค่าสมัครสมาชิกภายใน 7 วันนับจากวันซื้อ จะหักวันที่คุณใช้ไปแล้วหรือไม่ รอการตรวจสอบ',
  },
  {
    id: 'R7', kind: 'pending',
    en: MARK_EN + ' The refund rule for days used after the first 7 days, and the refund window for unused prepaid credits, are waiting for review.',
    th: MARK_TH + ' กฎการคืนเงินเกี่ยวกับวันที่ใช้ไปหลัง 7 วันแรก และช่วงเวลาขอคืนเงินสำหรับเครดิตที่ยังไม่ได้ใช้ รอการตรวจสอบ',
  },
  {
    // Shown while the legal-state record says the Thai 7-day clause is not in force; replaced by the dated clause when it is.
    id: 'R8', kind: 'pending',
    en: MARK_EN + ' A clause on the Thai 7-day cancellation right is drafted. It is not in force yet and will show here only when it is.',
    th: MARK_TH + ' ข้อกำหนดเรื่องสิทธิยกเลิกภายใน 7 วันตามกฎหมายไทยร่างไว้แล้ว ยังไม่มีผลใช้บังคับ และจะแสดงที่นี่เมื่อมีผลเท่านั้น',
  },
  {
    id: 'R9', kind: 'pending',
    en: MARK_EN + ' Refund terms on this page are a draft.',
    th: MARK_TH + ' ข้อกำหนดการคืนเงินในหน้านี้เป็นฉบับร่าง',
  },
];
