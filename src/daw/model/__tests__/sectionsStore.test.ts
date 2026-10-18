import { beforeEach, describe, expect, it } from 'vitest';
import { leadSheetSectionsOf, useStore } from '@/daw/store';
import type { SongSection } from '../sections';

// ── The store's section actions ────────────────────────────────────────────
// The Lead Sheet's and the Score's section marks go through the sections
// slice (milestone 2.13): a new mark after the last section runs to the end
// of the song, and a removed mark gives its bars back to the section before,
// so the sheet looks as it did. These drive the store directly.

const BAR = 1920; // a bar of 4/4

const s = () => useStore.getState();

/** Each section as `label from-to`, in bars. */
const spans = () =>
  s().sections.map((x) => `${x.label} ${x.startTick / BAR}-${x.endTick / BAR}`);

const bars = (
  id: string,
  label: string,
  type: SongSection['type'],
  from: number,
  to: number,
): SongSection => ({
  id,
  type,
  label,
  startTick: from * BAR,
  endTick: to * BAR,
});

/** A chord region a bar long at each of bars [0, count). */
const chords = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `chord-${i}`,
    startTick: i * BAR,
    endTick: (i + 1) * BAR,
    name: '1 maj',
    noteName: 'C maj',
    color: [1, 1, 1] as [number, number, number],
  }));

/** A track holding one MIDI clip over bars [0, to). */
const melody = (to: number) => ({
  id: 'melody',
  midiClips: [
    { id: 'clip', startTick: 0, durationTicks: to * BAR, events: [] },
  ],
  audioClips: [],
});

beforeEach(() => {
  useStore.setState({
    sections: [],
    tracks: [],
    chordRegions: [],
    leadSheetBars: null,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
  } as never);
});

describe('markSectionAtBar', () => {
  it('runs a mark after the last section to the end of the last clip, past the chord chart', () => {
    useStore.setState({ tracks: [melody(16)] } as never);
    s().markSectionAtBar(0, 'A');
    expect(spans()).toEqual(['A 0-16']);
    s().markSectionAtBar(8, 'B');
    expect(spans()).toEqual(['A 0-8', 'B 8-16']);
  });

  it('gives the same sections whichever mark comes first', () => {
    useStore.setState({ tracks: [melody(16)] } as never);
    s().markSectionAtBar(8, 'B');
    s().markSectionAtBar(0, 'A');
    expect(spans()).toEqual(['A 0-8', 'B 8-16']);
  });

  it('runs to the end of the chord chart when it is longer than the clips', () => {
    useStore.setState({
      tracks: [melody(4)],
      chordRegions: chords(12),
    } as never);
    s().markSectionAtBar(0, 'Verse');
    expect(spans()).toEqual(['Verse 0-12']);
  });

  it('counts an audio clip too', () => {
    useStore.setState({
      tracks: [
        {
          id: 'audio',
          midiClips: [],
          audioClips: [{ id: 'take', startTick: 0, duration: 10 * BAR }],
        },
      ],
    } as never);
    s().markSectionAtBar(2, 'Intro');
    expect(spans()).toEqual(['Intro 2-10']);
  });
});

describe('removeSectionAtBar', () => {
  it('toggling a mark on and off leaves the sections and the sheet as they were', () => {
    const before = [
      bars('v', 'Verse', 'verse', 0, 8),
      bars('c', 'Chorus', 'chorus', 8, 16),
    ];
    useStore.setState({ chordRegions: chords(16), sections: before } as never);
    const marks = leadSheetSectionsOf(s());
    s().markSectionAtBar(4, 'A');
    s().removeSectionAtBar(4);
    expect(s().sections).toEqual(before);
    expect(leadSheetSectionsOf(s())).toEqual(marks);
  });

  it('keeps the song as long when the last mark goes', () => {
    useStore.setState({
      chordRegions: chords(4),
      sections: [
        bars('v', 'Verse', 'verse', 0, 4),
        bars('o', 'Outro', 'outro', 4, 12),
      ],
    } as never);
    s().removeSectionAtBar(4);
    expect(spans()).toEqual(['Verse 0-12']);
  });
});
