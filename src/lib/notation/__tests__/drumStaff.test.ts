import { describe, expect, it } from 'vitest';
import { buildScore } from '..';
import type { NotationScore } from '../types';

const hit = (midi: number, startTick: number, durationTicks = 120) => ({
  id: `${midi}:${startTick}`,
  midi,
  startTick,
  durationTicks,
});

/** "8:f4 8r" per bar, for one voice of the drumset staff. */
function show(score: NotationScore, voice = 0) {
  return score.measures
    .map((m) =>
      (m.staves.percussion?.[voice]?.items ?? [])
        .map((item) => {
          const value = `${item.value}${item.dots ? '.' : ''}`;
          if (item.kind === 'rest') {
            return item.wholeMeasure
              ? 'W'
              : `${value}r${item.hidden ? '?' : ''}`;
          }
          const keys = item.keys
            .map(
              (k) =>
                `${k.letter}${k.octave}${k.notehead && k.notehead !== 'normal' ? `/${k.notehead}` : ''}`,
            )
            .join('+');
          return `${value}:${keys}${item.tieToNext ? '~' : ''}`;
        })
        .join(' '),
    )
    .join(' | ');
}

// Kick 36, snare 38, closed hi-hat 42.
const backbeat = (bar: number) => [
  ...[0, 240, 480, 720, 960, 1200, 1440, 1680].map((t) => hit(42, bar + t)),
  hit(36, bar + 0),
  hit(36, bar + 960),
  hit(38, bar + 480),
  hit(38, bar + 1440),
];

describe('drumset staff', () => {
  it('writes hands up and feet down', () => {
    const score = buildScore(backbeat(0), {
      staves: 'percussion',
      minMeasures: 1,
    });
    expect(score.staves).toEqual(['percussion']);
    // Hi-hat eighths with the snare on 2 and 4, as a drum chart reads.
    expect(show(score, 0)).toBe(
      '8:g5/x2 8:g5/x2 8:c5+g5/x2 8:g5/x2 8:g5/x2 8:g5/x2 8:c5+g5/x2 8:g5/x2',
    );
    expect(show(score, 1)).toBe('q:f4 qr? q:f4 qr?');
  });

  it('keeps triggers that carry no length', () => {
    // Pad hits and imported grooves often store zero-length notes; they still
    // sound, so they still have to be written.
    const score = buildScore(
      backbeat(0).map((h) => ({ ...h, durationTicks: 0 })),
      { staves: 'percussion', minMeasures: 1 },
    );
    expect(show(score, 0)).toBe(
      '8:g5/x2 8:g5/x2 8:c5+g5/x2 8:g5/x2 8:g5/x2 8:g5/x2 8:c5+g5/x2 8:g5/x2',
    );
  });

  it('never ties a hit across the barline', () => {
    const score = buildScore([...backbeat(0), ...backbeat(1920)], {
      staves: 'percussion',
      minMeasures: 2,
    });
    const hands = show(score, 0);
    expect(hands).not.toContain('~');
    expect(hands.split(' | ')).toHaveLength(2);
  });

  it('writes a kick-only bar in the main voice', () => {
    const score = buildScore([hit(36, 0), hit(36, 960)], {
      staves: 'percussion',
      minMeasures: 1,
    });
    expect(show(score, 0)).toBe('q:f4 qr q:f4 qr');
  });
});
