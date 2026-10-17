import { describe, expect, it } from 'vitest';
import {
  LITERACY_FIXTURE,
  type LiteracyFixtureStep,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import {
  partFigure,
  partWords,
  PLACEHOLDER_SYLLABLE,
  segmentPart,
} from '../literacyPart';

/**
 * A segment in the Parts editor's piano roll and back: degrees of the
 * lesson's key out as pitches of its 1, the roll's pitches back as degrees
 * of the same 1, and the words' syllables on the roll's notes in order.
 */

const PART_1 = LITERACY_FIXTURE;

const step = (tag: string) =>
  PART_1.steps.find((s) => s.tag === tag) as LiteracyFixtureStep;

describe('a segment as a part', () => {
  it('plays C’s degrees from middle C, at the step’s tempo, as long as its bars', () => {
    const part = segmentPart(PART_1, step('major-triad'), 'call', 'x');
    expect(part.key).toEqual({ tonic: 0, mode: 'ionian' });
    expect(part.bars).toBe(2);
    expect(part.tempo).toBe(80);
    expect(part.sound).toBe('piano-sampler');
    expect(part.notes.map((n) => n.midi)).toEqual([60, 64, 67, 64, 60]);
  });

  it('puts the 1 of G below middle C and of F above it, minor as aeolian', () => {
    const inG = { ...PART_1, key: { tonic: 'G', mode: 'minor' } } as const;
    const g = segmentPart(inG, step('flat-the-3'), 'call', 'x');
    expect(g.key).toEqual({ tonic: 7, mode: 'aeolian' });
    expect(g.notes.map((n) => n.midi)).toEqual([55, 58, 55]);
    const inF = { ...PART_1, key: { tonic: 'F', mode: 'major' } } as const;
    expect(
      segmentPart(inF, step('go-to-5'), 'call', 'x').notes.map((n) => n.midi),
    ).toEqual([65, 72, 65]);
  });

  it('opens an echoed response as the call', () => {
    const s = step('note-called-c');
    expect(s.response).toBeUndefined();
    expect(segmentPart(PART_1, s, 'response', 'x').notes).toEqual(
      segmentPart(PART_1, s, 'call', 'x').notes,
    );
  });

  it('opens a step with no notes as an empty part', () => {
    const empty = {
      ...step('root-is-1'),
      call: { bars: 1, notes: [] },
    } as unknown as LiteracyFixtureStep;
    const part = segmentPart(PART_1, empty, 'call', 'x');
    expect(part.notes).toEqual([]);
    expect(partFigure(part, PART_1)).toEqual({ bars: 1, notes: [] });
  });
});

describe('a part back as a segment', () => {
  it('gives every seeded call and words back as they were', () => {
    for (const s of PART_1.steps) {
      const call = segmentPart(PART_1, s, 'call', 'x');
      expect(partFigure(call, PART_1), s.tag).toEqual(s.call);
      const words = segmentPart(PART_1, s, 'words', 'x');
      const back = partWords(words, PART_1, s.words);
      expect(back.words, s.tag).toEqual(s.words);
      expect([back.added, back.dropped]).toEqual([0, []]);
    }
  });

  it('reads pitches as degrees and octaves of the lesson’s 1, in time order', () => {
    const part: InstrumentPart = {
      ...segmentPart(PART_1, step('add-the-3'), 'call', 'x'),
      bars: 2,
      notes: [
        { tick: 960, duration: 480, midi: 72, velocity: 90 },
        { tick: 0, duration: 240, midi: 55, velocity: 90 },
        { tick: 480, duration: 480, midi: 63, velocity: 90 },
      ],
    };
    expect(partFigure(part, PART_1)).toEqual({
      bars: 2,
      notes: [
        { tick: 0, duration: 240, degree: '5', octave: -1 },
        { tick: 480, duration: 480, degree: 'b3' },
        { tick: 960, duration: 480, degree: '1', octave: 1 },
      ],
    });
  });

  it('sings a note the line has no syllable for to the placeholder', () => {
    const s = step('note-called-c');
    const part = segmentPart(PART_1, s, 'words', 'x');
    const more = {
      ...part,
      notes: [
        ...part.notes,
        { tick: 3600, duration: 120, midi: 67, velocity: 90 },
      ],
    };
    const back = partWords(more, PART_1, s.words);
    expect(back.added).toBe(1);
    expect(back.words.notes.at(-1)).toEqual({
      tick: 3600,
      duration: 120,
      degree: '5',
      text: PLACEHOLDER_SYLLABLE,
    });
    const fewer = { ...part, notes: part.notes.slice(0, 10) };
    const less = partWords(fewer, PART_1, s.words);
    expect(less.dropped).toEqual(['called', 'C']);
    expect(less.words.notes).toHaveLength(10);
  });
});

describe('words with a pickup in the roll', () => {
  /** "When I" on 4 and its "and", "play" on the downbeat. */
  const pickupStep: LiteracyFixtureStep = {
    ...step('root-is-1'),
    words: {
      bars: 2,
      pickup: 480,
      notes: [
        { tick: -480, duration: 240, degree: '1', text: 'When' },
        { tick: -240, duration: 240, degree: '3', text: 'I' },
        { tick: 0, duration: 480, degree: '5', text: 'play' },
        { tick: 3360, duration: 480, degree: '1', text: 'one' },
      ],
    },
  };

  it('opens a bar longer, the pickup at the end of its first bar', () => {
    const part = segmentPart(PART_1, pickupStep, 'words', 'x');
    expect(part.bars).toBe(3);
    expect(part.notes.map((n) => [n.tick, n.midi])).toEqual([
      [1440, 60],
      [1680, 64],
      [1920, 67],
      [5280, 60],
    ]);
    // The call has no pickup: as it was.
    expect(segmentPart(PART_1, pickupStep, 'call', 'x').bars).toBe(1);
  });

  it('comes back as it went, pickup and all', () => {
    const part = segmentPart(PART_1, pickupStep, 'words', 'x');
    const back = partWords(part, PART_1, pickupStep.words);
    expect(back.words).toEqual(pickupStep.words);
    expect([back.added, back.dropped]).toEqual([0, []]);
  });

  it('makes the pickup longer, to the eighth, for a note put earlier in its bar', () => {
    const part = segmentPart(PART_1, pickupStep, 'words', 'x');
    const earlier: InstrumentPart = {
      ...part,
      notes: [{ ...part.notes[0], tick: 1000 }, ...part.notes.slice(1)],
    };
    const back = partWords(earlier, PART_1, pickupStep.words);
    expect(back.words.pickup).toBe(960);
    expect(back.words.notes[0].tick).toBe(-920);
    expect(back.words.bars).toBe(2);
  });
});
