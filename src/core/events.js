// One place that listens to the page and hands events to the feature that registered for them.
import { curCol } from '../data/select.js';

// Features call onAct / onInput / onChange / onSubmit when they load.
export const acts = {}, inputs = [], changes = [], forms = {};
export const onAct = map => Object.assign(acts, map);
export const onInput = fn => inputs.push(fn);
export const onChange = fn => changes.push(fn);
export const onSubmit = map => Object.assign(forms, map);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const f = acts[b.dataset.act]; if (f) f({ b, id: b.dataset.id, col: curCol(), e });
});
document.addEventListener('input', e => { for (const f of inputs) if (f(e)) return; });
document.addEventListener('change', e => { for (const f of changes) if (f(e)) return; });
document.addEventListener('submit', e => {
  const n = e.target.dataset.form; if (!n || !forms[n]) return;
  e.preventDefault(); forms[n]({ e, form: e.target, col: curCol() });
});
