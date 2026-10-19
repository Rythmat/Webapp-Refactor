/**
 * The clip commands a clip's right-click menu shares with its keys
 * (clipCommands.ts): Duplicate puts a copy right after the clip, as ⌘D does;
 * Copy and Paste put a copy at the playhead or where the lane was clicked;
 * each is one undo step.
 *
 * Run: npx vitest run src/daw/commands/__tests__/clipCommands.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toasts = vi.hoisted(() => [] as Array<{ title?: string }>);
vi.mock('@/hooks/use-toast', () => ({
  toast: (t: { title?: string }) => {
    toasts.push(t);
  },
}));
const playhead = vi.hoisted(() => ({ tick: 0 }));
vi.mock('@/daw/engine/playheadClock', () => ({
  getPlayheadTick: () => playhead.tick,
}));

import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import {
  copySelectedClip,
  deleteSelectedClip,
  duplicateSelectedClip,
  hasClipToPaste,
  pasteClipsAt,
  pasteClipsAtPlayhead,
} from '../clipCommands';

const s = () => useStore.getState();
const BAR = 1920;
const NOTE = {
  note: 60,
  velocity: 90,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
};

const clipsOf = (trackId: string) =>
  s().tracks.find((t) => t.id === trackId)!.midiClips;

let keys = '';
let bass = '';
let vox = '';
let release: () => void = () => {};

beforeEach(() => {
  toasts.length = 0;
  playhead.tick = 0;
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'electric-piano', 'Keys');
  bass = s().addTrack('midi', 'soundfont', 'Bass');
  vox = s().addTrack('audio', 'vocal-fx', 'Vox');
  s().addMidiClip(keys, {
    id: 'verse',
    startTick: BAR,
    durationTicks: 2 * BAR,
    events: [NOTE, { ...NOTE, note: 64, startTick: 480 }],
  });
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
});

describe('Duplicate', () => {
  it('puts a copy right after the clip, selected, as ⌘D does', () => {
    s().setSelectedClip('verse', keys);
    duplicateSelectedClip();
    const clips = clipsOf(keys);
    expect(clips).toHaveLength(2);
    const copy = clips[1];
    expect(copy.id).not.toBe('verse');
    expect(copy.startTick).toBe(3 * BAR);
    expect(copy.events.map((e) => e.note)).toEqual([60, 64]);
    // Notes of their own.
    expect(copy.events[0].id).not.toBe(clips[0].events[0].id);
    expect(s().selectedClipId).toBe(copy.id);
  });

  it('is one undo step', () => {
    s().setSelectedClip('verse', keys);
    duplicateSelectedClip();
    expect(historyLabels()).toEqual(['Duplicate clip']);
    expect(undo()).toBe(true);
    expect(clipsOf(keys).map((c) => c.id)).toEqual(['verse']);
  });
});

describe('Copy and Paste', () => {
  it('pastes a copy at the playhead on the clip’s track', () => {
    s().setSelectedClip('verse', keys);
    expect(hasClipToPaste()).toBe(false);
    expect(copySelectedClip()).toBe(true);
    expect(hasClipToPaste()).toBe(true);
    playhead.tick = 4 * BAR;
    expect(pasteClipsAtPlayhead()).toBe(true);
    const pasted = clipsOf(keys)[1];
    expect(pasted.startTick).toBe(4 * BAR);
    expect(s().selectedClipId).toBe(pasted.id);
    expect(historyLabels()).toEqual(['Paste clip']);
    undo();
    expect(clipsOf(keys)).toHaveLength(1);
  });

  it('pastes where the lane was clicked, on that lane’s track', () => {
    s().setSelectedClip('verse', keys);
    copySelectedClip();
    pasteClipsAt(bass, 5 * BAR);
    expect(clipsOf(bass)).toHaveLength(1);
    expect(clipsOf(bass)[0]).toMatchObject({ startTick: 5 * BAR });
    expect(s().selectedClipTrackId).toBe(bass);
  });

  it('refuses a note clip on an audio track, changing nothing', () => {
    s().setSelectedClip('verse', keys);
    copySelectedClip();
    pasteClipsAt(vox, 0);
    expect(toasts.at(-1)?.title).toBe("Can't paste the clip there");
    expect(s().tracks.find((t) => t.id === vox)!.audioClips).toHaveLength(0);
    expect(historyLabels()).toEqual([]);
  });
});

describe('Delete', () => {
  it('deletes the selected clip as one undo step', () => {
    s().setSelectedClip('verse', keys);
    expect(deleteSelectedClip()).toBe(true);
    expect(clipsOf(keys)).toHaveLength(0);
    undo();
    expect(clipsOf(keys).map((c) => c.id)).toEqual(['verse']);
  });
});
