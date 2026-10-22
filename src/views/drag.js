// Press, hold and drag a collection card to change the order.
import { S } from '../core/state.js';
import { touch } from '../data/store.js';
import { canDrag } from './home.js';

export let press = null, drag = null, suppressOpen = false;
// A tap that ends a drag must not open the collection.
export function consumeSuppressOpen() { if (suppressOpen) { suppressOpen = false; return true; } return false; }
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('.card');
  if (!card || S.view !== 'home' || e.button > 0 || drag || !canDrag()) return;
  clearPress();
  press = { card, x: e.clientX, y: e.clientY, t: setTimeout(() => startDrag(e.clientY), 380) };
});
export function clearPress() { if (press) { clearTimeout(press.t); press = null; } }
export function startDrag(y) {
  const card = press.card; press = null;
  const r = card.getBoundingClientRect();
  drag = { card, list: card.parentElement, grab: y - r.top, y };
  card.classList.add('dragging'); drag.list.classList.add('sorting');
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
  place(); drag.raf = requestAnimationFrame(autoScroll);
}
export function place() {
  const { card, list, y } = drag;
  let before = null;
  for (const s of list.children) { if (s === card) continue; const r = s.getBoundingClientRect(); if (y < r.top + r.height / 2) { before = s; break; } }
  if (card.nextElementSibling !== before) list.insertBefore(card, before);
  card.style.transform = '';
  const nat = card.getBoundingClientRect().top;
  card.style.transform = 'translateY(' + (y - drag.grab - nat) + 'px)';
}
export function autoScroll() {
  if (!drag) return;
  const top = 100, bottom = innerHeight - 70;
  if (drag.y < top) { scrollBy(0, -Math.ceil((top - drag.y) / 6)); place(); }
  else if (drag.y > bottom) { scrollBy(0, Math.ceil((drag.y - bottom) / 6)); place(); }
  drag.raf = requestAnimationFrame(autoScroll);
}
export function endDrag() {
  const { card, list } = drag; cancelAnimationFrame(drag.raf); drag = null;
  card.classList.remove('dragging'); card.style.transform = ''; list.classList.remove('sorting');
  suppressOpen = true; setTimeout(() => { suppressOpen = false; }, 400);
  const ids = [...list.children].map(c => c.dataset.id);
  S.cols.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  S.cols.forEach((c, i) => { if (c.order !== i) { c.order = i; if (!c.example) touch(c); } });
}
document.addEventListener('pointermove', e => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) clearPress();
  if (drag) { drag.y = e.clientY; place(); e.preventDefault(); }
});
document.addEventListener('pointerup', () => { clearPress(); if (drag) endDrag(); });
document.addEventListener('pointercancel', () => { clearPress(); if (drag) endDrag(); });
document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('.card')) e.preventDefault(); });
