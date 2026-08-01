// ── AudioContextOwner ────────────────────────────────────────────────────────
// The single owner of the application's AudioContext.
//
// Nothing else in the app (outside the DAW, which migrates last) may call
// `new AudioContext()`. One context means: one hardware output stream, one
// sample rate — so a buffer decoded anywhere plays at the right pitch
// everywhere — and a graph that survives navigation because it lives outside
// React entirely.
//
// The context is created lazily on first use, never at module load, so a
// visitor who never triggers audio never opens an output stream.

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

class AudioContextOwner {
  private ctx: AudioContext | null = null;
  /**
   * True only while the context is suspended *by us* (the idle policy). The
   * watchdog below must not fight our own suspension — without this flag the
   * two would ping-pong resume/suspend forever.
   */
  private idleSuspended = false;

  /** The shared context, created on first call. */
  get(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as WindowWithWebkitAudio).webkitAudioContext!;
      // 'interactive' asks the browser for the smallest output buffer it can
      // sustain — the difference between a responsive and a sluggish MIDI
      // keyboard. The default ('balanced') trades latency for power.
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.ctx.onstatechange = this.handleStateChange;
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.handleVisibility);
      }
    }
    return this.ctx;
  }

  /** The context if it exists, without creating one. */
  peek(): AudioContext | null {
    return this.ctx;
  }

  /** Whether audio can actually be heard right now. */
  isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Whether the context is suspended because the app went idle. */
  isIdleSuspended(): boolean {
    return this.idleSuspended;
  }

  /**
   * Lift any suspension — autoplay-policy or idle. Fire-and-forget by design:
   * before a page has user activation the browser leaves `resume()` pending
   * indefinitely, so awaiting it would stall the caller. Safe to call from
   * every gesture; a no-op when already running.
   */
  resume(): void {
    this.idleSuspended = false;
    const ctx = this.ctx;
    if (ctx && ctx.state !== 'running') {
      void ctx.resume().catch(() => {
        /* still blocked — the next gesture will try again */
      });
    }
  }

  /**
   * Suspend because nothing has played for a while. Distinct from an
   * unintended suspension so the watchdog leaves it alone.
   */
  suspendForIdle(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    this.idleSuspended = true;
    void ctx.suspend().catch(() => {
      this.idleSuspended = false;
    });
  }

  /**
   * Recover from suspensions the app did not ask for — OS sleep, tab
   * throttling, and iOS 'interrupted' (a phone call, another app taking audio,
   * a Bluetooth route change). These freeze the clock and silence everything
   * with no recovery short of a reload.
   */
  private handleStateChange = (): void => {
    if (this.idleSuspended) return;
    const ctx = this.ctx;
    if (ctx && ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
    }
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible') this.resume();
  };

  /**
   * Tear down the context. Only for application unload and tests — never on
   * navigation. The whole point of this class is that it outlives routes.
   */
  dispose(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.idleSuspended = false;
  }
}

export const audioContextOwner = new AudioContextOwner();
