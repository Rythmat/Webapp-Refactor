// ── Shared Utilities for Collab API Endpoints ────────────────────────────
// Auth0 JWT verification + Upstash Redis helpers.

import { Redis } from '@upstash/redis';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ── Redis ───────────────────────────────────────────────────────────────

export function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ── Auth0 JWT Verification (RS256 via JWKS) ─────────────────────────────
// Signatures are verified against Auth0's published JWKS. This fails CLOSED: a
// missing / expired / tampered token, or an unconfigured environment, yields
// null (→ 401). It NEVER decodes without verifying — doing so would let any
// caller forge an arbitrary `sub` and impersonate any user across every
// endpoint that shares this helper.

interface TokenPayload {
  sub: string;
  [key: string]: unknown;
}

function auth0Config(): {
  issuer: string;
  audience: string;
  jwksUrl: URL;
} | null {
  const domain = process.env.AUTH0_DOMAIN ?? process.env.VITE_AUTH0_DOMAIN;
  const audience =
    process.env.AUTH0_AUDIENCE ?? process.env.VITE_AUTH0_AUDIENCE;
  if (!domain || !audience) return null;
  const issuer = process.env.AUTH0_ISSUER_BASE_URL ?? `https://${domain}/`;
  return {
    issuer,
    audience,
    jwksUrl: new URL(`https://${domain}/.well-known/jwks.json`),
  };
}

// Cache the JWKS across warm invocations (module scope survives on Vercel).
let jwksCache: {
  url: string;
  set: ReturnType<typeof createRemoteJWKSet>;
} | null = null;

function getJwks(url: URL): ReturnType<typeof createRemoteJWKSet> {
  const key = url.toString();
  if (!jwksCache || jwksCache.url !== key) {
    jwksCache = { url: key, set: createRemoteJWKSet(url) };
  }
  return jwksCache.set;
}

/**
 * Verify the Authorization header's Auth0 access token and return its payload
 * (with `sub`), or null if the token is missing, malformed, expired, has the
 * wrong issuer/audience, or fails signature verification.
 */
export async function verifyAuthToken(
  authHeader: string | null,
): Promise<TokenPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const config = auth0Config();
  if (!config) {
    console.error(
      '[auth] AUTH0_DOMAIN / AUTH0_AUDIENCE not configured — rejecting request',
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(config.jwksUrl), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return payload as TokenPayload;
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
