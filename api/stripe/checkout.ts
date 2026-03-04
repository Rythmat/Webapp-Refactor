import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../lib/cors';
import { getUserFromRequest } from '../lib/jwt';
import { stripe, TIER_PRICES } from '../lib/stripe';
import { getSubscription } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { tier } = req.body as { tier?: string };
  if (!tier || !TIER_PRICES[tier]) {
    return res.status(400).json({ error: 'Invalid tier. Must be "artist" or "studio".' });
  }

  const priceId = TIER_PRICES[tier];
  if (!priceId) {
    return res.status(500).json({ error: `Stripe Price ID not configured for tier: ${tier}` });
  }

  try {
    const subscription = await getSubscription(user.user_id);

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/home?checkout=success`,
      cancel_url: `${baseUrl}/home?checkout=cancelled`,
      metadata: { userId: user.user_id },
    };

    // Reuse existing Stripe customer if available
    if (subscription.stripeCustomerId) {
      sessionParams.customer = subscription.stripeCustomerId;
    } else {
      sessionParams.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
