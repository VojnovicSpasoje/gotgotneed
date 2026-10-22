// App-wide state and constants. Everything that is shared and changes lives on S or G.
export const LS = 'kolekcionar.v1';
export const MAX_ITEMS = 3000;
export const S = { cols: [], view: 'home', colId: null, edId: null, varId: null, tab: 'album', filter: 'all', mode: 'toggle', q: '', confirm: null, sync: 'local', newMode: 'range', addMode: 'range', homeQ: '', homeCat: 'all', homeSort: 'mine', fbType: 'Idea', fbSent: false };
try { const hp = JSON.parse(localStorage.getItem('kolekcionar.home') || '{}'); if (hp.sort) S.homeSort = hp.sort; } catch (e) {}
// Runtime handles set when the app runs inside Claude (synced storage, downloads).
export const G = { DB: null, UID: null, DL: null };
export const timers = {}, chains = {}, pending = new Set();
