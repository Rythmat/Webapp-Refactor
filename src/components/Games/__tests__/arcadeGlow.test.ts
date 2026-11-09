import { describe, expect, it } from 'vitest';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { CATEGORY_ORDER } from '../arcadeGames';
import { CATEGORY_GLOW, zoneAt } from '../arcadeGlow';

describe("the Arcade's glow", () => {
  it('gives each kind of game its own two colours, never A’s yellow', () => {
    const shelves = CATEGORY_ORDER.filter((c) => c !== 'Multiplayer');
    const used = shelves.flatMap((c) => CATEGORY_GLOW[c]);
    expect(new Set(used).size).toBe(used.length);
    for (const [a, b] of Object.values(CATEGORY_GLOW)) expect(a).not.toBe(b);
    expect(used).not.toContain(KEY_RAINBOW_COLORS[3]);
  });

  it('takes the kind of the last shelf scrolled past the line, none above the first', () => {
    const shelves = [
      { zone: 'Ear Training', top: 100 },
      { zone: 'Skill', top: 900 },
      { zone: 'Puzzles', top: 1700 },
    ] as const;
    expect(zoneAt(shelves, 50)).toBeNull();
    expect(zoneAt(shelves, 450)).toBe('Ear Training');
    expect(zoneAt(shelves, 900)).toBe('Skill');
    expect(zoneAt(shelves, 5000)).toBe('Puzzles');
  });
});
