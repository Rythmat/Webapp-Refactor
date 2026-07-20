// ── Shared helpers for the Connections API ───────────────────────────────
// A mutual user-connection graph persisted in Upstash Redis, mirroring the
// collab invite pattern (api/collab/*). Auth (Auth0 `sub` == app user id) and
// the Redis client are reused from ../collab/_utils.
//
// All mutations run as atomic Lua scripts (redis.eval). Redis executes Lua
// serially, so a request/accept/decline/remove is applied all-or-nothing and
// two concurrent requests can never interleave — this is what keeps the graph
// symmetric (no half-connected state) and race-free (no check-then-act window).

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils';

// Redis sets, keyed by user id:
//   conn:accepted:<id> — connected user ids (mutual)
//   conn:incoming:<id> — ids who requested me (awaiting my accept)
//   conn:outgoing:<id> — ids I requested (awaiting their accept)
const ACCEPTED_PREFIX = 'conn:accepted:';
const INCOMING_PREFIX = 'conn:incoming:';
const OUTGOING_PREFIX = 'conn:outgoing:';

export const acceptedKey = (userId: string): string =>
  `${ACCEPTED_PREFIX}${userId}`;
export const incomingKey = (userId: string): string =>
  `${INCOMING_PREFIX}${userId}`;
export const outgoingKey = (userId: string): string =>
  `${OUTGOING_PREFIX}${userId}`;

export interface ConnectionSets {
  /** Accepted, mutual connections. */
  connections: string[];
  /** Pending requests others sent me (I can accept/decline). */
  incoming: string[];
  /** Pending requests I sent (awaiting their response). */
  outgoing: string[];
}

export async function getConnectionSets(
  redis: Redis,
  userId: string,
): Promise<ConnectionSets> {
  const [connections, incoming, outgoing] = await Promise.all([
    redis.smembers(acceptedKey(userId)),
    redis.smembers(incomingKey(userId)),
    redis.smembers(outgoingKey(userId)),
  ]);
  return { connections, incoming, outgoing };
}

// ── Atomic mutations (Lua) ───────────────────────────────────────────────

// Send a request from `me` to `target`. Idempotent. If `target` already
// requested `me` (reciprocal), connect both sides immediately.
// KEYS = [acceptedMe, incomingMe, outgoingMe, acceptedTarget, incomingTarget, outgoingTarget]
// ARGV = [me, target]  →  returns 'connected' | 'requested'
const REQUEST_SCRIPT = `
local me = ARGV[1]
local target = ARGV[2]
if redis.call('SISMEMBER', KEYS[1], target) == 1 then
  return 'connected'
end
if redis.call('SISMEMBER', KEYS[2], target) == 1 then
  redis.call('SADD', KEYS[1], target)
  redis.call('SADD', KEYS[4], me)
  redis.call('SREM', KEYS[2], target)
  redis.call('SREM', KEYS[6], me)
  redis.call('SREM', KEYS[3], target)
  redis.call('SREM', KEYS[5], me)
  return 'connected'
end
redis.call('SADD', KEYS[5], me)
redis.call('SADD', KEYS[3], target)
return 'requested'
`;

// Respond to an incoming request from `requester`. Requires the request to be
// pending. Accept adds both accepted sides; either way both pendings are cleared.
// KEYS = [incomingMe, acceptedMe, acceptedRequester, outgoingRequester]
// ARGV = [me, requester, accept('1'|'0')]  →  returns 'ok' | 'notfound'
const RESPOND_SCRIPT = `
local me = ARGV[1]
local requester = ARGV[2]
if redis.call('SISMEMBER', KEYS[1], requester) == 0 then
  return 'notfound'
end
if ARGV[3] == '1' then
  redis.call('SADD', KEYS[2], requester)
  redis.call('SADD', KEYS[3], me)
end
redis.call('SREM', KEYS[1], requester)
redis.call('SREM', KEYS[4], me)
return 'ok'
`;

// Remove an accepted connection and/or cancel any pending request between the
// two users, in every direction.
// KEYS = [acceptedMe, acceptedOther, incomingMe, outgoingOther, outgoingMe, incomingOther]
// ARGV = [me, other]
const REMOVE_SCRIPT = `
redis.call('SREM', KEYS[1], ARGV[2])
redis.call('SREM', KEYS[2], ARGV[1])
redis.call('SREM', KEYS[3], ARGV[2])
redis.call('SREM', KEYS[4], ARGV[1])
redis.call('SREM', KEYS[5], ARGV[2])
redis.call('SREM', KEYS[6], ARGV[1])
return 'ok'
`;

export async function requestConnectionTx(
  redis: Redis,
  me: string,
  target: string,
): Promise<'connected' | 'requested'> {
  const status = await redis.eval(
    REQUEST_SCRIPT,
    [
      acceptedKey(me),
      incomingKey(me),
      outgoingKey(me),
      acceptedKey(target),
      incomingKey(target),
      outgoingKey(target),
    ],
    [me, target],
  );
  return status as 'connected' | 'requested';
}

export async function respondConnectionTx(
  redis: Redis,
  me: string,
  requester: string,
  accept: boolean,
): Promise<'ok' | 'notfound'> {
  const result = await redis.eval(
    RESPOND_SCRIPT,
    [
      incomingKey(me),
      acceptedKey(me),
      acceptedKey(requester),
      outgoingKey(requester),
    ],
    [me, requester, accept ? '1' : '0'],
  );
  return result as 'ok' | 'notfound';
}

export async function removeConnectionTx(
  redis: Redis,
  me: string,
  other: string,
): Promise<void> {
  await redis.eval(
    REMOVE_SCRIPT,
    [
      acceptedKey(me),
      acceptedKey(other),
      incomingKey(me),
      outgoingKey(other),
      outgoingKey(me),
      incomingKey(other),
    ],
    [me, other],
  );
}
