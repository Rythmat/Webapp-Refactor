// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { installDomShims } from '@/daw/ui/__tests__/dom';

vi.mock('../MasterRow', () => ({
  MasterRow: () => <div data-testid="master-row" />,
}));

import { useStore } from '@/daw/store';
import { BottomRail } from '../BottomRail';

beforeAll(installDomShims);
beforeEach(() => useStore.setState(useStore.getInitialState(), true));
afterEach(cleanup);

describe('the bottom rail (the floating frame)', () => {
  it('has the dock views at the left, the views at the centre, the hint line right of them and no Learn', () => {
    render(<BottomRail />);
    expect(screen.getByRole('group', { name: 'Views' })).toBeInTheDocument();
    // Learn went (owner, 2026-10-21): the hover hints switch is the top
    // bar's.
    expect(screen.queryByRole('button', { name: 'Learn' })).toBeNull();
    expect(screen.queryByTestId('learn-pill')).toBeNull();
    // In that order, left to right: the rail's own zones as the DOM has them.
    const order = [
      ...screen
        .getByTestId('bottom-rail')
        .querySelectorAll(':scope > [data-zone]'),
    ].map((zone) => (zone as HTMLElement).dataset.zone);
    // The hint line sits right of the view tabs (owner, 2026-10-22).
    expect(order).toEqual(['editors', 'views', 'hint']);
    // Master is the track column's Master strip since 2026-10-21.
    expect(screen.queryByTestId('master-row')).toBeNull();
    expect(screen.getByRole('group', { name: 'Views' })).toHaveClass(
      'bg-daw-pill',
      'rounded-full',
    );
    for (const id of [
      'view-switch-arrange',
      'view-switch-studio',
      'view-switch-score',
    ]) {
      expect(
        document.querySelector(`[data-tutorial-id="${id}"]`),
      ).not.toBeNull();
    }
    // One Score tab for both layouts (2026-10-16).
    expect(screen.queryByRole('tab', { name: 'Lead sheet' })).toBeNull();
    expect(screen.queryByTestId('transport-play')).toBeNull();
  });

  it('marks only the open view as active, with its fill and its weight', () => {
    render(<BottomRail />);
    const create = screen.getByRole('tab', { name: 'Create' });
    expect(create).toHaveAttribute('aria-selected', 'true');
    expect(create).toHaveAttribute('data-state', 'active');
    expect(create).toHaveClass(
      'data-[state=active]:bg-daw-pill-on',
      'data-[state=active]:font-bold',
    );
    for (const name of ['Mix', 'Score']) {
      expect(screen.getByRole('tab', { name })).toHaveAttribute(
        'data-state',
        'inactive',
      );
    }
  });

  it('adds Practice first while a practice session exists', () => {
    act(() =>
      useStore.setState({ practiceSession: { kind: 'theory' } as never }),
    );
    render(<BottomRail />);
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs[0]).toBe('Practice');
  });
});
