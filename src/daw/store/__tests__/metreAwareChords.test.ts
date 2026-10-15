/**
 * The chord lane in the project's metre (milestone 1.10). A chord written on
 * the Lead Sheet lasts until the next one or its bar's end, moves and
 * resizes snap to the metre's beat, a Prism take ends on one of the
 * project's bar lines, and chords read from the session sit where the clip
 * plays, not at bar 1 (state-reload-09, ia-flows-34, leadsheet-07).
 *
 * Run: npx vitest run src/daw/store/__tests__/metreAwareChords.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { useStore, type AllSlices } from '../index';
import {
  deriveChordRegionsFromSession,
  prismTakeSpan,
  type ChordRegion,
} from '../prismSlice';
import type { Track } from '../tracksSlice';

const s = () => useStore.getState();

const chord = (
  id: string,
  startTick: number,
  endTick: number,
): ChordRegion => ({
  id,
  startTick,
  endTick,
  name: '1 maj',
  noteName: 'C maj',
  color: [1, 1, 1],
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('writing chords on the Lead Sheet', () => {
  it('lasts to the end of its 3/4 bar when no chord follows', () => {
    useStore.setState({
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
    } as Partial<AllSlices>);
    s().insertChordRegion(1440 + 480, 'maj', 'C');
    expect(s().chordRegions[0]).toMatchObject({
      startTick: 1920,
      endTick: 2880,
    });
  });

  it('lasts until the next chord when one follows in the bar', () => {
    useStore.setState({ chordRegions: [chord('next', 1440, 1920)] });
    s().insertChordRegion(960, 'maj', 'C');
    const written = s().chordRegions.find((r) => r.id !== 'next');
    expect(written).toMatchObject({ startTick: 960, endTick: 1440 });
  });

  it('moves and resizes on the eighth-note beat in 6/8', () => {
    useStore.setState({
      timeSignatureNumerator: 6,
      timeSignatureDenominator: 8,
      chordRegions: [chord('a', 0, 1440), chord('b', 1440, 2880)],
    } as Partial<AllSlices>);
    s().moveChordRegion('b', 1440 + 250);
    expect(s().chordRegions.find((r) => r.id === 'b')?.startTick).toBe(1680);
    s().resizeChordRegion('a', 700);
    expect(s().chordRegions.find((r) => r.id === 'a')?.endTick).toBe(720);
  });
});

describe('a Prism take', () => {
  it('spans whole bars of the project: four in 4/4, six in 3/4', () => {
    expect(prismTakeSpan({ numerator: 4, denominator: 4 })).toBe(7680);
    expect(prismTakeSpan({ numerator: 3, denominator: 4 })).toBe(8640);
    expect(prismTakeSpan({ numerator: 6, denominator: 8 })).toBe(8640);
    expect(prismTakeSpan({ numerator: 7, denominator: 8 })).toBe(8400);
  });
});

describe("chords read from the session's clips", () => {
  const triad = (startTick: number, root: number): MidiNoteEvent[] =>
    [0, 4, 7].map((step) => ({
      note: root + step,
      velocity: 90,
      startTick,
      durationTicks: 1920,
      channel: 0,
    }));

  it('sit where the clip plays: a clip at bar 5 makes chords at bar 5', () => {
    const keys = {
      id: 'keys',
      name: 'Keys',
      type: 'midi',
      instrument: 'piano-sampler',
      trackRole: 'chords',
      midiClips: [
        {
          id: 'c5',
          startTick: 4 * 1920,
          events: [...triad(0, 60), ...triad(1920, 65)],
        },
      ],
      audioClips: [],
    } as unknown as Track;
    const regions = deriveChordRegionsFromSession([keys], 60, 'ionian');
    expect(regions.map((r) => r.startTick)).toEqual([4 * 1920, 5 * 1920]);
  });
});
