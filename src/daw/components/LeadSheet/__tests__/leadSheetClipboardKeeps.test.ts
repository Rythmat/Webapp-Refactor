/**
 * A chord paste rebuilds the lane from where each chord starts, and a chord
 * it keeps is the same chord on the same beat: only where it ends may move.
 * It used to come back with its name, colour and id alone, losing the notes
 * it was read from, its detection confidence, its raw hit time and (decision
 * D3) its identity. A pasted chord carries only what the clipboard holds,
 * and no id until the store gives it one.
 *
 * Run: npx vitest run src/daw/components/LeadSheet/__tests__/leadSheetClipboardKeeps.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { ChordRegionIdentity } from '@/daw/harmony/chordIdentity';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  buildClipboard,
  pasteChords,
  type CopySource,
} from '../leadSheetClipboard';

const BAR = 1920;

const identity = (label: string, rootPc: number): ChordRegionIdentity => ({
  rootPc,
  quality: 'major',
  bassPc: rootPc,
  source: 'detected',
  label,
});

/** A chord as analysis leaves it: every optional field filled in. */
const detected = (
  id: string,
  startTick: number,
  endTick: number,
  name: string,
  rootPc: number,
): ChordRegion => ({
  id,
  startTick,
  endTick,
  rawStartTick: startTick + 12,
  name,
  noteName: name,
  color: [10, 20, 30],
  degreeKey: '1 major',
  midis: [60 + rootPc, 64 + rootPc, 67 + rootPc],
  confidence: 0.9,
  identity: identity(name, rootPc),
});

/** Bar 0: C. Bar 1: F. Bar 2: G. */
const lane = (): ChordRegion[] => [
  detected('c', 0, BAR, 'C', 0),
  detected('f', BAR, 2 * BAR, 'F', 5),
  detected('g', 2 * BAR, 3 * BAR, 'G', 7),
];

const copyBar = (over: Partial<CopySource> = {}): CopySource => ({
  kind: 'measure',
  startTick: 0,
  startMeasure: 0,
  spanTicks: BAR,
  spanMeasures: 1,
  replace: true,
  chords: [lane()[0]],
  notes: [],
  roadmap: [],
  ...over,
});

const byId = (regions: ChordRegion[], id: string) => {
  const found = regions.find((r) => r.id === id);
  if (!found) throw new Error(`no region ${id}`);
  return found;
};

describe('a chord the paste keeps', () => {
  it('stays whole when a bar is pasted beside it', () => {
    const next = pasteChords(lane(), buildClipboard(copyBar()), BAR);
    // F's bar took the copy; C and G stay as they were.
    expect(byId(next, 'c')).toEqual(lane()[0]);
    expect(byId(next, 'g')).toEqual(lane()[2]);
  });

  it('keeps everything but its end when a chord lands inside it', () => {
    const loose = buildClipboard(
      copyBar({
        kind: 'chord',
        replace: false,
        spanTicks: 0,
        chords: [lane()[2]],
        startTick: 2 * BAR,
      }),
    );
    const next = pasteChords(lane(), loose, BAR + 960);
    expect(byId(next, 'f')).toEqual({ ...lane()[1], endTick: BAR + 960 });
  });
});

describe('a pasted chord', () => {
  it('carries what the clipboard holds and nothing of the copied region', () => {
    const next = pasteChords(lane(), buildClipboard(copyBar()), BAR);
    const pasted = next.find((r) => r.startTick === BAR);
    expect(pasted).toEqual({
      id: '',
      startTick: BAR,
      endTick: 2 * BAR,
      name: 'C',
      noteName: 'C',
      color: [10, 20, 30],
      degreeKey: '1 major',
    });
  });

  it('holds no degreeKey at all when the copy had none', () => {
    const plain: ChordRegion = {
      id: 'p',
      startTick: 0,
      endTick: BAR,
      name: 'Am',
      noteName: 'Am',
      color: [1, 2, 3],
    };
    const next = pasteChords(
      lane(),
      buildClipboard(copyBar({ chords: [plain] })),
      BAR,
    );
    const pasted = next.find((r) => r.startTick === BAR);
    expect(pasted && 'degreeKey' in pasted).toBe(false);
  });
});

describe('through the store', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
    useStore.setState({ chordRegions: lane() });
  });

  it('gives pasted chords ids and keeps the identities of the rest', () => {
    const { chordRegions, setChordRegions } = useStore.getState();
    // What the lead sheet does on ⌘V.
    setChordRegions(
      pasteChords(chordRegions, buildClipboard(copyBar()), BAR),
      true,
    );
    const after = useStore.getState().chordRegions;
    expect(after.every((r) => r.id !== '')).toBe(true);
    expect(new Set(after.map((r) => r.id)).size).toBe(after.length);
    expect(after.map((r) => r.identity?.label ?? null)).toEqual([
      'C',
      null,
      'G',
    ]);
  });
});
