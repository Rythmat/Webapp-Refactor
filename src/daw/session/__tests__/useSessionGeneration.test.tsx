// @vitest-environment jsdom
/**
 * useSessionGeneration: the session generation as a component sees it. A
 * view keyed by it with its track id mounts again for every load or reset,
 * and only then (TrackControlsPanel does this for the instrument views).
 *
 * Run: npx vitest run src/daw/session/__tests__/useSessionGeneration.test.tsx
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '../sessionGeneration';
import { useSessionGeneration } from '../useSessionGeneration';

function Generation() {
  return <span data-testid="generation">{useSessionGeneration()}</span>;
}

const shown = () => Number(screen.getByTestId('generation').textContent);

afterEach(cleanup);

describe('useSessionGeneration', () => {
  it('reads the generation open now', () => {
    bumpSessionGeneration('restore');
    render(<Generation />);
    expect(shown()).toBe(getSessionGeneration());
  });

  it('re-renders with each new generation', () => {
    render(<Generation />);
    const before = shown();

    act(() => {
      bumpSessionGeneration('cloud-open');
    });
    expect(shown()).toBe(before + 1);

    act(() => {
      bumpSessionGeneration('new');
      bumpSessionGeneration('template');
    });
    expect(shown()).toBe(before + 3);
  });

  it('remounts a view keyed by it on every load, and only on a load', () => {
    let mounts = 0;
    function TrackView() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    function Panel({ trackId }: { trackId: string }) {
      const generation = useSessionGeneration();
      return <TrackView key={`${trackId}:${generation}`} />;
    }

    const { rerender } = render(<Panel trackId="t1" />);
    expect(mounts).toBe(1);

    // Re-rendered for anything else (an edit), the view stays.
    rerender(<Panel trackId="t1" />);
    expect(mounts).toBe(1);

    // A project that reuses the id: a new generation, so a new view.
    act(() => {
      bumpSessionGeneration('restore');
    });
    expect(mounts).toBe(2);

    // Another track, as before.
    rerender(<Panel trackId="t2" />);
    expect(mounts).toBe(3);
  });
});
