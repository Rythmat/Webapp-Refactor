// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffLayout } from '@/components/notation/StaffView';
import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import type { SongSection } from '@/daw/model/sections';
import { useStore, type AllSlices } from '@/daw/store';
import { buildScoreParts } from './scoreParts';
import { useScoreEditing } from './useScoreEditing';

// ── The Score's rehearsal marks and the song's sections (milestone 2.13) ───
// Driven through the real hook and store, as ScoreView wires them. A mark on
// the closing barline started a section a bar past the song, which the Score
// never draws; renaming a mark to the name it already had retyped the section
// from its name and added an undo step.

vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));

const BAR = 1920;
const st = () => useStore.getState();
let editing: ReturnType<typeof useScoreEditing>;
let measureCount = 0;

function ScoreEditor() {
  const tracks = useStore((s) => s.tracks);
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote: 0,
        mode: 'ionian',
        timeSignature: [4, 4],
      }),
    [tracks],
  );
  const parts = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );
  measureCount = parts[0]?.score.measures.length ?? 0;
  editing = useScoreEditing({ parts, scoreParts });
  return <div>{editing.staff.overlay}</div>;
}

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

const spans = () =>
  st().sections.map(
    (s) => `${s.label} ${s.type} ${s.startTick / BAR}-${s.endTick / BAR}`,
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

/** One system of four bars: barlines 0–3, and 4 closing it. */
const layout: StaffLayout = {
  barlines: [0, 1, 2, 3, 4].map((measureIndex) => ({
    measureIndex,
    atSystemEnd: measureIndex === 4,
    system: 0,
    x: 10 + measureIndex * 200,
    y: 0,
    height: 80,
  })),
  measures: [],
  rests: [],
  notes: [],
  scale: 1,
  systemHeight: 120,
  stepPx: 5,
  topLineDrop: 0,
};

let container: HTMLElement;
const clickBarline = (index: number) => {
  const target = container.querySelector(
    `button[title="Barline before bar ${index + 1}"]`,
  );
  if (!target) throw new Error(`no barline ${index}`);
  fireEvent.click(target);
};

let uninstallKeys: () => void = () => {};

beforeEach(() => {
  uninstallKeys = installKeyDispatcher();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ currentView: 'score' } as Partial<AllSlices>);
  const id = st().addTrack('midi', 'piano-sampler', 'Piano');
  st().addMidiClip(id, {
    id: 'clip',
    startTick: 0,
    durationTicks: 4 * BAR,
    events: [0, 1, 2, 3].map((bar) => ({
      note: 72,
      velocity: 90,
      startTick: bar * BAR,
      durationTicks: BAR,
      channel: 0,
    })),
  });
  // A Verse typed as a chorus: its name and its kind disagree.
  useStore.setState({
    sections: [sec('v', 'Verse', 'chorus', 0, 4)],
  } as Partial<AllSlices>);
  container = render(<ScoreEditor />).container;
  act(() => editing.staff.onLayout(layout));
  expect(measureCount).toBe(4);
});

afterEach(() => {
  cleanup();
  uninstallKeys();
});

describe('the closing barline', () => {
  it('takes no rehearsal mark from the palette or Mod+M', () => {
    clickBarline(4);
    expect(editing.selection.barline).toBe(4);
    act(() => editing.palette.onApply('text.rehearsalMark'));
    modKey('KeyM');
    expect(spans()).toEqual(['Verse chorus 0-4']);
  });

  it('takes no section from a pasted barline', () => {
    clickBarline(0);
    modKey('KeyC');
    clickBarline(4);
    modKey('KeyV');
    expect(spans()).toEqual(['Verse chorus 0-4']);
  });

  it('leaves a barline inside the song taking a mark', () => {
    clickBarline(1);
    modKey('KeyM');
    expect(st().sections).toHaveLength(2);
    expect(st().sections[1].startTick).toBe(BAR);
  });
});

describe('renaming a rehearsal mark', () => {
  const rename = (label: string) => {
    fireEvent.doubleClick(
      container.querySelector('button[title="Double-click to rename"]')!,
    );
    const field = container.querySelector('input')!;
    fireEvent.change(field, { target: { value: label } });
    fireEvent.blur(field);
  };

  it('to the name it has changes nothing', () => {
    const before = st().sections;
    rename(' Verse ');
    expect(st().sections).toBe(before);
  });

  it('to another name renames it', () => {
    rename('Bridge');
    expect(spans()).toEqual(['Bridge bridge 0-4']);
  });
});
