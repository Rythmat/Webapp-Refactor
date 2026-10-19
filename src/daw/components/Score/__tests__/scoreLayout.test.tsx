// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── One Score page, two layouts (owner, 2026-10-16) ────────────────────────
// The top bar has one Score tab, on for either view; the page's switch picks
// Full score or Lead sheet and carries the Lead sheet's lesson anchor; the
// tab opens the layout last shown. The view ids stay 'score' and
// 'leadsheet'.
//
// Run: npx vitest run src/daw/components/Score/__tests__/scoreLayout.test.tsx

vi.mock('@/daw/shell/lazyParts', () => ({ preloadView: vi.fn() }));

import { useStore } from '@/daw/store';
import { ViewTabs } from '@/daw/shell/topbar/ViewTabs';
import { ScoreLayoutSwitch } from '../ScoreLayoutSwitch';

const view = () => useStore.getState().currentView;
const tab = (name: string) => screen.getByRole('tab', { name });
const pick = (name: string) => fireEvent.mouseDown(tab(name), { button: 0 });

function Page() {
  return (
    <>
      <ViewTabs />
      <ScoreLayoutSwitch />
    </>
  );
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('the Score page', () => {
  it('has one Score tab, on for both layouts', () => {
    render(<Page />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Create',
      'Mix',
      'Score',
    ]);
    pick('Score');
    expect(view()).toBe('score');
    fireEvent.click(screen.getByRole('radio', { name: 'Lead sheet' }));
    expect(view()).toBe('leadsheet');
    expect(tab('Score')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: 'Lead sheet' })).toHaveAttribute(
      'data-tutorial-id',
      'view-switch-leadsheet',
    );
  });

  it('opens the layout last shown', () => {
    render(<Page />);
    act(() => useStore.getState().setCurrentView('leadsheet'));
    pick('Create');
    expect(view()).toBe('arrange');
    pick('Score');
    expect(view()).toBe('leadsheet');
    fireEvent.click(screen.getByRole('radio', { name: 'Full score' }));
    pick('Mix');
    pick('Score');
    expect(view()).toBe('score');
  });
});
