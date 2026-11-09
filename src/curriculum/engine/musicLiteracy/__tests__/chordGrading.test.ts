import { describe, expect, it } from 'vitest';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import { emptyChoices, withMode, withTonic } from '../choices';
import {
  CHORD_CLUSTER_TICKS,
  clusterChords,
  gradeChordResponse,
  isRightChordNote,
} from '../chordGrading';
import { LITERACY_PASS_MARK, type PlayedNote } from '../grading';
import { stepNotes, type ChordAttack } from '../literacy';

/**
 * A chord echo, graded: every chord tone of each attack, in any octave and
 * any order, struck on its onset; a missing tone fails the attack, notes
 * outside the chord cost what wrong notes do.
 */

const choices = withMode(withTonic(emptyChoices(), 'C'), 'major');
const notes = stepNotes(PART2_FIXTURE, part2Step('the-1-chord'), choices);
const { timeline } = notes;
const targets = notes.chords!.response;
const call = notes.chords!.call;

/** The student's notes for each target, `late` ticks off, as `voicing` says. */
const play = (
  voicing: (attack: ChordAttack) => number[] = (a) => [...a.chord.midis],
  late = 0,
  attacks: readonly ChordAttack[] = targets,
): PlayedNote[] =>
  attacks.flatMap((attack) =>
    voicing(attack).map((midi, i) => ({
      midi,
      // A beginner's chord: its notes a few ticks apart.
      onset: attack.onset + late + i * 12,
      duration: attack.duration - 40,
    })),
  );

const grade = (played: PlayedNote[]) =>
  gradeChordResponse(targets, played, {
    timeline,
    tempo: 80,
    passMark: LITERACY_PASS_MARK,
    call,
  });

describe('grading a chord echo', () => {
  it('passes the right chords in time, at 100%', () => {
    const result = grade(play());
    expect(result).toMatchObject({
      percent: 100,
      passed: true,
      pitchAccuracy: 1,
      extras: [],
      extraAttacks: [],
    });
    expect(result.attacks.map((a) => a.status)).toEqual(
      targets.map(() => 'hit'),
    );
    expect(result.timingAccuracy).toBeCloseTo(1);
  });

  it('passes an inversion, a doubled root, any octave', () => {
    const inverted = grade(
      play((a) => [a.chord.midis[1], a.chord.midis[2], a.chord.midis[0] + 12]),
    );
    expect(inverted.percent).toBe(100);
    const spread = grade(
      play((a) => [a.chord.root - 12, ...a.chord.midis, a.chord.root + 12]),
    );
    expect(spread.percent).toBe(100);
    expect(spread.extras).toEqual([]);
  });

  it('fails a chord missing a tone', () => {
    const noThird = grade(play((a) => [a.chord.midis[0], a.chord.midis[2]]));
    expect(noThird.passed).toBe(false);
    expect(noThird.attacks.every((a) => a.status === 'wrong')).toBe(true);
    expect(noThird.attacks[0].missing).toEqual([4]); // C major's E
    expect(noThird.feedbackText).toMatch(/missing a note/);
    // One chord short of a tone among six right ones still passes, lower.
    const once = grade(
      play((a) =>
        a.index === 2
          ? [a.chord.midis[0], a.chord.midis[1]]
          : [...a.chord.midis],
      ),
    );
    expect(once.passed).toBe(true);
    expect(once.percent).toBeLessThan(100);
    expect(once.attacks[2].status).toBe('wrong');
  });

  it('takes points off for notes outside the chord', () => {
    const clean = grade(play());
    const extra = grade(play((a) => [...a.chord.midis, a.chord.root + 2]));
    expect(extra.percent).toBeLessThan(clean.percent);
    expect(extra.extras).toHaveLength(targets.length);
    expect(extra.attacks.every((a) => a.status === 'hit')).toBe(true);
    expect(extra.wrongNotes).toContain(62);
    // An attack where none was called costs one more.
    const doubled = grade([
      ...play(),
      ...[60, 64, 67].map((midi) => ({
        midi,
        onset: 5760 + 1680,
        duration: 120,
      })),
    ]);
    expect(doubled.extraAttacks).toHaveLength(1);
    expect(doubled.percent).toBeLessThan(100);
  });

  it('scores the attack’s onset like a melody’s note', () => {
    const slightly = grade(play(undefined, 40));
    const late = grade(play(undefined, 200));
    expect(slightly.passed).toBe(true);
    expect(slightly.percent).toBeLessThan(100);
    expect(late.percent).toBeLessThan(slightly.percent);
    expect(late.pitchAccuracy).toBe(1);
    expect(late.attacks[0].timingDevTicks).toBe(200);
  });

  it('misses a chord not played, and doesn’t hear the call played along', () => {
    const missing = grade(play().filter((n) => n.onset < 7680));
    expect(missing.attacks.map((a) => a.status)).toEqual([
      'hit',
      'hit',
      'hit',
      'missed',
      'missed',
      'missed',
    ]);
    expect(missing.passed).toBe(false);
    // The call's own chords, played along in its bars, aren't answers.
    const along = grade([...play(undefined, 0, call), ...play()]);
    expect(along.percent).toBe(100);
  });
});

describe('notes struck together', () => {
  it('are one attack within a cluster’s reach of its first note', () => {
    const struck = clusterChords([
      { midi: 64, onset: 1030, duration: 400 },
      { midi: 60, onset: 1000, duration: 400 },
      { midi: 67, onset: 1000 + CHORD_CLUSTER_TICKS - 1, duration: 400 },
      { midi: 60, onset: 1000 + CHORD_CLUSTER_TICKS, duration: 400 },
    ]);
    expect(struck.map((s) => [s.onset, s.notes.map((n) => n.midi)])).toEqual([
      [1000, [60, 64, 67]],
      [1100, [60]],
    ]);
  });
});

describe('the keyboard’s color for a chord', () => {
  it('lights a note of the nearest chord right, any other gray, in the answer', () => {
    const attack = targets[3]; // F major, bar 2
    expect(isRightChordNote(65, attack.onset, targets, timeline)).toBe(true);
    expect(isRightChordNote(69 + 12, attack.onset, targets, timeline)).toBe(
      true,
    );
    expect(isRightChordNote(64, attack.onset, targets, timeline)).toBe(false);
    // The teacher's turn is never wrong; out of a run, any chord's note.
    expect(isRightChordNote(61, 2000, targets, timeline)).toBe(true);
    expect(isRightChordNote(64, null, targets, timeline)).toBe(true);
    expect(isRightChordNote(62, null, targets, timeline)).toBe(false);
  });
});
