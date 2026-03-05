import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../lib/cors';
import { getSubscription } from '../lib/db';
import { getUserFromRequest } from '../lib/jwt';
import { stripe } from '../lib/stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const subscription = await getSubscription(user.user_id);

    if (!subscription.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const returnUrl = `${proto}://${host}/home`;

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
