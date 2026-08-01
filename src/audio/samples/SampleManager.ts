// ── SampleManager ────────────────────────────────────────────────────────────
// One decoded AudioBuffer per URL, for the lifetime of the application.
//
// Before this, each feature fetched and decoded its own copy, sometimes on its
// own AudioContext — which also meant `decodeAudioData` resampled to *that*
// context's rate, so a buffer decoded at 48 kHz and played back at 44.1 kHz was
// silently pitched and time-stretched. Decoding on the one shared context
// removes that whole bug class.

import { audioContextOwner } from '../core/AudioContextOwner';

class SampleManager {
  /**
   * In-flight and completed loads, keyed by URL. Caching the *promise* rather
   * than the buffer is what makes concurrent callers share a single fetch and
   * decode instead of racing.
   */
  private loads = new Map<string, Promise<AudioBuffer>>();
  /** Resolved buffers, for synchronous access on playback hot paths. */
  private decoded = new Map<string, AudioBuffer>();

  /** Fetch + decode a sample, or hand back the existing load. */
  load(url: string): Promise<AudioBuffer> {
    const existing = this.loads.get(url);
    if (existing) return existing;

    const load = this.fetchAndDecode(url);
    this.loads.set(url, load);
    load.then(
      (buffer) => this.decoded.set(url, buffer),
      // Drop the failed entry so a later attempt can retry rather than
      // replaying the rejection forever.
      () => this.loads.delete(url),
    );
    return load;
  }

  /**
   * The buffer if it is already decoded, without starting a load. Callers on a
   * synchronous path (a UI click, a live note) use this and degrade to silence
   * rather than awaiting.
   */
  peek(url: string): AudioBuffer | undefined {
    return this.decoded.get(url);
  }

  /** Warm several samples at once. Individual failures don't reject. */
  async preload(urls: readonly string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.load(url).catch(() => null)));
  }

  /** Whether a sample is decoded and ready to play. */
  isReady(url: string): boolean {
    return this.decoded.has(url);
  }

  /** Release a cached buffer (for future memory-pressure handling). */
  evict(url: string): void {
    this.loads.delete(url);
    this.decoded.delete(url);
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[SampleManager] ${response.status} fetching ${url}`);
    }
    const bytes = await response.arrayBuffer();
    return audioContextOwner.get().decodeAudioData(bytes);
  }
}

export const sampleManager = new SampleManager();
