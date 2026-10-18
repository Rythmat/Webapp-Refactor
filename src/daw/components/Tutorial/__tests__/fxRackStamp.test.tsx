// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ── Which rack an FX list row belongs to ────────────────────────────────────
// The side rail's Effects library (FxBody) is the one FX list since 2.8, and
// it adds to the rack in front of the student (2.10): a track's, the
// master's or a return's. Each row says which rack it adds to, so a lesson
// step spotlights the rack it means, the track's unless the step names
// another (anchorRegistry.ts).

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => null,
}));

import { FxBody } from '@/daw/shell/inspector/panels/FxBody';
import { useStore } from '@/daw/store';
import { resolveAnchor } from '../anchorRegistry';
import { setBox } from './anchorTestUtils';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  s().setSelectedTrackId(s().addTrack('midi', 'oracle-synth', 'Synth'));
});
afterEach(cleanup);

const rackOf = (type: string) =>
  document
    .querySelector(`[data-tutorial-id="fx-add-${type}"]`)
    ?.getAttribute('data-tutorial-target');

describe('the Effects library’s rack stamp', () => {
  it('stamps each row with the rack it adds to', () => {
    const seen: (string | null | undefined)[] = [];
    for (const setUp of [
      () => s().setCurrentView('arrange'),
      () => {
        s().setCurrentView('arrange');
        s().setDockMaster(true);
      },
      () => {
        s().setCurrentView('studio');
        s().setMixRack({ kind: 'return', id: 'A' });
      },
      () => {
        s().setCurrentView('studio');
        s().setMixRack({ kind: 'master' });
      },
    ]) {
      setUp();
      render(<FxBody />);
      seen.push(rackOf('compressor'));
      // Every fx-add-* row says its rack.
      for (const row of document.querySelectorAll(
        '[data-tutorial-id^="fx-add-"]',
      ))
        expect(row).toHaveAttribute('data-tutorial-target');
      cleanup();
      useStore.setState({ dockMaster: false, mixRack: null });
    }
    expect(seen).toEqual(['track', 'master', 'return:A', 'master']);
  });

  it('lets a step that names a rack find that rack’s row', () => {
    for (const rack of ['track', 'master']) {
      const row = document.createElement('button');
      row.setAttribute('data-tutorial-id', 'fx-add-compressor');
      row.setAttribute('data-tutorial-target', rack);
      document.body.appendChild(row);
      setBox(row, { top: 10, left: 10, width: 100, height: 20 });
    }
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
    document.body.innerHTML = '';
  });
});
