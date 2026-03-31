// ── POST /api/collab/rooms/:id/invite-user ─────────────────────────────
// Invite a user to a room by their userId.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getStoredRoom,
  storePendingInvite,
} from '../../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const roomId = req.query.id as string;
  if (!roomId) {
    res.status(400).json({ error: 'Missing room ID' });
    return;
  }

  const { targetUserId, targetUserName, role } = req.body ?? {};
  if (!targetUserId || !role || !['editor', 'viewer'].includes(role)) {
    res
      .status(400)
      .json({
        error: 'Invalid body: need targetUserId and role (editor|viewer)',
      });
    return;
  }

  const redis = getRedis();
  const room = await getStoredRoom(redis, roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  // Only owner or editor can invite
  const callerMember = room.members[auth.sub];
  if (!callerMember || callerMember.role === 'viewer') {
    res.status(403).json({ error: 'Only owners and editors can invite users' });
    return;
  }

  // Don't invite someone already in the room
  if (room.members[targetUserId]) {
    res.status(409).json({ error: 'User is already a member of this room' });
    return;
  }

  await storePendingInvite(redis, targetUserId, {
    roomId,
    roomName: room.projectName,
    invitedBy: auth.sub,
    inviterName: targetUserName ? String(targetUserName) : 'Someone',
    role,
    createdAt: Date.now(),
  });

  res.status(200).json({ success: true });
}
