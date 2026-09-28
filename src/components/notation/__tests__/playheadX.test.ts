import { describe, expect, it } from 'vitest';
import { playheadX, systemAnchors } from '../StaffView';

/**
 * Anchors as a real system produces them: measure edges, spaced by ENGRAVED
 * width rather than by time. Bar 1 holds a whole note in 90px; bar 2 holds four
 * sixteenths and a rest in 220px. Both are 1920 ticks of music.
 */
const UNEVEN = [
  { tick: 0, x: 60 },
  { tick: 1920, x: 150 },
  { tick: 3840, x: 370 },
];

describe('playheadX', () => {
  it('reaches each barline exactly on its beat', () => {
    // The whole point: the clock and the engraving agree at every bar edge, so
    // no error builds up across the line. A straight line over the system —
    // what this used to draw — put the downbeat of bar 2 at x=215, 65px past
    // the barline the student is reading.
    expect(playheadX(UNEVEN, 0)).toBe(60);
    expect(playheadX(UNEVEN, 1920)).toBe(150);
    expect(playheadX(UNEVEN, 3840)).toBe(370);
  });

  it('sweeps evenly inside a bar, however the notes are spaced', () => {
    // Within one bar, equal slices of time cover equal distance — the sixteenth
    // run does not make the playhead bolt and the whole note does not stall it.
    for (const [from, to] of [
      [0, 1920],
      [1920, 3840],
    ]) {
      const steps = 8;
      const xs = Array.from(
        { length: steps + 1 },
        (_, i) => playheadX(UNEVEN, from + ((to - from) / steps) * i)!,
      );
      const deltas = xs.slice(1).map((x, i) => x - xs[i]);
      for (const d of deltas) expect(d).toBeCloseTo(deltas[0], 9);
    }
  });

  it('gives each bar its own speed, set by how wide it is drawn', () => {
    // Bar 2 is drawn 220px for the same 1920 ticks bar 1 spends in 90px, so the
    // playhead covers it faster. That is the engraving's doing, not a drift.
    const inBarOne = playheadX(UNEVEN, 960)!;
    const inBarTwo = playheadX(UNEVEN, 2880)!;
    expect(inBarOne).toBeCloseTo(60 + 90 / 2, 9);
    expect(inBarTwo).toBeCloseTo(150 + 220 / 2, 9);
  });

  it('starts at the system’s musical left edge and ends at its right', () => {
    expect(playheadX(UNEVEN, 0)).toBe(60);
    expect(playheadX(UNEVEN, 3840)).toBe(370);
  });

  it('clamps outside the system rather than running off the staff', () => {
    expect(playheadX(UNEVEN, -500)).toBe(60);
    expect(playheadX(UNEVEN, 99999)).toBe(370);
  });

  it('needs two anchors to place anything', () => {
    expect(playheadX([], 0)).toBeNull();
    expect(playheadX([{ tick: 0, x: 60 }], 0)).toBeNull();
  });

  it('survives a system with no duration', () => {
    expect(
      playheadX(
        [
          { tick: 0, x: 60 },
          { tick: 0, x: 200 },
        ],
        0,
      ),
    ).toBe(60);
  });

  it('survives a bar with no duration mid-system', () => {
    const anchors = [
      { tick: 0, x: 60 },
      { tick: 1920, x: 150 },
      { tick: 1920, x: 200 },
      { tick: 3840, x: 370 },
    ];
    expect(playheadX(anchors, 1920)).toBe(150);
    expect(playheadX(anchors, 2880)).toBeCloseTo(285, 9);
  });
});

/**
 * Which anchor wins at a downbeat.
 *
 * Every bar reports two: where its notes start, and where its closing edge is
 * drawn. At each downbeat but the first those share a tick, and the one that
 * survives is where the playhead sits on that beat. Beat one is engraved
 * inside the barline, so the note start is the honest answer — keeping the
 * closing edge put the playhead on the barline and left it chasing the notes.
 */
describe('systemAnchors', () => {
  /**
   * Two bars as the renderer reports them. Bar 1's notes start at 60 (after
   * the clef and key) and it closes at 146; bar 2's notes start at 164 — the
   * barline is at 150, and the gap between is the bar's left padding.
   */
  const RAW = [
    { tick: 0, x: 60 },
    { tick: 1920, x: 146 },
    { tick: 1920, x: 164 },
    { tick: 3840, x: 366 },
  ];

  it('puts the downbeat on beat one, not on the barline', () => {
    const anchors = systemAnchors(RAW);
    expect(playheadX(anchors, 1920)).toBe(164);
  });

  it('is the fix for a small constant lag, not a large one', () => {
    // The old rule kept 146. The error is the bar's left padding: never
    // accumulating, always there, and plainly visible against a notehead.
    const anchors = systemAnchors(RAW);
    const wasAt = 146;
    expect(playheadX(anchors, 1920)! - wasAt).toBe(18);
  });

  it('keeps one anchor per tick', () => {
    const ticks = systemAnchors(RAW).map((a) => a.tick);
    expect(ticks).toEqual([...new Set(ticks)]);
    expect(ticks).toEqual([0, 1920, 3840]);
  });

  it('still ends the system on its closing edge', () => {
    // The last bar's closing edge has no note start after it to be replaced by.
    expect(systemAnchors(RAW).at(-1)).toEqual({ tick: 3840, x: 366 });
  });

  it('opens on the first bar’s note start, past the clef and key', () => {
    expect(systemAnchors(RAW)[0]).toEqual({ tick: 0, x: 60 });
  });

  it('never lets x fall as time advances', () => {
    // A bar drawn narrower than its predecessor's closing edge would otherwise
    // send the playhead backwards mid-system.
    const backwards = [
      { tick: 0, x: 60 },
      { tick: 960, x: 200 },
      { tick: 960, x: 120 },
      { tick: 1920, x: 90 },
    ];
    const xs = systemAnchors(backwards).map((a) => a.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('does not mutate what it was given', () => {
    const input = RAW.map((a) => ({ ...a }));
    systemAnchors(input);
    expect(input).toEqual(RAW);
  });

  it('handles a system of one bar, and of none', () => {
    expect(systemAnchors([])).toEqual([]);
    expect(
      systemAnchors([
        { tick: 0, x: 60 },
        { tick: 1920, x: 300 },
      ]),
    ).toEqual([
      { tick: 0, x: 60 },
      { tick: 1920, x: 300 },
    ]);
  });

  it('sweeps from one downbeat to the next, crossing the barline on the way', () => {
    const anchors = systemAnchors(RAW);
    // Halfway through bar 1 in time is halfway between the two downbeats in
    // space; the barline at 150 falls inside that sweep rather than ending it.
    expect(playheadX(anchors, 960)).toBeCloseTo((60 + 164) / 2, 9);
  });
});

/**
 * Beat anchoring, from the funk bar in the bug report.
 *
 * Bar 1 of a 4/4 bass line: beat 1 is a sixteenth figure that eats half the
 * bar's width, beats 2–4 are sparse. Bar edges alone cannot describe that, and
 * the playhead sat well behind the notehead that was sounding.
 */
describe('locking the playhead to the beat', () => {
  const BAR = 1920;
  const BEAT = 480;

  /**
   * Engraved x for each beat of that bar, as the renderer reports them: the
   * bar spans 490 → 1245, but beat 1's sixteenths push beat 2 out to 780
   * rather than the 679 an even sweep would give it.
   */
  const BEATS = [
    { tick: 0, x: 490 },
    { tick: 480, x: 780 },
    { tick: 960, x: 930 },
    { tick: 1440, x: 1090 },
    { tick: BAR, x: 1245 },
  ];

  /** What the bar looked like with only its edges anchored. */
  const EDGES_ONLY = [
    { tick: 0, x: 490 },
    { tick: BAR, x: 1245 },
  ];

  it('puts every beat exactly where it is written', () => {
    const anchors = systemAnchors(BEATS);
    for (const beat of BEATS) {
      expect(playheadX(anchors, beat.tick)).toBe(beat.x);
    }
  });

  it('fixes the lag the bar-edge sweep left on a busy beat', () => {
    // The sixteenth on the last quarter of beat 1, engraved at 710. The even
    // sweep put the playhead at 632 — 78px behind the note lighting up.
    const tick = 360;
    const before = playheadX(EDGES_ONLY, tick)!;
    const after = playheadX(systemAnchors(BEATS), tick)!;
    expect(before).toBeCloseTo(631.6, 1);
    expect(after).toBe(707.5);
    // ~76px closer to the notehead at 710, which is the whole complaint.
    expect(Math.abs(after - 710)).toBeLessThan(Math.abs(before - 710) / 10);
  });

  it('gives each beat its own speed, set by how wide it is drawn', () => {
    const anchors = systemAnchors(BEATS);
    const across = (from: number) =>
      playheadX(anchors, from + BEAT)! - playheadX(anchors, from)!;
    // Beat 1 is drawn nearly twice as wide as beat 2 for the same duration.
    expect(across(0)).toBe(290);
    expect(across(480)).toBe(150);
  });

  it('still sweeps evenly between two beats', () => {
    const anchors = systemAnchors(BEATS);
    const steps = 8;
    const xs = Array.from(
      { length: steps + 1 },
      (_, i) => playheadX(anchors, (BEAT / steps) * i)!,
    );
    const deltas = xs.slice(1).map((x, i) => x - xs[i]);
    for (const d of deltas) expect(d).toBeCloseTo(deltas[0], 9);
  });

  it('never runs backwards across a bar, beat to beat', () => {
    const anchors = systemAnchors(BEATS);
    let previous = -Infinity;
    for (let tick = 0; tick <= BAR; tick += 20) {
      const x = playheadX(anchors, tick)!;
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  it('covers a beat nothing was written on by sweeping through it', () => {
    // A note tied across beat 3 leaves it with no engraved position, so it
    // gets no anchor; the sweep from beat 2 to beat 4 carries the playhead.
    const syncopated = BEATS.filter((b) => b.tick !== 960);
    const anchors = systemAnchors(syncopated);
    const x = playheadX(anchors, 960)!;
    expect(x).toBeGreaterThan(780);
    expect(x).toBeLessThan(1090);
  });
});
