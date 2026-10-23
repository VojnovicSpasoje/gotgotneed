// Short intro for first-time users: 3 screens, can be skipped at any time.
// Shown once (on the first start, before anything is created); "How it works" in Settings opens it again.
import { onAct } from '../core/events.js';
import { onRender } from '../core/nav.js';
import { S } from '../core/state.js';
import { ICON } from '../core/util.js';

const SEEN = 'ggn.introSeen';
const seen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch (e) { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN, '1'); } catch (e) {} };

const ART = {
  track: '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="10" y="16" width="44" height="58" rx="8" class="ia-on"/><path d="M22 45l8 8 14-16" class="ia-ck"/><rect x="58" y="16" width="44" height="58" rx="8" class="ia-on"/><path d="M70 45l8 8 14-16" class="ia-ck"/><rect x="106" y="16" width="44" height="58" rx="8" class="ia-off"/><text x="128" y="54" class="ia-q">?</text><rect x="10" y="88" width="140" height="8" rx="4" class="ia-bar"/><rect x="10" y="88" width="92" height="8" rx="4" class="ia-on"/></svg>',
  tap: '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="14" y="20" width="36" height="36" rx="8" class="ia-on"/><text x="32" y="44" class="ia-n">7</text><rect x="62" y="20" width="36" height="36" rx="8" class="ia-on"/><text x="80" y="44" class="ia-n">8</text><circle cx="96" cy="22" r="10" class="ia-dup"/><text x="96" y="26" class="ia-x">×2</text><rect x="110" y="20" width="36" height="36" rx="8" class="ia-off"/><text x="128" y="44" class="ia-m">9</text><rect x="14" y="70" width="44" height="26" rx="13" class="ia-pill"/><text x="36" y="87" class="ia-t">Mark</text><rect x="64" y="70" width="34" height="26" rx="13" class="ia-pill2"/><text x="81" y="87" class="ia-t2">+1</text><rect x="104" y="70" width="42" height="26" rx="13" class="ia-pill2"/><text x="125" y="87" class="ia-t2">Many</text></svg>',
  swap: '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="12" y="14" width="56" height="84" rx="12" class="ia-phone"/><rect x="22" y="34" width="36" height="36" rx="4" class="ia-qr"/><path d="M27 39h8v8h-8zM45 39h8v8h-8zM27 57h8v8h-8zM40 52h4v4h-4zM46 58h6v6h-6z" class="ia-qrd"/><path d="M78 56h26" class="ia-arrow"/><path d="M98 50l7 6-7 6" class="ia-arrow"/><rect x="112" y="14" width="40" height="84" rx="12" class="ia-phone"/><rect x="119" y="30" width="26" height="10" rx="3" class="ia-on"/><rect x="119" y="46" width="26" height="10" rx="3" class="ia-dup2"/><rect x="119" y="62" width="18" height="10" rx="3" class="ia-on"/></svg>',
};
const SLIDES = [
  { art: 'track', title: 'Track any collection', text: 'Sticker albums, cards, coins, magazines – by number or by name. Add editions and special variants like Shiny or Gold.' },
  { art: 'tap', title: 'Tap to mark, +1 for duplicates', text: 'Tap what you have. Switch to +1 to count duplicates, or use Add many to enter a whole pack at once.' },
  { art: 'swap', title: 'Swap with friends', text: 'Show your QR code – your friend instantly sees what you can swap. No account needed, everything stays on your phone.' },
];
let at = -1;
function draw() {
  const s = SLIDES[at], last = at === SLIDES.length - 1;
  const el = document.getElementById('intro');
  el.innerHTML = '<div class="intro-card" role="dialog" aria-modal="true" aria-labelledby="introT">' +
    '<button class="intro-skip linkbtn" type="button" data-act="introDone">' + (last ? '' : 'Skip') + '</button>' +
    '<div class="intro-art">' + ART[s.art] + '</div>' +
    '<h2 id="introT">' + s.title + '</h2><p>' + s.text + '</p>' +
    '<div class="intro-dots" aria-hidden="true">' + SLIDES.map((_, i) => '<i' + (i === at ? ' class="on"' : '') + '></i>').join('') + '</div>' +
    '<div class="intro-nav">' + (at > 0 ? '<button class="btn ghost" type="button" data-act="introPrev">' + ICON.back + '</button>' : '<span></span>') +
    '<button class="btn" type="button" data-act="' + (last ? 'introDone' : 'introNext') + '">' + (last ? 'Get started' : 'Next') + '</button></div></div>';
  el.querySelector('[data-act="introNext"],[data-act="introDone"].btn')?.focus();
}
export function openIntro() {
  let el = document.getElementById('intro');
  if (!el) { el = document.createElement('div'); el.id = 'intro'; el.className = 'intro'; document.body.appendChild(el); }
  at = 0; el.hidden = false; draw();
}
function closeIntro() { markSeen(); const el = document.getElementById('intro'); if (el) { el.hidden = true; el.innerHTML = ''; } at = -1; }

// First start: nothing of their own yet and never seen the intro.
let checked = false;
onRender(() => { if (checked) return; checked = true; if (!seen() && !S.cols.some(c => !c.example)) openIntro(); else markSeen(); });
onAct({
  introNext: () => { at = Math.min(SLIDES.length - 1, at + 1); draw(); },
  introPrev: () => { at = Math.max(0, at - 1); draw(); },
  introDone: () => closeIntro(),
  intro: () => openIntro(),
});
document.addEventListener('keydown', e => { if (at >= 0 && e.key === 'Escape') closeIntro(); });
export const introOpen = () => at >= 0;
export { closeIntro };
