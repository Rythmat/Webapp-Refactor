// ── POST /api/collab/invites/respond ─────────────────────────────────────
// Accept or decline a pending collab invite.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getStoredRoom,
  setStoredRoom,
  deletePendingInvite,
  inviteKey,
  type PendingInvite,
} from '../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { roomId, accept } = req.body ?? {};
  if (!roomId || typeof accept !== 'boolean') {
    res.status(400).json({ error: 'Invalid body: need roomId (string) and accept (boolean)' });
    return;
  }

  const redis = getRedis();

  // Verify the invite exists
  const invite = await redis.get<PendingInvite>(inviteKey(auth.sub, roomId));
  if (!invite) {
    res.status(404).json({ error: 'Invite not found or expired' });
    return;
  }

  if (accept) {
    // Add user to room members
    const room = await getStoredRoom(redis, roomId);
    if (room) {
      room.members[auth.sub] = {
        role: invite.role,
        joinedAt: Date.now(),
      };
      await setStoredRoom(redis, room);
    }
  }

  // Delete the invite either way
  await deletePendingInvite(redis, auth.sub, roomId);

  res.status(200).json({ success: true, accepted: accept });
}
