// ── POST /api/bio/list ───────────────────────────────────────────────────
// Body: { ids: string[] }. Returns { [id]: UserBioPreferences } for the PUBLIC
// bios among those ids (private + unset are omitted). Powers Connect discovery.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, getPublicBios } from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { ids } = (req.body ?? {}) as { ids?: unknown };
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
    res.status(400).json({ error: 'Invalid body: need ids: string[]' });
    return;
  }

  const redis = getRedis();
  const bios = await getPublicBios(redis, ids as string[]);
  res.status(200).json(bios);
}
