// "Prévenir Coqqo de l'incident": when something goes wrong, a small window says sorry and lets the
// person describe the problem in a few words. The message lands in the app's Discord channel.
// Same file in every app (public/report.js) and on the site (assets/js/report.js).
//
//   setupReports({ app: 'jetranscrit', version: '1.0.1', send: (payload) => fetch(...) })
//   offerReport(error, { where: 'transcription' })

let config = null;
let open = false;
const seen = new Set();

const STYLE = `
.jq-report-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,16,.45);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;animation:jqr-fade .2s both}
.jq-report{position:relative;width:min(460px,100%);padding:26px 26px 22px;border-radius:24px;background:#fff;color:#17151f;font:400 15px/1.5 'Figtree','Segoe UI',system-ui,sans-serif;box-shadow:0 30px 80px -20px rgba(0,0,0,.55);animation:jqr-pop .3s cubic-bezier(.2,.8,.2,1) both}
.jq-report h2{margin:0 0 8px;font:700 22px/1.2 'Bricolage Grotesque','Figtree','Segoe UI',sans-serif;letter-spacing:-.02em}
.jq-report p{margin:0;color:#5f5b6b}
.jq-report .jqr-detail{margin-top:10px;padding:9px 12px;border-radius:10px;background:#f4f2ee;color:#6f6a7b;font-size:13px;overflow-wrap:anywhere;max-height:90px;overflow:auto}
.jq-report .jqr-face{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#fff1d6;font-size:24px;margin-bottom:14px}
.jq-report .jqr-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border:0;border-radius:999px;background:transparent;color:#8a8597;font-size:22px;line-height:1;cursor:pointer}
.jq-report .jqr-close:hover{background:#f1efea;color:#17151f}
.jq-report .jqr-main{width:100%;height:52px;margin-top:20px;border:0;border-radius:999px;background:var(--jqr-accent,#5a46f0);color:var(--jqr-on-accent,#fff);font:700 16px/1 'Figtree','Segoe UI',sans-serif;cursor:pointer;transition:transform .15s,filter .15s}
.jq-report .jqr-main:hover{filter:brightness(1.08)}
.jq-report .jqr-main:active{transform:scale(.98)}
.jq-report .jqr-main:disabled{opacity:.5;cursor:default}
.jq-report textarea{display:block;width:100%;min-height:130px;margin-top:14px;padding:12px 14px;border:1.5px solid #ddd8ce;border-radius:14px;background:#faf9f6;color:#17151f;font:400 15px/1.5 'Figtree','Segoe UI',sans-serif;resize:vertical;outline:none;box-sizing:border-box}
.jq-report textarea:focus{border-color:var(--jqr-accent,#5a46f0);background:#fff}
.jq-report .jqr-count{margin-top:6px;font-size:12.5px;color:#8a8597;text-align:right}
.jq-report .jqr-error{margin-top:10px;color:#c42b45;font-size:14px;font-weight:600}
@keyframes jqr-fade{from{opacity:0}}
@keyframes jqr-pop{from{opacity:0;transform:translateY(10px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.jq-report-scrim,.jq-report{animation:none}}
`;

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
};

const describe = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return [error.message || String(error), error.code ? `(${error.code})` : ''].filter(Boolean).join(' ');
};

export const setupReports = (options) => {
  config = options;
  if (!document.getElementById('jq-report-style')) document.head.append(el('style', { id: 'jq-report-style' }, document.createTextNode(STYLE)));
  // the bugs nobody planned for
  window.addEventListener('error', (event) => {
    if (event.message && !/ResizeObserver|Script error/i.test(event.message)) offerReport(event.error || event.message, { where: 'erreur inattendue', quiet: true });
  });
  window.addEventListener('unhandledrejection', (event) => offerReport(event.reason, { where: 'erreur inattendue', quiet: true }));
};

/** Shows the "sorry" window for this error (once per different error, never two at the same time). */
export const offerReport = (error, { where = '', quiet = false } = {}) => {
  if (!config || open) return;
  const detail = describe(error).slice(0, 600);
  const key = `${where}|${detail}`;
  if (quiet && seen.has(key)) return;
  seen.add(key);
  open = true;

  const close = () => {
    scrim.remove();
    open = false;
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => event.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);

  const card = el('div', { class: 'jq-report', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'jqr-title' });
  const closeButton = el('button', { class: 'jqr-close', type: 'button', 'aria-label': 'Fermer', text: '×' });
  closeButton.addEventListener('click', close);
  const scrim = el('div', { class: 'jq-report-scrim' }, card);
  scrim.addEventListener('click', (event) => event.target === scrim && close());
  if (config.accent) card.style.setProperty('--jqr-accent', config.accent);
  if (config.onAccent) card.style.setProperty('--jqr-on-accent', config.onAccent);

  const first = () => {
    const report = el('button', { class: 'jqr-main', type: 'button', text: "Prévenir Coqqo de l'incident" });
    card.replaceChildren(
      closeButton,
      el('div', { class: 'jqr-face', 'aria-hidden': 'true', text: '😕' }),
      el('h2', { id: 'jqr-title', text: 'Oups, désolé !' }),
      el('p', { text: "Quelque chose n'a pas marché comme prévu. Tu peux me prévenir en deux mots : je reçois ton message tout de suite et je corrige au plus vite." }),
      detail ? el('div', { class: 'jqr-detail', text: detail }) : null,
      report,
    );
    report.addEventListener('click', write);
    report.focus();
  };

  const write = () => {
    const text = el('textarea', { maxlength: '1500', placeholder: "Explique ce que tu faisais et ce qui s'est passé…", 'aria-label': 'Ton message', required: 'true' });
    const count = el('div', { class: 'jqr-count', text: '0 / 1500' });
    const send = el('button', { class: 'jqr-main', type: 'button', text: 'Envoyer', disabled: 'true' });
    const problem = el('div', { class: 'jqr-error' });
    problem.hidden = true;
    card.replaceChildren(
      closeButton,
      el('h2', { id: 'jqr-title', text: "Qu'est-ce qui s'est passé ?" }),
      el('p', { text: 'Ton message est obligatoire. Pas besoin de pseudo : seuls ton message et le détail technique de l’erreur sont envoyés.' }),
      text,
      count,
      problem,
      send,
    );
    const update = () => {
      const length = text.value.trim().length;
      count.textContent = `${text.value.length} / 1500`;
      if (length >= 3) send.removeAttribute('disabled');
      else send.setAttribute('disabled', 'true');
    };
    text.addEventListener('input', update);
    text.focus();
    send.addEventListener('click', async () => {
      const message = text.value.trim();
      if (message.length < 3) return text.focus();
      send.setAttribute('disabled', 'true');
      send.textContent = 'Envoi…';
      problem.hidden = true;
      try {
        await config.send({
          app: config.app,
          message,
          context: { version: config.version || '', where, error: detail, page: location.pathname, platform: navigator.userAgentData?.platform || navigator.platform || '' },
        });
        card.replaceChildren(closeButton, el('div', { class: 'jqr-face', 'aria-hidden': 'true', text: '🙏' }), el('h2', { id: 'jqr-title', text: 'Merci, c’est envoyé !' }), el('p', { text: 'Coqqo a reçu ton message. Merci de prendre le temps d’aider à améliorer l’appli.' }));
        setTimeout(() => open && close(), 3500);
      } catch {
        problem.textContent = "L'envoi n'a pas marché (connexion ?). Réessaie dans un instant.";
        problem.hidden = false;
        send.removeAttribute('disabled');
        send.textContent = 'Envoyer';
      }
    });
  };

  first();
  document.body.append(scrim);
};
