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

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const roomId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!roomId || roomId.length > 128) {
    res.status(400).json({ error: 'Missing or invalid room ID' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const { targetUserId, role } = body;
  if (
    typeof targetUserId !== 'string' ||
    targetUserId.length < 1 ||
    targetUserId.length > 128 ||
    (role !== 'editor' && role !== 'viewer')
  ) {
    res.status(400).json({
      error:
        'Invalid body: need targetUserId (string) and role (editor|viewer)',
    });
    return;
  }

  // Bound the caller-supplied display strings that get stored and shown in the
  // target's invite list. React escapes them (no XSS), but cap length to keep a
  // hostile caller from storing huge / abusive text.
  const capString = (v: unknown, max: number): string =>
    typeof v === 'string' ? v.slice(0, max) : '';
  const projectName = capString(body.projectName, 100);
  const inviterName = capString(body.targetUserName, 60) || 'Someone';

  const redis = getRedis();

  // Rate-limit invite creation per caller to curb invite spam / phishing.
  const rlKey = `ratelimit:invite:${auth.sub}`;
  const count = await redis.incr(rlKey);
  if (count === 1) await redis.expire(rlKey, 3600);
  if (count > 30) {
    res.status(429).json({ error: 'Too many invites; please try again later' });
    return;
  }

  // When a room record exists, enforce that only an owner/editor may invite.
  // NOTE: studio/jam rooms are ephemeral and have NO server-side ownership
  // record, so this check cannot run for them — room access is instead gated by
  // the room code. Full server-enforced authorization requires moving room
  // membership into the backend (music-atlas-api).
  const room = await getStoredRoom(redis, roomId);
  if (room) {
    const callerMember = room.members[auth.sub];
    if (!callerMember || callerMember.role === 'viewer') {
      res
        .status(403)
        .json({ error: 'Only owners and editors can invite users' });
      return;
    }

    // Don't invite someone already in the room
    if (room.members[targetUserId]) {
      res.status(409).json({ error: 'User is already a member of this room' });
      return;
    }
  }

  await storePendingInvite(redis, targetUserId, {
    roomId,
    roomName: room?.projectName ?? (projectName || 'Studio Session'),
    invitedBy: auth.sub,
    inviterName,
    role,
    createdAt: Date.now(),
  });

  res.status(200).json({ success: true });
}
