// Export / import of all collections as a .json file.
import { onAct, onChange } from '../core/events.js';
import { render } from '../core/nav.js';
import { G, S } from '../core/state.js';
import { $, esc } from '../core/util.js';
import { touch } from './store.js';
import { toast } from '../ui/toast.js';

export function backupJSON() { return JSON.stringify({ app: 'kolekcionar', version: 1, exported: new Date().toISOString(), cols: S.cols.filter(c => !c.example) }, null, 1); }
export function showExportText(msg) {
  $('#exportOut').innerHTML = '<div class="box trade"><h3>' + esc(msg) + '<button class="btn small" type="button" data-act="copy" data-id="tExp">Copy</button></h3><textarea id="tExp" readonly>' + esc(backupJSON()) + '</textarea><span class="hint">Save this text as a .json file.</span></div>';
}
export async function doExport() {
  if (!S.cols.some(c => !c.example)) { toast('You have no collections of your own to export yet'); return; }
  if (G.DL) {
    try { await G.DL.save({ filename: 'gotgotneed-' + new Date().toISOString().slice(0, 10) + '.json', data: backupJSON() }); toast('File saved'); return; }
    catch (err) { if (err && err.code === 'declined') return; }
  }
  if (!window.claude) {
    try {
      const url = URL.createObjectURL(new Blob([backupJSON()], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'gotgotneed-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('File saved'); return;
    } catch (e) {}
  }
  showExportText('Backup');
}
export function doImport(text) {
  let d; try { d = JSON.parse(text); } catch (e) { toast('This file is not valid JSON'); return; }
  const list = d && Array.isArray(d.cols) ? d.cols : null;
  if (!list) { toast('This is not a GotGotNeed backup'); return; }
  const ok = list.filter(c => c && c.id && c.name && Array.isArray(c.editions) && Array.isArray(c.variants));
  if (!ok.length) { toast('No collections found in the file'); return; }
  S.cols = S.cols.filter(c => !c.example);
  for (const c of ok) { c.example = false; for (const ed of c.editions) { ed.have = ed.have || {}; ed.items = ed.items || []; }
    const i = S.cols.findIndex(x => x.id === c.id); if (i >= 0) S.cols[i] = c; else S.cols.push(c); touch(c); }
  render(); toast('Imported collections: ' + ok.length);
}

onAct({ export: () => doExport() });
onChange(e => {
  const t = e.target;
  if (t.id === 'importFile' && t.files && t.files[0]) { const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.readAsText(t.files[0]); t.value = ''; return true; }
});
