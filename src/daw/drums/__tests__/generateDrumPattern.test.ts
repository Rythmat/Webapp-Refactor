import { describe, expect, it } from 'vitest';
import {
  generateBars,
  generateDrumPattern,
  PAD,
  seededRandom,
  stylesForKit,
  type GrooveStyle,
} from '../generateDrumPattern';

// ── The drum grid's Generate (owner, 2026-10-22, after Soundtrap) ──────────
// A fresh groove in the kit's style: a kick on the one, the snare on the
// backbeat, a hat keeping time with accents, two bars to a phrase, in the
// song's metre. Run:
// npx vitest run src/daw/drums/__tests__/generateDrumPattern.test.ts

const FOUR_FOUR = { barTicks: 1920, beatTicks: 480 };
const at = (
  events: ReturnType<typeof generateDrumPattern>,
  note: number,
  tick: number,
) => events.find((e) => e.note === note && e.startTick === tick);

describe('generateDrumPattern', () => {
  const styles: GrooveStyle[] = [
    'rock',
    'pop',
    'funk',
    'halftime',
    'trap',
    'house',
  ];

  it.each(styles)(
    'writes a %s groove: the one, the backbeat and time',
    (style) => {
      for (let seed = 1; seed <= 20; seed++) {
        const events = generateDrumPattern({
          ...FOUR_FOUR,
          bars: 2,
          kit: 'natural',
          style,
          random: seededRandom(seed),
        });
        for (const bar of [0, 1920]) {
          expect(at(events, PAD.kick, bar)).toBeTruthy();
          const backbeats =
            style === 'halftime' || style === 'trap' ? [960] : [480, 1440];
          for (const b of backbeats) {
            expect(at(events, PAD.snare, bar + b)?.velocity).toBeGreaterThan(
              90,
            );
          }
        }
        // Every hit inside the two bars, a sixteenth long, a real velocity.
        for (const e of events) {
          expect(e.startTick).toBeGreaterThanOrEqual(0);
          expect(e.startTick).toBeLessThan(3840);
          expect(e.durationTicks).toBe(120);
          expect(e.velocity).toBeGreaterThanOrEqual(1);
          expect(e.velocity).toBeLessThanOrEqual(127);
        }
        // Something keeps time.
        const time = events.filter((e) =>
          [PAD.closedHat, PAD.openHat, PAD.ride].includes(e.note as 42),
        );
        expect(time.length).toBeGreaterThanOrEqual(8);
        // Sorted, as a clip keeps its notes.
        const ticks = events.map((e) => e.startTick);
        expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
      }
    },
  );

  it('accents the hat on the beat, softer off it', () => {
    const events = generateDrumPattern({
      ...FOUR_FOUR,
      bars: 1,
      kit: 'natural',
      style: 'pop',
      random: seededRandom(3),
    });
    const onBeat = at(events, PAD.closedHat, 480)!;
    const offBeat = at(events, PAD.closedHat, 240)!;
    expect(onBeat.velocity).toBeGreaterThan(offBeat.velocity);
  });

  it('puts House’s kick on every beat', () => {
    const events = generateDrumPattern({
      ...FOUR_FOUR,
      bars: 1,
      kit: 'house',
      random: seededRandom(9),
    });
    for (const beat of [0, 480, 960, 1440]) {
      expect(at(events, PAD.kick, beat)).toBeTruthy();
    }
  });

  it('is a new groove each time, and the same for the same seed', () => {
    const make = (seed: number) =>
      generateDrumPattern({
        ...FOUR_FOUR,
        bars: 2,
        kit: 'natural',
        random: seededRandom(seed),
      });
    expect(make(42)).toEqual(make(42));
    const distinct = new Set(
      [1, 2, 3, 4, 5].map((seed) => JSON.stringify(make(seed))),
    );
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('follows the metre: 3/4 and 6/8 bars', () => {
    const waltz = generateDrumPattern({
      barTicks: 1440,
      beatTicks: 480,
      bars: 2,
      kit: 'natural',
      style: 'rock',
      random: seededRandom(5),
    });
    expect(at(waltz, PAD.kick, 1440)).toBeTruthy();
    expect(at(waltz, PAD.snare, 480)).toBeTruthy();
    expect(waltz.every((e) => e.startTick < 2880)).toBe(true);

    // 6/8: two dotted-quarter beats, the backbeat on the second.
    const sixEight = generateDrumPattern({
      barTicks: 1440,
      beatTicks: 720,
      bars: 1,
      kit: 'natural',
      style: 'pop',
      random: seededRandom(5),
    });
    expect(at(sixEight, PAD.snare, 720)).toBeTruthy();
  });

  it('fills the clip’s bars, the phrase repeating', () => {
    const events = generateDrumPattern({
      ...FOUR_FOUR,
      bars: 4,
      kit: 'natural',
      style: 'rock',
      random: seededRandom(11),
    });
    for (const bar of [0, 1, 2, 3]) {
      expect(at(events, PAD.kick, bar * 1920)).toBeTruthy();
    }
    expect(events.every((e) => e.startTick < 4 * 1920)).toBe(true);
  });
});

describe('the styles and the length', () => {
  it('match the kit: trap for the 808, House for House, the band for the rest', () => {
    expect(stylesForKit('808')).toContain('trap');
    expect(stylesForKit('house')).toEqual(['house']);
    expect(stylesForKit('natural')).toEqual(
      expect.arrayContaining(['rock', 'pop', 'funk']),
    );
    expect(stylesForKit('my-custom-kit')).toEqual(stylesForKit('natural'));
  });

  it('is the clip’s bars, two when there is none', () => {
    expect(generateBars(0, 1920)).toBe(2);
    expect(generateBars(1920, 1920)).toBe(1);
    expect(generateBars(1921, 1920)).toBe(2);
    expect(generateBars(4 * 1920, 1920)).toBe(4);
  });
});
