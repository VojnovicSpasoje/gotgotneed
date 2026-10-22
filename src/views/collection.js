// One collection: progress, editions, variants, the album grid/list and the trade lists.
import { onAct, onInput } from '../core/events.js';
import { registerView, render } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, ICON, esc, fmtPct, pct } from '../core/util.js';
import { bonusStats, cnt, colStats, edStats, inScope, itemsOf, ranges, setCnt } from '../data/model.js';
import { curCol, curEd, curVar } from '../data/select.js';
import { touch } from '../data/store.js';
import { lastTap, toast } from '../ui/toast.js';
import { viewHome } from './home.js';

export function ringSVG(p) {
  const r = 36, C = 2 * Math.PI * r, off = C * (1 - p / 100);
  return '<div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="' + r + '" fill="none" stroke="var(--sunk)" stroke-width="9"/><circle cx="42" cy="42" r="' + r + '" fill="none" stroke="var(--have)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg><div class="v">' + Math.floor(p) + '%</div></div>';
}
export function viewCol() {
  const col = curCol(); if (!col) { S.view = 'home'; return viewHome(); }
  const ed = curEd(col), vid = curVar(col);
  const cs = colStats(col), es = edStats(col, ed, vid);
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="home" aria-label="Back">' + ICON.back + '</button><h1>' + esc(col.name) + '</h1><button class="iconbtn" type="button" data-act="edit" aria-label="Edit collection">' + ICON.edit + '</button></header>';
  if (col.example) h += '<div class="example-note">Example collection. Try marking items; your first change saves it as yours.</div>';
  h += '<div class="hero" id="hero">' + heroHTML(col, ed, vid, cs, es) + '</div>';
  h += '<div class="chips" role="group" aria-label="Editions">' + col.editions.map(e => { const s = edStats(col, e);
    return '<button class="chip" type="button" data-act="ed" data-id="' + e.id + '" aria-pressed="' + (e.id === ed.id) + '">' + esc(e.name) + ' <small>' + Math.floor(pct(s.owned, s.total)) + '%</small></button>'; }).join('') +
    '<button class="chip" type="button" data-act="edit" style="border-style:dashed">+ Edition</button></div>';
  const vvis = col.variants.filter(v => edStats(col, ed, v.id).total > 0);
  if (vvis.length > 1) h += '<div class="chips" role="group" aria-label="Variants">' + vvis.map(v => { const s = edStats(col, ed, v.id);
    return '<button class="chip" type="button" data-act="var" data-id="' + v.id + '" aria-pressed="' + (v.id === vid) + '">' + (v.bonus ? '★ ' : '') + esc(v.name) + ' <small>' + s.owned + '/' + s.total + '</small></button>'; }).join('') + '</div>';
  h += '<div class="tabs"><button type="button" data-act="tab" data-id="album" aria-pressed="' + (S.tab === 'album') + '">Album</button><button type="button" data-act="tab" data-id="trade" aria-pressed="' + (S.tab === 'trade') + '">Trade</button></div>';
  if (S.tab === 'trade') return h + tradeHTML(col, ed);
  const flt = [['all', 'All'], ['have', 'Have'], ['miss', 'Missing'], ['dup', 'Duplicates']];
  h += '<div class="tools">' + (showSearch(ed, vid) ? '<input class="search" id="q" type="search" placeholder="' + (ed.mode === 'range' ? 'Find a number…' : 'Search name or serial number…') + '" value="' + esc(S.q) + '">' : '') +
    '<div class="rowwrap" style="justify-content:space-between"><div class="seg" role="group" aria-label="Filter">' + flt.map(([k, l]) => '<button type="button" data-act="filter" data-id="' + k + '" aria-pressed="' + (S.filter === k) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="actrow"><div class="seg" role="group" aria-label="Tap action">' + [['toggle', 'Mark'], ['plus', '+1'], ['minus', '−1']].map(([k, l]) => '<button type="button" data-act="mode" data-id="' + k + '" aria-pressed="' + (S.mode === k) + '">' + l + '</button>').join('') + '</div>' +
    '<div class="actend"><button class="btn small" type="button" data-act="bulk">+ Add many</button>' + layoutBtn(ed) + '</div></div>' +
    '<div class="hint">' + (S.mode === 'toggle' ? 'Tap to mark or unmark an item.' : S.mode === 'plus' ? 'Tap to add another copy (duplicate).' : 'Tap to remove one copy.') + '</div></div>';
  h += '<div id="items">' + itemsHTML(col, ed, vid) + '</div>';
  return h;
}
// One button that switches name lists between grid and list; it shows the layout you'd switch TO.
function layoutBtn(ed) {
  if (ed.mode !== 'list') return '';
  const to = (ed.view || 'grid') === 'grid' ? 'list' : 'grid';
  return '<button class="viewbtn" type="button" data-act="lview" data-id="' + to + '" aria-label="Show as ' + to + '" title="Show as ' + to + '">' + ICON[to] + '</button>';
}
export function heroHTML(col, ed, vid, cs, es) {
  const vname = col.variants.length > 1 ? col.variants.find(v => v.id === vid).name : '', ep = pct(es.owned, es.total);
  const bn = col.variants.some(v => v.bonus) ? bonusStats(col) : null;
  return '<div class="hero-top">' + ringSVG(ep) + '<div class="hero-main"><div class="hero-ctx">' + esc(ed.name) + (vname ? ' · ' + esc(vname) : '') + '</div>' +
    '<div class="hero-big">' + es.owned + '<span> / ' + es.total + '</span></div><div class="hero-sub">' + fmtPct(ep) + ' collected</div></div></div>' +
    '<div class="hero-stats"><div><span class="label">Whole</span><b class="num">' + cs.owned + '/' + cs.total + '</b></div>' +
    '<div><span class="label">Missing</span><b class="num">' + (es.total - es.owned) + '</b></div>' +
    '<div><span class="label">Dupes</span><b class="num" style="color:var(--dup)">' + es.dups + '</b></div>' +
    (bn ? '<div><span class="label">★ Bonus</span><b class="num">' + bn.owned + '/' + bn.total + '</b></div>' : '') + '</div>';
}
// The search box only appears on longer editions; short ones are quicker to scan by eye.
export const SEARCH_MIN = 31;
export const showSearch = (ed, vid) => itemsOf(ed).filter(it => inScope(ed, vid, it.k)).length >= SEARCH_MIN;
export function visibleItems(ed, vid) {
  const q = showSearch(ed, vid) ? S.q.trim().toLowerCase() : '';
  return itemsOf(ed).filter(it => {
    if (!inScope(ed, vid, it.k)) return false;
    const c = cnt(ed, it.k, vid);
    if (S.filter === 'have' && c < 1) return false;
    if (S.filter === 'miss' && c > 0) return false;
    if (S.filter === 'dup' && c < 2) return false;
    if (q && !(it.name.toLowerCase().includes(q) || (it.sn || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
export function itemsHTML(col, ed, vid) {
  const items = visibleItems(ed, vid);
  if (!items.length) return '<div class="empty">' + (itemsOf(ed).length ? 'Nothing matches this filter.' : 'This edition has no items yet.<div style="margin-top:12px"><button class="btn small" type="button" data-act="edit">Add items in Edit</button></div>') + '</div>';
  if (ed.mode === 'range') return '<div class="grid">' + items.map(it => { const c = cnt(ed, it.k, vid);
    return '<button type="button" class="slot' + (c ? ' on' : '') + '" data-act="tap" data-k="' + it.k + '" aria-label="Number ' + it.k + ', have ' + c + '">' + it.name + (c > 1 ? '<span class="x">×' + c + '</span>' : '') + '</button>'; }).join('') + '</div>';
  if ((ed.view || 'grid') === 'grid') return '<div class="grid ngrid">' + items.map(it => { const c = cnt(ed, it.k, vid);
    return '<button type="button" class="slot ntile' + (c ? ' on' : '') + '" data-act="tap" data-k="' + it.k + '" aria-label="' + esc(it.name) + ', have ' + c + '"><span class="ntn">' + esc(it.name) + '</span>' + (it.sn ? '<span class="nts">' + esc(it.sn) + '</span>' : '') + (c > 1 ? '<span class="x">×' + c + '</span>' : '') + '</button>'; }).join('') + '</div>';
  return '<div class="list">' + items.map(it => { const c = cnt(ed, it.k, vid);
    return '<div class="item' + (c ? ' on' : '') + '"><button type="button" class="check' + (c ? ' on' : '') + '" data-act="tap" data-k="' + it.k + '" aria-label="Mark ' + esc(it.name) + '">' + (c ? ICON.check : '') + '</button>' +
      '<span class="nm" data-act="tap" data-k="' + it.k + '"><span class="nmt">' + esc(it.name) + '</span>' + (it.sn ? '<span class="sn">' + esc(it.sn) + '</span>' : '') + '</span>' +
      (c > 1 ? '<span class="dupc">×' + c + '</span>' : '') + '</div>'; }).join('') + '</div>';
}
export function refreshCol(justK, cls) {
  const col = curCol(), ed = curEd(col), vid = curVar(col);
  $('#items').innerHTML = itemsHTML(col, ed, vid);
  if (justK) { const el = $('#items [data-k="' + justK + '"]'); const t = el && (el.closest('.item') || el); if (t) t.classList.add(cls || 'just'); }
  $('#hero').innerHTML = heroHTML(col, ed, vid, colStats(col), edStats(col, ed, vid));
  document.querySelectorAll('[data-act="ed"]').forEach(b => { const e = col.editions.find(x => x.id === b.dataset.id); const s = edStats(col, e); b.querySelector('small').textContent = Math.floor(pct(s.owned, s.total)) + '%'; });
  document.querySelectorAll('[data-act="var"]').forEach(b => { const s = edStats(col, ed, b.dataset.id); b.querySelector('small').textContent = s.owned + '/' + s.total; });
}
export function tradeText(col, ed, kind) {
  const lines = [];
  for (const v of col.variants) {
    const items = itemsOf(ed);
    const sel = items.filter(it => { if (!inScope(ed, v.id, it.k)) return false; const c = cnt(ed, it.k, v.id); return kind === 'miss' ? c === 0 : c > 1; });
    if (!sel.length) continue;
    const head = col.variants.length > 1 ? v.name + ': ' : '';
    if (ed.mode === 'range') {
      lines.push(head + (kind === 'miss' ? ranges(sel.map(it => it.n)) : sel.map(it => { const c = cnt(ed, it.k, v.id); return it.n + (c > 2 ? ' (×' + (c - 1) + ')' : ''); }).join(', ')));
    } else {
      lines.push((head ? head + '\n' : '') + sel.map(it => { const c = cnt(ed, it.k, v.id); return '• ' + it.name + (it.sn ? ' [' + it.sn + ']' : '') + (kind === 'dup' && c > 2 ? ' ×' + (c - 1) : ''); }).join('\n'));
    }
  }
  if (!lines.length) return '';
  return col.name + ' – ' + ed.name + '\n' + (kind === 'miss' ? 'Missing:' : 'Available to trade:') + '\n' + lines.join('\n');
}
export function tradeHTML(col, ed) {
  const miss = tradeText(col, ed, 'miss'), dup = tradeText(col, ed, 'dup');
  const block = (id, title, txt, emptyMsg) => '<div class="box trade"><h3>' + title + (txt ? '<button class="btn small" type="button" data-act="copy" data-id="' + id + '">Copy</button>' : '') + '</h3>' +
    (txt ? '<textarea id="' + id + '" readonly>' + esc(txt) + '</textarea>' : '<p class="muted" style="margin:0">' + emptyMsg + '</p>') + '</div>';
  return '<div class="stack"><p class="hint" style="margin:0">List for the edition “' + esc(ed.name) + '”. Copy it and send it to your trading group.</p>' +
    block('tMiss', 'Missing', miss, 'Nothing missing in this edition. Well done!') +
    block('tDup', 'Duplicates to trade', dup, 'No duplicates in this edition.') + '</div>';
}
export function applyTap(col, ed, k, how) {
  const vid = curVar(col); const prev = cnt(ed, k, vid);
  let next = prev;
  if (how === 'toggle') next = prev ? 0 : 1; else if (how === 'plus') next = prev + 1; else next = Math.max(0, prev - 1);
  if (next === prev) return;
  setCnt(ed, k, vid, next); lastTap.v = { colId: col.id, edId: ed.id, k, vid, prev };
  touch(col); refreshCol(k, next > prev ? 'just' : next === 0 ? 'drop' : 'less');
  if (prev > 1 && next === 0) toast('Removed (you had ' + prev + ')', true);
}

registerView('col', viewCol, 1);
onAct({
  ed: ({ id }) => { S.edId = id; S.q = ''; render(); },
  var: ({ id }) => { S.varId = id; render(); },
  tab: ({ id }) => { S.tab = id; render(); },
  filter: ({ id }) => { S.filter = id; render(); },
  mode: ({ id }) => { S.mode = id; render(); },
  tap: ({ b, col }) => applyTap(col, curEd(col), b.dataset.k, S.mode),
  inc: ({ b, col }) => applyTap(col, curEd(col), b.dataset.k, 'plus'),
  dec: ({ b, col }) => applyTap(col, curEd(col), b.dataset.k, 'minus'),
  lview: ({ id, col }) => { const ed = curEd(col); ed.view = id; touch(col); render(); },
  copy: ({ id }) => {
    const ta = document.getElementById(id); const t = ta.value;
    const fallback = () => { ta.focus(); ta.select(); toast('Text selected — copy it manually'); };
    try { navigator.clipboard.writeText(t).then(() => toast('Copied'), fallback); } catch (err) { fallback(); }
  },
});
onInput(e => { if (e.target.id === 'q') { S.q = e.target.value; const col = curCol(); $('#items').innerHTML = itemsHTML(col, curEd(col), curVar(col)); return true; } });
