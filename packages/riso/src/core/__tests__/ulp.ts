/**
 * Distance between two doubles measured in representable steps (ULPs).
 *
 * Needed because the golden fixtures are captured in Firefox but these tests run in Node. ECMAScript
 * does not require `Math.sin`/`cos`/`exp`/`pow` to be correctly rounded, and V8 and SpiderMonkey do
 * disagree in the last bit for some arguments — e.g. `Math.sin(4.4035389738229815)` is
 * -0.9526837555152754 in V8 and -0.9526837555152755 in SpiderMonkey.
 *
 * So: integer-only results (hash, mulberry32) are asserted exactly, and results that pass through a
 * transcendental are asserted to within a few ULPs. A genuine algebraic error — a re-associated
 * expression, a wrong constant, a mis-ordered reduce — moves a value by far more than this, so the
 * tolerance costs nothing in detection power. Exactness against upstream is enforced where it
 * actually matters, in-browser, by tools/parity.ts.
 */

const buf = new ArrayBuffer(8);
const f64 = new Float64Array(buf);
const i64 = new BigInt64Array(buf);

/** Monotonic ordering of doubles as signed magnitude, so subtraction counts steps. */
const ordinal = (x: number): bigint => {
  f64[0] = x;
  const bits = i64[0];
  return bits < 0n ? -9223372036854775808n - bits : bits;
};

export function ulpDiff(a: number, b: number): number {
  if (Object.is(a, b)) return 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  const d = ordinal(a) - ordinal(b);
  return Number(d < 0n ? -d : d);
}
