// Tests for swapping with a friend: packing an edition into a link and comparing. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setCnt } from '../src/data/model.js';
import { packEdition, unpackEdition, encodeShare, decodeShare, candidates, compareEdition, matchKey, MISS, HAVE, SPARE, NA } from '../src/data/share.js';
import { qrEncode, qrByteCapacity } from '../src/lib/qr.js';

const rangeCol = (name, from, to, marks, variants = [{ id: 'v1', name: 'Regular' }], vscope) => {
  const ed = { id: 'e' + name, name: 'Main', mode: 'range', from, to, items: [], have: {}, vscope };
  for (const [k, n, v = 'v1'] of marks) setCnt(ed, String(k), v, n);
  return { id: 'c' + name, name, variants, editions: [ed] };
};
const listCol = (name, names, marks) => {
  const ed = { id: 'e' + name, name: 'Players', mode: 'list', from: 1, to: 1, have: {}, items: names.map((n, i) => ({ k: name + i, name: n, sn: '' })) };
  for (const [i, n] of marks) setCnt(ed, ed.items[i].k, 'v1', n);
  return { id: 'c' + name, name, variants: [{ id: 'v1', name: 'Standard' }], editions: [ed] };
};

test('a numbers edition survives packing, compressing and unpacking', async () => {
  const c = rangeCol('Fudbal 2026', 1, 20, [[3, 1], [4, 3], [7, 2]]);
  const back = unpackEdition(await decodeShare(await encodeShare(packEdition(c, c.editions[0]))));
  assert.equal(back.name, 'Fudbal 2026'); assert.equal(back.mode, 'range'); assert.equal(back.items.length, 20);
  assert.deepEqual([3, 4, 7, 8].map(n => back.items[n - 1].st[0]), [HAVE, SPARE, SPARE, MISS]);
});

test('different collection names still compare: matching is by content', () => {
  const mine = rangeCol('Fudbal 2026', 1, 670, [[5, 2], [9, 3], [10, 1]]);
  const friend = rangeCol('SP26', 1, 680, [[5, 0], [10, 3], [11, 2], [675, 2]]);
  const fr = unpackEdition(packEdition(friend, friend.editions[0]));
  const other = rangeCol('Coins', 1, 8, []);
  const c = candidates([other, mine], fr);
  assert.equal(c[0].col.name, 'Fudbal 2026');
  const [r] = compareEdition(mine, mine.editions[0], fr);
  assert.deepEqual(r.get.map(i => i.n), [11]);          // friend's spare 11 I miss (10 I already have, 675 not in my album)
  assert.deepEqual(r.give.map(i => i.n), [5, 9]);       // my spares the friend misses
});

test('names match ignoring case and accents', () => {
  assert.equal(matchKey('  Modrić '), matchKey('MODRIC'));
  assert.equal(matchKey('Đorđević'), matchKey('djordjevic'));
  const mine = listCol('Mine', ['Modrić', 'Messi', 'Yamal'], [[0, 2]]);
  const friend = listCol('His', ['messi', 'MODRIC', 'Pedri'], [[0, 2]]);
  const [r] = compareEdition(mine, mine.editions[0], unpackEdition(packEdition(friend, friend.editions[0])));
  assert.deepEqual(r.get.map(i => i.name), ['Messi']);
  assert.deepEqual(r.give.map(i => i.name), ['Modrić']);
});

test('variants pair by name; items outside a variant are not offered', () => {
  const vs = [{ id: 'v1', name: 'Regular' }, { id: 'v2', name: 'Shiny' }];
  const mine = rangeCol('A', 1, 10, [[2, 2, 'v2']], vs, { v2: ['1', '2', '3'] });
  const friend = rangeCol('B', 1, 10, [[1, 2, 'v2'], [9, 2, 'v2']], [{ id: 'x', name: 'Normal' }, { id: 'v2', name: 'shiny' }], { v2: ['1', '2', '9'] });
  const fr = unpackEdition(packEdition(friend, friend.editions[0]));
  assert.equal(fr.items[4].st[1], NA);
  const r = compareEdition(mine, mine.editions[0], fr);
  assert.equal(r[1].myName, 'Shiny');
  assert.deepEqual(r[1].get.map(i => i.n), [1]);       // 9 is not a Shiny in my album
  assert.deepEqual(r[1].give.map(i => i.n), [2]);
});

test('a 700-sticker album fits a small QR code; QR capacity grows with version', async () => {
  const marks = []; for (let n = 1; n <= 700; n += 3) marks.push([n, n % 2 ? 1 : 2]);
  const c = rangeCol('Album', 1, 700, marks);
  const url = 'https://vojnovicspasoje.github.io/gotgotneed/#t=' + await encodeShare(packEdition(c, c.editions[0]));
  const q = qrEncode(new TextEncoder().encode(url), 'L', 25);
  assert.ok(q && q.version <= 15, 'version ' + (q && q.version));
  assert.ok(qrByteCapacity(25, 'L') > qrByteCapacity(10, 'L'));
});
