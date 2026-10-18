// @vitest-environment jsdom
import { createElement, useRef } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Duplicate track, in the store (milestone 2.15) ─────────────────────────
// The copy goes in as one undo step, its audio clips play the source's
// audio, it gets its own copy of the Oracle synth patch, and it is selected.
// It is refused, with a notice, at the track limit and while recording.
// ⌘D on a track's row in the list does it and moves focus to the copy.

const h = vi.hoisted(() => ({
  notice: vi.fn(),
  share: vi.fn((_from: string, _to: string) => true),
}));
vi.mock('@/daw/shell/notice', () => ({ notice: h.notice }));
vi.mock('@/daw/audio/AudioBufferStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  shareClipAudio: h.share,
}));

import { noteKey } from '@/daw/model/noteKeys';
import {
  defaultSynthTrackState,
  getTrackSynthState,
  resetSynthTrackCache,
  setTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { duplicateTrack } from '../duplicateTrack';
import { useTrackListKeys } from '../useTrackListKeys';

let stop: () => void = () => {};
let src = '';

const tracks = () => useStore.getState().tracks;

beforeEach(() => {
  h.notice.mockClear();
  h.share.mockClear();
  resetSynthTrackCache();
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    isRecording: false,
    selectedTrackId: null,
    scoreArticulations: [],
    scoreSlurs: [],
    scoreSpellings: [],
    scoreSlashNotes: [],
  });
  src = useStore.getState().addTrack('midi', 'oracle-synth', 'Lead');
  useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
  useStore.getState().addMidiClip(src, {
    id: 'm1',
    startTick: 0,
    events: [
      {
        id: 'note-a',
        note: 60,
        velocity: 90,
        startTick: 0,
        durationTicks: 480,
        channel: 0,
      },
    ],
  });
  useStore.setState({
    scoreArticulations: [`${noteKey(src, 'm1', 0, 60)}|accent`],
  });
  resetHistory();
  stop = startHistory();
});

afterEach(() => {
  stop();
  resetHistory();
  cleanup();
});

describe('duplicateTrack', () => {
  it('puts the copy after the source, selects it, and undoes in one step', () => {
    const before = useStore.getState();
    const id = duplicateTrack(src);

    expect(id).not.toBe('');
    expect(tracks().map((t) => t.id)).toEqual([src, id, before.tracks[1].id]);
    expect(tracks()[1].name).toBe('Lead copy');
    expect(useStore.getState().selectedTrackId).toBe(id);
    const clipId = tracks()[1].midiClips[0].id;
    expect(useStore.getState().scoreArticulations).toContain(
      `${noteKey(id, clipId, 0, 60)}|accent`,
    );
    expect(historyLabels().at(-1)).toBe('Duplicate track');

    expect(undo()).toBe(true);
    expect(tracks()).toEqual(before.tracks);
    expect(useStore.getState().scoreArticulations).toEqual(
      before.scoreArticulations,
    );
  });

  it('shares the audio of each audio clip with its copy', () => {
    const audio = useStore.getState().addTrack('audio', 'none', 'Vox');
    for (const id of ['a1', 'a2']) {
      useStore.getState().addAudioClip(audio, {
        id,
        startTick: 0,
        duration: 960,
        fadeInTicks: 0,
        fadeOutTicks: 0,
      });
    }
    const copy = duplicateTrack(audio);
    const clips = tracks().find((t) => t.id === copy)!.audioClips;
    expect(h.share.mock.calls).toEqual([
      ['a1', clips[0].id],
      ['a2', clips[1].id],
    ]);
  });

  it('gives the copy its own copy of the synth patch', () => {
    const patch = defaultSynthTrackState();
    setTrackSynthState(src, patch);
    const id = duplicateTrack(src);

    const copied = getTrackSynthState(id)!;
    expect(copied).toEqual(patch);
    expect(copied).not.toBe(patch);
    (copied as unknown as Record<string, unknown>).masterVolume = -1;
    expect(getTrackSynthState(src)).toEqual(defaultSynthTrackState());
  });

  it('copies no patch when the source has none of its own', () => {
    const id = duplicateTrack(src);
    expect(getTrackSynthState(id)).toBeUndefined();
  });

  it('refuses at the track limit, saying so', () => {
    while (tracks().length < MAX_TOTAL_TRACKS) {
      useStore.getState().addTrack('midi', 'piano-sampler', 'More');
    }
    resetHistory();
    const before = tracks();

    expect(duplicateTrack(src)).toBe('');
    expect(tracks()).toBe(before);
    expect(historyLabels()).toEqual([]);
    expect(h.notice).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Track limit reached',
        variant: 'destructive',
      }),
    );
  });

  it('refuses while recording, saying so', () => {
    useStore.setState({ isRecording: true });
    const before = tracks();

    expect(duplicateTrack(src)).toBe('');
    expect(tracks()).toBe(before);
    expect(h.notice).toHaveBeenCalledWith({
      title: 'Not while recording',
      description: 'Stop recording to duplicate a track',
      variant: 'destructive',
    });
  });

  it('duplicates a track a collaborator holds', () => {
    useStore.setState({
      remoteUsers: new Map([
        [
          7,
          {
            userId: 'u7',
            userName: 'Sam',
            selectedTrackId: src,
          } as never,
        ],
      ]),
    });
    const id = duplicateTrack(src);
    expect(id).not.toBe('');
    expect(useStore.getState().selectedTrackId).toBe(id);
    expect(h.notice).not.toHaveBeenCalled();
  });

  it('does nothing for a track that isn’t there', () => {
    expect(duplicateTrack('nope')).toBe('');
    expect(h.notice).not.toHaveBeenCalled();
  });
});

/** The track list's rows as far as its keys need them. */
function Rows() {
  const list = useRef<HTMLDivElement>(null);
  useTrackListKeys(list);
  const all = useStore((st) => st.tracks);
  return createElement(
    'div',
    { ref: list },
    all.map((t) =>
      createElement(
        'div',
        { key: t.id, 'data-track-id': t.id },
        createElement('button', { 'data-track-selector': '' }, t.name),
      ),
    ),
  );
}

describe('⌘D on a track’s row', () => {
  it('duplicates the focused row’s track and moves focus to the copy', () => {
    const uninstall = installKeyDispatcher();
    // Frames run once the key's render is in, as in a browser.
    const raf = window.requestAnimationFrame;
    const frames: FrameRequestCallback[] = [];
    window.requestAnimationFrame = (cb) => {
      frames.push(cb);
      return 0;
    };
    try {
      const { container } = render(createElement(Rows));
      const name = container.querySelector<HTMLElement>(
        `[data-track-id="${src}"] [data-track-selector]`,
      )!;
      name.focus();
      // 'Mod' takes ⌘ or Ctrl on any platform (keys.ts).
      fireEvent.keyDown(name, { key: 'd', code: 'KeyD', metaKey: true });
      for (const frame of frames.splice(0)) frame(0);

      expect(tracks()).toHaveLength(3);
      const copy = tracks()[1];
      expect(copy.name).toBe('Lead copy');
      expect(document.activeElement).toBe(
        container.querySelector(
          `[data-track-id="${copy.id}"] [data-track-selector]`,
        ),
      );
    } finally {
      window.requestAnimationFrame = raf;
      uninstall();
    }
  });
});
