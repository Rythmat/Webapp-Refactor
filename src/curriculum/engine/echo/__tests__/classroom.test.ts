import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import { chordCall, echoTonic, melodyCall } from '../calls';
import { callSubdivision, gradeQuantizedEcho } from '../classGrading';
import { echoTimeline, melodyEchoNotes, chordEchoNotes } from '../grading';
import { echoRandom } from '../random';
import {
  awaitsTeacher,
  emptyTaughtCall,
  taughtChordCall,
  taughtMelodyCall,
} from '../taught';

/**
 * Echo in the classroom (docs/echo-classroom.md): a teacher's call made
 * from what they played, and grading in class, quantized: a note within
 * half the call's subdivision is on time.
 */

const C = { tonic: 'C', mode: 'major' } as const;
const note = (midi: number, onset: number, duration = 200): PlayedNote => ({
  midi,
  onset,
  duration,
});

describe('a teacher’s melody call', () => {
  const frame = { level: 2 as const, key: C, tempo: 90 };

  it('is the notes played, quantized to the level’s grid, on the pads', () => {
    const tonic = echoTonic(C);
    // 1 2 3, a little loose, an octave below the pads.
    const played = [
      note(tonic - 12, 1920 + 15),
      note(tonic - 10, 1920 + 470),
      note(tonic - 8, 1920 + 1000, 400),
    ];
    const call = taughtMelodyCall(played, frame, { start: 1920, tempo: 90 })!;
    expect(call.taught).toBe(true);
    expect(call.bars).toBe(1);
    expect(call.notes.map((n) => [n.label, n.onset])).toEqual([
      ['1', 0],
      ['2', 480],
      ['3', 960],
    ]);
    // Moved up onto the pads: the 1 to the 1 above.
    expect(call.notes.map((n) => n.midi)).toEqual([
      tonic,
      tonic + 2,
      tonic + 4,
    ]);
    expect(call.contour.contour).toEqual([0, 1, 2]);
    expect(call.rhythm.hits.map((h) => h.onset)).toEqual([0, 480, 960]);
    expect(awaitsTeacher(call)).toBe(false);
  });

  it('snaps a note outside the key to it, unless told not to', () => {
    const tonic = echoTonic(C);
    const played = [note(tonic, 1920), note(tonic + 1, 1920 + 480)]; // 1, ♭2
    const snapped = taughtMelodyCall(played, frame, {
      start: 1920,
      tempo: 90,
    })!;
    expect(snapped.notes.map((n) => n.label)).toEqual(['1', '1']);
    const asPlayed = taughtMelodyCall(played, frame, {
      start: 1920,
      tempo: 90,
      snap: false,
    })!;
    expect(asPlayed.notes.map((n) => n.midi)).toEqual([tonic, tonic + 1]);
  });

  it('is nothing when nothing was played', () => {
    expect(taughtMelodyCall([], frame, { start: 1920, tempo: 90 })).toBeNull();
    // Played after the call's bar: not the call.
    expect(
      taughtMelodyCall([note(60, 1920 * 3)], frame, { start: 1920, tempo: 90 }),
    ).toBeNull();
  });

  it('waits as an empty call of its kind while the teacher plays', () => {
    const melody = emptyTaughtCall('melody', frame);
    expect(melody).toMatchObject({ kind: 'melody', bars: 1, taught: true });
    expect(awaitsTeacher(melody)).toBe(true);
    const chords = emptyTaughtCall('chords', frame);
    expect(chords).toMatchObject({ kind: 'chords', bars: 2, taught: true });
    expect(awaitsTeacher(chords)).toBe(true);
    expect(awaitsTeacher(melodyCall(1, C, echoRandom(1)))).toBe(false);
  });
});

describe('a teacher’s chord call', () => {
  const frame = { level: 2 as const, key: C, tempo: 90 };
  const chord = (midis: number[], onset: number, duration = 400) =>
    midis.map((m, i) => note(m, onset + i * 8, duration));

  it('is the chords struck, recognized, in the teacher’s rhythm', () => {
    const played = [
      ...chord([60, 64, 67], 1920), // C on beat 1
      ...chord([60, 64, 67], 1920 + 960), // and beat 3
      ...chord([65, 69, 72], 1920 + 1920 + 10), // F on bar 2's downbeat
    ];
    const call = taughtChordCall(played, frame, { start: 1920, tempo: 90 })!;
    expect(call.taught).toBe(true);
    expect(call.labels).toEqual(['1 maj', '4 maj']);
    expect(call.attacks.map((a) => [a.onset, a.chord.label])).toEqual([
      [0, '1 maj'],
      [960, '1 maj'],
      [1920, '4 maj'],
    ]);
  });

  it('keeps a bar with no strike on the chord sounding into it', () => {
    const played = chord([62, 65, 69], 1920, 3000); // D min, held
    const call = taughtChordCall(played, frame, { start: 1920, tempo: 90 })!;
    expect(call.labels).toEqual(['2 min', '2 min']);
  });

  it('leaves out what isn’t one of the six, and is nothing with none', () => {
    const cluster = chord([60, 61, 62], 1920);
    expect(
      taughtChordCall(cluster, frame, { start: 1920, tempo: 90, snap: false }),
    ).toBeNull();
  });
});

describe('the call’s subdivision', () => {
  it('is the smallest step its rhythm needs', () => {
    expect(callSubdivision([0, 480, 960])).toBe(480);
    expect(callSubdivision([0, 240, 960])).toBe(240);
    expect(callSubdivision([0, 120, 480])).toBe(120);
  });
});

describe('grading in class, quantized', () => {
  // Quarters: 1 2 3 on beats 1, 2, 3.
  const quarters = melodyCall(1, C, echoRandom('q'), {
    contourId: '0,1,2',
    zeroPoint: 1,
    rhythmId: 'mp_pop_3a',
  });
  const t = echoTimeline(quarters);
  const answer = (shift: number[]) =>
    melodyEchoNotes(quarters, t).response.map((n, i) =>
      note(n.midi, n.onset + (shift[i] ?? 0)),
    );

  it('counts a note within half the subdivision, and not beyond', () => {
    // A quarter-note call: on time within an eighth (240 ticks).
    const loose = gradeQuantizedEcho(quarters, answer([200, -230, 120]), {
      timeline: t,
    });
    expect(loose).toMatchObject({
      hits: 3,
      percent: 100,
      passed: true,
      window: 240,
    });
    const late = gradeQuantizedEcho(quarters, answer([0, 0, 250]), {
      timeline: t,
    });
    expect(late).toMatchObject({ hits: 2, passed: false });
  });

  it('says how early or late each note was, and which were missed', () => {
    const loose = gradeQuantizedEcho(quarters, answer([200, -230, 120]), {
      timeline: t,
    });
    expect(loose.offsets).toEqual([200, -230, 120]);
    const late = gradeQuantizedEcho(quarters, answer([0, 0, 250]), {
      timeline: t,
    });
    expect(late.offsets).toEqual([0, 0, null]);
  });

  it('needs the right note', () => {
    const wrong = melodyEchoNotes(quarters, t).response.map((n) =>
      note(n.midi + 2, n.onset),
    );
    expect(gradeQuantizedEcho(quarters, wrong, { timeline: t })).toMatchObject({
      hits: 0,
      extras: 3,
      percent: 0,
      passed: false,
    });
  });

  it('takes one off for each extra note: mashing doesn’t pass', () => {
    const mash = [
      ...answer([]),
      ...[1, 3, 5, 7].map((i) =>
        note(echoTonic(C) + i, t.response.start + 240 * i),
      ),
    ];
    const graded = gradeQuantizedEcho(quarters, mash, { timeline: t });
    expect(graded.hits).toBe(3);
    expect(graded.extras).toBe(4);
    expect(graded.passed).toBe(false);
  });

  it('says when nothing was played', () => {
    const none = gradeQuantizedEcho(quarters, [], { timeline: t });
    expect(none).toMatchObject({ playedAny: false, passed: false, hits: 0 });
  });

  it('grades chords strike by strike, in any octave', () => {
    const call = chordCall(1, C, echoRandom('c'), {
      degrees: ['1', '4'],
      rhythmId: 'comp_pop_01',
    });
    const timeline = echoTimeline(call);
    const played = chordEchoNotes(call, timeline).response.flatMap((a) =>
      a.chord.midis.map((m, i) => note(m - 12, a.onset + 100 + i * 5, 300)),
    );
    // Quarters: on time within an eighth, so 100 ticks late is fine.
    const graded = gradeQuantizedEcho(call, played, { timeline });
    expect(graded).toMatchObject({
      hits: 7,
      asked: 7,
      passed: true,
      window: 240,
    });
  });
});
