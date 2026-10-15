/**
 * The Globe's motion curves, for the animations it writes frame by frame
 * (the timeline's bands, the camera's moves). The same two curves are CSS
 * custom properties on `.atlas-root` (../index.css: `--ease-out`,
 * `--ease-in-out`) for its transitions.
 *
 * - ease-out: things entering or leaving the screen.
 * - ease-in-out: things moving or changing shape on it.
 */

/** A CSS `cubic-bezier()` as a function of time (0–1) to progress (0–1). */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  const a = (p1: number, p2: number) => 1 - 3 * p2 + 3 * p1;
  const b = (p1: number, p2: number) => 3 * p2 - 6 * p1;
  const c = (p1: number) => 3 * p1;
  const at = (t: number, p1: number, p2: number) =>
    ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t;
  const slope = (t: number, p1: number, p2: number) =>
    3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton's method for the t whose x is `x`, then its y.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = at(t, x1, x2) - x;
      const d = slope(t, x1, x2);
      if (Math.abs(dx) < 1e-5 || d === 0) break;
      t -= dx / d;
    }
    return at(Math.min(1, Math.max(0, t)), y1, y2);
  };
}

/** Entering and leaving: fast, then settling. */
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);

/** Moving on screen: gathering, then settling. */
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);
