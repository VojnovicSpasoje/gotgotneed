// Short messages at the bottom of the screen, optionally with Undo.
import { onAct } from '../core/events.js';
import { S } from '../core/state.js';
import { $, esc } from '../core/util.js';
import { setCnt } from '../data/model.js';
import { touch } from '../data/store.js';
import { refreshCol } from '../views/collection.js';

export let toastTimer = null;
// Last single tap that removed several copies (Undo for that).
export const lastTap = { v: null };
export let undoFn = null;
export function toast(msg, withUndo) {
  const t = $('#toast'), isFn = typeof withUndo === 'function';
  undoFn = isFn ? withUndo : null;
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (withUndo ? '<button type="button" data-act="' + (isFn ? 'undofn' : 'undo') + '">Undo</button>' : '');
  t.hidden = false; clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; undoFn = null; }, isFn ? 8000 : withUndo ? 4500 : Math.max(2200, msg.length * 55));
}

onAct({
  undo: () => {
    const u = lastTap.v; if (!u) return;
    const c = S.cols.find(x => x.id === u.colId); const ed = c && c.editions.find(x => x.id === u.edId);
    if (ed) { setCnt(ed, u.k, u.vid, u.prev); touch(c); if (S.view === 'col' && S.colId === c.id && S.tab === 'album') refreshCol(); }
    lastTap.v = null; $('#toast').hidden = true;
  },
  undofn: () => { const f = undoFn; undoFn = null; $('#toast').hidden = true; if (f) f(); },
});
