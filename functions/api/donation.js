// Cloudflare Pages Function: POST /api/donation
// Creates a Stripe PaymentIntent for a donation and returns its client secret to the page.
// The secret key lives in Cloudflare (Settings > Variables and secrets > STRIPE_SECRET_KEY),
// never in the site's files.

const MIN_CENTS = 100; // 1 €
const MAX_CENTS = 50000; // 500 €

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const verifyTurnstile = async (secret, token, ip) => {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = await response.json().catch(() => ({}));
  return result.success === true;
};

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  // Only the site itself may ask for a payment.
  // (browsers always send Origin with this request; scripts that leave it out are refused)
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'bad-request' }, 415);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'not-configured' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }

  const amount = typeof body?.amount === 'number' ? body.amount : NaN;
  if (!Number.isInteger(amount) || amount < MIN_CENTS || amount > MAX_CENTS) return json({ error: 'amount' }, 400);
  const app = typeof body.app === 'string' && /^[a-z0-9-]{1,40}$/.test(body.app) ? body.app : 'justecoqqo';

  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body.turnstile, request.headers.get('CF-Connecting-IP'));
    if (!ok) return json({ error: 'bot-check' }, 403);
  }

  const params = new URLSearchParams({
    amount: String(amount),
    currency: 'eur',
    'automatic_payment_methods[enabled]': 'true',
    description: app === 'justecoqqo' ? 'Don justecoqqo' : `Don justecoqqo (${app})`,
    'metadata[app]': app,
    'metadata[source]': 'justecoqqo.fr',
  });

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const intent = await response.json().catch(() => ({}));
  if (!response.ok || !intent.client_secret) {
    console.error('Stripe error', response.status, intent?.error?.type, intent?.error?.code);
    return json({ error: 'stripe' }, 502);
  }
  return json({ clientSecret: intent.client_secret });
}
