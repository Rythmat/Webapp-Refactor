/**
 * The package's one point type.
 *
 * It lives in its own module because both the halftone lattice (screen-math) and the drawing
 * geometry need it, and neither owns the other. Declaring it in one and re-exporting from the
 * other collides under a star export — `core/index.ts` would export `Pt` twice.
 *
 * MUTABLE on purpose, not `readonly`. Upstream builds contours with `out.push([x, y])` and smooths
 * them in place; a readonly tuple would force rewrites in exactly the arithmetic that must not be
 * touched.
 */
export type Pt = [number, number];
