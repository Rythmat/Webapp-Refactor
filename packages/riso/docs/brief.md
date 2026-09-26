# Riso film brief

The design and delivery contract for a new procedural risograph film; read it before designing or building one.

Make an original film from the user's subject and intent; the print engine and craft docs are
the reusable foundation, the story is new each time. Nothing is required by default: no centre
dot, pink/blue pair, collision, flower, archive, six-act sequence, closing message or two-dot
signature. Those belong to the optional [Resonance form](forms/resonance.md), used only when
requested or deliberately chosen. A new subject list or palette alone is not a new concept.

## Design before inheriting a timeline

- Read the ask for subject, feeling, audience, length and reference exclusions. When choices are
  open, weigh a few materially different approaches and pick the strongest without adding an
  approval step.
- Start from what the subject uniquely does, how it changes, or a viewpoint that reveals it; let
  that set rhythm and ending. One evolving scene can carry a film; montage and climax are optional.
- Before coding, ask whether the progression and ending would survive swapping in an unrelated
  subject. If so, tie them closer to this one. This is a design check, not a novelty quota: a
  returning motif or requested series format can be intentional.
- When extending an approved film, keep its direction unless asked to redesign.

Write `films/<name>/FILM.md` with what another session needs: premise, visual idea and working
title; duration, passages and why the ending belongs to this subject; composition, palette, shot
sizes, eye path and any anchor; inspected references and what they establish; actions,
consequences and holds; moving elements, transitions, loops and shared clocks; sound direction,
deliberate silences, text or signature; user constraints, chosen form, source and remaining work.

## Craft docs

Respect the user's reference exclusions. Examples in the docs demonstrate a technique; they don't
require that subject, palette, shot sequence or ending.

| Doc                                            | Use                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| [visual-development.md](visual-development.md) | Interpret requests, research subjects, prove the hard frame and action first. |
| [drawing.md](drawing.md)                       | Contour, value, tone, depth, ink budget, focus, lettering.                    |
| [scene-space.md](scene-space.md)               | Perspective, attached detail, motion units and clocks.                        |
| [motion.md](motion.md)                         | Mass, follow-through, handoffs, loop seams, live plates.                      |
| [sound.md](sound.md)                           | When scoring: kit, sync, transitions, mix, measurement.                       |
| [quality-bar.md](quality-bar.md)               | Measured print qualities and review cases.                                    |

## Deliverable and contract

One self-contained `films/<name>/index.html` in Canvas 2D, plus a verified MP4. No libraries,
network, fonts, images or external assets. Read [riso-plates.md](../.claude/rules/riso-plates.md)
before drawing. Fixed 1080×1080 backing store at 720 px CSS, independent of DPR, so halftone
pitch stays stable. Export 30 fps unless told otherwise. Duration is chosen per film (28 s was
the Resonance format). Animation is time-based, never frame-counted.

```js
window.__riso = {
  duration,          // actual film length in seconds
  ready,             // true only once required baking is complete
  seek(t),           // synchronously render exactly the frame at t
  renderAudio(),     // optional: Promise<base64 WAV>, 48 kHz stereo, exactly `duration` long
  marks,             // optional: visible event times; tools/audio.mjs checks sync against them
};
```

- `seek(t)` is pure: repeated seeks and cold jumps give identical pixels. That enables inspection
  and exact export; it does not prove motion continuity. Honour `?t=12.5` on load.
- `renderAudio()` is pure too: seeded like the picture, scaled once after render to −16 LUFS
  under −1 dBTP; any other level is a recorded choice.
- Firefox is primary; its `MediaRecorder` supports `video/webm;codecs=vp8`, so negotiate the
  codec. The MP4 comes from `tools/render.mjs`, never a realtime screen recording.

## Print system

- Paper: warm cream `#F2EDE3`, cloudy mottling and fibre flecks, baked once, static.
- Inks: blue `#0078BF`, fluorescent pink `#FF48B0`, yellow `#FFE800`, green `#00A95C`, orange
  `#FF6C2F`, violet `#765BA7`, indigo `#2E3192`. Choose for the subject; no pair has a fixed
  role. Three or four inks per scene. No pure black: overprint for darks.
- Screen each plate at ~4–5 px pitch at 1080 with distinct angles (e.g. 15°, 45°, 75°, 0°).
  Gradients change dot size; mid-tones leave paper between dots.
- Fix each ink's 1–3 px registration offset per scene; the subject's own contours reveal it.
- Starvation, speckle and carved highlights where they describe form; grain and contour wobble
  stable over time. No uniformly smooth fills or mechanical outlines.
- Clear value hierarchy: paper, a screened middle, an overprint dark where depth needs it. Choose
  sparse or dense deliberately; give each image time to read at its real speed; follow the eye
  through a handoff instead of forcing it back to centre.

## Motion, sound and text

- Take transformations from the subject's material and action (deformation, unfolding, flow,
  occlusion, growth, fracture, reveal, drift, stillness). Ripple, iris, collision and bloom are
  options, not obligatory beats.
- Every paper hold or hard cut needs a purpose. Full-scene dissolves are not a fix for
  disconnected shots; design any ink transformation explicitly.
- Score with tempo, phrasing and timbre from the subject; no fixed BPM, note pair or ending chord.
  Build from the `── sound kit ──` in [studies/sound.html](../studies/sound.html), measure with
  `tools/audio.mjs` before any full render; the `riso-score` skill runs that stage.
- Text and signatures are optional; draw glyphs as paths ([lettering](drawing.md#text-in-the-frame)).
  Never append an inherited title card.

## Build and inspect

Use the `riso-film` skill (`riso-still` for still-only requests: native PNG, no timeline or
score). `tools/new-riso.mjs` extracts the proven compositor and craft blocks into a blank source
with no previous film's cues or score; existing film specs describe those works, not the next.

- Bake static plates at display size, seed elements consistently, animate only what moves. Store
  timed events as data so picture and sound share them.
- Keep playback responsive; set `ready` only after baking. Provide play/pause, replay, scrubber,
  frame stepping, recording, and passage markers if useful.
- Build and inspect in stages: engine, scenes, transitions, ending. Under tight scope cut scene
  count, not the complete progression, ending or checks.

From `tools/` (adapt times):

```
node verify.mjs ../films/<name>/index.html
node shoot.mjs ../films/<name>/index.html --times 0.3,1.8,3.0
node shoot.mjs ../films/<name>/index.html --range 6.6:6.9:0.0333333333 --sheet
node render.mjs ../films/<name>/index.html --fps 30 --size 1080
```

Coarse sheets for pacing; frame-spaced strips at real handoffs and loop boundaries, both sides of
every reset, including reused scenes. Verify deterministic seeking in Firefox and Chromium,
inspect encoded motion, decode the full export. Review a scored film's picture and sound together
(section renders are silent). Record what was verified and what remains in `FILM.md`.
