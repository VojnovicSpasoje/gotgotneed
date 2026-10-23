// Send feedback: goes to the team's Google Form.
import { onAct, onSubmit } from '../core/events.js';
import { go, registerView, render } from '../core/nav.js';
import { S } from '../core/state.js';
import { $, ICON } from '../core/util.js';

// Spam protection on this side: at most one message per 30 seconds and 5 per day from one phone,
// a hidden field that only bots fill in, no control characters, and texts that start like a
// spreadsheet formula (=, +, -, @) get a leading space so the Sheet never treats them as formulas.
const FB_LOG = 'ggn.fbLog', GAP = 30e3, PER_DAY = 5;
const cleanText = t => String(t || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
const noFormula = t => (/^[=+\-@\t\r]/.test(t) ? ' ' + t : t);
const sentLog = () => { try { return (JSON.parse(localStorage.getItem(FB_LOG) || '[]') || []).filter(x => Date.now() - x < 864e5); } catch (e) { return []; } };
function sendLimit() {
  const log = sentLog(), now = Date.now();
  if (log.length && now - log[log.length - 1] < GAP) return 'Please wait a few seconds before sending another message.';
  if (log.length >= PER_DAY) return 'Thanks for all the feedback today! You can send more tomorrow.';
  return '';
}
const noteSent = () => { try { localStorage.setItem(FB_LOG, JSON.stringify([...sentLog(), Date.now()])); } catch (e) {} };

export const FB_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdKs17ksEkot1W_kAckmXo7_XuJTrY3a-wzRyguyp17yknphA/formResponse';
export function viewFeedback() {
  let h = '<header class="top"><button class="iconbtn" type="button" data-act="toSettings" aria-label="Back">' + ICON.back + '</button><h1>Send feedback</h1></header>';
  if (S.fbSent) return h + '<div class="box" style="text-align:center;align-items:center"><h3 style="font-size:22px">Thank you!</h3><p class="muted" style="margin:0">Your message was sent. We read every one.</p><button class="btn" type="button" data-act="home">Back to collections</button></div>';
  return h + '<form class="box" data-form="feedback" style="margin-top:6px"><p class="muted" style="margin:0">Tell us what you would change or add, or report a problem.</p>' +
    '<div class="field"><span class="label">Type</span><div class="seg" role="group" aria-label="Feedback type">' + ['Idea', 'Bug', 'Other'].map(t => '<button type="button" data-act="fbtype" data-id="' + t + '" aria-pressed="' + (S.fbType === t) + '">' + t + '</button>').join('') + '</div></div>' +
    '<label class="field"><span class="label">Message</span><textarea id="fbMsg" maxlength="4000" placeholder="What would make GotGotNeed better for you?"></textarea></label>' +
    '<label class="field"><span class="label">Email (optional)</span><input id="fbEmail" type="email" maxlength="200" autocomplete="email" placeholder="Only if you want a reply"></label>' +
    '<label class="hp" aria-hidden="true">Website <input id="fbSite" tabindex="-1" autocomplete="off"></label>' +
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
    const msg = cleanText($('#fbMsg').value).slice(0, 4000), email = cleanText($('#fbEmail').value).slice(0, 200);
    if (msg.length < 3) { err('Write a message first.'); $('#fbMsg').focus(); return; }
    if ($('#fbSite').value) { S.fbSent = true; render(); return; }   // hidden field only bots fill in: pretend it worked
    const wait = sendLimit();
    if (wait) { err(wait); return; }
    if (window.claude) { err('Sending isn’t available inside Claude. Open the app at vojnovicspasoje.github.io/gotgotneed to send feedback.'); return; }
    const btn = $('#fbSend'); btn.disabled = true; btn.textContent = 'Sending…';
    const body = new URLSearchParams({ 'entry.1635371522': ['Idea', 'Bug', 'Other'].includes(S.fbType) ? S.fbType : 'Other', 'entry.203923111': noFormula(msg) });
    if (email) body.append('entry.26631883', noFormula(email));
    fetch(FB_URL, { method: 'POST', mode: 'no-cors', body })
      .then(() => { noteSent(); S.fbSent = true; render(); scrollTo(0, 0); })
      .catch(() => { btn.disabled = false; btn.textContent = 'Send'; err('Could not send. Check your internet connection and try again.'); });
  },
});
