// Things that only matter inside the Android app (Capacitor). On the website this module does nothing.
import { onRender, show } from '../core/nav.js';
import { S } from '../core/state.js';
import { closeModal } from '../ui/modal.js';
import { closeIntro, introOpen } from '../features/intro.js';
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
    if (introOpen()) { closeIntro(); return; }
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

  // Export: saved like a normal download, straight into the phone's Downloads folder.
  setExportHandler(async (name, json) => {
    const saver = nativePlugin('SaveFile'); if (!saver) return false;
    try { const r = await saver.save({ name, data: json }); toast(r && r.where === 'Downloads' ? 'Saved to Downloads: ' + name : 'Backup saved'); return true; }
    catch (e) { if (/cancel/i.test(String(e && e.message))) return 'cancelled'; toast('Could not save the file'); return 'failed'; }
  });

}
