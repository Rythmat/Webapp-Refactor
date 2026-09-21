import { describe, expect, it } from 'vitest';
import { isTrackAudible } from './trackAudibility';

const track = (mute: boolean, solo: boolean) => ({ mute, solo });

describe('isTrackAudible', () => {
  it('plays every unmuted track when nothing is soloed', () => {
    const rhodes = track(false, false);
    const bass = track(true, false);
    const tracks = [rhodes, bass];
    expect(isTrackAudible(rhodes, tracks)).toBe(true);
    expect(isTrackAudible(bass, tracks)).toBe(false);
  });

  it('silences every track that is not soloed once one is', () => {
    const rhodes = track(false, true);
    const bass = track(false, false);
    const tracks = [rhodes, bass];
    expect(isTrackAudible(rhodes, tracks)).toBe(true);
    expect(isTrackAudible(bass, tracks)).toBe(false);
  });

  it('plays all soloed tracks together', () => {
    const rhodes = track(false, true);
    const bass = track(false, true);
    const drums = track(false, false);
    const tracks = [rhodes, bass, drums];
    expect(isTrackAudible(rhodes, tracks)).toBe(true);
    expect(isTrackAudible(bass, tracks)).toBe(true);
    expect(isTrackAudible(drums, tracks)).toBe(false);
  });

  it('lets mute win over solo on the same track', () => {
    const rhodes = track(true, true);
    expect(isTrackAudible(rhodes, [rhodes, track(false, false)])).toBe(false);
  });
});
