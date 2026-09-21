import { describe, expect, it } from 'vitest';
import { buildScore } from '..';
import { drumStaffPosition, isFootDrum } from '../drumMap';
import type { NotationNoteInput, NotationScore } from '../types';

const Q = 480;
const BAR = Q * 4;

// GM drum notes, as the kit's pads and the backing generator emit them.
const KICK = 36;
const SNARE = 38;
const HH_CLOSED = 42;
const HH_PEDAL = 44;
const HH_OPEN = 46;
const CRASH = 49;
const RIDE = 51;
const FLOOR_TOM = 41;

let nextId = 0;
const hit = (
  midi: number,
  startTick: number,
  durationTicks = 60,
): NotationNoteInput => ({
  id: `d${nextId++}`,
  midi,
  startTick,
  durationTicks,
});

const drumScore = (notes: NotationNoteInput[], minMeasures = 1) =>
  buildScore(notes, {
    ticksPerQuarter: Q,
    timeSignature: [4, 4],
    staves: 'percussion',
    minMeasures,
  });

/** "8:G5x2 8:G5x2+C5" — one voice of one bar, values and staff positions. */
function show(score: NotationScore, voice = 0) {
  return score.measures
    .map((m) =>
      (m.staves.percussion[voice]?.items ?? [])
        .map((item) => {
          const value = `${item.value}${item.dots ? '.' : ''}`;
          if (item.kind === 'rest') {
            return item.wholeMeasure ? 'W' : `${value}r`;
          }
          const keys = item.keys
            .map(
              (k) =>
                `${k.letter.toUpperCase()}${k.octave}` +
                (k.notehead && k.notehead !== 'normal' ? k.notehead : '') +
                (k.articulation === 'open' ? 'o' : ''),
            )
            .join('+');
          return `${value}:${keys}`;
        })
        .join(' '),
    )
    .join(' | ');
}

describe('drumStaffPosition', () => {
  it('places the kit where standard drumset notation puts it', () => {
    // Positions are the treble-clef pitch on that line or space.
    expect(drumStaffPosition(KICK)).toMatchObject({ letter: 'f', octave: 4 });
    expect(drumStaffPosition(SNARE)).toMatchObject({ letter: 'c', octave: 5 });
    expect(drumStaffPosition(FLOOR_TOM)).toMatchObject({
      letter: 'a',
      octave: 4,
    });
    expect(drumStaffPosition(48)).toMatchObject({ letter: 'e', octave: 5 });
    expect(drumStaffPosition(45)).toMatchObject({ letter: 'd', octave: 5 });
    expect(drumStaffPosition(RIDE)).toMatchObject({ letter: 'f', octave: 5 });
    expect(drumStaffPosition(HH_CLOSED)).toMatchObject({
      letter: 'g',
      octave: 5,
    });
    expect(drumStaffPosition(CRASH)).toMatchObject({ letter: 'a', octave: 5 });
    expect(drumStaffPosition(HH_PEDAL)).toMatchObject({
      letter: 'd',
      octave: 4,
    });
  });

  it('gives cymbals a cross notehead and drums a normal one', () => {
    expect(drumStaffPosition(SNARE).notehead).toBe('normal');
    expect(drumStaffPosition(KICK).notehead).toBe('normal');
    expect(drumStaffPosition(FLOOR_TOM).notehead).toBe('normal');
    expect(drumStaffPosition(HH_CLOSED).notehead).toBe('x2');
    expect(drumStaffPosition(CRASH).notehead).toBe('x2');
    expect(drumStaffPosition(RIDE).notehead).toBe('x2');
    // Sidestick is a snare-position cross.
    expect(drumStaffPosition(37)).toMatchObject({
      letter: 'c',
      octave: 5,
      notehead: 'x2',
    });
  });

  it('marks the open hi-hat and leaves the closed one plain', () => {
    expect(drumStaffPosition(HH_OPEN).articulation).toBe('open');
    expect(drumStaffPosition(HH_CLOSED).articulation).toBeUndefined();
    // Both sit in the same place: only the o tells them apart.
    expect(drumStaffPosition(HH_OPEN).letter).toBe(
      drumStaffPosition(HH_CLOSED).letter,
    );
  });

  it('sends only the feet to the lower voice', () => {
    expect(isFootDrum(KICK)).toBe(true);
    expect(isFootDrum(HH_PEDAL)).toBe(true);
    expect(isFootDrum(SNARE)).toBe(false);
    expect(isFootDrum(HH_CLOSED)).toBe(false);
    expect(isFootDrum(CRASH)).toBe(false);
  });

  it('folds sounds the kit has no position for onto the nearest one', () => {
    expect(drumStaffPosition(35)).toEqual(drumStaffPosition(36)); // both kicks
    expect(drumStaffPosition(43)).toEqual(drumStaffPosition(41)); // floor toms
    expect(drumStaffPosition(50)).toEqual(drumStaffPosition(48)); // high toms
    expect(drumStaffPosition(57)).toEqual(drumStaffPosition(49)); // crashes
  });
});

describe('buildScore on a drumset staff', () => {
  it('writes one percussion staff with no key signature', () => {
    const score = drumScore([hit(KICK, 0), hit(SNARE, Q)]);
    expect(score.staves).toEqual(['percussion']);
    expect(score.keyFifths).toBe(0);
  });

  it('never prints an accidental', () => {
    // F#2 and C#2 as raw MIDI would want accidentals on a pitched staff.
    const score = drumScore([hit(42, 0), hit(37, Q), hit(46, Q * 2)]);
    const keys = score.measures.flatMap((m) =>
      m.staves.percussion.flatMap((v) =>
        v.items.flatMap((i) => i.keys.map((k) => k.accidental)),
      ),
    );
    expect(keys.every((a) => a === null)).toBe(true);
  });

  it('writes hi-hat eighths as eighths, not as the sample length', () => {
    // Eight 60-tick hits: sounding length is a 32nd, the rhythm is eighths.
    const notes = Array.from({ length: 8 }, (_, i) => hit(HH_CLOSED, i * 240));
    expect(show(drumScore(notes))).toBe(
      '8:G5x2 8:G5x2 8:G5x2 8:G5x2 8:G5x2 8:G5x2 8:G5x2 8:G5x2',
    );
  });

  it('writes a backbeat as quarters with rests between', () => {
    const score = drumScore([hit(SNARE, Q), hit(SNARE, Q * 3)]);
    expect(show(score)).toBe('qr q:C5 qr q:C5');
  });

  it('puts hands and feet in separate voices', () => {
    const score = drumScore([
      hit(HH_CLOSED, 0),
      hit(KICK, 0),
      hit(HH_CLOSED, Q),
      hit(SNARE, Q),
    ]);
    const [hands, feet] = score.measures[0].staves.percussion;
    expect(hands.index).toBe(0);
    expect(feet.index).toBe(1);
    // Hands: hi-hat, then hi-hat over snare.
    expect(show(score, 0)).toBe('q:G5x2 q:C5+G5x2 hr');
    // Feet: the kick alone. Rests group to the half-bar, as 4/4 requires.
    expect(show(score, 1)).toBe('q:F4 qr hr');
  });

  it('stacks simultaneous hands hits into one chord', () => {
    const score = drumScore([hit(CRASH, 0), hit(SNARE, 0)]);
    expect(show(score, 0)).toBe('q:C5+A5x2 qr hr');
  });

  it('marks an open hi-hat and not a closed one', () => {
    const score = drumScore([hit(HH_OPEN, 0), hit(HH_CLOSED, Q)]);
    expect(show(score, 0)).toBe('q:G5x2o q:G5x2 hr');
  });

  it('quantizes away the generator’s micro-timing jitter', () => {
    // backingPatterns adds 0-4 ticks of jitter to every drum onset.
    const notes = [
      hit(KICK, 3),
      hit(HH_CLOSED, 2),
      hit(HH_CLOSED, 241),
      hit(SNARE, 959),
      hit(HH_CLOSED, 962),
    ];
    const score = drumScore(notes);
    const starts = score.measures[0].staves.percussion.flatMap((v) =>
      v.items.filter((i) => i.kind === 'note').map((i) => i.startTick),
    );
    expect(starts.every((t) => t % (Q / 4) === 0)).toBe(true);
  });

  it('holds a hit no longer than a beat', () => {
    const score = drumScore([hit(CRASH, 0)], 1);
    const first = score.measures[0].staves.percussion[0].items[0];
    expect(first.durationTicks).toBeLessThanOrEqual(Q);
  });

  it('fills an empty bar with a whole rest', () => {
    const score = drumScore([hit(KICK, 0)], 2);
    expect(score.measures[1].staves.percussion[0].items[0]).toMatchObject({
      kind: 'rest',
      wholeMeasure: true,
    });
  });

  it('bars a two-bar groove correctly', () => {
    const notes: NotationNoteInput[] = [];
    for (let bar = 0; bar < 2; bar++) {
      for (let i = 0; i < 8; i++) {
        notes.push(hit(HH_CLOSED, bar * BAR + i * 240));
      }
      notes.push(hit(KICK, bar * BAR));
      notes.push(hit(SNARE, bar * BAR + Q));
      notes.push(hit(KICK, bar * BAR + Q * 2));
      notes.push(hit(SNARE, bar * BAR + Q * 3));
    }
    const score = drumScore(notes, 2);
    expect(score.measures).toHaveLength(2);
    expect(show(score, 1)).toBe('q:F4 qr q:F4 qr | q:F4 qr q:F4 qr');
  });
});
