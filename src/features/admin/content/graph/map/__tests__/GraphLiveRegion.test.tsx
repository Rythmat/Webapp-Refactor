// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  currentNodeAnnouncement,
  GraphLiveRegion,
  type GraphLiveRegionHandle,
  useGraphAnnouncer,
} from '../GraphLiveRegion';

afterEach(cleanup);

describe('the graph’s live region', () => {
  it('is one polite status region, out of sight and empty at first', () => {
    render(<GraphLiveRegion />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.className).toContain('sr-only');
    expect(region.textContent).toBe('');
  });

  it('says what it is asked to, and says a repeat again', () => {
    const ref = createRef<GraphLiveRegionHandle>();
    render(<GraphLiveRegion ref={ref} />);
    const region = screen.getByRole('status');

    act(() => ref.current?.announce('Layout settled'));
    expect(region.textContent).toBe('Layout settled');

    // The same words again: changed text, so a screen reader speaks it.
    act(() => ref.current?.announce('Layout settled'));
    expect(region.textContent).toBe('Layout settled ');
    act(() => ref.current?.announce('Layout settled'));
    expect(region.textContent).toBe('Layout settled');

    act(() => ref.current?.announce('Rosanna, song, 2 links'));
    expect(region.textContent).toBe('Rosanna, song, 2 links');
  });

  it('ignores nothing to say', () => {
    const ref = createRef<GraphLiveRegionHandle>();
    render(<GraphLiveRegion ref={ref} />);
    act(() => ref.current?.announce('Toto'));
    act(() => ref.current?.announce('   '));
    expect(screen.getByRole('status').textContent).toBe('Toto');
  });

  it('pairs with its announcer, which is safe before it mounts', () => {
    let speak: (text: string) => void = () => {};
    const Page = ({ withRegion }: { withRegion: boolean }) => {
      const { ref, announce } = useGraphAnnouncer();
      speak = announce;
      return withRegion ? <GraphLiveRegion ref={ref} /> : null;
    };
    const { rerender } = render(<Page withRegion={false} />);
    expect(() => speak('Nothing hears this')).not.toThrow();

    rerender(<Page withRegion />);
    act(() => speak('Selected Toto, artist'));
    expect(screen.getByRole('status').textContent).toBe(
      'Selected Toto, artist',
    );
  });
});

describe('announcing the current node', () => {
  it('names it, its kind and its links', () => {
    expect(
      currentNodeAnnouncement({ label: 'Rosanna', kind: 'song' }, 12),
    ).toBe('Rosanna, song, 12 links');
    expect(currentNodeAnnouncement({ label: 'Toto', kind: 'artist' }, 1)).toBe(
      'Toto, artist, 1 link',
    );
    expect(
      currentNodeAnnouncement({ label: 'Woodstock', kind: 'event' }, 3),
    ).toBe('Woodstock, globe event, 3 links');
  });

  it('says where it sits among the neighbours it was stepped to from', () => {
    expect(
      currentNodeAnnouncement({ label: 'Rosanna', kind: 'song' }, 12, {
        index: 2,
        of: 9,
        from: 'Toto',
      }),
    ).toBe('Rosanna, song, 12 links, 2 of 9 neighbours of Toto');
    expect(
      currentNodeAnnouncement({ label: 'Toto', kind: 'artist' }, 2, {
        index: 1,
        of: 1,
        from: 'Rosanna',
      }),
    ).toBe('Toto, artist, 2 links, 1 of 1 neighbour of Rosanna');
  });
});
