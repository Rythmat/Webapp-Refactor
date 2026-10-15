import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import {
  assertNoteIds,
  ensureProjectNoteIds,
  isNoteId,
  legacyNoteId,
  mintNoteIds,
} from '@/daw/model/noteIds';
import { spellingForPitch } from '@/daw/model/noteKeys';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import {
  decodeNoteMarks,
  encodeNoteMarks,
  type NoteMarksInMemory,
  type PersistedNoteMarks,
} from '../notationCodec';

// ── Score and Lead Sheet marks, stored by note id ──────────────────────────
// Memory keys a mark by where its note sits (`track:clip:tick:midi`, as the
// Score draws it); the stored project keys it by the note's own id. Saving
// translates one way, loading the other, and a mark whose note is gone is
// dropped on save rather than stored.

let ids = mintNoteIds(200);
const nextId = () => {
  if (ids.length === 0) ids = mintNoteIds(200);
  return ids.pop()!;
};

const ev = (startTick: number, note: number, id = nextId()): MidiNoteEvent => ({
  id,
  note,
  velocity: 96,
  startTick,
  durationTicks: 240,
  channel: 0,
});

function track(
  id: string,
  midiClips: MidiClip[],
  extra: Partial<Track> = {},
): Track {
  return {
    id,
    name: id,
    type: 'midi',
    instrument: 'piano-sampler',
    color: '#888888',
    mute: false,
    solo: false,
    volume: 0.8,
    pan: 0,
    recordArmed: false,
    monitoring: false,
    midiInputId: null,
    audioInputId: null,
    audioInputChannel: null,
    effects: structuredClone(DEFAULT_EFFECTS),
    activeEffects: [],
    midiClips,
    audioClips: [],
    trackRole: 'auto',
    ...extra,
  };
}

/** A note's Score key, as scoreParts.ts composes it. */
const key = (t: Track, clip: number, note: number) => {
  const c = t.midiClips[clip];
  const e = c.events[note];
  return `${t.id}:${c.id}:${e.startTick}:${e.note}`;
};

const NO_MARKS: NoteMarksInMemory = {
  scoreArticulations: [],
  scoreSlurs: [],
  scoreSpellings: [],
  scoreSlashNotes: [],
};

/** Shaped like the harness kitchen sink: several tracks, an audio one, two
 * clips on one track, notes out of order, and every kind of mark. */
function kitchenSink() {
  const lead = track(
    'trk-lead',
    [
      {
        id: 'clip-lead',
        startTick: 0,
        events: [
          ev(0, 72),
          ev(240, 74),
          ev(480, 76),
          ev(720, 78), // F♯5, pinned
          ev(960, 79),
          ev(1440, 70), // B♭4, pinned
        ],
      },
    ],
    { instrument: 'oracle-synth' as Track['instrument'] },
  );
  const keys = track('trk-keys', [
    {
      id: 'clip-keys-a',
      startTick: 0,
      durationTicks: 7680,
      ccEvents: [{ tick: 0, controller: 64, value: 127, channel: 0 }],
      // Stored out of (startTick, note) order, as a recording can be.
      events: [ev(480, 64), ev(0, 60), ev(0, 64), ev(0, 67), ev(480, 67)],
    },
    { id: 'clip-keys-b', startTick: 7680, events: [ev(0, 62), ev(480, 65)] },
  ]);
  const guitar = track('trk-guitar', [], {
    type: 'audio',
    instrument: 'guitar-fx',
  });
  const drums = track(
    'trk-drums',
    [{ id: 'clip-drums', startTick: 0, events: [ev(0, 36), ev(480, 38)] }],
    { instrument: 'drum-machine' },
  );
  const tracks = [lead, keys, guitar, drums];
  const marks: NoteMarksInMemory = {
    scoreArticulations: [
      `${key(lead, 0, 0)}|staccato`,
      `${key(lead, 0, 0)}|accent`,
      `${key(lead, 0, 2)}|tenuto`,
      `${key(keys, 1, 0)}|staccato`,
      `${key(drums, 0, 1)}|accent`,
    ],
    scoreSlurs: [
      `${key(lead, 0, 0)}|${key(lead, 0, 3)}`,
      // Across the two clips of one track, and across tracks.
      `${key(keys, 0, 1)}|${key(keys, 1, 1)}`,
      `${key(lead, 0, 4)}|${key(keys, 1, 0)}`,
    ],
    scoreSpellings: [`${key(lead, 0, 3)}|G♭5`, `${key(lead, 0, 5)}|A♯4`],
    scoreSlashNotes: [key(keys, 0, 0), key(keys, 0, 4)],
  };
  return { tracks, marks };
}

/** What a save and a load do to the tracks: JSON there and back. */
const throughJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('saving and loading marks', () => {
  it('brings every mark of a kitchen-sink project back', () => {
    const { tracks, marks } = kitchenSink();
    const saved = encodeNoteMarks(marks, tracks);
    expect(saved.orphans).toBe(0);

    const loaded = throughJson({ tracks, marks: saved.marks });
    expect(decodeNoteMarks(loaded.marks, loaded.tracks)).toEqual(marks);
  });

  it('stores note ids only, never where a note sits', () => {
    const { tracks, marks } = kitchenSink();
    const { marks: stored } = encodeNoteMarks(marks, tracks);
    expect(stored.articulations).toHaveLength(5);
    expect(stored.slurs).toHaveLength(3);
    expect(stored.spellings).toHaveLength(2);
    expect(stored.slashNotes).toHaveLength(2);
    const noteIdsIn = (entry: string) => entry.split('|');
    for (const entry of [...stored.slurs, ...stored.slashNotes]) {
      for (const id of noteIdsIn(entry)) expect(isNoteId(id)).toBe(true);
    }
    for (const entry of [...stored.articulations, ...stored.spellings]) {
      expect(isNoteId(noteIdsIn(entry)[0])).toBe(true);
    }
    expect(JSON.stringify(stored)).not.toContain('trk-');
    const lead = tracks[0].midiClips[0].events;
    expect(stored.articulations[0]).toBe(`${lead[0].id}|staccato`);
    expect(stored.spellings[0]).toBe(`${lead[3].id}|G♭5`);
  });

  it('follows a note that moved while it was stored', () => {
    // A note's id survives an edit; its Score key does not. Loading puts the
    // mark on the key the note has now.
    const { tracks, marks } = kitchenSink();
    const { marks: stored } = encodeNoteMarks(marks, tracks);
    const moved = throughJson(tracks);
    moved[0].midiClips[0].events[0].startTick = 120;
    const back = decodeNoteMarks(stored, moved);
    expect(back.scoreArticulations[0]).toBe(
      'trk-lead:clip-lead:120:72|staccato',
    );
    expect(back.scoreSlurs[0]).toBe(
      `trk-lead:clip-lead:120:72|${key(tracks[0], 0, 3)}`,
    );
  });

  it('saves the same marks every time, minting nothing', () => {
    const { tracks, marks } = kitchenSink();
    const before = throughJson({ tracks, marks });
    const first = encodeNoteMarks(marks, tracks);
    const second = encodeNoteMarks(marks, tracks);
    expect(second).toEqual(first);
    expect({ tracks, marks }).toEqual(before);
  });
});

describe('orphans', () => {
  it('drops and counts every mark whose note is gone', () => {
    const { tracks } = kitchenSink();
    const lead = tracks[0];
    const gone = 'trk-lead:clip-lead:9999:60';
    const marks: NoteMarksInMemory = {
      scoreArticulations: [`${key(lead, 0, 1)}|staccato`, `${gone}|accent`],
      // One end missing is enough to drop a slur.
      scoreSlurs: [`${key(lead, 0, 1)}|${gone}`, `${gone}|${key(lead, 0, 2)}`],
      scoreSpellings: [`${gone}|C♯4`],
      scoreSlashNotes: [gone, 'trk-gone:clip:0:60'],
    };
    const saved = encodeNoteMarks(marks, tracks);
    expect(saved.orphans).toBe(6);
    expect(saved.marks).toEqual({
      articulations: [`${lead.midiClips[0].events[1].id}|staccato`],
      slurs: [],
      spellings: [],
      slashNotes: [],
    });
  });

  it('drops a mark with no separator', () => {
    const tracks = [
      track('t', [{ id: 'c', startTick: 0, events: [ev(0, 60)] }]),
    ];
    const marks = {
      ...NO_MARKS,
      scoreArticulations: ['t:c:0:60|staccato', 'no-separator'],
      scoreSlurs: ['no-separator'],
    };
    const saved = encodeNoteMarks(marks, tracks);
    expect(saved.orphans).toBe(2);
    expect(saved.marks.articulations).toEqual([
      `${tracks[0].midiClips[0].events[0].id}|staccato`,
    ]);
  });

  it('keeps a mark on a note without an id, under the id it is given', () => {
    // ensureProjectNoteIds gives the note its legacy id: the one a codec that
    // settles its tracks the same way stores with it.
    const tracks = [
      track('t', [
        { id: 'c', startTick: 0, events: [{ ...ev(0, 60), id: undefined }] },
      ]),
    ];
    const saved = encodeNoteMarks(
      { ...NO_MARKS, scoreArticulations: ['t:c:0:60|staccato'] },
      tracks,
    );
    expect(saved.orphans).toBe(0);
    expect(saved.marks.articulations).toEqual([
      `${legacyNoteId('c', 0)}|staccato`,
    ]);
    // The tracks themselves are left as they were.
    expect(tracks[0].midiClips[0].events[0].id).toBeUndefined();
  });

  it('drops a spelling its note no longer sounds', () => {
    const tracks = [
      track('t', [{ id: 'c', startTick: 0, events: [ev(0, 61)] }]),
    ];
    const saved = encodeNoteMarks(
      { ...NO_MARKS, scoreSpellings: ['t:c:0:61|D♭4', 't:c:0:61|E4'] },
      tracks,
    );
    // D♭ is pitch class 1, as is MIDI 61; E is 4.
    expect(saved.marks.spellings).toEqual([
      `${tracks[0].midiClips[0].events[0].id}|D♭4`,
    ]);
    expect(saved.orphans).toBe(1);

    // Re-pitched under the same id: the stored spelling no longer fits.
    const repitched = throughJson(tracks);
    repitched[0].midiClips[0].events[0].note = 62;
    expect(decodeNoteMarks(saved.marks, repitched).scoreSpellings).toEqual([]);
    // An octave away it still fits, as the D♭ of that octave.
    repitched[0].midiClips[0].events[0].note = 73;
    expect(decodeNoteMarks(saved.marks, repitched).scoreSpellings).toEqual([
      't:c:0:73|D♭5',
    ]);
  });

  it('stores a spelling in the octave its note sounds', () => {
    // B♯4 is MIDI 72; pinned on 84 (moved an octave), it is B♯5.
    const tracks = [
      track('t', [{ id: 'c', startTick: 0, events: [ev(0, 84)] }]),
    ];
    const saved = encodeNoteMarks(
      { ...NO_MARKS, scoreSpellings: ['t:c:0:84|B♯4'] },
      tracks,
    );
    expect(saved.marks.spellings).toEqual([
      `${tracks[0].midiClips[0].events[0].id}|B♯5`,
    ]);
  });

  it('drops marks whose notes a loader gave new ids', () => {
    const { tracks, marks } = kitchenSink();
    const { marks: stored } = encodeNoteMarks(marks, tracks);
    const reminted = throughJson(tracks);
    for (const t of reminted) {
      for (const c of t.midiClips) for (const e of c.events) e.id = nextId();
    }
    expect(decodeNoteMarks(stored, reminted)).toEqual(NO_MARKS);
  });
});

describe('two notes on one tick and pitch', () => {
  const twins = () =>
    [
      track('t', [
        {
          id: 'c',
          startTick: 0,
          events: [ev(480, 64), ev(0, 60), ev(0, 60), ev(960, 60)],
        },
      ]),
    ] as Track[];

  it('give their shared key to the first of them', () => {
    const tracks = twins();
    const [, first, second] = tracks[0].midiClips[0].events;
    const saved = encodeNoteMarks(
      {
        ...NO_MARKS,
        scoreArticulations: ['t:c:0:60|staccato'],
        scoreSlurs: ['t:c:0:60|t:c:960:60'],
      },
      tracks,
    );
    expect(saved.marks.articulations).toEqual([`${first.id}|staccato`]);
    expect(saved.marks.slurs[0].startsWith(`${first.id}|`)).toBe(true);
    expect(saved.marks.articulations[0]).not.toContain(second.id!);
  });

  it('give it to the first even when it has no id yet', () => {
    const tracks = twins();
    const events = tracks[0].midiClips[0].events;
    events[1] = { ...events[1], id: undefined };
    const saved = encodeNoteMarks(
      { ...NO_MARKS, scoreSlashNotes: ['t:c:0:60'] },
      tracks,
    );
    // First in (startTick, note) order: its legacy index is 0.
    expect(saved.marks.slashNotes).toEqual([legacyNoteId('c', 0)]);
  });

  it('collapse onto one mark when both carry it in storage', () => {
    const tracks = twins();
    const [, first, second] = tracks[0].midiClips[0].events;
    const stored: PersistedNoteMarks = {
      articulations: [`${first.id}|accent`, `${second.id}|accent`],
      // A slur between the two would run from a key to itself.
      slurs: [`${first.id}|${second.id}`],
      spellings: [],
      slashNotes: [first.id!, second.id!],
    };
    expect(decodeNoteMarks(stored, tracks)).toEqual({
      ...NO_MARKS,
      scoreArticulations: ['t:c:0:60|accent'],
      scoreSlashNotes: ['t:c:0:60'],
    });
  });
});

describe('spellings', () => {
  it('keep the last one per note, the one the Score reads', () => {
    const tracks = [
      track('t', [{ id: 'c', startTick: 0, events: [ev(0, 66), ev(480, 70)] }]),
    ];
    const [a, b] = tracks[0].midiClips[0].events;
    const saved = encodeNoteMarks(
      {
        ...NO_MARKS,
        scoreSpellings: ['t:c:0:66|F♯4', 't:c:480:70|B♭4', 't:c:0:66|G♭4'],
      },
      tracks,
    );
    expect(saved.marks.spellings).toEqual([`${b.id}|B♭4`, `${a.id}|G♭4`]);
    const back = decodeNoteMarks(
      { ...saved.marks, spellings: [`${a.id}|F♯4`, `${a.id}|G♭4`] },
      tracks,
    );
    expect(back.scoreSpellings).toEqual(['t:c:0:66|G♭4']);
  });
});

describe('loading what was stored', () => {
  it('tolerates missing and malformed lists', () => {
    const { tracks } = kitchenSink();
    const id = tracks[0].midiClips[0].events[0].id;
    const odd = {
      articulations: [`${id}|staccato`, 7, null],
      slurs: 'not a list',
      slashNotes: [id],
    } as unknown as PersistedNoteMarks;
    expect(decodeNoteMarks(odd, tracks)).toEqual({
      ...NO_MARKS,
      scoreArticulations: [`${key(tracks[0], 0, 0)}|staccato`],
      scoreSlashNotes: [key(tracks[0], 0, 0)],
    });
    expect(
      decodeNoteMarks(undefined as unknown as PersistedNoteMarks, tracks),
    ).toEqual(NO_MARKS);
  });
});

describe('spellingForPitch', () => {
  it('keeps a spelling that fits, in the octave its note sounds', () => {
    expect(spellingForPitch('F♯4', 66)).toBe('F♯4');
    expect(spellingForPitch('G♭4', 78)).toBe('G♭5');
    // The octave follows the written letter: B♯4 is 72, C♭5 is 71.
    expect(spellingForPitch('B♯4', 84)).toBe('B♯5');
    expect(spellingForPitch('C♭5', 59)).toBe('C♭4');
    expect(spellingForPitch('E𝄫3', 74)).toBe('E𝄫5');
    // Written as it was, ASCII included; an octave below 0 too.
    expect(spellingForPitch('Bb3', 70)).toBe('Bb4');
    expect(spellingForPitch('C0', 0)).toBe('C-1');
  });

  it('drops a spelling of another pitch class', () => {
    expect(spellingForPitch('F♯4', 67)).toBeNull();
    expect(spellingForPitch('B♯4', 71)).toBeNull();
    expect(spellingForPitch('F♯', 67)).toBeNull();
  });

  it('leaves alone what it cannot read, or a name without an octave', () => {
    expect(spellingForPitch('H4', 60)).toBe('H4');
    expect(spellingForPitch('F♯', 78)).toBe('F♯');
  });
});

describe('a codec that settles its ids once', () => {
  /**
   * Save as a codec does: settle the tracks' ids, store those ids with the
   * notes and the marks by them; then load (JSON, a note whose stored id is
   * missing gets none) and settle again.
   */
  function saveAndLoad(
    tracks: Track[],
    marks: NoteMarksInMemory,
    marksFrom: 'settled' | 'store' = 'settled',
  ) {
    const settled = ensureProjectNoteIds(tracks);
    const saved = encodeNoteMarks(
      marks,
      marksFrom === 'settled' ? settled : tracks,
    );
    const stored = throughJson({ tracks: settled, marks: saved.marks });
    const loaded = ensureProjectNoteIds(stored.tracks);
    expect(assertNoteIds(loaded)).toEqual([]);
    return {
      orphans: saved.orphans,
      back: decodeNoteMarks(stored.marks, loaded),
    };
  }

  it('brings back a mark on a copy that shares its note ids', () => {
    // A clip copied with its notes' ids: two notes, two clips, one id.
    const [shared] = mintNoteIds(1);
    const tracks = [
      track('t', [
        { id: 'a', startTick: 0, events: [ev(0, 60, shared)] },
        { id: 'b', startTick: 1920, events: [ev(0, 64, shared)] },
      ]),
    ];
    const marks = {
      ...NO_MARKS,
      scoreArticulations: ['t:b:0:64|staccato', 't:a:0:60|accent'],
      scoreSlurs: ['t:a:0:60|t:b:0:64'],
    };
    for (const from of ['settled', 'store'] as const) {
      const { orphans, back } = saveAndLoad(tracks, marks, from);
      expect(orphans).toBe(0);
      expect(back).toEqual(marks);
    }
  });

  it('brings back a mark on a note that had no id', () => {
    const tracks = [
      track('t', [
        {
          id: 'a',
          startTick: 0,
          events: [{ ...ev(0, 60), id: undefined }, ev(480, 62)],
        },
      ]),
    ];
    const marks = {
      ...NO_MARKS,
      scoreArticulations: ['t:a:0:60|accent'],
      scoreSlashNotes: ['t:a:0:60'],
    };
    for (const from of ['settled', 'store'] as const) {
      const { orphans, back } = saveAndLoad(tracks, marks, from);
      expect(orphans).toBe(0);
      expect(back).toEqual(marks);
    }
  });
});

describe('a project without marks', () => {
  it('translates nothing, and never reads the notes', () => {
    // Most projects have no marks; their notes aren't indexed on each save.
    const unread = null as unknown as Track[];
    expect(encodeNoteMarks(NO_MARKS, unread)).toEqual({
      marks: { articulations: [], slurs: [], spellings: [], slashNotes: [] },
      orphans: 0,
    });
    expect(
      decodeNoteMarks(
        { articulations: [], slurs: [], spellings: [], slashNotes: [] },
        unread,
      ),
    ).toEqual(NO_MARKS);
    expect(
      decodeNoteMarks(undefined as unknown as PersistedNoteMarks, unread),
    ).toEqual(NO_MARKS);
  });
});
