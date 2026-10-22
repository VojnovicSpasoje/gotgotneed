// Creating a collection (and the edition form shared with Edit).
import { onAct, onChange, onInput, onSubmit } from '../core/events.js';
import { registerView, swap } from '../core/nav.js';
import { MAX_ITEMS, S } from '../core/state.js';
import { $, ICON, esc, uid } from '../core/util.js';
import { dupMsg, dupNames, lineLabel, parseLines, scopeFrom } from '../data/model.js';
import { touch } from '../data/store.js';

export function editionForm(prefix, mode) {
  return '<div class="field"><span class="label">Tracking method</span><div class="seg" role="group"><button type="button" data-act="fmode" data-p="' + prefix + '" data-id="range" aria-pressed="' + (mode === 'range') + '">By number</button><button type="button" data-act="fmode" data-p="' + prefix + '" data-id="list" aria-pressed="' + (mode === 'list') + '">By name / serial</button></div></div>' +
    '<div class="two" id="' + prefix + 'rangeBox"' + (mode === 'range' ? '' : ' hidden') + '><label class="field"><span class="label">From number</span><input id="' + prefix + 'from" type="number" inputmode="numeric" value="1" min="0"></label><label class="field"><span class="label">To number</span><input id="' + prefix + 'to" type="number" inputmode="numeric" value="100" min="0"></label></div>' +
    '<label class="field" id="' + prefix + 'listBox"' + (mode === 'list' ? '' : ' hidden') + '><span class="label">Items, one per line</span><textarea id="' + prefix + 'items" placeholder="Name&#10;Name ; serial number&#10;5 dinara ; 2009"></textarea><span class="hint">Each name must be unique. Separate a serial or catalog number with a semicolon. You can add more later.</span><span class="hint" id="' + prefix + 'dup" style="color:var(--danger)" hidden></span></label>';
}
export function readEdition(prefix, mode, name) {
  const ed = { id: uid(), name: name || 'Main edition', mode, from: 1, to: 1, items: [], have: {} };
  if (mode === 'range') {
    const fs = $('#' + prefix + 'from').value.trim(), ts = $('#' + prefix + 'to').value.trim();
    if (!/^\d{1,7}$/.test(fs) || !/^\d{1,7}$/.test(ts)) return { err: 'Use whole numbers from 0 up, e.g. From 1, To 670.' };
    const f = +fs, t = +ts;
    if (t < f) return { err: '“To” must be greater than or equal to “From”.' };
    if (t - f + 1 > MAX_ITEMS) return { err: 'At most ' + MAX_ITEMS + ' numbers per edition.' };
    ed.from = f; ed.to = t;
  } else { ed.items = parseLines($('#' + prefix + 'items').value); const d = dupNames(ed.items); if (d.length) return { err: dupMsg(d) }; }
  return { ed };
}
export const scopePh = () => 'Only these numbers, e.g. 1-5 10 45 (empty = all)';
export function fillPicks(row) {
  const box = row.querySelector('[data-f="pick"]'), list = box.querySelector('.picklist');
  const prev = new Set([...list.querySelectorAll('input[data-l]:checked')].map(x => x.dataset.l));
  const all = box.dataset.all !== '0', items = parseLines($('#nitems').value);
  list.innerHTML = items.length
    ? '<label class="chk"><input type="checkbox" data-all' + (all ? ' checked' : '') + '> <strong>All items</strong></label>' +
      items.map(it => { const l = lineLabel(it); return '<label class="chk"><input type="checkbox" data-l="' + esc(l) + '"' + (!all && prev.has(l) ? ' checked' : '') + '> <span>' + esc(it.name) + (it.sn ? ' <span class="sn">' + esc(it.sn) + '</span>' : '') + '</span></label>'; }).join('')
    : '<p class="hint" style="margin:0">Type the items above first, then pick them here.</p>';
  pickSum(box);
}
export function pickSum(box) {
  const n = box.querySelectorAll('input[data-l]:checked').length;
  box.querySelector('summary span').textContent = box.dataset.all !== '0' ? 'All items' : n + ' selected';
}
export function newVarRow() {
  return '<div class="vbox" data-vrow><div class="vrow"><input data-f="name" maxlength="40" placeholder="Variant name, e.g. Shiny" autocomplete="off" aria-label="Variant name"><button class="linkbtn" type="button" data-act="nvdel" style="color:var(--danger)">Remove</button></div>' +
    '<input class="vscope" data-f="scope" placeholder="' + scopePh() + '" autocomplete="off" inputmode="text" aria-label="Which numbers have this variant"' + (S.newMode === 'range' ? '' : ' hidden') + '>' +
    '<details class="pick" data-f="pick" data-all="1"' + (S.newMode === 'list' ? '' : ' hidden') + '><summary>Which items have it: <span>All items</span></summary><div class="picklist"></div></details>' +
    '<label class="chk"><input type="checkbox" data-f="bonus"> Bonus: don’t count toward 100%</label></div>';
}
export function viewNew() {
  return '<header class="top"><button class="iconbtn" type="button" data-act="home" aria-label="Back">' + ICON.back + '</button><h1>New collection</h1></header>' +
    '<form class="box" data-form="new" style="margin-top:6px">' +
    '<label class="field"><span class="label">Collection name</span><input id="nName" maxlength="100" required placeholder="e.g. World Cup 2026" autocomplete="off"></label>' +
    '<label class="field"><span class="label">Category (optional)</span><input id="nCat" maxlength="40" placeholder="Stickers, coins, cards…" autocomplete="off"></label>' +
    '<label class="field"><span class="label">First edition name</span><input id="nEd" maxlength="60" value="Main edition" autocomplete="off"></label>' +
    editionForm('n', S.newMode) +
    '<label class="chk big"><input type="checkbox" id="nHasVar"> This collection has special variants <span class="hint">e.g. Shiny, Gold, Signed</span></label>' +
    '<div id="nVarBox" class="stack" hidden>' +
      '<label class="field"><span class="label">Base version name</span><input id="nBase" maxlength="40" value="Regular" autocomplete="off"><span class="hint">Every item has the base version.</span></label>' +
      '<div class="stack" id="nVarRows">' + newVarRow() + '</div>' +
      '<button class="btn small ghost" type="button" data-act="nvadd" style="align-self:flex-start">+ Add another variant</button>' +
      '<span class="hint">For each special variant, choose which items exist in it. If every item has it, leave it on all.</span>' +
    '</div>' +
    '<p id="nErr" class="hint" style="color:var(--danger);margin:0" hidden></p>' +
    '<button class="btn block" type="submit">Create collection</button></form>';
}

registerView('new', viewNew, 1);
export let pickTimer = null;
onAct({
  fmode: ({ b, id }) => {
    const p = b.dataset.p; if (p === 'n') S.newMode = id; else S.addMode = id;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#' + p + 'rangeBox').hidden = id !== 'range'; $('#' + p + 'listBox').hidden = id !== 'list';
    if (p === 'n') document.querySelectorAll('#nVarRows [data-vrow]').forEach(row => { row.querySelector('.vscope').hidden = id !== 'range'; row.querySelector('[data-f="pick"]').hidden = id !== 'list'; if (id === 'list') fillPicks(row); });
  },
  nvadd: () => { $('#nVarRows').insertAdjacentHTML('beforeend', newVarRow()); const row = $('#nVarRows [data-vrow]:last-child'); if (S.newMode === 'list') fillPicks(row); row.querySelector('input').focus(); },
  nvdel: ({ b }) => b.closest('[data-vrow]').remove(),
});
onInput(e => {
  const id = e.target.id;
  if (id !== 'nitems' && id !== 'aitems') return;
  const d = dupNames(parseLines(e.target.value)), w = document.getElementById(id[0] + 'dup');
  w.textContent = d.length ? 'Repeated names: ' + d.join(', ') : ''; w.hidden = !d.length;
  if (d.length) e.target.setAttribute('aria-invalid', 'true'); else e.target.removeAttribute('aria-invalid');
  if (id === 'nitems') { clearTimeout(pickTimer); pickTimer = setTimeout(() => document.querySelectorAll('#nVarRows [data-vrow]').forEach(fillPicks), 300); }
  return true;
});
onChange(e => {
  const t = e.target;
  if (t.matches && t.matches('#nVarRows [data-f="name"]') && t.value.trim()) t.removeAttribute('aria-invalid');
  if (t.id === 'nHasVar') { $('#nVarBox').hidden = !t.checked; if (t.checked && S.newMode === 'list') document.querySelectorAll('#nVarRows [data-vrow]').forEach(fillPicks); return true; }
  const pk = t.closest && t.closest('#nVarRows [data-f="pick"]');
  if (pk) {
    if (t.hasAttribute('data-all')) { pk.dataset.all = t.checked ? '1' : '0'; if (t.checked) pk.querySelectorAll('input[data-l]').forEach(x => { x.checked = false; }); }
    else if (t.checked) { pk.dataset.all = '0'; const a = pk.querySelector('[data-all]'); if (a) a.checked = false; }
    pickSum(pk); return true;
  }
});
onSubmit({
  new: () => {
    const name = $('#nName').value.trim(); if (!name) return;
    const r = readEdition('n', S.newMode, $('#nEd').value.trim());
    const nErr = m => { const el = $('#nErr'); el.textContent = m; el.hidden = false; };
    if (r.err) { nErr(r.err); return; }
    let variants = [{ id: uid(), name: 'Standard' }];
    if ($('#nHasVar').checked) {
      variants = [{ id: uid(), name: $('#nBase').value.trim() || 'Regular' }];
      const rows = document.querySelectorAll('#nVarRows [data-vrow]');
      if (!rows.length) { nErr('Add at least one special variant, or uncheck “This collection has special variants”.'); return; }
      for (const row of rows) {
        const nameIn = row.querySelector('[data-f="name"]'); nameIn.removeAttribute('aria-invalid');
        const vn = nameIn.value.trim();
        if (!vn) { nameIn.setAttribute('aria-invalid', 'true'); nameIn.focus(); nErr('Enter a name for every special variant, or remove the ones you don’t need.'); return; }
        const v = { id: uid(), name: vn, bonus: row.querySelector('[data-f="bonus"]').checked };
        if (r.ed.mode === 'range') {
          const sc = row.querySelector('[data-f="scope"]').value.trim();
          if (sc) { const res = scopeFrom(r.ed, sc); if (res.err) { nErr(vn + ': ' + res.err); return; } r.ed.vscope = r.ed.vscope || {}; r.ed.vscope[v.id] = res.keys; }
        } else {
          const pk = row.querySelector('[data-f="pick"]');
          if (pk.dataset.all === '0') {
            const want = new Set([...pk.querySelectorAll('input[data-l]:checked')].map(x => x.dataset.l));
            if (!want.size) { nErr(vn + ': choose which items have it, or pick “All items”.'); return; }
            r.ed.vscope = r.ed.vscope || {}; r.ed.vscope[v.id] = r.ed.items.filter(i => want.has(lineLabel(i))).map(i => i.k);
          }
        }
        variants.push(v);
      }
    }
    const c = { id: uid(), name, cat: $('#nCat').value.trim(), created: Date.now(), updated: Date.now(), order: S.cols.filter(x => !x.example).length,
      variants, editions: [r.ed] };
    S.cols = S.cols.filter(x => !x.example); S.cols.push(c); touch(c);
    S.colId = c.id; S.edId = null; S.varId = null; S.q = ''; S.filter = 'all'; S.tab = 'album'; swap('col');
  },
});
