// ── POST /api/collab/rooms — Create a new collaboration room ─────────────
// Returns: { roomId, projectName, ownerId, createdAt, members }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  setStoredRoom,
  corsHeaders,
  type StoredRoomMetadata,
} from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const user = verifyAuthToken(req.headers.authorization ?? null);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { projectName } = req.body ?? {};
  if (!projectName || typeof projectName !== 'string') {
    return res.status(400).json({ error: 'projectName is required' });
  }

  const roomId = crypto.randomUUID().slice(0, 12);
  const now = Date.now();

  const room: StoredRoomMetadata = {
    roomId,
    projectName,
    ownerId: user.sub,
    createdAt: now,
    members: {
      [user.sub]: { role: 'owner', joinedAt: now },
    },
  };

  const redis = getRedis();
  await setStoredRoom(redis, room);

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(201).json(room);
}
