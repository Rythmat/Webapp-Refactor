import { describe, expect, it } from 'vitest';
import { buildScoreParts } from '@/daw/components/Score/scoreParts';
import type { Track } from '@/daw/store/tracksSlice';
import { buildScore } from '../buildScore';

const BAR = 1920;
const hit = (
  id: string,
  midi: number,
  startTick: number,
  durationTicks = 480,
) => ({
  id,
  midi,
  startTick,
  durationTicks,
});
// Four bars of kicks, then a hi-hat on the last "and" carrying a long tail.
const groove = [
  ...[0, 1, 2, 3].map((bar) => hit(`k${bar}`, 36, bar * BAR)),
  hit('hh', 42, 3 * BAR + 1680),
];

const track = (
  id: string,
  instrument: string,
  events: { note: number; startTick: number; durationTicks: number }[],
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument,
    color: '#fff',
    midiClips: [
      {
        id: `${id}-clip`,
        startTick: 0,
        events: events.map((e) => ({ ...e, velocity: 100 })),
      },
    ],
  }) as unknown as Track;

describe('no phantom bar from a drum hit near the end', () => {
  it('keeps a four-bar groove at four bars', () => {
    const score = buildScore(groove, {
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      staves: 'percussion',
    } as never);
    expect(score.measures).toHaveLength(4);
  });

  it('keeps every Score part at the song length', () => {
    const parts = buildScoreParts({
      tracks: [
        track('Piano', 'piano-sampler', [
          { note: 60, startTick: 0, durationTicks: BAR * 4 },
        ]),
        track(
          'Drums',
          'drum-machine',
          groove.map((g) => ({
            note: g.midi,
            startTick: g.startTick,
            durationTicks: g.durationTicks,
          })),
        ),
      ],
      rootNote: 0,
      mode: 'ionian',
      timeSignature: [4, 4],
    });
    expect(parts.map((p) => [p.name, p.score.measures.length])).toEqual([
      ['Piano', 4],
      ['Drums', 4],
    ]);
  });
});
