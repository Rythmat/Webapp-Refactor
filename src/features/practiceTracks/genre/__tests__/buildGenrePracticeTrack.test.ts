import { describe, it, expect } from 'vitest';
import {
  funkL1,
  funkL2,
  funkL3,
} from '@/curriculum/data/activityFlows/funk_v2';
import { popL2 } from '@/curriculum/data/activityFlows/pop_v2';
import { reggaeL1 } from '@/curriculum/data/activityFlows/reggae_v2';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import {
  buildGenrePracticeTrack,
  chordOctaveShift,
  flowHasPracticeTracks,
  loopChords,
  sectionHasContent,
} from '../buildGenrePracticeTrack';

const SECTIONS: ActivitySectionId[] = ['A', 'B', 'C', 'D'];
const LOOP_TICKS = 16 * 1920;

describe('buildGenrePracticeTrack — what the engine plays', () => {
  it.each([
    ['A', ['drums', 'bass', 'chords'], ['melody']],
    ['B', ['drums', 'bass'], ['chords']],
    ['C', ['drums', 'chords'], ['bass']],
    ['D', ['drums', 'bass'], ['chords', 'melody']],
  ] as const)(
    'section %s: engine plays %j, student plays %j',
    (section, engine, student) => {
      const track = buildGenrePracticeTrack(funkL2, section);
      expect(track).not.toBeNull();
      expect(Object.keys(track!.clips).sort()).toEqual([...engine].sort());
      expect(track!.studentParts).toEqual([...student]);
    },
  );

  it('never leaves the student a part the engine is already playing', () => {
    for (const section of SECTIONS) {
      const track = buildGenrePracticeTrack(funkL2, section)!;
      for (const part of track.studentParts) {
        if (part === 'melody') continue; // the engine has no melody part
        expect(track.clips).not.toHaveProperty(part);
      }
    }
  });
});

describe('buildGenrePracticeTrack — the loop', () => {
  it('runs sixteen bars', () => {
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    expect(track.loopTicks).toBe(LOOP_TICKS);
    for (const clip of Object.values(track.clips)) {
      expect(clip.durationTicks).toBe(LOOP_TICKS);
    }
  });

  it('drops the one-shot ending note that would double at the seam', () => {
    for (const section of SECTIONS) {
      const track = buildGenrePracticeTrack(funkL2, section)!;
      for (const clip of Object.values(track.clips)) {
        for (const event of clip.events) {
          expect(event.startTick).toBeLessThan(LOOP_TICKS);
          expect(event.startTick + event.durationTicks).toBeLessThanOrEqual(
            LOOP_TICKS,
          );
        }
      }
    }
  });

  // Funk L2 as it was before it authored a Practice Track progression, for the
  // tests of what a section falls back on.
  const unauthored: ActivityFlowV2 = {
    ...funkL2,
    params: { ...funkL2.params, practiceTrack: undefined },
  };

  it('loops D3.1’s progression in every Funk L2 section', () => {
    for (const section of SECTIONS) {
      expect(buildGenrePracticeTrack(funkL2, section)!.chordCycle).toEqual([
        'Am9',
        'D13',
        'Am9',
        'E7#5',
      ]);
    }
  });

  it('takes the chord cycle from the section that has one', () => {
    expect(buildGenrePracticeTrack(unauthored, 'B')!.chordCycle).toEqual([
      'Am9',
      'D13',
      'Am9',
      'E7#5',
    ]);
  });

  it('vamps the modal tonic where the section names no chords', () => {
    // Funk L2 Section A teaches scales and phrases; it has no chord symbols.
    const track = buildGenrePracticeTrack(unauthored, 'A')!;
    expect(track.chordCycle).toEqual(['Am9']);
    expect(track.mode).toBe('dorian');
  });

  it('lets an authored progression override the section', () => {
    const authored: ActivityFlowV2 = {
      ...funkL2,
      params: {
        ...funkL2.params,
        practiceTrack: { chords: ['Am9', 'D13'], bpm: 100 },
      },
    };
    const track = buildGenrePracticeTrack(authored, 'A')!;
    expect(track.chordCycle).toEqual(['Am9', 'D13']);
    expect(track.bpm).toBe(100);
  });

  it('opens at the middle of the level tempo range', () => {
    // Funk L2 is 95-108.
    expect(buildGenrePracticeTrack(funkL2, 'A')!.bpm).toBe(102);
  });
});

describe('buildGenrePracticeTrack — chord regions', () => {
  it('fills every bar of the loop, cycling the progression', () => {
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    expect(track.chordRegions).toHaveLength(16);
    expect(track.chordRegions[0].startTick).toBe(0);
    expect(track.chordRegions[15].endTick).toBe(LOOP_TICKS);
    // Bar 5 comes back round to the top of a four-chord cycle.
    expect(track.chordRegions[4].noteName).toBe(track.chordRegions[0].noteName);
  });

  it('writes the letter symbol and its degree label, not the same thing twice', () => {
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    const labels = new Map(track.chordRegions.map((r) => [r.noteName, r.name]));
    expect(Object.fromEntries(labels)).toEqual({
      Am9: '1 min9',
      D13: '4 dom13',
      'E7#5': '5 dom7(#5)',
    });
  });

  it("keeps Aaron's own chord symbols exactly as written", () => {
    // 'funk9' is his name for a rootless b7-9-5 voicing; the hybrid formatter
    // has no degree label for it, so the symbol must survive both fields.
    const authored: ActivityFlowV2 = {
      ...funkL2,
      params: {
        ...funkL2.params,
        practiceTrack: { chords: ['Afunk9', 'Dfunk9'] },
      },
    };
    const track = buildGenrePracticeTrack(authored, 'B')!;
    expect(track.chordCycle).toEqual(['Afunk9', 'Dfunk9']);
    for (const region of track.chordRegions) {
      expect(region.noteName).toMatch(/^[AD]funk9$/);
      expect(region.name).toBe(region.noteName);
    }
  });

  it('keeps every region on a chord the cycle actually names', () => {
    const track = buildGenrePracticeTrack(funkL3, 'B')!;
    const cycle = track.chordCycle.map((s) => s.replace(/b/g, '♭'));
    for (const region of track.chordRegions) {
      expect(cycle).toContain(region.noteName.replace(/b/g, '♭'));
    }
  });

  it('gives every region real chord tones and a colour', () => {
    for (const section of SECTIONS) {
      for (const region of buildGenrePracticeTrack(funkL2, section)!
        .chordRegions) {
        expect(region.midis!.length).toBeGreaterThan(1);
        expect(region.color).toHaveLength(3);
      }
    }
  });
});

describe('buildGenrePracticeTrack — register', () => {
  const chordNotes = (section: ActivitySectionId) =>
    buildGenrePracticeTrack(funkL2, section)!.clips.chords?.events.map(
      (e) => e.note,
    );

  it('comps inside the register rule the level states for itself', () => {
    // Funk's own content header: chord voicings within C3(48)-C5(72), sweet
    // spot E3(52)-G4(67). The engine voices Am9 as G4-C5-E5, reaching F#5 on
    // its approach — outside the rule until the figure is moved.
    //
    // The rule is about voicings. A 16th-note chromatic approach may sit a
    // half step outside it, resolving in: under D3.1's progression (the level's
    // Practice Track since 2026-09-30) D13's C3 is sometimes approached from B2.
    const events = buildGenrePracticeTrack(funkL2, 'A')!.clips.chords!.events;
    const voiced = events
      .filter((e) => e.durationTicks > 120)
      .map((e) => e.note);
    const all = events.map((e) => e.note);
    expect(Math.min(...voiced)).toBeGreaterThanOrEqual(48);
    expect(Math.max(...voiced)).toBeLessThanOrEqual(72);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(47);
    expect(Math.max(...all)).toBeLessThanOrEqual(73);
  });

  it('leaves the chords where the lesson voiced them when nobody is improvising', () => {
    // Section C's student plays bass, two octaves below the chords, so the
    // figure stays in the engine's own guide-tone window (A3-G4 and up).
    expect(Math.min(...chordNotes('C')!)).toBeGreaterThanOrEqual(56);
  });

  it('voices the same section the same way every time', () => {
    // The engine's timing and approach notes are random; the register is not.
    const spans = Array.from({ length: 6 }, () => {
      const notes = chordNotes('A')!;
      return Math.round(Math.min(...notes) / 12);
    });
    expect(new Set(spans).size).toBe(1);
  });

  it('never moves the bass', () => {
    for (const section of SECTIONS) {
      const bass = buildGenrePracticeTrack(funkL2, section)!.clips.bass;
      if (!bass) continue;
      expect(Math.max(...bass.events.map((e) => e.note))).toBeLessThanOrEqual(
        60,
      );
    }
  });

  it('reports where the step it was built from writes its melody', () => {
    // The source step is Section A's last play-along, written E4 up.
    expect(buildGenrePracticeTrack(funkL2, 'A')!.melodyFloor).toBe(64);
  });
});

describe('chordOctaveShift', () => {
  const steps = (melodyLow: number | null) =>
    [
      {
        targetNotes:
          melodyLow === null
            ? []
            : [{ midi: melodyLow, onset: 0, duration: 480 }],
      },
    ] as unknown as Parameters<typeof chordOctaveShift>[0];

  it('drops an octave when the melody reaches into the chord register', () => {
    expect(chordOctaveShift(steps(52), ['melody'])).toBe(-12);
    expect(chordOctaveShift(steps(67), ['melody'])).toBe(-12);
  });

  it('leaves the chords alone when the melody sits above them', () => {
    expect(chordOctaveShift(steps(72), ['melody'])).toBe(0);
  });

  it('leaves the chords alone when the student plays no melody', () => {
    expect(chordOctaveShift(steps(52), ['chords'])).toBe(0);
    expect(chordOctaveShift(steps(52), ['bass'])).toBe(0);
  });

  it('shifts a two-hand part, which plays a melody too', () => {
    expect(chordOctaveShift(steps(60), ['chords', 'melody'])).toBe(-12);
  });

  it('assumes a mid-keyboard melody when the section writes none', () => {
    expect(chordOctaveShift(steps(null), ['melody'])).toBe(-12);
  });
});

describe('buildGenrePracticeTrack — the content gate', () => {
  it('offers nothing for a stub genre', () => {
    expect(flowHasPracticeTracks(reggaeL1)).toBe(false);
    for (const section of SECTIONS) {
      expect(buildGenrePracticeTrack(reggaeL1, section)).toBeNull();
      expect(
        sectionHasContent(reggaeL1.sections.find((s) => s.id === section)!),
      ).toBe(false);
    }
  });

  it('offers every section of every authored level', () => {
    for (const flow of [funkL1, funkL2, funkL3, popL2]) {
      expect(flowHasPracticeTracks(flow)).toBe(true);
      for (const section of SECTIONS) {
        expect(buildGenrePracticeTrack(flow, section)).not.toBeNull();
      }
    }
  });
});

describe('buildGenrePracticeTrack — every fallback tonic is playable', () => {
  it.each([
    'ionian',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'aeolian',
    'locrian',
  ])('%s', (mode) => {
    const scaleId = mode;
    const flow: ActivityFlowV2 = {
      ...funkL2,
      params: {
        ...funkL2.params,
        defaultScaleId: scaleId,
        practiceTrack: undefined,
      },
      sections: funkL2.sections.map((s) =>
        s.id === 'A'
          ? {
              ...s,
              steps: s.steps.map((st) => ({ ...st, chordSymbols: undefined })),
            }
          : s,
      ),
    };
    const track = buildGenrePracticeTrack(flow, 'A')!;
    expect(track.chordCycle).toHaveLength(1);
    expect(chordSymbolTones(track.chordCycle[0])).not.toBeNull();
    expect(track.chordRegions).toHaveLength(16);
  });
});

describe('loopChords — an activity’s phrase as a loop', () => {
  it('drops a landing back on the first chord from an odd-length phrase', () => {
    expect(loopChords(['Cm9', 'F13', 'Ab13', 'G7alt', 'Cm9'])).toEqual([
      'Cm9',
      'F13',
      'Ab13',
      'G7alt',
    ]);
  });

  it('keeps an even-length progression that ends where it began', () => {
    expect(loopChords(['Am9', 'D13', 'E7#5', 'Am9'])).toEqual([
      'Am9',
      'D13',
      'E7#5',
      'Am9',
    ]);
  });

  it('reads a list written out twice as one turn', () => {
    expect(loopChords(['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'])).toEqual([
      'C',
      'G',
      'Am',
      'F',
    ]);
    // …but never below four bars.
    expect(loopChords(['Dm7', 'G9', 'Dm7', 'G9'])).toEqual([
      'Dm7',
      'G9',
      'Dm7',
      'G9',
    ]);
  });

  it('Funk L3’s Performance track leads with its own four-chord direction', () => {
    const direction = buildGenrePracticeTrack(funkL3, 'D')?.sourceDirection;
    expect(direction).toContain('all four chords');
    expect(direction).not.toMatch(/five/i);
    // Other sections keep their activity's own direction.
    expect(buildGenrePracticeTrack(funkL3, 'B')?.sourceDirection).toBe(
      funkL3.sections
        .find((s) => s.id === 'B')!
        .steps.filter((st) => st.backing_parts?.engine_generates?.length)
        .at(-1)?.direction,
    );
  });

  it('Funk L3’s Performance track is a four-bar loop', () => {
    expect(buildGenrePracticeTrack(funkL3, 'D')?.chordCycle).toEqual([
      'Cm9',
      'F13',
      'Ab13',
      'G7alt',
    ]);
  });
});
