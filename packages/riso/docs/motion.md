# Motion

How motion behaves within and across shots (mass, anticipation, handoffs, loops, tone on moving
elements); read it when animating anything.

Subject/camera/transition separation and long edits: [visual-development.md](visual-development.md).
Distance travel, speed units and shared geometry: [scene-space.md](scene-space.md). Scoring:
[sound.md](sound.md). Transition and loop lessons come from rendered revisions of
[Lumen](../films/lumen/FILM.md). Unproved techniques are labelled.

## The motion kit

[studies/index.html](../studies/index.html) has a `── motion kit ──` block right after the craft
kit; copy both. It depends on `clamp`, `lerp`, `cv`, `W`, `TAU`, `INK`, `REG`, `paper`,
`dotPattern`, `scratch`/`sx`, `wobbler`. The engine already has `easeOutCubic`,
`easeInOutCubic`, `easeOutBack`, `easeInQuad`, `lerp`, `clamp`.

|                                   |                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `phase(t, t0, dur)`               | local 0..1, clamped; every timed event starts here                             |
| `hold(t, step)`                   | quantise time; on twos is `2/fps` (1/12 at 24 fps, 1/15 at 30); unproved style |
| `easeOutQuad(u)`                  | leaves fast, then coasts                                                       |
| `settle(u, {bounces, damp})`      | mass arriving and ringing down, landing exactly on 1                           |
| `wander(key, hz, harmonics)`      | smooth deterministic variation in `t`, period `1/hz`                           |
| `bandPass(ctx, ink, opts, bands)` | spatial tone on a live element, as stepped dot screens                         |
| `relight(ctx, ink, bands)`        | return the printed ground to paper under a live light                          |

## Determinism is not continuity

- A frame is a pure function of `t`. Carried state breaks the contract and `verify.mjs` catches
  it, including consecutive repeats (a stateful two-frame cycle once hid behind a repeated sample
  list).
- A per-frame rng keeps each frame repeatable, so nothing catches it, but texture crawls. Vary in
  `t`, never frame count. `wander(key, hz)` is a sine stack sampled at `t`, periodic in `1/hz`,
  so driven elements loop too. Separate parts need separate keys or they breathe together.
- `cut(pts, rngFor(key), …)` re-seeds identically each frame, so a contour with moving points
  keeps a stable edge; a per-frame rng would boil it.
- A modulo reset or missing outgoing cue is repeatable, passes `verify.mjs`, and still jumps in
  playback. Inspect neighbouring times, not just repeated seeks.

Seek-history traps that `verify.mjs` caught:

- Per-frame derived state (a mound height, a camera) must be computed at the top of the frame.
  A global set part-way through lets an earlier reader use the previous frame's value.
- In Chromium, `filter: blur()` on a GPU canvas, and `drawImage` between GPU and CPU canvases, were
  not bit-exact across runs. Give scratch canvases `willReadFrequently` and cache with
  `getImageData`/`putImageData`.

## Easing is a claim about mass

Study 9. Left: one curve for everything, so stone and leaf fall together and stop dead, like a
lift. Right: the stone accelerates (`easeInQuad`), lands early and hard, throws grit; the leaf is
at terminal velocity throughout and still airborne at the end.

- The difference is arrival and what it disturbs. Over ten cells linear and quadratic look
  alike; what reads is who lands first and what the ground does.
- A drop from rest is quadratic (`easeInQuad`). `easeOutQuad` is stylized coasting, not a throw:
  a thrown object's axes differ; `Space.ballistic` gives analytic acceleration. The leaf's
  near-linear descent with swing approximates drag, it is not simulated.
- A pendulum swing is a sine. `wander` is for things with no restoring force: flame, smoke,
  water, cloth.
- `easeInOutCubic` everywhere reads as a slideshow; right for a camera or iris, wrong for weight.
- Easing a radius grows area as its square, so front-loaded curves flash instead of opening:
  `easeOutCubic` and `easeOutBack` are two-thirds done in their first third. Start iris reveals
  on `easeInOutCubic`, then judge area growth and remaining read time; a ring on the leading edge
  helps the eye. No one duration fits every shot.

## Transitions carry the eye

- Choose what the eye follows first: shared centre, contour, direction or moving edge. Give the
  incoming subject time to read. A sparse image can be a breath while motion continues;
  repeatedly clearing to paper and opening another iris makes each world a restart. Paper holds
  and hard cuts are fine when they serve the passage.
- Overlapping reveals end the outgoing cue at the incoming mask's full coverage:
  `out.end = next.start + next.open`, with `open` spanning the whole reveal. Check corners and
  off-screen travel. Keep drawing the outgoing scene outside the mask until coverage completes;
  an incoming pass that clears outside its mask defeats the overlap. Inside, repaint paper before
  multiplying ([riso-plates.md](../.claude/rules/riso-plates.md)).
- Motion across several cues runs on one clock: drive a tightening lens, camera path or carried
  subject from passage time so changing content can't restart radius, position or velocity.
  Lumen's `memoryRadius(t)` replaced per-shot radii that visibly jumped. Local scene time only
  when a new action actually begins.
- Switching motion regimes (keyed to held, free to attached) must match position and velocity.
  Held's catch kinked where a keyed fall handed to an ease from rest. Key with velocities
  (`hk`, `Space.hermite`), start from the previous state, put contacts where geometry actually
  crosses, and blend over a few frames.

## Loops and recycled marks

`v = fract(t * hz + offset)` wraps a number, not the picture: a visible element positioned by `v`
teleports when `v` hits zero (Lumen's tide filaments did, despite deterministic seeking). Choose:

- periodic geometry with matching position and velocity at the ends;
- recycle while fully outside the visible clip;
- fade out before the wrap and in after; line work fades alpha and width, coverage fixed.

```js
const fract = (x) => x - Math.floor(x); // also handles negative phase offsets
const smooth01 = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
const v = fract((t - origin) * hz + offset);
const edge = 0.2; // tune to the mark's travel and spacing
const life = smooth01(v / edge) * smooth01((1 - v) / edge);
// alpha = baseAlpha * life; width = baseWidth * life
```

Value and slope reach zero at both ends. Stagger carriers so fades don't empty the stream at once;
keep each mark's seeded identity. A seam hidden by the first shot's length can appear when the
scene is reused in a recollection or longer hold.

## Anticipation and follow-through

Study 10. Two birds leave one branch and arrive together. Left: steady translation; the branch
never notices. Right: the bird gathers, pays for the delay with speed, and the branch carries the
departure after it has gone.

- Anticipation is a pose and a phase, not an easing curve (on the travel it's a shape sliding
  backwards). The kit deliberately has no `easeInBack`; its comment says why.
- Follow-through lives in the disturbed environment or loose parts. A spring suits a flexible
  branch; not every stop needs a bounce.
- Loaded and unloaded rest differ: bowed under the bird, straight after. That offset makes the
  whip read as release, not wobble. The branch is `settle(u, {bounces: 3, damp: 4.2})`.
- Put follow-through on something big: a reed tip moving 70 px on a 13 px stem read as nothing at
  strip scale.
- Loose parts on a moving holder (tail, slack line, strands) need dynamics, with the holder's
  position a function of `t`. Short strands: convolve its past acceleration (~0.7 s at 60 Hz)
  with a damped pendulum's impulse response, so they overshoot and settle. Ropes: integrate a
  Verlet chain once at load, record at 60 Hz, interpolate ([Held](../films/held/FILM.md)
  `simChain`, `gripAt`). A velocity lean never overshoots; resampling the holder's past path
  jumped whenever it spun.
- An early exit leaves dead cells; time exits to clear frame at the end of the shot.

## Tone on a moving element

`inkPass` screens a pass at one flat coverage, so a gradient in it prints as constant-size dots at
varying opacity, i.e. smooth ink; `shade()` can't reach moving things.

**`bandPass`**: regions at quantised coverages, lightest first, so the dot steps up across the
form. Study 11: one flame, flat pass left, four bands right.

- Four steps read as a ramp at 1080. `dotPattern` quantises to 1/16; bands closer than 0.06 are
  the same band twice.
- Each band clears what earlier bands left, so coverage 0 is a knockout: a live highlight back to
  paper (the flame's white core).
- One full-canvas pattern fill per band: reserve it for the one element both moving and modelled.

**`relight`**: live passes multiply, so a bright element on a printed night must remove the night
first; pale ink straight over it prints mud (study 11 left).

- The opening is banded too; a soft mask fades dots in opacity instead of shrinking them (smooth
  ink again; the first radial-gradient version was rebuilt).
- Bands union: `dotPattern` grows one grid, lower coverage a strict subset of higher. Cut the
  opening on the screen of the ink about to print over it, or the grids beat.
- It returns paper over everything already drawn, baked included; what must survive inside is
  drawn after (study 11's logs are live for that reason).
- The nearest plane occludes light: knock the foreground out of every opening and glow band so the
  fire doesn't erase its ground.

## Live plates: when most of the frame moves

For frames mostly in motion with tone (parallax landscapes, blurred foregrounds, moving sky
gradients) use per-pixel live plates, as in `compose()` in
[films/window-seat/index.html](../films/window-seat/index.html). Each frame draws continuous
coverage as alpha into one CPU canvas per ink (`willReadFrequently`), thresholds per pixel against
a page-pinned table, and multiplies onto paper: gradients print as dot size and the screen can't
swim. Four plates cost ~110 ms/frame at 1080 in Firefox: export is fine, playback well below 30 fps.

- Build each ink's threshold table once: screen distance field, low-frequency mottling,
  starvation flecks (255 = never prints), per-pixel jitter. Yellow's 5 px tile holds few levels;
  a smooth shift crossed them in hard blotches until jittered.
- Own a value with destination-out then `lighter` at the coverage: old·(1−α) + cov·α. With
  source-over second, soft and smeared edges printed lighter than both neighbours.
- Motion blur: n shutter samples into a mask with `lighter` at 1/n; full coverage survives where
  the shape stays, the smear fades. Shutter distance comes from the film's distance clock.
- Draw the pinned interior (frame, wall, props) after the view through an evenodd aperture.
- Reflection (`reflectPlates`): copy coverage above the waterline, flipped, in 3 px slices with a
  sine x-offset; screened afterwards, so it can't swim.
- Hidden switch (`veil`): push every plate toward one colour; at D = 1 the view is uniform and the
  scene can change underneath (fog, rain haze), as can a passing object filling the window.
- Drops on glass: snapshot the plates, draw each drop's region inverted and minified in its clip.
  Drive runs by distance travelled, so drops stream at speed and fall straight when stopped. At
  4.6 px pitch, drops under ~8 px radius read as dirt.
- Fireworks: each spark analytic from burst age with drag and gravity, into a mask that knocks out
  the night before inking. Star trails are arcs of length ω·(t − t0).
- Sun glitter on water ([Roost](../films/roost/FILM.md)): glints switching on and off at
  5.3 rad/s were reported as flashing, and printed over the reflected flock. Keep glints at full
  ink and grow or shrink them over about 2 s; fading 1 px dashes by coverage drops them below the
  screen. Mirror the subject into its own mask with the water's ripple and cut that from the glint
  mask.

Cost. A character film on five live plates ran 90–200 ms/frame in Firefox, of which screening was
only ~16 ms. Unbuffered in-page playback at that cost was reported as "choppy" before the art was
judged; the generated player now buffers slow films (tools/new-riso.mjs). Before optimising,
wrap the named draw functions and time a few sequential seeks per shot. What paid off:

- `ctx.filter = 'blur()'` processes the whole canvas. Blur each soft shape once into a scratch
  canvas limited to its padded bounding box, then stamp that mask on every plate at its coverage.
- Many similar strokes (strands, hairs): batch back-to-front groups into one path per pass;
  weaving survives between groups and a hundred strands cost a few dozen fills.
- A shot's static backdrop: draw it once, keep `getImageData` copies of the plates and
  `putImageData` them back on later frames of that shot. The copy is exact, so seeks stay pure.

## Judging motion

Inspect strips, not frames, and read the spacing between cells: even spacing is the tell. Ten
cells per second suits a one-second action; on a hold grid shoot at 1/24 or 1/30 so grid and
sampling don't coincide.

```
node shoot.mjs ../studies/index.html --range 9:9.9:0.1 --sheet --cols 5 --cell 300
node shoot.mjs ../films/<name>/index.html --range 6.6:6.9:0.0333333333 --sheet --engine firefox
```

- Find transitions on coarse sheets, then sample each handoff and visible wrap at the delivery
  frame interval, just before and after. Derive wraps from the real global-to-local time mapping;
  an act boundary list misses loops inside a shot.
- `shoot.mjs` rounds filenames to milliseconds; save sub-millisecond pairs separately.
- A cropped pixel diff locates a reset; compare it with neighbouring motion rather than demanding
  identical frames. Check the same moment in the encoded MP4.
- Flicker is measured, not eyeballed: count the pixels that change between adjacent frames inside
  the region (Roost's glitter: 5.4% → 0.1%). A before/after crop that looks identical may simply
  miss the effect.
- Choppiness is measured, then watched in a silent range render; sheets can't show it. Report
  each moving point's largest frame-to-frame jump relative to its neighbours (Held's
  `jitter.mjs`: tail 31.0 → 4.6 px); remaining maxima should be physical events, not jumps.
- Is a part really still? Diff two frames and print the bounding box: an apparently moving half
  was the other half's branch crossing the midline.
- Is a seam real? Sample the column: a bright horizon band was ordinary halftone alternating
  `(43,45,125)` and `(238,232,222)`. Same trap as [judging a frame](drawing.md#judging-a-frame).

```
python -c "from PIL import Image, ImageChops; import numpy as np; a=Image.open('a.png').convert('L'); b=Image.open('b.png').convert('L'); n=np.array(ImageChops.difference(a,b)); ys,xs=np.where(n>40); print(xs.min(), xs.max(), ys.min(), ys.max())"
```

## Studies and gaps

Studies 9–11 (one second each, A/B in one frame): **weight**, one curve vs the curve each mass
implies; **launch**, simply leaving vs anticipation and a swinging branch; **flame**, one flat
coverage vs stepped bands on an opened ground.

- `hold()` is unproved: nothing animates on a grid.
- No study covers entering and leaving frame, or a live water surface.
- Study 11's flame silhouette is a tent; its claim is tone on a moving element, and the contour is
  the weak half.
