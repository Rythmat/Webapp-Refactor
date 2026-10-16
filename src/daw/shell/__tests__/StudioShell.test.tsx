// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The shell's regions (milestone 2.4) ────────────────────────────────────
// Laid out once, outside the view switch: the Inspector is mounted once
// across Create → Mix → Score → Lead sheet → Create, the dock is Create's,
// and the practice screen hides the top bar and the Inspector without
// unmounting them.
//
// Run: npx vitest run src/daw/shell/__tests__/StudioShell.test.tsx

const { stub } = vi.hoisted(() => ({
  stub: (id: string) =>
    function Stub() {
      return <div data-testid={id} />;
    },
}));
vi.mock('../topbar/TopBar', () => ({ TopBar: stub('top-bar') }));
vi.mock('@/daw/components/Timeline/TimelineWithHeaders', () => ({
  TimelineWithHeaders: stub('timeline'),
}));
vi.mock('@/daw/components/ChannelStrip/ChannelStrip', () => ({
  ChannelStrip: stub('channel-strip'),
}));
vi.mock('@/daw/components/Library/LibraryPanel', () => ({
  LibraryPanel: stub('library-panel'),
}));
vi.mock('../lazyParts', () => ({
  StudioViewPart: stub('mix-view'),
  ScoreViewPart: stub('score-view'),
  LeadSheetViewPart: stub('leadsheet-view'),
  PracticeTrackViewPart: stub('practice-view'),
  PianoRollModalHost: () => null,
}));

import { useStore, type ViewType } from '@/daw/store';
import { StudioShell } from '../StudioShell';

const q = (sel: string) => document.querySelector(sel);

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(cleanup);

describe('StudioShell', () => {
  it('keeps one Inspector across every view, and the dock in Create only', () => {
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
        q('[data-region="dock"]') !== null,
      ]);
    }
    expect(seen).toEqual([
      ['studio', mountId, false],
      ['score', mountId, false],
      ['leadsheet', mountId, false],
      ['arrange', mountId, true],
    ]);
    expect(q('[data-testid="timeline"]')).not.toBeNull();
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
    expect(q('[data-region="inspector"]')?.getAttribute('data-mount-id')).toBe(
      mountId,
    );
    expect(q('[data-region="dock"]')).toBeNull();
  });
});
