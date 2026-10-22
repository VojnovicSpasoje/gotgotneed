// Editing a collection: name, variants, editions, items and which items have each variant.
import { onAct, onChange, onSubmit } from '../core/events.js';
import { go, navBack, registerView, render } from '../core/nav.js';
import { MAX_ITEMS, S } from '../core/state.js';
import { $, ICON, clone, esc, uid } from '../core/util.js';
import { dupMsg, dupNames, inScope, itemsOf, linesOf, parseLines, purgeEd, scopeFrom, scopeText } from '../data/model.js';
import { curCol } from '../data/select.js';
import { push, removeCol, saveLocal, touch } from '../data/store.js';
import { toast } from '../ui/toast.js';
import { viewHome } from './home.js';
import { editionForm, readEdition } from './new.js';

export function scopeEditor(e, v) {
  const label = (v.bonus ? '★ ' : '') + esc(v.name);
  if (e.mode === 'range') return '<label class="field"><span class="hint">' + label + '</span><input class="vscope" id="vs_' + e.id + '_' + v.id + '" data-edit="vscope" data-id="' + e.id + '" data-v="' + v.id + '" value="' + esc(scopeText(e, v.id)) + '" placeholder="All numbers ' + e.from + '–' + e.to + '"></label>';
  const items = itemsOf(e);
  if (!items.length) return '<p class="hint" style="margin:0">' + label + ': add items first.</p>';
  const n = items.filter(it => inScope(e, v.id, it.k)).length;
  return '<details class="pick"><summary>' + label + ': <span>' + n + ' of ' + items.length + ' items</span></summary><div class="picklist">' +
    items.map(it => '<label class="chk"><input type="checkbox" id="vp_' + e.id + '_' + v.id + '_' + it.k + '" data-edit="vpick" data-id="' + e.id + '" data-v="' + v.id + '" data-k="' + it.k + '"' + (inScope(e, v.id, it.k) ? ' checked' : '') + '> <span>' + esc(it.name) + (it.sn ? ' <span class="sn">' + esc(it.sn) + '</span>' : '') + '</span></label>').join('') + '</div></details>';
}
export function viewEdit() {
  const col = curCol(); if (!col) { S.view = 'home'; return viewHome(); }
  const cf = S.confirm;
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="back" aria-label="Back">' + ICON.back + '</button><h1>Edit</h1></header>';
  h += '<div class="box"><label class="field"><span class="label">Name</span><input id="eName" data-edit="name" value="' + esc(col.name) + '"></label>' +
    '<label class="field"><span class="label">Category</span><input id="eCat" data-edit="cat" value="' + esc(col.cat || '') + '"></label></div>';
  h += '<section class="section"><h2>Variants</h2><div class="box">' + col.variants.map((v, i) =>
    '<div class="stack" style="gap:8px"><div class="vrow"><input id="v_' + v.id + '" data-edit="var" data-id="' + v.id + '" value="' + esc(v.name) + '" aria-label="Variant name">' +
    (col.variants.length > 1 ? (cf === 'v:' + v.id ? '<button class="btn small danger" type="button" data-act="delvar" data-id="' + v.id + '">Delete</button><button class="btn small ghost" type="button" data-act="cancel">No</button>' : '<button class="btn small ghost" type="button" data-act="ask" data-id="v:' + v.id + '">Remove</button>') : '') + '</div>' +
    (i > 0 ? '<label class="chk"><input type="checkbox" id="vb_' + v.id + '" data-edit="vbonus" data-id="' + v.id + '"' + (v.bonus ? ' checked' : '') + '> Bonus: don’t count toward 100%</label>' : (col.variants.length > 1 ? '<span class="hint">Base version: every item has it.</span>' : '')) + '</div>').join('') +
    '<form class="addrow" data-form="addvar" style="margin-top:0"><input id="newVar" placeholder="New variant, e.g. Shiny" autocomplete="off"><button class="btn small" type="submit">Add</button></form>' +
    '<span class="hint">Deleting a variant also deletes everything marked in it. Choose which items have each special variant under Editions below.</span></div></section>';
  h += '<section class="section"><h2>Editions</h2>' + col.editions.map(e =>
    '<div class="box"><div class="rowwrap" style="justify-content:space-between"><span class="label">' + (e.mode === 'range' ? 'By number' : 'By name') + '</span>' +
    (col.editions.length > 1 ? (cf === 'e:' + e.id ? '<span class="rowwrap"><button class="btn small danger" type="button" data-act="deled" data-id="' + e.id + '">Delete edition</button><button class="btn small ghost" type="button" data-act="cancel">No</button></span>' : '<button class="linkbtn" type="button" data-act="ask" data-id="e:' + e.id + '" style="color:var(--danger)">Delete</button>') : '') + '</div>' +
    '<label class="field"><span class="label">Edition name</span><input id="en_' + e.id + '" data-edit="edname" data-id="' + e.id + '" value="' + esc(e.name) + '"></label>' +
    (e.mode === 'range'
      ? '<div class="two"><label class="field"><span class="label">From</span><input id="ef_' + e.id + '" type="number" inputmode="numeric" data-edit="from" data-id="' + e.id + '" value="' + e.from + '"></label><label class="field"><span class="label">To</span><input id="et_' + e.id + '" type="number" inputmode="numeric" data-edit="to" data-id="' + e.id + '" value="' + e.to + '"></label></div>'
      : '<label class="field"><span class="label">Items (' + e.items.length + ')</span><textarea id="ei_' + e.id + '" data-edit="items" data-id="' + e.id + '">' + esc(linesOf(e)) + '</textarea><span class="hint">One per line, “name ; serial number”. Saved when you leave the field.</span></label>') +
    (col.variants.length > 1 ? '<div class="field"><span class="label">Which items have each variant</span>' + (e.mode === 'range' ? '<span class="hint">Numbers separated by spaces, e.g. 1-20 45. Empty means all.</span>' : '') + col.variants.slice(1).map(v => scopeEditor(e, v)).join('') + '</div>' : '') +
    '</div>').join('') +
    '<form class="box" data-form="added"><h3>Add edition</h3><label class="field"><span class="label">Name</span><input id="aName" placeholder="e.g. 2027 edition, Update, Series B" autocomplete="off" required></label>' +
    editionForm('a', S.addMode) + '<p id="aErr" class="hint" style="color:var(--danger);margin:0" hidden></p><button class="btn" type="submit">Add edition</button></form></section>';
  h += '<section class="section"><h2>Collection</h2>' + (cf === 'col'
    ? '<div class="confirm"><span>Delete “' + esc(col.name) + '” and all its data?</span><button class="btn small danger" type="button" data-act="delcol">Delete</button><button class="btn small ghost" type="button" data-act="cancel">Cancel</button></div>'
    : '<button class="btn ghost" type="button" data-act="ask" data-id="col" style="color:var(--danger)">Delete collection</button>') + '</section>';
  return h;
}

registerView('edit', viewEdit, 2);
onAct({
  edit: () => { S.confirm = null; S.addMode = 'range'; go('edit'); },
  cancel: () => { S.confirm = null; render(); },
  delcol: ({ col }) => {
    const idx = S.cols.indexOf(col), copy = clone(col);
    removeCol(col.id); S.confirm = null; navBack('home', 2);
    toast('“' + copy.name + '” deleted', () => { S.cols.splice(Math.min(idx, S.cols.length), 0, copy); saveLocal(); push(copy); if (S.view === 'home') render(); });
  },
  deled: ({ col, id }) => {
    const before = clone(col.editions), e = col.editions.find(x => x.id === id);
    col.editions = col.editions.filter(x => x.id !== id); if (S.edId === id) S.edId = null; S.confirm = null; touch(col); render();
    toast('Edition “' + e.name + '” deleted', () => { col.editions = before; touch(col); render(); });
  },
  delvar: ({ col, id }) => {
    const bv = clone(col.variants), be = clone(col.editions), vn = (col.variants.find(x => x.id === id) || {}).name;
    col.variants = col.variants.filter(x => x.id !== id);
    for (const ed of col.editions) { for (const key of Object.keys(ed.have)) if (key.endsWith('|' + id)) delete ed.have[key]; if (ed.vscope) delete ed.vscope[id]; }
    if (S.varId === id) S.varId = null; S.confirm = null; touch(col); render();
    toast('Variant “' + vn + '” deleted', () => { col.variants = bv; col.editions = be; touch(col); render(); });
  },
});
onChange(e => {
  const t = e.target, kind = t.dataset && t.dataset.edit; if (!kind) return;
  const col = curCol(); if (!col) return true;
  const ed = t.dataset.id ? col.editions.find(x => x.id === t.dataset.id) : null;
  if (kind === 'vbonus') { const v = col.variants.find(x => x.id === t.dataset.id); v.bonus = t.checked; touch(col); toast('Saved'); return true; }
  if (kind === 'vscope') { const v = t.dataset.v;
    if (!t.value.trim()) { if (ed.vscope) delete ed.vscope[v]; }
    else { const res = scopeFrom(ed, t.value); if (res.err) { toast(res.err); t.value = scopeText(ed, v); return true; } ed.vscope = ed.vscope || {}; ed.vscope[v] = res.keys; t.value = scopeText(ed, v); }
    touch(col); toast('Saved'); return true; }
  if (kind === 'vpick') { const v = t.dataset.v, box = t.closest('details'), all = itemsOf(ed).length;
    const on = [...box.querySelectorAll('input[type=checkbox]:checked')].map(x => x.dataset.k);
    ed.vscope = ed.vscope || {}; if (on.length === all) delete ed.vscope[v]; else ed.vscope[v] = on;
    box.querySelector('summary span').textContent = on.length + ' of ' + all + ' items'; touch(col); return true; }
  const val = t.value.trim();
  if (kind === 'name') { if (!val) { t.value = col.name; return true; } col.name = val; }
  else if (kind === 'cat') col.cat = val;
  else if (kind === 'var') { const v = col.variants.find(x => x.id === t.dataset.id); if (!val) { t.value = v.name; return true; } v.name = val; }
  else if (kind === 'edname') { if (!val) { t.value = ed.name; return true; } ed.name = val; }
  const snapEd = ed && (kind === 'from' || kind === 'to' || kind === 'items') ? clone(ed) : null;
  if (kind === 'from' || kind === 'to') {
    const n = parseInt(val, 10); const f = kind === 'from' ? n : ed.from, to = kind === 'to' ? n : ed.to;
    if (!Number.isFinite(n) || to < f || to - f + 1 > MAX_ITEMS) { t.value = ed[kind]; toast('Invalid number range'); return true; }
    ed[kind] = n;
  } else if (kind === 'items') {
    const ni = parseLines(t.value, ed.items), d = dupNames(ni);
    if (d.length) { t.setAttribute('aria-invalid', 'true'); toast('Not saved. ' + dupMsg(d)); return true; }
    t.removeAttribute('aria-invalid'); ed.items = ni;
  }
  if (snapEd) {
    const now = new Set(itemsOf(ed).map(i => i.k));
    const lost = itemsOf(snapEd).filter(i => !now.has(i.k)).length;
    purgeEd(ed); touch(col); render();
    if (lost) toast(lost + (lost === 1 ? ' item removed' : ' items removed'), () => { Object.keys(ed).forEach(k => delete ed[k]); Object.assign(ed, snapEd); touch(col); render(); });
    else toast('Saved');
    return true;
  }
  touch(col); toast('Saved'); return true;
});
onSubmit({
  addvar: ({ col }) => { const v = $('#newVar').value.trim(); if (!v) return; col.variants.push({ id: uid(), name: v }); touch(col); render(); },
  added: ({ col }) => {
    const name = $('#aName').value.trim(); if (!name) return;
    const r = readEdition('a', S.addMode, name);
    if (r.err) { const el = $('#aErr'); el.textContent = r.err; el.hidden = false; return; }
    col.editions.push(r.ed); touch(col); S.edId = r.ed.id; S.tab = 'album'; S.q = ''; S.letter = ''; S.filter = 'all'; navBack('col');
    toast('Edition added');
  },
});
