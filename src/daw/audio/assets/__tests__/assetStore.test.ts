import { beforeEach, describe, expect, it } from 'vitest';
import {
  adoptAssetId,
  assetByAssetId,
  assetOf,
  bufferOf,
  clearAssets,
  linkToAssetId,
  linkToUrl,
  originalOf,
  setBuffer,
  setOriginal,
  share,
  unlink,
} from '../assetStore';

// ── Audio belongs to its recording, clips link to it ───────────────────────
// Split halves, pastes and duplicates play one asset; a project reopened in
// this tab finds its audio by assetId instead of downloading it again
// (audio-core-08, state-reload-27).

/** A stand-in AudioBuffer: the store only holds and compares it. */
const fakeBuffer = (frames = 48000): AudioBuffer =>
  ({ length: frames, numberOfChannels: 2, sampleRate: 48000 }) as AudioBuffer;

beforeEach(() => clearAssets());

describe('clips and their audio', () => {
  it('links clips given the same buffer to one asset', () => {
    const take = fakeBuffer();
    setBuffer('left', take);
    setBuffer('pasted', take);
    expect(assetOf('left')).toBe(assetOf('pasted'));
    setOriginal('left', new ArrayBuffer(8), 'audio/webm');
    expect(originalOf('pasted')?.contentType).toBe('audio/webm');
  });

  it('moves a clip given new audio to an asset of its own', () => {
    setBuffer('a', fakeBuffer());
    expect(share('a', 'b')).toBe(true);
    const fresh = fakeBuffer(10);
    setBuffer('b', fresh);
    expect(bufferOf('b')).toBe(fresh);
    expect(bufferOf('a')).not.toBe(fresh);
  });

  it('keeps the audio when a clip stops playing it', () => {
    const take = fakeBuffer();
    setBuffer('a', take);
    share('a', 'b');
    unlink('a');
    expect(bufferOf('a')).toBeUndefined();
    expect(bufferOf('b')).toBe(take);
  });

  it('shares nothing for a clip that plays nothing yet', () => {
    expect(share('nothing', 'other')).toBe(false);
  });
});

describe('cloud assets', () => {
  it('gives split halves of one cloud asset one asset (one download)', () => {
    const left = linkToAssetId('left', 'asset-1');
    const right = linkToAssetId('right', 'asset-1');
    expect(left).toBe(right);
    expect(assetByAssetId('asset-1')).toBe(left);
  });

  it("finds a reopened project's audio by assetId", () => {
    const take = fakeBuffer();
    setBuffer('take', take);
    adoptAssetId('take', 'asset-9');
    // The project opens again with a new clip id for the same asset.
    linkToAssetId('take-again', 'asset-9');
    expect(bufferOf('take-again')).toBe(take);
  });

  it('lets an uploaded take adopt its assetId when its clip is stamped first', () => {
    const take = fakeBuffer();
    setBuffer('take', take);
    // The loader sees the stamped clip before the stamp reached the asset.
    const asset = linkToAssetId('take', 'asset-2');
    expect(asset.buffer).toBe(take);
    expect(asset.assetId).toBe('asset-2');
  });

  it('forgets an assetId a failed Save As took back', () => {
    setBuffer('take', fakeBuffer());
    adoptAssetId('take', 'asset-3');
    adoptAssetId('take', null);
    expect(assetOf('take')?.assetId).toBeNull();
    expect(assetByAssetId('asset-3')).toBeUndefined();
  });

  it('relinks a clip whose assetId names another asset', () => {
    setBuffer('take', fakeBuffer());
    adoptAssetId('take', 'old');
    const next = linkToAssetId('take', 'new');
    expect(next.assetId).toBe('new');
    expect(bufferOf('take')).toBeUndefined();
  });
});

describe('bundled samples', () => {
  it('keeps a dropped sample’s audio and learns its URL', () => {
    const tone = fakeBuffer();
    setBuffer('sampler:s1', tone);
    const asset = linkToUrl('sampler:s1', '/samples/chop.wav');
    expect(asset.buffer).toBe(tone);
    // Another sample of the same file finds it.
    expect(linkToUrl('sampler:s2', '/samples/chop.wav')).toBe(asset);
  });
});
