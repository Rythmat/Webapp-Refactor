// @vitest-environment jsdom
/**
 * Guitar assessment policies: octave-tolerant notes, chords by identity,
 * per-target outcomes and the "unclear" verdict — and proof that assess()
 * without a policy is the piano path, untouched.
 */

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { identifyChordFromPitchClasses } from '@/learn/audio/guitar/chordIdentity';
import { shapeLowestMidi, shapePitchClasses } from '@/lib/guitar/fretboard';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '../data/activityFlows/guitarAppliedTheoryFundamentals';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import {
  assessPitchAndTiming,
  assessPitchOnly,
  selfReportedResult,
  useGenreAssessment,
  type AssessmentPolicy,
  type UserChordEvent,
} from '../hooks/useGenreAssessment';
import type { AssessmentType } from '../types/activity';
import type { ActivityStepV2, ChordTarget } from '../types/activity.v2';

afterEach(cleanup);

function renderAssess() {
  return renderHook(() => useGenreAssessment()).result.current.assess;
}

const OOT: AssessmentType = 'pitch_only';
const IT: AssessmentType = 'pitch_order_timing_duration';

/** assess() through the hook, as the lesson calls it, with a policy. */
function grade(
  policy: AssessmentPolicy,
  type: AssessmentType,
  targets: GenreNoteEvent[] = [],
  played: GenreNoteEvent[] = [],
) {
  return renderAssess()(targets, played, type, ['tag'], 'Nice', 80, policy);
}

function n(midi: number, onset: number, duration: number): GenreNoteEvent {
  return { midi, onset, duration };
}

const FLOW = buildGuitarAppliedTheoryFundamentalsFlow('C');
function step(suffix: string): ActivityStepV2 {
  const found = FLOW.sections
    .flatMap((s) => s.steps)
    .find((s) => s.tag.startsWith(`guitar_fund:${suffix} `));
  if (!found) throw new Error(`no step ${suffix}`);
  return found;
}
const targetsOf = (s: ActivityStepV2): GenreNoteEvent[] =>
  s.targetNotes!.map(({ midi, onset, duration }) => n(midi, onset, duration));
const statuses = (result: ReturnType<typeof grade>) =>
  result.outcomes!.map((o) => o.status);

/** A strum of a shape, named as the MIDI aggregator would name it. */
function strum(frets: string, onset: number, duration: number): UserChordEvent {
  const pcs = shapePitchClasses(frets);
  const bassPc = shapeLowestMidi(frets) % 12;
  const { rootPc, quality } = identifyChordFromPitchClasses(pcs, bassPc)!;
  return {
    rootPc,
    quality,
    pcs,
    onset,
    duration,
    confidence: 1,
    source: 'midi',
  };
}

// Voicings unlike the book's open C / Dm / Em / F — identity ignores voicing.
const VOICING: Record<string, string> = {
  C: '8-10-10-9-8-8',
  Dm: 'X-5-7-7-6-5',
  Em: '0-2-2-0-0-0',
  F: '1-3-3-2-1-1',
};
const G_OPEN = '3-2-0-0-0-3';

/** Strum each target's chord exactly on time. */
function onTime(
  targets: ChordTarget[],
  voicing = VOICING,
  duration: (t: ChordTarget) => number = (t) => t.durationTicks,
) {
  return targets.map((t) => strum(voicing[t.symbol], t.onsetTick, duration(t)));
}

const chords = (
  s: Pick<ActivityStepV2, 'chordTargets'>,
  userChords: UserChordEvent[],
  unclearTargetIndexes?: number[],
): AssessmentPolicy => ({
  kind: 'chords',
  chordTargets: s.chordTargets!,
  userChords,
  ...(unclearTargetIndexes ? { unclearTargetIndexes } : {}),
});

// ── No policy: the piano path ───────────────────────────────────────────────

describe('assess without a policy', () => {
  // The existing useGenreAssessment.test.ts fixtures.
  const target = [n(60, 0, 480), n(64, 480, 480), n(67, 960, 480)];
  const takes: GenreNoteEvent[][] = [
    target.map((t) => ({ ...t })),
    [n(67, 999, 10), n(60, 0, 10), n(64, 500, 10)],
    [...target, n(61, 1440, 480)],
    [n(72, 0, 10), n(64, 480, 10), n(67, 960, 10)],
    target.map((t) => ({ ...t, onset: t.onset + 480 })),
    [target[0]],
    target.map((t) => ({ ...t, duration: t.duration / 6 })),
    [],
  ];
  const types: AssessmentType[] = [
    'pitch_only',
    'pitch_order',
    'pitch_order_timing',
    'pitch_order_timing_duration',
  ];

  it('returns exactly what the piano functions return', () => {
    const assess = renderAssess();
    for (const type of types) {
      for (const played of takes) {
        const direct =
          type === 'pitch_order_timing' ||
          type === 'pitch_order_timing_duration'
            ? assessPitchAndTiming(target, played, 120, type, ['t'], 'ok')
            : assessPitchOnly(target, played, ['t'], 'ok');
        const viaHook = assess(target, played, type, ['t'], 'ok', 120);
        expect(viaHook).toStrictEqual(direct);
        expect(
          assess(target, played, type, ['t'], 'ok', 120, undefined),
        ).toStrictEqual(direct);
        expect(viaHook.outcomes).toBeUndefined();
      }
    }
  });

  it('scores the same as the exact notes policy, which adds outcomes', () => {
    const assess = renderAssess();
    const exact: AssessmentPolicy = { kind: 'notes', match: 'exact' };
    for (const type of types) {
      for (const played of takes) {
        const piano = assess(target, played, type, ['t'], 'ok', 120);
        const withPolicy = assess(
          target,
          played,
          type,
          ['t'],
          'ok',
          120,
          exact,
        );
        const { outcomes, ...guitar } = withPolicy;
        expect(guitar).toStrictEqual(piano);
        expect(outcomes).toHaveLength(target.length);
      }
    }
  });
});

// ── Notes ───────────────────────────────────────────────────────────────────

const OCTAVE: AssessmentPolicy = { kind: 'notes', match: 'octave_tolerant' };

describe('notes, octave tolerant', () => {
  const scale = targetsOf(step('major_scale_ascending_oot'));

  it('out of time, a scale played an octave off fails', () => {
    const octaveUp = scale.map((t) => ({ ...t, midi: t.midi + 12 }));
    const result = grade(OCTAVE, OOT, scale, octaveUp);
    expect(result.passed).toBe(false);
    expect(result.overallScore).toBeLessThan(0.75);
    // The played C4 was the top note, so it can't also stand in for C3.
    expect(result.missedNotes).toEqual([scale[0].midi]);
    expect(result.wrongNotes).toEqual([]);

    // A generous octaveCredit is capped at 0.7.
    const generous = { ...OCTAVE, octaveCredit: 0.95 };
    expect(grade(generous, OOT, scale, octaveUp)).toStrictEqual(result);
  });

  it('out of time, nothing passes played an octave off', () => {
    const suffixes = [
      'major_scale_ascending_descending_oot',
      'pentatonic_scale_ascending_oot',
      'pentatonic_scale_ascending_descending_oot',
      'arpeggio_degree1_oot',
      'contour_a_oot',
    ];
    for (const suffix of suffixes) {
      const targets = targetsOf(step(suffix));
      for (const shift of [12, -12]) {
        const played = targets.map((t) => ({ ...t, midi: t.midi + shift }));
        expect(grade(OCTAVE, OOT, targets, played).passed, suffix).toBe(false);
      }
    }
  });

  it('out of time, a skipped top note is missed, not credited an octave down', () => {
    const top = scale[scale.length - 1].midi;
    const result = grade(
      OCTAVE,
      OOT,
      scale,
      scale.filter((t) => t.midi !== top),
    );
    expect(result.passed).toBe(false);
    expect(result.missedNotes).toEqual([top]);
  });

  it('out of time, one octave slip still passes and is marked', () => {
    const played = scale.map((t, i) =>
      i === 2 ? { ...t, midi: t.midi - 12 } : t,
    );
    const result = grade(OCTAVE, OOT, scale, played);
    expect(result.passed).toBe(true);
    expect(result.pitchAccuracy).toBeCloseTo((7 + 0.7) / 8);
    expect(statuses(result)).toEqual([
      ...['hit', 'hit', 'wrong', 'hit'],
      ...['hit', 'hit', 'hit', 'hit'],
    ]);

    // The exact policy (MIDI guitar) misses that note instead.
    const exact = grade({ kind: 'notes', match: 'exact' }, OOT, scale, played);
    expect(exact.passed).toBe(false);
    expect(exact.missedNotes).toEqual([52]);
    expect(exact.wrongNotes).toEqual([40]);
  });

  it('in time, an octave slip earns 0.7 pitch credit and keeps its timing', () => {
    const played = scale.map((t, i) =>
      i === 2 ? { ...t, midi: t.midi + 12, onset: t.onset + 60 } : t,
    );
    const result = grade(OCTAVE, 'pitch_order_timing', scale, played);
    expect(result.passed).toBe(true);
    expect(result.pitchAccuracy).toBeCloseTo((7 + 0.7) / 8);
    expect(result.outcomes![2]).toEqual({
      targetIndex: 2,
      onsetTick: scale[2].onset,
      status: 'wrong',
      timingDevTicks: 60,
    });
  });

  it('in time, a note two octaves off is wrong, on a target marked wrong', () => {
    const played = scale.map((t, i) =>
      i === 3 ? { ...t, midi: t.midi + 24 } : t,
    );
    const result = grade(OCTAVE, IT, scale, played);
    expect(result.missedNotes).toEqual([scale[3].midi]);
    expect(result.wrongNotes).toEqual([scale[3].midi + 24]);
    expect(result.outcomes![3].status).toBe('wrong');
    expect(result.outcomes![0].durationRatio).toBe(1);
  });
});

// ── Chords, out of time ─────────────────────────────────────────────────────

describe('chords, out of time', () => {
  const s = step('play_chords_oot'); // C Dm Em F
  const firstOnly = (x: ActivityStepV2) => ({
    chordTargets: x.chordTargets!.slice(0, 1),
  });

  it('passes a strummed open C against the book voicing', () => {
    const openC = strum('X-3-2-0-1-0', 0, 900);
    expect(grade(chords(firstOnly(s), [openC]), OOT)).toMatchObject({
      passed: true,
      pitchAccuracy: 1,
      timingAccuracy: null,
      overallScore: 1,
      skillTagsEarned: ['tag'],
      feedbackText: 'Nice',
      outcomes: [{ targetIndex: 0, onsetTick: 0, status: 'hit' }],
    });
  });

  it('passes every chord in other voicings, in any order and timing', () => {
    const played = ['F', 'C', 'Em', 'Dm'].map((symbol, i) =>
      strum(VOICING[symbol], i * 5000, 300),
    );
    const result = grade(chords(s, played), OOT);
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBe(1);
  });

  it('a missing 7th still passes; a rootless partial chord does not', () => {
    const cmaj7 = firstOnly(step('play_sevenths_oot'));
    const triad = strum('X-3-2-0-1-0', 0, 900); // Cmaj7 without its B
    expect(grade(chords(cmaj7, [triad]), OOT).passed).toBe(true);

    const em = strum(VOICING.Em, 0, 900); // E G B: Cmaj7 without its root
    const result = grade(chords(cmaj7, [em]), OOT);
    expect(result.passed).toBe(false);
    expect(result.pitchAccuracy).toBe(0.6);
    expect(statuses(result)).toEqual(['wrong']);
    // Strummed, just not cleanly: named as such, never as "missed".
    expect(result.feedbackText).toBe(
      "Cmaj7 wasn't clean — check the shape string by string.",
    );
  });

  it('penalises a wrong chord', () => {
    const played = [...onTime(s.chordTargets!), strum(G_OPEN, 4000, 400)];
    const result = grade(chords(s, played), OOT);
    expect(result.pitchAccuracy).toBe(1);
    expect(result.overallScore).toBeCloseTo(1 - (1 / 5) * 0.5);
    expect(result.passed).toBe(true);
  });

  it('fails a missed chord and names it', () => {
    const played = onTime(s.chordTargets!.slice(0, 3));
    const result = grade(chords(s, played), OOT);
    expect(result.passed).toBe(false);
    expect(result.feedbackText).toBe(
      'Missed F — make sure to strum every chord shown.',
    );
    expect(statuses(result)).toEqual(['hit', 'hit', 'hit', 'missed']);
    expect(result.missedNotes).toEqual([]);
  });
});

// ── Chords, in time ─────────────────────────────────────────────────────────

describe('chords, in time', () => {
  const quarter = step('play_chords_quarter'); // C Dm Em F, a beat each
  const legato = step('chord_articulation_legato'); // 420 of 480: let ring
  const staccato = step('chord_articulation_staccato'); // 120 of 480

  it('scores on-time strums at 1, with outcomes', () => {
    const result = grade(chords(quarter, onTime(quarter.chordTargets!)), IT);
    expect(result).toMatchObject({
      passed: true,
      pitchAccuracy: 1,
      timingAccuracy: 1,
      durationAccuracy: 1,
    });
    expect(result.outcomes).toEqual(
      quarter.chordTargets!.map((t, i) => ({
        targetIndex: i,
        onsetTick: t.onsetTick,
        status: 'hit',
        timingDevTicks: 0,
        durationRatio: 1,
      })),
    );
  });

  it('grades timing through the Gaussian and reports the deviation', () => {
    const late = onTime(quarter.chordTargets!).map((c) => ({
      ...c,
      onset: c.onset + 120,
    }));
    const result = grade(chords(quarter, late), IT);
    // A 16th late is a quarter of a beat; σ is 0.15 of a beat.
    expect(result.timingAccuracy).toBeCloseTo(
      Math.exp(-0.5 * (0.25 / 0.15) ** 2),
    );
    expect(result.outcomes!.map((o) => o.timingDevTicks)).toEqual([
      120, 120, 120, 120,
    ]);
  });

  it('lets a legato chord ring on, but a staccato chord must be muted', () => {
    // Each chord rings until the next strum; the last rings out.
    const ringing = (x: ActivityStepV2) =>
      onTime(x.chordTargets!, VOICING, (t) => (t.onsetTick === 0 ? 480 : 1200));

    const rung = grade(chords(legato, ringing(legato)), IT);
    expect(rung.durationAccuracy).toBe(1);
    expect(rung.outcomes!.map((o) => o.durationRatio)).toEqual([1, 1]);

    const unmuted = grade(chords(staccato, ringing(staccato)), IT);
    expect(unmuted.durationAccuracy).toBeLessThan(0.2);
    expect(unmuted.outcomes!.map((o) => o.durationRatio)).toEqual([4, 10]);

    const muted = grade(chords(staccato, onTime(staccato.chordTargets!)), IT);
    expect(muted.durationAccuracy).toBe(1);
  });

  it('still penalises a legato chord cut short', () => {
    const short = onTime(legato.chordTargets!, VOICING, () => 105);
    expect(grade(chords(legato, short), IT).durationAccuracy).toBeLessThan(0.2);
  });

  it('marks a wrong chord played in a target’s place, and penalises it', () => {
    const played = onTime(quarter.chordTargets!, { ...VOICING, Dm: G_OPEN });
    const result = grade(chords(quarter, played), IT);
    expect(statuses(result)).toEqual(['hit', 'wrong', 'hit', 'hit']);
    // A quarter of the score for the missing Dm, then the wrong-chord penalty.
    expect(result.overallScore).toBeCloseTo(0.75 - (1 / 5) * 0.5);
  });

  it('fails missed chords with a chord-named message', () => {
    const played = onTime(quarter.chordTargets!.slice(0, 2));
    const result = grade(chords(quarter, played), IT);
    expect(result.passed).toBe(false);
    expect(result.feedbackText).toBe(
      'Missed Em, F — make sure to strum every chord shown.',
    );
    expect(statuses(result)).toEqual(['hit', 'hit', 'missed', 'missed']);
  });
});

// ── Detection trust ─────────────────────────────────────────────────────────

describe('unclear targets', () => {
  const s = step('play_chords_quarter');
  const all = onTime(s.chordTargets!);

  it('are left out of the score', () => {
    const result = grade(chords(s, all.slice(0, 3), [3]), IT);
    expect(result.passed).toBe(true);
    expect(result.pitchAccuracy).toBe(1);
    expect(result.unclear).toBeUndefined();
    expect(result.outcomes![3]).toEqual({
      targetIndex: 3,
      onsetTick: 1440,
      status: 'unclear',
    });
  });

  it('over half unclear: "couldn\'t hear clearly", which is not a pass', () => {
    const result = grade(chords(s, all, [0, 1, 2]), IT);
    expect(result).toMatchObject({
      passed: false,
      unclear: true,
      xpEarned: 0,
      skillTagsEarned: [],
      feedbackText:
        "Couldn't hear that clearly — check your setup and try again.",
    });
    expect(statuses(result)).toEqual(['unclear', 'unclear', 'unclear', 'hit']);
  });

  it('exactly half unclear is still a verdict', () => {
    const result = grade(chords(s, all, [0, 1]), IT);
    expect(result.unclear).toBeUndefined();
    expect(result.passed).toBe(true);
  });

  it('works for notes too', () => {
    const three = targetsOf(step('contour_a_oot'));
    const policy = { ...OCTAVE, unclearTargetIndexes: [0, 2] };
    const result = grade(policy, OOT, three, []);
    expect(result.unclear).toBe(true);
    expect(statuses(result)).toEqual(['unclear', 'missed', 'unclear']);
  });
});

describe('selfReportedResult', () => {
  it('is a pass the student vouched for, scoring nothing', () => {
    expect(selfReportedResult('Counted it myself')).toEqual({
      passed: true,
      pitchAccuracy: 0,
      timingAccuracy: null,
      durationAccuracy: null,
      overallScore: 0,
      missedNotes: [],
      wrongNotes: [],
      xpEarned: 0,
      skillTagsEarned: [],
      feedbackText: 'Counted it myself',
      selfReported: true,
    });
  });
});
