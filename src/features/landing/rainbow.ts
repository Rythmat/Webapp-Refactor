import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import type { ColorIndex } from '@/daw/prism-engine/types';

/**
 * The 12 key-center colors in circle-of-fifths order (C, G, D … F): the
 * landing's decorative rainbow. Same values as `KEY_CENTERS` (music.ts), read
 * straight from the color table so eagerly loaded shells (the auth pages)
 * don't pull in the theory engine.
 */
export const KEY_RAINBOW_COLORS = Array.from({ length: 12 }, (_, i) => {
  const [r, g, b] = KEY_COLORS[(i + 1) as ColorIndex];
  return `rgb(${r}, ${g}, ${b})`;
});

/** The rainbow as a left-to-right CSS gradient. */
export const KEY_RAINBOW = `linear-gradient(to right, ${KEY_RAINBOW_COLORS.join(', ')})`;
