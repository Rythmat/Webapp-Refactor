// ── GET/DELETE /api/collab/rooms/:id — Room metadata + deletion ──────────

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getStoredRoom,
  deleteStoredRoom,
  corsHeaders,
} from '../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  const roomId = req.query.id as string;
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const user = verifyAuthToken(req.headers.authorization ?? null);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const redis = getRedis();
  const room = await getStoredRoom(redis, roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    return res.status(200).json(room);
  }

  if (req.method === 'DELETE') {
    // Only the owner can delete
    if (room.ownerId !== user.sub) {
      return res.status(403).json({ error: 'Only the room owner can delete' });
    }
    await deleteStoredRoom(redis, roomId);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
