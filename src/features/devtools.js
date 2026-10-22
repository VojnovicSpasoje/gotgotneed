// TEMPORARY testing helper: "+ Test" next to "+ New" creates two ready-made test collections
// (one by numbers, one by names). Remove this file and its import in main.js before release.
import { onAct } from '../core/events.js';
import { onRender, render } from '../core/nav.js';
import { S } from '../core/state.js';
import { uid } from '../core/util.js';
import { setCnt } from '../data/model.js';
import { touch } from '../data/store.js';
import { toast } from '../ui/toast.js';

onRender(() => {
  if (S.view !== 'home' || document.querySelector('[data-act="devtest"]')) return;
  const newBtn = document.querySelector('.top [data-act="new"]');
  if (newBtn) newBtn.insertAdjacentHTML('beforebegin', '<button class="btn small ghost" type="button" data-act="devtest" title="Testing only">+ Test</button>');
});

function testCollections() {
  // Dated 20 days back so the backup reminder shows up right away.
  const n = S.cols.filter(c => c.cat === 'Test').length / 2 + 1, now = Date.now() - 20 * 864e5, order = S.cols.filter(c => !c.example).length;
  // By numbers: 1–50, Regular + Shiny (Shiny exists only for 1–10), some marked, a few duplicates.
  const reg = uid(), shiny = uid();
  const nums = { id: uid(), name: 'Test numbers ' + n, cat: 'Test', created: now, updated: now, order,
    variants: [{ id: reg, name: 'Regular' }, { id: shiny, name: 'Shiny' }],
    editions: [{ id: uid(), name: 'Main', mode: 'range', from: 1, to: 50, items: [], have: {}, vscope: { [shiny]: Array.from({ length: 10 }, (_, i) => String(i + 1)) } }] };
  const e1 = nums.editions[0];
  [1, 2, 3, 5, 8, 13, 21, 34].forEach(k => setCnt(e1, String(k), reg, 1));
  setCnt(e1, '3', reg, 3); setCnt(e1, '8', reg, 2); setCnt(e1, '2', shiny, 1);
  // By names: 40 names (long enough to show the search box), two with a serial number, a few marked.
  const v = uid();
  const names = ['Messi', 'Ronaldo', 'Mbappé', 'Haaland', 'Modrić', 'Vlahović', 'Mitrović', 'Tadić', 'Pedri', 'Bellingham', 'Saka', 'Yamal',
    'Kane', 'Salah', 'De Bruyne', 'Lewandowski', 'Kimmich', 'Musiala', 'Wirtz', 'Rodri', 'Gavi', 'Vinícius', 'Rodrygo', 'Valverde',
    'Griezmann', 'Dembélé', 'Kvaratskhelia', 'Osimhen', 'Lautaro', 'Álvarez', 'Foden', 'Rice', 'Ødegaard', 'Son', 'Neymar', 'Živković',
    'Škriniar', 'Čolak', 'Đorđević', 'Milinković-Savić'];
  const list = { id: uid(), name: 'Test names ' + n, cat: 'Test', created: now + 1, updated: now + 1, order: order + 1,
    variants: [{ id: v, name: 'Standard' }],
    editions: [{ id: uid(), name: 'Players', mode: 'list', from: 1, to: 1, have: {},
      items: names.map((name, i) => ({ k: uid(), name, sn: i === 0 ? 'No. 10' : i === 1 ? 'No. 7' : '' })) }] };
  const e2 = list.editions[0];
  [0, 2, 4, 7].forEach(i => setCnt(e2, e2.items[i].k, v, 1));
  setCnt(e2, e2.items[0].k, v, 2);
  return [nums, list];
}

onAct({
  devtest: () => {
    const made = testCollections();
    S.cols = S.cols.filter(c => !c.example);
    for (const c of made) { S.cols.push(c); touch(c); }
    render(); toast('Added 2 test collections');
  },
});
