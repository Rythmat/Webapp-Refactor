/**
 * What the Studio's prompt box suggests (owner, 2026-10-23): steps in the
 * session's style — the prompt it started from, else the project's name,
 * else its genre — for the spot first, then the parts and sections the song
 * lacks, each one the box can write; bars highlighted on a Drums, Bass or
 * Chords track, that track's part only (owner, 2026-10-24).
 */
import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import type { Track } from '@/daw/store/tracksSlice';
import { partsOf, sectionRequest } from '@/features/promptSong/partWords';
import type { PromptSpot } from '../promptSpot';
import {
  article,
  promptSuggestions,
  sessionStyleOf,
} from '../promptSuggestion';

const BAR = 1920;
const verse: SongSection = {
  id: 'v',
  type: 'verse',
  label: 'Verse',
  startTick: 0,
  endTick: 4 * BAR,
};

const track = (over: Partial<Track>): Track =>
  ({
    id: 't',
    name: 'Keys',
    type: 'midi',
    instrument: 'soundfont',
    trackRole: 'auto',
    color: '#fff',
    midiClips: [],
    audioClips: [],
    ...over,
  }) as Track;
const playing = (over: Partial<Track>) =>
  track({
    ...over,
    midiClips: [
      {
        id: 'c',
        startTick: 0,
        durationTicks: 4 * BAR,
        events: [
          {
            note: 40,
            velocity: 90,
            startTick: 0,
            durationTicks: 480,
            channel: 0,
          },
        ],
      },
    ],
  });

const state = (over: object = {}) =>
  ({
    tracks: [],
    sections: [],
    genre: 'Pop',
    projectName: 'Untitled Project',
    rootNote: 3,
    mode: 'ionian',
    bpm: 72,
    chordRegions: [],
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 7680,
    selectedTrackId: null,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    detectedKeyRootPc: null,
    detectedMode: null,
    ...over,
  }) as Parameters<typeof promptSuggestions>[0];
const spot = (over: Partial<PromptSpot> = {}): PromptSpot => ({
  startTick: 0,
  lengthTicks: 4 * BAR,
  trackId: null,
  from: 'playhead',
  section: null,
  ...over,
});

describe('sessionStyleOf', () => {
  it('reads the session’s prompt first, then the project name, then its genre', () => {
    expect(sessionStyleOf(['Make a soulful R&B ballad'], 'Pop')).toMatchObject({
      part: 'R&B',
      groove: 'R&B ballad',
    });
    expect(
      sessionStyleOf([null, 'Melancholic Lo-fi in D Dorian'], 'Pop'),
    ).toMatchObject({
      part: 'Lo-fi',
      groove: 'Lo-fi',
    });
    expect(sessionStyleOf([null, 'Untitled Project'], 'Hip Hop')).toMatchObject(
      {
        part: 'Hip Hop',
        groove: 'Hip Hop',
      },
    );
  });

  it('says a or an by sound', () => {
    expect(article('R&B')).toBe('an');
    expect(article('EDM')).toBe('an');
    expect(article('Lo-fi')).toBe('a');
    expect(article('Hip Hop')).toBe('a');
  });
});

describe('promptSuggestions', () => {
  const rnb = 'Make a soulful R&B ballad';

  it('starts an empty song with the whole band in its style', () => {
    expect(promptSuggestions(state(), spot(), rnb)[0]).toBe(
      'Start the song with R&B ballad drums, bass and chords',
    );
  });

  it('suggests what the song lacks: a part, and a section it hasn’t got', () => {
    const list = promptSuggestions(
      state({
        tracks: [playing({ id: 'k', trackRole: 'chords' })],
        sections: [verse],
      }),
      spot({ section: verse }),
      rnb,
    );
    expect(list[0]).toBe('Write new R&B chords for the verse');
    expect(list).toEqual(
      expect.arrayContaining([
        'Write an R&B bassline for the verse',
        'Add an R&B ballad beat to the verse',
        'Write an R&B bassline for a new chorus part',
        'Write chords for a new chorus that lifts',
        'Write chords for a new bridge that leaves home',
      ]),
    );
  });

  it('leaves out the sections and parts the song already has', () => {
    const chorus: SongSection = {
      ...verse,
      id: 'c',
      type: 'chorus',
      label: 'Chorus',
    };
    const list = promptSuggestions(
      state({
        tracks: [
          playing({ id: 'd', instrument: 'drum-machine' }),
          playing({ id: 'b', trackRole: 'bass' }),
        ],
        sections: [verse, chorus],
      }),
      spot(),
      rnb,
    );
    expect(list.some((t) => /new chorus/.test(t))).toBe(false);
    expect(list).not.toContain('Write an R&B bassline for the verse ');
  });

  it('only suggests what the box can write: a part, and a section it can find or make', () => {
    const list = promptSuggestions(
      state({
        tracks: [playing({ id: 'k', trackRole: 'chords' })],
        sections: [verse],
      }),
      spot(),
      rnb,
    );
    for (const text of list) {
      const named = partsOf(text) ?? (sectionRequest(text) ? ['chords'] : null);
      expect(named, text).not.toBeNull();
      // A bass line's words name no chords ("follows the chords" asked for both).
      if (/bassline/.test(text)) expect(named, text).toEqual(['bass']);
    }
  });
});

describe('bars highlighted on a track', () => {
  const funk = 'Make a funky groove';
  const songTracks = [
    playing({ id: 'd', name: 'Drums', instrument: 'drum-machine' }),
    playing({ id: 'b', name: 'Bass', trackRole: 'bass', gmProgram: 33 }),
    playing({ id: 'c', name: 'Chords', trackRole: 'chords', gmProgram: 4 }),
  ];
  const on = (trackId: string, over: Partial<PromptSpot> = {}) =>
    promptSuggestions(
      state({ tracks: songTracks, bpm: 100 }),
      spot({ trackId, from: 'selection', highlighted: true, ...over }),
      funk,
    );

  it('suggests only that track’s part, in the session’s style', () => {
    for (const [id, part] of [
      ['d', 'drums'],
      ['b', 'bass'],
      ['c', 'chords'],
    ] as const) {
      const list = on(id);
      expect(list.length).toBeGreaterThan(2);
      for (const text of list) expect(partsOf(text), text).toEqual([part]);
    }
    expect(on('d')[0]).toBe('Add a Funk beat here');
    expect(on('b')[0]).toBe('Write a Funk bassline for these bars');
    expect(on('c')[0]).toBe('Write new Funk chords for these bars');
  });

  it('names the style’s library beats for drums, and the section it’s in', () => {
    expect(on('d')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Add the Funk \d beat here$/),
      ]),
    );
    expect(on('b', { section: verse })).toContain(
      'Write a simple Funk bassline for the verse',
    );
  });

  it('keeps the whole list on a track that plays none of the three, or bars not highlighted', () => {
    const tracks = [...songTracks, playing({ id: 'p', name: 'Your idea' })];
    const idea = promptSuggestions(
      state({ tracks, bpm: 100 }),
      spot({ trackId: 'p', from: 'selection', highlighted: true }),
      funk,
    );
    expect(idea.some((t) => partsOf(t)?.includes('chords'))).toBe(true);
    const selected = promptSuggestions(
      state({ tracks: songTracks, bpm: 100 }),
      spot({ trackId: 'd' }),
      funk,
    );
    expect(selected.some((t) => /new chorus/.test(t))).toBe(true);
  });
});
