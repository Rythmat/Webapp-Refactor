# Quality bar

The measured print qualities behind the riso look, the failure modes to check, and the review
cases and evidence for judging visual work; read it when reviewing a frame, film or technique.

## The reference

Measured with ffmpeg and extracted frames from a community recreation of Kevin Ngo's riso
animation. It covers print finish only; subject, staging and action are in
[visual-development.md](visual-development.md). Its story is the optional
[Resonance form](forms/resonance.md).

| Duration | Frame                                 | Audio                           | Video bitrate |
| -------- | ------------------------------------- | ------------------------------- | ------------- |
| 28.32 s  | 1080×1080, 30 fps, h264 High, yuv420p | AAC LC, 48 kHz stereo, 128 kb/s | 3260 kb/s     |

1080 is 720 CSS px at devicePixelRatio 1.5; a 1080 backing store matches it pixel-for-pixel,
which matters because halftone pitch is in device pixels.

- **Restraint more than texture.** On a 2 fps sheet about a third of cells are blank cream with
  one ripple and a 24 px dot; the montage earns density by being surrounded by emptiness. That is
  this piece's proportion, not a quota: dense frames work when focus and movement stay clear, and
  a held sparse scene can give restraint while motion continues.
- **Darks are overprints.** At 2× a near-black kettle handle is green and red multiplied, red
  fringing its left edge where plates miss. No `#000` anywhere.
- **Each ink keeps its screen angle.** Green wall and red kettle show visibly different diagonal
  lattices. Pitch ~4–5 px at 1080 (by eye from the 2× crop). Mid-tones show paper between dots;
  only true solids close up.
- **Starvation is load-bearing.** Light voids speckle the dark handle; the flat red is mottled.
  Perfect solids look laser-printed.
- **Small contours sell registration.** At 3× the indigo centre dot has a fluorescent pink
  crescent escaping lower-left, ~2–3 px at 1080, and is not a true circle. Any subject's contours
  can carry this cue.
- **Paper is cloudier than "subtle grain":** warm cream, blotchy mottling and fibre flecks at low
  but readable contrast, static all film so it never flickers.
- **Lettering is a variable-width monoline script:** connected italic, thick downstrokes, thin
  joins, tapered ends, pink-plate offset, drawn as stroke paths revealed along their length.

## Failure modes

Check at the film's own boundaries; handoffs and wraps per [motion.md](motion.md#judging-motion),
mix per [sound.md](sound.md).

- An intentionally fixed anchor drifting (deliberate movement stays free).
- Texture swimming: grain or halftone recomputed per frame instead of pinned to the object; any
  `Math.random()` in render causes it.
- A scene too busy to read as a silhouette in 0.25 s; at montage speed unreadable is wasted.
- Pops at cuts where a scene's first frame differs from its settled state.
- Three inks stacking to undifferentiated brown.

## Review cases

Representative tasks for testing a change to a skill or technique, not a suite run on every
request. Keep prompt, sources, comparison images, code and notes so improvements are inspectable.

| Case                     | Brief                                                                           | Failure to look for                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Short abstract film      | Magical, smooth 28 s piece; paired-dot form allowed.                            | Dropping a successful requested motif for originality; flashes, wrapping strips, no readable arrival.                            |
| Long technological story | 60–90 s of computing to new tools; detailed assets; visual-only animatic first. | Equal-length noun slides; every shot reveals and idles; disconnected hands; invented machine details; no developing consequence. |
| Organic action           | A large whale turns through water, close and wide.                              | Same oval at two sizes; fin/torso joins; rigid translation; anatomy hidden by random hatching; camera restarts motion.           |
| Inhabited still          | A craftsperson draws hot glass from a furnace.                                  | Unreadable grasp, reversed arm, tool missing the mouth, glowing disc for molten material, dark figure lost in dark wall.         |
| Constructed object       | A drawing machine lays a continuous trace on a tilted sheet.                    | Mismatched perspective; floating details; pen ahead of its mark; paper covered by its own background.                            |
| Speed change             | The same action at 2× and 0.5×.                                                 | Uneven curve speed; skipped contact; visible particle reset; unfinished action because one clock changed.                        |

A before/after claim needs the same subject, constraints, comparable moment, display size,
duration and key content; a different new demo shows capability, not a fair A/B.

| Review              | Evidence                                                     | A pass cannot establish  |
| ------------------- | ------------------------------------------------------------ | ------------------------ |
| Subject and staging | Thumbnail/value view, hero frame, inspected reference        | Print quality or motion  |
| Construction        | 1:1 contact/attachment crops, perspective/landmark overlay   | Taste, narrative, appeal |
| Print               | Native PNG, 1:1 crops, plate isolation if needed             | That the drawing is good |
| Action              | Silent normal-speed preview; strips at contact, cut, wrap    | Whole-film pacing        |
| Edit                | Full-duration silent animatic and shot table                 | Finished art             |
| Delivery            | Repeat/cold-seek checks, full decode, frame count/dimensions | Artistic approval        |

Record observed defect, fix and artifact for each review, and name what remains unreviewed. Judge
pass/revise/unreviewed on concrete criteria, never averaged beauty scores. Good halftone doesn't
offset a failed silhouette or contact. A sheet-only inspection is not watching playback. The
[drawing-machine study](scene-space.md#executable-example-the-drawing-machine) covers the
constructed-object and speed cases only; don't generalise from one engineering example.
