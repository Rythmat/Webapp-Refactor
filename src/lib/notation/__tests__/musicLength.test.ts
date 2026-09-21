import { describe, expect, it } from 'vitest';
import { buildScore } from '..';

// A score is as long as the music that was played. Quantizing moves notes
// onto the grid; it must never add a bar nobody played in. The demo loops
// push their last kick and hi-hat five ticks ahead of the loop point — the
// next pass's downbeat, played early for feel — and that used to invent an
// empty fifth bar in a four-bar song.

const BAR = 1920;
const hit = (midi: number, startTick: number, durationTicks = 0) => ({
  id: `${midi}:${startTick}`,
  midi,
  startTick,
  durationTicks,
});
const note = (midi: number, startTick: number, durationTicks: number) => ({
  id: `n${midi}:${startTick}`,
  midi,
  startTick,
  durationTicks,
});

/** Every note the score writes, as `bar:tick`, drawn or held. */
function writtenStarts(score: ReturnType<typeof buildScore>): string[] {
  return score.measures.flatMap((m) =>
    Object.values(m.staves)
      .flat()
      .flatMap((voice) => voice.items)
      .filter((item) => item.kind === 'note' && !item.tieFromPrev)
      .map((item) => `${m.index}:${item.startTick}`),
  );
}

describe('how long a score is', () => {
  it('does not add a bar for a hit pushed onto the loop point', () => {
    // Four bars of kicks on the downbeat, then a kick and open hat five ticks
    // before bar 5 — exactly what First Light and Sunset Keys hold.
    const loop = [0, 1, 2, 3].map((bar) => hit(36, bar * BAR));
    const score = buildScore(
      [...loop, hit(36, 4 * BAR - 5), hit(46, 4 * BAR - 5)],
      {
        staves: 'percussion',
        minMeasures: 4,
      },
    );
    expect(score.measures).toHaveLength(4);
  });

  it('works out the length the same way with no minimum given', () => {
    const score = buildScore(
      [hit(36, 0), hit(36, 3 * BAR), hit(36, 4 * BAR - 5)],
      { staves: 'percussion' },
    );
    expect(score.measures).toHaveLength(4);
  });

  it('keeps every hit that falls inside the music', () => {
    const loop = [0, 1, 2, 3].map((bar) => hit(36, bar * BAR));
    const score = buildScore([...loop, hit(36, 4 * BAR - 5)], {
      staves: 'percussion',
      minMeasures: 4,
    });
    // The four downbeats survive; only the push past the end is let go.
    expect(writtenStarts(score)).toEqual(['0:0', '1:1920', '2:3840', '3:5760']);
  });

  it('still writes the bar when a longer piece carries on past it', () => {
    // Eight bars of music: the same push now lands on a real downbeat.
    const score = buildScore([hit(36, 0), hit(36, 4 * BAR - 5)], {
      staves: 'percussion',
      minMeasures: 8,
    });
    expect(score.measures).toHaveLength(8);
    expect(writtenStarts(score)).toContain(`4:${4 * BAR}`);
  });

  it('gives a held note the bar it actually sounds into', () => {
    // A chord struck late in bar 4 and held across the barline really is
    // played into bar 5, so bar 5 belongs in the score.
    const score = buildScore([note(60, 0, 480), note(64, 4 * BAR - 480, 960)], {
      staves: 'treble',
      minMeasures: 4,
    });
    expect(score.measures).toHaveLength(5);
  });

  it('never writes a note past the final barline', () => {
    // Ends that quantize a little long are trimmed to the end of the music.
    const score = buildScore([note(60, 0, 480), note(62, 4 * BAR - 240, 238)], {
      staves: 'treble',
      minMeasures: 4,
    });
    expect(score.measures).toHaveLength(4);
    const last = score.measures[3].staves.treble.flatMap((v) => v.items);
    const end = Math.max(...last.map((i) => i.startTick + i.durationTicks));
    expect(end).toBeLessThanOrEqual(4 * BAR);
  });
});
