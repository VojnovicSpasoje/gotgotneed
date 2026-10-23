// Usage: npm run serve, then: node tools/fuzz-inputs.cjs http://localhost:8080/  (needs Playwright)
// Tries hostile / odd input everywhere a user (or a file / swap link) can put text into the app.
const { chromium } = require('playwright');
const fs = require('fs');
const D = require('os').tmpdir() + '/';
const URL = process.argv[2] || 'http://localhost:8770/';
const X = [
  '<img src=x onerror="window.__x=(window.__x||0)+1">',
  '"><svg onload="window.__x=(window.__x||0)+1">',
  "'><script>window.__x=(window.__x||0)+1</script>",
  '</textarea><img src=x onerror="window.__x=1">',
  'javascript:window.__x=1',
  '${window.__x=1}',
  '{{constructor.constructor("window.__x=1")()}}',
  '=HYPERLINK("http://evil","click")',
  '😀🎴 Ünïcödé ćčžšđ ЖЖ 中文',
  '‮evil-rtl‬', 'zero​width', 'back\\slash', 'tab\there',
  'A'.repeat(5000),
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const problems = []; const note = m => { problems.push(m); console.log("  !! " + m.slice(0, 200)); };
  p.on('dialog', d => { note('DIALOG: ' + d.message()); d.dismiss(); });
  p.on('pageerror', e => note('JS ERROR: ' + e.message));
  const posts = [];
  await p.route('**/docs.google.com/**', r => { posts.push(decodeURIComponent((r.request().postData() || '').replace(/\+/g, ' '))); r.fulfill({ status: 200, body: 'ok' }); });
  const check = async where => {
    const r = await p.evaluate(() => ({ x: window.__x || 0, inj: document.querySelectorAll('img[src="x"], #app svg[onload], #app script, #modal script').length }));
    if (r.x || r.inj) note('INJECTION at ' + where + ' ' + JSON.stringify(r));
    await p.evaluate(() => { window.__x = 0; });
  };
  const fill = (sel, v) => p.fill(sel, v);
  await p.goto(URL); await p.waitForTimeout(500);

  // 1. New collection by names, with variants – every field gets hostile text
  await p.click('[data-act="new"]');
  await fill('#nName', X[0]); await fill('#nCat', X[1]); await fill('#nEd', X[2]);
  await p.click('[data-act="fmode"][data-p="n"][data-id="list"]');
  await fill('#nitems', X.map((x, i) => x + ' ; ' + X[(i + 1) % X.length]).join('\n'));
  await p.check('#nHasVar'); await fill('#nBase', X[3]); await fill('#nVarRows [data-f="name"]', X[1]);
  await p.waitForTimeout(400); await check('new form');
  await p.click('#nVarRows details summary'); await check('variant item picker');
  await p.click('form[data-form="new"] button[type="submit"]'); await p.waitForTimeout(300); await check('created collection (grid)');
  console.log('created:', await p.evaluate(() => document.querySelector('.top h1')?.textContent.slice(0, 60)));
  await p.click('[data-act="lview"]'); await check('list view');
  if (await p.$('#q')) { await fill('#q', X[0]); await check('collection search'); await fill('#q', ''); }
  await p.click('[data-act="tap"] >> nth=0'); await p.click('[data-act="tap"] >> nth=0'); await check('tap items');
  await p.click('[data-act="bulk"]'); await p.waitForTimeout(200); await fill('#bkText', X.slice(0, 4).join('\n') + '\n' + X[8]); await p.waitForTimeout(200); await check('add many');
  await p.click('[data-act="mcancel"]').catch(() => p.keyboard.press('Escape'));
  await p.click('[data-act="tab"][data-id="trade"]'); await check('trade tab');
  await p.click('[data-act="share"]'); await p.waitForTimeout(400); await check('share modal');
  await p.click('[data-act="shCopy"]'); const shareUrl = await p.evaluate(() => navigator.clipboard.readText());
  await p.click('[data-act="mcancel"]');
  // 2. Edit screen
  await p.click('[data-act="edit"]'); await p.waitForTimeout(200); await check('edit screen');
  await fill('#eName', X[1] + X[2]); await p.press('#eName', 'Tab'); await fill('#newVar', X[0]); await p.click('form[data-form="addvar"] button'); await p.waitForTimeout(200); await check('edit: rename + add variant');
  await fill('#aName', X[3]);
  for (const [f, t] of [['-5', '3'], ['1e9', '2e9'], ['abc', '5'], ['2.5', '4.7'], ['10', '1'], ['0', '999999']]) {
    if (!(await p.$('#aName'))) await p.click('[data-act="edit"]');
    await fill('#aName', 'R ' + f + '..' + t);
    await p.click('[data-act="fmode"][data-p="a"][data-id="range"]');
    await p.evaluate(([f, t]) => { document.getElementById('afrom').value = f; document.getElementById('ato').value = t; }, [f, t]);
    await p.click('form[data-form="added"] button[type="submit"]'); await p.waitForTimeout(150);
    const err = await p.evaluate(() => { const e = document.getElementById('aErr'); return e && !e.hidden ? 'refused: ' + e.textContent : 'accepted'; });
    console.log('  range', f, '→', t, ':', err.slice(0, 90));
  }
  console.log('  editions now:', await p.evaluate(() => JSON.parse(localStorage.getItem('kolekcionar.v1')).cols[0].editions.map(e => e.name.slice(0, 14) + ' [' + e.from + '–' + e.to + ']').join(' | ')));
  await check('edit: odd ranges');
  // 3. Home: search, sort, categories
  await p.click('[data-act="back"]').catch(() => {}); await p.click('[data-act="home"]').catch(() => {}); await p.waitForTimeout(200);
  await check('home'); if (await p.$('#hq')) { await fill('#hq', X[1]); await check('home search'); await fill('#hq', ''); }
  // 4. Settings + feedback (POST intercepted)
  await p.click('[data-act="settings"]'); await check('settings');
  await p.click('.setrow[data-act="fb"]'); await fill('#fbMsg', X[7] + '\n' + X[0] + '\u0007bell'); await fill('#fbEmail', 'a@b.co');
  await p.click('#fbSend'); await p.waitForTimeout(300); await check('feedback');
  console.log('feedback 1:', await p.evaluate(() => document.getElementById('app').innerText.replace(/\s+/g, ' ').slice(0, 80)));
  await p.click('[data-act="toSettings"]'); await p.click('.setrow[data-act="fb"]'); await fill('#fbMsg', 'second message right away'); await p.click('#fbSend'); await p.waitForTimeout(200);
  console.log('feedback 2 (immediately):', await p.evaluate(() => document.getElementById('fbErr')?.textContent));
  await p.evaluate(() => { document.getElementById('fbSite').value = 'http://spam'; localStorage.removeItem('ggn.fbLog'); });
  await fill('#fbMsg', 'bot message'); await p.click('#fbSend'); await p.waitForTimeout(200);
  console.log('bot (honeypot) posts sent:', posts.length, '| what the Sheet receives:', JSON.stringify(posts[0]?.slice(0, 140)));
  await p.click('[data-act="toSettings"]').catch(() => {});
  console.log('feedback form says:', await p.evaluate(() => document.getElementById('app').innerText.replace(/\s+/g, ' ').slice(0, 200)));
  // 5. Import a crafted backup file (bad ids, numbers as strings, html in keys)
  const evil = { app: 'kolekcionar', cols: [{ id: '"><img src=x onerror="window.__x=1">', name: X[0], cat: X[1], variants: [{ id: 'v"><img src=x onerror="window.__x=1">', name: X[2] }],
    editions: [{ id: 'e"><img src=x onerror="window.__x=1">', name: X[3], mode: 'range', from: '1"><img src=x onerror="window.__x=1">', to: 5, items: [], have: { '1|v"><img src=x onerror="window.__x=1">': '2<img>' }, view: '"><img src=x onerror="window.__x=1">' },
      { id: 'e2', name: 'L', mode: 'list', from: 1, to: 1, items: [{ k: 'k"><img src=x onerror="window.__x=1">', name: X[0], sn: X[1] }, { k: '__proto__', name: 'proto' }], have: {} }] }] };
  fs.writeFileSync(D + 'evil.json', JSON.stringify(evil));
  if (!(await p.$('#importFile'))) await p.click('[data-act="toSettings"]'); await p.setInputFiles('#importFile', D + 'evil.json'); await p.waitForTimeout(400); await check('import evil file');
  await p.click('[data-act="home"]'); await p.waitForTimeout(200); await check('home after import');
  const cards = await p.$$('[data-act="open"]');
  for (let i = 0; i < cards.length; i++) { await p.click('[data-act="open"] >> nth=' + i); await p.waitForTimeout(150); await check('open card ' + i);
    const ne = (await p.$$('[data-act="ed"]')).length; for (let j = 0; j < ne; j++) { await p.click('[data-act="ed"] >> nth=' + j); await check('edition chip'); }
    try { await p.click('[data-act="edit"]', { timeout: 2000 }); await check('edit after import ' + i); await p.click('[data-act="back"]'); } catch (e) { note('CARD ' + i + ' could not open Edit; screen shows: ' + (await p.evaluate(() => document.getElementById('app').innerText.slice(0, 120)))); }
    await p.click('[data-act="home"]', { timeout: 2000 }).catch(async () => { await p.goto(URL); await p.waitForTimeout(400); }); }
  // 6. Crafted swap link from a "friend"
  const evilShare = ['GGN1', X[0], X[1], 'l', X[2] + '\t' + X[3], X[0] + '\t' + X[1] + '\t33', X[4] + '\t\t13', '<b>bold</b>\tx\t3'].join('\n');
  const code = await p.evaluate(async t => { const m = await import('/src/data/share.js'); return m.encodeShare(t); }, evilShare);
  await p.goto('about:blank'); await p.goto(URL + '#t=' + code); await p.waitForTimeout(800); await check('evil swap link');
  if (await p.$('[data-act="swStart"]')) { await p.click('[data-act="swStart"]'); await p.waitForTimeout(300); await check('start evil collection'); }
  for (const bad of ['zzzz', 'p' + Buffer.from('GGN1\nA\nB\nr 1 99999999\nX\n').toString('base64url'), 'p' + Buffer.from('GGN1\nA\nB\nr 5 1\nX\n').toString('base64url'), '%%%']) {
    await p.goto('about:blank'); await p.goto(URL + '#t=' + bad); await p.waitForTimeout(600); await check('bad link ' + bad.slice(0, 12));
    console.log('  bad link', bad.slice(0, 12), '→', await p.evaluate(() => document.querySelector('#toast')?.textContent || document.querySelector('.top h1')?.textContent));
  }
  // own share link back
  await p.goto('about:blank'); await p.goto(shareUrl); await p.waitForTimeout(600); await check('own share link');
  console.log('\n' + (problems.length ? problems.join('\n') : 'NO PROBLEMS FOUND'));
  process.exitCode = problems.length ? 1 : 0;
  await b.close();
})();
