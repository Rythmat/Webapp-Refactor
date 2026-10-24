import { echoRandom } from '@/curriculum/engine/echo/random';

/**
 * Runs `fn` with `Math.random` replaced by a seeded source (mulberry32,
 * echo/random.ts), and puts the real one back after, even when `fn` throws.
 * For engines that reach for `Math.random` deep inside (the backing patterns'
 * jitter, a groove's humanize) when a caller needs the same notes from the
 * same seed: a Studio prompt's song, its tests.
 *
 * Synchronous only: an `await` inside `fn` would hand the seeded source to
 * whatever else runs meanwhile.
 */
export function withSeededRandom<T>(seed: number | string, fn: () => T): T {
  const real = Math.random;
  Math.random = echoRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}
