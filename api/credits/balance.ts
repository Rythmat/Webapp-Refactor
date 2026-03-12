import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyJsonRequest, resolveApiBaseUrl } from '../lib/apiProxy';
import { cors } from '../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiBaseUrl = resolveApiBaseUrl(req);

  try {
    const upstream = await proxyJsonRequest({
      apiBaseUrl,
      path: '/api/billing/credits/balance',
      method: 'GET',
      authHeader: req.headers.authorization,
    });

    return res.status(upstream.status).json(upstream.json);
  } catch (error) {
    console.error('Credits balance error:', error);
    return res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
}
