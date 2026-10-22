// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EFFECTS,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import { EFFECT_CATEGORIES } from '@/daw/data/effectCategories';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { FxCardRow } from '../FxCards';

// ── The guitar pedals as effect cards (owner, 2026-10-22) ──────────────────
// The picker offers them (Overdrive and Amp under Distortion; Chorus,
// Phaser, Flanger and Wah under Modulation), and each card is its knobs.
// Run: npx vitest run src/daw/components/Effects/__tests__/pedalCards.test.tsx

afterEach(cleanup);

describe('the pedal effects in the picker', () => {
  it('sit with the effects that do the same job, Pitch Correction left out', () => {
    const effectsOf = (id: string) =>
      EFFECT_CATEGORIES.find((c) => c.id === id)!.effects;
    expect(effectsOf('distortion')).toEqual(
      expect.arrayContaining(['overdrive', 'amp']),
    );
    expect(effectsOf('modulation')).toEqual([
      'chorus',
      'phaser',
      'flanger',
      'wah',
    ]);
    const all = EFFECT_CATEGORIES.flatMap((c) => c.effects) as string[];
    expect(all).not.toContain('pitch-correction');
    expect(FX_LABEL.overdrive).toBe('Overdrive');
    expect(FX_LABEL.wah).toBe('Wah');
  });
});

describe('a pedal’s card', () => {
  it('is its knobs, at their defaults before the pedal is saved', () => {
    // A rack that just added the chorus: its slot only says it is on.
    const effects = {
      ...structuredClone(DEFAULT_EFFECTS),
      chorus: { enabled: true },
    } as TrackEffectState;
    const onUpdate = vi.fn();
    render(
      <FxCardRow
        fxId="track-1"
        chain={['chorus']}
        effects={effects}
        onUpdate={onUpdate}
        onPreview={vi.fn()}
        onRemove={vi.fn()}
        meterTarget={null}
        shown={null}
        onShow={vi.fn()}
        addSlot={null}
      />,
    );
    const card = screen.getByTestId('fx-card-chorus');
    expect(card).toHaveAccessibleName('Chorus');
    for (const knob of ['RATE', 'DEPTH', 'MIX']) {
      expect(card).toHaveTextContent(knob);
    }
    // Each knob reads in what it means: the rate in Hz, the rest in %.
    expect(card).toHaveTextContent('2.5 Hz');
    expect(card).toHaveTextContent('50%');
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
