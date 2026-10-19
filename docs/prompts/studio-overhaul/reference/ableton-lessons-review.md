# Ableton Learn and Learning Synths: lesson anatomy, side by side with the Production Lessons

Recorded 2026-10-16 at the owner's request: "Review these lessons by Ableton to improve the Production Lessons in the Studio". The two sites are [learn.ableton.com](https://learn.ableton.com/) and [learningsynths.ableton.com](https://learningsynths.ableton.com/).

It complements:

- [`lessons-v2.md`](lessons-v2.md), the Production Lessons v2 design that prompt 17 builds;
- the beatspark reference that the v2 build-a-track arcs are modelled on (`~/Desktop/References/Contents`).

**Status: proposals AB1–AB13 await the owner's sign-off as plan decision 17 (proposed).** The owner's direction from the review session is in §11:

- Amendment A of `lessons-v2.md` carries AB1–AB8 into prompt 17.
- Prompt `17a` carries the Beats course (AB9).
- Prompt `25a` carries the Sound-design course (AB10–AB12).
- 3.11 carries the synth visuals (AB13).

## How this was reviewed

- **Setup:** Chrome, signed out.
  - The Learning Synths cookie banner was closed with "Close", which denies consent.
  - Nothing was shared, exported, downloaded or posted. The Playground's Share and the Live Set download were not used.
- **Ableton Learn, read and played page by page:**
  - "What is a beat?" (11 pages) and "Boom boom bap" (14 pages), the two live lessons of the Beats course;
  - the "What is Learn?" tour (9 pages);
  - the Learn from artists page;
  - the Playground: clip grid, clip editor, instrument menu and mixer.
- **Interactions tried on Ableton Learn:**
  - a glossary term;
  - "Show the answer", both the listening reveal and the model pattern;
  - the tap-along box, which answered "Too slow!" with the measured BPM;
  - a wrong quiz answer;
  - removing a kick in the mini editor;
  - the keyboard help.
- **Learning Synths:**
  - the full chapter map: 53 links, about 50 lesson pages.
  - Read in full:
    - Get started, Amplitude, Playing the synth, Changing the sound, Making many changes, What can synthesizers sound like?;
    - Change over time, Synthesizer envelopes, Attack, Matching envelopes;
    - Change that repeats, Changing the modulation shape;
    - How synths make sound, Waveforms you can hear, Fast modulation;
    - the three Filters pages;
    - the recipes Get to know this synth, Plucked bass, Two sounds in one and Setting up your own controls;
    - the Playground and Learning more.
- **Not exercised:**
  - MIDI controllers;
  - the Learning Synths sequencer recordings;
  - the older learningmusic.ableton.com beyond its first page. It's still online, and the Beats course on learn.ableton.com is its rebuild.
- **Copy:** this file describes structure and behaviour in our own words. Short quoted UI labels ("Try this", "Show the answer", "Continue") are the only Ableton text.

## 1. learn.ableton.com: what's there

- **Home:**
  - four cards:
    - **Beats** (a course);
    - **What is Learn?** (a guided tour of the format);
    - **Learn from artists** (coming soon);
    - **More lessons** (basslines, melodies and chords, coming soon);
  - then the **Playground**;
  - a **Made in the Playground** shelf of six community tracks with play buttons;
  - a Discord invitation;
  - a light/dark toggle.
- **The Beats course page:**
  - a paragraph naming what the course covers: tempo, the metronome, rhythmic values and subdivisions, meter, phrasing, and the sounds of a drum beat.
  - Each lesson shows its art, a one-line subtitle, and **Start** or **Resume** with a progress bar.
  - Two lessons are live; two are announced: Keeping Time (cymbals and subdivisions) and Melodic Drums (pitched kicks and toms).
- **No account:** progress lives in the browser.

## 2. The lesson page (one template for every page)

```
+----------------------------------------------------------------+
| ×  Lesson title                                   [? keys] [◐] |
+----------------------------------------------------------------+
|              Page title                                        |
|              [ one audio widget ]                              |
|              1–3 sentences; the new term in bold               |
|              — Try this —————————————————————— (activity icon) |
|              one task + one listening question;                |
|              highlighted [term] opens a definition             |
|              [Show the answer]            (some pages)         |
|              Music: <producer, linked>                         |
+----------------------------------------------------------------+
| ▬▬▬▭▭▭▭ Page n of N                          [←]  [Continue]   |
+----------------------------------------------------------------+
```

- **Layout:** one centred column, about 500 px wide. The widget always comes first, and the page always plays something.
- **Text:** one to three sentences, with the new word in bold.
- **"Try this":**
  - always one concrete task plus one question that makes you listen ("can you feel when…?", "which one is faster?").
  - An icon on the right says what kind of activity it is: an ear for listening, a hand or metronome for doing, a quote mark for reading.
- **Glossary:** highlighted words (crossfader, scales, tempo, melody, accompaniment, synths) open a two-line definition in a popover.
- **Show the answer:**
  - on a listening question, it reveals the answer with the numbers (for example, the two tempos);
  - on a practice page, it fills the editor with the model pattern.
- **Credit line:** every musical example credits a real producer, with a link (for example Zora Jones, Ikonika, BNYX, Ninajirachi).
- **Footer:** a progress bar ("Page n of N"), Back after page 1, and **Continue**. Continue is never gated: nothing has to be done before moving on.
- **Keyboard:**
  - Space plays and stops.
  - **?** opens keyboard help for the widget on that page. Pads map to a computer-keyboard piano (A-row white keys, W-row black keys, Z/X octave).
  - The editors carry screen-reader instructions.
- **Completion page:**
  - the lesson art in a green frame and "Completed";
  - one sentence naming the skill just learned;
  - a link back to the course;
  - **Next lesson: …** (or **Next course: …**).

## 3. The widgets

| Widget                                                                                      | Used on                | Teaches                                   | Studio equivalent today                                                         |
| ------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Stem crossfader with a waveform (drums ↔ other; melody ↔ accompaniment; loop A ↔ loop B) | Beats 1–2, tour 5      | layers, roles, matching tempos            | Mute and solo; no crossfader                                                    |
| Two loop pads with a reveal                                                                 | Beats 3, tour 2 and 9  | comparing tempo, scale and mood           | none                                                                            |
| Metronome with a BPM field                                                                  | Beats 4                | the beat as a clock                       | bottom-rail Click and Tempo                                                     |
| Loop with a tempo field                                                                     | Beats 5, tour 6        | tempo changes character                   | Tempo field (`transport-bpm`, `src/daw/shell/song/SongParts.tsx:173`)           |
| Genre tempo chart with a draggable marker (eight styles, with halftime bands)               | Beats 6                | genre and tempo; halftime and doubletime  | none                                                                            |
| Tap-along box: live "too slow / too fast / just right" plus the measured BPM                | Beats 7–11             | finding the beat; halftime feel           | Tap tempo exists but only sets the tempo (`src/daw/shell/song/tapTempo.ts`)     |
| 8 drum pads with a keyboard map                                                             | Boom boom bap 1        | what a kit is                             | drum machine pads                                                               |
| Sound-variety pads (4 kicks: acoustic, synth, machine, vinyl; 4 snares)                     | Boom boom bap 2, 5     | timbre and style                          | kits: Natural, 808, House plus 11 JSON kits (`src/daw/instruments/drumKits.ts`) |
| Stem player with a lane overview                                                            | Boom boom bap 3–4, 6–7 | where the kick and snare land             | none                                                                            |
| Mini clip editor: one lane per drum, beat grid, undo, redo, clear, Export WAV, view range   | Boom boom bap 8–14     | bars, downbeat, backbeat, 16ths, practice | drum machine grid (`src/daw/components/Controls/DrumMachineView.tsx`)           |
| Beat sequencer with templates (Rock, House, Hip-Hop, Generate) and Add lane                 | tour 8                 | a first beat                              | Grooves browser (29 grooves, `src/daw/data/groovesLibrary.ts`)                  |
| Six "safe note" pads over a backing track                                                   | tour 7                 | improvising without wrong notes           | Oracle Key/Scale snap; musical typing                                           |
| Clip grid, 4 tracks × 4 scenes                                                              | tour 1, Playground     | layers combine into a song                | none: timeline only                                                             |
| Challenge: multiple choice with instant feedback and a one-line explanation                 | tour 9                 | reflecting on what was heard              | none                                                                            |
| Artist video                                                                                | tour 4                 | inspiration                               | none                                                                            |

## 4. The lessons, page by page (paraphrased)

**What is a beat?** (11 pages)

| #    | Page                 | Widget                       | Task / question                                                                               |
| ---- | -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | Beats and drums      | crossfader: drums ↔ other   | Fade between the drums and the rest; how do the drums sit with the bass, chords and melody?   |
| 2    | Beats and rhythms    | crossfader: loop A ↔ loop B | Same tempo, different rhythms; tap along while you fade (DJs match tempos)                    |
| 3    | Slower and faster    | two loop pads                | Which is faster? Reveal: 100 vs 138 BPM; does it change how you move?                         |
| 4    | Meet the metronome   | metronome                    | Make the beat faster or slower                                                                |
| 5    | Play with tempo      | loop + tempo                 | Change the tempo of a producer's beat; slower or faster?                                      |
| 6    | Tempo and genre      | genre chart                  | Drag the marker: the same beat across genre tempos; halftime and doubletime                   |
| 7    | Rushing or dragging? | tap box                      | Tap the beat; turn on the metronome if needed; live feedback                                  |
| 8–11 | Exercises 1–4        | tap box                      | Four producers' loops at 115, 150, 133 and 165 BPM. The last two can also be felt in halftime |

**Boom boom bap** (14 pages)

| #   | Page                     | Widget                                        | Task / question                                                  |
| --- | ------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| 1   | What is a drum kit?      | 8 pads by a producer, including a vocal "ooh" | Play the kit: when building kits, there are no rules             |
| 2   | What is a kick?          | 4 kick pads                                   | Which styles or moods do you hear in each?                       |
| 3–4 | Listening to kicks 1–2   | stem player                                   | Kick on every beat; then a kick that fills the spaces in between |
| 5   | What is a snare?         | 4 snare pads                                  | Layered snares; which music fits each?                           |
| 6–7 | Listening to snares 1–2  | stem player                                   | The snare answers the kick; a clap on every other kick           |
| 8   | What is a bar?           | editor: four on the floor + backbeat          | Remove the downbeat kick and hear the surprise                   |
| 9   | Between the beats        | editor, 16th grid                             | Add kicks and snares between the beats                           |
| 10  | Practice: 4 on the floor | empty editor                                  | Kick on all four beats, then check against the model             |
| 11  | Practice: backbeat       | editor with kicks                             | Snares on 2 and 4, then check against the model                  |
| 12  | Practice: alternating    | empty editor                                  | No wrong answers; the model is one example                       |
| 13  | Practice: avoid the beat | empty editor                                  | Deliberately strange: a pattern that never lands on the beat     |
| 14  | Practice: mix it up      | empty editor                                  | Combine everything; export to keep going in Ableton's other apps |

**What is Learn?** (9 pages, the tour):

1. Building blocks: the 4×4 clip grid, "conduct a virtual band".
2. Listen and compare: two scales.
3. Learn new terms: the glossary.
4. Learn from artists: a video.
5. Melody and accompaniment: the crossfader.
6. Find your tempo: a slider.
7. Play your own song: six safe-note pads.
8. Make your first beats: a sequencer with templates.
9. Practice what you learn: a challenge.

It ends with **Next course: Beats**.

**What the arc teaches:**

1. Concept pages go listen → identify → change.
2. Then practice pages: a target with a model, then open-ended work with the model as one example, then a page that breaks the rule on purpose.
3. Then free creation, with a way to keep the result.

## 5. The Playground

- **The grid:** Drums · Bass · Chords · Melodies × 4 scenes.
  - A clip starts on the next bar.
  - **+** opens a piano roll for that cell, with a loop brace, a view range, Duplicate loop and Clear.
  - Each clip has a ⋮ menu.
  - There are scene launchers, undo/redo, Delete all clips, Create a new set, Share, tempo and metronome.
- **Sounds:** each track has a short curated list, for example seven bass presets.
- **Mixer:** four tall colour bars as faders, with Mute, Solo and a dB readout.
- **Read:** a deliberately tiny tool. Every lesson widget is a piece of it, so what a student learns carries straight into making music.

## 6. learningsynths.ableton.com: the chapter map

| Chapter                             | Pages                                                                                                                                                                                                                                                                                      | Analogy / widget                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Get started                         | 1                                                                                                                                                                                                                                                                                          | an XY box that moves many knobs at once                                                                                                                                                 |
| Making changes (modifying sound)    | Amplitude · Pitch · Play with both                                                                                                                                                                                                                                                         | one slider each, then an XY box                                                                                                                                                         |
| Synth basics                        | Playing the synth · Different pitches · Changing the sound · Making many changes · What can synths sound like? · Slow, evolving sounds · Sound effects · Drums and percussion                                                                                                              | press and hold; three labelled sliders (amplitude, "brightness", "movement"); sequenced demos                                                                                           |
| Envelopes (change over time)        | Change over time · Synthesizer envelopes · Attack · Decay and sustain · Release · Putting it together · Modulating amplitude · Matching envelopes                                                                                                                                          | draw a shape and hear the pitch follow it; ADSR stage by stage; a real instrument's loudness contour beside the synth's ADSR                                                            |
| LFOs (change that repeats)          | Change that repeats · Modulating pitch · Speed · Amount · Shape                                                                                                                                                                                                                            | a speaker on a spinning carousel; sine, saw and square buttons                                                                                                                          |
| Oscillators (how synths make sound) | How synths make sound · Waveforms you can hear · Pulse width · Modulating pulse width · Fast modulation                                                                                                                                                                                    | a bee's wings, where a tone appears above ~20 Hz; a square↔saw morph; slow modulation reads as behaviour, fast as timbre                                                               |
| Filters (sculpting the sound)       | In the real world · In synthesizers · Resonance                                                                                                                                                                                                                                            | music through a wall, then an opening door; a low-pass curve; an XY box for cutoff and resonance                                                                                        |
| Recipes (making sounds), 18         | Get to know this synth · Plucked bass · West coast lead · Wow bass · American siren · German siren · Lasers · Kick drums · Subbass · Old-fashioned computer · Hihat · Strings · Noisy lead · Distortion · Bouncing ball · Release pluck · Two sounds in one · Setting up your own controls | finished patches, one panel at a time                                                                                                                                                   |
| Playground                          | the whole synth                                                                                                                                                                                                                                                                            | Perform XY + Map · Record (60 s) · Sequence · Presets · Keyboard; square and saw oscillators, noise, pitch, amplitude, low-pass filter, amp envelope, LFO, mod envelope; Export to Live |
| Learning more                       | next steps                                                                                                                                                                                                                                                                                 | other kinds of synthesis, Live's synths, Learning Music                                                                                                                                 |

The site is available in 15 languages, needs no account and never gates a page.

## 7. How Learning Synths teaches

- **Change before source.**
  - It starts with what a student can hear changing: loudness and pitch, then envelopes (change over time), then LFOs (change that repeats).
  - Only then does it cover where sound comes from (oscillators) and how it's shaped (filters).
- **One concept, one control:** one slider → an XY box (two parameters) → a grouped panel (introduced by "Get to know this synth") → the whole synth in the Playground.
- **Experience first, then the word.** Each idea runs analogy → control → term. For example: music through a wall → a cutoff slider → _low-pass filter_.
- **The visual is the sound:**
  - an envelope drawing with a dot that traces it on every note;
  - a filter curve that moves with the cutoff;
  - a waveform that morphs;
  - a small dot on each slider showing its modulation;
  - modulation amounts in their own colour.
- **Captions** under every widget name what to listen for.
- **Carry and reset:**
  - **Open in Playground** on every widget carries the exact state over.
  - **Reset** appears after any change.
  - A sticky play button runs a sequence.
  - Notes come from the screen, the computer keyboard or a MIDI controller.
- **Module colours:** a chapter's colour is its module's colour in the panels (blue oscillators, yellow filter, green amp envelope, red modulation). Decision 3 keeps our chrome neutral, so this isn't copied.
- **The recipe format:**
  - a finished patch, shown one panel at a time;
  - beside each panel, two or three short paragraphs: what this setting does in this sound and why it was chosen, then one tweak to try;
  - it ends with an invitation to tweak everything.
  - Recipes teach by taking a preset apart, which is exactly what the Studio's genre lessons skip ("load WOBBLE").

## 8. Side by side with the Production Lessons

"Studio today" means `origin/aaron` plus the B4a work in progress in the checkout on 2026-10-16. Paths are under `src/`.

| Area              | Ableton                                                   | Studio today                                                                                               | v2 (prompt 17)                            | Read                                         |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Lesson shape      | 9–14 pages, one concept and one widget each               | 8 lessons, 58 one-line steps (`daw/components/Tutorial/tutorials.ts`)                                      | 12–15-step build-a-track arcs, ~105 steps | Keep the arcs; borrow the page anatomy (AB1) |
| Copy              | title, 1–3 sentences, task + question                     | instruction + hint                                                                                         | title, instruction, why, listen           | AB1: `listen` is always a question           |
| Jargon            | glossary popovers                                         | none (no glossary anywhere in `src/`)                                                                      | none                                      | AB2                                          |
| Listening         | A/B with a reveal, crossfader, tap-along, quiz            | "press play" (`isPlaying`)                                                                                 | a listen checkpoint every 4–6 steps       | AB3                                          |
| Answers           | Show the answer fills the model                           | none                                                                                                       | Show me: a cursor flight to the target    | AB4                                          |
| Practice          | target → open → break the rule → free + export            | none                                                                                                       | an experiment step per stage              | AB5                                          |
| Starting material | stems and prepared patterns                               | every lesson boots an empty project (`daw/session/intents.ts:474-483`)                                     | add-track steps                           | AB6                                          |
| Progress          | Resume and a bar per lesson; completion page; Next lesson | a ✓ Completed tile in a flat grid (`components/ClassroomLayout/studio/StudioProduction.tsx:43`); no Resume | complete card; Next lesson → preview      | AB7                                          |
| First lesson      | a free tour of the format                                 | Make your first track, which is Premium (`daw/components/Tutorial/tutorialCatalog.ts`)                     | the same Premium lesson as "Start here"   | AB8                                          |
| Gating            | never                                                     | validated steps block Next (`daw/components/Tutorial/TutorialLayer.tsx:164-170`)                           | Skip after 20 s                           | Keep v2 (owner, 2026-10-16)                  |
| Beats             | a course                                                  | steps inside Hip Hop and House                                                                             | the same, longer                          | AB9                                          |
| Synth             | ~50 pages                                                 | load WOBBLE, then "tweak it"; one synth anchor (`synth-preset-selector`)                                   | one filter step (`synth-filter`)          | AB10–AB12                                    |
| Visuals           | envelope dot, filter curve, morphing wave                 | filter curve, static ADSR, an oscilloscope that drifts (`daw/oracle-synth/components/visualizers/`)        | —                                         | AB13                                         |
| Keyboard and SR   | keys help per widget, screen-reader notes                 | card has no dialog role                                                                                    | `role="dialog"`, `aria-live`              | P6 (3.15) keeps the rest                     |

**Facts behind the proposals (checked in the code on 2026-10-16):**

- **No-write A/B path.**
  - `previewTrack(trackId, patch)` and `endTrackPreview()` play a track as if patched without writing the store (`daw/engine/trackReconciler.ts:100-110`).
  - Masters and returns have their own versions (`daw/engine/preview.ts`).
  - A previewed mute isn't heard: `preview()` keeps the previous audibility (L434).
  - Any `tracks` write re-reconciles (L465-466).
- **One labelled undo step:** `withTransaction(label, fn)` (`daw/store/history.ts:298`).
- **Starting from prepared material:**
  - The template seed is at `daw/session/intents.ts:451-463`, and the demo seed (with `await prepareDemo`) at L466.
  - Demos get their drums from `drumGrooveId` (`daw/data/demoSeed.ts`).
  - Midnight Groove has Keys, Bass, an Oracle lead and `groove-hiphop-1`, so 4 layers (`daw/data/demoProjects.ts`).
  - The dashboard lists every demo (`components/ClassroomLayout/studio/StudioDemos.tsx:45`).
- **Progress:**
  - `useTutorialProgressStore` persists only `completedAt` (`features/tutorials/useTutorialProgressStore.ts:116`), and the user switch resets only that (L265).
  - The draft META already records `{id, stepIndex}` (`daw/persistence/drafts/draftContext.ts:42-46`), and `?draft=` opens a draft (`daw/session/parseBootIntent.ts:108`).
- **Oracle synth:**
  - The envelope section has PLUCK, PIANO and PAD buttons (`daw/oracle-synth/components/modules/EnvelopeModule.tsx:24-32`).
  - There's no filter envelope: you route ENV MOD to FILTER 1 CUTOFF through the mod matrix (`addModRoute()` then `updateModRoute`, `store/slices/modulationSlice.ts:6-8`).
  - LFOs are drawn shapes, always tempo-synced, with no shape buttons. The shape helpers exist (`audio/LFOWaveformBuilder.ts:117`), and nodes are written with `setLFONodes` (`store/slices/lfoSlice.ts:138`).
  - `useWtPosModulation` is never mounted, so wavetable-position routes do nothing.
- **Drums:**
  - The drum editor has no swing control (`daw/components/Controls/DrumMachineView.tsx`).
  - The Grooves library has 29 grooves in 9 genres; Pop, Jazz, House and Afrobeat have none (`daw/data/groovesLibrary.ts`).
  - `designedGrooveEvents` is at `daw/midi/loadGrooveEvents.ts:25`.
- **Genre tempo data:** the curriculum's `tempoRange` strings are placeholders marked `// NOTE`, with no house, EDM or indie profile (`curriculum/data/genreProfiles/*.ts:20`). A genre-tempo card needs its own curated table.
- **Rendering:** `renderProject` renders only the live project (`daw/audio/renderProject.ts:121-124, 177`). Rendering a single patch needs 1.11's graph builder.

## 9. Proposals (AB1–AB13; awaiting sign-off as decision 17)

Each is a candidate change to the plan. "Where" names the prompt that would carry it. None is scheduled until the owner signs it off.

- **AB1 Step copy rules and step kinds.**
  - Title: 2–4 words.
  - Instruction: one action, 20 words or fewer.
  - `why`: 25 words or fewer.
  - `listen` is always a question.
  - A new `kind` (do · listen · compare · tap · quiz) is shown as an icon, as Ableton's "Try this" does.
  - _Where:_ 17, Amendment A1. Cost: small.
- **AB2 Glossary.**
  - `[[term]]` in step text opens a short definition in a popover, with an optional link to the matching Learn lesson.
  - About 40 seed terms.
  - An integrity test makes sure every term has an entry.
  - _Where:_ 17, A2. Cost: small.
- **AB3 Listening as an exercise.**
  - **`listen`:** a question plus a reveal.
  - **`compare`:** a settings A/B on the student's own project, played through the no-write preview path, so it never autosaves, syncs or becomes an undo step.
  - **`tap`:** tap-along with live "too slow / too fast / just right", where halftime counts.
  - **`quiz`:** instant feedback and a one-line why.
  - _Where:_ 17, A3. Cost: medium.
- **AB4 Model answers.**
  - "Show the answer" applies the model as one labelled undo step.
  - "Back to mine" undoes it.
  - _Where:_ 17, A4. Cost: small.
- **AB5 A Practice stage closing every lesson:**
  1. a target with a model;
  2. "make it yours", with the model as one example;
  3. keep it (save, bounce or keep producing).
  - _Where:_ 17, A5 (content). Cost: in the lesson rewrite.
- **AB6 Lessons start from prepared material.**
  - `startFrom` takes a template or a demo.
  - Lesson-only demos are hidden from the dashboard.
  - _Where:_ 17, A6. It amends v2's "the boot is 1.1/1.4's" rule. Cost: small.
- **AB7 Courses, Resume and chaining.**
  - Course sections on the Production tab with "n of N done".
  - Resume through the lesson's draft.
  - A one-line skill recap and Next lesson on the complete card.
  - _Where:_ 17, A7. Cost: medium.
- **AB8 A free "Building blocks" opener.**
  - It starts from Midnight Groove: solo and mute the four layers, then try a glossary term, a compare, a quiz and Show me.
  - It becomes "Start here", so a free student's first tile isn't locked.
  - _Where:_ 17, A8. Cost: small.
- **AB9 The Beats course (L1).** Four lessons on the drum machine:
  1. What is a beat: tempo, a genre-tempo card, tap-along;
  2. Kick and snare;
  3. Hats and subdivisions;
  4. Grooves and genres.
  - _Where:_ 17a. Cost: ~1.5–2 developer-weeks.
- **AB10 The Sound-design course (L2).** Five lessons on the Oracle synth, in Learning Synths' order:
  1. Shape a note (amp ADSR);
  2. Bright and dark (filter);
  3. Pick a waveform;
  4. Make it move (LFO);
  5. Plucks (envelope to filter).
  - Spotlight, never hide (decision 2).
  - _Where:_ 25a, after 3.11's Play page. Cost: part of ~2–2.5 developer-weeks.
- **AB11 Recipes.** Four short lessons take a factory preset apart one section at a time, explain why, and suggest a tweak:
  - WOBBLE, linked from EDM;
  - BASS, linked from Hip Hop;
  - PLUCK, linked from Pop and House;
  - PAD, linked from Indie and R&B.
  - _Where:_ 25a.
- **AB12 Match it.**
  - Each sound lesson ends by matching a target sound, rendered once offline from the target patch, within a tolerance on one or two parameters.
  - _Where:_ 25a. It needs 1.11's single-patch render.
- **AB13 Teaching visuals in the shared synth UI, for everyone:**
  - a steady (triggered) oscilloscope;
  - a stage dot on the envelope drawing while a note plays;
  - LFO shape buttons.
  - _Where:_ 3.11 (prompt 25). Cost: ~0.5 developer-weeks.

## 10. Not adopted, and why

- **Separate lesson pages with their own mini instruments.**
  - The owner chose lessons inside the editor (§11).
  - It would also build a second set of instrument UIs and a second audio path, against decision 2 and the shared-context rule (`src/audio/core/AudioContextOwner.ts`).
- **A Continue that never waits:** the owner kept v2's rule (detect the action, Skip after 20 s). Detection is what makes the coach card feel alive.
- **Producer stems and artist videos:** licensing and production cost. If wanted, a lesson intro can link "Hear it in" songs from the Songs library instead.
- **15 languages:** out of scope for the overhaul.
- **A shared showcase and Share links:** these belong to Stage D's sharing and review work (4.0–4.1).
- **Chapter colours on the synth's modules:** decision 3 keeps colour for musical meaning.

## 11. The owner's direction (2026-10-16)

1. **Docs now, build after Stage B.** No lesson code in this session. Another session was building B4 in the same checkout.
2. **Scope:** upgrade the genre lessons, and add a Beats course and a Sound-design course. No Mixing course: R&B and Indie already cover mixing.
3. **Where:** inside the Studio editor, with the same coach card and the editor as the playground.
4. **Gating:** keep v2's rule: detect the action, with a Skip link after 20 s.

## 12. Questions for sign-off

- **Tap verdicts:** "Just right" within ±4% of the project BPM, with halftime and doubletime accepted with a note.
- **Building blocks demo:** Midnight Groove as it is (it's the perf baseline, so it isn't edited), or a new lesson-only demo.
- **Recipes:** four short lessons, or one lesson with four parts.
- **Prism:** Beats and Sound design use no Prism, so both courses are free. Is that confirmed?
- **AB13:** in 3.11 (recommended), or in 25a.
