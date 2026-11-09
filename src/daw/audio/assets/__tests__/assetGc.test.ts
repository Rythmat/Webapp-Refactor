import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The drafts' state of each item, as pendingMedia would report it.
const drafts = vi.hoisted(() => new Map<string, string>());
vi.mock('@/daw/persistence/drafts/pendingMedia', () => ({
  pendingMediaState: (key: string) => drafts.get(key) ?? null,
  releaseStoredMediaBuffers: vi.fn(),
}));

import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  withTransaction,
} from '@/daw/store/history';
import { CACHE_BYTES, collectAudioGarbage } from '../assetGc';
import {
  adoptAssetId,
  bufferOf,
  clearAssets,
  linkToAssetId,
  setBuffer,
} from '../assetStore';

// ── Freeing audio nothing plays ────────────────────────────────────────────
// A take stays while the project or its undo history plays it (undo brings a
// deleted take back playing: audio-core-07, state-reload-23); after a
// project switch, cloud audio goes to a small cache and audio only this
// device has goes once the drafts hold it (audio-core-08, timeline-26).

const s = () => useStore.getState();
const LONG_AGO = Date.now() + 60_000;

const buffer = (seconds = 1): AudioBuffer =>
  ({
    length: seconds * 48000,
    numberOfChannels: 2,
    sampleRate: 48000,
  }) as AudioBuffer;

let release: () => void = () => {};
let vox = '';

function addTake(id: string, assetId: string | null, audio = buffer()) {
  setBuffer(id, audio);
  if (assetId) adoptAssetId(id, assetId);
  s().addAudioClip(vox, {
    id,
    startTick: 0,
    duration: 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
    assetId,
  });
  return audio;
}

/** A project switch: a new project, its history started afresh. */
function openAnotherProject() {
  useStore.setState(useStore.getInitialState(), true);
  resetHistory();
}

beforeEach(() => {
  drafts.clear();
  clearAssets();
  useStore.setState(useStore.getInitialState(), true);
  vox = s().addTrack('audio', 'audio-input', 'Vox');
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
});

describe('within a project', () => {
  it('keeps a deleted take while undo can bring it back, playing', () => {
    const take = withTransaction('Record', () => addTake('take', null));
    withTransaction('Delete clip', () => s().removeAudioClip(vox, 'take'));
    collectAudioGarbage(undefined, LONG_AGO);
    expect(bufferOf('take')).toBe(take);
    undo();
    expect(s().tracks[0].audioClips[0].id).toBe('take');
    expect(bufferOf('take')).toBe(take);
  });

  it('keeps what is on the clipboard', () => {
    addTake('copied', null);
    s().setAudioClipboard(s().tracks[0].audioClips[0], 'copied');
    s().removeAudioClip(vox, 'copied');
    resetHistory();
    collectAudioGarbage(undefined, LONG_AGO);
    expect(bufferOf('copied')).toBeDefined();
  });
});

describe('after a project switch', () => {
  it('keeps the outgoing cloud audio cached, decoded, for a reopen', () => {
    const take = addTake('take', 'asset-1');
    openAnotherProject();
    collectAudioGarbage(undefined, LONG_AGO);
    // The project opens again: its clip finds the audio by assetId.
    expect(linkToAssetId('take-reopened', 'asset-1').buffer).toBe(take);
  });

  it('lets the oldest cloud audio go past the cache', () => {
    const seconds = Math.ceil(CACHE_BYTES / (48000 * 2 * 4)) + 1;
    addTake('old', 'asset-old', buffer(seconds));
    addTake('new', 'asset-new', buffer(1));
    openAnotherProject();
    const { dropped } = collectAudioGarbage(undefined, LONG_AGO);
    expect(dropped).toBe(1);
    expect(linkToAssetId('x', 'asset-old').buffer).toBeNull();
    expect(linkToAssetId('y', 'asset-new').buffer).not.toBeNull();
  });

  it('frees a take only on this device once the drafts hold its bytes', () => {
    addTake('kept', null);
    addTake('stored', null);
    drafts.set('stored', 'stored');
    drafts.set('kept', 'writing');
    openAnotherProject();
    collectAudioGarbage(undefined, LONG_AGO);
    expect(bufferOf('stored')).toBeUndefined();
    expect(bufferOf('kept')).toBeDefined();
  });

  it('never frees a take that just landed', () => {
    addTake('fresh', null);
    drafts.set('fresh', 'stored');
    openAnotherProject();
    collectAudioGarbage(undefined, Date.now());
    expect(bufferOf('fresh')).toBeDefined();
  });
});
