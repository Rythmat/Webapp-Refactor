// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EffectSlotType } from '@/daw/audio/EffectChain';

// ── The FX list is click-to-add, and says when the rack is full ────────────
// Rows were draggable, but nothing accepts a dropped effect, so a drag only
// bounced back; and at five effects the rows just faded (fx-mixer-19).

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => null,
}));

import { FxBrowser } from '../FxBrowser';

afterEach(cleanup);

const row = (type: EffectSlotType) =>
  document.querySelector(`[data-tutorial-id="fx-add-${type}"]`) as HTMLElement;

function renderBrowser(activeEffects: EffectSlotType[]) {
  const onAddEffect = vi.fn();
  render(
    <FxBrowser
      trackId="keys"
      activeEffects={activeEffects}
      onAddEffect={onAddEffect}
      hideMidi
    />,
  );
  return onAddEffect;
}

describe('FxBrowser', () => {
  it('adds an effect on click, and no row can be dragged', () => {
    const onAddEffect = renderBrowser([]);
    const rows = document.querySelectorAll('[data-tutorial-id^="fx-add-"]');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r).not.toHaveAttribute('draggable');

    fireEvent.click(row('delay'));
    expect(onAddEffect).toHaveBeenCalledWith('keys', 'delay');
  });

  it('shows how many of the five slots are used', () => {
    renderBrowser(['eq', 'compressor']);
    expect(screen.getByTitle('2 of 5 effects')).toHaveTextContent('2/5');
    // The status is there, empty, until the rack is full.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('says the rack is full in a status that was already on the page', () => {
    // A status that arrives holding its text is often not announced; this
    // one is there from the start and its text changes.
    const four: EffectSlotType[] = ['eq', 'compressor', 'reverb', 'delay'];
    const props = { trackId: 'keys', onAddEffect: vi.fn(), hideMidi: true };
    const { rerender } = render(<FxBrowser {...props} activeEffects={four} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(<FxBrowser {...props} activeEffects={[...four, 'saturator']} />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(
      'Max 5 effects. Remove one to add another.',
    );
  });

  it('says the rack is full at five effects, and adds nothing more', () => {
    const full: EffectSlotType[] = [
      'eq',
      'compressor',
      'reverb',
      'delay',
      'saturator',
    ];
    const onAddEffect = renderBrowser(full);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Max 5 effects. Remove one to add another.',
    );
    expect(screen.getByTitle('5 of 5 effects')).toHaveTextContent('5/5');
    expect(row('gate').style.opacity).toBe('0.4');

    fireEvent.click(row('gate'));
    expect(onAddEffect).not.toHaveBeenCalled();
  });

  it('keeps every lesson anchor on its row', () => {
    renderBrowser([]);
    for (const type of [
      'compressor',
      'reverb',
      'delay',
      'saturator',
      'multiband',
      'ducker',
    ] as const) {
      expect(row(type)).toBeInTheDocument();
    }
  });
});
