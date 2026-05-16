/**
 * POST /api/paddle-webhook
 * Receives Paddle subscription lifecycle webhooks and persists them in D1.
 *
 * Required environment variables (Cloudflare Pages > Settings > Env vars):
 *   PADDLE_WEBHOOK_SECRET  — from Paddle dashboard > Developer > Notifications
 */

const HANDLED_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
]);

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();

  // 1. Verify Paddle HMAC-SHA256 signature
  const signature = request.headers.get('Paddle-Signature');
  const secret    = env.PADDLE_WEBHOOK_SECRET ?? '';

  if (secret && !(await verifySignature(rawBody, signature, secret))) {
    return response('Invalid signature', 401);
  }

  // 2. Parse event
  let event;
  try { event = JSON.parse(rawBody); }
  catch { return response('Invalid JSON', 400); }

  if (!HANDLED_EVENTS.has(event.event_type)) {
    return response('Ignored', 200);
  }

  // 3. Extract fields
  const data         = event.data ?? {};
  const subId        = data.id;
  const customerId   = data.customer_id;
  const status       = data.status;
  const priceId      = data.items?.[0]?.price?.id ?? null;
  const email        = (data.customer?.email ?? '').toLowerCase() || null;
  const renewsAt     = data.next_billed_at ?? null;
  const cancelledAt  = data.canceled_at    ?? null;

  if (!subId || !customerId || !status) {
    return response('Missing required fields', 400);
  }

  // 4. Upsert into D1
  try {
    await env.DB.prepare(`
      INSERT INTO subscriptions
        (subscription_id, customer_id, email, price_id, status, renews_at, cancelled_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (subscription_id) DO UPDATE SET
        customer_id  = excluded.customer_id,
        email        = excluded.email,
        price_id     = excluded.price_id,
        status       = excluded.status,
        renews_at    = excluded.renews_at,
        cancelled_at = excluded.cancelled_at,
        updated_at   = datetime('now')
    `).bind(subId, customerId, email, priceId, status, renewsAt, cancelledAt).run();
  } catch (err) {
    console.error('D1 error:', err);
    return response('DB error', 500);
  }

  return response('OK', 200);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function verifySignature(rawBody, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(';').map(p => { const [k, ...v] = p.split('='); return [k, v.join('=')]; })
  );
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key,
    new TextEncoder().encode(`${ts}:${rawBody}`)
  );
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === h1;
}

function response(body, status) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}
