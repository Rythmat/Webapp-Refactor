import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { commitMidiTake } from '@/daw/hooks/useMidiRecording';
import { chordsInNotes, takeWritesChords } from '@/daw/harmony/takeChords';
import {
  chordPartIds,
  NO_CHORD_PARTS,
  toggledChordParts,
} from '@/daw/components/Score/chordParts';
import { canvasMenuModel, menuItemIds } from '../clipMenu/clipMenuModel';
import { runCanvasMenuItem } from '../clipMenu/runCanvasMenuItem';
import {
  deleteSelectedChords,
  insertChordAt,
  setChordEditor,
} from '../chordActions';

// ── The chord ruler: written as a take records, edited by hand, read by the
// Score (owner, 2026-10-21). Run:
// npx vitest run src/daw/shell/canvas/__tests__/chordRuler.test.ts

const s = () => useStore.getState();
const BAR = 1920;

/** A held triad in song ticks. */
const triad = (root: number, startTick: number, third = 4) =>
  [root, root + third, root + 7].map((note) => ({
    note,
    velocity: 100,
    startTick,
    durationTicks: BAR,
    channel: 1,
  }));

function region(id: string, startTick: number, endTick: number): ChordRegion {
  return {
    id,
    startTick,
    endTick,
    name: '1 major',
    noteName: 'C',
    color: [200, 200, 200],
  };
}

let keys = '';
let beat = '';
let release: () => void = () => {};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  beat = s().addTrack('midi', 'drum-machine', 'Beat');
  useStore.setState({ rootNote: 0, mode: 'ionian', chordRegions: [] });
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  setChordEditor(null);
  vi.useRealTimers();
});

describe('a take’s chords (Auto)', () => {
  it('writes only for a non-drum track, while Auto is on', () => {
    expect(takeWritesChords(keys)).toBe(true);
    expect(takeWritesChords(beat)).toBe(false);
    useStore.setState({ chordAutoAnalyze: false });
    expect(takeWritesChords(keys)).toBe(false);
  });

  it('reads the take’s chords in the song’s key', () => {
    const chords = chordsInNotes([...triad(60, 0), ...triad(65, BAR)]);
    expect(chords.map((c) => c.noteName)).toEqual(['C maj', 'F maj']);
    expect(chords[1].startTick).toBe(BAR);
  });

  it('lands the clip and its chords as one undo step, over the preview', () => {
    const before = [region('old', 0, BAR * 8)];
    useStore.setState({ chordRegions: before });
    resetHistory();
    // The live preview left something on the ruler.
    useStore.setState({ chordRegions: [region('preview', 0, BAR)] });
    const clip: MidiClip = {
      id: 'take',
      startTick: BAR * 2,
      events: [...triad(57, 0, 3), ...triad(53, BAR)],
    };
    commitMidiTake(keys, clip, before);

    expect(undoLabel()).toBe('Record take');
    const lane = s().chordRegions;
    const names = lane.map((r) => `${r.noteName}@${r.startTick}`);
    // The old chord keeps what the take didn't cover; the take's chords
    // sit over its span, tagged with the clip.
    expect(names).toEqual([
      `C@0`,
      `A min@${BAR * 2}`,
      `F maj@${BAR * 3}`,
      `C@${BAR * 4}`,
    ]);
    expect(lane[1].sourceClipId).toBe('take');

    undo();
    expect(s().chordRegions).toEqual(before);
    expect(s().tracks.find((t) => t.id === keys)!.midiClips).toEqual([]);
  });

  it('writes no chords for a drum take', () => {
    commitMidiTake(beat, { id: 'b', startTick: 0, events: triad(36, 0) }, null);
    expect(s().chordRegions).toEqual([]);
  });
});

describe('editing the chord ruler', () => {
  it('inserts the key’s home chord in a gap and opens the box on it', () => {
    vi.useFakeTimers();
    const open = vi.fn();
    setChordEditor(open);
    const id = insertChordAt(BAR + 10);
    vi.runAllTimers();
    expect(undoLabel()).toBe('Insert chord');
    const added = s().chordRegions.find((r) => r.id === id)!;
    expect(added.noteName).toBe('C maj');
    expect(added.startTick).toBe(BAR);
    expect(open).toHaveBeenCalledWith(id);
  });

  it('inside a chord, splits it with a copy', () => {
    useStore.setState({ chordRegions: [region('a', 0, BAR)] });
    insertChordAt(960);
    expect(s().chordRegions.map((r) => [r.startTick, r.endTick])).toEqual([
      [0, 960],
      [960, BAR],
    ]);
  });

  it('deletes the selected chords as one step', () => {
    useStore.setState({
      chordRegions: [
        region('a', 0, BAR),
        region('b', BAR, BAR * 2),
        region('c', BAR * 2, BAR * 3),
      ],
    });
    resetHistory();
    s().setSelectedChordIds(['b', 'c']);
    expect(deleteSelectedChords()).toBe(true);
    expect(undoLabel()).toBe('Delete chords');
    expect(s().chordRegions.map((r) => r.id)).toEqual(['a']);
    expect(s().selectedChordIds).toEqual([]);
  });

  it('a chord’s menu edits, inserts and deletes; the empty ruler’s inserts', () => {
    useStore.setState({ chordRegions: [region('a', 0, BAR)] });
    const menu = (target: Parameters<typeof canvasMenuModel>[1]) =>
      menuItemIds(
        canvasMenuModel(s() as AllSlices, target, {
          premium: true,
          playheadTick: 0,
        }),
      );
    expect(menu({ kind: 'chord', chordId: 'a', tick: 0 })).toEqual([
      'editChord',
      'insertChord',
      'deleteChord',
    ]);
    expect(menu({ kind: 'chordLane', tick: BAR * 3 })).toEqual(['insertChord']);
    expect(
      runCanvasMenuItem(
        { kind: 'chord', chordId: 'a', tick: 0 },
        'deleteChord',
      ),
    ).toBe(true);
    expect(s().chordRegions).toEqual([]);
  });
});

describe('the Score’s chord parts', () => {
  const parts = ['top', 'bass'];

  it('puts chords on the top part until the student picks', () => {
    expect([...chordPartIds([], parts)]).toEqual(['top']);
    expect([...chordPartIds(['bass'], parts)]).toEqual(['bass']);
  });

  it('turning the top part’s off leaves none, not the default', () => {
    const off = toggledChordParts([], parts, 'top');
    expect(off).toEqual([NO_CHORD_PARTS]);
    expect([...chordPartIds(off, parts)]).toEqual([]);
    expect(toggledChordParts(off, parts, 'bass')).toEqual(['bass']);
    expect(toggledChordParts([], parts, 'bass')).toEqual(['top', 'bass']);
  });
});
