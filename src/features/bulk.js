// Add many: enter a whole pack (or a run like 101-117) at once.
import { onAct, onInput } from '../core/events.js';
import { render } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, clone, esc } from '../core/util.js';
import { cnt, edStats, inScope, itemsOf, normName, setCnt } from '../data/model.js';
import { curCol, curEd, curVar } from '../data/select.js';
import { touch } from '../data/store.js';
import { M, closeModal, onModalClose } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

export let BK = null;
export function bkPrefKb() { try { return localStorage.getItem('ggn.bulkKb') || 'pad'; } catch (e) { return 'pad'; } }
export function openBulk() {
  const col = curCol(), ed = curEd(col);
  BK = { text: '', vid: curVar(col), kb: ed.mode === 'range' ? bkPrefKb() : 'phone' };
  M.focus = document.activeElement;
  renderBulk(); $('#modal').hidden = false;
  const t = $('#bkText'); if (t) t.focus();
}
export function bkTokens(ed) { return ed.mode === 'range' ? BK.text.split(/[\s,;]+/).filter(Boolean) : BK.text.split(/[\n,;]+/).map(x => x.trim()).filter(Boolean); }
export function bkParse() {
  const col = curCol(), ed = curEd(col), vid = BK.vid, sim = {}, out = [], groups = {};
  const get = k => (k in sim ? sim[k] : cnt(ed, k, vid));
  let nNew = 0, nDup = 0, nBad = 0; const adds = [];
  const single = (ti, k, label) => {
    const c = get(k); sim[k] = c + 1; c === 0 ? nNew++ : nDup++; adds.push(k);
    let g = groups[k];
    if (!g) { g = groups[k] = { k, label, had: c, add: 0, idx: [] }; out.push(g); }
    g.add++; g.idx.push(ti);
  };
  bkTokens(ed).forEach((tok, ti) => {
    if (ed.mode === 'range') {
      const m = tok.replace(/[–—]/g, '-').match(/^(\d+)(?:-(\d*))?$/);
      if (!m) { out.push({ cls: 'bad', label: tok, idx: [ti] }); nBad++; return; }
      if (m[2] === undefined || m[2] === '') {
        const n = +m[1], k = String(n);
        if (m[2] === '' ) { out.push({ cls: 'range', label: n + '–…', idx: [ti], sub: 'type the end' }); return; }
        if (n < ed.from || n > ed.to || !inScope(ed, vid, k)) { out.push({ cls: 'bad', label: k, idx: [ti] }); nBad++; return; }
        return single(ti, k, k);
      }
      let a = +m[1], b = +m[2]; if (b < a) [a, b] = [b, a];
      if (b - a > 2000) { out.push({ cls: 'bad', label: tok, idx: [ti] }); nBad++; return; }
      let cn = 0, cd = 0, cb = 0;
      for (let n = a; n <= b; n++) { const k = String(n); if (n < ed.from || n > ed.to || !inScope(ed, vid, k)) { cb++; continue; } const c = get(k); sim[k] = c + 1; c === 0 ? cn++ : cd++; adds.push(k); }
      nNew += cn; nDup += cd; nBad += cb;
      out.push({ cls: cn + cd === 0 ? 'bad' : 'range', label: a + '–' + b, idx: [ti], sub: [cn && cn + ' new', cd && cd + ' dup', cb && cb + ' ✕'].filter(Boolean).join(' · ') });
    } else {
      const w = normName(tok), it = ed.items.find(i => normName(i.name) === w || (i.sn && normName(i.sn) === w));
      if (!it || !inScope(ed, vid, it.k)) { out.push({ cls: 'bad', label: tok, idx: [ti] }); nBad++; return; }
      single(ti, it.k, it.name);
    }
  });
  for (const g of out) if (g.k !== undefined) {
    const fin = g.had + g.add;
    g.cls = g.had === 0 ? 'new' : 'dup';
    g.sub = (g.add > 1 ? '+' + g.add : '') + (fin > 1 ? (g.add > 1 ? ' → ' : '') + '×' + fin : '');
  }
  return { out, nNew, nDup, nBad, adds };
}
export function bkSuggest(ed) {
  if (ed.mode === 'range') return [];
  const parts = BK.text.split(/[\n,;]/), last = normName(parts[parts.length - 1] || '');
  if (!last) return [];
  return itemsOf(ed).filter(i => inScope(ed, BK.vid, i.k) && normName(i.name).includes(last) && normName(i.name) !== last).slice(0, 6);
}
export function renderBulk() {
  const col = curCol(), ed = curEd(col), range = ed.mode === 'range';
  const vvis = col.variants.filter(v => edStats(col, ed, v.id).total > 0);
  let h = '<div class="modal-card sheet" role="dialog" aria-modal="true" aria-labelledby="bkTitle"><div class="rowwrap" style="justify-content:space-between"><h3 id="bkTitle">Add many</h3><button class="iconbtn" type="button" data-act="mcancel" aria-label="Close" style="width:34px;height:34px">✕</button></div>' +
    '<p class="hint" style="margin:0">' + (range ? 'Enter numbers as you got them. A number that repeats counts as a duplicate. Use a dash for a run, like 101-117.' : 'Type names, separated by commas or new lines. Pick from the suggestions to avoid typos.') + '</p>';
  if (vvis.length > 1) h += '<div class="seg" role="group" aria-label="Variant">' + vvis.map(v => '<button type="button" data-act="bkvar" data-id="' + v.id + '" aria-pressed="' + (v.id === BK.vid) + '">' + (v.bonus ? '★ ' : '') + esc(v.name) + '</button>').join('') + '</div>';
  if (range && BK.kb === 'pad') {
    h += '<div class="bkdisp" id="bkDisp" aria-live="polite"></div>' +
      '<div class="pad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'del'].map(k => '<button type="button" class="key" data-act="bk" data-id="' + k + '" aria-label="' + (k === 'del' ? 'Delete' : k === '-' ? 'Range dash' : k) + '">' + (k === 'del' ? '⌫' : k === '-' ? '–' : k) + '</button>').join('') +
      '<button type="button" class="key next" data-act="bk" data-id="sp">Next number ␣</button></div>' +
      '<button class="linkbtn" type="button" data-act="bkkb" data-id="phone" style="align-self:flex-start">Use phone keyboard</button>';
  } else {
    h += '<textarea id="bkText" class="bktext" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (range ? '12 45 67 103 103 210  or  101-117' : 'Messi, Mascot, Trophy') + '">' + esc(BK.text) + '</textarea>' +
      (range ? '' : '<div class="chips" id="bkSug" style="margin:0"></div>') +
      (range ? '<button class="linkbtn" type="button" data-act="bkkb" data-id="pad" style="align-self:flex-start">Use number pad</button>' : '');
  }
  h += '<div id="bkPrev" class="bkprev"></div><div class="modal-actions"><button class="btn ghost" type="button" data-act="bkclear">Clear</button><button class="btn" type="button" data-act="bkadd" id="bkAdd">Add</button></div></div>';
  $('#modal').innerHTML = h; bkUpdate();
}
export function bkUpdate() {
  const ed = curEd(curCol()), r = bkParse();
  const d = $('#bkDisp'); if (d) { d.innerHTML = (BK.text ? esc(BK.text) : '<span class="muted">12 45 101-117</span>') + '<span class="caret"></span>'; d.scrollLeft = d.scrollWidth; }
  $('#bkPrev').innerHTML = (r.out.length ? '<div class="bksum">' + ['<b class="n">' + r.nNew + ' new</b>', '<b class="d">' + r.nDup + ' duplicate' + (r.nDup === 1 ? '' : 's') + '</b>', r.nBad ? '<b class="x">' + r.nBad + ' not in this album</b>' : ''].filter(Boolean).join(' · ') + '</div>' : '<div class="bksum muted">Nothing entered yet</div>') +
    '<div class="bkchips">' + r.out.map((c, i) => '<button type="button" class="bchip ' + c.cls + '" data-act="bkchip" data-id="' + i + '" aria-label="Remove ' + esc(c.label) + '">' + esc(c.label) + (c.sub ? ' <small>' + esc(c.sub) + '</small>' : '') + ' <span aria-hidden="true">×</span></button>').join('') + '</div>';
  const n = r.adds.length, b = $('#bkAdd'); b.textContent = n ? 'Add ' + n : 'Add'; b.disabled = !n;
  const sg = $('#bkSug'); if (sg) sg.innerHTML = bkSuggest(ed).map(i => '<button type="button" class="chip" data-act="bksug" data-id="' + i.k + '">' + esc(i.name) + '</button>').join('');
}
export function bkApply() {
  const col = curCol(), ed = curEd(col), r = bkParse(); if (!r.adds.length) return;
  const before = clone(ed.have), vid = BK.vid;
  for (const k of r.adds) setCnt(ed, k, vid, cnt(ed, k, vid) + 1);
  S.varId = vid; closeModal(); touch(col); render();
  toast('Added ' + r.adds.length + ' · ' + r.nNew + ' new, ' + r.nDup + ' dup', () => { ed.have = before; touch(col); render(); });
}

onModalClose(() => { BK = null; });
onAct({
  bulk: () => openBulk(),
  bk: ({ id }) => {
    const t = BK.text;
    if (id === 'del') BK.text = t.slice(0, -1);
    else if (id === 'sp') { if (t && !/\s$/.test(t)) BK.text = t + ' '; }
    else if (id === '-') { if (/\d$/.test(t)) BK.text = t + '-'; }
    else BK.text = t + id;
    try { navigator.vibrate && navigator.vibrate(8); } catch (err) {}
    bkUpdate();
  },
  bkkb: ({ id }) => { BK.kb = id; try { localStorage.setItem('ggn.bulkKb', id); } catch (err) {} renderBulk(); if (id === 'phone') { const t = $('#bkText'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); } },
  bkvar: ({ b, id }) => { BK.vid = id; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); bkUpdate(); },
  bkchip: ({ col, id }) => { const ed = curEd(col), drop = new Set(bkParse().out[+id].idx), toks = bkTokens(ed).filter((x, i) => !drop.has(i)); BK.text = ed.mode === 'range' ? (toks.join(' ') + (toks.length ? ' ' : '')) : (toks.join(', ') + (toks.length ? ', ' : '')); const t = $('#bkText'); if (t) t.value = BK.text; bkUpdate(); },
  bksug: ({ col, id }) => { const ed = curEd(col), it = ed.items.find(i => i.k === id); const parts = BK.text.split(/([\n,;])/); parts[parts.length - 1] = (BK.text.match(/[\n,;]\s*$/) ? '' : ' ') + it.name; BK.text = parts.join('').replace(/^\s+/, '') + ', '; const t = $('#bkText'); t.value = BK.text; t.focus(); bkUpdate(); },
  bkclear: () => { BK.text = ''; const t = $('#bkText'); if (t) t.value = ''; bkUpdate(); },
  bkadd: () => bkApply(),
});
onInput(e => { if (e.target.id === 'bkText' && BK) { BK.text = e.target.value; bkUpdate(); return true; } });
