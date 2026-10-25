/**
 * The Studio room a teacher-made pair meets in.
 *
 * Every member of a pair works the code out for themselves from the session
 * and the pair's members, so the host and partners land in one room with no
 * code read aloud and nothing added to the session contract. In-app invites
 * no longer exist (the People panel's room code is the only invite), so the
 * code is the whole handshake.
 *
 *  - The members are sorted, so every member computes the same code.
 *  - A pair is identified by its members, not its id: `PairingPanel` numbers
 *    pairs by position (`pair-0`, `pair-1`…), so after a re-shuffle `pair-0`
 *    is different people, who must not land in the old pair's room. A group a
 *    re-shuffle leaves unchanged keeps its room.
 *  - The session is part of the key, so next lesson's pair gets a fresh room.
 *  - Lowercase only: joining by id lowercases it (`CollabProvider`), the host
 *    path does not, and a mixed-case code would put them in different rooms.
 */

import { StudioRoutes } from '@/constants/routes';

/** `cls` plus 12 hex digits — never a room `createAndJoinRoom` mints (8). */
export const PAIR_ROOM_CODE_PATTERN = /^cls[0-9a-f]{12}$/;

/**
 * cyrb53, a small well-mixed 53-bit string hash. Not cryptographic: it only
 * has to make two classes' rooms differ, not be hard to guess (a room code
 * typed into "Join Room" is no harder).
 */
const hash53 = (text: string): number => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** The room code for one pair (or trio) in one live session. */
export const pairRoomCode = (
  sessionId: string,
  enrollmentIds: readonly string[],
): string => {
  const members = [...enrollmentIds].sort().join(',');
  const digits = hash53(`${sessionId}|${members}`)
    .toString(16)
    .padStart(14, '0')
    .slice(-12);
  return `cls${digits}`;
};

/** The Studio URL the pair's host opens: it creates the room as owner. */
export const pairHostHref = (code: string): string =>
  `${StudioRoutes.editor()}?collab=${code}&host=1`;

/**
 * The Studio URL a partner opens: it joins the room, and keeps trying until
 * the host has opened it (`pair=1` gives the long classroom wait).
 */
export const pairPartnerHref = (code: string): string =>
  `${StudioRoutes.editor()}?collab=${code}&pair=1`;

/** Solo grouping: a fresh project of one's own. */
export const soloStudioHref = (): string => `${StudioRoutes.editor()}?new=1`;
