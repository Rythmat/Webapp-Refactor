import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import type { ArcadeCategory } from './arcadeGames';

/** A key colour by its place round the circle of fifths (C = 0, G = 1 …). */
const key = (i: number) => KEY_RAINBOW_COLORS[i];

/**
 * Each kind of game's glow (owner, 2026-10-28: "shift the colors of that
 * background gradient with each game type"): two key colours apiece, at
 * least two keys apart so they never read as one, no two kinds sharing a
 * colour, and never A's yellow (the brand yellow's twin). Multiplayer has no
 * shelf (its one game is the featured card), so it takes the cool pair the
 * page might open on.
 */
export const CATEGORY_GLOW: Record<ArcadeCategory, readonly [string, string]> =
  {
    // Listening: sky into violet.
    'Ear Training': [key(7), key(9)],
    // Hands: orange into rose.
    Skill: [key(1), key(11)],
    // Thinking: teal into periwinkle.
    Puzzles: [key(6), key(8)],
    // Pulse: red into amber.
    Rhythm: [key(0), key(2)],
    // Sound: green into orchid.
    'Sound Lab': [key(5), key(10)],
    Multiplayer: [key(7), key(10)],
  };

/**
 * Which kind of game the page is on as it scrolls: the last shelf whose top
 * has passed `line` (a height in the viewport), or none above the first
 * (the featured card and "Jump back in", where the glow wanders freely).
 * `shelves` are in page order.
 */
export const zoneAt = (
  shelves: readonly { zone: ArcadeCategory; top: number }[],
  line: number,
): ArcadeCategory | null => {
  let zone: ArcadeCategory | null = null;
  for (const shelf of shelves) {
    if (shelf.top > line) break;
    zone = shelf.zone;
  }
  return zone;
};
