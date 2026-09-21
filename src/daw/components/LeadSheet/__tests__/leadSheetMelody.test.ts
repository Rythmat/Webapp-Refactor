import { describe, expect, it } from 'vitest';
import type { Track } from '@/daw/store/tracksSlice';
import {
  flagCount,
  isFilledNotehead,
  layOutMelody,
  melodyNoteOrder,
  pickMelodyTrack,
  type MelodyLayoutOptions,
} from '../leadSheetMelody';

const options: MelodyLayoutOptions = {
  ticksPerQuarter: 480,
  timeSignature: [4, 4],
  keyFifths: 0,
  measureCount: 4,
};

/** Only the fields the melody layout reads. */
const track = (
  id: string,
  events: Array<{ note: number; startTick: number; durationTicks: number }>,
  over: Partial<Track> = {},
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
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

describe('picking the melody track', () => {
  const chords = track(
    'chords',
    [{ note: 48, startTick: 0, durationTicks: 480 }],
    {
      trackRole: 'chords',
    } as Partial<Track>,
  );
  const melody = track(
    'melody',
    [{ note: 72, startTick: 0, durationTicks: 480 }],
    {
      trackRole: 'melody',
    } as Partial<Track>,
  );

  it('prefers the track that was explicitly assigned', () => {
    expect(pickMelodyTrack([chords, melody], 'chords')?.id).toBe('chords');
  });

  it('falls back to the track whose role says melody', () => {
    expect(pickMelodyTrack([chords, melody], null)?.id).toBe('melody');
  });

  it('falls back again when the assigned track is gone', () => {
    expect(pickMelodyTrack([chords, melody], 'deleted')?.id).toBe('melody');
  });

  it('ignores tracks with no clips', () => {
    const empty = { ...melody, midiClips: [] } as Track;
    expect(pickMelodyTrack([empty, chords], null)?.id).toBe('chords');
  });

  it('returns null when there is nothing to draw', () => {
    expect(pickMelodyTrack([], null)).toBeNull();
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
