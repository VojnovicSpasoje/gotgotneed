// Swap with a friend: share an edition as a QR code (or link), and compare a friend's edition with yours.
import { onAct, onChange } from '../core/events.js';
import { go, registerView, render, swap as replaceView } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, ICON, esc, isNativeApp, nativePlugin, uid } from '../core/util.js';
import { ranges } from '../data/model.js';
import { curCol, curEd } from '../data/select.js';
import { SITE, candidates, compareEdition, decodeShare, encodeShare, packEdition, unpackEdition, NA } from '../data/share.js';
import { touch } from '../data/store.js';
import { M } from '../ui/modal.js';
import { qrByteCapacity, qrEncode, qrSVG } from '../lib/qr.js';
import { toast } from '../ui/toast.js';

// Bigger QR codes get too dense to scan from a phone screen; past this, only the link is offered.
export const QR_MAX_VERSION = 25;
const shareBase = () => (window.claude || isNativeApp() || !/^https?:$/.test(location.protocol)) ? SITE : location.origin + location.pathname;

// ── Sharing ─────────────────────────────────────────────────────────────
let shareURL = '';
async function openShare() {
  const col = curCol(), ed = curEd(col);
  shareURL = shareBase() + '#t=' + await encodeShare(packEdition(col, ed));
  const bytes = new TextEncoder().encode(shareURL);
  const q = bytes.length <= qrByteCapacity(QR_MAX_VERSION, 'L') ? qrEncode(bytes, 'L', QR_MAX_VERSION) : null;
  M.focus = document.activeElement; M.act = null;
  const m = $('#modal');
  m.innerHTML = '<div class="modal-card share-card" role="dialog" aria-modal="true" aria-labelledby="shTitle">' +
    '<h3 id="shTitle">Swap with a friend</h3>' +
    '<p class="muted">' + esc(col.name) + (col.editions.length > 1 ? ' · ' + esc(ed.name) : '') + '</p>' +
    (q ? '<div class="qrbox">' + qrSVG(q, '#111', '#fff') + '</div><p class="hint" style="margin:0">Your friend scans this with the phone camera. GotGotNeed opens and shows what you can swap.</p>'
       : '<p class="hint" style="margin:0">This list is too big for a QR code. Send the link instead – it works the same way.</p>') +
    '<div class="modal-actions"><button class="btn ghost" type="button" data-act="mcancel">Close</button>' +
    (navigator.share || nativePlugin('Share') ? '<button class="btn ghost" type="button" data-act="shSend">Send…</button>' : '') +
    '<button class="btn" type="button" data-act="shCopy">Copy link</button></div></div>';
  m.hidden = false; m.querySelector('[data-act="shCopy"]').focus();
}
function copyLink() {
  const done = () => toast('Link copied – paste it in a message');
  try { navigator.clipboard.writeText(shareURL).then(done, () => toast('Could not copy')); } catch (e) { toast('Could not copy'); }
}

// ── Receiving ───────────────────────────────────────────────────────────
// S.swap = { fr: the friend's edition, pick: index into candidates, cands }
async function receive() {
  const h = location.hash; if (!h.startsWith('#t=')) return;
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
  const text = await decodeShare(h.slice(3)), fr = text && unpackEdition(text);
  if (!fr) { toast('This swap link is damaged or from a newer version of the app'); return; }
  const cands = candidates(S.cols, fr);
  S.swap = { fr, cands, pick: cands.length ? 0 : -1 };
  go('swap');
}

const label = (mode, its) => mode === 'range' ? ranges(its.map(it => it.n)) : its.map(it => '• ' + it.name + (it.sn ? ' [' + it.sn + ']' : '')).join('\n');
function resultHTML(c, mode) {
  const box = (id, title, its, empty) => '<div class="box trade"><h3>' + title + ' <span class="swapn">' + its.length + '</span>' +
    (its.length ? '<button class="btn small ghost" type="button" data-act="copy" data-id="' + id + '">Copy</button>' : '') + '</h3>' +
    (its.length ? '<textarea id="' + id + '" readonly>' + esc(label(mode, its)) + '</textarea>' : '<p class="muted" style="margin:0">' + empty + '</p>') + '</div>';
  return c.map((p, i) => {
    const head = c.length > 1 ? '<h2 class="swapvar">' + esc(p.name) + '</h2>' : '';
    if (!p.vid) return head + '<p class="hint">Not compared – you don’t have the variant “' + esc(p.name) + '”.</p>';
    const n = Math.min(p.get.length, p.give.length);
    return head + (n ? '<div class="swapsum">You can swap <b>' + n + ' for ' + n + '</b></div>' : '') +
      box('sg' + i, 'You get', p.get, 'Your friend has no spares that you’re missing.') +
      box('sv' + i, 'You give', p.give, 'You have no spares that your friend is missing.');
  }).join('');
}
function viewSwap() {
  const sw = S.swap;
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="home" aria-label="Back">' + ICON.back + '</button><h1>Swap with a friend</h1></header>';
  if (!sw) return h + '<div class="empty">Nothing to compare.</div>';
  const fr = sw.fr, total = fr.items.length;
  h += '<div class="box"><span class="label">Friend’s collection</span><div><b>' + esc(fr.name) + '</b>' + (fr.edName ? ' <span class="muted">· ' + esc(fr.edName) + '</span>' : '') + '</div>' +
    '<span class="muted" style="font-size:13px">' + total + ' items' + (fr.variants.length > 1 ? ' · ' + fr.variants.map(esc).join(', ') : '') + '</span></div>';
  if (sw.cands.length) {
    h += '<div class="field" style="margin:16px 0"><label for="swPick">Compare with</label><select id="swPick" class="sortsel">' +
      sw.cands.map((c, i) => '<option value="' + i + '"' + (i === sw.pick ? ' selected' : '') + '>' + esc(c.col.name) + (c.col.editions.length > 1 ? ' – ' + esc(c.ed.name) : '') + (i === 0 ? ' (best match)' : '') + '</option>').join('') + '</select></div>';
    const c = sw.cands[sw.pick];
    h += '<div class="stack">' + resultHTML(compareEdition(c.col, c.ed, fr), fr.mode) + '</div>';
  } else {
    h += '<div class="empty" style="margin-top:16px">You don’t have this collection yet.</div>';
  }
  h += '<div class="swapstart"><button class="' + (sw.cands.length ? 'linkbtn' : 'btn') + '" type="button" data-act="swStart">Start this collection</button>' +
    '<span class="hint">Creates an empty copy of your friend’s list, so you can collect it too.</span></div>';
  return h;
}
function startCollection() {
  const fr = S.swap.fr, now = Date.now();
  const vs = fr.variants.map(n => ({ id: uid(), name: n || 'Standard' }));
  const ed = { id: uid(), name: fr.edName || 'Main', mode: fr.mode, from: fr.from || 1, to: fr.to || 1, items: [], have: {}, vscope: {} };
  if (fr.mode === 'list') ed.items = fr.items.map(it => ({ k: uid(), name: it.name, sn: it.sn }));
  const keys = fr.mode === 'list' ? ed.items.map(i => i.k) : fr.items.map(i => i.key);
  vs.forEach((v, vi) => { if (fr.items.some(it => (it.st[vi] || NA) === NA)) ed.vscope[v.id] = keys.filter((k, i) => (fr.items[i].st[vi] || NA) !== NA); });
  const col = { id: uid(), name: fr.name || 'New collection', cat: '', created: now, updated: now, order: S.cols.filter(c => !c.example).length, variants: vs, editions: [ed] };
  S.cols = S.cols.filter(c => !c.example); S.cols.push(col); touch(col);
  S.colId = col.id; S.edId = ed.id; S.varId = null; S.tab = 'album'; S.filter = 'all'; S.q = '';
  S.swap = null; replaceView('col'); toast('Collection created – start marking what you have');
}

registerView('swap', viewSwap, 1);
onAct({
  share: () => { openShare(); },
  shCopy: () => copyLink(),
  shSend: () => { const d = { title: 'GotGotNeed swap', text: 'What can we swap? Open this in GotGotNeed:', url: shareURL }, sh = nativePlugin('Share'); (sh ? sh.share(d) : navigator.share(d)).catch(() => {}); },
  swStart: () => startCollection(),
});
onChange(e => { if (e.target.id === 'swPick') { S.swap.pick = +e.target.value; render(); return true; } });
window.addEventListener('hashchange', receive);
setTimeout(receive, 0);
