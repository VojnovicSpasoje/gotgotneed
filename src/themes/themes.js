// The five themes: colors, fonts and the theme picker screen.
import { onAct } from '../core/events.js';
import { go, registerView, render } from '../core/nav.js';
import { G, S } from '../core/state.js';
import { ICON } from '../core/util.js';
import { toast } from '../ui/toast.js';

export const SKINS = {
  classic: { name: 'Classic', note: 'Clean and simple. Follows your phone’s light or dark mode.' },
  album: { name: 'Album', note: 'Paper pages. Items you have are circled in pencil.', scheme: 'light',
    t: { bg: '#F4EEDF', surface: '#FBF8EF', sunk: '#ECE4D0', ink: '#2B2A33', muted: '#6F6A5E', line: '#D9CFB8', accent: '#2F4A8A', 'accent-ink': '#FBF8EF', have: '#3F4555', 'have-ink': '#FBF8EF', dup: '#B23A2E', 'dup-soft': '#F6E2D6', danger: '#B23A2E',
      'f-display': '"Caveat", "Segoe Print", cursive', 'f-mono': '"Courier Prime", "Courier New", monospace' } },
  neon: { name: 'Neon', note: 'Dark, with items that light up like neon signs.', scheme: 'dark',
    t: { bg: '#0A0A12', surface: '#12121C', sunk: '#1C1C2B', ink: '#E8E8F5', muted: '#8E8EAD', line: '#26263A', accent: '#FF3EA5', 'accent-ink': '#0A0A12', have: '#38F2FF', 'have-ink': '#0A0A12', dup: '#FFD23F', 'dup-soft': '#2A2410', danger: '#FF6B81',
      'f-display': '"Tilt Neon", system-ui, sans-serif', 'f-mono': '"Tilt Neon", ui-monospace, monospace' } },
  pixel: { name: 'Pixel', note: 'Retro handheld game look.', scheme: 'light',
    t: { bg: '#9BBC0F', surface: '#8BAC0F', sunk: '#7A9A0C', ink: '#0F380F', muted: '#306230', line: '#306230', accent: '#0F380F', 'accent-ink': '#9BBC0F', have: '#0F380F', 'have-ink': '#9BBC0F', dup: '#0F380F', 'dup-soft': '#8BAC0F', danger: '#0F380F',
      'f-display': '"Press Start 2P", monospace', 'f-body': '"VT323", ui-monospace, monospace', 'f-mono': '"VT323", ui-monospace, monospace' } },
  blueprint: { name: 'Blueprint', note: 'Technical drawing on a blue grid. Good for coins and stamps.', scheme: 'dark',
    t: { bg: '#123A6B', surface: '#164479', sunk: '#0F3360', ink: '#EAF2FF', muted: '#A9C2E4', line: '#5C86BE', accent: '#FFFFFF', 'accent-ink': '#123A6B', have: '#FFFFFF', 'have-ink': '#123A6B', dup: '#FFD166', 'dup-soft': '#2A4A6E', danger: '#FF8A80',
      'f-display': '"IBM Plex Mono", ui-monospace, monospace' } }
};
export const SKIN_ALIAS = { showcase: 'neon', vault: 'neon' };
export const SKIN_TOKENS = ['bg', 'surface', 'sunk', 'ink', 'muted', 'line', 'accent', 'accent-ink', 'have', 'have-ink', 'dup', 'dup-soft', 'danger', 'f-display', 'f-body', 'f-mono'];
export function applySkin(id) {
  id = SKIN_ALIAS[id] || id;
  const sk = SKINS[id] ? id : 'classic', d = SKINS[sk], de = document.documentElement;
  S.skin = sk;
  for (const k of SKIN_TOKENS) de.style.removeProperty('--' + k);
  de.style.removeProperty('color-scheme');
  if (d.t) { for (const [k, v] of Object.entries(d.t)) de.style.setProperty('--' + k, v); de.style.setProperty('color-scheme', d.scheme); }
  de.setAttribute('data-skin', sk);
}
export function loadSkin() { try { return localStorage.getItem('kolekcionar.skin') || 'classic'; } catch (e) { return 'classic'; } }
export function saveSkin() {
  try { localStorage.setItem('kolekcionar.skin', S.skin); } catch (e) {}
  if (G.DB) G.DB.collection('data/users/' + G.UID).doc('_settings').set({ skin: S.skin }).catch(() => {});
}
export function skinPreview(id) {
  const slot = (n, on, dup) => '<i class="' + (on ? 'on' : '') + '">' + n + (dup ? '<b></b>' : '') + '</i>';
  return '<div class="sk-prev" data-p="' + id + '"><div class="sk-title"><span>Aa</span><span>62%</span></div><div class="sk-bar"><span></span></div>' +
    '<div class="sk-slots">' + slot(1, 1) + slot(2, 1, 1) + slot(3) + slot(4, 1) + slot(5) + slot(6, 1) + '</div></div>';
}
export function viewSkins() {
  return '<header class="top"><button class="iconbtn" type="button" data-act="home" aria-label="Back">' + ICON.back + '</button><h1>Themes</h1></header>' +
    '<p class="hint" style="margin:0 0 14px">Pick a look. It applies right away and is saved to your account.</p>' +
    '<div class="skins">' + Object.keys(SKINS).map(id => { const d = SKINS[id];
      return '<button class="skin" type="button" data-act="skin" data-id="' + id + '" aria-pressed="' + (S.skin === id) + '">' + skinPreview(id) +
        '<span class="nm">' + d.name + (S.skin === id ? '<small>✓ In use</small>' : '') + '</span><span class="nt">' + d.note + '</span></button>'; }).join('') + '</div>';
}

registerView('settings', viewSkins, 1);
onAct({
  skins: () => go('settings'),
  skin: ({ id }) => { applySkin(id); saveSkin(); render(); toast(SKINS[S.skin].name + ' theme on'); },
});
