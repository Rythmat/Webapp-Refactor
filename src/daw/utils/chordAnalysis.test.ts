import { describe, expect, it } from 'vitest';
import type { Track } from '@/daw/store/tracksSlice';
import {
  analyzeChordSymbols,
  harmonyNotesKey,
  hasHarmonyNotes,
  sameChordSymbols,
} from './chordAnalysis';

const BAR = 1920;
const note = (n: number, startTick: number, durationTicks = BAR) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 0,
});
const track = (
  id: string,
  trackRole: string,
  instrument: string,
  clipStart: number,
  events: ReturnType<typeof note>[],
) =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument,
    trackRole,
    volume: 0.8,
    midiClips: [{ id: `${id}-clip`, startTick: clipStart, events }],
    audioClips: [],
  }) as unknown as Track;

// Keys: C major then F major, in a clip that starts at bar 2.
const keys = track('keys', 'chords', 'electric-piano', BAR, [
  note(60, 0),
  note(64, 0),
  note(67, 0),
  note(65, BAR),
  note(69, BAR),
  note(72, BAR),
]);
const bass = track('bass', 'bass', 'soundfont', 0, [
  note(36, BAR),
  note(41, 2 * BAR),
]);
const drums = track('drums', 'drums', 'drum-machine', 0, [
  note(36, 0),
  note(38, 480),
]);
const lead = track('lead', 'melody', 'oracle-synth', 0, [note(76, BAR, 480)]);
// Pad: A minor in bar 1.
const pad = track('pad', 'chords', 'pad', 0, [
  note(57, 0),
  note(60, 0),
  note(64, 0),
]);

describe('analyzeChordSymbols', () => {
  it('proposes chords on the song timeline, in the project key', () => {
    const a = analyzeChordSymbols([keys, bass, drums, lead], {
      rootNote: 0,
      mode: 'ionian',
    });
    expect(a.regions.map((r) => [r.startTick, r.degreeKey])).toEqual([
      [BAR, '1 major'],
      [2 * BAR, '4 major'],
    ]);
    expect([a.rootNote, a.mode, a.keyDetected, a.trackIds, a.source]).toEqual([
      0,
      'ionian',
      false,
      null,
      'notes',
    ]);
  });

  it('reads only the chosen tracks', () => {
    const a = analyzeChordSymbols([keys, pad], {
      rootNote: 0,
      mode: 'ionian',
      trackIds: ['pad'],
    });
    expect(a.regions.map((r) => r.degreeKey)).toEqual(['6 minor']);
    expect(a.trackIds).toEqual(['pad']);
  });

  it('detects a key when the project has none', () => {
    const a = analyzeChordSymbols([keys, bass], {
      rootNote: null,
      mode: 'ionian',
    });
    expect(a.keyDetected).toBe(true);
    expect(a.rootNote).toBeGreaterThanOrEqual(0);
    expect(a.regions).toHaveLength(2);
  });
});

describe('harmonyNotesKey', () => {
  const withEvents = (t: Track, events: ReturnType<typeof note>[]) =>
    ({
      ...t,
      midiClips: [{ ...t.midiClips[0], events }],
    }) as Track;

  it('changes when a bass note or a track role changes', () => {
    const before = harmonyNotesKey([keys, bass]);
    expect(harmonyNotesKey([keys, bass])).toBe(before);
    expect(
      harmonyNotesKey([
        keys,
        withEvents(bass, [note(36, BAR), note(43, 2 * BAR)]),
      ]),
    ).not.toBe(before);
    expect(
      harmonyNotesKey([keys, { ...bass, trackRole: 'melody' } as Track]),
    ).not.toBe(before);
  });

  it('ignores melody, drums, and mixer changes', () => {
    const before = harmonyNotesKey([keys, bass, drums, lead]);
    expect(
      harmonyNotesKey([
        { ...keys, volume: 0.2 } as Track,
        bass,
        withEvents(drums, [note(42, 0)]),
        withEvents(lead, [note(79, 0)]),
      ]),
    ).toBe(before);
  });
});

describe('hasHarmonyNotes', () => {
  it('needs a chord track with notes', () => {
    expect(hasHarmonyNotes([keys])).toBe(true);
    expect(hasHarmonyNotes([drums, lead, bass])).toBe(false);
    expect(
      hasHarmonyNotes([
        { ...keys, midiClips: [{ ...keys.midiClips[0], events: [] }] } as Track,
      ]),
    ).toBe(false);
  });
});

describe('sameChordSymbols', () => {
  it('compares chords and timing, not ids or colours', () => {
    const { regions } = analyzeChordSymbols([keys, bass], {
      rootNote: 0,
      mode: 'ionian',
    });
    const copy = regions.map((r) => ({ ...r, id: `${r.id}-copy` }));
    expect(sameChordSymbols(regions, copy)).toBe(true);
    expect(
      sameChordSymbols(regions, [{ ...copy[0], noteName: 'A min' }, copy[1]]),
    ).toBe(false);
  });
});
