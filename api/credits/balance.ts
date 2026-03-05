import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../lib/cors';
import { getCredits, getSubscription } from '../lib/db';
import { getUserFromRequest } from '../lib/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [credits, subscription] = await Promise.all([
      getCredits(user.user_id),
      getSubscription(user.user_id),
    ]);

    return res.status(200).json({
      balance: credits.balance,
      lifetimeUsed: credits.lifetimeUsed,
      tier: subscription.tier,
    });
  } catch (error) {
    console.error('Credits balance error:', error);
    return res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
}
