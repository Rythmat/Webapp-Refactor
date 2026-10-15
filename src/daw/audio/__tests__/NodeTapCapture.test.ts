// ── NodeTapCapture.test.ts ─────────────────────────────────────────────────
// Verifies the Studio's node-tap capture builds the right analysers off its
// own tap of an existing node, hands peers that tap rather than the shared
// node, and — critically — that stop() cuts only its own tap (detaching every
// analyser and peer at once) and NEVER closes the shared AudioContext (which
// would tear down the DAW).

import { describe, it, expect } from 'vitest';
import { NodeTapCapture } from '../NodeTapCapture';
import {
  GUITAR_PITCH_PROFILE,
  BASS_PITCH_PROFILE,
} from '../instrumentPitchProfiles';

// ── Web Audio fakes ────────────────────────────────────────────────────────

/** A node that records its outgoing edges the way Web Audio keeps them. */
class FakeNode {
  outputs = new Set<FakeNode>();
  fullDisconnects = 0;
  connect(dest: FakeNode): void {
    this.outputs.add(dest);
  }
  disconnect(dest?: FakeNode): void {
    if (dest) {
      if (!this.outputs.has(dest)) throw new Error('InvalidAccessError');
      this.outputs.delete(dest);
      return;
    }
    this.fullDisconnects++;
    this.outputs.clear();
  }
}

class FakeAnalyser extends FakeNode {
  fftSize = 0;
  smoothingTimeConstant = 1;
  getFloatTimeDomainData(buf: Float32Array): void {
    buf.fill(0.5); // constant signal → nonzero RMS
  }
}

class FakeContext {
  closeCount = 0;
  analysers: FakeAnalyser[] = [];
  gains: FakeNode[] = [];
  createAnalyser(): FakeAnalyser {
    const a = new FakeAnalyser();
    this.analysers.push(a);
    return a;
  }
  createGain(): FakeNode {
    const g = new FakeNode();
    this.gains.push(g);
    return g;
  }
  close(): void {
    this.closeCount++;
  }
}

class FakeSourceNode extends FakeNode {
  constructor(public context: FakeContext) {
    super();
  }
}

function makeCapture(profile = GUITAR_PITCH_PROFILE) {
  const ctx = new FakeContext();
  const source = new FakeSourceNode(ctx);
  // The shared node's other listeners (the chord analyser, the amp chain).
  const otherListener = new FakeNode();
  source.connect(otherListener);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capture = new NodeTapCapture(source as any, profile);
  const [tap] = ctx.gains;
  return { ctx, source, capture, tap, otherListener };
}

describe('NodeTapCapture', () => {
  it('builds three analysers at the profile FFT sizes off its own tap', () => {
    const { ctx, source, capture, tap } = makeCapture(GUITAR_PITCH_PROFILE);

    expect(ctx.gains).toHaveLength(1);
    expect(source.outputs.has(tap)).toBe(true);
    // All three hang off the tap, not straight off the shared node.
    expect([...tap.outputs]).toEqual(ctx.analysers);
    expect(ctx.analysers.map((a) => a.fftSize)).toEqual([
      GUITAR_PITCH_PROFILE.onsetFftSize,
      GUITAR_PITCH_PROFILE.fastFftSize,
      GUITAR_PITCH_PROFILE.hiResFftSize,
    ]);
    for (const a of ctx.analysers) expect(source.outputs.has(a)).toBe(false);
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
    expect(ctx.analysers.map((a) => a.fftSize)).toEqual([512, 4096, 8192]);
  });

  it('exposes the shared context, and its own tap as the source for peers', () => {
    const { ctx, source, capture, tap } = makeCapture();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(capture.getAudioContext()).toBe(ctx as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(capture.getSourceNode()).toBe(tap as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(capture.getSourceNode()).not.toBe(source as any);
    expect(capture.isActive).toBe(true);
  });

  it('computes a nonzero RMS level from the onset analyser', () => {
    const { capture } = makeCapture();
    const level = capture.updateLevel();
    expect(level).toBeGreaterThan(0);
    expect(capture.getState().rmsLevel).toBe(level);
  });

  it('stop() cuts its tap but NEVER closes the context or other edges', () => {
    const { ctx, source, capture, tap, otherListener } = makeCapture();
    capture.stop();

    // The critical invariant: the shared DAW context is left untouched.
    expect(ctx.closeCount).toBe(0);

    // Only the source → tap edge is removed from the shared node.
    expect(source.outputs.has(tap)).toBe(false);
    expect(source.outputs.has(otherListener)).toBe(true);
    expect(source.fullDisconnects).toBe(0);
    // And the tap lets go of the analysers.
    expect(tap.outputs.size).toBe(0);

    // Capture is inert after stop.
    expect(capture.isActive).toBe(false);
    expect(capture.getSourceNode()).toBeNull();
    expect(capture.getOnsetAnalyser()).toBeNull();
    expect(capture.updateLevel()).toBe(0);
  });

  it('detaches a peer that only disconnects its own outputs (audio-analysis-20)', () => {
    const { source, capture } = makeCapture();
    // BasicPitchPeer: sourceNode.connect(worklet), and on stop only
    // worklet.disconnect() — its outputs.
    const worklet = new FakeNode();
    const peerSource = capture.getSourceNode() as unknown as FakeNode;
    peerSource.connect(worklet);
    worklet.disconnect();

    capture.stop();

    // Nothing reachable from the live node feeds the stale worklet any more.
    const reachable = new Set<FakeNode>();
    const walk = (n: FakeNode) => {
      for (const out of n.outputs) {
        if (reachable.has(out)) continue;
        reachable.add(out);
        walk(out);
      }
    };
    walk(source);
    expect(reachable.has(worklet)).toBe(false);
  });

  it('stop() twice is harmless', () => {
    const { capture } = makeCapture();
    capture.stop();
    expect(() => capture.stop()).not.toThrow();
  });
});
