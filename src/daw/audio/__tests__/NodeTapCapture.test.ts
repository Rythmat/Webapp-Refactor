// ── NodeTapCapture.test.ts ─────────────────────────────────────────────────
// Verifies the Studio's node-tap capture builds the right analysers off an
// existing node and — critically — that stop() disconnects only its own edges
// and NEVER closes the shared AudioContext (which would tear down the DAW).

import { describe, it, expect } from 'vitest';
import { NodeTapCapture } from '../NodeTapCapture';
import {
  GUITAR_PITCH_PROFILE,
  BASS_PITCH_PROFILE,
} from '../instrumentPitchProfiles';

// ── Web Audio fakes ────────────────────────────────────────────────────────

class FakeAnalyser {
  fftSize = 0;
  smoothingTimeConstant = 1;
  disconnectCount = 0;
  getFloatTimeDomainData(buf: Float32Array): void {
    buf.fill(0.5); // constant signal → nonzero RMS
  }
  disconnect(): void {
    this.disconnectCount++;
  }
}

class FakeContext {
  closeCount = 0;
  created: FakeAnalyser[] = [];
  createAnalyser(): FakeAnalyser {
    const a = new FakeAnalyser();
    this.created.push(a);
    return a;
  }
  close(): void {
    this.closeCount++;
  }
}

class FakeSourceNode {
  context: FakeContext;
  connected: FakeAnalyser[] = [];
  disconnected: FakeAnalyser[] = [];
  constructor(ctx: FakeContext) {
    this.context = ctx;
  }
  connect(dest: FakeAnalyser): void {
    this.connected.push(dest);
  }
  disconnect(dest: FakeAnalyser): void {
    this.disconnected.push(dest);
  }
}

function makeCapture(profile = GUITAR_PITCH_PROFILE) {
  const ctx = new FakeContext();
  const source = new FakeSourceNode(ctx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capture = new NodeTapCapture(source as any, profile);
  return { ctx, source, capture };
}

describe('NodeTapCapture', () => {
  it('builds three analysers at the profile FFT sizes and connects them', () => {
    const { ctx, source, capture } = makeCapture(GUITAR_PITCH_PROFILE);

    expect(ctx.created).toHaveLength(3);
    const sizes = ctx.created.map((a) => a.fftSize);
    expect(sizes).toEqual([
      GUITAR_PITCH_PROFILE.onsetFftSize,
      GUITAR_PITCH_PROFILE.fastFftSize,
      GUITAR_PITCH_PROFILE.hiResFftSize,
    ]);
    // All three tapped off the shared source node.
    expect(source.connected).toHaveLength(3);
    expect(capture.getOnsetAnalyser()?.fftSize).toBe(
      GUITAR_PITCH_PROFILE.onsetFftSize,
    );
    expect(capture.getFastPitchAnalyser()?.fftSize).toBe(
      GUITAR_PITCH_PROFILE.fastFftSize,
    );
    expect(capture.getHiResAnalyser()?.fftSize).toBe(
      GUITAR_PITCH_PROFILE.hiResFftSize,
    );
  });

  it('uses larger analysers for bass', () => {
    const { ctx } = makeCapture(BASS_PITCH_PROFILE);
    // Bass fast path is 4096 (resolves low-B); hi-res is 8192 (171ms window —
    // shrunk from 16384 in the perf pass, since YIN reach is bounded by minFreq,
    // not FFT size).
    expect(ctx.created.map((a) => a.fftSize)).toEqual([512, 4096, 8192]);
  });

  it('exposes the shared context and source node while active', () => {
    const { ctx, source, capture } = makeCapture();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(capture.getAudioContext()).toBe(ctx as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(capture.getSourceNode()).toBe(source as any);
    expect(capture.isActive).toBe(true);
  });

  it('computes a nonzero RMS level from the onset analyser', () => {
    const { capture } = makeCapture();
    const level = capture.updateLevel();
    expect(level).toBeGreaterThan(0);
    expect(capture.getState().rmsLevel).toBe(level);
  });

  it('stop() disconnects its analysers but NEVER closes the context', () => {
    const { ctx, source, capture } = makeCapture();
    capture.stop();

    // The critical invariant: the shared DAW context is left untouched.
    expect(ctx.closeCount).toBe(0);

    // Each analyser edge is removed selectively from the source node.
    expect(source.disconnected).toHaveLength(3);
    for (const a of ctx.created) {
      expect(a.disconnectCount).toBe(1);
    }

    // Capture is inert after stop.
    expect(capture.isActive).toBe(false);
    expect(capture.getSourceNode()).toBeNull();
    expect(capture.getOnsetAnalyser()).toBeNull();
    expect(capture.updateLevel()).toBe(0);
  });
});
