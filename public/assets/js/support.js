// Donation page: amount picker, Stripe Payment Element (card, Apple Pay, Google Pay), 3D heart.
import { SITE, fetchCatalog, offerReport, reducedMotion } from './site.js';

const MIN_EUROS = 1;
const MAX_EUROS = 500;
const app = document.documentElement.dataset.app || '';

const form = document.querySelector('[data-donate-form]');
const customInput = document.querySelector('[data-custom-amount]');
const customRadio = document.querySelector('[data-custom-radio]');
const hint = document.querySelector('[data-amount-hint]');
const submit = document.querySelector('[data-donate-submit]');
const submitLabel = document.querySelector('[data-submit-label]');
const message = document.querySelector('[data-donate-msg]');
const payOff = document.querySelector('[data-pay-off]');
const paymentTarget = document.querySelector('[data-payment-element]');
const turnstileTarget = document.querySelector('[data-turnstile]');

const formatEuros = (euros) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);

/** The chosen amount in euros, or null when the custom amount is not valid. */
const chosenEuros = () => {
  const checked = form.querySelector('input[name="amount"]:checked');
  if (!checked) return null;
  if (checked.value !== 'custom') return Number(checked.value);
  const raw = customInput.value.trim().replace(/\s/g, '').replace(',', '.').replace(/€$/, '');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(raw)) return null;
  const euros = Number(raw);
  return euros >= MIN_EUROS && euros <= MAX_EUROS ? euros : null;
};

const showMessage = (text) => {
  message.textContent = text;
  message.hidden = !text;
};

/* ------------------------------------------------------------------ back link to the app */

if (app) {
  fetchCatalog().then((catalog) => {
    const entry = catalog.apps?.find((item) => item.id === app);
    if (!entry?.page) return;
    const back = document.querySelector('[data-back]');
    back.href = entry.page;
    back.querySelector('[data-back-label]').textContent = `Retour à ${entry.name}`;
    back.hidden = false;
  });
}

/* ------------------------------------------------------------------ 3D heart */

let heart = null;
const heartStage = document.querySelector('.heart-stage');
if (heartStage) {
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim();
  const colors = app ? [accent || '#ff4f6d', '#ff9a6b'] : ['#ff7ab6', '#a98bff'];
  import('./heart3d.js')
    .then(({ mountHeart }) => {
      heart = mountHeart(heartStage, { colors, reducedMotion });
      heart?.setAmount(chosenEuros() || 5);
    })
    .catch(() => {});
}

/* ------------------------------------------------------------------ amount */

let elements = null;
const refreshAmount = () => {
  const euros = chosenEuros();
  const customChosen = customRadio.checked;
  const invalid = euros === null;
  submitLabel.textContent = invalid ? 'Choisis un montant' : `Donner ${formatEuros(euros)}`;
  submit.disabled = invalid || !stripeReady || paying;
  hint.textContent = customChosen && invalid && customInput.value.trim()
    ? `Le montant doit être entre ${formatEuros(MIN_EUROS)} et ${formatEuros(MAX_EUROS)}.`
    : `De ${formatEuros(MIN_EUROS)} à ${formatEuros(MAX_EUROS)}.`;
  hint.classList.toggle('is-error', customChosen && invalid && Boolean(customInput.value.trim()));
  if (!invalid) {
    heart?.setAmount(euros);
    elements?.update({ amount: Math.round(euros * 100) });
  }
};

form.querySelectorAll('input[name="amount"]').forEach((input) => input.addEventListener('change', () => {
  if (input === customRadio) customInput.focus();
  refreshAmount();
}));
customInput.addEventListener('focus', () => {
  customRadio.checked = true;
  refreshAmount();
});
customInput.addEventListener('input', refreshAmount);

/* ------------------------------------------------------------------ Stripe */

let stripe = null;
let stripeReady = false;
let turnstileWidget = null;

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.append(script);
  });

const paymentOff = () => {
  payOff.hidden = false;
  stripeReady = false;
  refreshAmount();
};

const setupStripe = async () => {
  const key = String(SITE.stripePublishableKey || '').trim();
  if (!/^pk_(live|test)_[A-Za-z0-9]+$/.test(key)) {
    paymentOff();
    return;
  }
  try {
    await loadScript('https://js.stripe.com/v3/');
  } catch {
    showMessage("Le module de paiement n'a pas pu se charger. Vérifie ta connexion, puis recharge la page.");
    offerReport('Le module de paiement Stripe ne se charge pas', { where: 'page de don', quiet: true });
    paymentOff();
    payOff.hidden = true;
    return;
  }
  stripe = window.Stripe(key, { locale: 'fr' });
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  const dark = styles.colorScheme === 'dark';
  elements = stripe.elements({
    mode: 'payment',
    amount: Math.round((chosenEuros() || 5) * 100),
    currency: 'eur',
    fonts: [{ family: 'Figtree', src: `url(${window.location.origin}/assets/fonts/figtree.woff2)`, weight: '400 700' }],
    appearance: {
      theme: dark ? 'night' : 'stripe',
      variables: {
        colorPrimary: read('--accent', '#8b6cff'),
        colorBackground: dark ? read('--surface-2', '#1c2237') : '#ffffff',
        colorText: read('--text', '#14151d'),
        colorTextSecondary: read('--mute', '#5a6075'),
        colorDanger: '#e5304f',
        fontFamily: 'Figtree, system-ui, sans-serif',
        fontSizeBase: '16px',
        borderRadius: '14px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': { boxShadow: 'none', border: `1.5px solid ${dark ? 'rgba(223,230,255,.12)' : 'rgba(20,21,29,.12)'}` },
        '.Input:focus': { boxShadow: `0 0 0 3px ${dark ? 'rgba(255,79,109,.25)' : 'rgba(139,108,255,.2)'}` },
        '.Tab': { boxShadow: 'none', border: `1.5px solid ${dark ? 'rgba(223,230,255,.12)' : 'rgba(20,21,29,.1)'}` },
      },
    },
  });
  const paymentElement = elements.create('payment', { layout: { type: 'tabs', defaultCollapsed: false } });
  paymentElement.mount(paymentTarget);
  paymentElement.on('ready', () => {
    stripeReady = true;
    refreshAmount();
  });
  paymentElement.on('loaderror', () => {
    showMessage("Le paiement n'a pas pu s'afficher. Recharge la page pour réessayer.");
    offerReport('Le formulaire de paiement ne s’affiche pas', { where: 'page de don', quiet: true });
  });

  // Optional anti-bot check (Cloudflare Turnstile)
  const siteKey = String(SITE.turnstileSiteKey || '').trim();
  if (siteKey) {
    try {
      await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
      turnstileTarget.hidden = false;
      turnstileWidget = window.turnstile.render(turnstileTarget, { sitekey: siteKey, appearance: 'interaction-only', language: 'fr', theme: dark ? 'dark' : 'light' });
    } catch {
      /* the server decides whether the check is required */
    }
  }
};

let paying = false;
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (paying) return;
  showMessage('');
  const euros = chosenEuros();
  if (euros === null) {
    showMessage(`Choisis un montant entre ${formatEuros(MIN_EUROS)} et ${formatEuros(MAX_EUROS)}.`);
    return;
  }
  if (!stripe || !elements || !stripeReady) return;
  const amount = Math.round(euros * 100);
  // nothing can change (or be sent twice) while the payment is on its way
  paying = true;
  const amounts = form.querySelector('.amounts');
  amounts.disabled = true;
  submit.disabled = true;
  submit.setAttribute('aria-busy', 'true');
  submitLabel.textContent = 'Paiement en cours…';
  try {
    const { error: checkError } = await elements.submit();
    if (checkError) throw new Error(checkError.message);

    const token = turnstileWidget !== null ? window.turnstile?.getResponse(turnstileWidget) || '' : '';
    const response = await fetch('/api/donation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, app, turnstile: token }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.clientSecret) {
      const reasons = {
        'not-configured': "Le paiement n'est pas encore activé sur le serveur.",
        amount: `Le montant doit être entre ${formatEuros(MIN_EUROS)} et ${formatEuros(MAX_EUROS)}.`,
        'bot-check': 'La vérification anti-robots a échoué. Recharge la page et réessaie.',
      };
      throw Object.assign(new Error(reasons[result.error] || 'Le paiement n\'a pas pu démarrer. Réessaie dans un instant.'), { server: result.error !== 'amount', code: result.error || response.status });
    }

    const returnUrl = new URL('/soutenir/merci/', window.location.origin);
    if (app) returnUrl.searchParams.set('app', app);
    returnUrl.searchParams.set('montant', String(amount));
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: result.clientSecret,
      confirmParams: { return_url: returnUrl.toString() },
    });
    // confirmPayment only returns here when something went wrong (otherwise the page changes)
    if (error) throw new Error(error.message || 'Le paiement a été refusé.');
  } catch (error) {
    showMessage(error.message);
    // a refused card is not a bug; a server that does not answer is
    if (error.server) offerReport(error, { where: 'page de don' });
    if (turnstileWidget !== null) window.turnstile?.reset(turnstileWidget);
  } finally {
    paying = false;
    amounts.disabled = false;
    submit.removeAttribute('aria-busy');
    refreshAmount();
  }
});

refreshAmount();
setupStripe();
