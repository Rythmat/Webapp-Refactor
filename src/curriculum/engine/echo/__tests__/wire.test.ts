import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import { bossCalls, chordCall, melodyCall, type EchoCall } from '../calls';
import { gradeQuantizedEcho } from '../classGrading';
import { echoTimeline, melodyEchoNotes } from '../grading';
import { echoRandom } from '../random';
import { taughtChordCall, taughtMelodyCall } from '../taught';
import { fromEchoCallWire, toEchoCallWire } from '../wire';

/**
 * A call as wire data (wire.ts): what the teacher's computer sends every
 * device in class. Through JSON and back it's the same call, so every
 * device plays and grades exactly what Atlas made.
 */

const C = { tonic: 'C', mode: 'major' } as const;
const Fm = { tonic: 'F', mode: 'minor' } as const;

/** Over the socket: to the wire, through JSON, and read back. */
const overTheWire = (call: EchoCall) =>
  fromEchoCallWire(JSON.parse(JSON.stringify(toEchoCallWire(call))));

describe('an Echo call on the wire', () => {
  it('comes back the same melody call', () => {
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 12; i++) {
        const rng = echoRandom(`melody-${level}-${i}`);
        const call = melodyCall(level, i % 2 ? Fm : C, rng, { tempo: 92 });
        expect(overTheWire(call)).toEqual(call);
      }
    }
  });

  it('comes back the same chord call', () => {
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 12; i++) {
        const rng = echoRandom(`chords-${level}-${i}`);
        const call = chordCall(level, i % 2 ? Fm : C, rng);
        expect(overTheWire(call)).toEqual(call);
      }
    }
  });

  it('carries the Boss’s calls and a teacher’s', () => {
    for (const call of bossCalls(2, C, echoRandom('boss'), { tempo: 104 })) {
      expect(overTheWire(call)).toEqual(call);
    }
    const note = (midi: number, onset: number): PlayedNote => ({
      midi,
      onset,
      duration: 300,
    });
    const frame = { level: 2 as const, key: C, tempo: 90 };
    const melody = taughtMelodyCall(
      [note(60, 1920), note(62, 2400), note(64, 2880)],
      frame,
      { start: 1920, tempo: 90 },
    )!;
    expect(overTheWire(melody)).toEqual(melody);
    // Two chords in the first bar: a strike's chord isn't always its bar's.
    const chord = (midis: number[], onset: number) =>
      midis.map((m) => note(m, onset));
    const chords = taughtChordCall(
      [
        ...chord([60, 64, 67], 1920),
        ...chord([65, 69, 72], 1920 + 960),
        ...chord([67, 71, 74], 1920 + 1920),
      ],
      frame,
      { start: 1920, tempo: 90 },
    )!;
    expect(chords.attacks.map((a) => a.chord.label)).toEqual([
      '1 maj',
      '4 maj',
      '5 maj',
    ]);
    expect(overTheWire(chords)).toEqual(chords);
  });

  it('grades the same on every device', () => {
    const call = melodyCall(2, C, echoRandom('same'), { tempo: 100 });
    const back = overTheWire(call)!;
    const timeline = echoTimeline(call);
    const played = melodyEchoNotes(call, timeline).response.map((n, i) => ({
      midi: n.midi,
      onset: n.onset + (i % 2 ? 30 : -20),
      duration: 100,
    }));
    expect(gradeQuantizedEcho(back, played)).toEqual(
      gradeQuantizedEcho(call, played),
    );
  });

  it('is small enough to send whole', () => {
    const chords = chordCall(3, C, echoRandom('size'));
    const melody = melodyCall(3, C, echoRandom('size'));
    expect(JSON.stringify(toEchoCallWire(chords)).length).toBeLessThan(4000);
    expect(JSON.stringify(toEchoCallWire(melody)).length).toBeLessThan(2000);
  });

  it('reads nothing malformed as a call', () => {
    const good = toEchoCallWire(melodyCall(1, C, echoRandom('x')));
    expect(fromEchoCallWire(null)).toBeNull();
    expect(fromEchoCallWire('call')).toBeNull();
    expect(fromEchoCallWire({ ...good, wire: 2 })).toBeNull();
    expect(fromEchoCallWire({ ...good, kind: 'drums' })).toBeNull();
    expect(fromEchoCallWire({ ...good, key: { tonic: 'H' } })).toBeNull();
    expect(
      fromEchoCallWire({ ...good, notes: [{ midi: 'sixty' }] }),
    ).toBeNull();
    const chords = toEchoCallWire(chordCall(1, C, echoRandom('y')));
    expect(fromEchoCallWire({ ...chords, chords: [9] })).toBeNull();
    expect(
      fromEchoCallWire({
        ...chords,
        strikes: [{ bar: 0, onset: 0, duration: 1, voicing: 7 }],
      }),
    ).toBeNull();
  });
});
