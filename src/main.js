// GotGotNeed – app entry. Loads every feature (each registers its own screens and actions), then starts.
import './core/events.js';
import './core/nav.js';
import './ui/toast.js';
import './ui/modal.js';
import './themes/themes.js';
import './views/home.js';
import './views/drag.js';
import './views/collection.js';
import './views/new.js';
import './views/edit.js';
import './views/feedback.js';
import './views/settings.js';
import './features/bulk.js';
import './features/trade.js';
import './data/backup.js';
import { restoreFromCopy } from './features/safety.js';
// TEMPORARY – testing helper, remove before release:
import './features/devtools.js';
import { render, stateOf } from './core/nav.js';
import { S } from './core/state.js';
import { exampleCols } from './data/examples.js';
import { initCaps, loadLocal } from './data/store.js';
import { applySkin, loadSkin } from './themes/themes.js';

S.cols = loadLocal();
if (!S.cols.length) S.cols = exampleCols();
applySkin(loadSkin());
try { history.replaceState(stateOf('home'), ''); } catch (e) {}
render();
restoreFromCopy();
initCaps();
