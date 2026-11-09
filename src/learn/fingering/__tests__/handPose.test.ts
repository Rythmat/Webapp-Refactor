import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LESSON_KEY_RANGE,
  keyBox,
} from '@/learn/keyboard/lessonKeyboardRange';
import type {
  FingeredNote,
  Hand,
  PianoFinger,
} from '@/lib/learn/pianoFingering';
import { handPositions, type HandGroup } from '../handFrames';
import {
  handPose,
  onScreen,
  placeHand,
  whiteKeyWidth,
  type KeyboardGeometry,
} from '../handPose';
import { HAND_POSE_ART, HAND_POSE_KEY } from '../handPoseArt';
import type { HandPoseLibrary } from '../handPoseTypes';

const lib: HandPoseLibrary = { key: HAND_POSE_KEY, poses: HAND_POSE_ART };

// The lesson keyboard at a laptop's width: 43 white keys, 26 px each.
const geo: KeyboardGeometry = {
  range: DEFAULT_LESSON_KEY_RANGE,
  width: 43 * 26,
  height: 141,
};
const W = whiteKeyWidth(geo);

const note = (
  hand: Hand,
  midi: number,
  finger: PianoFinger,
  index = midi,
): FingeredNote => ({
  index,
  midi,
  onset: 0,
  duration: 480,
  hand,
  finger,
  source: 'suggested',
});
const keysOf = (pairs: [PianoFinger, number][]) => new Map(pairs);
/** A melody or a run of chords, one group each. */
const groups = (hand: Hand, ...gs: [PianoFinger, number][][]): HandGroup[] =>
  gs.map((g, i) => ({
    onset: i * 480,
    notes: g.map(([f, m]) => note(hand, m, f, i * 10 + f)),
  }));

/** How far each finger's tip lands from its key: across in white keys, down as a share of the keys. */
function landing(hand: Hand, pairs: [PianoFinger, number][]) {
  const keys = keysOf(pairs);
  const placed = placeHand(hand, keys, geo, lib)!;
  const out: Record<number, { across: number; down: number }> = {};
  for (const [f, midi] of pairs) {
    const tip = placed.art.fingers[f]?.tip;
    if (!tip) continue;
    const [x, y] = onScreen(placed, tip);
    const k = keyBox(geo.range, midi)!;
    out[f] = {
      across: (x - (k.left + k.width / 2) * geo.width) / W,
      down: y / geo.height,
    };
  }
  return { placed, out };
}

describe('the hand drawings', () => {
  it('give every playing finger a tip and an inside', () => {
    for (const art of HAND_POSE_ART) {
      expect(art.plays.length).toBeGreaterThan(0);
      expect(art.uses.length).toBeGreaterThan(0);
      for (const use of art.uses)
        for (const f of use) expect(art.plays).toContain(f);
      for (const f of art.plays) {
        expect(art.fingers[f]?.tip).toHaveLength(2);
        expect(art.fingers[f]?.wash).toMatch(/^M/);
      }
      expect(art.paper).toMatch(/^M/);
      expect(art.lines).toMatch(/^M/);
    }
  });

  it('are set to one hand size: a relaxed hand’s fingertips nearly a key apart', () => {
    const neutral = HAND_POSE_ART.filter((a) => a.neutral);
    expect(neutral.length).toBeGreaterThanOrEqual(2);
    for (const art of neutral) {
      const span =
        Math.abs(art.fingers[5]!.tip[0] - art.fingers[2]!.tip[0]) /
        HAND_POSE_KEY;
      expect(span).toBeGreaterThan(2.1);
      expect(span).toBeLessThan(3.2);
    }
  });

  it('draw each hand as its player sees it: the left thumb right of the little finger', () => {
    for (const art of HAND_POSE_ART) {
      const thumb = art.fingers[1]?.tip;
      const little = art.fingers[5]?.tip;
      if (!thumb || !little) continue;
      if (art.hand === 'lh') expect(thumb[0]).toBeGreaterThan(little[0]);
      else expect(thumb[0]).toBeLessThan(little[0]);
    }
  });
});

describe('handPositions', () => {
  it('keeps a five-finger melody in one place', () => {
    // Mary had a little lamb, RH: E D C D E E E, 3 2 1 2 3 3 3.
    const { positions, at } = handPositions(
      groups(
        'rh',
        [[3, 64]],
        [[2, 62]],
        [[1, 60]],
        [[2, 62]],
        [[3, 64]],
        [[3, 64]],
      ),
      'rh',
    );
    expect(positions).toHaveLength(1);
    expect(at).toEqual([0, 0, 0, 0, 0, 0]);
    expect([...positions[0].keys]).toEqual(
      expect.arrayContaining([
        [1, 60],
        [2, 62],
        [3, 64],
      ]),
    );
  });

  it('moves when the thumb passes under', () => {
    // C major, RH: 1 2 3 1 2 3 4 5.
    const scale: [PianoFinger, number][][] = [
      [[1, 60]],
      [[2, 62]],
      [[3, 64]],
      [[1, 65]],
      [[2, 67]],
      [[3, 69]],
      [[4, 71]],
      [[5, 72]],
    ];
    const { positions, at } = handPositions(groups('rh', ...scale), 'rh');
    expect(positions).toHaveLength(2);
    expect(at).toEqual([0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('moves for a new chord, and stays for the same one again', () => {
    const c: [PianoFinger, number][] = [
      [1, 60],
      [3, 64],
      [5, 67],
    ];
    const f: [PianoFinger, number][] = [
      [1, 60],
      [3, 65],
      [5, 69],
    ];
    expect(handPositions(groups('rh', c, c), 'rh').positions).toHaveLength(1);
    expect(handPositions(groups('rh', c, f), 'rh').positions).toHaveLength(2);
  });

  it('moves for a leap past what the hand comfortably spans', () => {
    // LH: C3 with 5, then G4 with 1: more than an octave and a half.
    const { positions } = handPositions(
      groups('lh', [[5, 48]], [[1, 67]]),
      'lh',
    );
    expect(positions).toHaveLength(2);
  });
});

describe('placeHand', () => {
  it('puts a five-finger position on its keys: fingertips at the black keys’ ends, the thumb out at the front', () => {
    for (const hand of ['rh', 'lh'] as const) {
      const pairs: [PianoFinger, number][] =
        hand === 'rh'
          ? [
              [1, 60],
              [2, 62],
              [3, 64],
              [4, 65],
              [5, 67],
            ]
          : [
              [5, 48],
              [4, 50],
              [3, 52],
              [2, 53],
              [1, 55],
            ];
      const { placed, out } = landing(hand, pairs);
      expect(placed.use).toHaveLength(5);
      for (const [f, at] of Object.entries(out)) {
        expect(Math.abs(at.across)).toBeLessThan(0.35);
        expect(at.down).toBeGreaterThan(f === '1' ? 0.8 : 0.4);
        expect(at.down).toBeLessThanOrEqual(f === '1' ? 0.96 : 0.92);
      }
    }
  });

  it('shows a chord with the drawing of its fingers', () => {
    // C major in root position, 1-3-5; first inversion E G C, 1-2-5.
    expect(
      landing('rh', [
        [1, 60],
        [3, 64],
        [5, 67],
      ]).placed.use,
    ).toEqual([1, 3, 5]);
    expect(
      landing('rh', [
        [1, 64],
        [2, 67],
        [5, 72],
      ]).placed.use,
    ).toEqual([1, 2, 5]);
    // An octave in the left hand, 5 and 1.
    expect(
      landing('lh', [
        [5, 48],
        [1, 60],
      ]).placed.use,
    ).toEqual([1, 5]);
  });

  it('uses a drawing for each shape it serves', () => {
    // A power chord, thumb and middle finger: C and G.
    expect(
      landing('rh', [
        [1, 60],
        [3, 67],
      ]).placed.art.id,
    ).toBe('rh-power-chord-1-5');
    // Funk's left-hand root, third and seventh, D F C: the seventh-chord
    // spread with its index and ring finger hovering.
    const { placed, out } = landing('lh', [
      [5, 50],
      [3, 53],
      [1, 60],
    ]);
    expect(placed.art.id).toBe('lh-7th-chord-2');
    expect(placed.use).toEqual([1, 3, 5]);
    for (const f of Object.values(out))
      expect(Math.abs(f.across)).toBeLessThan(0.3);
  });

  it('shows a triad fingered thumb, index, ring with just those fingers out', () => {
    // C E G, 1-2-4: the index and ring reach, the middle and little finger curl.
    const { placed, out } = landing('rh', [
      [1, 60],
      [2, 64],
      [4, 67],
    ]);
    expect(placed.art.id).toBe('rh-124');
    expect(placed.use).toEqual([1, 2, 4]);
    for (const f of Object.values(out))
      expect(Math.abs(f.across)).toBeLessThan(0.3);
  });

  it('lands a chord’s tips on their keys', () => {
    const { out } = landing('rh', [
      [1, 60],
      [3, 64],
      [5, 67],
    ]);
    for (const f of Object.values(out))
      expect(Math.abs(f.across)).toBeLessThan(0.4);
  });

  it('reaches in among the black keys for a black key, the thumb still out at the front', () => {
    // D major, RH 1-3-5: the middle finger on F♯, its pad on the key
    // (black keys end at 0.62), the thumb on its key only to its first knuckle.
    const { out } = landing('rh', [
      [1, 62],
      [3, 66],
      [5, 69],
    ]);
    expect(out[3].down).toBeLessThan(0.6);
    expect(out[1].down).toBeGreaterThan(0.8);
    expect(Math.abs(out[3].across)).toBeLessThan(0.4);
  });

  it('keeps the right hand’s thumb left of its little finger, the left hand’s right', () => {
    const rh = placeHand(
      'rh',
      keysOf([
        [1, 60],
        [5, 67],
      ]),
      geo,
      lib,
    )!;
    const lh = placeHand(
      'lh',
      keysOf([
        [5, 48],
        [1, 55],
      ]),
      geo,
      lib,
    )!;
    const x = (p: typeof rh, f: PianoFinger) =>
      onScreen(p, p.art.fingers[f]!.tip)[0];
    expect(x(rh, 1)).toBeLessThan(x(rh, 5));
    expect(x(lh, 1)).toBeGreaterThan(x(lh, 5));
  });

  it('is the same for the same keys: a hand in place doesn’t move', () => {
    const keys = keysOf([
      [1, 60],
      [2, 62],
      [3, 64],
    ]);
    expect(placeHand('rh', keys, geo, lib)).toEqual(
      placeHand('rh', keys, geo, lib),
    );
  });
});

describe('four notes in close position', () => {
  // C E G B, and E G B D (3-5-7-9): thumb, index, ring, little finger.
  const shapes: [string, number[]][] = [
    ['C maj7', [60, 64, 67, 71]],
    ['3-5-7-9 of C', [64, 67, 71, 74]],
  ];
  for (const [name, midis] of shapes)
    it(`${name}: one drawing for the chord and its arpeggio`, () => {
      const fingers: PianoFinger[] = [1, 2, 4, 5];
      const pairs = midis.map(
        (m, i) => [fingers[i], m] as [PianoFinger, number],
      );
      const block = handPositions(groups('rh', pairs), 'rh');
      const broken = handPositions(
        groups('rh', ...pairs.map((p) => [p])),
        'rh',
      );
      expect(block.positions).toHaveLength(1);
      expect(broken.positions).toHaveLength(1);
      const a = placeHand('rh', block.positions[0].keys, geo, lib)!;
      const b = placeHand('rh', broken.positions[0].keys, geo, lib)!;
      expect(a.art.id).toBe(b.art.id);
      expect(a.use).toEqual([1, 2, 4, 5]);
      expect(a.mirror).toBe(1);
    });
});

describe('a seventh with the middle finger on a black key', () => {
  it('lands thumb, index, middle and little finger on their keys', () => {
    // D F A♭ C, 1 2 3 5.
    const { placed, out } = landing('rh', [
      [1, 62],
      [2, 65],
      [3, 68],
      [5, 72],
    ]);
    expect(placed.use).toEqual([1, 2, 3, 5]);
    for (const f of Object.values(out))
      expect(Math.abs(f.across)).toBeLessThan(0.3);
    expect(out[3].down).toBeLessThan(0.6);
  });
});

describe('handPose', () => {
  it('washes the finger that plays and the one that waits, and leaves the rest', () => {
    const position = {
      keys: keysOf([
        [1, 60],
        [2, 62],
        [3, 64],
      ]),
      first: 0,
      last: 2,
    };
    const placed = placeHand('rh', position.keys, geo, lib)!;
    const pose = handPose(
      'rh',
      {
        down: [note('rh', 60, 1)],
        hover: [note('rh', 62, 2)],
        at: 0,
        group: 0,
      },
      position,
      placed,
    );
    expect(pose.fingers[1].state).toBe('down');
    expect(pose.fingers[2].state).toBe('hover');
    expect(pose.fingers[3].state).toBe('idle');
    expect(pose.fingers[1].tip).not.toBeNull();
  });

  it('doesn’t wash a finger waiting for a key the hand isn’t over yet', () => {
    // Middle finger on E; the thumb next passes under to F.
    const position = {
      keys: keysOf([
        [1, 60],
        [2, 62],
        [3, 64],
      ]),
      first: 0,
      last: 2,
    };
    const placed = placeHand('rh', position.keys, geo, lib)!;
    const pose = handPose(
      'rh',
      {
        down: [note('rh', 64, 3)],
        hover: [note('rh', 65, 1)],
        at: 2,
        group: 2,
      },
      position,
      placed,
    );
    expect(pose.fingers[3].state).toBe('down');
    expect(pose.fingers[1].state).toBe('idle');
  });
});
