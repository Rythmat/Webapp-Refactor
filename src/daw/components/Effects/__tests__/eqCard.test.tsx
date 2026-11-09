// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EFFECTS,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import { FxCardRow } from '../FxCards';

// ── The EQ card (owner, 2026-10-22) ────────────────────────────────────────
// Every EQ is Master's: its graph to the card's edges, no knobs beside it,
// and Expand, which opens it large over its knobs. Run:
// npx vitest run src/daw/components/Effects/__tests__/eqCard.test.tsx

afterEach(cleanup);

function renderEq() {
  const effects: TrackEffectState = structuredClone(DEFAULT_EFFECTS);
  effects.eq.enabled = true;
  const onUpdate = vi.fn();
  render(
    <FxCardRow
      fxId="track-1"
      chain={['eq']}
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
  return { onUpdate };
}

describe('the EQ card', () => {
  it('is its graph alone, its knobs a click away in Expand', () => {
    renderEq();
    const card = screen.getByTestId('fx-card-eq');
    // No knobs on the card itself.
    expect(within(card).queryByText('FREQ')).toBeNull();
    expect(
      within(card).queryByRole('radiogroup', { name: 'EQ band' }),
    ).toBeNull();
    expect(screen.queryByTestId('fx-show-all-eq')).toBeNull();

    fireEvent.click(
      within(card).getByRole('button', { name: 'Expand the EQ' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'EQ' });
    for (const knob of ['FREQ', 'GAIN', 'Q', 'MAKEUP']) {
      expect(dialog).toHaveTextContent(knob);
    }
    expect(within(dialog).getAllByRole('radio')).toHaveLength(8);
  });

  it('shows the knobs of the band whose node is pressed on the graph', () => {
    // jsdom has no pointer capture.
    Element.prototype.setPointerCapture ??= vi.fn();
    renderEq();
    fireEvent.click(screen.getByRole('button', { name: 'Expand the EQ' }));
    const dialog = screen.getByRole('dialog', { name: 'EQ' });
    expect(
      within(dialog).getByRole('radio', { name: 'Band 1' }),
    ).toHaveAttribute('aria-checked', 'true');
    // The band nodes are the graph's grab handles, band 1 first.
    const nodes = dialog.querySelectorAll('circle[style*="grab"]');
    expect(nodes).toHaveLength(8);
    fireEvent.pointerDown(nodes[2], { pointerId: 1 });
    expect(
      within(dialog).getByRole('radio', { name: 'Band 3' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      within(dialog).getByRole('radio', { name: 'Band 1' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('switches off from the expanded view', () => {
    const { onUpdate } = renderEq();
    fireEvent.click(screen.getByRole('button', { name: 'Expand the EQ' }));
    const dialog = screen.getByRole('dialog', { name: 'EQ' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'EQ on' }));
    expect(onUpdate).toHaveBeenLastCalledWith({
      eq: expect.objectContaining({ enabled: false }),
    });
  });
});
