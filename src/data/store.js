// Saving collections: on this device, and (inside Claude) to the user's account.
import { render } from '../core/nav.js';
import { G, LS, S, chains, pending, timers } from '../core/state.js';
import { $ } from '../core/util.js';
import { curCol } from './select.js';
import { cleanCol } from './model.js';
import { SKINS, SKIN_ALIAS, applySkin } from '../themes/themes.js';

// Other modules (e.g. the safety copy in IndexedDB) can listen for every save.
const saveHooks = [];
export const onSave = fn => saveHooks.push(fn);
export function loadLocal() { try { const r = localStorage.getItem(LS); if (r) { const d = JSON.parse(r); if (d && Array.isArray(d.cols)) return d.cols.map(cleanCol).filter(Boolean); } } catch (e) {} return []; }
export function saveLocal() {
  const cols = S.cols.filter(c => !c.example), saved = Date.now();
  try { localStorage.setItem(LS, JSON.stringify({ cols, saved })); } catch (e) {}
  for (const f of saveHooks) { try { f(cols, saved); } catch (e) {} }
}
export function syncHTML() {
  const txt = S.sync === 'cloud' ? 'Saved to your account' : S.sync === 'error' ? 'Could not save' : 'This device only';
  return '<span id="sync" class="sync ' + S.sync + '"><i></i>' + txt + '</span>';
}
export function setSync(s) { S.sync = s; const el = $('#sync'); if (el) el.outerHTML = syncHTML(); }
export function push(col) {
  if (!G.DB) return;
  const ref = G.DB.collection('data/users/' + G.UID).doc(col.id);
  const body = JSON.parse(JSON.stringify(col));
  chains[col.id] = (chains[col.id] || Promise.resolve()).then(() => ref.set(body)).then(() => setSync('cloud')).catch(() => setSync('error'));
}
export function touch(col) {
  if (col.example) { col.example = false; S.cols = S.cols.filter(c => !c.example || c === col); }
  col.updated = Date.now(); saveLocal();
  if (G.DB) {
    for (const id of pending) { const c = S.cols.find(x => x.id === id); if (c && c !== col) push(c); }
    pending.clear();
    clearTimeout(timers[col.id]); timers[col.id] = setTimeout(() => push(col), 600);
  }
}
export function removeCol(id) {
  S.cols = S.cols.filter(c => c.id !== id); saveLocal(); pending.delete(id);
  if (G.DB) { clearTimeout(timers[id]); const ref = G.DB.collection('data/users/' + G.UID).doc(id);
    chains[id] = (chains[id] || Promise.resolve()).then(() => ref.delete()).catch(() => setSync('error')); }
}
export async function initCaps() {
  const c = window.claude; if (!c || !c.use) return;
  c.use('downloads').then(d => { G.DL = d; }).catch(() => {});
  try {
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const snap = await db.collection('data/users/' + id).get();
    G.DB = db; G.UID = id;
    const sd = snap.docs.find(d => d.id === '_settings' && d.exists);
    if (sd) { const sk = (sd.data() || {}).skin; if (sk && SKINS[SKIN_ALIAS[sk] || sk] && (SKIN_ALIAS[sk] || sk) !== S.skin) { applySkin(sk); try { localStorage.setItem('kolekcionar.skin', sk); } catch (e) {} } }
    const remote = snap.docs.filter(d => d.exists).map(d => cleanCol(JSON.parse(JSON.stringify(d.data())))).filter(Boolean);
    const local = S.cols.filter(x => !x.example);
    const map = new Map(remote.map(x => [x.id, x]));
    for (const l of local) { const r = map.get(l.id); if (!r || (l.updated || 0) > (r.updated || 0)) { map.set(l.id, l); pending.add(l.id); } }
    if (map.size) { S.cols = [...map.values()].sort((a, b) => ((a.order ?? 1e9) - (b.order ?? 1e9)) || ((a.created || 0) - (b.created || 0))); saveLocal(); }
    S.sync = 'cloud';
    if (S.view === 'home' || S.view === 'col' || S.view === 'settings' || S.view === 'themes') { if (S.view === 'col' && !curCol()) S.view = 'home'; render(); } else setSync('cloud');
  } catch (e) { G.DB = null; }
}
