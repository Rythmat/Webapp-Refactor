import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { deriveChordRegionsFromSession } from '../prismSlice';
import type { Track } from '../tracksSlice';

const BAR = 1920;
const C4 = 60;

/** One whole-bar chord (or bass note) per bar. */
const bars = (chords: number[][]): MidiNoteEvent[] =>
  chords.flatMap((notes, i) =>
    notes.map((note) => ({
      note,
      velocity: 100,
      startTick: i * BAR,
      durationTicks: BAR,
      channel: 0,
    })),
  );

const track = (name: string, events: MidiNoteEvent[]) =>
  ({
    id: name,
    name,
    type: 'midi',
    instrument: 'piano-sampler',
    trackRole: 'auto',
    midiClips: [{ id: `${name}-clip`, startTick: 0, events }],
    audioClips: [],
  }) as unknown as Track;

const analyse = (keys: number[][], bass: number[]) =>
  deriveChordRegionsFromSession(
    [track('Keys', bars(keys)), track('Bass', bars(bass.map((n) => [n])))],
    C4,
    'ionian',
  );

describe('chords named from the bass under rootless voicings', () => {
  it('reads Midnight Groove as Dm9 – G13 – Cmaj9 – Am7', () => {
    const regions = analyse(
      [
        [53, 57, 60, 64], // F A C E
        [53, 57, 59, 64], // F A B E
        [52, 55, 59, 62], // E G B D
        [52, 55, 57, 60], // E G A C
      ],
      [38, 31, 36, 33], // D G C A
    );
    expect(regions.map((r) => r.noteName)).toEqual([
      'D min9',
      'G dom13',
      'C maj9',
      'A min7',
    ]);
    expect(regions.map((r) => r.degreeKey)).toEqual([
      '2 minor9',
      '5 dominant13',
      '1 major9',
      '6 minor7',
    ]);
  });

  it('keeps an inversion as a slash chord when the bass is in the voicing', () => {
    const [region] = analyse([[60, 64, 67]], [40]); // C E G over E
    expect(region.noteName).toBe('C maj/E');
  });

  it('keeps a slash chord when the bass spells nothing from below', () => {
    const [region] = analyse([[60, 64, 67]], [38]); // C E G over D
    expect(region.noteName).toBe('C maj/D');
  });

  it('leaves a voicing that already has its root alone', () => {
    const [region] = analyse([[53, 57, 60, 64]], [41]); // F A C E over F
    expect(region.noteName).toBe('F maj7');
  });
});
