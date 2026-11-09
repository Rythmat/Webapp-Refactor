import { describe, expect, it } from 'vitest';
import {
  buildFingeringTimeline,
  inferHands,
  suggestFingering,
  type FingeringContext,
  type FingeringInputNote,
  type Hand,
} from '..';
import { scaleTable } from '../scaleTables';

/** One note a beat, in order. */
const line = (midis: number[], hand?: Hand): FingeringInputNote[] =>
  midis.map((midi, i) => ({
    midi,
    onset: i * 480,
    duration: 480,
    ...(hand ? { hand } : {}),
  }));

/** All at once. */
const chord = (midis: number[], hand?: Hand): FingeringInputNote[] =>
  midis.map((midi) => ({
    midi,
    onset: 0,
    duration: 960,
    ...(hand ? { hand } : {}),
  }));

const fingers = (notes: FingeringInputNote[], ctx: FingeringContext = {}) =>
  suggestFingering(notes, ctx)
    .map((f) => f.finger ?? '-')
    .join('');

const INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 11], // harmonic
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorBlues: [0, 3, 5, 6, 7, 10],
  majorBlues: [0, 2, 3, 4, 7, 9],
};

/** The scale up `octaves` octaves from `bottom` (a tonic). */
function scaleUp(bottom: number, intervals: number[], octaves: number) {
  const out: number[] = [];
  for (let o = 0; o < octaves; o++)
    for (const i of intervals) out.push(bottom + 12 * o + i);
  out.push(bottom + 12 * octaves);
  return out;
}

const ctxFor = (tonicPc: number, kind: string, hand: Hand) => ({
  tonicPc,
  scalePcs: INTERVALS[kind].map((i) => (tonicPc + i) % 12),
  defaultHand: hand,
});

describe('scales, by the tables', () => {
  it('C major, right hand, two octaves up and down', () => {
    const up = scaleUp(60, INTERVALS.major, 2);
    const ctx = ctxFor(0, 'major', 'rh');
    expect(fingers(line(up), ctx)).toBe('123123412312345');
    expect(fingers(line([...up].reverse()), ctx)).toBe('543213214321321');
  });

  it('C major, left hand, two octaves', () => {
    const up = scaleUp(36, INTERVALS.major, 2);
    expect(fingers(line(up), ctxFor(0, 'major', 'lh'))).toBe('543213214321321');
  });

  it('the black-key majors start where ABRSM starts them', () => {
    // B♭ major RH 4 1 2 3 1 2 3 4; E♭ major RH 3 1 2 3 4 1 2 3.
    expect(
      fingers(line(scaleUp(58, INTERVALS.major, 1)), ctxFor(10, 'major', 'rh')),
    ).toBe('41231234');
    expect(
      fingers(line(scaleUp(63, INTERVALS.major, 1)), ctxFor(3, 'major', 'rh')),
    ).toBe('31234123');
    // B major LH 4 3 2 1 4 3 2 1; F♯ major LH 4 3 2 1 3 2 1 4.
    expect(
      fingers(line(scaleUp(47, INTERVALS.major, 1)), ctxFor(11, 'major', 'lh')),
    ).toBe('43214321');
    expect(
      fingers(line(scaleUp(42, INTERVALS.major, 1)), ctxFor(6, 'major', 'lh')),
    ).toBe('43213214');
  });

  it("Peter's pentatonic and blues fingerings, right hand", () => {
    // C minor pentatonic: 123 12(3). B♭ major pentatonic: 21231(2).
    expect(
      fingers(
        line(scaleUp(60, INTERVALS.minorPentatonic, 1)),
        ctxFor(0, 'minorPentatonic', 'rh'),
      ),
    ).toBe('123123');
    expect(
      fingers(
        line(scaleUp(58, INTERVALS.majorPentatonic, 1)),
        ctxFor(10, 'majorPentatonic', 'rh'),
      ),
    ).toBe('212312');
    // A♭ and D♭ major pentatonic: 2 3 1 2 3 (4), the thumb on the white key.
    expect(
      fingers(
        line(scaleUp(56, INTERVALS.majorPentatonic, 1)),
        ctxFor(8, 'majorPentatonic', 'rh'),
      ),
    ).toBe('231234');
    expect(
      fingers(
        line(scaleUp(61, INTERVALS.majorPentatonic, 1)),
        ctxFor(1, 'majorPentatonic', 'rh'),
      ),
    ).toBe('231234');
    // G minor blues 123412(3); B major blues 121234(5).
    expect(
      fingers(
        line(scaleUp(55, INTERVALS.minorBlues, 1)),
        ctxFor(7, 'minorBlues', 'rh'),
      ),
    ).toBe('1234123');
    expect(
      fingers(
        line(scaleUp(59, INTERVALS.majorBlues, 1)),
        ctxFor(11, 'majorBlues', 'rh'),
      ),
    ).toBe('1212345');
  });

  it('follows every table there is, in every key, both ways, two octaves', () => {
    const misses: string[] = [];
    for (const kind of Object.keys(INTERVALS))
      for (const hand of ['rh', 'lh'] as const)
        for (let tonic = 0; tonic < 12; tonic++) {
          const ctx = ctxFor(tonic, kind, hand);
          const table = scaleTable(tonic, ctx.scalePcs, hand);
          if (!table) continue;
          const f = table.fingers.join('');
          const n = table.pcs.length;
          const bottom =
            (hand === 'rh' ? 60 : 36) + tonic - (tonic >= 6 ? 12 : 0);
          // Two octaves up: the degree fingers twice; the octave finger at
          // the run's own end (RH top, LH bottom).
          const expected =
            hand === 'rh'
              ? f.slice(0, n) + f.slice(0, n) + f[n]
              : f[0] + f.slice(1, n) + f[n] + f.slice(1, n) + f[n];
          const up = scaleUp(bottom, INTERVALS[kind], 2);
          const gotUp = fingers(line(up), ctx);
          const gotDown = fingers(line([...up].reverse()), ctx);
          const label = `${kind} ${hand} pc${tonic}`;
          if (gotUp !== expected)
            misses.push(`${label} up ${gotUp} ≠ ${expected}`);
          if (gotDown !== [...expected].reverse().join(''))
            misses.push(`${label} down ${gotDown}`);
        }
    expect(misses).toEqual([]);
  });
});

describe('five-finger positions', () => {
  it('C to G is 1 2 3 4 5 in the right hand, 5 4 3 2 1 in the left', () => {
    expect(fingers(line([60, 62, 64, 65, 67], 'rh'))).toBe('12345');
    expect(fingers(line([48, 50, 52, 53, 55], 'lh'))).toBe('54321');
  });

  it('Mary had a little lamb', () => {
    expect(fingers(line([64, 62, 60, 62, 64, 64, 64], 'rh'))).toBe('3212333');
  });

  it('a triad inside the position is 1 3 5', () => {
    expect(fingers(chord([60, 64, 67], 'rh'))).toBe('135');
  });
});

describe('chords', () => {
  it('triads and their inversions', () => {
    expect(fingers(chord([64, 67, 72], 'rh'))).toBe('125'); // first inversion
    expect(fingers(chord([48, 52, 55], 'lh'))).toBe('531'); // root position
    expect(fingers(chord([43, 48, 52], 'lh'))).toBe('521'); // second inversion
  });

  it('sevenths and octaves', () => {
    // Four notes in close position: the right hand 1 2 4 5, chord or
    // arpeggio, root position or from the third (3-5-7-9).
    expect(fingers(chord([60, 64, 67, 71], 'rh'))).toBe('1245');
    expect(fingers(chord([64, 67, 71, 74], 'rh'))).toBe('1245');
    expect(fingers(line([60, 64, 67, 71], 'rh'))).toBe('1245');
    expect(fingers(chord([62, 66, 69, 73], 'rh'))).toBe('1245'); // D F♯ A C♯
    // Only the third note up black: the middle finger takes it.
    expect(fingers(chord([62, 65, 68, 72], 'rh'))).toBe('1235'); // D F A♭ C
    expect(fingers(chord([63, 67, 70, 74], 'rh'))).toBe('1235'); // E♭ G B♭ D
    expect(fingers(line([63, 67, 70, 74], 'rh'))).toBe('1235');
    expect(fingers(chord([48, 52, 55, 59], 'lh'))).toBe('5321');
    expect(fingers(chord([60, 72], 'rh'))).toBe('15');
  });

  it('a root-position triad is 1 3 5, whatever its third (never 1 2 5)', () => {
    // Played up one note at a time, then held, as theory lessons play them.
    const upThenHold = (midis: number[]) => [
      ...line(midis, 'rh'),
      ...chord(midis, 'rh').map((n) => ({ ...n, onset: 1440 })),
    ];
    expect(fingers(upThenHold([62, 65, 69]))).toBe('135135'); // D F A
    expect(fingers(upThenHold([71, 74, 77]))).toBe('135135'); // B D F
    expect(fingers(chord([69, 72, 76], 'rh'))).toBe('135'); // A C E
    expect(fingers(chord([45, 48, 52], 'lh'))).toBe('531');
  });

  it('or 1 2 4, as genre lessons play them; the left hand keeps 5 3 1', () => {
    const ctx: FingeringContext = { rootTriad: '124' };
    expect(fingers(chord([60, 64, 67], 'rh'), ctx)).toBe('124'); // C E G
    expect(fingers(chord([62, 65, 69], 'rh'), ctx)).toBe('124'); // D F A
    expect(fingers(chord([71, 74, 77], 'rh'), ctx)).toBe('124'); // B D F
    expect(fingers(line([60, 64, 67], 'rh'), ctx)).toBe('124');
    expect(fingers(chord([48, 52, 55], 'lh'), ctx)).toBe('531');
    expect(fingers(line([45, 48, 52], 'lh'), ctx)).toBe('531');
    // Inversions, sevenths and the octave arpeggio keep their shapes.
    expect(fingers(chord([64, 67, 72], 'rh'), ctx)).toBe('125');
    expect(fingers(chord([67, 72, 76], 'rh'), ctx)).toBe('135');
    expect(fingers(chord([60, 64, 67, 71], 'rh'), ctx)).toBe('1245');
    expect(fingers(line([60, 64, 67, 72], 'rh'), ctx)).toBe('1235');
  });

  it('a one-octave arpeggio takes its shape', () => {
    expect(fingers(line([60, 64, 67, 72], 'rh'))).toBe('1235');
    expect(fingers(line([48, 52, 55, 60], 'lh'))).toBe('5421');
  });

  it('leaves a chord of more than five notes in one hand unfingered', () => {
    const f = suggestFingering(chord([60, 62, 64, 65, 67, 69], 'rh'));
    expect(f.every((n) => n.finger === null)).toBe(true);
  });
});

describe('what the lesson says', () => {
  it('fingers the notes around a pin by what plays, never crossing to keep the table', () => {
    // D minor pentatonic up, the first D pinned to 3: the table would put
    // the index on F, reaching back over the middle finger.
    const notes = line(scaleUp(62, INTERVALS.minorPentatonic, 1), 'rh');
    notes[0] = { ...notes[0], finger: 3 };
    const f = suggestFingering(notes, ctxFor(2, 'minorPentatonic', 'rh'));
    expect(f[0].finger).toBe(3);
    // Going up, a finger lower than the last is only ever the thumb passing under.
    for (let i = 1; i < f.length; i++)
      if (f[i].finger! < f[i - 1].finger!)
        expect(f[i].finger, `note ${i}`).toBe(1);
  });

  it('keeps the table where a pin agrees with it', () => {
    const notes = line(scaleUp(62, INTERVALS.minorPentatonic, 1), 'rh');
    const free = fingers(notes, ctxFor(2, 'minorPentatonic', 'rh'));
    notes[2] = { ...notes[2], finger: Number(free[2]) as 1 | 2 | 3 | 4 | 5 };
    expect(fingers(notes, ctxFor(2, 'minorPentatonic', 'rh'))).toBe(free);
  });

  it('keeps an authored finger, and fits the notes around it', () => {
    const notes = line([60, 62, 64, 65, 67, 69, 71, 72], 'rh');
    notes[3] = { ...notes[3], finger: 4 }; // F with 4: the run crosses later
    const f = suggestFingering(notes, ctxFor(0, 'major', 'rh'));
    expect(f[3]).toEqual({ hand: 'rh', finger: 4, source: 'authored' });
    expect(f.filter((n) => n.source === 'authored')).toHaveLength(1);
    // No finger plays two different keys in a row.
    for (let i = 1; i < f.length; i++)
      expect(f[i].finger, `note ${i}`).not.toBe(f[i - 1].finger);
  });

  it('never needs a hand to give a finger', () => {
    const f = suggestFingering(line([60, 62, 64]), { defaultHand: 'rh' });
    expect(f.map((n) => n.hand)).toEqual(['rh', 'rh', 'rh']);
  });

  it('gives the same answer every time', () => {
    const notes = line([60, 67, 62, 71, 65, 64, 72, 59, 60]);
    expect(suggestFingering(notes)).toEqual(suggestFingering(notes));
  });
});

describe('which hand plays', () => {
  it('splits a two-hand voicing where the staff does', () => {
    // Piano Fundamentals 6.2a: C major in both hands.
    expect(inferHands(chord([48, 52, 55, 60, 64, 67]))).toEqual([
      'lh',
      'lh',
      'lh',
      'rh',
      'rh',
      'rh',
    ]);
  });

  it("follows the step's hand over the staff", () => {
    expect(inferHands(line([57, 59, 60]), { defaultHand: 'rh' })).toEqual([
      'rh',
      'rh',
      'rh',
    ]);
  });

  it('gives an unhanded note the hand of the nearest handed one', () => {
    const notes = [...chord([45], 'lh'), ...chord([72], 'rh'), ...chord([50])];
    expect(inferHands(notes)[2]).toBe('lh');
  });
});

describe('the timeline', () => {
  it('lists each hand by onset and keeps input order in `notes`', () => {
    const notes = [
      ...line([72, 71]).map((n) => ({ ...n, hand: 'rh' as const })),
      ...chord([48], 'lh'),
    ];
    const t = buildFingeringTimeline(notes);
    expect(t.notes.map((n) => n?.index)).toEqual([0, 1, 2]);
    expect(t.byHand.rh.map((n) => n.midi)).toEqual([72, 71]);
    expect(t.byHand.lh.map((n) => n.midi)).toEqual([48]);
  });
});

describe('what teachers would never write', () => {
  it('a spread arpeggio stretches rather than repeats a finger', () => {
    // Funk L2 B1: A minor 9, A3 C4 E4 G4 B4, legato.
    const notes = line([57, 60, 64, 67, 71], 'rh').map((n) => ({
      ...n,
      duration: 460,
    }));
    expect(fingers(notes)).toBe('12345');
  });

  it('a left hand on one bass note plays it with 5', () => {
    expect(fingers(line([38, 38, 38], 'lh'))).toBe('555');
  });
});
