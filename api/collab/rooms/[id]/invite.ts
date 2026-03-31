// ── POST /api/collab/rooms/:id/invite — Generate an invite link ──────────
// Body: { role: 'editor' | 'viewer' }
// Returns: { inviteUrl, token, expiresAt }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getStoredRoom,
  signInviteToken,
  corsHeaders,
} from '../../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  // Only owner or editor can create invites
  const member = room.members[user.sub];
  if (!member || member.role === 'viewer') {
    return res.status(403).json({ error: 'Insufficient permissions to create invite' });
  }

  const { role } = req.body ?? {};
  if (role !== 'editor' && role !== 'viewer') {
    return res.status(400).json({ error: 'role must be "editor" or "viewer"' });
  }

  const { token: inviteToken, expiresAt } = signInviteToken(roomId, role);

  const origin = req.headers.origin ?? req.headers.referer ?? 'https://app.musicatlas.com';
  const baseUrl = typeof origin === 'string' ? origin.replace(/\/$/, '') : 'https://app.musicatlas.com';
  const inviteUrl = `${baseUrl}/studio/join?room=${roomId}&token=${inviteToken}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(201).json({ inviteUrl, token: inviteToken, expiresAt });
}
