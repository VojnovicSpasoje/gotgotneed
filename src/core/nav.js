// Screens and the phone's back button. Each screen registers itself with registerView.
import { onAct } from './events.js';
import { S } from './state.js';
import { $ } from './util.js';
import { curCol } from '../data/select.js';

export const views = {};
export const DEPTH = { home: 0, col: 1, new: 1, edit: 2, settings: 1, feedback: 1 };
export function registerView(name, fn, depth) { views[name] = fn; DEPTH[name] = depth; }
export function render() { $('#app').innerHTML = (views[S.view] || views.home)(); }
export const stateOf = v => ({ kol: 1, v, colId: S.colId, d: DEPTH[v] });
export function show(v) { S.view = v; render(); scrollTo(0, 0); }
export function go(v) { try { history.pushState(stateOf(v), ''); } catch (e) {} show(v); }
export function swap(v) { try { history.replaceState(stateOf(v), ''); } catch (e) {} show(v); }
export function navBack(v, n = 1) {
  let st = null; try { st = history.state; } catch (e) {}
  if (st && st.kol && st.d - n === DEPTH[v]) history.go(-n); else swap(v);
}
window.addEventListener('popstate', e => {
  const st = e.state; S.confirm = null;
  if (st && st.kol) { if (st.colId) S.colId = st.colId; show((st.v === 'col' || st.v === 'edit') && !curCol() ? 'home' : st.v); }
  else show('home');
});

onAct({
  home: () => { S.confirm = null; navBack('home'); },
  back: () => { S.confirm = null; navBack('col'); },
});
