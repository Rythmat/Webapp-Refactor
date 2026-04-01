// ── POST /api/collab/rooms/:id/join — Join a room with an invite token ───
// Body: { inviteToken: string }
// Returns: { role: 'editor' | 'viewer' }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  verifyInviteToken,
  getStoredRoom,
  setStoredRoom,
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

  // Verify the user's auth
  const user = verifyAuthToken(req.headers.authorization ?? null);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify the invite token
  const { inviteToken } = req.body ?? {};
  if (!inviteToken || typeof inviteToken !== 'string') {
    return res.status(400).json({ error: 'inviteToken is required' });
  }

  const invite = verifyInviteToken(inviteToken);
  if (!invite) {
    return res.status(401).json({ error: 'Invalid or expired invite token' });
  }

  if (invite.roomId !== roomId) {
    return res
      .status(400)
      .json({ error: 'Invite token does not match room ID' });
  }

  const redis = getRedis();
  const room = await getStoredRoom(redis, roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Add user to the room if not already a member
  if (!room.members[user.sub]) {
    room.members[user.sub] = {
      role: invite.role,
      joinedAt: Date.now(),
    };
    await setStoredRoom(redis, room);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ role: room.members[user.sub].role });
}
