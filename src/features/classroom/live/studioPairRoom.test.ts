import { describe, expect, it } from 'vitest';
import {
  PAIR_ROOM_CODE_PATTERN,
  pairHostHref,
  pairPartnerHref,
  pairRoomCode,
  soloStudioHref,
} from './studioPairRoom';

describe('pairRoomCode', () => {
  it('gives every member of a pair the same code', () => {
    const fromHost = pairRoomCode('sess-1', ['enr-a', 'enr-b']);
    const fromPartner = pairRoomCode('sess-1', ['enr-b', 'enr-a']);
    expect(fromPartner).toBe(fromHost);
    // A trio, listed in any order.
    expect(pairRoomCode('sess-1', ['enr-c', 'enr-a', 'enr-b'])).toBe(
      pairRoomCode('sess-1', ['enr-a', 'enr-b', 'enr-c']),
    );
  });

  it('is the same every time it is worked out', () => {
    expect(pairRoomCode('sess-1', ['enr-a', 'enr-b'])).toBe(
      pairRoomCode('sess-1', ['enr-a', 'enr-b']),
    );
  });

  it('differs for another session or another group', () => {
    const code = pairRoomCode('sess-1', ['enr-a', 'enr-b']);
    expect(pairRoomCode('sess-2', ['enr-a', 'enr-b'])).not.toBe(code);
    // After a re-shuffle `pair-0` may be different people: a new room.
    expect(pairRoomCode('sess-1', ['enr-a', 'enr-c'])).not.toBe(code);
    expect(pairRoomCode('sess-1', ['enr-a', 'enr-b', 'enr-c'])).not.toBe(code);
  });

  it('is lowercase and fixed-length, so joining by id cannot alter it', () => {
    const codes = Array.from({ length: 200 }, (_, i) =>
      pairRoomCode(`session-${i}`, [`Enr-${i}`, `ENR-${i + 1}`]),
    );
    for (const code of codes) {
      expect(code).toMatch(PAIR_ROOM_CODE_PATTERN);
      expect(code.trim().toLowerCase()).toBe(code);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('the pair links', () => {
  it('opens the host as owner and partners as joiners of the same room', () => {
    const code = pairRoomCode('sess-1', ['enr-a', 'enr-b']);
    expect(pairHostHref(code)).toBe(`/studio?collab=${code}&host=1`);
    expect(pairPartnerHref(code)).toBe(`/studio?collab=${code}&pair=1`);
    expect(soloStudioHref()).toBe('/studio?new=1');
  });
});
