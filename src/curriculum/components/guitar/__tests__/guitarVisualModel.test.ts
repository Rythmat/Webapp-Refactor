import { describe, expect, it } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { toPianoRollEvents } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type {
  ActivityStepV2,
  ChordTarget,
} from '@/curriculum/types/activity.v2';
import { noteGroups } from '../fretboardMarkers';
import {
  chordTargetAt,
  guitarStepPrefix,
  guitarVisualModel,
  markerLabeler,
  tabChordToneAnnotations,
  tabStepChips,
} from '../guitarVisualModel';

function stepOf(key: GuitarKeyName, suffix: string): ActivityStepV2 {
  const tag = `guitar_fund:${suffix} | applied_theory_guitar`;
  const step = buildGuitarAppliedTheoryFundamentalsFlow(key)
    .sections.flatMap((s) => s.steps)
    .find((s) => s.tag === tag);
  if (!step) throw new Error(`no step ${tag}`);
  return step;
}

const inWindow = (
  fret: number,
  { min, max }: { min: number; max: number },
): boolean => fret >= min && fret <= max;

describe('guitarVisualModel', () => {
  it('gives a scale step its book position and no chords', () => {
    const model = guitarVisualModel(
      stepOf('C', 'major_scale_ascending_oot'),
      'C',
    );
    expect(model.chords).toEqual([]);
    expect(model.chordIndexOfTarget).toEqual([]);
    expect(model.tonicPc).toBe(0);
    expect(model.scale?.name).toBe('C Major Scale');
    expect(model.scale?.position).toBe(GUITAR_ATLAS_BOOK_ONE.C.majorScale);
    // Frets 7-10, one fret of room below and five frets wide at least.
    expect(model.window).toEqual({ min: 6, max: 11 });
  });

  it('names the pentatonic position with display accidentals', () => {
    const model = guitarVisualModel(
      stepOf('F#', 'pentatonic_scale_ascending_oot'),
      'F#',
    );
    expect(model.scale?.name).toBe('F♯ Major Pentatonic Scale');
    expect(model.scale?.position).toBe(GUITAR_ATLAS_BOOK_ONE['F#'].pentatonic);
    expect(model.tonicPc).toBe(6);
  });

  it('frames a melody by its whole position, like the scale steps', () => {
    const scale = guitarVisualModel(
      stepOf('C', 'major_scale_ascending_oot'),
      'C',
    );
    const melody = guitarVisualModel(stepOf('C', 'contour_a_oot'), 'C');
    expect(melody.scale?.position).toBe(scale.scale?.position);
    expect(melody.window).toEqual(scale.window);
  });

  it('lines up a B2 step’s boxes with its chord targets', () => {
    const step = stepOf('C', 'play_chords_oot');
    const model = guitarVisualModel(step, 'C');
    expect(model.scale).toBeNull();
    expect(model.chords.map((c) => c.name)).toEqual([
      'C major',
      'D minor',
      'E minor',
      'F major',
    ]);
    expect(model.chords.map((c) => c.hybridLabel)).toEqual([
      '1 maj',
      '2 min',
      '3 min',
      '4 maj',
    ]);
    expect(model.chords.map((c) => c.rootPc)).toEqual([0, 2, 4, 5]);
    expect(model.chords.map((c) => c.shape.frets)).toEqual([
      'X-3-2-0-1-0',
      'X-X-0-2-3-1',
      '0-2-2-0-0-0',
      'X-X-3-2-1-1',
    ]);
    expect(model.chordIndexOfTarget).toEqual([0, 1, 2, 3]);
    // Open strings pull the window to the nut.
    expect(model.window).toEqual({ min: 0, max: 5 });
  });

  it('spells chord names and labels in the key', () => {
    const model = guitarVisualModel(stepOf('Bb', 'play_sevenths_oot'), 'Bb');
    expect(model.chords.map((c) => c.name)).toEqual([
      'B♭ major 7',
      'C minor 7',
      'D minor 7',
      'E♭ major 7',
      'F dominant 7',
      'G minor 7',
      'A minor 7(♭5)',
      'B♭ major 7',
    ]);
    expect(model.chords[6].hybridLabel).toBe('7 min7(♭5)');
    expect(model.chordIndexOfTarget).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows a Music Map one box per bar, through both passes', () => {
    const step = stepOf('C', 'music_map_ex3');
    const model = guitarVisualModel(step, 'C');
    expect(model.chords.map((c) => c.shapeId)).toEqual([
      'C/map/3/1',
      'C/map/3/2',
    ]);
    // Four quarter-note strums a bar, the map played twice.
    const bars = [0, 0, 0, 0, 1, 1, 1, 1];
    expect(model.chordIndexOfTarget).toEqual([...bars, ...bars]);
  });

  it('keeps one window for a whole Music Map, wide enough for every bar', () => {
    const step = stepOf('C', 'music_map_ex4');
    const model = guitarVisualModel(step, 'C');
    expect(model.chords.map((c) => c.shape.frets)).toEqual([
      'X-8-10-9-10-X',
      'X-10-12-10-12-X',
      'X-3-5-4-5-X',
      'X-5-7-5-6-X',
    ]);
    expect(model.window).toEqual({ min: 2, max: 12 });
    for (const chord of model.chords) {
      expect(chord.positions.every((p) => inWindow(p.fret, model.window))).toBe(
        true,
      );
    }
    for (const note of step.targetNotes ?? []) {
      expect(inWindow(note.fretPosition!.fret, model.window)).toBe(true);
    }
    // Built from the step alone, so every render of the step agrees.
    expect(guitarVisualModel(step, 'C').window).toEqual(model.window);
  });
});

describe('chordTargetAt', () => {
  const targets = [0, 480, 960].map(
    (onsetTick) => ({ onsetTick }) as ChordTarget,
  );

  it('finds the chord sounding at a roll tick, past the count-in', () => {
    expect(chordTargetAt(targets, 0, 1920)).toBe(0);
    expect(chordTargetAt(targets, 2399, 1920)).toBe(0);
    expect(chordTargetAt(targets, 2400, 1920)).toBe(1);
    expect(chordTargetAt(targets, 9000, 1920)).toBe(2);
    expect(chordTargetAt(targets, 480, 0)).toBe(1);
  });
});

describe('guitarVisualModel theory layers', () => {
  it('reads each step’s subsection and what its labels offer', () => {
    const cases: [GuitarKeyName, string, string, string | null, boolean][] = [
      ['C', 'major_scale_ascending_oot', 'A1', 'scale', false],
      ['C', 'contour_a_oot', 'A2', 'scale', false],
      ['C', 'pentatonic_scale_ascending_oot', 'A4', 'scale', false],
      ['C', 'arpeggio_degree1_oot', 'B1', 'chord', true],
      ['C', 'arpeggio_degree5_oot', 'B5', 'chord', true],
      ['C', 'arpeggio_7th_degree3_oot', 'B7', 'chord', true],
      ['C', 'play_chords_oot', 'B2', 'chord', false],
      ['C', 'music_map_ex4', 'D3', 'chord', false],
      ['C', 'melody_playalong_3note', 'D1', 'scale', false],
    ];
    for (const [key, suffix, prefix, kind, arpeggio] of cases) {
      const step = stepOf(key, suffix);
      const model = guitarVisualModel(step, key);
      expect(guitarStepPrefix(step), suffix).toBe(prefix);
      expect(model.prefix, suffix).toBe(prefix);
      expect(model.labelKind, suffix).toBe(kind);
      expect(model.isArpeggio, suffix).toBe(arpeggio);
    }
  });

  it('gives A1 fingers, half steps, the octave and the Ionian note', () => {
    const model = guitarVisualModel(
      stepOf('C', 'major_scale_ascending_oot'),
      'C',
    );
    expect(model.scale?.anchor).toBe(7);
    expect(model.scale?.fingers).toEqual([2, 4, 1, 2, 4, 1, 3, 4]);
    expect(model.scale?.ghosts).toEqual([]);
    expect(model.scale?.halfSteps).toEqual([
      { string: 5, fromFret: 7, toFret: 8, label: 'H', spoken: 'half step' },
      { string: 4, fromFret: 9, toFret: 10, label: 'H', spoken: 'half step' },
    ]);
    expect(model.showOctave).toBe(true);
    expect(model.hasSteps).toBe(true);
    expect(model.scaleAbout.map((n) => n.id)).toEqual(['a1.ionian']);
  });

  it('gives A4 its ghosts and octave, but no step chips', () => {
    const model = guitarVisualModel(
      stepOf('C', 'pentatonic_scale_ascending_oot'),
      'C',
    );
    // F on string 2 fret 6, B on string 1 fret 7.
    expect(model.scale?.ghosts).toEqual([
      { string: 2, fret: 6 },
      { string: 1, fret: 7 },
    ]);
    expect(model.scale?.halfSteps).toEqual([]);
    expect(model.showOctave).toBe(true);
    expect(model.hasSteps).toBe(false);
    expect(model.scaleAbout).toEqual([]);
  });

  it('puts the octave on A1 and A4 only', () => {
    expect(
      guitarVisualModel(stepOf('C', 'contour_a_oot'), 'C').showOctave,
    ).toBe(false);
    expect(
      guitarVisualModel(stepOf('C', 'play_chords_oot'), 'C').showOctave,
    ).toBe(false);
  });
});

describe('markerLabeler', () => {
  function groupsOf(key: GuitarKeyName, suffix: string) {
    const step = stepOf(key, suffix);
    const model = guitarVisualModel(step, key);
    const events = toPianoRollEvents(step.targetNotes ?? [], '#fff', 60);
    const groups = noteGroups(
      events,
      step.chordTargets ?? [],
      0,
      model.tonicPc,
    );
    return { model, groups };
  }

  it('keeps note names in Notes mode', () => {
    const { model } = groupsOf('C', 'play_chords_oot');
    expect(markerLabeler(model, 'notes')).toBeUndefined();
  });

  it('labels each chord’s notes from its own shape and root', () => {
    const { model, groups } = groupsOf('C', 'play_chords_oot');
    const fingers = markerLabeler(model, 'fingers')!;
    const tones = markerLabeler(model, 'chordTones')!;
    const [c, dm] = groups;
    expect(c.shapeId).toBe('C/triad/1');
    const label = (labeler: typeof tones, group: (typeof groups)[number]) =>
      group.notes
        .map((n) => labeler(n.position, n.midi, group)?.text)
        .join(' ');
    // X-3-2-0-1-0 low to high; open strings take no finger.
    expect(label(fingers, c)).toBe('3 2  1 ');
    expect(label(tones, c)).toBe('R 3 5 R 3');
    // X-X-0-2-3-1 is D minor: R 5 R ♭3.
    expect(label(tones, dm)).toBe('R 5 R ♭3');
    expect(tones(c.notes[1].position, c.notes[1].midi, c)?.spoken).toBe('3');
    expect(tones(dm.notes[3].position, dm.notes[3].midi, dm)?.spoken).toBe(
      'flat 3',
    );
    expect(fingers(c.notes[0].position, c.notes[0].midi, c)?.spoken).toBe(
      'finger 3',
    );
  });

  it('labels a scale by suggested finger and key number', () => {
    const { model, groups } = groupsOf('F', 'major_scale_ascending_oot');
    const fingers = markerLabeler(model, 'fingers')!;
    const numbers = markerLabeler(model, 'keyNumbers')!;
    const line = groups.map((g) => g.notes[0]);
    expect(
      line.map((n) => numbers(n.position, n.midi, undefined)?.text).join(' '),
    ).toBe('1 2 3 4 5 6 7 1');
    // F: frets 1-2-3 take fingers 1-2-3, open strings none.
    for (const n of line) {
      const finger = fingers(n.position, n.midi, undefined)?.text;
      expect(finger).toBe(n.position.fret === 0 ? '' : String(n.position.fret));
    }
  });
});

describe('TAB layers', () => {
  it('chips whole and half steps between single notes, both ways', () => {
    const up = stepOf('C', 'major_scale_ascending_descending_oot');
    const events = toPianoRollEvents(up.targetNotes ?? [], '#fff', 60);
    const chips = tabStepChips(events, 0);
    // Up W W H W W W H, then back down H W W W H W W.
    expect(chips.map((c) => c.size).join('')).toBe('WWHWWWHHWWWHWW');
    expect(chips.at(-1)?.spoken).toBe('D to C: whole step');
  });

  it('skips chords and leaps', () => {
    const chords = stepOf('C', 'play_chords_oot');
    const events = toPianoRollEvents(chords.targetNotes ?? [], '#fff', 60);
    expect(tabStepChips(events, 0)).toEqual([]);
  });

  it('annotates each arpeggio note with its chord tone, in the key’s spelling', () => {
    const step = stepOf('Bb', 'arpeggio_7th_degree7_oot');
    const events = toPianoRollEvents(step.targetNotes ?? [], '#fff', 60);
    const tones = tabChordToneAnnotations(events, step.chordTargets ?? [], 0);
    expect(new Set(tones.values())).toEqual(new Set(['R', '♭3', '♭5', '♭7']));
    expect(tones.size).toBe(events.length);
  });
});
