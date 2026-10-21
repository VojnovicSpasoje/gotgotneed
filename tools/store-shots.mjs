// Generates Google Play phone screenshots (1080x1920) from the live site, with real web fonts.
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
  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('kolekcionar.skin', s); localStorage.setItem('ggn.installDismissed', '1'); }, skin);
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
// 3 Names grid – Blueprint
await fresh('blueprint'); await page.click('[data-act="open"] >> nth=1'); await scrollTo('.tools'); await shot('3-names');
// 4 Trade list – Classic
await fresh('classic'); await page.click('[data-act="open"] >> nth=0'); await page.click('[data-act="tab"][data-id="trade"]'); await scrollTo('.tabs'); await shot('4-trade');
// 5 Neon album
await fresh('neon'); await page.click('[data-act="open"] >> nth=0'); await shot('5-neon');
// 6 Themes picker – Classic
await fresh('classic'); await page.click('[data-act="skins"]'); await shot('6-themes');

const CAP = {
  '1-home':   ['All your collections', 'in one place', '#F4EEDF', '#141D2E'],
  '2-album':  ['Circle what', 'you’ve got', '#F4EEDF', '#141D2E'],
  '3-names':  ['Numbers or names,', 'editions & variants', '#123A6B', '#FFFFFF'],
  '4-trade':  ['Know what you need,', 'swap your duplicates', '#ECEFF4', '#141D2E'],
  '5-neon':   ['Track every set', 'to 100%', '#0A0A12', '#FFFFFF'],
  '6-themes': ['Pick the style', 'you like', '#F4EEDF', '#141D2E'],
};
const comp = await ctx.newPage();
await comp.setViewportSize({ width: 360, height: 640 });
for (const [name, [l1, l2, bg, fg]] of Object.entries(CAP)) {
  const img = fs.readFileSync(`${OUT}/raw-${name}.png`).toString('base64');
  await comp.setContent(`<!doctype html><html><head><meta name="viewport" content="width=360,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap" rel="stylesheet">
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
