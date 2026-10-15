import { describe, it, expect } from 'vitest';
import {
  audioClipSection,
  clearAudioRange,
  splitAudioClip,
} from '../audioClipCuts';
import type { AudioClip } from '@/daw/store/tracksSlice';

// At 120 bpm a second is 960 ticks (PPQ 480), which keeps the offsets exact.
const BPM = 120;
const SEC = 960;

/** A take at 4 s, 8 s long, trimmed 1.5 s into its recording. */
const take = (over: Partial<AudioClip> = {}): AudioClip => ({
  id: 'take',
  startTick: 4 * SEC,
  duration: 8 * SEC,
  fadeInTicks: 240,
  fadeOutTicks: 480,
  assetId: 'asset-1',
  offsetSeconds: 1.5,
  gain: 0.8,
  ...over,
});

/** Where in the recording the audio a clip plays at song tick `tick` comes from. */
const recordingSecondsAt = (clip: AudioClip, tick: number) =>
  (clip.offsetSeconds ?? 0) + (tick - clip.startTick) / SEC;

/** The clip (of `clips`) that plays at song tick `tick`. */
const clipAt = (clips: AudioClip[], tick: number) =>
  clips.find((c) => tick >= c.startTick && tick < c.startTick + c.duration);

describe('splitAudioClip', () => {
  it('cuts at the tick: the halves cover the clip end to end', () => {
    const halves = splitAudioClip(take(), 7 * SEC, BPM, 'right');
    expect(halves).not.toBeNull();
    const [left, right] = halves!;

    expect(left.startTick).toBe(4 * SEC);
    expect(left.duration).toBe(3 * SEC);
    expect(right.startTick).toBe(7 * SEC);
    expect(right.duration).toBe(5 * SEC);
  });

  it('reads the right half on from the cut, after the clip’s own trim', () => {
    const clip = take();
    const [left, right] = splitAudioClip(clip, 7 * SEC, BPM, 'right')!;

    // The left half starts where the clip did: same trim.
    expect(left.offsetSeconds).toBe(1.5);
    // 3 s cut off the front, on top of the 1.5 s trim.
    expect(right.offsetSeconds).toBe(4.5);
    // Every tick still plays the audio the unsplit clip played there.
    for (const s of [4, 5.5, 6.99, 7, 9, 11.99]) {
      const tick = s * SEC;
      const half = clipAt([left, right], tick)!;
      expect(recordingSecondsAt(half, tick)).toBeCloseTo(
        recordingSecondsAt(clip, tick),
        9,
      );
    }
  });

  it('offsets a never-trimmed take from its start', () => {
    const clip = take({ offsetSeconds: undefined });
    const [left, right] = splitAudioClip(clip, 6 * SEC, BPM, 'right')!;
    expect(left.offsetSeconds).toBeUndefined();
    expect(right.offsetSeconds).toBe(2);
  });

  it('converts the cut at the project tempo', () => {
    // At 90 bpm a beat (480 ticks) lasts 2/3 s.
    const clip = take({ startTick: 0, offsetSeconds: 0 });
    const [, right] = splitAudioClip(clip, 480 * 3, 90, 'right')!;
    expect(right.offsetSeconds).toBeCloseTo(2, 9);
  });

  it('keeps the asset and gain on both halves; only the right is a new id', () => {
    const [left, right] = splitAudioClip(take(), 7 * SEC, BPM, 'right')!;
    expect(left.id).toBe('take');
    expect(right.id).toBe('right');
    for (const half of [left, right]) {
      expect(half.assetId).toBe('asset-1');
      expect(half.gain).toBe(0.8);
    }
  });

  it('keeps the fades on the outer edges and none on the cut', () => {
    const [left, right] = splitAudioClip(take(), 7 * SEC, BPM, 'right')!;
    expect(left.fadeInTicks).toBe(240);
    expect(left.fadeOutTicks).toBe(0);
    expect(right.fadeInTicks).toBe(0);
    expect(right.fadeOutTicks).toBe(480);
  });

  it('does nothing at or outside the clip edges', () => {
    const clip = take();
    expect(splitAudioClip(clip, clip.startTick, BPM, 'r')).toBeNull();
    expect(
      splitAudioClip(clip, clip.startTick + clip.duration, BPM, 'r'),
    ).toBeNull();
    expect(splitAudioClip(clip, 0, BPM, 'r')).toBeNull();
    expect(splitAudioClip(clip, 20 * SEC, BPM, 'r')).toBeNull();
  });

  it('leaves the clip it was given untouched', () => {
    const clip = take();
    const before = structuredClone(clip);
    splitAudioClip(clip, 7 * SEC, BPM, 'right');
    expect(clip).toEqual(before);
  });
});

describe('audioClipSection', () => {
  it('is null for a range that misses the clip', () => {
    expect(audioClipSection(take(), 0, 4 * SEC, BPM)).toBeNull();
    expect(audioClipSection(take(), 12 * SEC, 20 * SEC, BPM)).toBeNull();
  });

  it('clamps the range to the clip', () => {
    const whole = audioClipSection(take(), 0, 100 * SEC, BPM)!;
    expect(whole).toEqual(take());
  });
});

describe('clearAudioRange (record-over)', () => {
  const newIds = () => {
    let n = 0;
    return () => `new-${++n}`;
  };

  it('keeps both sides of a clip a take lands inside, on the same recording', () => {
    const clip = take();
    const result = clearAudioRange([clip], 6 * SEC, 8 * SEC, BPM, newIds());

    expect(result.changed).toBe(true);
    const [left, right] = result.clips;
    expect(result.clips).toHaveLength(2);

    expect(left).toMatchObject({
      id: 'take',
      startTick: 4 * SEC,
      duration: 2 * SEC,
      offsetSeconds: 1.5,
      fadeInTicks: 240,
      fadeOutTicks: 0,
    });
    expect(right).toMatchObject({
      id: 'new-1',
      startTick: 8 * SEC,
      duration: 4 * SEC,
      // 4 s into the clip, plus its 1.5 s trim.
      offsetSeconds: 5.5,
      fadeInTicks: 0,
      fadeOutTicks: 480,
    });
    for (const piece of [left, right]) {
      expect(piece.assetId).toBe('asset-1');
      expect(piece.gain).toBe(0.8);
    }
    expect(result.shared).toEqual([{ from: 'take', to: 'new-1' }]);
  });

  it('keeps the tail of a clip the take covers the front of', () => {
    const result = clearAudioRange([take()], 2 * SEC, 6 * SEC, BPM, newIds());
    expect(result.clips).toEqual([
      take({
        startTick: 6 * SEC,
        duration: 6 * SEC,
        offsetSeconds: 3.5,
        fadeInTicks: 0,
      }),
    ]);
    // Still the same clip (id), so nothing new needs audio.
    expect(result.shared).toEqual([]);
  });

  it('keeps the head of a clip the take covers the end of', () => {
    const result = clearAudioRange([take()], 10 * SEC, 14 * SEC, BPM, newIds());
    expect(result.clips).toEqual([
      take({ duration: 6 * SEC, fadeOutTicks: 0 }),
    ]);
  });

  it('removes a clip the take covers whole', () => {
    const result = clearAudioRange([take()], 3 * SEC, 13 * SEC, BPM, newIds());
    expect(result.changed).toBe(true);
    expect(result.clips).toEqual([]);
  });

  it('leaves the take itself and the clips it misses as they were, in order', () => {
    const before = take({ id: 'before', startTick: 0, duration: 2 * SEC });
    const overlapped = take({ id: 'overlapped' });
    const recorded = take({ id: 'recorded', startTick: 6 * SEC });
    const after = take({ id: 'after', startTick: 20 * SEC });
    const result = clearAudioRange(
      [before, overlapped, recorded, after],
      6 * SEC,
      14 * SEC,
      BPM,
      newIds(),
      'recorded',
    );
    expect(result.clips.map((c) => c.id)).toEqual([
      'before',
      'overlapped',
      'recorded',
      'after',
    ]);
    expect(result.clips[0]).toBe(before);
    expect(result.clips[2]).toBe(recorded);
    expect(result.clips[3]).toBe(after);
  });

  it('reports no change when the take touches no clip', () => {
    const clip = take();
    const missed = clearAudioRange([clip], 0, 4 * SEC, BPM, newIds());
    expect(missed.changed).toBe(false);
    expect(missed.clips).toEqual([clip]);

    const empty = clearAudioRange([clip], 6 * SEC, 6 * SEC, BPM, newIds());
    expect(empty.changed).toBe(false);
    expect(empty.clips[0]).toBe(clip);
  });
});
