// Keeping collections safe on the device:
//  1. ask the browser to treat our storage as persistent (not cleared when the phone runs low on space),
//  2. keep a second copy in IndexedDB and restore from it if the main copy is missing or older,
//  3. remind people to make a backup file now and then.
import { onAct } from '../core/events.js';
import { onRender, render } from '../core/nav.js';
import { G, LS, S } from '../core/state.js';
import { backupInfo, doExport, setBackupInfo } from '../data/backup.js';
import { onSave, saveLocal } from '../data/store.js';
import { cleanCol } from '../data/model.js';
import { toast } from '../ui/toast.js';

const DAY = 864e5;
export const REMIND_AFTER = 14 * DAY;   // no backup for this long → show the reminder
export const SNOOZE = 7 * DAY;          // "Later" hides it for this long
const own = () => S.cols.filter(c => !c.example);

// ── 1. Persistent storage ──────────────────────────────────────────────
let asked = false;
async function askPersist() {
  if (asked || !own().length || !navigator.storage || !navigator.storage.persist) return;
  asked = true;
  try { if (!(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {}
}

// ── 2. Second copy in IndexedDB ────────────────────────────────────────
const IDB = 'gotgotneed', STORE = 'kv';
function idb() {
  return new Promise((ok, no) => {
    if (!window.indexedDB) return no(new Error('no idb'));
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
async function idbGet(key) { const db = await idb(); return new Promise((ok, no) => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); }
async function idbSet(key, val) { const db = await idb(); return new Promise((ok, no) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(val, key); t.oncomplete = () => ok(); t.onerror = () => no(t.error); }); }

let copyTimer;
onSave((cols, saved) => {
  clearTimeout(copyTimer);
  const snap = JSON.parse(JSON.stringify(cols));
  // Same time stamp as the main copy, so on the next start the two are recognised as equal.
  copyTimer = setTimeout(() => idbSet('cols', { cols: snap, saved }).catch(() => {}), 400);
  askPersist();
});

// Newest change time across a set of collections.
const newest = cols => cols.reduce((m, c) => Math.max(m, c.updated || 0), 0);
function mainSaved() { try { const r = localStorage.getItem(LS); return r ? (JSON.parse(r).saved || 0) : null; } catch (e) { return null; } }
// On start: if the main copy is missing, or older than the safety copy (e.g. it could not be written
// because storage was full), bring the collections back from the safety copy.
export async function restoreFromCopy() {
  try {
    const d = await idbGet('cols'), main = mainSaved();
    if (!d || !Array.isArray(d.cols)) { if (own().length) saveLocal(); return false; }   // first run with this feature: make the copy
    if (main !== null && main >= (d.saved || 0)) return false;
    if (!d.cols.length) return false;
    const had = own().length;
    S.cols = d.cols.map(cleanCol).filter(Boolean); saveLocal(); render();
    toast(had ? 'Restored newer changes from the safety copy' : 'Your collections were restored from the safety copy');
    return true;
  } catch (e) { return false; }
}

// ── 3. Backup reminder ─────────────────────────────────────────────────
export function needsReminder(now = Date.now()) {
  if (G.DB) return false;                       // inside Claude everything is already saved to the account
  const mine = own(); if (!mine.length) return false;
  const b = backupInfo();
  if (b.off) return false;                      // turned off in Settings
  if (b.snooze && now < b.snooze) return false;
  if (b.last && newest(mine) <= b.last) return false;   // nothing changed since the last backup
  const since = b.last || Math.min(...mine.map(c => c.created || now));
  return now - since >= REMIND_AFTER;
}
function ago(t) { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; }
function nudgeHTML() {
  const b = backupInfo();
  return '<div class="bknudge" id="bknudge" role="status"><div class="bk-txt"><b>Back up your collections</b><span>' +
    (b.last ? 'Last backup ' + ago(b.last) + '.' : 'You haven’t made a backup yet.') +
    ' A backup file keeps them safe if you lose or change your phone.</span></div>' +
    '<div class="bk-act"><button class="btn small" type="button" data-act="bkNow">Back up now</button><button class="linkbtn" type="button" data-act="bkLater">Later</button></div></div>';
}
onRender(() => {
  if (S.view !== 'home') return;
  askPersist();
  if (!needsReminder() || document.getElementById('bknudge')) return;
  const at = document.querySelector('.summary'); if (at) at.insertAdjacentHTML('afterend', nudgeHTML());
});
onAct({
  bkNow: () => doExport(),
  bkLater: () => { setBackupInfo({ snooze: Date.now() + SNOOZE }); document.getElementById('bknudge')?.remove(); toast('We’ll remind you in a week'); },
});
