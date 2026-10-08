import { describe, expect, it } from 'vitest';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { masteringEffectsForEngine } from '../masteringSlice';

// ── Mastering Bypass reaches the engine (fx-mixer-02) ─────────────────────
// Bypass only changed a label's colour. Now playback and the bounce run the
// chain with every slot off while it is on; the stored chain is untouched.

function chain() {
  const fx = structuredClone(DEFAULT_EFFECTS);
  fx.compressor = { ...fx.compressor, enabled: true, ratio: 6 };
  fx.eq = { ...fx.eq, enabled: true };
  fx.multiband = { ...fx.multiband, enabled: true, depth: 0.7 };
  return fx;
}

describe('masteringEffectsForEngine', () => {
  it('hands the stored chain over as is when Bypass is off', () => {
    const fx = chain();
    expect(masteringEffectsForEngine(fx, false)).toBe(fx);
  });

  it('switches every slot off when Bypass is on, keeping its settings', () => {
    const fx = chain();
    const engine = masteringEffectsForEngine(fx, true);
    for (const [slot, params] of Object.entries(engine)) {
      expect(params.enabled, slot).toBe(false);
    }
    expect(engine.compressor.ratio).toBe(6);
    expect(engine.multiband.depth).toBe(0.7);
  });

  it('leaves the stored chain (saves, undo, collab) untouched', () => {
    const fx = chain();
    const before = structuredClone(fx);
    masteringEffectsForEngine(fx, true);
    expect(fx).toEqual(before);
  });
});
