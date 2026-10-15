/**
 * One way to move a clip (milestone 1.10): moveClip. It writes once, takes
 * along only the chords read from that clip, and refuses a track a
 * collaborator holds or the wrong kind of track without changing anything.
 * Dragging any MIDI clip used to shift the whole chord lane (timeline-05),
 * and a cross-track move was a remove and an add that a lock could split
 * into a lost or a duplicated clip (timeline-06).
 *
 * Run: npx vitest run src/daw/store/__tests__/moveClip.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toasts = vi.hoisted(() => [] as Array<{ title?: string }>);
vi.mock('@/hooks/use-toast', () => ({
  toast: (t: { title?: string }) => {
    toasts.push(t);
  },
}));

import type { UserPresence } from '@/daw/collab/types';
import { splitMidiClipAt } from '@/daw/components/Timeline/splitMidiClipAt';
import { useStore, type AllSlices } from '../index';
import type { ChordRegion } from '../prismSlice';

const s = () => useStore.getState();
const BAR = 1920;

const chord = (
  id: string,
  bar: number,
  sourceClipId?: string,
): ChordRegion => ({
  id,
  startTick: bar * BAR,
  endTick: (bar + 1) * BAR,
  rawStartTick: bar * BAR + 10,
  name: '1 maj',
  noteName: 'C maj',
  color: [1, 1, 1],
  ...(sourceClipId ? { sourceClipId } : {}),
});

let keys = '';
let drums = '';
let vox = '';

beforeEach(() => {
  toasts.length = 0;
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  vox = s().addTrack('audio', 'vocal-fx', 'Vox');
  s().addMidiClip(keys, {
    id: 'take',
    startTick: 0,
    durationTicks: 2 * BAR,
    events: [],
  });
  s().addMidiClip(drums, { id: 'beat', startTick: 0, events: [] });
  s().addAudioClip(vox, {
    id: 'vocal',
    startTick: BAR,
    duration: BAR,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  });
  useStore.setState({
    chordRegions: [
      chord('prism-1', 0, 'take'),
      chord('prism-2', 1, 'take'),
      chord('sheet', 4),
    ],
  } as Partial<AllSlices>);
});

const clipOf = (trackId: string, clipId: string) =>
  s()
    .tracks.find((t) => t.id === trackId)
    ?.midiClips.find((c) => c.id === clipId);

describe('moving a clip', () => {
  it('takes along the chords read from it, and no others', () => {
    expect(s().moveClip(keys, 'take', keys, 2 * BAR)).toBe(true);
    expect(clipOf(keys, 'take')?.startTick).toBe(2 * BAR);
    expect(
      s().chordRegions.map((r) => [r.id, r.startTick, r.rawStartTick]),
    ).toEqual([
      ['prism-1', 2 * BAR, 2 * BAR + 10],
      ['prism-2', 3 * BAR, 3 * BAR + 10],
      ['sheet', 4 * BAR, 4 * BAR + 10],
    ]);
  });

  it('leaves the chord lane alone when a drum clip moves', () => {
    const before = s().chordRegions;
    s().moveClip(drums, 'beat', drums, 3 * BAR);
    expect(s().chordRegions).toBe(before);
  });

  it('is one store write, onto another track too, the selection following', () => {
    const second = s().addTrack('midi', 'piano-sampler', 'Pad');
    s().setSelectedClip('take', keys);
    let writes = 0;
    const stop = useStore.subscribe(() => {
      writes += 1;
    });
    s().moveClip(keys, 'take', second, BAR);
    stop();
    expect(writes).toBe(1);
    expect(clipOf(keys, 'take')).toBeUndefined();
    expect(clipOf(second, 'take')?.startTick).toBe(BAR);
    expect(s().selectedClipTrackId).toBe(second);
  });

  it('never moves a chord below 0', () => {
    useStore.setState({
      chordRegions: [{ ...chord('late', 1, 'take'), rawStartTick: BAR }],
    } as Partial<AllSlices>);
    s().moveClip(keys, 'take', keys, 0);
    s().moveClip(keys, 'take', keys, -3 * BAR);
    expect(s().chordRegions[0].startTick).toBeGreaterThanOrEqual(0);
  });
});

describe('a move moveClip refuses', () => {
  it('a track a collaborator holds, either end, changing nothing', () => {
    useStore.setState({
      remoteUsers: new Map([
        [7, { selectedTrackId: drums, userName: 'Ana' } as UserPresence],
      ]),
    } as Partial<AllSlices>);
    const before = s().tracks;
    expect(s().moveClip(keys, 'take', drums, BAR)).toBe(false);
    expect(s().moveClip(drums, 'beat', drums, BAR)).toBe(false);
    expect(s().tracks).toBe(before);
    expect(toasts.map((t) => t.title)).toEqual([
      'Track locked',
      'Track locked',
    ]);
  });

  it('a MIDI clip onto an audio track, and an audio clip onto a MIDI one', () => {
    const before = s().tracks;
    expect(s().moveClip(keys, 'take', vox, 0)).toBe(false);
    expect(s().moveClip(vox, 'vocal', keys, 0)).toBe(false);
    expect(s().tracks).toBe(before);
    expect(toasts).toHaveLength(2);
  });
});

describe('splitting a clip', () => {
  it('hands the chords after the cut to the right half', () => {
    const right = splitMidiClipAt(keys, 'take', BAR);
    expect(right).not.toBeNull();
    expect(s().chordRegions.map((r) => [r.id, r.sourceClipId ?? null])).toEqual(
      [
        ['prism-1', 'take'],
        ['prism-2', right],
        ['sheet', null],
      ],
    );
    // Moving the right half now moves only its chord.
    s().moveClip(keys, right!, keys, 3 * BAR);
    expect(s().chordRegions.map((r) => r.startTick)).toEqual([
      0,
      3 * BAR,
      4 * BAR,
    ]);
  });
});
