/**
 * The chord-lane identity (plan decision D3): a region's chord as root,
 * quality and bass, trusted only while it still describes the region's name,
 * and dropped by every write that changes the name.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/chordIdentity.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  identityIsCurrent,
  isChordRegionIdentity,
  withoutIdentity,
  type ChordRegionIdentity,
} from '../chordIdentity';

/** F major over A, as a song chart in B♭ labels it ('5 maj/7', 'F/A'). */
const F_OVER_A: ChordRegionIdentity = {
  rootPc: 5,
  quality: 'major',
  bassPc: 9,
  source: 'given',
  label: '5 maj/7',
};

/** A chord-lane region as the store holds one, with its identity. */
function region(identity?: ChordRegionIdentity, name = '5 maj/7') {
  return {
    id: 'region-1',
    startTick: 0,
    endTick: 1920,
    name,
    noteName: 'F/A',
    color: [255, 128, 0] as [number, number, number],
    degreeKey: '5 major',
    midis: [57, 65, 69, 72],
    ...(identity ? { identity } : {}),
  };
}

describe('isChordRegionIdentity', () => {
  it('accepts an identity from each source', () => {
    for (const source of ['given', 'detected', 'derived'] as const) {
      expect(isChordRegionIdentity({ ...F_OVER_A, source })).toBe(true);
    }
  });

  it('accepts a root-position chord, where the bass is the root', () => {
    expect(
      isChordRegionIdentity({
        rootPc: 0,
        quality: 'minor7',
        bassPc: 0,
        source: 'detected',
        label: '1 m7',
      }),
    ).toBe(true);
  });

  it('accepts an empty label: an unnamed region can still be described', () => {
    expect(isChordRegionIdentity({ ...F_OVER_A, label: '' })).toBe(true);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'F/A'],
    ['a root outside 0–11', { ...F_OVER_A, rootPc: 12 }],
    ['a negative root', { ...F_OVER_A, rootPc: -1 }],
    ['a fractional bass', { ...F_OVER_A, bassPc: 9.5 }],
    ['a root given as text', { ...F_OVER_A, rootPc: '5' }],
    ['no bass', { ...F_OVER_A, bassPc: undefined }],
    ['an empty quality', { ...F_OVER_A, quality: '' }],
    [
      'a slash quality (the bass has its own field)',
      { ...F_OVER_A, quality: 'major/3' },
    ],
    ['an unknown source', { ...F_OVER_A, source: 'guessed' }],
    ['no label', { ...F_OVER_A, label: undefined }],
  ])('rejects %s', (_, value) => {
    expect(isChordRegionIdentity(value)).toBe(false);
  });
});

describe('identityIsCurrent', () => {
  it('trusts an identity that describes the region name', () => {
    expect(identityIsCurrent(region(F_OVER_A))).toBe(true);
  });

  it('is false for a region without one', () => {
    expect(identityIsCurrent(region())).toBe(false);
    expect(identityIsCurrent({ name: '5 maj/7', identity: undefined })).toBe(
      false,
    );
  });

  it('ignores an identity an older build kept through a rename', () => {
    // A build from before identities renames the region and leaves the
    // identity in place: it now describes a chord the region no longer names.
    expect(identityIsCurrent(region(F_OVER_A, 'Am'))).toBe(false);
  });

  it('compares the label exactly', () => {
    expect(identityIsCurrent(region(F_OVER_A, '5 maj/7 '))).toBe(false);
    expect(identityIsCurrent(region(F_OVER_A, '5 MAJ/7'))).toBe(false);
  });

  it('ignores a malformed identity, even with a matching label', () => {
    const broken = { ...F_OVER_A, rootPc: 14 };
    expect(identityIsCurrent(region(broken))).toBe(false);
  });
});

describe('withoutIdentity', () => {
  it('returns the same region when it has no identity', () => {
    const plain = region();
    expect(withoutIdentity(plain)).toBe(plain);
  });

  it('returns the same region when its identity is undefined', () => {
    const plain = { ...region(), identity: undefined };
    expect(withoutIdentity(plain)).toBe(plain);
  });

  it('drops the identity and keeps every other field', () => {
    const before = region(F_OVER_A);
    const after = withoutIdentity(before);
    expect(after).not.toBe(before);
    expect('identity' in after).toBe(false);
    expect(after).toStrictEqual(region());
  });

  it('leaves the region it was given untouched', () => {
    const before = region(F_OVER_A);
    withoutIdentity(before);
    expect(before.identity).toBe(F_OVER_A);
  });

  it('drops a stale or malformed identity too', () => {
    expect('identity' in withoutIdentity(region(F_OVER_A, 'Am'))).toBe(false);
    const broken = region({ ...F_OVER_A, rootPc: 99 });
    expect('identity' in withoutIdentity(broken)).toBe(false);
  });
});
