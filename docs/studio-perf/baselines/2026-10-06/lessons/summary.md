# Studio lesson walkthrough

Every lesson in `src/daw/components/Tutorial/tutorials.ts`, step by step, as the editor behaves today (milestone 1.0 baseline: problems are recorded, not fixed). Written by `scripts/studio-perf/lessons.mjs` on 2026-10-07T01:08:07.888Z at commit `f96b3ecc` (studio/stage-a-1.0, with uncommitted changes under src), against http://localhost:5263, in Chrome 153.0.8010.12 (GPU: metal, audio at 44100 Hz), as the dev bypass's premium user and as a free student (the bypass user served a free subscription, so Prism is locked).

A step passes when its anchor (the first id of its `target` list that is in the DOM) is on screen, inside the window, not clipped and not covered, when its driver can do what the step asks, and when the store's `tutorialStepIndex` then advances. The JSON report beside this file has every measurement; shots/ has a screenshot of each failing step.

Driver: `click` is a real click (or menu pick) on or in the anchor, `select` an option picked in a `<select>`, `store` an action on the editor or synth store standing in for a drag, `next` the coach card’s Next button, `none` nothing (the step’s own preconditions satisfy it). Advanced: the time from the driver’s last action to the next step; a validated step waits 950 ms for its confetti first.

**Result: pass.** 80/116 steps pass (6 with warnings), 16/16 lessons complete. 36 failing step(s) are known (KNOWN_FAILURES in `scripts/studio-perf/lessonDrivers.mjs`, 27 entries).

## chromebook (1366×655, 4× CPU), premium

Idle for 3 s in the same empty editor without a lesson, once quiet: 599.72 rAF calls/s, 0 commits/s, frame p95 16.7 ms. The table's idle column is the same measure with the lesson open on step 1.

| Lesson                        | Steps | Pass | Fail | Completed | Idle on step 1                                     | Time   |
| ----------------------------- | ----- | ---- | ---- | --------- | -------------------------------------------------- | ------ |
| `make-first-track`            | 8     | 8    | 0    | yes       | 659.38 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 19.8 s |
| `jazz-color-your-chords`      | 8     | 8    | 0    | yes       | 659.65 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 22.6 s |
| `hiphop-build-the-beat`       | 7     | 7    | 0    | yes       | 659.32 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 18.2 s |
| `pop-flip-a-sample`           | 4     | 4    | 0    | yes       | 659.8 rAF calls/s, 0 commits/s, frame p95 16.8 ms  | 14.2 s |
| `edm-design-the-drop`         | 11    | 10   | 1    | yes       | 659.76 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 25.2 s |
| `house-make-it-pump`          | 5     | 4    | 1    | yes       | 659.76 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 16.5 s |
| `rnb-mix-and-polish`          | 11    | 6    | 5    | yes       | 659.38 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 54.7 s |
| `indie-movement-and-dynamics` | 4     | 2    | 2    | yes       | 659.56 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 16.5 s |

| Console or page error                                                                                                                                             | Lessons |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Failed to list cloud projects Error: GET /api/studio/projects failed (401): Invalid Compact JWS                                                                   | all 8   |
| Failed to load resource: the server responded with a status of 401 ()                                                                                             | all 8   |
| Warning: Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See /link/unsafe-component-lifecycles for details. | all 8   |

### Make your first track (`make-first-track`)

| #   | Step         | Anchor                                              | Driver | Advanced               | Result              |
| --- | ------------ | --------------------------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-track`  | `add-track-button`: visible                         | click  | after 0.1 s            | pass                |
| 2   | `open-prism` | `chanstrip-tab-prism`: covered while the card moved | none   | by itself after 351 ms | pass, with warnings |
| 3   | `pick-key`   | `prism-key`: visible                                | click  | after 1.0 s            | pass                |
| 4   | `add-chords` | `prism-chord-selection`: visible                    | click  | after 1.0 s            | pass                |
| 5   | `pick-genre` | `prism-style`: visible                              | click  | after 1.0 s            | pass                |
| 6   | `add-swing`  | `prism-rhythm`: visible                             | store  | after 1.0 s            | pass                |
| 7   | `experiment` | `prism-rhythm`: visible                             | next   | after 0.0 s            | pass                |
| 8   | `create`     | `prism-create`: visible                             | click  | after 1.1 s            | pass                |

- **open-prism** warning: while it was up, the anchor chanstrip-tab-prism: it is covered at 9/9 points (its centre among them) by the coach card
- **open-prism** warning: it advanced by itself 351 ms after it began, so its copy cannot be read
- **add-swing** note: Swing was already 40 (past 20) when the step began

### Jazz — Color your chords (`jazz-color-your-chords`)

| #   | Step            | Anchor                           | Driver | Advanced    | Result |
| --- | --------------- | -------------------------------- | ------ | ----------- | ------ |
| 1   | `select-track`  | `add-track-button`: visible      | click  | after 0.1 s | pass   |
| 2   | `genre-jazz`    | `prism-style`: visible           | click  | after 1.0 s | pass   |
| 3   | `mode-dorian`   | `prism-key`: visible             | click  | after 1.0 s | pass   |
| 4   | `seventh-chord` | `prism-chord-selection`: visible | click  | after 1.0 s | pass   |
| 5   | `four-chords`   | `prism-chord-selection`: visible | click  | after 1.0 s | pass   |
| 6   | `jazz-rhythm`   | `prism-rhythm`: visible          | select | after 1.0 s | pass   |
| 7   | `swing`         | `prism-rhythm`: visible          | store  | after 1.0 s | pass   |
| 8   | `create`        | `prism-create`: visible          | click  | after 1.1 s | pass   |

- **jazz-rhythm** note: Rhythm Pattern was "Jazz 2b" when the step began
- **swing** note: Swing was already 40 (past 25) when the step began

### Hip Hop — Build the beat (`hiphop-build-the-beat`)

| #   | Step             | Anchor                            | Driver | Advanced               | Result              |
| --- | ---------------- | --------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-drums`      | `add-track-button`: visible       | click  | after 0.8 s            | pass                |
| 2   | `open-sequencer` | `chanstrip-tab-controls`: visible | none   | by itself after 313 ms | pass, with warnings |
| 3   | `swap-kit`       | `drum-kit-selector`: visible      | click  | after 1.0 s            | pass                |
| 4   | `program-hits`   | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |
| 5   | `slow-bpm`       | `transport-bpm`: visible          | store  | after 1.1 s            | pass                |
| 6   | `load-groove`    | `grooves-browser`: visible        | click  | after 1.1 s            | pass                |
| 7   | `pad-mix`        | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |

- **open-sequencer** warning: it advanced by itself 313 ms after it began, so its copy cannot be read
- **load-groove** note: A "Change Project BPM?" dialog asked to undo the BPM the lesson just set; chose Add Anyway

### Pop — Flip a sample (`pop-flip-a-sample`)

| #   | Step           | Anchor                              | Driver | Advanced    | Result |
| --- | -------------- | ----------------------------------- | ------ | ----------- | ------ |
| 1   | `add-chops`    | `add-track-button`: visible         | click  | after 0.9 s | pass   |
| 2   | `load-sample`  | `sampler-dropzone`: visible         | click  | after 1.1 s | pass   |
| 3   | `play-notes`   | `chanstrip-tab-piano-roll`: visible | store  | after 1.0 s | pass   |
| 4   | `space-it-out` | `fx-add-delay`: visible             | click  | after 0.9 s | pass   |

### EDM — Design the drop (`edm-design-the-drop`)

| #   | Step           | Anchor                                                 | Driver | Advanced               | Result              |
| --- | -------------- | ------------------------------------------------------ | ------ | ---------------------- | ------------------- |
| 1   | `add-synth`    | `add-track-button`: visible                            | click  | after 0.1 s            | pass                |
| 2   | `open-synth`   | `chanstrip-tab-controls`: covered while the card moved | none   | by itself after 316 ms | pass, with warnings |
| 3   | `load-wobble`  | `synth-preset-selector`: visible                       | store  | after 1.0 s            | pass                |
| 4   | `tweak-wobble` | `chanstrip-tab-piano-roll`: visible                    | next   | after 0.0 s            | pass                |
| 5   | `genre-edm`    | `prism-style`: visible                                 | click  | after 1.0 s            | pass                |
| 6   | `minor-mode`   | `prism-key`: visible                                   | click  | after 1.0 s            | pass                |
| 7   | `riff-chords`  | `prism-harmony`: visible                               | click  | after 1.0 s            | pass                |
| 8   | `create`       | `prism-create`: visible                                | click  | after 1.1 s            | pass                |
| 9   | `saturate`     | `fx-add-saturator`: NOT visible (clipped)              | click  | after 0.9 s            | FAIL (known)        |
| 10  | `add-ott`      | `fx-add-multiband`: visible                            | click  | after 1.0 s            | pass                |
| 11  | `push-depth`   | `fx-slot-multiband`: visible                           | store  | after 1.0 s            | pass                |

- **open-synth** warning: while it was up, the anchor chanstrip-tab-controls: it is covered at 9/9 points (its centre among them) by the coach card
- **open-synth** warning: it advanced by itself 316 ms after it began, so its copy cannot be read
- **saturate** fails: anchor fx-add-saturator: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **saturate** is a known failure: practice-tutorial-20: fx-add-saturator is scrolled out of the dock’s FX list, so the spotlight points below the list

### House — Make it pump (`house-make-it-pump`)

| #   | Step           | Anchor                                 | Driver | Advanced    | Result       |
| --- | -------------- | -------------------------------------- | ------ | ----------- | ------------ |
| 1   | `add-drums`    | `add-track-button`: visible            | click  | after 0.7 s | pass         |
| 2   | `add-bass`     | `add-track-button`: visible            | click  | after 0.0 s | pass         |
| 3   | `add-ducker`   | `fx-add-ducker`: NOT visible (clipped) | click  | after 1.0 s | FAIL (known) |
| 4   | `set-key`      | `ducker-key-select`: visible           | select | after 1.0 s | pass         |
| 5   | `raise-amount` | `fx-slot-ducker`: visible              | store  | after 1.0 s | pass         |

- **add-ducker** fails: anchor fx-add-ducker: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **add-ducker** is a known failure: practice-tutorial-20: fx-add-ducker is scrolled out of the dock’s FX list, so the spotlight points below the list

### R&B — Mix & polish (`rnb-mix-and-polish`)

| #   | Step             | Anchor                                  | Driver | Advanced                          | Result       |
| --- | ---------------- | --------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`   | `add-track-button`: visible             | click  | after 0.1 s                       | pass         |
| 2   | `genre-rnb`      | `prism-style`: visible                  | click  | after 1.0 s                       | pass         |
| 3   | `add-reverb`     | `fx-add-reverb`: visible                | click  | after 0.9 s                       | pass         |
| 4   | `tweak-reverb`   | `fx-slot-reverb`: visible               | click  | after 1.0 s                       | pass         |
| 5   | `goto-master`    | `view-switch-studio`: visible           | click  | after 0.9 s                       | pass         |
| 6   | `balance-fader`  | `mixer-section`: NOT visible (empty)    | store  | after 1.0 s                       | FAIL (known) |
| 7   | `use-send`       | `mixer-sends-A`: NOT visible (clipped)  | store  | after 1.0 s                       | FAIL (known) |
| 8   | `tweak-return`   | `return-strip-A`: NOT visible (clipped) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 9   | `mastering-fx`   | `fx-add-compressor`: visible            | click  | after 0.9 s                       | pass         |
| 10  | `master-volume`  | `master-strip`: NOT visible (clipped)   | store  | after 1.0 s                       | FAIL (known) |
| 11  | `bounce-mixdown` | `file-menu`: visible                    | click  | only through its fallback (2.3 s) | FAIL (known) |

- **balance-fader** fails: anchor mixer-section: its box is empty (nothing drawn on screen) (see ia-flows-12, fx-mixer-04)
- **balance-fader** is a known failure: ia-flows-12, fx-mixer-04: mixer-section has a 0 px tall box in MASTER at 1366×655
- **use-send** fails: anchor mixer-sends-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA0B0SynthReturn AReverb1 FXR" (scrolls) (see ia-flows-12, fx-mixer-04, fx-mixer-14)
- **use-send** is a known failure: ia-flows-12, fx-mixer-04: mixer-sends-A is cut off by the scrolling strips row (none of it shows at 1366×655, 31% at 1280×720)
- **tweak-return** fails: anchor return-strip-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: click "Return A" label failed: locator.click: Timeout 10000ms exceeded. — &lt;div class="flex shrink-0 flex-col" data-tutorial-id="mastering-section"&gt;…&lt;/div&gt; intercepts pointer events (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: it did not advance (its check is false in the page) (see ia-flows-12, fx-mixer-04)
- **tweak-return** is a known failure: ia-flows-12, fx-mixer-04: return-strip-A is cut off by the scrolling strips row (none of it shows at 1366×655, where mastering-section also takes the click on its label; 75% at 1280×720)
- **tweak-return**: went on through its driver’s fallback
- **master-volume** fails: anchor master-strip: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **master-volume** is a known failure: ia-flows-12, fx-mixer-04: master-strip is cut off by the scrolling strips row
- **bounce-mixdown** fails: click Export Audio… failed: locator.click: Timeout 10000ms exceeded. — &lt;div&gt;…&lt;/div&gt; from &lt;div aria-hidden="true" data-aria-hidden="true"&gt;…&lt;/div&gt; subtree intercepts pointer events (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** fails: it did not advance (its check is false in the page) (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** is a known failure: new (nearest practice-tutorial-18): the coach card covers File &gt; Export Audio…, so the click on it times out
- **bounce-mixdown** warning: then file-export-audio: it is covered at 9/9 points (its centre among them) by the coach card
- **bounce-mixdown**: went on through its driver’s fallback

### Indie — Movement & dynamics (`indie-movement-and-dynamics`)

| #   | Step              | Anchor                                     | Driver | Advanced    | Result       |
| --- | ----------------- | ------------------------------------------ | ------ | ----------- | ------------ |
| 1   | `open-automation` | `automation-toggle`: NOT visible (missing) | click  | after 0.9 s | FAIL (known) |
| 2   | `draw-volume`     | `automation-lane`: NOT visible (covered)   | click  | after 1.0 s | FAIL (known) |
| 3   | `hear-it`         | `automation-lane`: visible                 | store  | after 1.0 s | pass         |
| 4   | `second-lane`     | `automation-param-select`: visible         | click  | after 0.9 s | pass         |

- **open-automation** fails: anchor automation-toggle: none of automation-toggle is in the DOM
- **open-automation** fails: The lesson opens in an empty session and its first step asks to pick a track, but there is no track and no step adds one, so there is no automation button
- **open-automation** is a known failure: new: ?tutorial= boots an empty session and no step adds a track, so there is no automation button to click
- **draw-volume** fails: anchor automation-lane: it is covered at 3/9 points by the coach card
- **draw-volume** is a known failure: new (nearest practice-tutorial-18): the coach card is clamped back over the wide automation lane

## chromebook (1366×655, 4× CPU), free

| Lesson                        | Steps | Pass | Fail | Completed | Idle on step 1 | Time   |
| ----------------------------- | ----- | ---- | ---- | --------- | -------------- | ------ |
| `make-first-track`            | 8     | 2    | 6    | yes       |                | 40.5 s |
| `jazz-color-your-chords`      | 8     | 1    | 7    | yes       |                | 52.1 s |
| `hiphop-build-the-beat`       | 7     | 7    | 0    | yes       |                | 13.8 s |
| `pop-flip-a-sample`           | 4     | 4    | 0    | yes       |                | 9.8 s  |
| `edm-design-the-drop`         | 11    | 6    | 5    | yes       |                | 45.0 s |
| `house-make-it-pump`          | 5     | 4    | 1    | yes       |                | 12.3 s |
| `rnb-mix-and-polish`          | 11    | 5    | 6    | yes       |                | 56.2 s |
| `indie-movement-and-dynamics` | 4     | 2    | 2    | yes       |                | 11.5 s |

| Console or page error                                                                                                                                             | Lessons |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Failed to list cloud projects Error: GET /api/studio/projects failed (401): Invalid Compact JWS                                                                   | all 8   |
| Failed to load resource: the server responded with a status of 401 ()                                                                                             | all 8   |
| Warning: Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See /link/unsafe-component-lifecycles for details. | all 8   |

### Make your first track (`make-first-track`)

| #   | Step         | Anchor                                                  | Driver | Advanced                          | Result              |
| --- | ------------ | ------------------------------------------------------- | ------ | --------------------------------- | ------------------- |
| 1   | `add-track`  | `add-track-button`: visible                             | click  | after 0.1 s                       | pass                |
| 2   | `open-prism` | `chanstrip-tab-prism`: covered while the card moved     | none   | by itself after 359 ms            | pass, with warnings |
| 3   | `pick-key`   | `prism-key`: NOT visible (clipped, covered)             | click  | only through its fallback (1.1 s) | FAIL (known)        |
| 4   | `add-chords` | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 5   | `pick-genre` | `prism-style`: NOT visible (clipped, covered)           | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 6   | `add-swing`  | `prism-rhythm`: NOT visible (clipped, covered)          | store  | after 1.0 s                       | FAIL (known)        |
| 7   | `experiment` | `prism-rhythm`: NOT visible (clipped, covered)          | next   | after 0.0 s                       | FAIL (known)        |
| 8   | `create`     | `prism-create`: NOT visible (covered)                   | click  | only through its fallback (1.1 s) | FAIL (known)        |

- **open-prism** warning: while it was up, the anchor chanstrip-tab-prism: it is covered at 9/9 points (its centre among them) by the coach card
- **open-prism** warning: it advanced by itself 359 ms after it began, so its copy cannot be read
- **pick-key** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see prism-ui-03)
- **pick-key** fails: click G slice failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see prism-ui-03)
- **pick-key** fails: it did not advance (its check is false in the page) (see prism-ui-03)
- **pick-key** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **pick-key**: went on through its driver’s fallback
- **add-chords** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **add-chords** fails: click chord "1 major" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **add-chords** fails: it did not advance (its check is false in the page)
- **add-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **add-chords**: went on through its driver’s fallback
- **pick-genre** fails: anchor prism-style: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **pick-genre** fails: click Jazz pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **pick-genre** fails: it did not advance (its check is false in the page)
- **pick-genre** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **pick-genre**: went on through its driver’s fallback
- **add-swing** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **add-swing** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **add-swing** note: Swing was already 40 (past 20) when the step began
- **experiment** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **experiment** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback

### Jazz — Color your chords (`jazz-color-your-chords`)

| #   | Step            | Anchor                                                  | Driver | Advanced                          | Result       |
| --- | --------------- | ------------------------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`  | `add-track-button`: visible                             | click  | after 0.1 s                       | pass         |
| 2   | `genre-jazz`    | `prism-style`: NOT visible (clipped, covered)           | click  | only through its fallback (1.0 s) | FAIL (known) |
| 3   | `mode-dorian`   | `prism-key`: NOT visible (clipped, covered)             | click  | only through its fallback (1.0 s) | FAIL (known) |
| 4   | `seventh-chord` | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 5   | `four-chords`   | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 6   | `jazz-rhythm`   | `prism-rhythm`: NOT visible (clipped, covered)          | select | only through its fallback (1.0 s) | FAIL (known) |
| 7   | `swing`         | `prism-rhythm`: NOT visible (clipped, covered)          | store  | after 1.0 s                       | FAIL (known) |
| 8   | `create`        | `prism-create`: NOT visible (covered)                   | click  | only through its fallback (1.1 s) | FAIL (known) |

- **genre-jazz** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-jazz** fails: click Jazz pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-jazz** fails: it did not advance (its check is false in the page)
- **genre-jazz** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-jazz**: went on through its driver’s fallback
- **mode-dorian** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-20)
- **mode-dorian** fails: click mode menu failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see practice-tutorial-20)
- **mode-dorian** fails: it did not advance (its check is false in the page) (see practice-tutorial-20)
- **mode-dorian** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **mode-dorian**: went on through its driver’s fallback
- **seventh-chord** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **seventh-chord** fails: click chord "1 major7" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **seventh-chord** fails: it did not advance (its check is false in the page)
- **seventh-chord** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **seventh-chord**: went on through its driver’s fallback
- **four-chords** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **four-chords** fails: click chord "1 dominant7" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **four-chords** fails: it did not advance (its check is false in the page)
- **four-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **four-chords**: went on through its driver’s fallback
- **jazz-rhythm** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **jazz-rhythm** fails: pick "Jazz 1" in Rhythm Pattern failed: "Jazz 1" in Rhythm Pattern: &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;&lt;div class="flex flex-col items-cente is on top of the menu (see practice-tutorial-14)
- **jazz-rhythm** fails: it did not advance (its check is false in the page) (see practice-tutorial-14)
- **jazz-rhythm** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **jazz-rhythm** note: Rhythm Pattern was "Jazz 6" when the step began
- **jazz-rhythm**: went on through its driver’s fallback
- **swing** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **swing** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **swing** note: Swing was already 40 (past 25) when the step began
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback

### Hip Hop — Build the beat (`hiphop-build-the-beat`)

| #   | Step             | Anchor                            | Driver | Advanced               | Result              |
| --- | ---------------- | --------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-drums`      | `add-track-button`: visible       | click  | after 0.9 s            | pass                |
| 2   | `open-sequencer` | `chanstrip-tab-controls`: visible | none   | by itself after 312 ms | pass, with warnings |
| 3   | `swap-kit`       | `drum-kit-selector`: visible      | click  | after 1.0 s            | pass                |
| 4   | `program-hits`   | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |
| 5   | `slow-bpm`       | `transport-bpm`: visible          | store  | after 1.0 s            | pass                |
| 6   | `load-groove`    | `grooves-browser`: visible        | click  | after 1.1 s            | pass                |
| 7   | `pad-mix`        | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |

- **open-sequencer** warning: it advanced by itself 312 ms after it began, so its copy cannot be read
- **load-groove** note: A "Change Project BPM?" dialog asked to undo the BPM the lesson just set; chose Add Anyway

### Pop — Flip a sample (`pop-flip-a-sample`)

| #   | Step           | Anchor                              | Driver | Advanced    | Result |
| --- | -------------- | ----------------------------------- | ------ | ----------- | ------ |
| 1   | `add-chops`    | `add-track-button`: visible         | click  | after 0.9 s | pass   |
| 2   | `load-sample`  | `sampler-dropzone`: visible         | click  | after 1.0 s | pass   |
| 3   | `play-notes`   | `chanstrip-tab-piano-roll`: visible | store  | after 1.0 s | pass   |
| 4   | `space-it-out` | `fx-add-delay`: visible             | click  | after 1.0 s | pass   |

### EDM — Design the drop (`edm-design-the-drop`)

| #   | Step           | Anchor                                                 | Driver | Advanced                          | Result              |
| --- | -------------- | ------------------------------------------------------ | ------ | --------------------------------- | ------------------- |
| 1   | `add-synth`    | `add-track-button`: visible                            | click  | after 0.1 s                       | pass                |
| 2   | `open-synth`   | `chanstrip-tab-controls`: covered while the card moved | none   | by itself after 314 ms            | pass, with warnings |
| 3   | `load-wobble`  | `synth-preset-selector`: visible                       | store  | after 1.0 s                       | pass                |
| 4   | `tweak-wobble` | `chanstrip-tab-piano-roll`: visible                    | next   | after 0.0 s                       | pass                |
| 5   | `genre-edm`    | `prism-style`: NOT visible (clipped, covered)          | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 6   | `minor-mode`   | `prism-key`: NOT visible (clipped, covered)            | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 7   | `riff-chords`  | `prism-harmony`: NOT visible (clipped, covered)        | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 8   | `create`       | `prism-create`: NOT visible (covered)                  | click  | only through its fallback (1.1 s) | FAIL (known)        |
| 9   | `saturate`     | `fx-add-saturator`: NOT visible (clipped)              | click  | after 1.0 s                       | FAIL (known)        |
| 10  | `add-ott`      | `fx-add-multiband`: visible                            | click  | after 1.0 s                       | pass                |
| 11  | `push-depth`   | `fx-slot-multiband`: visible                           | store  | after 1.0 s                       | pass                |

- **open-synth** warning: while it was up, the anchor chanstrip-tab-controls: it is covered at 9/9 points (its centre among them) by the coach card
- **open-synth** warning: it advanced by itself 314 ms after it began, so its copy cannot be read
- **genre-edm** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-edm** fails: click EDM pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-edm** fails: it did not advance (its check is false in the page)
- **genre-edm** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-edm**: went on through its driver’s fallback
- **minor-mode** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-20)
- **minor-mode** fails: click mode menu failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see practice-tutorial-20)
- **minor-mode** fails: it did not advance (its check is false in the page) (see practice-tutorial-20)
- **minor-mode** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **minor-mode**: went on through its driver’s fallback
- **riff-chords** fails: anchor prism-harmony: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FAeolianChord Selecti" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20; div.flex.flex-col.items-center
- **riff-chords** fails: click a colour in the spectrum failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **riff-chords** fails: it did not advance (its check is false in the page)
- **riff-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **riff-chords**: went on through its driver’s fallback
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback
- **saturate** fails: anchor fx-add-saturator: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **saturate** is a known failure: practice-tutorial-20: fx-add-saturator is scrolled out of the dock’s FX list, so the spotlight points below the list

### House — Make it pump (`house-make-it-pump`)

| #   | Step           | Anchor                                 | Driver | Advanced    | Result       |
| --- | -------------- | -------------------------------------- | ------ | ----------- | ------------ |
| 1   | `add-drums`    | `add-track-button`: visible            | click  | after 0.9 s | pass         |
| 2   | `add-bass`     | `add-track-button`: visible            | click  | after 0.0 s | pass         |
| 3   | `add-ducker`   | `fx-add-ducker`: NOT visible (clipped) | click  | after 1.0 s | FAIL (known) |
| 4   | `set-key`      | `ducker-key-select`: visible           | select | after 1.0 s | pass         |
| 5   | `raise-amount` | `fx-slot-ducker`: visible              | store  | after 1.0 s | pass         |

- **add-ducker** fails: anchor fx-add-ducker: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **add-ducker** is a known failure: practice-tutorial-20: fx-add-ducker is scrolled out of the dock’s FX list, so the spotlight points below the list

### R&B — Mix & polish (`rnb-mix-and-polish`)

| #   | Step             | Anchor                                        | Driver | Advanced                          | Result       |
| --- | ---------------- | --------------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`   | `add-track-button`: visible                   | click  | after 0.1 s                       | pass         |
| 2   | `genre-rnb`      | `prism-style`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 3   | `add-reverb`     | `fx-add-reverb`: visible                      | click  | after 0.9 s                       | pass         |
| 4   | `tweak-reverb`   | `fx-slot-reverb`: visible                     | click  | after 1.0 s                       | pass         |
| 5   | `goto-master`    | `view-switch-studio`: visible                 | click  | after 1.0 s                       | pass         |
| 6   | `balance-fader`  | `mixer-section`: NOT visible (empty)          | store  | after 1.0 s                       | FAIL (known) |
| 7   | `use-send`       | `mixer-sends-A`: NOT visible (clipped)        | store  | after 1.0 s                       | FAIL (known) |
| 8   | `tweak-return`   | `return-strip-A`: NOT visible (clipped)       | click  | only through its fallback (1.1 s) | FAIL (known) |
| 9   | `mastering-fx`   | `fx-add-compressor`: visible                  | click  | after 1.0 s                       | pass         |
| 10  | `master-volume`  | `master-strip`: NOT visible (clipped)         | store  | after 1.0 s                       | FAIL (known) |
| 11  | `bounce-mixdown` | `file-menu`: visible                          | click  | only through its fallback (2.1 s) | FAIL (known) |

- **genre-rnb** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-rnb** fails: click R&B pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-rnb** fails: it did not advance (its check is false in the page)
- **genre-rnb** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-rnb**: went on through its driver’s fallback
- **balance-fader** fails: anchor mixer-section: its box is empty (nothing drawn on screen) (see ia-flows-12, fx-mixer-04)
- **balance-fader** is a known failure: ia-flows-12, fx-mixer-04: mixer-section has a 0 px tall box in MASTER at 1366×655
- **use-send** fails: anchor mixer-sends-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA0B0SynthReturn AReverb1 FXR" (scrolls) (see ia-flows-12, fx-mixer-04, fx-mixer-14)
- **use-send** is a known failure: ia-flows-12, fx-mixer-04: mixer-sends-A is cut off by the scrolling strips row (none of it shows at 1366×655, 31% at 1280×720)
- **tweak-return** fails: anchor return-strip-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: click "Return A" label failed: locator.click: Timeout 10000ms exceeded. — &lt;div class="flex shrink-0 flex-col" data-tutorial-id="mastering-section"&gt;…&lt;/div&gt; intercepts pointer events (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: it did not advance (its check is false in the page) (see ia-flows-12, fx-mixer-04)
- **tweak-return** is a known failure: ia-flows-12, fx-mixer-04: return-strip-A is cut off by the scrolling strips row (none of it shows at 1366×655, where mastering-section also takes the click on its label; 75% at 1280×720)
- **tweak-return**: went on through its driver’s fallback
- **master-volume** fails: anchor master-strip: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **master-volume** is a known failure: ia-flows-12, fx-mixer-04: master-strip is cut off by the scrolling strips row
- **bounce-mixdown** fails: click Export Audio… failed: locator.click: Timeout 10000ms exceeded. — &lt;div&gt;…&lt;/div&gt; from &lt;div aria-hidden="true" data-aria-hidden="true"&gt;…&lt;/div&gt; subtree intercepts pointer events (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** fails: it did not advance (its check is false in the page) (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** is a known failure: new (nearest practice-tutorial-18): the coach card covers File &gt; Export Audio…, so the click on it times out
- **bounce-mixdown** warning: then file-export-audio: it is covered at 9/9 points (its centre among them) by the coach card
- **bounce-mixdown**: went on through its driver’s fallback

### Indie — Movement & dynamics (`indie-movement-and-dynamics`)

| #   | Step              | Anchor                                     | Driver | Advanced    | Result       |
| --- | ----------------- | ------------------------------------------ | ------ | ----------- | ------------ |
| 1   | `open-automation` | `automation-toggle`: NOT visible (missing) | click  | after 0.9 s | FAIL (known) |
| 2   | `draw-volume`     | `automation-lane`: NOT visible (covered)   | click  | after 1.0 s | FAIL (known) |
| 3   | `hear-it`         | `automation-lane`: visible                 | store  | after 1.0 s | pass         |
| 4   | `second-lane`     | `automation-param-select`: visible         | click  | after 1.0 s | pass         |

- **open-automation** fails: anchor automation-toggle: none of automation-toggle is in the DOM
- **open-automation** fails: The lesson opens in an empty session and its first step asks to pick a track, but there is no track and no step adds one, so there is no automation button
- **open-automation** is a known failure: new: ?tutorial= boots an empty session and no step adds a track, so there is no automation button to click
- **draw-volume** fails: anchor automation-lane: it is covered at 3/9 points by the coach card
- **draw-volume** is a known failure: new (nearest practice-tutorial-18): the coach card is clamped back over the wide automation lane
