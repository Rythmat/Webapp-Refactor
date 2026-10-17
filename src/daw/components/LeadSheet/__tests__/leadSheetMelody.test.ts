import { describe, expect, it } from 'vitest';
import type { Track } from '@/daw/store/tracksSlice';
import {
  autoMelodyTrack,
  flagCount,
  hasMelodyNotes,
  isFilledNotehead,
  layOutMelody,
  MELODY_STAFF_LAYOUT,
  melodyCandidates,
  melodyNoteOrder,
  melodyScoreParts,
  pickMelodyTracks,
  type MelodyLayoutOptions,
} from '../leadSheetMelody';

const options: MelodyLayoutOptions = {
  ticksPerQuarter: 480,
  timeSignature: [4, 4],
  keyFifths: 0,
  measureCount: 4,
};

/** Only the fields the melody layout and the pick read. */
const track = (
  id: string,
  events: Array<{ note: number; startTick: number; durationTicks: number }>,
  over: Partial<Track> = {},
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument: 'piano-sampler',
    color: 'red',
    trackRole: 'auto',
    midiClips: [
      {
        id: `${id}-clip`,
        name: id,
        startTick: 0,
        events: events.map((e) => ({ ...e, velocity: 90, channel: 0 })),
      },
    ],
    audioClips: [],
    ...over,
  }) as unknown as Track;

describe('picking the melody tracks', () => {
  const chords = track(
    'chords',
    [{ note: 48, startTick: 0, durationTicks: 480 }],
    { trackRole: 'chords' } as Partial<Track>,
  );
  const melody = track(
    'melody',
    [{ note: 72, startTick: 0, durationTicks: 480 }],
    { trackRole: 'melody' } as Partial<Track>,
  );
  const keys = track('keys', [{ note: 64, startTick: 0, durationTicks: 480 }]);
  const kit = track('kit', [{ note: 36, startTick: 0, durationTicks: 120 }], {
    instrument: 'drum-machine',
  } as Partial<Track>);
  const beat = track('beat', [{ note: 36, startTick: 0, durationTicks: 120 }], {
    trackRole: 'drums',
  } as Partial<Track>);
  const vocal = {
    ...track('vocal', []),
    type: 'audio',
    midiClips: [],
  } as unknown as Track;
  const empty = { ...track('empty', []), midiClips: [] } as Track;
  const ids = (pick: { tracks: Track[] }) => pick.tracks.map((t) => t.id);

  it('shows every assigned track, a staff each, in track order', () => {
    const pick = pickMelodyTracks([chords, melody, keys], ['keys', 'chords']);
    expect(ids(pick)).toEqual(['chords', 'keys']);
    expect(pick.auto).toBe(false);
  });

  it('shows one assigned track on its own', () => {
    const pick = pickMelodyTracks([chords, melody], ['chords']);
    expect(ids(pick)).toEqual(['chords']);
    expect(pick.auto).toBe(false);
  });

  it('keeps an assigned track that has no notes yet', () => {
    expect(ids(pickMelodyTracks([melody, empty], ['empty']))).toEqual([
      'empty',
    ]);
  });

  it('falls back to Auto with nothing assigned: the role that says melody', () => {
    const pick = pickMelodyTracks([chords, melody], []);
    expect(ids(pick)).toEqual(['melody']);
    expect(pick.auto).toBe(true);
  });

  it('guesses the role from the name, as the track header does', () => {
    const lead = track('Lead', [
      { note: 72, startTick: 0, durationTicks: 480 },
    ]);
    expect(autoMelodyTrack([keys, lead])?.name).toBe('Lead');
  });

  it('then picks the first track with clips, passing over empty ones', () => {
    expect(autoMelodyTrack([empty, chords, keys])?.id).toBe('chords');
  });

  it('goes back to Auto when every assigned track is gone', () => {
    const pick = pickMelodyTracks([chords, melody], ['deleted', 'gone']);
    expect(ids(pick)).toEqual(['melody']);
    expect(pick.auto).toBe(true);
  });

  it('passes over a deleted track and keeps the rest', () => {
    expect(
      ids(pickMelodyTracks([chords, melody], ['deleted', 'chords'])),
    ).toEqual(['chords']);
  });

  it('never reads a melody from a kit or an audio track', () => {
    expect(melodyCandidates([kit, beat, vocal, keys]).map((t) => t.id)).toEqual(
      ['keys'],
    );
    // Assigned or picked automatically.
    expect(ids(pickMelodyTracks([kit, vocal], ['kit', 'vocal']))).toEqual([]);
    expect(autoMelodyTrack([kit, beat, keys])?.id).toBe('keys');
  });

  it('shows nothing when there is nothing to draw', () => {
    expect(pickMelodyTracks([], [])).toEqual({ tracks: [], auto: true });
    expect(pickMelodyTracks([empty], [])).toEqual({ tracks: [], auto: true });
  });

  it('tells a track with notes from one without', () => {
    expect(hasMelodyNotes(keys)).toBe(true);
    expect(hasMelodyNotes(empty)).toBe(false);
    expect(hasMelodyNotes(track('blank', []))).toBe(false);
  });
});

describe('the staves for the melody tracks', () => {
  const build = (tracks: Track[]) =>
    melodyScoreParts(tracks, {
      rootNote: 0,
      mode: 'ionian',
      timeSignature: [4, 4],
      minMeasures: 4,
    });

  it('stacks a staff per track, named, in the order given', () => {
    const parts = build([
      track('lead', [{ note: 72, startTick: 0, durationTicks: 480 }]),
      track('keys', [{ note: 64, startTick: 0, durationTicks: 480 }]),
    ]);
    expect(parts.map((p) => [p.id, p.name])).toEqual([
      ['lead', 'lead'],
      ['keys', 'keys'],
    ]);
    expect(MELODY_STAFF_LAYOUT).toBe('stacked');
  });

  it('gives a track with no notes a staff of rests, as long as the rest', () => {
    const parts = build([
      track('lead', [{ note: 72, startTick: 0, durationTicks: 480 }]),
      track('student', []),
    ]);
    expect(parts.map((p) => p.noteCount)).toEqual([1, 0]);
    expect(parts[1].score.staves).toEqual(['treble']);
    expect(parts[1].score.measures).toHaveLength(
      parts[0].score.measures.length,
    );
  });
});

describe('laying the melody out', () => {
  it('places a bar of quarter notes across the bar', () => {
    const layout = layOutMelody(
      track('m', [
        { note: 60, startTick: 0, durationTicks: 480 },
        { note: 62, startTick: 480, durationTicks: 480 },
        { note: 64, startTick: 960, durationTicks: 480 },
        { note: 65, startTick: 1440, durationTicks: 480 },
      ]),
      options,
    );
    expect(layout.notes.map((n) => n.position)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(layout.notes.every((n) => n.measureIndex === 0)).toBe(true);
    expect(layout.notes.map((n) => n.value)).toEqual(['q', 'q', 'q', 'q']);
  });

  it('puts notes on the right staff step for treble clef', () => {
    const layout = layOutMelody(
      track('m', [
        { note: 64, startTick: 0, durationTicks: 480 }, // E4, bottom line
        { note: 71, startTick: 480, durationTicks: 480 }, // B4, middle line
        { note: 77, startTick: 960, durationTicks: 480 }, // F5, top line
      ]),
      options,
    );
    expect(layout.notes.map((n) => n.step)).toEqual([0, 4, 8]);
  });

  it('places middle C below the staff', () => {
    const layout = layOutMelody(
      track('m', [{ note: 60, startTick: 0, durationTicks: 1920 }]),
      options,
    );
    expect(layout.notes[0].step).toBe(-2); // one ledger line below
  });

  it('reports which bars carry notes', () => {
    const layout = layOutMelody(
      track('m', [
        { note: 60, startTick: 0, durationTicks: 480 },
        { note: 67, startTick: 1920 * 2, durationTicks: 480 },
      ]),
      options,
    );
    expect([...layout.measuresWithNotes].sort()).toEqual([0, 2]);
  });

  it('names notes the way the Score does, so ids line up', () => {
    const layout = layOutMelody(
      track('lead', [{ note: 60, startTick: 480, durationTicks: 480 }]),
      options,
    );
    expect(layout.notes[0].id).toBe('lead:lead-clip:480:60');
  });

  it('keeps a clip that starts later in the song in its own bar', () => {
    const late = track('m', []);
    late.midiClips = [
      {
        id: 'c',
        name: 'c',
        startTick: 1920,
        events: [
          {
            note: 60,
            startTick: 0,
            durationTicks: 480,
            velocity: 90,
            channel: 0,
          },
        ],
      },
    ] as Track['midiClips'];
    const layout = layOutMelody(late, options);
    expect(layout.notes[0].measureIndex).toBe(1);
    expect(layout.notes[0].position).toBe(0);
  });

  it('shows the top note of a stacked chord', () => {
    const layout = layOutMelody(
      track('m', [
        { note: 60, startTick: 0, durationTicks: 480 },
        { note: 67, startTick: 0, durationTicks: 480 },
      ]),
      options,
    );
    expect(layout.notes).toHaveLength(1);
    expect(layout.notes[0].midi).toBe(67);
  });

  it('draws nothing without a track', () => {
    expect(layOutMelody(null, options).notes).toEqual([]);
  });

  it('draws nothing for a track with no notes', () => {
    expect(layOutMelody(track('m', []), options).notes).toEqual([]);
  });
});

describe('note ordering and glyph hints', () => {
  it('orders notes by when they sound', () => {
    const layout = layOutMelody(
      track('m', [
        { note: 67, startTick: 1920, durationTicks: 480 },
        { note: 60, startTick: 0, durationTicks: 480 },
      ]),
      options,
    );
    expect(melodyNoteOrder(layout)).toEqual([
      'm:m-clip:0:60',
      'm:m-clip:1920:67',
    ]);
  });

  it('fills noteheads shorter than a half note', () => {
    expect(isFilledNotehead('w')).toBe(false);
    expect(isFilledNotehead('h')).toBe(false);
    expect(isFilledNotehead('q')).toBe(true);
    expect(isFilledNotehead('8')).toBe(true);
  });

  it('counts flags', () => {
    expect(flagCount('q')).toBe(0);
    expect(flagCount('8')).toBe(1);
    expect(flagCount('16')).toBe(2);
  });
});
