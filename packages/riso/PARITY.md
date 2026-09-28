# Parity

**The port is correct only if its output is bit-identical to upstream.** This file records what
that is measured against.

- **Pinned upstream:** `64826c4f172b0d8322453b9a4eb20ee5fe73dfdf`
- `tools/parity.ts` re-reads the clone's HEAD and **refuses to run if it has moved**. A parity
  suite that silently tracks a moving upstream is worse than none.
- **Firefox is authoritative.** Upstream's own finding: Firefox is byte-identical across runs;
  Chromium sums audio node inputs in unordered-set order and diverges by 1–2 LSB at −90 dBFS.
  Chromium is run and reported, but the gate is Firefox.

## The three engine copies are not identical

Upstream carries three copies of the engine. They differ in how bake size is handled:

|                 | `prints/workings`                | `films/window-seat`         | `studies/index`               |
| --------------- | -------------------------------- | --------------------------- | ----------------------------- |
| Constants       | `OUT=1080; K=OUT/W; PITCH=4.6*K` | `OUT=1080, K=1, PITCH=4.6`  | no `OUT`, no `K`; `PITCH=4.6` |
| `starve` radius | `(0.5 + rng()*2.0) * K`          | `(0.5 + rng()*2.0) * K`     | `0.5 + rng()*2.0`             |
| `bakePaper`     | `setTransform(K,0,0,K,0,0)`      | `setTransform(K,0,0,K,0,0)` | no transform                  |

**All three are numerically identical at `OUT = 1080`**, because `K` is exactly `1`. That is the
fact that makes the parity harness valid across variants.

**Canonical choice: `prints/workings`.** It is the only variant that keeps the resolution ladder
available — raising `OUT` to 1440 or 2160 scales `PITCH` and the starvation flecks with it, giving
the same picture larger rather than a differently-screened one. `studies/index` would have to be
re-derived to do that.

## Baseline

`tools/fixtures/studies.baseline.json` holds the canvas hashes of upstream `studies/index.html`
at each study index, in both engines. Captured from the pinned commit and cross-checked against
upstream's own `verify.mjs`, which produced identical values. The port must reproduce the
**Firefox** column exactly.

Cross-engine hashes differ (0/12 identical between Chromium and Firefox) — that is antialiasing,
not a failure, and upstream reports the same.

## Trap: the first Chromium run after a browser install is not trustworthy

A freshly downloaded Chromium builds its font and shader caches on first launch. Screenshots taken
during that window differ from the settled values, and `verify` reports every time as "not
repeatable" and "depends on seek history" — 36 failures on a 12-time run, against _upstream itself_.

Observed on 2026-09-23: the first run immediately after `playwright-core install` failed exactly
this way; every subsequent run produced hashes identical to upstream's. Firefox was unaffected —
it was byte-identical from the very first run.

**If verify fails wholesale on a machine that has just installed browsers, run it again before
investigating anything.** Firefox was unaffected.

Nor is it only the first run. A later paper-parity run reported upstream as `558d6ed564b1` where
three consecutive runs before and after it all reported `9cac5af4ea66` — the PORTED side never
moved. The flake appeared on a run that launched Firefox and Chromium in sequence in one process;
Chromium alone was stable across repeats.

This is why only Firefox failures are counted as failures by `tools/parity.ts`. Chromium is run and
reported because a consistent difference there is still informative, but it is not stable enough to
gate on, and a lone Chromium mismatch should be repeated before it is believed.

## Trap: bit-exactness holds WITHIN an engine, not across engines

ECMAScript does not require `Math.sin`, `cos`, `exp` or `pow` to be correctly rounded, and V8 and
SpiderMonkey genuinely disagree in the last bit for some arguments. Measured here:

```
Math.sin(4.4035389738229815)
  V8 (Node)           -0.9526837555152754
  SpiderMonkey (FF)   -0.9526837555152755
```

That one ulp propagates: `wobbler('launch:bird', 3)(1)` is -0.07305848424410073 in Firefox and
-0.07305848424410069 in Node. It is not a porting error, and no amount of transcription care
removes it.

Consequences, and they shape how everything is tested:

- **Integer-only results are portable** and are asserted exactly — `hash`, `mulberry32`, `rngFor`,
  and the halftone threshold tile's lattice indices.
- **Anything through a transcendental is asserted in ULPs** in Node (see
  `src/core/__tests__/ulp.ts`, tolerance 8). A real algebraic error — a re-associated expression, a
  mis-ordered reduce, a wrong constant — moves a value thousands of times further than that, so
  nothing is lost in detection power.
- **Exactness is enforced where it matters: in-browser.** `tools/parity.ts` compares upstream and
  the port in the _same_ Firefox, where both sides call the same `Math.sin`. That is the real gate.
- This also explains upstream's own `0/12 frames pixel-identical` between Chromium and Firefox.
  Cross-engine pixel differences are expected and are not failures.

## Trap: the halftone lattice has load-bearing floating-point drift

Upstream's comment says a screen tile "holds exactly a^2+b^2 dots". Measured, it does not:

| ink             | {a,b} | a^2+b^2 | actual dots |
| --------------- | ----- | ------- | ----------- |
| yellow          | {1,0} | 1       | 1           |
| green / indigo  | {1,1} | 2       | **4**       |
| orange / violet | {2,1} | 5       | 5           |
| blue / pink     | {4,1} | 17      | **19**      |

The cause is in `buildScreenTile`. It computes

```js
const P = S / Math.sqrt(n);
const u = P / Math.sqrt(n); // NOT S / n
```

For green, `7/sqrt(2)/sqrt(2)` is `3.4999999999999996`, not `3.5`. Over the lattice that drift
accumulates, so points that should land exactly on the tile edge at `0` land at
`6.999999999999998` instead, and the epsilon dedupe (`Math.abs(dx) < 0.01`) keeps them as separate
points:

```
green pts = [[0, 2e-15], [3.5, 3.500000000000002], [6.999999999999998, 0], [0, 6.999999999999998]]
```

**An implementation that computes `u = S / n` is more correct mathematically and produces a
different picture.** So does one that dedupes exactly, or with a Map key, or that rounds before
comparing. This is the clearest example in the codebase of why the rule is transcribe, not improve

- the "bug" is part of the artwork.

`pts.length` is therefore part of the golden fixture, not an incidental. The threshold field itself
is unaffected (`wrapped` carries the +/-S neighbours, so the nearest-dot distance is the same either
way), but anything that iterates `pts` would diverge.

## Known intentional divergences from upstream

None yet. Every divergence must be recorded here with the exact upstream line and a justification.

## Trap: screenshot the canvas, not the viewport

`frameAt` screenshots `locator('canvas')`, deliberately. Upstream's films style their canvas to fill
the viewport, so for them a page shot and a canvas shot are the same image — but a harness with a
scrubber, a clock and a background around the canvas produces a completely different page shot.

Comparing those, every parity check fails at every time, with a total mismatch rather than a subtle
one, and the engine is not at fault. Observed here: `paper` compared as `7458b3b4ae56` vs
`f3fcb46d4bdb` until the screenshot was narrowed to the element, after which both sides read
`7458b3b4ae56`.

A total mismatch across every frame is a symptom of the wrong capture region. A real engine
divergence usually shows up in some frames and not others.
