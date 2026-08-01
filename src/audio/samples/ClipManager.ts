// ── ClipManager ──────────────────────────────────────────────────────────────
// Named, prerecorded audio: narration, sound effects, stingers, demonstration
// recordings, backing tracks.
//
// Callers name a clip and ask for playback. They never learn whether it has
// been fetched, decoded, or is already playing — that is precisely the
// knowledge that used to be scattered across pages as ad-hoc `new Audio()`
// calls and per-feature buffer caches.

import { mixer } from '../core/Mixer';
import { sampleManager } from './SampleManager';

export interface PlayClipOptions {
  /** Per-playback level (0–1). Multiplies the clip bus level. */
  gain?: number;
  /** Playback rate (1 = normal). */
  rate?: number;
  /** Context time to start at. Defaults to immediately. */
  when?: number;
  /** Loop until stopped. */
  loop?: boolean;
  /**
   * If the clip isn't decoded yet, load it and play when ready instead of
   * no-oping. This is the behaviour an <audio> element gives you, and it's what
   * one-shot narration and jingles want — they fire once, seconds apart, and
   * being late is far better than being silent. Leave it off on hot paths (UI
   * clicks, note triggers) where a delayed sound is worse than none.
   */
  waitForLoad?: boolean;
}

/** Ownership of one playing clip — the caller stops what it started. */
export interface ClipHandle {
  readonly id: string;
  stop(): void;
}

class ClipManager {
  private urls = new Map<string, string>();
  /** Sources currently sounding, per clip id, so `stop(id)` is exact. */
  private active = new Map<string, Set<AudioBufferSourceNode>>();
  private bus: GainNode | null = null;

  /** Give a clip a stable id. Ids are the app's vocabulary; URLs are detail. */
  register(id: string, url: string): void {
    this.urls.set(id, url);
  }

  registerAll(clips: Record<string, string>): void {
    for (const [id, url] of Object.entries(clips)) this.register(id, url);
  }

  /** Decode clips ahead of time so the first play is instant. */
  async preload(ids?: readonly string[]): Promise<void> {
    const targets = ids ?? Array.from(this.urls.keys());
    const urls = targets
      .map((id) => this.urls.get(id))
      .filter((url): url is string => url != null);
    await sampleManager.preload(urls);
  }

  /** Whether a clip can start sounding this instant. */
  isReady(id: string): boolean {
    const url = this.urls.get(id);
    return url != null && sampleManager.isReady(url);
  }

  /**
   * Play a clip. Returns null when the clip is unknown, or not yet decoded — in
   * which case the load is kicked off so the next call succeeds. Deliberately
   * synchronous and non-blocking: callers are usually inside a click handler,
   * and an `await` there is how you get audio that fires a second late.
   */
  play(id: string, opts: PlayClipOptions = {}): ClipHandle | null {
    const url = this.urls.get(id);
    if (!url) {
      console.warn(`[ClipManager] unknown clip "${id}"`);
      return null;
    }

    const buffer = sampleManager.peek(url);
    if (!buffer) {
      const load = sampleManager.load(url).catch(() => null);
      if (!opts.waitForLoad) return null;

      // Deferred start. The handle cancels it, so a caller that stops or
      // unmounts before the download finishes never hears a late sound.
      let cancelled = false;
      let started: ClipHandle | null = null;
      void load.then((loaded) => {
        if (cancelled || !loaded) return;
        started = this.play(id, { ...opts, waitForLoad: false });
      });
      return {
        id,
        stop: () => {
          cancelled = true;
          started?.stop();
        },
      };
    }

    if (!this.bus) this.bus = mixer.bus('clips');
    const ctx = this.bus.context;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? false;
    if (opts.rate != null) source.playbackRate.value = opts.rate;

    // Only spend a gain node when the caller actually wants attenuation.
    let output: AudioNode = this.bus;
    let clipGain: GainNode | null = null;
    if (opts.gain != null && opts.gain !== 1) {
      clipGain = ctx.createGain();
      clipGain.gain.value = Math.max(0, Math.min(1, opts.gain));
      clipGain.connect(this.bus);
      output = clipGain;
    }
    source.connect(output);

    let sounding = this.active.get(id);
    if (!sounding) {
      sounding = new Set();
      this.active.set(id, sounding);
    }
    sounding.add(source);

    const cleanup = () => {
      sounding!.delete(source);
      source.disconnect();
      clipGain?.disconnect();
    };
    source.onended = cleanup;
    source.start(opts.when ?? 0);

    return {
      id,
      stop: () => {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        cleanup();
      },
    };
  }

  /**
   * Play a clip identified by URL, registering it on the fly. The escape hatch
   * for dynamically-sourced audio (CMS lesson recordings, user uploads) whose
   * ids aren't known at build time. Prefer `register` + `play` for the app's
   * own fixed clips so callers deal in names, not paths.
   */
  playUrl(url: string, opts?: PlayClipOptions): ClipHandle | null {
    if (!this.urls.has(url)) this.register(url, url);
    return this.play(url, opts);
  }

  /** Stop every instance of one clip. */
  stop(id: string): void {
    const sounding = this.active.get(id);
    if (!sounding) return;
    for (const source of Array.from(sounding)) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    sounding.clear();
  }

  /** Stop all clips (route change, panic, muting narration). */
  stopAll(): void {
    for (const id of Array.from(this.active.keys())) this.stop(id);
  }

  /** Level for all clips (0–1). */
  setVolume(volume: number): void {
    mixer.setBusVolume('clips', volume);
  }
}

export const clipManager = new ClipManager();
