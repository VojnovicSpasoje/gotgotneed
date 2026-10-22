// Home screen: all collections, search, categories and sorting.
import { onAct, onChange, onInput } from '../core/events.js';
import { go, registerView, render } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, ICON, esc, fmtPct, pct } from '../core/util.js';
import { colStats } from '../data/model.js';
import { syncHTML } from '../data/store.js';
import { consumeSuppressOpen } from './drag.js';

export const SORTS = [['mine', 'My order'], ['az', 'Name A–Z'], ['za', 'Name Z–A'], ['most', 'Most complete'], ['least', 'Least complete']];
export const canDrag = () => S.homeSort === 'mine' && !S.homeQ.trim() && S.homeCat === 'all';
export function homeList() {
  const q = S.homeQ.trim().toLowerCase();
  let list = S.cols.filter(c => (S.homeCat === 'all' || (c.cat || '').trim() === S.homeCat) && (!q || c.name.toLowerCase().includes(q) || (c.cat || '').toLowerCase().includes(q)));
  const by = { az: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }), za: (a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' }),
    most: (a, b) => colStats(b).p - colStats(a).p, least: (a, b) => colStats(a).p - colStats(b).p }[S.homeSort];
  if (by) list = list.slice().sort(by);
  return list;
}
export function cardsHTML() {
  const list = homeList();
  if (!list.length) return '<div class="empty">No collections match. <button class="linkbtn" type="button" data-act="hclear">Clear search</button></div>';
  return '<div class="cards">' + list.map(c => { const s = colStats(c);
    return '<button class="card" type="button" data-act="open" data-id="' + c.id + '"><div class="row1"><div class="stack" style="gap:4px;min-width:0"><h2>' + esc(c.name) + '</h2><div class="meta">' +
      (c.example ? '<span class="tag">Example</span>' : '') + (c.cat ? '<span>' + esc(c.cat) + '</span>' : '') +
      '<span>' + c.editions.length + (c.editions.length === 1 ? ' edition' : ' editions') + '</span>' +
      (c.variants.length > 1 ? '<span>' + c.variants.length + ' variants</span>' : '') + '</div></div><span class="pct">' + fmtPct(s.p) + '</span></div>' +
      '<div class="bar"><span style="width:' + s.p + '%"></span></div>' +
      '<div class="meta"><span><span class="num">' + s.owned + ' / ' + s.total + '</span> collected</span><span>missing <span class="num">' + (s.total - s.owned) + '</span></span>' + (s.dups ? '<span style="color:var(--dup)">duplicates <span class="num">' + s.dups + '</span></span>' : '') + '</div></button>';
  }).join('') + '</div>' +
    (S.cols.length > 1 ? '<p class="hint" style="margin:8px 0 0">' + (canDrag() ? 'Press and hold a collection, then drag it to change the order.' : 'To rearrange by hand, choose “My order” and clear the search and category.') + '</p>' : '');
}
export function saveHomePrefs() { try { localStorage.setItem('kolekcionar.home', JSON.stringify({ sort: S.homeSort })); } catch (e) {} }
export function viewHome() {
  const cols = S.cols;
  const tot = cols.reduce((a, c) => { const s = colStats(c); a.o += s.owned; a.t += s.total; a.d += s.dups; return a; }, { o: 0, t: 0, d: 0 });
  const hasEx = cols.some(c => c.example);
  let h = '<header class="top"><h1 class="brand"><span class="logo"><svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#F4EEDF"/><g transform="translate(256 256) scale(1.06) translate(-256 -256)">  <g transform="rotate(-9 117 254)"><rect x="47" y="168" width="140" height="176" rx="20" fill="#0E5A44" transform="translate(0 7)" opacity=".35"/><rect x="47" y="168" width="140" height="176" rx="20" fill="#13785A"/><path d="M85 256 l22 22 l42 -46" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></g>  <g><rect x="186" y="156" width="140" height="176" rx="20" fill="#0E5A44" transform="translate(0 7)" opacity=".35"/><rect x="186" y="156" width="140" height="176" rx="20" fill="#13785A"/><path d="M224 244 l22 22 l42 -46" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></g>  <g transform="rotate(9 395 254)"><rect x="328" y="171" width="134" height="170" rx="18" fill="#FBF8EF" stroke="#141D2E" stroke-opacity=".5" stroke-width="7" stroke-dasharray="20 13"/><text x="395" y="290" text-anchor="middle" font-size="96" font-weight="900" fill="#141D2E" fill-opacity=".55" font-family="system-ui,sans-serif">?</text></g></g></svg></span>GotGot<span class="need">Need</span></h1><button class="iconbtn" type="button" data-act="skins" aria-label="Themes">' + ICON.palette + '</button><button class="btn small" type="button" data-act="new" aria-label="New collection">+ New</button></header>';
  if (cols.length) {
    h += '<div class="summary"><span><b>' + fmtPct(pct(tot.o, tot.t)) + '</b></span><span class="muted"><span class="num">' + tot.o + '</span> of <span class="num">' + tot.t + '</span> collected · <span class="num">' + tot.d + '</span> duplicates</span>' + syncHTML() + '</div>';
    if (hasEx) h += '<div class="example-note">These are <strong>examples</strong> to show how it works. They disappear once you create your own collection. Edit an example and it becomes yours and is saved.</div>';
    const cats = [...new Set(cols.map(c => (c.cat || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (!cats.some(c => c.toLowerCase() === S.homeCat.toLowerCase())) S.homeCat = 'all';
    if (cols.length > 1) {
      h += '<div class="hometools"><input class="search" id="hq" type="search" placeholder="Search collections…" value="' + esc(S.homeQ) + '" autocomplete="off">' +
        '<select id="hsort" class="sortsel" aria-label="Sort collections">' + SORTS.map(([k, l]) => '<option value="' + k + '"' + (S.homeSort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
      if (cats.length > 1) h += '<div class="chips" role="group" aria-label="Categories">' + ['all', ...cats].map(c => '<button class="chip" type="button" data-act="hcat" data-id="' + esc(c) + '" aria-pressed="' + (S.homeCat === c) + '">' + (c === 'all' ? 'All' : esc(c)) + '</button>').join('') + '</div>';
    }
    h += '<div id="cards">' + cardsHTML() + '</div>';
  } else {
    h += '<div class="empty"><h2 style="font-size:20px;color:var(--ink);margin-bottom:6px">No collections yet</h2><p style="margin:0">Add a sticker album, coins, cards or anything else you collect.</p><button class="btn" type="button" data-act="new" style="margin-top:14px">+ New collection</button></div><div style="margin-top:10px">' + syncHTML() + '</div>';
  }
  h += '<details class="panel"><summary>Backup <span class="muted">▾</span></summary><div class="stack" style="margin-top:12px">' +
    '<p class="hint" style="margin:0">Save all collections to a file and restore them later, on another phone or in a future version of the app.</p>' +
    '<div class="rowwrap"><button class="btn small ghost" type="button" data-act="export">Export (.json)</button>' +
    '<label class="btn small ghost" for="importFile">Import from file</label><input id="importFile" type="file" accept=".json,application/json" hidden></div>' +
    '<div id="exportOut"></div></div></details>' +
    '<p class="hint" style="margin:22px 0 0;text-align:center"><button class="linkbtn" type="button" data-act="fb">Send feedback</button> &nbsp;·&nbsp; <a href="https://vojnovicspasoje.github.io/gotgotneed/privacy.html" target="_blank" rel="noopener" style="color:var(--muted)">Privacy policy</a></p>';
  return h;
}

registerView('home', viewHome, 0);
onAct({
  open: ({ id }) => { if (consumeSuppressOpen()) return; S.colId = id; S.edId = null; S.varId = null; S.q = ''; S.letter = ''; S.filter = 'all'; S.tab = 'album'; go('col'); },
  new: () => { S.newMode = 'range'; go('new'); },
  hcat: ({ id }) => { S.homeCat = id; render(); },
  hclear: () => { S.homeQ = ''; S.homeCat = 'all'; render(); },
});
onInput(e => { if (e.target.id === 'hq') { S.homeQ = e.target.value; $('#cards').innerHTML = cardsHTML(); return true; } });
onChange(e => { const t = e.target; if (t.id === 'hsort') { S.homeSort = t.value; saveHomePrefs(); $('#cards').innerHTML = cardsHTML(); return true; } });
