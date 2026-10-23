// Export / import of all collections as a .json file.
import { onAct, onChange } from '../core/events.js';
import { render } from '../core/nav.js';
import { G, S } from '../core/state.js';
import { $, esc } from '../core/util.js';
import { touch } from './store.js';
import { cleanCol } from './model.js';
import { toast } from '../ui/toast.js';

// Remembered so the app can remind people who have never (or long ago) made a backup.
export const BACKUP_KEY = 'ggn.backup';
export function backupInfo() { try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}') || {}; } catch (e) { return {}; } }
export function setBackupInfo(patch) { try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...backupInfo(), ...patch })); } catch (e) {} }
export const markBackedUp = () => { setBackupInfo({ last: Date.now() }); document.getElementById('bknudge')?.remove(); if (S.view === 'settings') render(); };

export function backupJSON() { return JSON.stringify({ app: 'kolekcionar', version: 1, exported: new Date().toISOString(), cols: S.cols.filter(c => !c.example) }, null, 1); }
export function showExportText(msg) {
  $('#exportOut').innerHTML = '<div class="box trade"><h3>' + esc(msg) + '<button class="btn small" type="button" data-act="copy" data-id="tExp">Copy</button></h3><textarea id="tExp" readonly>' + esc(backupJSON()) + '</textarea><span class="hint">Save this text as a .json file.</span></div>';
}
// The Android app saves the file its own way (share sheet); it registers itself here.
let exportHandler = null;
export const setExportHandler = fn => { exportHandler = fn; };
// e.g. gotgotneed-2026-10-23_15-04.json – local date and time, so several backups a day don't mix up.
export const backupFileName = (d = new Date()) => { const p = n => String(n).padStart(2, '0');
  return 'gotgotneed-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '.json'; };
export async function doExport() {
  if (!S.cols.some(c => !c.example)) { toast('You have no collections of your own to export yet'); return; }
  if (exportHandler) {   // true = saved, false = not available here (use the web way), anything else = cancelled/failed
    let r = false; try { r = await exportHandler(backupFileName(), backupJSON()); } catch (e) { r = 'failed'; }
    if (r === true) markBackedUp();
    if (r !== false) return;
  }
  if (G.DL) {
    try { await G.DL.save({ filename: backupFileName(), data: backupJSON() }); markBackedUp(); toast('File saved'); return; }
    catch (err) { if (err && err.code === 'declined') return; }
  }
  if (!window.claude) {
    try {
      const url = URL.createObjectURL(new Blob([backupJSON()], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = backupFileName();
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); markBackedUp(); toast('File saved'); return;
    } catch (e) {}
  }
  markBackedUp(); showExportText('Backup');
}
export function doImport(text) {
  let d; try { d = JSON.parse(text); } catch (e) { toast('This file is not valid JSON'); return; }
  const list = d && Array.isArray(d.cols) ? d.cols : null;
  if (!list) { toast('This is not a GotGotNeed backup'); return; }
  const ok = list.slice(0, 500).map(cleanCol).filter(Boolean);
  if (!ok.length) { toast('No collections found in the file'); return; }
  S.cols = S.cols.filter(c => !c.example);
  for (const c of ok) {
    const i = S.cols.findIndex(x => x.id === c.id); if (i >= 0) S.cols[i] = c; else S.cols.push(c); touch(c); }
  render(); toast('Imported collections: ' + ok.length);
}

onAct({ export: () => doExport() });
onChange(e => {
  const t = e.target;
  if (t.id === 'importFile' && t.files && t.files[0]) { const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.readAsText(t.files[0]); t.value = ''; return true; }
});
