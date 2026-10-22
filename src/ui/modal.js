// Pop-up window used for confirmations and sheets (like Add many).
import { onAct } from '../core/events.js';
import { $, esc } from '../core/util.js';

export const M = { act: null, focus: null };
export const closeHooks = [];
export const onModalClose = fn => closeHooks.push(fn);
export function openModal(title, text, okLabel, act, id) {
  M.act = { act, id }; M.focus = document.activeElement;
  const m = $('#modal');
  m.innerHTML = '<div class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="mTitle" aria-describedby="mText">' +
    '<h3 id="mTitle">' + esc(title) + '</h3><p id="mText">' + esc(text) + '</p>' +
    '<div class="modal-actions"><button class="btn ghost" type="button" data-act="mcancel">Cancel</button><button class="btn danger" type="button" data-act="mok">' + esc(okLabel) + '</button></div></div>';
  m.hidden = false; m.querySelector('[data-act="mcancel"]').focus();
}
export function closeModal() {
  const m = $('#modal'); m.hidden = true; m.innerHTML = ''; M.act = null;
  for (const f of closeHooks) f();
  try { M.focus && M.focus.focus(); } catch (e) {}
}
export function runAct(act, id) { const f = document.createElement('button'); f.type = 'button'; f.hidden = true; f.dataset.act = act; if (id) f.dataset.id = id; document.body.appendChild(f); f.click(); f.remove(); }
export function askDelete(col, id) {
  if (id === 'col') return openModal('Delete collection?', '“' + col.name + '” and everything you marked in it will be deleted.', 'Delete', 'delcol');
  if (id.startsWith('e:')) { const e = col.editions.find(x => x.id === id.slice(2)); return openModal('Delete edition?', '“' + e.name + '” and everything you marked in it will be deleted.', 'Delete', 'deled', e.id); }
  if (id.startsWith('v:')) { const v = col.variants.find(x => x.id === id.slice(2)); return openModal('Delete variant?', 'Everything marked as “' + v.name + '” will be removed from all editions.', 'Delete', 'delvar', v.id); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
document.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

onAct({
  ask: ({ col, id }) => askDelete(col, id),
  mok: () => { const m = M.act; closeModal(); if (m) runAct(m.act, m.id); },
  mcancel: () => closeModal(),
});
