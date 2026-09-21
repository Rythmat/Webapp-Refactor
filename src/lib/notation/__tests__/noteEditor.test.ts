import { describe, expect, it } from 'vitest';
import { pitchNameToMidi } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  ACCIDENTALS,
  ARTICULATIONS,
  accidentalPitch,
  accidentalSpelling,
  hasAccidental,
  spellingKey,
  spellingMap,
  withSpelling,
  DURATIONS,
  REST_GLYPHS,
  articulationSide,
  articulationsFor,
  articulationKey,
  dropNoteIds,
  durationTicks,
  groupChordArticulations,
  remapNoteIds,
  slurKey,
  tieSpan,
  tieFromNote,
  planTie,
  toggleArticulation,
  toggleSlur,
} from '@/daw/components/Score/noteEditor';

describe('durations', () => {
  it('numbers values the way MuseScore does', () => {
    expect(DURATIONS.map((d) => `${d.key}=${d.name}`)).toEqual([
      '2=32nd',
      '3=16th',
      '4=Eighth',
      '5=Quarter',
      '6=Half',
      '7=Whole',
    ]);
  });

  it('turns a choice into ticks, dotted or not', () => {
    const quarter = DURATIONS.find((d) => d.name === 'Quarter')!;
    expect(durationTicks(quarter, 480, false)).toBe(480);
    expect(durationTicks(quarter, 480, true)).toBe(720);
    const sixteenth = DURATIONS.find((d) => d.name === '16th')!;
    expect(durationTicks(sixteenth, 480, false)).toBe(120);
    expect(durationTicks(sixteenth, 480, true)).toBe(180);
  });

  it('runs shortest to longest, each twice the one before it', () => {
    const quarters = DURATIONS.map((d) => d.quarters);
    expect(quarters).toEqual([1 / 8, 1 / 4, 1 / 2, 1, 2, 4]);
  });

  // The glyphs are invisible private-use characters, so a wrong one reads as
  // perfectly ordinary source. SMuFL pairs the individual notes (up, down)
  // from U+E1D3, which puts every stem-up glyph on an odd codepoint; the
  // thirty-second was once U+E1DA, the stem-*down* sixteenth, and drew the
  // first two cells as duplicates.
  const STEM_UP_GLYPH: Record<string, number> = {
    '32nd': 0xe1db,
    '16th': 0xe1d9,
    Eighth: 0xe1d7,
    Quarter: 0xe1d5,
    Half: 0xe1d3,
    Whole: 0xe1d2, // stemless, so it has no up/down pair
  };

  it.each(DURATIONS)('draws $name stem up', (choice) => {
    expect(choice.glyph).toHaveLength(1);
    expect(choice.glyph.codePointAt(0)).toBe(STEM_UP_GLYPH[choice.name]);
  });

  it('never picks a stem-down glyph', () => {
    // Every stemmed value sits on an odd codepoint; an even one in this range
    // is the down-stem twin of the value below it.
    for (const choice of DURATIONS) {
      if (choice.name === 'Whole') continue;
      expect(choice.glyph.codePointAt(0)! % 2).toBe(1);
    }
  });

  it('gives each value its own glyph', () => {
    const glyphs = DURATIONS.map((d) => d.glyph);
    expect(new Set(glyphs).size).toBe(DURATIONS.length);
  });

  it('matches each note with the rest of the same value', () => {
    // Rests run consecutively from the quarter: quarter E4E5, 8th E4E6,
    // 16th E4E7, 32nd E4E8; the half and whole hang on their ledger lines.
    expect(DURATIONS.map((d) => REST_GLYPHS[d.key].codePointAt(0))).toEqual([
      0xe4e8, 0xe4e7, 0xe4e6, 0xe4e5, 0xe4f5, 0xe4f4,
    ]);
  });

  it('has a rest for every duration', () => {
    for (const choice of DURATIONS) {
      expect(REST_GLYPHS[choice.key]).toBeTruthy();
    }
  });
});

describe('articulations', () => {
  it('offers the marks with their keys', () => {
    expect(ARTICULATIONS.map((a) => `${a.kind}:${a.key}`)).toEqual([
      'staccato:.',
      'accent:>',
      'marcato:-',
      'tenuto:_',
      // A fermata sits over its note, alongside the others, rather than
      // over the whole bar as it once did.
      'fermata:;',
    ]);
  });

  it('turns a mark on for the selection, then off again', () => {
    const on = toggleArticulation([], ['n1', 'n2'], 'staccato');
    expect(on).toEqual([
      articulationKey('n1', 'staccato'),
      articulationKey('n2', 'staccato'),
    ]);
    expect(toggleArticulation(on, ['n1', 'n2'], 'staccato')).toEqual([]);
  });

  it('turns it on for all when only some have it', () => {
    const partial = [articulationKey('n1', 'accent')];
    expect(toggleArticulation(partial, ['n1', 'n2'], 'accent')).toEqual([
      articulationKey('n1', 'accent'),
      articulationKey('n2', 'accent'),
    ]);
  });

  it('lists the marks on one note', () => {
    const marks = ['n1|staccato', 'n1|accent', 'n2|marcato'];
    expect(articulationsFor(marks, 'n1')).toEqual(['staccato', 'accent']);
  });

  it('keeps marks on note ids that contain colons', () => {
    const id = 'track:clip:960:64';
    const marks = toggleArticulation([], [id], 'staccato');
    expect(articulationsFor(marks, id)).toEqual(['staccato']);
  });
});

describe('slurs', () => {
  it('slurs from the first note to the last, and removes it again', () => {
    const on = toggleSlur([], 'a', 'b');
    expect(on).toEqual([slurKey('a', 'b')]);
    expect(toggleSlur(on, 'a', 'b')).toEqual([]);
  });

  it('ignores a slur to itself', () => {
    expect(toggleSlur([], 'a', 'a')).toEqual([]);
  });
});

describe('following notes as they change', () => {
  it('moves marks onto the new ids', () => {
    const marks = ['t:c:0:60|staccato', 't:c:480:62|accent'];
    const rename = new Map([['t:c:0:60', 't:c:0:64']]);
    expect(remapNoteIds(marks, rename)).toEqual([
      't:c:0:64|staccato',
      't:c:480:62|accent',
    ]);
  });

  it('moves both ends of a slur', () => {
    const slurs = [slurKey('t:c:0:60', 't:c:480:62')];
    const rename = new Map([
      ['t:c:0:60', 't:c:0:62'],
      ['t:c:480:62', 't:c:480:64'],
    ]);
    expect(remapNoteIds(slurs, rename)).toEqual([
      slurKey('t:c:0:62', 't:c:480:64'),
    ]);
  });

  it('drops marks whose note is gone', () => {
    const marks = ['n1|staccato', 'n2|accent'];
    expect(dropNoteIds(marks, new Set(['n1']))).toEqual(['n2|accent']);
    expect(dropNoteIds([slurKey('n1', 'n2')], new Set(['n2']))).toEqual([]);
  });
});

describe('where an articulation sits', () => {
  // Above when the stem points down, below when it points up — the mark goes
  // on the side away from the stem.
  it('follows the stem when there is one', () => {
    expect(articulationSide({ stem: 'down', line: 0 })).toBe('above');
    expect(articulationSide({ stem: 'down', line: 4 })).toBe('above');
    expect(articulationSide({ stem: 'up', line: 0 })).toBe('below');
    expect(articulationSide({ stem: 'up', line: 4 })).toBe('below');
  });

  // Without a stem it follows the middle line: on it or above → above.
  it('follows the middle line when there is no stem', () => {
    expect(articulationSide({ stem: null, line: 2 })).toBe('above');
    expect(articulationSide({ stem: null, line: 2.5 })).toBe('above');
    expect(articulationSide({ stem: null, line: 4 })).toBe('above');
    expect(articulationSide({ stem: null, line: 1.5 })).toBe('below');
    expect(articulationSide({ stem: null, line: 0 })).toBe('below');
  });

  it('keeps counting into the ledger lines', () => {
    expect(articulationSide({ stem: null, line: 6 })).toBe('above');
    expect(articulationSide({ stem: null, line: -2 })).toBe('below');
  });

  it('gives every mark a mirrored glyph for the underside', () => {
    for (const articulation of ARTICULATIONS) {
      expect(articulation.glyphBelow).toBeTruthy();
      expect(articulation.glyphBelow).not.toBe(articulation.glyph);
    }
  });
});

describe('a chord takes one mark, not one per notehead', () => {
  const chord = [
    {
      id: 'lo',
      partIndex: 0,
      tick: 0,
      y: 120,
      stem: null as 'up' | 'down' | null,
      line: 0,
    },
    {
      id: 'mid',
      partIndex: 0,
      tick: 0,
      y: 110,
      stem: null as 'up' | 'down' | null,
      line: 1,
    },
    {
      id: 'hi',
      partIndex: 0,
      tick: 0,
      y: 100,
      stem: null as 'up' | 'down' | null,
      line: 2,
    },
  ];

  it('draws once however many of its notes carry the mark', () => {
    const all = groupChordArticulations(chord, () => ['staccato']);
    expect(all).toHaveLength(1);
    expect(all[0].kinds).toEqual(['staccato']);
    const one = groupChordArticulations(chord, (id) =>
      id === 'mid' ? ['staccato'] : [],
    );
    expect(one).toHaveLength(1);
  });

  it('gathers the different marks its notes carry', () => {
    const marks = groupChordArticulations(chord, (id) =>
      id === 'hi' ? ['staccato'] : id === 'lo' ? ['accent'] : [],
    );
    expect(marks[0].kinds.sort()).toEqual(['accent', 'staccato']);
  });

  it('hangs it off the outer notehead on its side', () => {
    // Mean line 1 is under the middle line, so this chord marks below, and
    // below means the lowest notehead — the largest y.
    const below = groupChordArticulations(chord, () => ['staccato'])[0];
    expect(below.side).toBe('below');
    expect(below.note.id).toBe('lo');

    const high = chord.map((n) => ({ ...n, line: n.line + 3 }));
    const above = groupChordArticulations(high, () => ['staccato'])[0];
    expect(above.side).toBe('above');
    expect(above.note.id).toBe('hi');
  });

  it('keeps chords in different parts and at different times apart', () => {
    const notes = [
      ...chord,
      {
        id: 'later',
        partIndex: 0,
        tick: 480,
        y: 100,
        stem: null as 'up' | 'down' | null,
        line: 2,
      },
      {
        id: 'other',
        partIndex: 1,
        tick: 0,
        y: 300,
        stem: null as 'up' | 'down' | null,
        line: 2,
      },
    ];
    expect(groupChordArticulations(notes, () => ['accent'])).toHaveLength(3);
  });
});

describe('ties', () => {
  const note = (
    id: string,
    tick: number,
    midi: number,
    durationTicks = 480,
  ) => ({
    id,
    partIndex: 0,
    tick,
    midi,
    durationTicks,
  });

  it('holds the first note through the last', () => {
    expect(tieSpan([note('a', 0, 60), note('b', 480, 60)])).toEqual({
      holdId: 'a',
      removeIds: ['b'],
      durationTicks: 960,
    });
  });

  it('holds across a run of the same pitch', () => {
    expect(
      tieSpan([note('a', 0, 60), note('b', 480, 60), note('c', 960, 60, 240)]),
    ).toEqual({ holdId: 'a', removeIds: ['b', 'c'], durationTicks: 1200 });
  });

  it('reads the notes in time order however they were selected', () => {
    expect(tieSpan([note('b', 480, 60), note('a', 0, 60)])?.holdId).toBe('a');
  });

  it('refuses notes of different pitches', () => {
    expect(tieSpan([note('a', 0, 60), note('b', 480, 62)])).toBeNull();
  });

  it('refuses notes in different parts', () => {
    const other = { ...note('b', 480, 60), partIndex: 1 };
    expect(tieSpan([note('a', 0, 60), other])).toBeNull();
  });

  it('needs two notes', () => {
    expect(tieSpan([note('a', 0, 60)])).toBeNull();
  });
});

describe('tying from a single note', () => {
  const note = (
    id: string,
    tick: number,
    midi: number,
    durationTicks: number,
    partIndex = 0,
  ) => ({ id, partIndex, tick, midi, durationTicks });

  const rest = (tick: number, durationTicks: number, partIndex = 0) => ({
    partIndex,
    tick,
    durationTicks,
  });

  it('ties into the next note when it is the same pitch', () => {
    const a = note('a', 0, 60, 480);
    const b = note('b', 480, 60, 480);
    expect(tieFromNote(a, [a, b], [])).toEqual({
      holdId: 'a',
      removeIds: ['b'],
      durationTicks: 960,
    });
  });

  it('refuses when the next note is a different pitch', () => {
    const a = note('a', 0, 60, 480);
    const b = note('b', 480, 62, 480);
    expect(tieFromNote(a, [a, b], [])).toBeNull();
  });

  it('fills a following rest with the same pitch for the rest of its length', () => {
    const a = note('a', 0, 60, 480);
    expect(tieFromNote(a, [a], [rest(480, 240)])).toEqual({
      holdId: 'a',
      removeIds: [],
      durationTicks: 720,
    });
  });

  it('takes only that one rest, not the silence beyond it', () => {
    const a = note('a', 0, 60, 480);
    const rests = [rest(480, 240), rest(720, 240)];
    expect(tieFromNote(a, [a], rests)?.durationTicks).toBe(720);
  });

  it('prefers the rest when a rest comes before the next note', () => {
    // A same-pitch note further on does not reach back over the silence.
    const a = note('a', 0, 60, 480);
    const b = note('b', 720, 60, 480);
    expect(tieFromNote(a, [a, b], [rest(480, 240)])?.durationTicks).toBe(720);
  });

  it('refuses when nothing follows', () => {
    const a = note('a', 0, 60, 480);
    expect(tieFromNote(a, [a], [])).toBeNull();
  });

  it('refuses when the next note leaves a gap and no rest is written', () => {
    const a = note('a', 0, 60, 480);
    const b = note('b', 960, 60, 480);
    expect(tieFromNote(a, [a, b], [])).toBeNull();
  });

  it('ignores notes and rests in other parts', () => {
    const a = note('a', 0, 60, 480);
    const other = note('b', 480, 60, 480, 1);
    expect(tieFromNote(a, [a, other], [rest(480, 240, 1)])).toBeNull();
  });

  it('reaches the note that starts exactly where this one ends', () => {
    const a = note('a', 0, 60, 120);
    const b = note('b', 120, 60, 120);
    expect(tieFromNote(a, [a, b], [])?.durationTicks).toBe(240);
  });
});

describe('planning a tie from a selection', () => {
  const note = (
    id: string,
    tick: number,
    midi: number,
    durationTicks: number,
  ) => ({ id, partIndex: 0, tick, midi, durationTicks });

  it('joins several selected notes of one pitch', () => {
    const a = note('a', 0, 60, 480);
    const b = note('b', 480, 60, 480);
    expect(planTie([a, b], [a, b], [])).toEqual({
      holdId: 'a',
      removeIds: ['b'],
      durationTicks: 960,
    });
  });

  it('reaches forward from a single selected note', () => {
    const a = note('a', 0, 60, 480);
    expect(
      planTie([a], [a], [{ partIndex: 0, tick: 480, durationTicks: 240 }])
        ?.durationTicks,
    ).toBe(720);
  });

  it('refuses an empty selection', () => {
    expect(planTie([], [], [])).toBeNull();
  });
});

describe('accidentals', () => {
  const c4 = { letter: 'c', octave: 4, alteration: 0 };

  it('offers the five the palette shows, in that order', () => {
    expect(ACCIDENTALS.map((a) => a.kind)).toEqual([
      'sharp',
      'flat',
      'natural',
      'doubleSharp',
      'doubleFlat',
    ]);
  });

  it('uses the standard SMuFL glyph for each', () => {
    const codes = Object.fromEntries(
      ACCIDENTALS.map((a) => [a.kind, a.glyph.codePointAt(0)]),
    );
    expect(codes).toEqual({
      flat: 0xe260,
      natural: 0xe261,
      sharp: 0xe262,
      doubleSharp: 0xe263,
      doubleFlat: 0xe264,
    });
  });

  it('raises and lowers the pitch by the alteration', () => {
    expect(accidentalPitch(c4, 0)).toBe(60);
    expect(accidentalPitch(c4, 1)).toBe(61);
    expect(accidentalPitch(c4, -1)).toBe(59);
    expect(accidentalPitch(c4, 2)).toBe(62);
    expect(accidentalPitch(c4, -2)).toBe(58);
  });

  it('keeps the note on its own line whatever the accidental', () => {
    // The letter and octave never change, so the notehead does not move.
    for (const alteration of [-2, -1, 0, 1, 2]) {
      expect(accidentalSpelling(c4, alteration).startsWith('C')).toBe(true);
      expect(accidentalSpelling(c4, alteration).endsWith('4')).toBe(true);
    }
  });

  it('writes each alteration the way the parser reads it back', () => {
    expect(accidentalSpelling(c4, 1)).toBe('C♯4');
    expect(accidentalSpelling(c4, -1)).toBe('C♭4');
    expect(accidentalSpelling(c4, 0)).toBe('C4');
    expect(accidentalSpelling(c4, 2)).toBe('C𝄪4');
    expect(accidentalSpelling(c4, -2)).toBe('C𝄫4');
  });

  it('spells and sounds the same note', () => {
    // A written name and the pitch it stands for must agree, or the score
    // engine throws the spelling away.
    const cases = [
      { letter: 'c', octave: 5, alteration: -1 }, // C♭5 sounds as B4
      { letter: 'b', octave: 3, alteration: 1 }, // B♯3 sounds as C4
      { letter: 'e', octave: 4, alteration: -2 },
      { letter: 'f', octave: 2, alteration: 2 },
    ];
    for (const note of cases) {
      const name = accidentalSpelling(note, note.alteration);
      expect(pitchNameToMidi(name)).toBe(
        accidentalPitch(note, note.alteration),
      );
    }
  });

  it('knows when a note already carries the accidental', () => {
    expect(hasAccidental({ ...c4, alteration: 1 }, 1)).toBe(true);
    expect(hasAccidental(c4, 1)).toBe(false);
  });
});

describe('pinned spellings', () => {
  it('reads entries back into a map', () => {
    expect(spellingMap(['t:c:0:61|C♯4'])).toEqual(
      new Map([['t:c:0:61', 'C♯4']]),
    );
  });

  it('keeps note ids that contain colons intact', () => {
    const id = 'track:clip:960:61';
    expect(spellingMap([spellingKey(id, 'C♯4')]).get(id)).toBe('C♯4');
  });

  it('replaces a note’s spelling rather than stacking them', () => {
    const once = withSpelling([], 'n1', 'C♯4');
    const twice = withSpelling(once, 'n1', 'C♭4');
    expect(twice).toEqual(['n1|C♭4']);
    expect(spellingMap(twice).get('n1')).toBe('C♭4');
  });

  it('leaves other notes alone', () => {
    const entries = withSpelling(['n2|D♭4'], 'n1', 'C♯4');
    expect(entries).toContain('n2|D♭4');
    expect(entries).toContain('n1|C♯4');
  });

  it('follows a note onto its new id after an edit', () => {
    const entries = withSpelling([], 't:c:0:60', 'C4');
    const moved = remapNoteIds(entries, new Map([['t:c:0:60', 't:c:0:61']]));
    expect(spellingMap(moved).get('t:c:0:61')).toBe('C4');
  });

  it('drops the spelling when its note is gone', () => {
    const entries = withSpelling([], 'n1', 'C♯4');
    expect(dropNoteIds(entries, new Set(['n1']))).toEqual([]);
  });
});
