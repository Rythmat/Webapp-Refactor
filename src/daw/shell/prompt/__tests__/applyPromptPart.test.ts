// @vitest-environment jsdom
/**
 * Putting a prompt's part on the timeline: on the spot's track when it plays
 * that part (its clips there cut away), else on the song's track that plays
 * it — where that one has notes there, only when asked to update it — else
 * on a new track; the chords on the lane; a named section marked; one Undo
 * step for all of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import {
  canUndo,
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import type { MidiClip } from '@/daw/store/tracksSlice';
import type { PromptPartResult } from '@/features/promptSong/buildPromptPart';
import { applyPromptPart, placePromptParts } from '../applyPromptPart';
import type { PromptSpot } from '../promptSpot';

vi.mock('@/daw/shell/notice', () => ({ notice: vi.fn() }));

const BAR = 1920;
const s = () => useStore.getState();

const clip = (name: string, notes: number): MidiClip => ({
  id: crypto.randomUUID(),
  name,
  startTick: 0,
  durationTicks: 4 * BAR,
  events: Array.from({ length: notes }, (_, i) => ({
    note: 40 + i,
    velocity: 90,
    startTick: i * 480,
    durationTicks: 240,
    channel: 0,
  })),
});

const result = (over: Partial<PromptPartResult> = {}): PromptPartResult =>
  ({
    parts: [
      {
        part: 'bass',
        name: 'Funk Bass',
        sound: 'bass-electric',
        clip: clip('Funk Bass', 8),
      },
    ],
    chordRegions: null,
    newKey: null,
    newBpm: null,
    section: null,
    track: {} as PromptPartResult['track'],
    seed: 1,
    reading: {
      styleName: 'Funk',
      keyName: 'D Dorian',
      chords: ['Dm7', 'G7'],
      bars: 4,
      parts: ['bass'],
      matched: [],
      groove: null,
    },
    ...over,
  }) as PromptPartResult;

const spot = (over: Partial<PromptSpot> = {}): PromptSpot => ({
  startTick: 4 * BAR,
  lengthTicks: 4 * BAR,
  trackId: null,
  from: 'playhead',
  section: null,
  ...over,
});

let release: () => void = () => {};
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  resetHistory();
  release = startHistory();
});
afterEach(() => {
  release();
  resetHistory();
});

describe('applyPromptPart', () => {
  it('puts the part on a new track at the spot, as one Undo step', () => {
    const applied = applyPromptPart(result(), spot());
    expect(applied.newTracks).toBe(1);
    const track = s().tracks.find((t) => t.id === applied.trackIds[0])!;
    expect(track.name).toBe('Funk Bass');
    expect(track.midiClips[0].startTick).toBe(4 * BAR);
    expect(track.midiClips[0].events).toHaveLength(8);
    expect(undoLabel()).toBe('Add Funk Bass');
    undo();
    expect(s().tracks).toEqual([]);
    expect(canUndo()).toBe(false);
  });

  it('puts it on the spot’s track when that track plays it, cutting its clips there away', () => {
    const bassId = s().addTrack('midi', 'soundfont', 'Bass', {
      trackRole: 'bass',
    });
    s().addMidiClip(bassId, {
      ...clip('Old', 16),
      startTick: 2 * BAR,
      durationTicks: 8 * BAR,
    });
    resetHistory();
    applyPromptPart(result(), spot({ trackId: bassId }));
    const clips = s().tracks.find((t) => t.id === bassId)!.midiClips;
    expect(s().tracks).toHaveLength(1);
    // The old clip's parts before and after the spot, and the new one.
    expect(clips.map((c) => [c.startTick, c.durationTicks])).toEqual([
      [2 * BAR, 2 * BAR],
      [8 * BAR, 2 * BAR],
      [4 * BAR, 4 * BAR],
    ]);
  });

  it('writes its chords on the lane and marks a section it was asked for', () => {
    const regions = ['Dm7', 'G7', 'Dm7', 'G7'].map((name, bar) => ({
      id: name + bar,
      startTick: bar * BAR,
      endTick: (bar + 1) * BAR,
      name,
      noteName: name,
      color: [0, 0, 0] as [number, number, number],
    }));
    applyPromptPart(
      result({ chordRegions: regions, section: 'bridge' }),
      spot(),
    );
    expect(
      s().chordRegions.map((r) => [r.noteName, r.startTick / BAR]),
    ).toEqual([
      ['Dm7', 4],
      ['G7', 5],
      ['Dm7', 6],
      ['G7', 7],
    ]);
    expect(s().sections).toMatchObject([
      { type: 'bridge', label: 'Bridge', startTick: 4 * BAR, endTick: 8 * BAR },
    ]);
  });

  it('sets the key of a song that had none', () => {
    applyPromptPart(
      result({ newKey: { tonicPc: 9, mode: 'aeolian' } }),
      spot(),
    );
    expect(s().rootNote).toBe(9);
    expect(s().mode).toBe('aeolian');
  });

  it('moves the session to the key and tempo a prompt named, in the same Undo step', () => {
    s().setRootNote(4);
    s().setMode('mixolydian');
    s().setBpm(92);
    resetHistory();
    applyPromptPart(
      result({ newKey: { tonicPc: 7, mode: 'aeolian' }, newBpm: 120 }),
      spot(),
    );
    expect([s().rootNote, s().mode, s().bpm]).toEqual([7, 'aeolian', 120]);
    undo();
    expect([s().rootNote, s().mode, s().bpm]).toEqual([4, 'mixolydian', 92]);
  });
});

describe('a part the song has a track for, asked for on another track', () => {
  let chords = '';
  let bass = '';
  beforeEach(() => {
    chords = s().addTrack('midi', 'soundfont', 'Chords', {
      trackRole: 'chords',
    });
    bass = s().addTrack('midi', 'soundfont', 'Bass', { trackRole: 'bass' });
    resetHistory();
  });
  const onChords = () => spot({ trackId: chords, from: 'selection' });
  const bassClips = () => s().tracks.find((t) => t.id === bass)!.midiClips;

  it('goes on the song’s Bass track where it has nothing there, no question', () => {
    const [place] = placePromptParts(result(), onChords());
    expect(place.other?.id).toBe(bass);
    expect(place.occupied).toBe(false);
    applyPromptPart(result(), onChords());
    expect(s().tracks).toHaveLength(2);
    expect(bassClips().map((c) => c.startTick)).toEqual([4 * BAR]);
  });

  it('where Bass plays there: updates it, or keeps it and adds a track', () => {
    s().addMidiClip(bass, {
      ...clip('Old', 16),
      startTick: 2 * BAR,
      durationTicks: 8 * BAR,
    });
    expect(placePromptParts(result(), onChords())[0].occupied).toBe(true);

    applyPromptPart(result(), onChords(), 'keep');
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Chords',
      'Bass',
      'Funk Bass',
    ]);
    expect(bassClips()).toHaveLength(1);
    undo();

    applyPromptPart(result(), onChords(), 'update');
    expect(s().tracks).toHaveLength(2);
    expect(bassClips().map((c) => [c.startTick, c.durationTicks])).toEqual([
      [2 * BAR, 2 * BAR],
      [8 * BAR, 2 * BAR],
      [4 * BAR, 4 * BAR],
    ]);
    // The Chords track the bars were highlighted on is left as it was.
    expect(s().tracks.find((t) => t.id === chords)!.midiClips).toEqual([]);
  });
});
