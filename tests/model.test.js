// Tests for the collection model. Run: npm test  (or: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  itemsOf, cnt, setCnt, inScope, edStats, colStats, bonusStats, parseNums, scopeFrom, scopeText,
  ranges, parseLines, dupNames, purgeEd,
} from '../src/data/model.js';

const rangeEd = (from, to, extra = {}) => ({ id: 'e1', name: 'Main', mode: 'range', from, to, items: [], have: {}, ...extra });
const listEd = (names, extra = {}) => ({ id: 'e2', name: 'List', mode: 'list', from: 1, to: 1, have: {}, items: names.map((n, i) => ({ k: 'k' + i, name: n, sn: '' })), ...extra });
const col = (editions, variants = [{ id: 'v1', name: 'Regular' }]) => ({ id: 'c1', name: 'C', variants, editions });

test('numbers edition lists every number in its range', () => {
  assert.deepEqual(itemsOf(rangeEd(3, 6)).map(i => i.k), ['3', '4', '5', '6']);
});

test('counting: marking, duplicates and removing', () => {
  const ed = rangeEd(1, 10);
  setCnt(ed, '4', 'v1', 1); setCnt(ed, '4', 'v1', 3); setCnt(ed, '5', 'v1', 1);
  assert.equal(cnt(ed, '4', 'v1'), 3);
  assert.deepEqual(edStats(col([ed]), ed), { owned: 2, total: 10, dups: 2 });
  setCnt(ed, '4', 'v1', 0);
  assert.equal(cnt(ed, '4', 'v1'), 0);
  assert.equal('4|v1' in ed.have, false, 'zero count is not stored');
});

test('variant that only exists for some items, and bonus variants', () => {
  const ed = rangeEd(1, 20, { vscope: { gold: ['1', '2', '3'] } });
  const c = col([ed], [{ id: 'v1', name: 'Regular' }, { id: 'gold', name: 'Gold', bonus: true }]);
  setCnt(ed, '1', 'gold', 1); setCnt(ed, '7', 'gold', 1); // 7 is not a gold item
  assert.equal(inScope(ed, 'gold', '7'), false);
  assert.deepEqual(edStats(c, ed, 'gold'), { owned: 1, total: 3, dups: 0 });
  assert.equal(colStats(c).total, 20, 'bonus variant does not count toward 100%');
  assert.deepEqual(bonusStats(c), { owned: 1, total: 3 });
});

test('number lists: spaces, ranges, out-of-range', () => {
  const ed = rangeEd(1, 50);
  assert.deepEqual(parseNums('1-3 10, 12 - 13', ed), { keys: ['1', '2', '3', '10', '12', '13'], bad: [] });
  assert.deepEqual(parseNums('49-52 x', ed).bad, ['49–52', 'x']); // dashes are normalized
  assert.ok(scopeFrom(ed, '60').err);
  assert.equal(scopeText({ vscope: { g: ['5', '1', '2', '3', '9'] } }, 'g'), '1-3 5 9');
  assert.equal(ranges([1, 2, 3, 5, 7, 8]), '1–3, 5, 7, 8');
});

test('name lists keep item identity when edited, and spot duplicates', () => {
  const ed = listEd(['Messi', 'Mascot']);
  const again = parseLines('Mascot\nTrophy\nMessi', ed.items);
  assert.equal(again.find(i => i.name === 'Messi').k, 'k0', 'same item keeps its key');
  assert.deepEqual(dupNames(parseLines('Pikachu\npikachu  \nMew')), ['pikachu']);
});

test('removing items also removes their marks (nothing kept in the background)', () => {
  const ed = listEd(['A', 'B', 'C'], { vscope: { g: ['k0', 'k2'] } });
  setCnt(ed, 'k0', 'v1', 2); setCnt(ed, 'k2', 'v1', 1);
  ed.items = ed.items.filter(i => i.k !== 'k2');
  purgeEd(ed);
  assert.deepEqual(Object.keys(ed.have), ['k0|v1']);
  assert.deepEqual(ed.vscope.g, ['k0']);
});
