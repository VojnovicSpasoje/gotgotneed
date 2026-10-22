// Offline support (service worker) and the "Install on your phone" bar.
function initInstall() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const bar = document.getElementById('installBar'), btn = document.getElementById('installBtn'), txt = document.getElementById('installTxt');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let dismissed = false; try { dismissed = localStorage.getItem('ggn.installDismissed') === '1'; } catch (e) {}
  if (standalone || dismissed) return;
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; txt.textContent = 'Install GotGotNeed on your phone'; bar.hidden = false; });
  btn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; bar.hidden = true; });
  document.getElementById('installX').addEventListener('click', () => { bar.hidden = true; try { localStorage.setItem('ggn.installDismissed', '1'); } catch (e) {} });
  window.addEventListener('appinstalled', () => { bar.hidden = true; });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) { btn.hidden = true; txt.innerHTML = 'To install: tap <b>Share</b> ↑ then <b>Add to Home Screen</b>'; bar.hidden = false; }
}
initInstall();
