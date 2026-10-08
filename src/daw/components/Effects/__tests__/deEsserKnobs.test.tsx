// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';

// ── The de-esser shows only the knobs its audio uses ───────────────────────
// Its band filter is created and tuned but never connected (EffectChain), so
// FREQUENCY changed nothing: the compressor hears the whole vocal. The knob is
// hidden until the filter is wired (audio-core-13).

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => null,
}));
vi.mock('@/daw/audio/reverbIR', () => ({
  getReverbManifest: () => Promise.resolve(new Map()),
  getReverbIrMeta: () => undefined,
}));

import { FxKnobs } from '../EffectsPanel';

afterEach(cleanup);

describe('De-esser knobs', () => {
  it('has Amount and Range, and no Frequency', () => {
    render(
      <FxKnobs
        trackId="vox"
        slot="de-esser"
        effects={DEFAULT_EFFECTS}
        onUpdate={vi.fn()}
        color="#ffffff"
      />,
    );
    expect(screen.getByText('AMOUNT')).toBeInTheDocument();
    expect(screen.getByText('RANGE')).toBeInTheDocument();
    expect(screen.queryByText('FREQUENCY')).toBeNull();
  });

  it('keeps the Presence frequency, which its filter does use', () => {
    render(
      <FxKnobs
        trackId="vox"
        slot="presence"
        effects={DEFAULT_EFFECTS}
        onUpdate={vi.fn()}
        color="#ffffff"
      />,
    );
    expect(screen.getByText('FREQUENCY')).toBeInTheDocument();
  });
});
