# GotGotNeed

Collection tracker for albums, stickers, coins, cards, magazines and anything else you collect.
Editions by number or by name, variants, duplicates, completion, trade lists, five themes.

Live: https://vojnovicspasoje.github.io/gotgotneed/

## How the code is organized

Plain HTML, CSS and JavaScript modules – no build step. The browser loads `src/main.js`,
which loads every feature. The same files will be packaged into the Android/iOS app (Capacitor).

```
index.html            page shell: loads the styles and src/main.js
src/
  main.js             entry: loads all features, then starts the app
  core/               the backbone (no feature code here)
    state.js          shared state (S) and constants
    util.js           small helpers ($, esc, uid, …) and icons
    events.js         one listener for the page; features register with onAct / onInput / onChange / onSubmit
    nav.js            screens (registerView), render, phone back button
  data/
    model.js          collections, editions, variants, counts – pure functions, covered by tests
    select.js         what is on screen right now (current collection / edition / variant)
    store.js          saving (this device; Claude account sync when run inside Claude)
    backup.js         export / import .json
    share.js          pack an edition into a swap link, compare with a friend's (tested)
    examples.js       example collections for first-time users
  ui/                 toast (messages + Undo), modal (confirmation window)
  views/              one file per screen: home, collection, new, edit, settings, feedback (+ drag to reorder)
  features/           bigger add-ons: bulk.js (“Add many”), safety.js (safety copy, backup reminder), trade.js (swap with a friend: QR/link + compare)
  lib/qr.js           QR code generator (no outside service)
  themes/             themes.js (colors, fonts, picker) + one CSS file per theme
  styles/             reset, design tokens, shared components, feature styles
  pwa/                offline support and the “Install” bar (website only)
tests/                node --test unit tests for the model
tools/                bundle.py (single-file build for the Claude preview), store-shots.mjs (Play screenshots)
```

## Adding a feature

1. Create `src/features/my-feature.js` (or `src/views/…` for a new screen).
2. Register what it handles – nothing else needs to change:
   ```js
   import { onAct } from '../core/events.js';
   import { registerView, go } from '../core/nav.js';
   registerView('myscreen', () => '<header>…</header>', 1);   // name, html, depth for the back button
   onAct({ openMy: () => go('myscreen') });                    // buttons with data-act="openMy"
   ```
3. Add `import './features/my-feature.js';` to `src/main.js`, and its CSS (if any) to `index.html`.

## Commands

- `npm test` – run the unit tests (Node 20+, no install needed)
- `npm run serve` – serve locally at http://localhost:8080 (modules need http, not file://)
- `npm run bundle` – single-file version in `dist/`
