// Example collections shown until the user creates their own.
import { uid } from '../core/util.js';
import { setCnt } from './model.js';

export function exampleCols() {
  const v1 = uid(), v2 = uid();
  const base = { id: uid(), name: 'Football Album 2026', cat: 'Stickers', example: true, created: 1, updated: 0,
    variants: [{ id: v1, name: 'Regular' }, { id: v2, name: 'Shiny' }],
    editions: [
      { id: uid(), name: 'Main album', mode: 'range', from: 1, to: 180, items: [], have: {} },
      { id: uid(), name: 'Extra series', mode: 'list', from: 1, to: 1, have: {},
        items: ['Trophy', 'Mascot', 'Official ball', 'Final stadium', 'Fans', 'Tournament crest', 'Poster', 'Golden boot'].map(n => ({ k: uid(), name: n, sn: '' })) }
    ] };
  const a = base.editions[0];
  a.vscope = { [v2]: Array.from({ length: 20 }, (_, i) => String(i + 1)) };
  base.editions[1].vscope = { [v2]: [] };
  for (let n = 1; n <= 180; n++) { const r = (n * 37) % 100; if (r < 62) setCnt(a, String(n), v1, r < 9 ? 2 + (r % 3) : 1); if (r < 14) setCnt(a, String(n), v2, 1); }
  base.editions[1].items.forEach((it, i) => { if (i % 3 !== 2) setCnt(base.editions[1], it.k, v1, i === 0 ? 2 : 1); });
  const cv = uid();
  const coins = { id: uid(), name: 'Dinar coins', cat: 'Coins', example: true, created: 2, updated: 0,
    variants: [{ id: cv, name: 'Standard' }],
    editions: [{ id: uid(), name: 'Series 2003–2012', mode: 'list', from: 1, to: 1, have: {},
      items: [['1 dinar 2003', ''], ['1 dinar 2005', ''], ['2 dinara 2006', ''], ['5 dinara 2005', ''], ['5 dinara 2009', ''], ['10 dinara 2006', ''], ['20 dinara 2006', 'commemorative'], ['20 dinara 2012', '']].map(([n, s]) => ({ k: uid(), name: n, sn: s })) }] };
  coins.editions[0].items.forEach((it, i) => { if ([0, 2, 3, 5, 7].includes(i)) setCnt(coins.editions[0], it.k, cv, i === 3 ? 3 : 1); });
  return [base, coins];
}
