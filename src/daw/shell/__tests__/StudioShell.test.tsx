// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The shell's regions (milestones 2.4, B4a) ──────────────────────────────
// Laid out once, outside the view switch: the Inspector is mounted once
// across Create → Mix → Score → Lead sheet → Create, the dock is Create's,
// the rails are every view's, and the practice screen hides the top bar,
// the rails and the Inspector without unmounting them.
//
// Run: npx vitest run src/daw/shell/__tests__/StudioShell.test.tsx

const { stub } = vi.hoisted(() => ({
  stub: (id: string) =>
    function Stub() {
      return <div data-testid={id} />;
    },
}));
vi.mock('../topbar/TopBar', () => ({ TopBar: stub('top-bar') }));
vi.mock('../bottombar/BottomRail', () => ({ BottomRail: stub('bottom-rail') }));
vi.mock('@/daw/shell/tracklist/TrackArea', () => ({
  TrackArea: stub('timeline'),
}));
vi.mock('../dock/Dock', () => ({
  Dock: stub('channel-strip'),
}));
vi.mock('@/daw/shell/inspector/InspectorPanel', () => ({
  InspectorPanel: stub('library-panel'),
}));
vi.mock('../lazyParts', () => ({
  StudioViewPart: stub('mix-view'),
  ScoreViewPart: stub('score-view'),
  LeadSheetViewPart: stub('leadsheet-view'),
  PracticeTrackViewPart: stub('practice-view'),
}));

import { useStore, type ViewType } from '@/daw/store';
import { StudioShell } from '../StudioShell';

const q = (sel: string) => document.querySelector(sel);

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('StudioShell', () => {
  it('keeps one Inspector across every view, the dock in Create and the rack in Mix', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    const mountId = q('[data-region="inspector"]')?.getAttribute(
      'data-mount-id',
    );
    expect(mountId).toBeTruthy();
    const seen: Array<[ViewType, string | null | undefined, boolean]> = [];
    for (const view of [
      'studio',
      'score',
      'leadsheet',
      'arrange',
    ] as ViewType[]) {
      act(() => useStore.getState().setCurrentView(view));
      seen.push([
        view,
        q('[data-region="inspector"]')?.getAttribute('data-mount-id'),
        q('[data-region="dock"]') !== null &&
          q('[data-testid="rack-dock"]') === null,
      ]);
      if (view === 'studio') {
        expect(
          q('[data-region="dock"] [data-testid="rack-dock"]'),
        ).not.toBeNull();
      }
    }
    expect(seen).toEqual([
      ['studio', mountId, false],
      ['score', mountId, false],
      ['leadsheet', mountId, false],
      ['arrange', mountId, true],
    ]);
    expect(q('[data-testid="timeline"]')).not.toBeNull();
    expect(
      q('[data-region="bottom"] [data-testid="bottom-rail"]'),
    ).not.toBeNull();
    expect(q('[data-region="rail"] [data-testid="side-rail"]')).not.toBeNull();
  });

  it('opens the panel a side rail icon names, and closes it on a second click', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    act(() => useStore.getState().setInspectorOpenFor('arrange', false));
    expect(q('[data-testid="library-panel"]')).toBeNull();
    // Effects left the rail for the Add effect picker (2026-10-21).
    expect(q('[data-testid="rail-fx"]')).toBeNull();
    const lib = q('[data-testid="rail-library"]') as HTMLButtonElement;
    act(() => lib.click());
    expect(useStore.getState().inspectorPanel).toBe('library');
    expect(q('[data-testid="library-panel"]')).not.toBeNull();
    expect(lib).toHaveAttribute('aria-pressed', 'true');
    expect(useStore.getState().inspectorOpenByView.arrange).toBe(true);
    act(() => lib.click());
    expect(q('[data-testid="library-panel"]')).toBeNull();
    expect(lib).toHaveAttribute('aria-pressed', 'false');
  });

  it('lays the open Inspector over the dock, making room in the view only', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    act(() => useStore.getState().setInspectorOpenFor('arrange', false));
    const main = q('[data-region="main"]') as HTMLElement;
    const inspector = q('[data-region="inspector"]') as HTMLElement;
    const stage = q('[data-testid="stage-card"]') as HTMLElement;
    // The stage spans the Inspector's column; the Inspector sits over it.
    expect(stage.style.gridArea).toBe('stage');
    expect(inspector.style.gridColumn).toBe('2');
    expect(main.style.paddingRight).toBe('');

    act(() => (q('[data-testid="rail-library"]') as HTMLButtonElement).click());
    expect(main.style.paddingRight).toBe('var(--daw-insp-w, 300px)');
    // The dock keeps its width: no room is made for the Inspector there.
    const dock = q('[data-region="dock"]') as HTMLElement;
    expect(dock.style.paddingRight).toBe('');
  });

  it('shows the view the student picked in the main region', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    act(() => useStore.getState().setCurrentView('score'));
    expect(q('[data-region="main"] [data-testid="score-view"]')).not.toBeNull();
    expect(q('[data-region="main"]')).toHaveAttribute('aria-label', 'Score');
  });

  it('gives the practice screen the window, keeping the rest mounted', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    const mountId = q('[data-region="inspector"]')?.getAttribute(
      'data-mount-id',
    );
    act(() =>
      useStore.setState({
        currentView: 'practice',
        practiceSession: { kind: 'theory' } as never,
      }),
    );
    expect(q('[data-testid="practice-view"]')).not.toBeNull();
    expect(q('[data-region="top"]')).toHaveAttribute('hidden');
    expect(q('[data-region="inspector"]')).toHaveAttribute('hidden');
    expect(q('[data-region="rail"]')).toHaveAttribute('hidden');
    expect(q('[data-region="bottom"]')).toHaveAttribute('hidden');
    expect(q('[data-region="inspector"]')?.getAttribute('data-mount-id')).toBe(
      mountId,
    );
    expect(q('[data-region="dock"]')).toBeNull();
  });

  it('holds the view and its dock in one stage card, and drops the card for the practice screen', () => {
    render(<StudioShell isReady onInit={() => {}} />);
    const card = q('[data-testid="stage-card"]');
    expect(card).not.toBeNull();
    expect(card?.querySelector('[data-region="main"]')).not.toBeNull();
    expect(card?.querySelector('[data-region="dock"]')).not.toBeNull();
    expect(card).toHaveClass('mx-2', 'rounded-[var(--daw-radius-lg)]');
    act(() =>
      useStore.setState({
        currentView: 'practice',
        practiceSession: { kind: 'theory' } as never,
      }),
    );
    expect(q('[data-testid="stage-card"]')).not.toHaveClass('mx-2');
  });
});
