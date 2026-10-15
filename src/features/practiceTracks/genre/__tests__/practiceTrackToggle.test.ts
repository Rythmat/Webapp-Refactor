import { describe, expect, it } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { buildGenrePracticeTrack } from '../buildGenrePracticeTrack';

/** A Latin L1 in miniature: one play-along per style (D-075, D-081). */
const step = (
  n: number,
  styleRef: string,
  chordSymbols: string[],
): ActivityStepV2 =>
  ({
    stepNumber: n,
    module: 'latin_l1',
    section: 'D',
    subsection: 'D1',
    activity: `D${n}.1: Play-along`,
    direction: 'Play along.',
    assessment: 'pitch_order_timing_duration',
    tag: `latin:test_${n}`,
    styleRef,
    successFeedback: '',
    targetNotes: [{ note: 'E4', onset: 0, duration: 480 }],
    chordSymbols,
    backing_parts: {
      engine_generates: ['drums', 'bass', 'chords'],
      student_plays: ['melody'],
    },
  }) as unknown as ActivityStepV2;

const latinL1 = {
  genre: 'latin',
  level: 1,
  version: 'v2',
  title: 'Latin Level 1',
  params: {
    defaultKey: 'E minor',
    defaultScale: [0, 2, 3, 5, 7, 8, 10],
    defaultScaleId: 'aeolian',
    tempoRange: [90, 100],
    swing: 0,
    grooves: [],
  },
  sections: [
    {
      id: 'D',
      name: 'Performance',
      steps: [
        step(1, 'l1a', ['Em', 'C', 'G', 'D']),
        step(2, 'l1b', ['Em', 'Am', 'B7', 'Em']),
        {
          ...step(3, 'l1c', ['G', 'C', 'D7', 'G']),
          key: 'G major',
        } as ActivityStepV2,
        {
          ...step(4, 'l1c', []),
          chordSymbols: undefined,
          key: 'G major',
          scaleId: 'ionian',
          scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
          backing_parts: undefined,
        } as unknown as ActivityStepV2,
      ],
    },
  ],
} as unknown as ActivityFlowV2;

describe('the Practice Track groove toggle (D-088)', () => {
  it("offers the level's styles and every progression it teaches", async () => {
    await pairingsReady;
    const track = buildGenrePracticeTrack(latinL1, 'D')!;
    expect(track.styles.map((s) => s.name)).toEqual([
      'Reggaeton',
      'Cumbia',
      'Mariachi',
    ]);
    // The section's last play-along is the Mariachi one.
    expect(track.styleId).toBe('latin-l1-mariachi');
    expect(track.progressions.map((p) => p.label)).toEqual([
      'Reggaeton · Em – C – G – D',
      'Cumbia · Em – Am – B7 – Em',
      'Mariachi · G – C – D7 – G',
    ]);
  });

  it("turns the track into 3/4 for the Mariachi groove, 4/4 for Cumbia's", async () => {
    await pairingsReady;
    const mariachi = buildGenrePracticeTrack(latinL1, 'D', {
      styleId: 'latin-l1-mariachi',
    })!;
    expect(mariachi.timeSignature).toEqual([3, 4]);
    expect(mariachi.loopTicks).toBe(16 * 1440);
    expect(mariachi.chordRegions[1].startTick).toBe(1440);
    expect(mariachi.drumKit).toBe('go_go_kit');
    expect(mariachi.bassVoice).toBe('upright');

    const cumbia = buildGenrePracticeTrack(latinL1, 'D', {
      styleId: 'latin-l1-cumbia',
    })!;
    expect(cumbia.timeSignature).toEqual([4, 4]);
    expect(cumbia.loopTicks).toBe(16 * 1920);
    expect(cumbia.bassVoice).toBe('finger');
  });

  it('loops a chosen progression under any groove', async () => {
    await pairingsReady;
    const track = buildGenrePracticeTrack(latinL1, 'D', {
      styleId: 'latin-l1-cumbia',
      chords: ['Em', 'C', 'G', 'D'],
    })!;
    expect(track.chordCycle).toEqual(['Em', 'C', 'G', 'D']);
    expect(track.progressionId).toBe('Em C G D');
    const bass = track.clips.bass!.events;
    // The Cumbia line over the reggaeton loop: bar 2 is C.
    expect(bass.find((e) => e.startTick === 1920)!.note % 12).toBe(0);
  });

  it('leaves single chords off the progression switch', async () => {
    const withChordStep = {
      ...latinL1,
      sections: [
        {
          ...latinL1.sections[0],
          steps: [step(9, 'l1a', ['Em']), ...latinL1.sections[0].steps],
        },
      ],
    } as ActivityFlowV2;
    const track = buildGenrePracticeTrack(withChordStep, 'D')!;
    expect(track.progressions.every((p) => p.chords.length > 1)).toBe(true);
  });

  it("moves the track into the style's own key: Mariachi in G major (D-078)", async () => {
    await pairingsReady;
    const mariachi = buildGenrePracticeTrack(latinL1, 'D', {
      styleId: 'latin-l1-mariachi',
    })!;
    expect(mariachi.keyLabel).toBe('G');
    expect(mariachi.mode).toBe('ionian');
    expect(mariachi.chordRegions.slice(0, 3).map((r) => r.name)).toEqual([
      '1 maj',
      '4 maj',
      '5 dom7',
    ]);
    // Its scale leads, spelled and lit from G.
    expect(mariachi.scales[0]).toMatchObject({
      title: 'Ionian (Major)',
      tonicPc: 7,
      tonicLabel: 'G',
      names: ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
    });

    const cumbia = buildGenrePracticeTrack(latinL1, 'D', {
      styleId: 'latin-l1-cumbia',
    })!;
    expect(cumbia.keyLabel).toBe('E');
    expect(cumbia.scales[0].tonicLabel).toBe('E');
  });

  it('shows no groove toggle in a one-style level', () => {
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    expect(track.styles).toEqual([]);
    expect(track.styleId).toBeNull();
    expect(track.progressions.length).toBeGreaterThan(0);
  });
});
