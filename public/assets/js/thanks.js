// Thank-you page: reads the payment result Stripe sends back, then celebrates with confetti.
import { SITE, fetchCatalog, reducedMotion } from './site.js';

const params = new URLSearchParams(window.location.search);
const app = document.documentElement.dataset.app || '';
const title = document.querySelector('[data-thanks-title]');
const text = document.querySelector('[data-thanks-text]');
const back = document.querySelector('[data-thanks-back]');

const formatEuros = (cents) => {
  const euros = cents / 100;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(euros) ? 0 : 2 }).format(euros);
};

if (app) {
  fetchCatalog().then((catalog) => {
    const entry = catalog.apps?.find((item) => item.id === app);
    if (!entry?.page) return;
    back.href = entry.page;
    back.textContent = `Retour à ${entry.name}`;
  });
}

const confetti = () => {
  if (reducedMotion) return;
  const canvas = document.querySelector('.confetti');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim();
  const palette = app ? [accent, '#ff9a6b', '#ffffff', '#34d1b1', '#f4b54a'] : ['#ff7ab6', '#a98bff', '#66d4ff', '#8fffd9', '#ffffff'];
  const pieces = Array.from({ length: 180 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: fromLeft ? -10 : window.innerWidth + 10,
      y: window.innerHeight * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9),
      vy: -(10 + Math.random() * 12),
      size: 6 + Math.random() * 8,
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * 0.35,
      color: palette[i % palette.length],
      shape: i % 3,
      delay: Math.random() * 0.35,
    };
  });
  let start = performance.now();
  let last = start;
  const tick = (now) => {
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)) * 60;
    last = now;
    const elapsed = (now - start) / 1000;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const p of pieces) {
      if (elapsed < p.delay) {
        alive++;
        continue;
      }
      p.vy += 0.32 * dt;
      p.vx *= 0.985 ** dt;
      p.vy *= 0.99 ** dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += p.vspin * dt;
      if (p.y > window.innerHeight + 40) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.scale(Math.cos(p.spin * 2), 1);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
    if (alive) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
  requestAnimationFrame(tick);
};

const showFailure = () => {
  document.querySelector('.thanks-card').dataset.state = 'failed';
  title.textContent = "Le paiement n'a pas abouti.";
  text.textContent = "Aucun montant n'a été débité. Tu peux réessayer quand tu veux, avec la même carte ou un autre moyen de paiement.";
  back.textContent = 'Réessayer';
  back.href = `/soutenir/${app ? `?app=${encodeURIComponent(app)}` : ''}`;
};

const showProcessing = () => {
  title.textContent = 'Merci ! Ton don est en cours de traitement.';
  text.textContent = 'Ta banque confirme le paiement, ça peut prendre quelques instants. Tu n\'as rien d\'autre à faire.';
};

const run = async () => {
  let status = params.get('redirect_status');
  let cents = Number(params.get('montant'));
  const secret = params.get('payment_intent_client_secret');
  const key = String(SITE.stripePublishableKey || '').trim();
  // Ask Stripe for the real status when possible (the address bar can be edited by hand).
  if (secret && /^pk_(live|test)_/.test(key)) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      const { paymentIntent } = await window.Stripe(key).retrievePaymentIntent(secret);
      if (paymentIntent) {
        status = paymentIntent.status;
        cents = paymentIntent.amount;
      }
    } catch {
      /* keep the status from the address */
    }
  }
  if (status === 'failed' || status === 'requires_payment_method' || status === 'canceled') {
    showFailure();
    return;
  }
  if (status === 'processing') showProcessing();
  if (status === 'succeeded' && Number.isInteger(cents) && cents >= 100) {
    text.textContent = `Ton don de ${formatEuros(cents)} aide à garder les applis gratuites pour tout le monde, et à créer les prochaines. Ça compte énormément.`;
  }
  confetti();
};

run();
