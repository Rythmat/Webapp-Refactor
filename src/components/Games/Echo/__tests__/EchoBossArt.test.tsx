// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EchoBossArt, useBossArt, type BossArt } from '../EchoBossArt';
import {
  BOSS_CLIP,
  BOSS_FACE,
  MAX_REACTION_RATE,
  STILL_MS,
  VIDEO_OVERRUN_MS,
  VIDEO_START_MS,
  barSeconds,
  reactionRate,
  reactionTo,
  type BossClip,
} from '../bossArt';

/**
 * The Echo Boss's art on its own: a clip shows once it plays and its end
 * moves the game on; the boss rests on its face; a video that errors, is
 * refused or never starts gives way to its still and the game goes on; one
 * stuck part way is over all the same; under reduced motion there are no
 * videos, only stills held a moment. And the reaction: a frown for a good
 * echo, a nod for a miss, sped up to fit a bar.
 */

/** What each play() was asked: the clip, at its rate. */
let plays: string[] = [];
/** What play() returns this time (resolved, unless a test says). */
let playResult: () => Promise<void> = () => Promise.resolve();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  plays = [];
  playResult = () => Promise.resolve();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    plays.push(`${this.dataset.echoBossClip}@${this.playbackRate}`);
    return playResult();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderArt(reducedMotion = false) {
  const ref: { current: BossArt | null } = { current: null };
  function Harness() {
    const art = useBossArt(reducedMotion);
    ref.current = art;
    return (
      <div className="relative">
        <EchoBossArt art={art} reducedMotion={reducedMotion} />
      </div>
    );
  }
  render(<Harness />);
  return () => ref.current!.controls;
}

const layer = () => document.querySelector('[data-echo-boss-art]')!;
const front = () => layer().getAttribute('data-echo-boss-front');
const still = () => layer().getAttribute('data-echo-boss-still');
const up = () => layer().getAttribute('data-echo-boss-art') === 'up';
const video = (clip: BossClip) =>
  document.querySelector(`video[data-echo-boss-clip="${clip}"]`)!;
const flush = () =>
  act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('the boss’s reactions', () => {
  it('frowns at a good echo and nods at a miss', () => {
    expect(reactionTo({ passed: true })).toBe('frown');
    expect(reactionTo({ passed: false })).toBe('nod');
  });

  it('speeds a reaction up to fit a bar, up to twice as fast', () => {
    // 80 BPM: a bar is 3 s; the 4 s clip in 90% of it.
    expect(reactionRate('frown', barSeconds(80))).toBeCloseTo(4 / 2.7, 5);
    // The boss's fastest (Level 3's top, 116): 2×, and still over
    // inside the bar.
    expect(reactionRate('nod', barSeconds(116))).toBe(MAX_REACTION_RATE);
    expect(4 / MAX_REACTION_RATE).toBeLessThan(barSeconds(116));
    // Never past 2×, never slower than as made.
    expect(reactionRate('frown', barSeconds(200))).toBe(MAX_REACTION_RATE);
    expect(reactionRate('frown', barSeconds(40))).toBe(1);
  });
});

describe('the boss’s art', () => {
  it('mounts its five videos muted, inline and preloading', () => {
    renderArt();
    const videos = [...document.querySelectorAll('video')];
    expect(videos.map((v) => v.dataset.echoBossClip)).toEqual([
      'emerge',
      'frown',
      'nod',
      'loss',
      'victory',
    ]);
    for (const v of videos) {
      expect(v.muted).toBe(true);
      expect(v.hasAttribute('playsinline')).toBe(true);
      expect(v.getAttribute('preload')).toBe('auto');
      expect(v.getAttribute('src')).toBe(
        BOSS_CLIP[v.dataset.echoBossClip as BossClip].video,
      );
    }
    // Nothing shows until it plays: the live ring does.
    expect(up()).toBe(false);
  });

  it('shows the entrance once it plays, and calls its end when it ends', async () => {
    const controls = renderArt();
    const onEnd = vi.fn();
    act(() => controls().play('emerge', { onEnd }));
    await flush();
    expect(plays).toEqual(['emerge@1']);
    expect(up()).toBe(false);
    fireEvent.playing(video('emerge'));
    expect(up()).toBe(true);
    expect(front()).toBe('emerge');
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.ended(video('emerge'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    // Resting, it holds the entrance's last frame: the face.
    act(() => controls().rest());
    expect(front()).toBe('emerge');
  });

  it('plays a reaction at its rate, over the face, and rests on its last frame', async () => {
    const controls = renderArt();
    act(() => controls().rest());
    expect(still()).toBe(BOSS_FACE);
    const onEnd = vi.fn();
    act(() => controls().play('frown', { rate: 1.5, onEnd }));
    await flush();
    expect(plays).toEqual(['frown@1.5']);
    // The face shows until the frown is under way.
    expect(front()).toBeNull();
    fireEvent.playing(video('frown'));
    expect(front()).toBe('frown');
    fireEvent.ended(video('frown'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    act(() => controls().rest());
    expect(front()).toBe('frown');
    // The same clip again starts over.
    act(() => controls().play('frown', { rate: 1.5 }));
    expect(plays).toEqual(['frown@1.5', 'frown@1.5']);
  });

  it('cuts a clip short to the face when told to rest', async () => {
    const controls = renderArt();
    const onEnd = vi.fn();
    act(() => controls().play('emerge', { onEnd }));
    await flush();
    fireEvent.playing(video('emerge'));
    act(() => controls().rest());
    expect(front()).toBeNull();
    expect(still()).toBe(BOSS_FACE);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    // A late end is no one's.
    fireEvent.ended(video('emerge'));
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('falls back to its still when a video errors, and moves on', async () => {
    const controls = renderArt();
    const onEnd = vi.fn();
    act(() => controls().play('nod', { rate: 2, onEnd }));
    await flush();
    fireEvent.error(video('nod'));
    expect(front()).toBeNull();
    expect(still()).toBe(BOSS_CLIP.nod.still);
    expect(up()).toBe(true);
    // As long as the clip would have run (4 s at 2×), then the face.
    await wait(1999);
    expect(onEnd).not.toHaveBeenCalled();
    await wait(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(still()).toBe(BOSS_FACE);
    // A broken video isn't waited for again.
    act(() => controls().play('nod', { rate: 2 }));
    expect(still()).toBe(BOSS_CLIP.nod.still);
    expect(plays).toEqual(['nod@2']);
  });

  it('falls back when the browser refuses to play it', async () => {
    const controls = renderArt();
    playResult = () =>
      Promise.reject(new DOMException('No', 'NotAllowedError'));
    const onEnd = vi.fn();
    act(() => controls().play('loss', { onEnd }));
    await flush();
    expect(still()).toBe(BOSS_CLIP.loss.still);
    await wait(STILL_MS.loss);
    expect(onEnd).toHaveBeenCalledTimes(1);
    // The loss's still stays: the boss isn't back until a new fight.
    expect(still()).toBe(BOSS_CLIP.loss.still);
  });

  it('falls back when a video never starts', async () => {
    const controls = renderArt();
    playResult = () => new Promise(() => {});
    const onEnd = vi.fn();
    act(() => controls().play('victory', { onEnd }));
    await flush();
    await wait(VIDEO_START_MS - 1);
    expect(still()).toBeNull();
    await wait(1);
    expect(still()).toBe(BOSS_CLIP.victory.still);
    await wait(STILL_MS.victory);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('takes a video stuck part way as over', async () => {
    const controls = renderArt();
    const onEnd = vi.fn();
    act(() => controls().play('frown', { rate: 1, onEnd }));
    await flush();
    fireEvent.playing(video('frown'));
    await wait(4000 + VIDEO_OVERRUN_MS - 1);
    expect(onEnd).not.toHaveBeenCalled();
    await wait(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(front()).toBeNull();
    expect(still()).toBe(BOSS_FACE);
  });

  it('stops without moving on, and hides back to the ring', async () => {
    const controls = renderArt();
    const onEnd = vi.fn();
    act(() => controls().play('victory', { onEnd }));
    await flush();
    fireEvent.playing(video('victory'));
    act(() => controls().stop());
    fireEvent.ended(video('victory'));
    expect(onEnd).not.toHaveBeenCalled();
    const onHidden = vi.fn();
    act(() => controls().hide(onHidden));
    expect(up()).toBe(false);
    await wait(700);
    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('shows stills under reduced motion, each held a moment', async () => {
    const controls = renderArt(true);
    expect(document.querySelectorAll('video')).toHaveLength(0);
    const onEnd = vi.fn();
    act(() => controls().play('emerge', { onEnd }));
    expect(up()).toBe(true);
    expect(still()).toBe(BOSS_FACE);
    await wait(STILL_MS.emerge);
    expect(onEnd).toHaveBeenCalledTimes(1);
    // A reaction: its still for its time at its rate, then the face.
    act(() => controls().play('frown', { rate: 1.6, onEnd }));
    expect(still()).toBe(BOSS_CLIP.frown.still);
    await wait(2500);
    expect(still()).toBe(BOSS_FACE);
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(plays).toEqual([]);
  });
});
