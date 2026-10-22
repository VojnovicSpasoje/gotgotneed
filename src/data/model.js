// The collection model: editions, variants, counts, scopes. Pure functions (no DOM), covered by tests.
import { MAX_ITEMS } from '../core/state.js';
import { $, pct, uid } from '../core/util.js';

export function itemsOf(ed) {
  if (ed.mode === 'range') { const a = []; for (let n = ed.from; n <= ed.to; n++) a.push({ k: String(n), name: String(n), n }); return a; }
  return ed.items.map(i => ({ k: i.k, name: i.name, sn: i.sn }));
}
export const keyOf = (k, v) => k + '|' + v;
export const cnt = (ed, k, v) => ed.have[keyOf(k, v)] || 0;
export function setCnt(ed, k, v, n) { const key = keyOf(k, v); if (n <= 0) delete ed.have[key]; else ed.have[key] = n; }
export function inScope(ed, vid, k) { const sc = ed.vscope && ed.vscope[vid]; return !sc || sc.includes(k); }
export function edStats(col, ed, vid) {
  const vs = vid ? [vid] : col.variants.filter(v => !v.bonus).map(v => v.id);
  const items = itemsOf(ed); let owned = 0, dups = 0, total = 0;
  for (const it of items) for (const v of vs) { if (!inScope(ed, v, it.k)) continue; total++; const c = cnt(ed, it.k, v); if (c > 0) owned++; if (c > 1) dups += c - 1; }
  return { owned, total, dups };
}
export function bonusStats(col) {
  let owned = 0, total = 0;
  for (const ed of col.editions) for (const v of col.variants) if (v.bonus) { const st = edStats(col, ed, v.id); owned += st.owned; total += st.total; }
  return { owned, total };
}
export function parseNums(text, ed) {
  const out = new Set(), bad = [];
  for (const part of text.replace(/\s*[-–—]\s*/g, '–').split(/[,;\s]+/)) {
    if (!part) continue;
    const m = part.match(/^(\d+)(?:–(\d+))?$/); if (!m) { bad.push(part); continue; }
    let a = +m[1], b = m[2] ? +m[2] : a; if (b < a) [a, b] = [b, a];
    if (a < ed.from || b > ed.to) bad.push(part);
    for (let n = Math.max(a, ed.from); n <= Math.min(b, ed.to); n++) out.add(String(n));
  }
  return { keys: [...out].sort((x, y) => x - y), bad };
}
export function scopeFrom(ed, text) {
  if (ed.mode === 'range') {
    const { keys, bad } = parseNums(text, ed);
    if (bad.length) return { err: 'not valid or outside ' + ed.from + '–' + ed.to + ': ' + bad.join(', ') };
    if (!keys.length) return { err: 'no numbers given' };
    return { keys };
  }
  const want = text.split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean), keys = [], miss = [];
  for (const w of want) {
    const hits = ed.items.filter(i => i.name.toLowerCase() === w || (i.sn && i.sn.toLowerCase() === w) || (i.name + ' ' + (i.sn || '')).trim().toLowerCase() === w);
    if (!hits.length) miss.push(w);
    hits.forEach(x => { if (!keys.includes(x.k)) keys.push(x.k); });
  }
  if (miss.length) return { err: 'not found in the item list: ' + miss.join(', ') };
  return { keys };
}
export function scopeText(ed, vid) {
  const sc = ed.vscope && ed.vscope[vid]; if (!sc) return '';
  const n = sc.map(Number).sort((a, b) => a - b), out = []; let i = 0;
  while (i < n.length) { let j = i; while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++; out.push(j > i ? n[i] + '-' + n[j] : String(n[i])); i = j + 1; }
  return out.join(' ');
}
export const lineLabel = it => it.sn ? it.name + ' ; ' + it.sn : it.name;
export function colStats(col) {
  let owned = 0, total = 0, dups = 0;
  for (const ed of col.editions) { const s = edStats(col, ed); owned += s.owned; total += s.total; dups += s.dups; }
  return { owned, total, dups, p: pct(owned, total) };
}
export function ranges(nums) {
  const out = []; let i = 0;
  while (i < nums.length) { let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j - i >= 2 ? nums[i] + '–' + nums[j] : (j > i ? nums[i] + ', ' + nums[j] : String(nums[i]))); i = j + 1; }
  return out.join(', ');
}
export function parseLines(text, existing = []) {
  const byLabel = new Map(existing.map(i => [(i.name + '|' + (i.sn || '')).toLowerCase(), i.k]));
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const ix = line.indexOf(';');
    const name = (ix >= 0 ? line.slice(0, ix) : line).trim();
    const sn = ix >= 0 ? line.slice(ix + 1).trim() : '';
    if (!name) continue;
    const k = byLabel.get((name + '|' + sn).toLowerCase()) || uid();
    out.push({ k, name, sn });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}
export const normName = n => n.trim().replace(/\s+/g, ' ').toLowerCase();
export function dupNames(items) {
  const seen = new Set(), d = [];
  for (const it of items) { const n = normName(it.name); if (seen.has(n)) { if (!d.includes(it.name)) d.push(it.name); } else seen.add(n); }
  return d;
}
export const dupMsg = d => 'Item names must be unique. Repeated: ' + d.join(', ') + '. For different versions of the same item, use variants.';
export const linesOf = ed => ed.items.map(i => i.sn ? i.name + ' ; ' + i.sn : i.name).join('\n');
export function purgeEd(ed) {
  const keys = new Set(itemsOf(ed).map(i => i.k));
  for (const key of Object.keys(ed.have)) if (!keys.has(key.slice(0, key.lastIndexOf('|')))) delete ed.have[key];
  if (ed.vscope) for (const v of Object.keys(ed.vscope)) ed.vscope[v] = ed.vscope[v].filter(k => keys.has(k));
}
