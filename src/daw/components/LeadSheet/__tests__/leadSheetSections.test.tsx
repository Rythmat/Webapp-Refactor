// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The Lead Sheet and the song's sections (milestone 2.13) ────────────────
// The sheet marks the sections the sections lane holds, and its own edits go
// through the same store actions. A rehearsal mark on the closing barline
// started a section a bar past the song, so the chart grew a bar; a section
// starting inside a multi-bar rest had no mark; the notated sheet stopped at
// the last chord while the chord chart ran on to the end of the sections.

const h = vi.hoisted(() => ({
  /** The parts the notated sheet last handed its staff. */
  staffParts: [] as { score: { measures: unknown[] } }[],
}));

vi.mock('@/components/notation/StaffView', () => ({
  StaffView: (props: { parts: { score: { measures: unknown[] } }[] }) => {
    h.staffParts = props.parts;
    return null;
  },
  loadVexFlow: () => new Promise(() => {}),
}));
// The composer line asks who is signed in; nobody is, here.
vi.mock('@/hooks/data/auth/useMe', () => ({
  useMe: () => ({ data: undefined }),
}));
// The toolbar's menus and set-list button aren't under test.
vi.mock('@/daw/components/Score/ScoreToolbar', () => ({
  ScoreToolbar: () => null,
}));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import type { SongSection } from '@/daw/model/sections';
import { useStore, type AllSlices } from '@/daw/store';
import { ScoreView } from '../../Score/ScoreView';
import { LeadSheetChartView as LeadSheetView } from '../LeadSheetView';

const BAR = 1920;
const st = () => useStore.getState();

const sec = (
  id: string,
  label: string,
  type: SongSection['type'],
  from: number,
  to: number,
): SongSection => ({
  id,
  label,
  type,
  startTick: from * BAR,
  endTick: to * BAR,
});

/** A C major chord in each of the first `count` bars. */
const chords = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    startTick: i * BAR,
    endTick: (i + 1) * BAR,
    name: '1 maj',
    noteName: 'C maj',
    color: [1, 1, 1] as [number, number, number],
  }));

const spans = () =>
  st().sections.map(
    (s) => `${s.label} ${s.startTick / BAR}-${s.endTick / BAR}`,
  );

/** A key press as the browser sends it, with ⌘ held. */
const modKey = (code: string) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: code.slice(3).toLowerCase(),
        code,
        metaKey: true,
      }),
    );
  });

/** Click the barline before bar `index + 1` (`index` = bar count closes it). */
const clickBarline = (container: HTMLElement, index: number) => {
  const target = container.querySelector(`[data-barline-target="${index}"]`);
  if (!target) throw new Error(`no barline ${index}`);
  fireEvent.click(target);
};

const markers = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="section-marker"]')].map(
    (el) => `${el.textContent} @${el.getAttribute('data-measure')}`,
  );

let uninstallKeys: () => void = () => {};

beforeEach(() => {
  uninstallKeys = installKeyDispatcher();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    currentView: 'leadsheet',
    chordRegions: chords(4),
    sections: [sec('v', 'Verse', 'verse', 0, 4)],
    leadSheetBars: null,
    measureRestMap: null,
    measureRowSizes: null,
  } as Partial<AllSlices>);
});

afterEach(() => {
  cleanup();
  uninstallKeys();
});

describe('the closing barline', () => {
  it('takes no rehearsal mark, so the chart keeps its length', () => {
    const { container } = render(<LeadSheetView />);
    clickBarline(container, 4);
    modKey('KeyM');
    expect(spans()).toEqual(['Verse 0-4']);
    expect(container.querySelectorAll('[data-barline-target]')).toHaveLength(5);
  });

  it('takes no section from a paste', () => {
    const { container } = render(<LeadSheetView />);
    clickBarline(container, 0);
    modKey('KeyC');
    clickBarline(container, 4);
    modKey('KeyV');
    expect(spans()).toEqual(['Verse 0-4']);
  });

  it('still takes a mark on a barline inside the song', () => {
    const { container } = render(<LeadSheetView />);
    clickBarline(container, 2);
    modKey('KeyM');
    expect(spans()).toHaveLength(2);
    expect(st().sections[1].startTick).toBe(2 * BAR);
  });
});

describe('a section starting inside a multi-bar rest', () => {
  it('is marked on the rest', () => {
    useStore.setState({
      chordRegions: chords(12),
      // Bars 5–8 are one four-bar rest; the Chorus starts on bar 7.
      measureRestMap: { 4: 4 },
      sections: [
        sec('v', 'Verse', 'verse', 0, 6),
        sec('c', 'Chorus', 'chorus', 6, 12),
      ],
    } as Partial<AllSlices>);
    const { container } = render(<LeadSheetView />);
    expect(markers(container)).toEqual(['Verse @0', 'Chorus @6']);
  });

  it('shows the first when several start under one rest', () => {
    useStore.setState({
      chordRegions: chords(12),
      measureRestMap: { 4: 4 },
      sections: [
        sec('v', 'Verse', 'verse', 0, 5),
        sec('b', 'Bridge', 'bridge', 5, 6),
        sec('c', 'Chorus', 'chorus', 6, 12),
      ],
    } as Partial<AllSlices>);
    const { container } = render(<LeadSheetView />);
    expect(markers(container)).toEqual(['Verse @0', 'Bridge @5']);
  });
});

describe('the notated sheet', () => {
  it('runs as far as the sections, past the last chord', () => {
    const keys = st().addTrack('midi', 'soundfont', 'Melody');
    st().addMidiClip(keys, {
      id: 'clip',
      startTick: 0,
      durationTicks: BAR,
      events: [60, 64, 67].map((note, i) => ({
        note,
        velocity: 100,
        startTick: i * 480,
        durationTicks: 480,
        channel: 0,
      })),
    });
    useStore.setState({
      sections: [
        sec('v', 'Verse', 'verse', 0, 4),
        sec('c', 'Chorus', 'chorus', 4, 12),
      ],
    } as Partial<AllSlices>);
    // The staves are the Score's, which is the lead sheet too (2026-10-21).
    render(<ScoreView />);
    expect(h.staffParts).toHaveLength(1);
    expect(h.staffParts[0].score.measures).toHaveLength(12);
  });
});
