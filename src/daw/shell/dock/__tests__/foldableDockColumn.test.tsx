// @vitest-environment jsdom
/**
 * The dock's side panels fold to a rail (FoldableDockColumn, dockSidePanels):
 * the sound menu and the Tuner each fold and open on their own, stay
 * mounted while folded, and are remembered on this device.
 *
 * Run: npx vitest run src/daw/shell/dock/__tests__/foldableDockColumn.test.tsx
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDockSidePanels } from '../dockSidePanels';
import { FoldableDockColumn, RAIL_PX } from '../FoldableDockColumn';

afterEach(() => {
  cleanup();
  useDockSidePanels.getState().setFolded('sounds', false);
  useDockSidePanels.getState().setFolded('tuner', false);
});

const column = (panel: 'sounds' | 'tuner', name: string) => (
  <FoldableDockColumn panel={panel} name={name} width={340} testId={panel}>
    <p>{name} inside</p>
  </FoldableDockColumn>
);

describe('FoldableDockColumn', () => {
  it('folds to a rail and opens again, keeping its content mounted', () => {
    render(column('sounds', 'Sounds'));
    const col = screen.getByTestId('sounds');
    expect(col.style.width).toBe('340px');
    fireEvent.click(screen.getByRole('button', { name: 'Hide sounds' }));
    expect(col.style.width).toBe(`${RAIL_PX}px`);
    // Still there, out of sight.
    expect(screen.getByText('Sounds inside').parentElement?.className).toMatch(
      /\bhidden\b/,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show sounds' }));
    expect(col.style.width).toBe('340px');
  });

  it('folds the menu and the tuner apart, and remembers them', () => {
    render(
      <>
        {column('sounds', 'Sounds')}
        {column('tuner', 'Tuner')}
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide tuner' }));
    expect(screen.getByTestId('tuner').dataset.folded).toBe('true');
    expect(screen.getByTestId('sounds').dataset.folded).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem('ma.studio.dockPanelsFolded') ?? '{}'),
    ).toEqual({ sounds: false, tuner: true });
  });
});
