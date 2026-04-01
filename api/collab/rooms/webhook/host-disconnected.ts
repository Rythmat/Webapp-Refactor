// ── POST /api/collab/rooms/webhook/host-disconnected ──────────────────────
// Called by the PartyKit server when the room host disconnects.
// Verifies the request using PARTYKIT_WEBHOOK_SECRET, then deletes the
// room from Redis so it no longer appears in room listings.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, deleteStoredRoom, corsHeaders } from '../../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret
  const secret = process.env.PARTYKIT_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const { roomId } = req.body ?? {};
  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'roomId is required' });
  }

  const redis = getRedis();
  await deleteStoredRoom(redis, roomId);

  return res.status(200).json({ ok: true });
}
