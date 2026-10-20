// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import type { LiteracyChart } from '@/curriculum/engine/musicLiteracy/chart';
import type { MidiClip } from '@/daw/store/tracksSlice';
import {
  buildBandPracticeTrack,
  type BuiltBandTrack,
} from '../bandPracticeTrack';

/**
 * A band over chords that change more than once a bar (Echo's Make Your
 * Song: a take changing at the half bar). The caller times the changes
 * (`timedChords`); the drums, the code-made bass and chords and every band
 * layer play over them. Without them, nothing changes.
 */

/** The same draws every time: the engine jitters and picks at random. */
function seeded(seed = 11) {
  let a = seed;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
/** A track's notes as data, its random ids left out. */
const plain = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (k, v) => (k === 'id' ? undefined : v)));

beforeAll(() => pairingsReady);
afterEach(() => vi.restoreAllMocks());

/** C major, a chord a bar: 1 6 4 5. */
const chart: LiteracyChart = {
  tonic: 'C',
  mode: 'major',
  harmony: 'triads',
  chords: ['1', '6', '4', '5'],
};

/** The same chart, timed a bar each. */
const perBar = {
  changes: ['C', 'Am', 'F', 'G'].map((symbol, bar) => ({
    tick: bar * 1920,
    symbol,
  })),
  length: 4 * 1920,
};

/** Two bars, each changing at the half: C F | Am G. */
const halfBars = {
  changes: [
    { tick: 0, symbol: 'C' },
    { tick: 960, symbol: 'F' },
    { tick: 1920, symbol: 'Am' },
    { tick: 2880, symbol: 'G' },
  ],
  length: 2 * 1920,
};

const TONES: Record<string, number[]> = {
  C: [0, 4, 7],
  F: [5, 9, 0],
  Am: [9, 0, 4],
  G: [7, 11, 2],
};

const STYLES = [
  ['pop-band-1', 'l1-singable'], // a captured keys part, a bass line
  ['pop-band-1', 'l2-craft'], // the lesson's own code-made bass and chords
  ['latin-band-1', 'l1-cumbia'], // comping keys and guitar, a bass line
  ['funk-band-1', 'l1-pocket'], // a captured keys part following chords
  ['hip-hop-band-1', 'l1-trap'], // hip hop's own engine, a captured bass
] as const;

async function build(
  band: string,
  variation: string,
  timedChords?: typeof perBar,
): Promise<BuiltBandTrack> {
  seeded();
  const built = await buildBandPracticeTrack({
    band,
    variation,
    chart,
    charts: [],
    ...(timedChords ? { timedChords } : {}),
  });
  vi.restoreAllMocks();
  return built!;
}

/** Every chord-playing clip of a track: its chords part and its layers'. */
const chordClips = (built: BuiltBandTrack): MidiClip[] => [
  ...(built.track.clips.chords ? [built.track.clips.chords] : []),
  ...built.track.layerClips
    .filter((l) => l.part === 'chords')
    .map((l) => l.clip),
];

/** Pitch classes struck in [from, to) by the clips. */
const struck = (clips: MidiClip[], from: number, to: number) =>
  new Set(
    clips.flatMap((clip) =>
      clip.events
        .filter((e) => e.startTick >= from && e.startTick < to)
        .map((e) => e.note % 12),
    ),
  );

describe('a band over timed chords', () => {
  it('plays a chart timed a bar each exactly as it plays the chart', async () => {
    for (const [band, variation] of STYLES) {
      const before = await build(band, variation);
      const timed = await build(band, variation, perBar);
      expect(plain(timed.track.clips), `${band} ${variation}`).toEqual(
        plain(before.track.clips),
      );
      expect(plain(timed.track.layerClips), `${band} ${variation}`).toEqual(
        plain(before.track.layerClips),
      );
      expect(timed.track.chordCycle).toEqual(before.track.chordCycle);
    }
  });

  it('follows chords that change at the half bar, in every part', async () => {
    // The same bars without their half-bar changes: C | Am.
    const wholeBars = {
      changes: [
        { tick: 0, symbol: 'C' },
        { tick: 1920, symbol: 'Am' },
      ],
      length: 2 * 1920,
    };
    for (const [band, variation] of STYLES) {
      const label = `${band} ${variation}`;
      const halves = await build(band, variation, halfBars);
      const whole = await build(band, variation, wholeBars);
      // Every part playing in a bar's second half plays something else
      // there once the chord changes at the half: drums aside, each one
      // reads the chord where it plays (band layers through chordAt).
      const parts = (built: BuiltBandTrack): [string, MidiClip][] => [
        ...(['bass', 'chords'] as const).flatMap(
          (part): [string, MidiClip][] =>
            built.track.clips[part] ? [[part, built.track.clips[part]!]] : [],
        ),
        ...built.track.layerClips
          .filter((l) => l.part !== 'drums')
          .map((l): [string, MidiClip] => [l.name, l.clip]),
      ];
      const halfNotes = (clip: MidiClip) =>
        clip.events.filter((e) => e.startTick % 1920 >= 960).map((e) => e.note);
      const before = new Map(parts(whole).map(([n, c]) => [n, halfNotes(c)]));
      for (const [name, clip] of parts(halves)) {
        const notes = halfNotes(clip);
        if (notes.length === 0) continue;
        expect(notes, `${label} ${name}`).not.toEqual(before.get(name));
      }
    }
  });

  it('voices code-made and comped chords on each half bar’s own chord', async () => {
    for (const [band, variation] of [
      ['pop-band-1', 'l2-craft'],
      ['latin-band-1', 'l1-cumbia'],
    ] as const) {
      const clips = chordClips(await build(band, variation, halfBars));
      for (let pass = 0; pass < 8; pass++) {
        const o = pass * 3840;
        for (const [from, symbol] of [
          [o, 'C'],
          [o + 960, 'F'],
          [o + 1920, 'Am'],
          [o + 2880, 'G'],
        ] as const) {
          const heard = struck(clips, from + 30, from + 960 - 30);
          expect(heard.size, `${variation} ${from}`).toBeGreaterThan(0);
          expect(
            [...heard].every((pc) => TONES[symbol].includes(pc)),
            `${variation} ${symbol} at ${from}`,
          ).toBe(true);
        }
      }
    }
  });

  it('puts the code-made bass on the new root where a chord changes', async () => {
    const bass = (await build('pop-band-1', 'l2-craft', halfBars)).track.clips
      .bass!;
    for (const [tick, root] of [
      [960, 5],
      [2880, 7],
      [3840 + 960, 5],
    ]) {
      const on = bass.events.filter((e) => Math.abs(e.startTick - tick) < 30);
      expect(on.length, `${tick}`).toBeGreaterThan(0);
      expect(
        on.every((e) => e.note % 12 === root),
        `${tick}`,
      ).toBe(true);
    }
  });

  it('puts the timed chords on the chord lane', async () => {
    const built = await build('pop-band-1', 'l1-singable', halfBars);
    const lane = built.track.chordRegions.slice(0, 5);
    expect(lane.map((r) => [r.startTick, r.endTick, r.name])).toEqual([
      [0, 960, '1 maj'],
      [960, 1920, '4 maj'],
      [1920, 2880, '6 min'],
      [2880, 3840, '5 maj'],
      [3840, 4800, '1 maj'],
    ]);
    // The chart still names the loop, a chord a bar.
    expect(built.track.chordCycle).toEqual(['C', 'Am', 'F', 'G']);
  });
});
