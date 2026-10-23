// Generates Google Play phone screenshots (1080x1920) from the site (live, or SITE=http://localhost:8080/), with the real fonts.
import { chromium } from 'playwright';
import fs from 'node:fs';

const SITE = process.env.SITE || 'https://vojnovicspasoje.github.io/gotgotneed/';
const OUT = 'store';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

async function fresh(skin) {
  await page.goto(SITE);
  await page.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase('gotgotneed'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('kolekcionar.skin', s); localStorage.setItem('ggn.installDismissed', '1'); localStorage.setItem('ggn.introSeen', '1'); }, skin);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
const hideToast = () => page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; });
const scrollTo = sel => page.evaluate(s => { const el = document.querySelector(s); if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); }, sel);
async function shot(name) { await hideToast(); await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/raw-${name}.png` }); }

// 1 Home – Classic
await fresh('classic'); await shot('1-home');
// 2 Album grid – Album theme
await fresh('album'); await page.click('[data-act="open"] >> nth=0'); await scrollTo('.tools'); await shot('2-album');
// 3 Swap QR – Classic
await fresh('classic'); await page.click('[data-act="open"] >> nth=0'); await page.click('[data-act="tab"][data-id="trade"]'); await page.click('[data-act="share"]'); await page.waitForTimeout(500); await shot('3-qr');
// 4 Swap result – Neon (a friend's QR opened on this phone)
await fresh('neon');
await page.click('[data-act="open"] >> nth=0'); await page.click('[data-act="tap"] >> nth=2');   // makes the example "mine"
const code = await page.evaluate(async () => {
  const sh = await import('./src/data/share.js'); const mine = JSON.parse(localStorage.getItem('kolekcionar.v1')).cols[0];
  const fr = JSON.parse(JSON.stringify(mine)), ed = fr.editions[0], v = fr.variants[0].id; ed.have = {};
  const mineHave = mine.editions[0].have;
  for (let n = ed.from; n <= ed.to; n++) { const c = mineHave[n + '|' + v] || 0; ed.have[n + '|' + v] = c === 0 ? (n % 3 ? 2 : 1) : (c > 1 ? 0 : 1); }
  fr.name = 'World Cup 2026';
  return sh.encodeShare(sh.packEdition(fr, ed));
});
await page.click('[data-act="home"]');
await page.evaluate(c => { location.hash = 't=' + c; }, code); await page.waitForTimeout(900); await shot('4-swap');
// 5 Names grid – Blueprint
await fresh('blueprint'); await page.click('[data-act="open"] >> nth=1'); await scrollTo('.tools'); await shot('5-names');
// 6 Themes picker – Classic
await fresh('classic'); await page.click('[data-act="settings"]'); await page.click('[data-act="themes"]'); await shot('6-themes');

const CAP = {
  '1-home':   ['All your collections', 'in one place', '#F4EEDF', '#141D2E'],
  '2-album':  ['Circle what', 'you’ve got', '#F4EEDF', '#141D2E'],
  '3-qr':     ['Swap with a friend', 'in one scan', '#ECEFF4', '#141D2E'],
  '4-swap':   ['See instantly', 'what you can trade', '#0A0A12', '#FFFFFF'],
  '5-names':  ['Numbers or names,', 'editions & variants', '#123A6B', '#FFFFFF'],
  '6-themes': ['Pick the style', 'you like', '#F4EEDF', '#141D2E'],
};
const comp = await ctx.newPage();
await comp.setViewportSize({ width: 360, height: 640 });
for (const [name, [l1, l2, bg, fg]] of Object.entries(CAP)) {
  const img = fs.readFileSync(`${OUT}/raw-${name}.png`).toString('base64');
  await comp.setContent(`<!doctype html><html><head><meta name="viewport" content="width=360,initial-scale=1">
  <link href="${SITE}fonts/fonts.css" rel="stylesheet">
  <style>html,body{margin:0;width:360px;height:640px;overflow:hidden;background:${bg}}
  .cap{position:absolute;top:34px;left:0;right:0;text-align:center;font:800 27px/1.15 "Bricolage Grotesque",sans-serif;color:${fg};letter-spacing:-.01em}
  .cap span{color:${fg === '#FFFFFF' ? '#9FD8C2' : '#13785A'}}
  .ph{position:absolute;left:50%;top:128px;width:282px;transform:translateX(-50%);border-radius:26px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.28),0 0 0 6px rgba(0,0,0,.85)}
  .ph img{display:block;width:100%}</style></head>
  <body><div class="cap">${l1}<br><span>${l2}</span></div><div class="ph"><img src="data:image/png;base64,${img}"></div></body></html>`, { waitUntil: 'networkidle' });
  await comp.evaluate(() => document.fonts.ready);
  await comp.screenshot({ path: `${OUT}/play-${name}.png` });
}
await browser.close();
console.log('done');
