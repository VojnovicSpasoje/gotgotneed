// Builds www/ – the web part that goes inside the Android app (Capacitor).
// Same files as the website, minus the website-only bits (install bar, service worker),
// and with the app's Content Security Policy.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'www';
const RELEASE = process.argv.includes('--release');   // the Play build leaves out the test tools
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT);
for (const d of ['src', 'fonts', 'icons']) cpSync(d, OUT + '/' + d, { recursive: true });
rmSync(OUT + '/src/pwa', { recursive: true, force: true });
if (RELEASE) rmSync(OUT + '/src/features/devtools.js', { force: true });

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<link rel="manifest"[^>]*>\n/, '')
  .replace(/<link rel="stylesheet" href="src\/pwa\/install\.css">\n/, '')
  .replace(/<script type="module" src="src\/pwa\/install\.js"><\/script>\n/, '')
  .replace(/<div id="installBar"[\s\S]*?<\/div>\n/, '')
  // The app's own bridge script is injected inline by Capacitor, so inline scripts must be allowed here;
  // everything else stays locked down (only our files, data may only go to the feedback form).
  .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
  .replace("worker-src 'self'; manifest-src 'self'; ", '');
if (/pwa\/|installBar|manifest/.test(html)) throw new Error('website-only parts left in app index.html');
writeFileSync(OUT + '/index.html', html);

if (RELEASE) {
  let main = readFileSync(OUT + '/src/main.js', 'utf8');
  main = main.replace(/^\/\/ TEMPORARY.*\n^import '\.\/features\/devtools\.js';\n/m, '');
  if (main.includes('devtools')) throw new Error('devtools import still in app main.js');
  writeFileSync(OUT + '/src/main.js', main);
}
const build = process.env.GGN_VERSION_CODE || '';
if (build) {
  const f = OUT + '/src/views/settings.js', js = readFileSync(f, 'utf8');
  if (!js.includes("export const APP_BUILD = '';")) throw new Error('APP_BUILD placeholder missing');
  writeFileSync(f, js.replace("export const APP_BUILD = '';", "export const APP_BUILD = '" + build.replace(/\D/g, '') + "';"));
}
console.log('www/ ready' + (RELEASE ? ' (release: no test tools)' : ' (test build)'));
