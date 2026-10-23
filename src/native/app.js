// Things that only matter inside the Android app (Capacitor). On the website this module does nothing.
import { onRender, show } from '../core/nav.js';
import { S } from '../core/state.js';
import { closeModal } from '../ui/modal.js';
import { $, isNativeApp, nativePlugin } from '../core/util.js';
import { setExportHandler } from '../data/backup.js';
import { toast } from '../ui/toast.js';

if (isNativeApp()) {
  document.documentElement.classList.add('native');

  // Status bar and navigation bar icons: light icons on dark themes, dark icons on light themes.
  // (The bars themselves are see-through, so they show the theme's background.)
  let last = '';
  const syncBarStyle = () => {
    const m = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number);
    const hex = '#' + m.map(x => x.toString(16).padStart(2, '0')).join('');
    if (hex === last) return; last = hex;
    const lum = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
    const bars = nativePlugin('SystemBars'); if (bars) bars.setStyle({ style: lum < 0.5 ? 'DARK' : 'LIGHT' }).catch(() => {});
    const paint = nativePlugin('BarColor'); if (paint) paint.set({ color: hex }).catch(() => {});
  };
  onRender(syncBarStyle);
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBarStyle); } catch (e) {}

  // Android back button: close an open window first, then go back a screen, and on the home
  // screen send the app to the background (like other Android apps).
  const app = nativePlugin('App');
  if (app) app.addListener('backButton', () => {
    const m = $('#modal');
    if (m && !m.hidden) { closeModal(); return; }
    if (S.view === 'home') { app.minimizeApp().catch(() => app.exitApp()); return; }
    let st = null; try { st = history.state; } catch (e) {}
    if (st && st.kol && st.d > 0 && history.length > 1) history.back();
    else show('home');
  });

  // Links to web pages (privacy policy, …) open in the phone's browser, never inside the app.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="http"]'); if (!a) return;
    e.preventDefault(); window.location.href = a.href;   // the app hands non-app addresses to the browser
  }, true);

  // Export: write the backup to a file and open the share sheet (save to Files / Drive, send, …).
  setExportHandler(async (name, json) => {
    const fs = nativePlugin('Filesystem'), share = nativePlugin('Share'); if (!fs || !share) return false;
    const { uri } = await fs.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
    try { await share.share({ title: 'GotGotNeed backup', files: [uri] }); } catch (e) { return false; }   // closed without choosing
    toast('Backup ready – keep the file somewhere safe');
    return true;
  });
}
