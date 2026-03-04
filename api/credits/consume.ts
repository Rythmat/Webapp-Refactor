import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../lib/cors';
import { getUserFromRequest } from '../lib/jwt';
import { consumeCredit } from '../lib/db';

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
    const { action } = req.body as { action?: string };
    const result = await consumeCredit(user.user_id);

    if (!result.success) {
      return res.status(402).json({ error: 'insufficient_credits', remaining: 0 });
    }

    console.log(`Credit consumed: user=${user.user_id} action=${action || 'unknown'} remaining=${result.remaining}`);

    return res.status(200).json({
      success: true,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('Credit consume error:', error);
    return res.status(500).json({ error: 'Failed to consume credit' });
  }
}
