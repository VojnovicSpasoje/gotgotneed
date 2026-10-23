// Things that only matter inside the Android app (Capacitor). On the website this module does nothing.
import { onRender } from '../core/nav.js';
import { isNativeApp, nativePlugin } from '../core/util.js';
import { setExportHandler } from '../data/backup.js';
import { toast } from '../ui/toast.js';

if (isNativeApp()) {
  document.documentElement.classList.add('native');

  // Status bar and navigation bar icons: light icons on dark themes, dark icons on light themes.
  // (The bars themselves are see-through, so they show the theme's background.)
  let last = '';
  const syncBarStyle = () => {
    const bars = nativePlugin('SystemBars'); if (!bars) return;
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255];
    const lum = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255, style = lum < 0.5 ? 'DARK' : 'LIGHT';
    if (style !== last) { last = style; bars.setStyle({ style }).catch(() => {}); }
  };
  onRender(syncBarStyle);
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBarStyle); } catch (e) {}

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
