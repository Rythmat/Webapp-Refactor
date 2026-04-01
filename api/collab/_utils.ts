// ── Shared Utilities for Collab API Endpoints ────────────────────────────
// Auth0 JWT verification + Upstash Redis helpers.

import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

// ── Redis ───────────────────────────────────────────────────────────────

export function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ── Auth0 JWT Verification ──────────────────────────────────────────────

interface TokenPayload {
  sub: string;
  [key: string]: unknown;
}

/**
 * Verify the Authorization header and return the user's sub claim.
 * Returns null if invalid / missing.
 */
export function verifyAuthToken(
  authHeader: string | null,
): TokenPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  try {
    // In production, use Auth0's JWKS endpoint for RS256 verification.
    // For now, we verify with the shared secret or pass-through if
    // the API is behind an Auth0-protected gateway.
    const secret = process.env.AUTH0_CLIENT_SECRET ?? process.env.JWT_SECRET;
    if (!secret) {
      // If no secret is configured, decode without verification
      // (assumes request is authenticated upstream by Auth0 gateway)
      const decoded = jwt.decode(token) as TokenPayload | null;
      return decoded?.sub ? decoded : null;
    }
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}

// ── Invite Token ────────────────────────────────────────────────────────

const INVITE_SECRET =
  process.env.COLLAB_INVITE_SECRET ??
  process.env.JWT_SECRET ??
  'collab-invite-dev-secret';

export interface InviteTokenPayload {
  roomId: string;
  role: 'editor' | 'viewer';
  iat: number;
  exp: number;
}

export function signInviteToken(
  roomId: string,
  role: 'editor' | 'viewer',
  expiresInDays = 7,
): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * 86400;
  const token = jwt.sign({ roomId, role }, INVITE_SECRET, {
    expiresIn: `${expiresInDays}d`,
  });
  return { token, expiresAt: expiresAt * 1000 };
}

export function verifyInviteToken(token: string): InviteTokenPayload | null {
  try {
    return jwt.verify(token, INVITE_SECRET) as InviteTokenPayload;
  } catch {
    return null;
  }
}

// ── Room Metadata ───────────────────────────────────────────────────────

export interface StoredRoomMetadata {
  roomId: string;
  projectName: string;
  ownerId: string;
  createdAt: number;
  members: Record<
    string,
    { role: 'owner' | 'editor' | 'viewer'; joinedAt: number }
  >;
}

const ROOM_PREFIX = 'collab:room:';
const ROOM_TTL = 30 * 86400; // 30 days

export async function getStoredRoom(
  redis: Redis,
  roomId: string,
): Promise<StoredRoomMetadata | null> {
  return redis.get<StoredRoomMetadata>(`${ROOM_PREFIX}${roomId}`);
}

export async function setStoredRoom(
  redis: Redis,
  room: StoredRoomMetadata,
): Promise<void> {
  await redis.set(`${ROOM_PREFIX}${room.roomId}`, room, { ex: ROOM_TTL });
}

export async function deleteStoredRoom(
  redis: Redis,
  roomId: string,
): Promise<void> {
  await redis.del(`${ROOM_PREFIX}${roomId}`);
}

// ── Invite Keys ──────────────────────────────────────────────────────────

const INVITE_PREFIX = 'collab:invite:';
const INVITE_LIST_PREFIX = 'collab:invites:';
const INVITE_TTL = 7 * 86400; // 7 days

export interface PendingInvite {
  roomId: string;
  roomName: string;
  invitedBy: string;
  inviterName: string;
  role: 'editor' | 'viewer';
  createdAt: number;
}

export function inviteKey(targetUserId: string, roomId: string): string {
  return `${INVITE_PREFIX}${targetUserId}:${roomId}`;
}

export function inviteListKey(targetUserId: string): string {
  return `${INVITE_LIST_PREFIX}${targetUserId}`;
}

export async function storePendingInvite(
  redis: Redis,
  targetUserId: string,
  invite: PendingInvite,
): Promise<void> {
  const key = inviteKey(targetUserId, invite.roomId);
  await redis.set(key, invite, { ex: INVITE_TTL });
  // Add roomId to the user's invite list (dedup by removing first)
  const listKey = inviteListKey(targetUserId);
  await redis.lrem(listKey, 0, invite.roomId);
  await redis.rpush(listKey, invite.roomId);
  await redis.expire(listKey, INVITE_TTL);
}

export async function getPendingInvites(
  redis: Redis,
  userId: string,
): Promise<PendingInvite[]> {
  const listKey = inviteListKey(userId);
  const roomIds = await redis.lrange<string>(listKey, 0, -1);
  if (!roomIds.length) return [];

  const invites: PendingInvite[] = [];
  for (const roomId of roomIds) {
    const invite = await redis.get<PendingInvite>(inviteKey(userId, roomId));
    if (invite) invites.push(invite);
  }
  return invites;
}

export async function deletePendingInvite(
  redis: Redis,
  userId: string,
  roomId: string,
): Promise<void> {
  await redis.del(inviteKey(userId, roomId));
  await redis.lrem(inviteListKey(userId), 0, roomId);
}

// ── CORS + Response Helpers ─────────────────────────────────────────────

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
