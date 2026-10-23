// Settings: appearance, backup & restore, feedback, about. Other features can add their own section
// (the temporary test tools do) by listening with onRender for S.view === 'settings'.
import { onAct, onChange } from '../core/events.js';
import { go, navBack, registerView, render } from '../core/nav.js';
import { G, S } from '../core/state.js';
import { ICON, esc } from '../core/util.js';
import { backupInfo, setBackupInfo } from '../data/backup.js';
import { SKINS } from '../themes/themes.js';

export const APP_VERSION = '1.0';
// Filled in by tools/build-app-web.mjs for the Android app (build number shown in About).
export const APP_BUILD = '';
// The studio behind the app (shown in About).
export const STUDIO = 'Pocket Oak';

const ONE_DAY = 864e5;
const agoText = t => { const d = Math.floor((Date.now() - t) / ONE_DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
const row = (act, title, value) => '<button class="setrow" type="button" data-act="' + act + '"><span>' + title + '</span><span class="setval">' + (value || '') + ' ›</span></button>';

export function viewSettings() {
  const b = backupInfo(), own = S.cols.some(c => !c.example);
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="home" aria-label="Back">' + ICON.back + '</button><h1>Settings</h1></header>';
  h += '<section class="setsec"><h2>Appearance</h2><div class="setbox">' + row('themes', 'Theme', esc(SKINS[S.skin] ? SKINS[S.skin].name : '')) + '</div></section>';
  h += '<section class="setsec"><h2>Backup &amp; restore</h2><div class="setbox setpad">' +
    '<p class="hint" style="margin:0">' + (G.DB ? 'Your collections are saved to your account automatically. A backup file is still handy for moving them elsewhere.'
      : 'Your collections are stored only on this phone. Save a backup file now and then, so you can restore them on a new phone.') + '</p>' +
    '<p class="setmeta">Last backup: <b>' + (b.last ? agoText(b.last) : 'never') + '</b></p>' +
    '<div class="rowwrap"><button class="btn small" type="button" data-act="export"' + (own ? '' : ' disabled') + '>Export (.json)</button>' +
    '<label class="btn small ghost" for="importFile">Import from file</label><input id="importFile" type="file" accept=".json,application/json" hidden></div>' +
    '<div id="exportOut"></div>' +
    (G.DB ? '' : '<label class="setswitch"><span>Remind me to back up</span><input type="checkbox" id="bkRemind"' + (b.off ? '' : ' checked') + '><i aria-hidden="true"></i></label>') +
    '</div></section>';
  h += '<section class="setsec"><h2>Help</h2><div class="setbox">' + row('intro', 'How it works', '') + row('fb', 'Send feedback', '') +
    '<a class="setrow" href="https://vojnovicspasoje.github.io/gotgotneed/privacy.html" target="_blank" rel="noopener"><span>Privacy policy</span><span class="setval">↗</span></a></div></section>';
  h += '<section class="setsec"><h2>About</h2><div class="setbox setpad about">' +
    '<p><b>GotGotNeed</b> <span class="muted">version ' + APP_VERSION + (APP_BUILD ? ' (build ' + APP_BUILD + ')' : '') + '</span></p>' +
    '<p>GotGotNeed started from a personal need: keeping track of my own collections – what I have, what I’m missing and what I can swap – without paper lists and spreadsheets. It works for any collection: sticker albums, cards, coins, magazines and more.</p>' +
    '<p class="muted">No account needed – your collections stay on your phone.</p>' +
    '<p class="studio">' + ICON.oak + '<span>Made by <b>' + esc(STUDIO) + '</b><small>independent studio from Serbia</small></span></p>' +
    '<p class="muted">Questions or ideas? Use <button class="linkbtn" type="button" data-act="fb">Send feedback</button>.</p></div></section>';
  return h;
}

registerView('settings', viewSettings, 1);
onAct({
  settings: () => go('settings'),
  toSettings: () => navBack('settings'),
});
onChange(e => { if (e.target.id === 'bkRemind') { setBackupInfo({ off: !e.target.checked }); return true; } });
