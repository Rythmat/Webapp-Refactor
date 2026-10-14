// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ── Which rack an FX list row belongs to ────────────────────────────────────
// The FX list is mounted per rack (the track dock, mastering, each return,
// the master track's panel) with the same fx-add-* ids. Each row says which
// rack it is in, so a lesson step spotlights the rack it means, the track
// dock unless the step names another (anchorRegistry.ts).

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => null,
}));

import { FxBrowser } from '@/daw/components/Effects/FxBrowser';
import { resolveAnchor } from '../anchorRegistry';
import { setBox } from './anchorTestUtils';

afterEach(cleanup);

const racksOf = (type: string) =>
  Array.from(
    document.querySelectorAll(`[data-tutorial-id="fx-add-${type}"]`),
    (el) => el.getAttribute('data-tutorial-target'),
  );

describe('FxBrowser rack stamp', () => {
  it('stamps each row with its rack, from the track id', () => {
    for (const trackId of ['master', 'return-A', 'track-1']) {
      render(
        <FxBrowser
          trackId={trackId}
          activeEffects={[]}
          onAddEffect={() => {}}
          hideMidi
        />,
      );
    }
    expect(racksOf('compressor')).toEqual(['master', 'return:A', 'track']);
    // Every fx-add-* row says its rack.
    for (const row of document.querySelectorAll(
      '[data-tutorial-id^="fx-add-"]',
    ))
      expect(row).toHaveAttribute('data-tutorial-target');

    for (const row of document.querySelectorAll(
      '[data-tutorial-id^="fx-add-"]',
    ))
      setBox(row, { top: 10, left: 10, width: 100, height: 20 });
    expect(
      resolveAnchor('fx-add-compressor')?.el.getAttribute(
        'data-tutorial-target',
      ),
    ).toBe('track');
    expect(
      resolveAnchor('fx-add-compressor', { rack: 'master' })?.el.getAttribute(
        'data-tutorial-target',
      ),
    ).toBe('master');
  });
});
