// What the user is looking at right now.
import { S } from '../core/state.js';
import { edStats } from './model.js';

export const curCol = () => S.cols.find(c => c.id === S.colId);
export function curEd(col) { return col.editions.find(e => e.id === S.edId) || col.editions[0]; }
export function curVar(col) {
  const ed = curEd(col); const vs = col.variants.filter(v => edStats(col, ed, v.id).total > 0); const list = vs.length ? vs : col.variants;
  return (list.find(v => v.id === S.varId) || list[0]).id;
}
