/**
 * POST /api/verify-subscription
 * Returns the active Paddle subscription for a given email.
 * Called by the TikBoosTTS desktop app after checkout.
 *
 * Required environment variables:
 *   PADDLE_PRO_PRICE_ID   — pri_XXXX for the Pro plan
 *   PADDLE_ELITE_PRICE_ID — pri_XXXX for the Elite plan
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let email;
  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!email) {
    return json({ error: 'email required' }, 400);
  }

  // Build price → plan map from environment variables
  const PRICE_PLAN = {
    [env.PADDLE_PRO_PRICE_ID   ?? '']: 'pro',
    [env.PADDLE_ELITE_PRICE_ID ?? '']: 'elite',
  };

  // Query D1 for the most recent active/trialing subscription for this email
  let row;
  try {
    const result = await env.DB.prepare(`
      SELECT subscription_id, customer_id, price_id, status, renews_at
      FROM   subscriptions
      WHERE  email  = ?
        AND  status IN ('active', 'trialing')
      ORDER  BY updated_at DESC
      LIMIT  1
    `).bind(email).first();
    row = result;
  } catch (err) {
    console.error('D1 error:', err);
    return json({ error: 'DB error' }, 500);
  }

  if (!row) {
    return json({ active: false, plan: 'free', status: 'inactive' });
  }

  const plan = PRICE_PLAN[row.price_id] ?? 'pro';

  return json({
    active:          true,
    plan,
    status:          row.status,
    subscription_id: row.subscription_id,
    customer_id:     row.customer_id,
    renews_at:       row.renews_at ?? null,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
