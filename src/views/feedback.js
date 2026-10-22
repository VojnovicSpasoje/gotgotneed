// Send feedback: goes to the team's Google Form.
import { onAct, onSubmit } from '../core/events.js';
import { go, registerView, render } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, ICON } from '../core/util.js';

export const FB_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSea40DArCVmv6iyeKB77mWZiNpS2U_73EJ3kQJKYhLHkSh1jQ/formResponse';
export function viewFeedback() {
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="toSettings" aria-label="Back">' + ICON.back + '</button><h1>Send feedback</h1></header>';
  if (S.fbSent) return h + '<div class="box" style="text-align:center;align-items:center"><h3 style="font-size:22px">Thank you!</h3><p class="muted" style="margin:0">Your message was sent. We read every one.</p><button class="btn" type="button" data-act="home">Back to collections</button></div>';
  return h + '<form class="box" data-form="feedback" style="margin-top:6px"><p class="muted" style="margin:0">Tell us what you would change or add, or report a problem.</p>' +
    '<div class="field"><span class="label">Type</span><div class="seg" role="group" aria-label="Feedback type">' + ['Idea', 'Bug', 'Other'].map(t => '<button type="button" data-act="fbtype" data-id="' + t + '" aria-pressed="' + (S.fbType === t) + '">' + t + '</button>').join('') + '</div></div>' +
    '<label class="field"><span class="label">Message</span><textarea id="fbMsg" maxlength="4000" placeholder="What would make GotGotNeed better for you?"></textarea></label>' +
    '<label class="field"><span class="label">Email (optional)</span><input id="fbEmail" type="email" autocomplete="email" placeholder="Only if you want a reply"></label>' +
    '<p id="fbErr" class="hint" style="color:var(--danger);margin:0" hidden></p>' +
    '<button class="btn block" type="submit" id="fbSend">Send</button>' +
    (window.claude ? '<p class="hint" style="margin:0">Sending works in the GotGotNeed app at <a href="https://vojnovicspasoje.github.io/gotgotneed/" target="_blank" rel="noopener">vojnovicspasoje.github.io/gotgotneed</a>.</p>' : '') +
    '<p class="hint" style="margin:0">Your message goes to the GotGotNeed team. See the <a href="https://vojnovicspasoje.github.io/gotgotneed/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</p></form>';
}

registerView('feedback', viewFeedback, 2);
onAct({
  fb: () => { S.fbSent = false; go('feedback'); },
  fbtype: ({ b, id }) => { S.fbType = id; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); },
});
onSubmit({
  feedback: () => {
    const err = m => { const el = $('#fbErr'); el.textContent = m; el.hidden = false; };
    const msg = $('#fbMsg').value.trim(), email = $('#fbEmail').value.trim();
    if (!msg) { err('Write a message first.'); $('#fbMsg').focus(); return; }
    if (window.claude) { err('Sending isn’t available inside Claude. Open the app at vojnovicspasoje.github.io/gotgotneed to send feedback.'); return; }
    const btn = $('#fbSend'); btn.disabled = true; btn.textContent = 'Sending…';
    const body = new URLSearchParams({ 'entry.960602004': S.fbType, 'entry.1848165584': msg });
    if (email) body.append('entry.774501519', email);
    fetch(FB_URL, { method: 'POST', mode: 'no-cors', body })
      .then(() => { S.fbSent = true; render(); scrollTo(0, 0); })
      .catch(() => { btn.disabled = false; btn.textContent = 'Send'; err('Could not send. Check your internet connection and try again.'); });
  },
});
