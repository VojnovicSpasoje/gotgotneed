// Sharing an edition for a trade: pack what someone has into a short link (or QR code),
// unpack it on the friend's phone and work out who can give what. No server: everything is in the link.
import { cnt, inScope, itemsOf } from './model.js';

export const SITE = 'https://vojnovicspasoje.github.io/gotgotneed/';
export const SHARE_VERSION = 'GGN1';
// Item state for one variant: not in this variant / missing / have / have spares.
export const NA = 0, MISS = 1, HAVE = 2, SPARE = 3;

const clean = s => String(s || '').replace(/[\t\n\r]+/g, ' ').trim();
const stateOf = (ed, k, vid) => { if (!inScope(ed, vid, k)) return NA; const c = cnt(ed, k, vid); return c === 0 ? MISS : c === 1 ? HAVE : SPARE; };

/** Plain-text form of one edition (compressed later). */
export function packEdition(col, ed) {
  const vs = col.variants;
  const head = [SHARE_VERSION, clean(col.name), clean(ed.name), ed.mode === 'range' ? 'r ' + ed.from + ' ' + ed.to : 'l', vs.map(v => clean(v.name)).join('\t')];
  const items = itemsOf(ed);
  const body = ed.mode === 'range'
    ? vs.map(v => items.map(it => stateOf(ed, it.k, v.id)).join(''))
    : items.map(it => clean(it.name) + '\t' + clean(it.sn) + '\t' + vs.map(v => stateOf(ed, it.k, v.id)).join(''));
  return head.concat(body).join('\n');
}

/** Read a packed edition back. Returns null if the text is not a GotGotNeed share. */
export function unpackEdition(text) {
  const L = String(text).split('\n');
  if (L[0] !== SHARE_VERSION || L.length < 5) return null;
  const [, name, edName, modeLine, vline] = L, variants = vline.split('\t');
  const st = s => [...s].map(Number);
  if (modeLine.startsWith('r ')) {
    const [, a, b] = modeLine.split(' '), from = +a, to = +b;
    if (!(to >= from)) return null;
    const rows = L.slice(5, 5 + variants.length).map(st), items = [];
    for (let n = from; n <= to; n++) items.push({ key: String(n), name: String(n), sn: '', n, st: rows.map(r => r[n - from] || NA) });
    return { name, edName, mode: 'range', from, to, variants, items };
  }
  if (modeLine !== 'l') return null;
  const items = L.slice(5).filter(Boolean).map(line => { const [nm, sn, s] = line.split('\t'); return { key: matchKey(nm), name: nm, sn: sn || '', st: st(s || '') }; });
  return { name, edName, mode: 'list', variants, items };
}

/** Names are matched ignoring case, extra spaces and accents (Modrić = modric). */
export const matchKey = n => String(n).toLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const myKey = (ed, it) => ed.mode === 'range' ? it.k : matchKey(it.name);

/** How well one of my editions fits a shared one (0 = not at all). */
export function matchScore(ed, fr) {
  if (ed.mode !== fr.mode) return 0;
  const mine = new Set(itemsOf(ed).map(it => myKey(ed, it)));
  return fr.items.reduce((s, it) => s + (mine.has(it.key) ? 1 : 0), 0);
}
/** My editions that could be compared, best first. */
export function candidates(cols, fr) {
  const out = [];
  for (const col of cols) if (!col.example) for (const ed of col.editions) { const s = matchScore(ed, fr); if (s > 0) out.push({ col, ed, score: s + (matchKey(col.name) === matchKey(fr.name) ? 0.5 : 0) }); }
  return out.sort((a, b) => b.score - a.score);
}

/** Pair the friend's variants with mine: same name, otherwise the first with the first. */
export function pairVariants(col, fr) {
  const norm = s => matchKey(s);
  return fr.variants.map((name, i) => {
    const v = col.variants.find(x => norm(x.name) === norm(name)) || (i === 0 ? col.variants[0] : null);
    return { fi: i, name, vid: v ? v.id : null, myName: v ? v.name : '' };
  });
}

/** What I can get from the friend (their spares I miss) and give them (my spares they miss). */
export function compareEdition(col, ed, fr) {
  const byKey = new Map(itemsOf(ed).map(it => [myKey(ed, it), it]));
  return pairVariants(col, fr).map(p => {
    const get = [], give = [];
    if (p.vid) for (const f of fr.items) {
      const it = byKey.get(f.key); if (!it || !inScope(ed, p.vid, it.k)) continue;
      const s = f.st[p.fi] || NA, c = cnt(ed, it.k, p.vid);
      if (s === SPARE && c === 0) get.push(it);
      else if (s === MISS && c >= 2) give.push(it);
    }
    return { ...p, get, give };
  });
}

// ── Compression + URL-safe text ──────────────────────────────────────────
const b64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function pipe(bytes, stream) { const r = new Blob([bytes]).stream().pipeThrough(stream); return new Uint8Array(await new Response(r).arrayBuffer()); }
/** Text → short code: "z" + deflate (when the browser supports it), else "p" + plain. */
export async function encodeShare(text) {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream !== 'undefined') { try { return 'z' + b64(await pipe(raw, new CompressionStream('deflate-raw'))); } catch (e) {} }
  return 'p' + b64(raw);
}
export async function decodeShare(code) {
  try {
    const kind = code[0], bytes = unb64(code.slice(1));
    if (kind === 'p') return new TextDecoder().decode(bytes);
    if (kind === 'z' && typeof DecompressionStream !== 'undefined') return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  } catch (e) {}
  return null;
}
