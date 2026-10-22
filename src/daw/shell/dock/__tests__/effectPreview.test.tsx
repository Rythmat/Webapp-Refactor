// @vitest-environment jsdom
/**
 * The Add effect picker's device previews (after Suno's plugin cards): the
 * effect's real dock card, small and inert, with no lesson anchor of its
 * own; hovering plays a demo of its main control that starts and ends at
 * the effect's defaults and never touches the store.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_EFFECTS, type EffectSlotType } from '@/daw/audio/EffectChain';
import { resolveAnchor } from '@/daw/components/Tutorial/anchorRegistry';
import { useStore } from '@/daw/store';
import { demoEffects, previewEffects, swing } from '../effectDemo';
import { EffectPreview } from '../EffectPreview';

const SLOTS = Object.keys(DEFAULT_EFFECTS) as EffectSlotType[];

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('the demo', () => {
  it('starts and ends at the defaults, for every effect', () => {
    for (const slot of SLOTS) {
      const base = previewEffects(slot);
      expect(base[slot]!.enabled).toBe(true);
      expect(demoEffects(slot, base, 0)).toEqual(base);
      expect(swing(1)).toBeCloseTo(0);
    }
  });

  it('moves each effect’s main control halfway through', () => {
    for (const slot of SLOTS) {
      const base = previewEffects(slot);
      const mid = demoEffects(slot, base, slot === 'eq' ? 0.25 : 0.5);
      expect(mid[slot], slot).not.toEqual(base[slot]);
      // Only its own slot moves.
      for (const other of SLOTS) {
        if (other !== slot) expect(mid[other]).toBe(base[other]);
      }
    }
  });

  it('keeps readouts short: values land on the knobs’ steps', () => {
    const mid = demoEffects('compressor', previewEffects('compressor'), 0.37);
    expect(Number.isInteger(mid.compressor.threshold)).toBe(true);
    expect(String(mid.compressor.ratio).length).toBeLessThanOrEqual(4);
  });
});

describe('the preview', () => {
  it('draws the real device, inert and hidden from screen readers', () => {
    const { container } = render(
      <EffectPreview type="delay" playing={false} />,
    );
    const win = container.querySelector('[data-fx-preview]')!;
    expect(win.getAttribute('aria-hidden')).toBe('true');
    expect(win.hasAttribute('inert')).toBe(true);
    expect(win.querySelector('[data-fx-card="delay"]')).not.toBeNull();
    // No Remove, and none of the dock's ids.
    expect(win.querySelector('[data-testid^="fx-remove-"]')).toBeNull();
    expect(win.querySelector('[data-testid="fx-cards"]')).toBeNull();
  });

  it('is never a lesson target', () => {
    render(<EffectPreview type="ducker" playing={false} />);
    expect(
      document.querySelector('[data-tutorial-id="ducker-key-select"]'),
    ).not.toBeNull();
    expect(resolveAnchor('ducker-key-select')).toBeNull();
  });

  it('leaves the store alone', () => {
    const before = useStore.getState().tracks;
    render(<EffectPreview type="eq" playing />);
    expect(useStore.getState().tracks).toBe(before);
  });
});
