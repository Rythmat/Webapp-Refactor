import { describe, expect, it } from 'vitest';
import type { MidiSequence } from '@prism/engine';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import {
  fromMidiEvents,
  guessInstrument,
  notesFromSequence,
  partFromLessonStep,
  toMidiEvents,
  writePartToStep,
} from '../convert';
import { applyFeel, extractFeel } from '../feel';
import {
  barsSpanned,
  blankPart,
  resizePart,
  shiftBetween,
  splitPlayed,
  transposePart,
  type InstrumentPart,
} from '../part';
import { listParts } from '../registry';

const part = (patch: Partial<InstrumentPart> = {}): InstrumentPart => ({
  ...blankPart('test', 'Test'),
  key: { tonic: 2, mode: 'dorian' },
  notes: [
    { tick: 0, duration: 480, midi: 62, velocity: 96 },
    { tick: 480, duration: 480, midi: 65, velocity: 96, string: 2, fret: 6 },
  ],
  ...patch,
});

describe('transposition', () => {
  it('takes the shortest way to the new tonic', () => {
    expect(shiftBetween(2, 4)).toBe(2); // D → E up a tone
    expect(shiftBetween(2, 0)).toBe(-2); // D → C down a tone
    expect(shiftBetween(0, 7)).toBe(-5); // C → G down a fourth, not up a fifth
    expect(shiftBetween(0, 6)).toBe(-6); // a tritone goes down
  });

  it('moves every note, relabels the key and drops tab positions', () => {
    const moved = transposePart(part(), 4);
    expect(moved.key).toEqual({ tonic: 4, mode: 'dorian' });
    expect(moved.notes.map((n) => n.midi)).toEqual([64, 67]);
    expect(moved.notes[1].string).toBeUndefined();
  });

  it('keeps a bass line in the bass register, moving the figure as one', () => {
    const bass = part({
      instrument: 'bass',
      key: { tonic: 0, mode: 'ionian' },
      notes: [
        { tick: 0, duration: 480, midi: 55, velocity: 96 },
        { tick: 480, duration: 480, midi: 60, velocity: 96 },
      ],
    });
    // C → E♭ is +3: 58 and 63, past C4 — so the whole figure drops an octave.
    expect(transposePart(bass, 3).notes.map((n) => n.midi)).toEqual([46, 51]);
  });

  it('leaves drums alone', () => {
    const drums = part({ instrument: 'drums' });
    expect(transposePart(drums, 7)).toBe(drums);
  });
});

describe('loop length', () => {
  it('counts the bars notes need', () => {
    expect(barsSpanned([{ tick: 0, duration: 1920 }])).toBe(1);
    expect(barsSpanned([{ tick: 1920, duration: 10 }])).toBe(2);
    expect(barsSpanned([])).toBe(1);
  });

  it('grows by repeating and restores what shrinking kept', () => {
    const one = part({ bars: 1 });
    const two = resizePart(one, 2);
    expect(two.notes.map((n) => n.tick)).toEqual([0, 480, 1920, 2400]);
    const back = resizePart(resizePart(two, 1), 2);
    expect(back.notes).toEqual(two.notes);
  });
});

describe('Studio clip events', () => {
  it('round-trips and keeps hands on notes that did not move', () => {
    const notes = [
      { tick: 0, duration: 480, midi: 48, velocity: 90, hand: 'lh' as const },
      { tick: 0, duration: 480, midi: 64, velocity: 90, hand: 'rh' as const },
    ];
    const events = toMidiEvents(notes);
    expect(fromMidiEvents(events, notes)).toEqual(notes);
    const moved = fromMidiEvents(
      [{ ...events[0], startTick: 240 }, events[1]],
      notes,
    );
    expect(moved.find((n) => n.midi === 48)?.hand).toBeUndefined();
    expect(moved.find((n) => n.midi === 64)?.hand).toBe('rh');
  });
});

describe('MIDI files', () => {
  const seq = (
    ppq: number,
    events: Partial<MidiSequence['events'][number]>[],
    trackName = '',
  ): MidiSequence => ({
    ticksPerQuarterNote: ppq,
    trackName,
    events: events.map((e) => ({
      note: 60,
      velocity: 100,
      startTick: 0,
      durationTicks: ppq,
      channel: 0,
      ...e,
    })),
  });

  it('rescales to PPQ 480 and drops leading empty bars', () => {
    const notes = notesFromSequence(
      seq(96, [{ startTick: 384 * 2 + 96, durationTicks: 48 }]),
    );
    expect(notes).toEqual([
      { tick: 480, duration: 240, midi: 60, velocity: 100 },
    ]);
  });

  it('guesses the instrument from channel, name and register', () => {
    expect(guessInstrument(seq(480, [{ channel: 9 }]))).toBe('drums');
    expect(guessInstrument(seq(480, [{}], 'Fender Bass'))).toBe('bass');
    expect(guessInstrument(seq(480, [{ note: 36 }, { note: 40 }]))).toBe(
      'bass',
    );
    expect(guessInstrument(seq(480, [{ note: 64 }]))).toBe('piano');
  });
});

describe('lesson steps', () => {
  const flow = {
    genre: 'funk',
    level: 2,
    params: {
      defaultKey: 'A minor (Dorian)',
      defaultScaleId: 'dorian',
      tempoRange: [90, 100],
      swing: 56,
    },
  } as unknown as ActivityFlowV2;
  const step = {
    section: 'C',
    stepNumber: 3,
    subsection: 'C3: Octave bass',
    direction: 'Lock with the kick.',
    chordSymbols: ['Am9'],
    targetNotes: [
      { midi: 45, onset: 1920, duration: 240, hand: 'lh' },
      { midi: 57, onset: 2160, duration: 240, hand: 'lh' },
      { midi: 72, onset: 1920, duration: 960, hand: 'rh' },
    ],
  } as unknown as ActivityStepV2;

  it("takes a Bass-section left hand as a bass line in the flow's key", () => {
    const p = partFromLessonStep(flow, step, { id: 'x', hands: 'lh' })!;
    expect(p.instrument).toBe('bass');
    expect(p.role).toBe('bassline');
    expect(p.key).toEqual({ tonic: 9, mode: 'dorian' });
    // The count-in bar is dropped: the first note sits on beat 1.
    expect(p.notes.map((n) => [n.tick, n.midi])).toEqual([
      [0, 45],
      [240, 57],
    ]);
    expect(p.name).toBe('Funk L2 · C3 Octave bass (LH)');
    expect(p.swing).toBe(56);
    expect(p.source).toMatchObject({ kind: 'lesson', section: 'C' });
  });

  it('keeps both hands, with their hands, as a piano part', () => {
    const p = partFromLessonStep(flow, step, { id: 'x' })!;
    expect(p.instrument).toBe('piano');
    expect(p.notes).toHaveLength(3);
    expect(p.notes.every((n) => n.hand)).toBe(true);
  });
});

describe('registry', () => {
  it('every part file is well-formed', () => {
    for (const p of listParts()) {
      expect(p.id, p.id).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
      expect(['draft', 'live'], p.id).toContain(p.status);
      expect(p.key.tonic, p.id).toBeGreaterThanOrEqual(0);
      expect(p.key.tonic, p.id).toBeLessThan(12);
      for (const n of p.notes) {
        expect(n.velocity, p.id).toBeGreaterThanOrEqual(1);
        expect(n.velocity, p.id).toBeLessThanOrEqual(127);
        expect(n.duration, p.id).toBeGreaterThan(0);
      }
    }
  });
});

describe('written vs played', () => {
  it('writes a played note on the grid and keeps the feel', () => {
    expect(splitPlayed(130, 120)).toEqual({ tick: 120, offset: 10 });
    expect(splitPlayed(235, 120)).toEqual({ tick: 240, offset: -5 });
    expect(splitPlayed(240, 120)).toEqual({ tick: 240 });
  });

  it('extracts a feel from a performance and puts it on written notes', () => {
    // Samba-ish: every "a" (4th 16th of the beat) 12 ticks late, "e" 4 early.
    const played = Array.from({ length: 16 }, (_, i) => ({
      tick: i * 120,
      duration: 100,
      midi: 60,
      velocity: i % 4 === 0 ? 110 : 80,
      offset: i % 4 === 3 ? 12 : i % 4 === 1 ? -4 : 0,
    }));
    const feel = extractFeel(played, { id: 'samba', name: 'Samba' });
    expect(feel.offsets).toEqual([0, -4, 0, 12]);
    expect(feel.velocity![0]).toBeGreaterThan(feel.velocity![1]);

    const written = played.map(({ offset: _o, ...n }) => ({
      ...n,
      velocity: 90,
    }));
    const felt = applyFeel(written, feel);
    expect(felt.map((n) => n.offset)).toEqual(played.map((n) => n.offset));
  });

  it("never overrides a note's own feel", () => {
    const feel = {
      id: 'f',
      name: 'F',
      step: 120,
      positions: 4,
      offsets: [5, 5, 5, 5],
    };
    const [n] = applyFeel(
      [{ tick: 0, duration: 1, midi: 60, velocity: 90, offset: -3 }],
      feel,
    );
    expect(n.offset).toBe(-3);
  });

  it('keeps feel, grace and finger through an unchanged round trip', () => {
    const notes = [
      {
        tick: 480,
        duration: 60,
        midi: 61,
        velocity: 70,
        offset: -40,
        grace: true,
      },
      {
        tick: 480,
        duration: 480,
        midi: 62,
        velocity: 90,
        offset: 8,
        finger: 2,
      },
    ];
    expect(fromMidiEvents(toMidiEvents(notes), notes)).toEqual(notes);
  });
});

describe('writing a part back into a lesson step', () => {
  const flow = {
    genre: 'funk',
    level: 2,
    params: {
      defaultKey: 'A minor (Dorian)',
      defaultScaleId: 'dorian',
      tempoRange: [90, 100],
    },
  } as unknown as ActivityFlowV2;
  const step = {
    section: 'B',
    stepNumber: 4,
    tag: 'b4',
    subsection: 'Am9 voicing',
    targetNotes: [
      { midi: 45, onset: 1920, duration: 960, hand: 'lh' },
      { midi: 67, onset: 1920, duration: 960, hand: 'rh' },
      { midi: 71, onset: 1920, duration: 960, hand: 'rh' },
    ],
  } as unknown as ActivityStepV2;

  it('round-trips a step unchanged', () => {
    const p = partFromLessonStep(flow, step, { id: 'x' })!;
    expect(writePartToStep(p, step, 9).targetNotes).toEqual(step.targetNotes);
  });

  it('replaces one hand and keeps the other', () => {
    const rh = partFromLessonStep(flow, step, { id: 'x', hands: 'rh' })!;
    // Move the 9th (B4) up to C5 — a new voicing.
    const edited = {
      ...rh,
      notes: rh.notes.map((n) => (n.midi === 71 ? { ...n, midi: 72 } : n)),
    };
    const out = writePartToStep(edited, step, 9).targetNotes!;
    expect(out.map((n) => [n.midi, n.hand])).toEqual([
      [45, 'lh'],
      [67, 'rh'],
      [72, 'rh'],
    ]);
    expect(out.every((n) => n.onset === 1920)).toBe(true);
  });

  it('returns a transposed part to the lesson key', () => {
    const p = transposePart(partFromLessonStep(flow, step, { id: 'x' })!, 0);
    const out = writePartToStep(p, step, 9).targetNotes!;
    expect(out.map((n) => n.midi)).toEqual([45, 67, 71]);
  });
});
