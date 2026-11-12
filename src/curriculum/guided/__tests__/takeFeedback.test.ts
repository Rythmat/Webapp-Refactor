import { describe, expect, it } from 'vitest';
import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import { noteNameInKey } from '../noteNames';
import {
  faultMessage,
  faultOf,
  listNames,
  reportOfAssessment,
  reportOfRun,
  timingOf,
  type FaultInput,
} from '../takeFeedback';

const facts = (over: Partial<FaultInput> = {}): FaultInput => ({
  passed: false,
  heard: true,
  wrongNames: [],
  missedNames: [],
  inTime: true,
  timing: { meanDevTicks: 0, spreadTicks: 0, meanDurationRatio: 1 },
  durationGraded: true,
  timingAccuracy: 0.5,
  durationAccuracy: 0.5,
  noun: 'notes',
  ...over,
});

const result = (over: Partial<AssessmentResult> = {}): AssessmentResult => ({
  passed: false,
  pitchAccuracy: 1,
  timingAccuracy: 0.5,
  durationAccuracy: null,
  overallScore: 0.5,
  missedNotes: [],
  wrongNotes: [],
  xpEarned: 0,
  skillTagsEarned: [],
  feedbackText: 'Not quite — try again.',
  ...over,
});

describe('the one thing most worth fixing', () => {
  it('says nothing about a pass', () => {
    expect(faultOf(facts({ passed: true, wrongNames: ['E'] }))).toBeNull();
  });

  it.each([
    ['unclear', { unclear: true, wrongNames: ['E'] }],
    ['silent', { heard: false, missedNames: ['C'] }],
    ['wrong', { wrongNames: ['F♯'], missedNames: ['F'] }],
    ['missed', { missedNames: ['E'] }],
    [
      'early',
      { timing: { meanDevTicks: -90, spreadTicks: 0, meanDurationRatio: 1 } },
    ],
    [
      'late',
      { timing: { meanDevTicks: 90, spreadTicks: 0, meanDurationRatio: 1 } },
    ],
    [
      'uneven',
      { timing: { meanDevTicks: 0, spreadTicks: 120, meanDurationRatio: 1 } },
    ],
    [
      'short',
      { timing: { meanDevTicks: 0, spreadTicks: 0, meanDurationRatio: 0.4 } },
    ],
    [
      'long',
      { timing: { meanDevTicks: 0, spreadTicks: 0, meanDurationRatio: 1.8 } },
    ],
    ['other', {}],
  ] as const)('%s', (fault, over) => {
    expect(faultOf(facts(over))).toBe(fault);
  });

  it('never blames timing out of time', () => {
    expect(
      faultOf(
        facts({
          inTime: false,
          durationGraded: false,
          timing: { meanDevTicks: -500, spreadTicks: 0, meanDurationRatio: 1 },
        }),
      ),
    ).toBe('other');
  });

  it('never blames length when length isn’t graded', () => {
    expect(
      faultOf(
        facts({
          durationGraded: false,
          timing: { meanDevTicks: 0, spreadTicks: 0, meanDurationRatio: 0.2 },
        }),
      ),
    ).toBe('other');
  });
});

describe('in words', () => {
  it('names the notes', () => {
    expect(faultMessage('wrong', facts({ wrongNames: ['F♯'] }))).toContain(
      'F♯ isn’t in this one',
    );
    expect(
      faultMessage('wrong', facts({ wrongNames: ['F♯', 'B♭'] })),
    ).toContain('F♯ and B♭ aren’t in this one');
    expect(
      faultMessage('missed', facts({ missedNames: ['E', 'G'] })),
    ).toContain('You missed E and G');
  });

  it('talks about chords as chords', () => {
    expect(
      faultMessage('missed', facts({ missedNames: ['Dm'], noun: 'chords' })),
    ).toContain('next shape');
  });

  it('lists a few and counts the rest', () => {
    expect(listNames(['C'])).toBe('C');
    expect(listNames(['C', 'C', 'E'])).toBe('C and E');
    expect(listNames(['C', 'E', 'G'])).toBe('C, E and G');
    expect(listNames(['C', 'D', 'E', 'G', 'A'])).toBe('C, D and 3 more');
  });
});

describe('timing', () => {
  it('measures against the nearest note of the same pitch', () => {
    const { meanDevTicks, meanDurationRatio } = timingOf(
      [
        { midi: 60, onset: 0, duration: 480 },
        { midi: 62, onset: 480, duration: 480 },
      ],
      [
        { midi: 60, onset: -60, duration: 240 },
        { midi: 62, onset: 420, duration: 240 },
        { midi: 62, onset: 2000, duration: 480 },
      ],
    );
    expect(meanDevTicks).toBe(-60);
    expect(meanDurationRatio).toBe(0.5);
  });

  it('has nothing to say with nothing played', () => {
    expect(timingOf([{ midi: 60, onset: 0, duration: 480 }], [])).toEqual({
      meanDevTicks: null,
      spreadTicks: null,
      meanDurationRatio: null,
    });
  });
});

describe('a report', () => {
  const base = {
    id: 1,
    step: 'A1.3',
    targets: [{ midi: 60, onset: 0, duration: 480 }],
    played: [{ midi: 60, onset: 0, duration: 480 }],
    inTime: true,
    passMarkPct: 60,
    noteName: (midi: number) => noteNameInKey(midi, 'C'),
  };

  it('keeps the step’s own words for a pass', () => {
    const report = reportOfAssessment({
      ...base,
      result: result({ passed: true, feedbackText: 'Solid.' }),
    });
    expect(report.fault).toBeNull();
    expect(report.message).toBe('Solid.');
  });

  it('names the wrong note, spelled for the key', () => {
    const report = reportOfAssessment({
      ...base,
      result: result({ wrongNotes: [61] }),
    });
    expect(report.fault).toBe('wrong');
    expect(report.message).toContain('C♯');
  });

  it('shows no score for a take it couldn’t hear', () => {
    const report = reportOfAssessment({
      ...base,
      result: result({ unclear: true }),
    });
    expect(report.fault).toBe('unclear');
    expect(report.score).toBeNull();
    expect(report.parts).toEqual([]);
  });

  it('reads a fretted take’s own timing', () => {
    const report = reportOfAssessment({
      ...base,
      result: result({
        outcomes: [
          { targetIndex: 0, onsetTick: 0, status: 'hit', timingDevTicks: 120 },
          {
            targetIndex: 1,
            onsetTick: 480,
            status: 'hit',
            timingDevTicks: 100,
          },
        ],
      }),
    });
    expect(report.fault).toBe('late');
  });

  it('lists the score’s parts', () => {
    const report = reportOfAssessment({
      ...base,
      result: result({ durationAccuracy: 0.8 }),
    });
    expect(report.parts.map((p) => p.label)).toEqual([
      'Notes',
      'Timing',
      'Length',
    ]);
  });

  const run = {
    id: 1,
    step: 'asc-pa',
    total: 8,
    required: 7,
    passMarkPct: 80,
    noteName: (midi: number) => noteNameInKey(midi, 'C'),
    successMessage: 'Yes.',
  };

  it('says what a run missed', () => {
    const report = reportOfRun({
      ...run,
      hits: 5,
      passed: false,
      detail: { missedMidis: [64, 67], wrongMidis: [], timing: null },
    });
    expect(report.fault).toBe('missed');
    expect(report.message).toContain('E and G');
    expect(report.score).toBeCloseTo(5 / 8);
  });

  it('only blames wrong notes when they’re what went wrong', () => {
    const fewWrong = reportOfRun({
      ...run,
      hits: 5,
      passed: false,
      detail: { missedMidis: [64, 67, 69], wrongMidis: [61], timing: null },
    });
    expect(fewWrong.fault).toBe('missed');
    const manyWrong = reportOfRun({
      ...run,
      hits: 6,
      passed: false,
      detail: { missedMidis: [64, 67], wrongMidis: [61, 63, 66], timing: null },
    });
    expect(manyWrong.fault).toBe('wrong');
  });

  it('knows a silent run', () => {
    const report = reportOfRun({ ...run, hits: 0, passed: false });
    expect(report.fault).toBe('silent');
  });
});

describe('a note’s name', () => {
  it('follows the key', () => {
    expect(noteNameInKey(70, 'F')).toBe('B♭');
    expect(noteNameInKey(66, 'D')).toBe('F♯');
    expect(noteNameInKey(65, 'F#')).toBe('E♯');
    expect(noteNameInKey(61, 'Eb')).toBe('D♭');
  });
});
