/* eslint-disable import/no-default-export */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyJsonRequest, resolveApiBaseUrl } from '../lib/apiProxy';
import { cors } from '../lib/cors';
import { stripe, TIER_PRICES } from '../lib/stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiBaseUrl = resolveApiBaseUrl(req);

  const { tier } = req.body as { tier?: string };
  if (!tier || !TIER_PRICES[tier]) {
    return res
      .status(400)
      .json({ error: 'Invalid tier. Must be "artist" or "studio".' });
  }

  const priceId = TIER_PRICES[tier];
  if (!priceId) {
    return res
      .status(500)
      .json({ error: `Stripe Price ID not configured for tier: ${tier}` });
  }

  try {
    const subscriptionResponse = await proxyJsonRequest({
      apiBaseUrl,
      path: '/api/billing/subscription',
      method: 'GET',
      authHeader: req.headers.authorization,
    });

    if (!subscriptionResponse.ok) {
      return res
        .status(subscriptionResponse.status)
        .json(subscriptionResponse.json);
    }

    const subscription = subscriptionResponse.json as {
      stripeCustomerId?: string | null;
    };

    const meResponse = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/auth/me`, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    if (!meResponse.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const me = (await meResponse.json()) as { id: string };

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] =
      {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/home?checkout=success`,
        cancel_url: `${baseUrl}/home?checkout=cancelled`,
        metadata: { userId: me.id },
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
