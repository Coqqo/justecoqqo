// Vercel Function: POST /api/report { app, message, context }
// "Prévenir Coqqo de l'incident": the message is posted in the Discord channel of the app, through a
// Discord webhook. The webhook addresses stay secret in Vercel > Settings > Environment Variables:
//   DISCORD_WEBHOOK_SITE, DISCORD_WEBHOOK_CAPTE_CUT, DISCORD_WEBHOOK_JETRANSCRIT, DISCORD_WEBHOOK_TO_MP34
// (an app without its own webhook falls back to DISCORD_WEBHOOK_SITE).

const APPS = {
  site: { name: 'Site justecoqqo.fr', color: 0x8b6dff, env: 'DISCORD_WEBHOOK_SITE' },
  'capte-cut': { name: 'Capte Cut', color: 0xff4f6d, env: 'DISCORD_WEBHOOK_CAPTE_CUT' },
  jetranscrit: { name: 'jetranscrit', color: 0x5a46f0, env: 'DISCORD_WEBHOOK_JETRANSCRIT' },
  'to-mp34': { name: 'to mp34', color: 0xc8ff4d, env: 'DISCORD_WEBHOOK_TO_MP34' },
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// a little protection against floods (per server instance)
const recent = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return list.length > 6;
};

const clean = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/@(everyone|here)/gi, '@​$1')
    .trim()
    .slice(0, max);

const handle = async (request, env) => {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'bad-request' }, 415);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return json({ error: 'too-many' }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const app = APPS[body?.app] ? body.app : 'site';
  const message = clean(body?.message, 1500);
  if (message.length < 3) return json({ error: 'message' }, 400);
  const context = body?.context && typeof body.context === 'object' ? body.context : {};
  const webhook = env[APPS[app].env] || env.DISCORD_WEBHOOK_SITE;
  if (!webhook || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(webhook)) return json({ error: 'not-configured' }, 503);

  const fields = [
    ['Version', clean(context.version, 40)],
    ['Où', clean(context.where, 100)],
    ['Erreur', clean(context.error, 900)],
    ['Page', clean(context.page, 200)],
    ['Système', clean(context.platform, 80)],
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => ({ name, value: name === 'Erreur' ? `\`\`\`${value.replace(/`/g, "'")}\`\`\`` : value, inline: name !== 'Erreur' }));

  const response = await fetch(`${webhook}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `Signalement · ${APPS[app].name}`,
      allowed_mentions: { parse: [] },
      embeds: [{ title: '🚨 Nouveau signalement', description: message, color: APPS[app].color, fields, timestamp: new Date().toISOString() }],
    }),
  });
  if (!response.ok) {
    console.error('Discord error', response.status);
    return json({ error: 'discord' }, 502);
  }
  return json({ ok: true });
};

export const POST = (request) => handle(request, process.env);
export const GET = () => json({ error: 'method' }, 405);
