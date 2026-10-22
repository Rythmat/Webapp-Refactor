// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
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
  it('has Master at the left, the views at the centre and Learn at the right', () => {
    render(<BottomRail />);
    for (const name of ['Master', 'Views', 'Learn']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    // In that order, left to right: the rail's own zones as the DOM has them.
    const order = [
      ...screen
        .getByTestId('bottom-rail')
        .querySelectorAll(':scope > [data-zone]'),
    ].map((zone) => (zone as HTMLElement).dataset.zone);
    expect(order).toEqual(['master', 'views', 'learn']);
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

  it('turns the hover hints on and off from Learn, white while on', () => {
    act(() => useStore.getState().setHoverHints(false));
    render(<BottomRail />);
    const learn = screen.getByRole('button', { name: 'Learn' });
    expect(learn).toHaveAttribute('aria-pressed', 'false');
    expect(learn).toHaveAttribute('data-variant', 'pill');
    fireEvent.click(learn);
    expect(useStore.getState().hoverHints).toBe(true);
    expect(learn).toHaveAttribute('aria-pressed', 'true');
    expect(learn).toHaveAttribute('data-variant', 'primary');
  });
});
