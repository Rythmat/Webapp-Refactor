# Soundtrap studio: editor anatomy, side by side with the Studio

Recorded 2026-10-16 at the owner's request: "look at the placement of every component in their editor … every feature and placement documented to update the Studio section." It complements the review behind [`29-D-teaching-features.md`](../29-D-teaching-features.md) (2026-10-14) and the rails decision recorded in `STATUS.md` (B3 entry: the transport moves to a bottom rail, a side rail drives the Inspector).

**Status: signed off 2026-10-16 as plan decision 16.** The owner made this the next phase of the overhaul: the rest of Stage B, prompts 15–16 (milestones 2.8, 2.9, 2.12–2.15, then 2.10, 2.11 and the Stage B exit). Section 13 is now the scope and section 14 records the answers. This file stays the measured reference those prompts read.

## How this was measured

- A signed-in Soundtrap studio (free account) in Chrome, in the scratch song "Untitled song (Oct 16, 2026 12:44 PM)". That song now also holds what this pass added: a Verse section, a Grand Piano track, a loop track and a Smart Drummer track with one region. Nothing was shared, invited, published or bought.
- Viewport **1477 × 1065 CSS px** (Chrome zoom 110%), plus a small-window check at **1273 × 688**. 1366 × 655 could not be reached: the window would not go below 967 px tall.
- Sizes are CSS px read from the DOM (`getBoundingClientRect`); colours come from computed styles.
- Screenshots live in `~/Desktop/References/soundtrap-2026-10-16/`:
  - `01`–`49`: the two earlier passes the same day (rails, drawer per track type, the effects library). Cited as **[01]**.
  - `anatomy/a01`–`a33`: this pass. Cited as **[a01]**.
- Not exercised:
  - recording (it needs microphone permission);
  - MIDI devices and the Tuner;
  - file import;
  - meters during playback;
  - the light theme;
  - live collaborators and video calls.

## 1. The frame

```
     0           282                                          1030       1425  1477
   0 +---------------------------- top bar, 52 ------------------------------------+
     | logo  File Edit Settings Help | undo redo | save icon  Project name        |
     |                                         Try for free | Invite | Export      |
  52 +-------------+------------------------------------------+---------+-------+
     |             | comment lane 26 (while Comments is open) |         |       |
     | Private     | section lane 26: [+ Section] [Verse] ... |  side   | side  |
     | Solo/Mute   | ruler 48: bar numbers, cycle, playhead   |  panel  | rail  |
 130 +-------------+------------------------------------------+  391    |  48   |
     | track card  | lane, 64 pitch                           | (when   |       |
     | 274 x 60    | ...                                      |  open)  | Lib   |
     | + Add track | Quick Actions tiles in the empty space   |         | Fx    |
     |             |                 zoom + -, horizontal bar |         | ----  |
 551 +-------------+-- editor drawer, 245-857 (458 default) --+         | People|
     |   tabs centred, Close top left, 20 px grab strip on top |         | Cmnts |
1009 +---------------------------------------------------------+---------+-------+
1013 +---------------------------- bottom rail, 48 ---------------------------------+
     | Master v | 00:00.0 | Rec [Play |< << >>] Cycle | C 120bpm 4/4 Click v | Support |
1065 +-------------------------------------------------------------------------------+
```

- **Floating cards on a flat page.** The page and the top bar are `#16161b`. The side rail, side panel, drawer and bottom rail are separate `#1f1f26` cards with 8 px corners, inset 4 px from the window edges and 4 px from each other. Track cards are `#25252e`. Grouped controls (M+S, the transport group, chips) sit on a white/8 fill. Hairlines are rare: grouping is done with fills.
- **Type:** Matter, 15/400 base and 13/500 in controls; text `#e6e6e6`.
- **Accent:** purple for the selected tab underline, focus rings, Export and Apply buttons, and the selected track's edge (in the track colour). A cyan-to-lilac gradient marks the paid CTA. Effect categories carry their own colours (red for distortion, blue for reverb …).
- **What owns the height:** top bar 52, lane header 74 (100 with the comment lane), bottom rail 52 (a 48 card plus margin). With the drawer open, it adds 458 + 4.
- **What owns the width:** the track column (282), the side panel (391, only when open) and the side rail (52). The canvas takes the rest.
- **Panels push, never overlay.** Opening the side panel shrinks the canvas and the drawer, and the drawer stops at the panel [01, 08]. The Add-track picker, menus and dialogs are the only things that float.
- **The canvas is never empty-looking.** Whenever the drawer is closed, six **Quick Actions** tiles fill the space under the last track (105 × 100, 10 px gaps, 3 × 2): Browse loops · Patterns Beatmaker · Play the synth / Add new track · Import file · Invite a friend [a01]. They show even when the project has tracks.

## 2. Top bar (52 px, left to right)

| Control                       | Size             | Notes                                                                                                                                                           |
| ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo "(—)"                    | 53 × 48          | Back to projects                                                                                                                                                |
| File · Edit · Settings · Help | 33 tall menubar  | Lists below                                                                                                                                                     |
| Undo (⌘Z) · Redo (⌘⇧Z)        | 28 × 28          | Divider on each side                                                                                                                                            |
| Save state icon               | 28 × 28          | Tooltip "Saved. Click to restore past versions" [a03]; the click is paywalled (section 10)                                                                      |
| Project name                  | field 270 × 32   | Inline rename; a "Generate name" button sits inside its right end                                                                                               |
| _(space)_                     |                  |                                                                                                                                                                 |
| Try for free                  | 101 × 32         | Gradient pill, diamond icon ("Get more loops and instruments")                                                                                                  |
| Invite                        | 70 × 32, white/8 | "Invite Collaborators" dialog, 480 × 272 [a06]: Share via link (Copy link) and Add people (names or emails + Invite). Edit access only; there is no viewer role |
| Export                        | 77 × 32, purple  | The one filled button in the bar; dialog below                                                                                                                  |

**File** (190 wide): New… · Open… · Open Recent ▸ (recent songs) · Previous versions │ Save as… · Add a version… │ Export… · Import ▸ (Import to Audio track… · Import to Voice & Mic track… · Open in sampler…) │ Open in Desktop App · Share project… │ Go to profile.

**Edit**: Cut ⌘X · Copy ⌘C · Paste ⌘V · Delete ⌫ │ Create region.

**Settings** (200 wide):

- MIDI settings…;
- Tuner (greyed out until an audio track is selected);
- Keyboard ▸ Musical Typing ✓;
- Monitoring ▸ (Monitoring off · Feedback detection on);
- Low latency mode (off);
- Track meters (on);
- Sound quality ▸ (High · Medium · Low · Extra low);
- Podcast tools ▸ Interactive transcript (off);
- Song sections (on; shows or hides the section lane);
- New track color ▸ (Track type · Randomized);
- Language ▸ (12 languages);
- Themes ▸ (Dark · Light).

**Help**: Quick Actions ⌘K · Video Tutorials · FAQ · Soundtrap Discord · Keyboard shortcuts (opens the support article in a new tab; there is no in-app sheet).

**Quick Actions (⌘K)** [a02]: a 600 × 400 palette in the centre, with a search field above a flat list of every command, written "Menu > Item".

- It holds:
  - every menu item, each language and sound quality;
  - the Quick Actions tiles;
  - the track commands (Rename, Duplicate, Delete, Merge, Freeze, Import MIDI, Export track > …);
  - two internal entries ("Engine performance monitoring", "Open project admin page").
- It filters by substring and shows no shortcuts.

**Export** [a04, a05]: a 352 × 494 dialog.

- An **Audio | Note** switch on top. A warning appears when the song is silent.
- Audio: WAV ("Best quality") and OGG (both paid), MP3 (free). Each row has a download icon. Under the list: Mastering style ("Not applied") with + Add style.
- Note: MIDI, Flat.io and Noteflight (all paid).

## 3. The lanes above the tracks

**Comment lane (26 px, only after the Comments panel opens)** [a29]:

- It sits above the section lane and holds a draggable add-comment slider: "Once the slider is positioned correctly, click it to add a comment at the current slider position."
- It stayed visible after the panel closed.

**Section lane (26 px)** [a12–a14]:

- **"+ Section"** (76 × 24) is the lane's first item, at its left end. It opens a list:
  - Intro, Verse, Chorus, Pre Chorus, Bridge, Outro, Interlude, Solo, Hook, Breakdown, Drop, Build Up;
  - ✎ Custom Name.
- A new section is a grey 2-bar block (74 × 24 at this zoom) with its name in the centre and 15 px start and end handles.
- **Clicking a section seeks to its start.**
- Right-click menu: Rename · Delete · Resize · Copy · Loop · Create section after · Create section before.
- Settings ▸ Song sections turns the lane off.

**Ruler (48 px)** [21, a15]:

- Bar numbers, every second bar at this zoom.
- The **cycle band** sits behind the numbers in the top 24 px: drag the middle to move it, the 26 px handles to resize it. Its accessible description explains how.
- The playhead's white handle rides in the lower 24 px. The playhead is a white line through the lanes.
- At the ruler's right end: **Snap** (24 × 24, white circle when on) and **Grid settings** (24 × 24). The grid menu:
  - Grid size: Automatic ✓ · 1/1 · 1/2 · 1/4 · 1/8 · 1/16 · 1/32 · 1/8 triplet · 1/16 triplet;
  - Ruler: Beats · Time.

**Left of the lanes, over the track column**: one switch, **Private Solo/Mute** ("Your Solo and Mute changes won't affect other collaborators"). A first-run coach tooltip points at it.

## 4. Track list

**Column:** 282 px. Cards are 274 × 60 (`#25252e`, 8 px corners) on a 64 px pitch. **+ Add track** (274 × 37) sits under the last card.

**Card, left to right** [26, a09]:

- **Line 1:**
  - **Icon circle** (50 × 60 hit area): the track type's icon, also the "Show instrument" button (opens the drawer, ⌘I). It is grey normally and filled in the track colour when the track is selected.
  - **Name** (198 × 27): a click selects the track.
  - **⋯** (22 × 22), at the top right.
- **Line 2:**
  - **M** (speaker with ×) and **S** (headphones), in one white/8 pill (48 × 24);
  - **R** (record arm);
  - **Automation** (22, a white circle when on);
  - **Volume slider** (84 × 24, white thumb);
  - **Pan knob** (28 × 25).
- **Selected:** a 4 px left edge in the track colour, plus the filled icon.
- **Colours by type:** synth purple, keys teal, drums blue-violet, audio loop lime, Smart Drummer amber.

**⋯ and right-click on the card** open the same menu (219 wide) [27–29]: Rename… · Duplicate track · Delete track ⇧⌫ │ Color ▸ · Merge tracks… │ Freeze track (free up CPU) · Freeze all tracks │ Import MIDI file… · Export track ▸ (WAV audio file · WAV audio file (no effects) · MIDI file · Music notation on Flat.io · Music notation on Noteflight). Right-clicking also selects the track, and the drawer follows.

**Automation** [30, 31, a33]: the automation button grows the card with an inline **+ Automation** button. Its picker:

- Track ▸ Volume, Pan;
- Filter ▸ Sweep;
- free plan: "Automation is limited to 1 track per project" + Upgrade.

**Add new track** [a07, a08]:

- **The card:** a floating card, 582 × 460, centred in the free canvas, with no backdrop and an ×.
- **The tiles:** eight illustrated line-art tiles in a 2 × 4 grid: Voice & Mic · Keys · Bass & 808 · Guitar / Drums & Machines · Guitar/Bass Amp · Synth · Orchestral.
- **The footer:** chips + Import file · Loop library · Sampler.
- **Most tiles add a track at once.** Keys adds "Grand Piano", selects it and opens the drawer on Instrument.
- **Drums & Machines opens a second step** ("‹ Drums & Machines"): Patterns Beatmaker ("Create your own drum beat using a sequencer") | Smart Drummer ("Choose a virtual drummer to play along with your song").

## 5. Clips and the canvas

**Clip anatomy** [a22, a23]:

- a 16 px header with the name and, for keyed loops, the key in bold ("Synth - Lead Euro Dance 3 **Am**");
- the body (waveform or note dashes);
- 12 px **trim** zones on both edges;
- 12 × 12 **fade-in / fade-out** squares in the top corners;
- an 18 px **loop** strip on the right edge with a ↻ icon (a dashed line marks where the loop repeats);
- when selected: a white outline and an **Edit** pill (35 × 18) at the bottom left.

**The Edit pill opens the clip menu** (the same one as right-click), so a trackpad or touch user never needs a right-click.

**Clip menu, MIDI or pattern clip** (200 wide) [a10, a11]: Cut ⌘X · Copy ⌘C · Paste ⌘V · Delete ⌫ │ Edit name… · Split region ⌘E (needs the playhead inside the clip) · Mute region ⌘M · Add comment… │ Change pitch ▸ · Quantize ▸ · Change rhythm… │ Generate drums · Add to loop library… (paid) · Open in sampler (paid).

- **Change pitch** is a flyout: "0 semitones", a slider, − Octave / + Octave, then Clear · Apply.
- **Quantize**: 1/1 … 1/64 · 1/8 triplet · 1/16 triplet · 1/8 swing · 1/16 swing.

**Clip menu, audio clip** [a21]: the same, except Quantize and Change rhythm give way to:

- Reverse;
- Vocal Cleanup, Vocal Tuner, Voice Transform ▸, Stem Splitter (Beta, New), all paid.

**Empty lane, right-click**: Cut · Copy · Paste · Delete (greyed out) │ Create region · Add comment….

**Clicks:**

- A click on empty canvas **seeks**.
- A click on a clip selects it and its track, and **opens the drawer on that clip's editor**: a pattern opens Patterns, an audio clip opens the effect chain [a24].
- A double-click on an audio clip does the same, and also opens the Effects library with the next slot armed [a20].
- A right-click on another track's clip does **not** move the selection.

**Bottom right of the canvas**: zoom + and − (22 × 22), the horizontal scrollbar, and a thin vertical scrollbar on the right.

## 6. Editor drawer

**Frame** (detail in [36–49]):

- A floating card between the canvas and the bottom rail.
- **Height:**
  - 458 by default, resizable 245–857 with a 20 px grab strip ("Panel height").
  - **It is fixed in px.** At 1273 × 688 it stays 458 and leaves an 18 px sliver of the arrangement [a31].
- **Close** (32 × 32) at the top left.
- **Tabs:** centred, 4 × 110, 15 px; the active one white and underlined.
- Piano Roll adds a maximise icon (Escape does not restore it [13]).
- It **follows the selected track** and carries its tab over [46].

**Tabs per track type:**

| Track                         | Tabs                                                             | Shots      |
| ----------------------------- | ---------------------------------------------------------------- | ---------- |
| Drums (Patterns Beatmaker)    | Instrument · Patterns · Piano Roll · Effects                     | [36–39]    |
| Synth, Keys                   | Instrument · Chords · Piano Roll · Effects                       | [47, 48]   |
| Smart Drummer                 | Instrument · Effects                                             | [a25, a26] |
| Guitar/Bass input, audio loop | **no tabs**: preset + knobs, an input row, then the effect chain | [49, a20]  |
| Master (from the bottom rail) | the same slot: Gain · Mastering style (8 styles) · Output        | [15, 16]   |

**Instrument tab:**

- A centred 1200 px header: preset ‹ › ▾ · Save Preset… · three or four quick knobs (Grand Piano: Treble, Reverb, Pan, Volume).
- Then the play surface in an inset card:
  - drum pads;
  - or a full-width keyboard (C3–C5+) with computer-key labels, and a Sustain · ‹ Octave › · Auto-chords row.
- With the side panel open, the keyboard is **cut off** at the right edge rather than reflowed [a32].

**Smart Drummer** [a25, a26]:

- Until a region exists, a blurred preview says "Create a region on the track to start using the drummer." (or "Select a region…").
- With a region:
  - a list of styles, each with ▶ preview (paid ones say "Try Sound Starter free");
  - four part rows (Kick/Snare · Hi-hat · Toms · Other), each with ‹ pattern › and a Halftime switch;
  - Complexity, Loudness and Fills sliders and a Humanize switch.
- A new region is named after the style ("Toronto R&B").

**Patterns, Chords, Piano Roll, Effects**: see the README of the earlier passes, sections 36–49. In short:

- **Patterns:** a step grid with Draw | Velocity, grid and length, plus Generate and Clear.
- **Chords:** a chord-set picker, 8 pads with key hints, and playing styles.
- **Piano Roll:** a tool column (Velocity, Pitch + Snap to key, Quantize + Glue, MIDI tools: Note length, Arpeggiator, Humanize, Strum) and a floating tool pill (Select, Draw, Velocity, Delete).
- **Effects:** a horizontal chain of 174 × 251 cards, behind a round Fx bypass.
  - An **Add effect** card **arms a slot** and opens the Effects library.
  - Each pick appends the effect and re-arms the next slot.

## 7. Side rail and panels

**Rail** (a 48 px card, inset 4 px):

- Four 32 × 33 icons in two groups: **Sound library · Effects library** │ **Collaborators · Comments**.
- The active one is a white tile. Tooltips open to the left [02, 25].
- One panel is open at a time; a second click or × closes it.

**Panels** are 391 px wide and run from under the top bar to the bottom rail.

**Sound library** [a16–a19]:

- **Header and tabs:** "Sound library" with ×, then **Sounds | Packs**.
- **Search** with a purple focus ring. The placeholders invite plain language: "Describe an artist or genre reference", "Describe the sound you want".
- **Filters:**
  - ♡ (favourites);
  - **Instruments ▾** (20, each with a count: Drums 13.7k, Synth 5.1k, Percussion 3k, Kick 2.6k, Snare 2.4k, Hi hats 2.3k, Guitar 2.2k …);
  - **Genres ▾** (20: Hip hop 8.2k, Pop 7.3k, RnB 5.5k, Trap 4.1k, EDM 3.1k, Rock 2.5k …);
  - **Type ▾** (All loops · Audio · MIDI · One-shots │ Any scale · Minor · Major │ My Loops).
- **Tag chips:** Drums · Hip hop · Pop · RnB · Synth · Trap · EDM · Percussion · Kick · Rock.
- **Rows** (about 42 px): ▶ preview · a type icon (waveform for audio, a note for MIDI) · "Artist - Name (type)" · ♡ · +.
  - **No key, tempo or length is shown,** even on hover.
  - **+** opens a small menu: **Add new track** | Open in sampler (paid).
  - Add new track makes a track named after the loop, with an 8-bar clip at bar 1. The clip shows its key; the project key and tempo were already set, so neither changed.
- **After the first add,** a "Top picks for this project" block appears at the top. Four of its five picks were locked ("Start free Sound Starter trial").
- **Packs:** chips, then "Sample packs" as a 3-column grid of cover art (name + genre).

**Effects library** [04, 05, 40–45]:

- **Header:** Effects | Plugins tabs, then an AutoTune-trial promo card.
- **Search:** "Try Overdrive, Equalizer, Delay".
- **Category chips:** ♡ · All · Distortion · Reverb · Delay · EQ · Modulation · Filters · Dynamics · Amps · Utility · Creative.
- **List:** Recently used first. Each category then has a coloured icon, a one-line purpose ("Reverb: place sounds in a space") and a sideways carousel of effects with a › button. Premium effects carry a badge.

**Collaborators** [06]: the empty state says "Make music together.", lists Collaborate in real time · Video call in studio · Record on desktop, tablet or phone, and has an **Invite collaborators** button.

**Comments** [07, a27, a29]:

- An empty state ("No comments yet").
- It adds the comment lane (section 3).
- **Add comment…** on a clip or lane opens a popover at the click point: the time ("00:12") · × · a field "Comment or mention others with @" · send.

## 8. Bottom rail (a 48 px card)

| Group                | Controls (left to right)                                                                                                                               | Notes                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Left                 | **Master ▾** (150 × 32: label, an output meter 65 × 8, chevron)                                                                                        | Opens the Master drawer in the editor's slot [15]                                                                                                                                                                                          |
| Centre (one cluster) | Time readout "00:40.0" (m:ss.t, 76 × 20)                                                                                                               | Not clickable; Beats/Time lives in the grid menu                                                                                                                                                                                           |
|                      | **● Rec** (70 × 32) · [**Play** (white) · Go to start · Rewind · Fast forward] in one white/8 group (160 × 32) · **Cycle** (40 × 32)                   | Tooltips name the shortcut ("Arrow left") [22–24]                                                                                                                                                                                          |
|                      | **Key** "C" (71) · **Tempo** "120 bpm" (77, an inline field) · **Time signature** "4/4" (54) · **Metronome** (32, a white circle when on) + caret (24) | Key popover 298 × 217: Major \| Minor, a keyboard-shaped grid of 12 roots, Clear · Apply. Time signature: 4/4, 3/4, 6/8, Custom…. Metronome menu: Turn off · Click · Tick · Hihat · Clave │ Volume │ Count-in 2 bars · 1 bar · Off [17–20] |
| Right                | **Support** (86 × 32)                                                                                                                                  | Opens Soundtrap's support chat                                                                                                                                                                                                             |

## 9. Keyboard shortcuts (Soundtrap's support article)

| Area         | Keys                                                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General      | Space play/pause · Ctrl+Space record · ← / → rewind / fast forward · Enter back to the start (restarts a recording) · ⌘Z / ⌘⇧Z · ⌘X / ⌘C / ⌘V · Shift+drag fine-tunes knobs and sliders                                                                                          |
| Editor       | Shift+arrows move a region · drag (Shift fine, ⌘ ignores snap) · Shift+click adds to the selection · Delete · ⌘+drag zooms to the selection · ⌘← / ⌘→ or ⌘+wheel zoom · ⌥+wheel vertical zoom · Shift+wheel scrolls sideways · ⌘E split · Shift+↑/↓ a semitone · ⌘⇧↑/↓ an octave |
| Track header | ⌘+click on solo/mute clears all solos/mutes; ⇧⌫ deletes the track (menu)                                                                                                                                                                                                         |
| Piano roll   | Hold ⌥ to draw, ⌥⌘ for velocity, ⌥⇧ to erase                                                                                                                                                                                                                                     |
| Instrument   | ⌘I shows or hides it                                                                                                                                                                                                                                                             |
| Loops        | ⌘U opens the loop tab · ↑ / ↓ previews the next or previous loop · P preview · F favourite · Enter adds the loop                                                                                                                                                                 |
| Effects      | ⌥+arrows move the selected effect                                                                                                                                                                                                                                                |

## 10. What the free plan locks

The plan modal ([a28]) offers four plans:

| Plan                 | Per month (yearly price) |
| -------------------- | ------------------------ |
| Production & Vocals  | US$16.59 ($199.08)       |
| Vocals & Songwriting | US$13.59 ($163.08)       |
| Music Production     | US$13.59 ($163.08)       |
| Sound Starter        | US$9.59 ($115.08)        |

A Monthly/Yearly switch says yearly saves 21%.

**Locked on the free plan:**

- **Version history:** "Previous versions", and the save icon's "restore past versions", open the plan modal.
- **Export:** WAV, OGG, MIDI and notation; only MP3 is free.
- **Automation:** more than one track.
- **Sound tools:** the sampler, Add to loop library, the vocal tools, the stem splitter.
- **Content:** some loops, drummer styles, effects and mastering styles.
- **Chords:** paid too (seen 2026-10-14).

## 11. Behaviour across regions

**Worth copying:**

- **One selection drives the drawer.** Clicking a clip opens its own editor tab. The drawer follows the selected track and keeps the tab that applies.
- **The Edit pill on a selected clip** puts the context menu one click away without a right-click. That matters on Chromebook trackpads, where right-click is a two-finger tap.
- **The library and the chain are one state** [40–46]. Add effect arms a slot and opens the library; every pick fills the slot and re-arms the next one; × cancels.
- **Panels push the layout** instead of covering the canvas or the drawer.
- **Library adds make a track.** + on a row makes a new track named after the loop, at bar 1, with no drag needed.
- **Clips show their key** in the header.
- **Clicking a section, or empty canvas, seeks.**
- **Menus show their shortcuts**, and paid items carry a badge in the menu itself.
- **Everything has an accessible name**, e.g. "Show instrument, Bright Synth", "Synth - Lead Euro Dance 3 [Am] region on track …". Handles are sliders with descriptions.

**Not worth copying:**

- **The fixed 458 px drawer.** At 1366 × 655 the frame alone (52 top + 74–100 lanes + 52 bottom) plus the drawer comes to 636–662 px, so no lanes would show. That is arithmetic; the window could not reach that height. Our dock already takes a share of the body with snap points.
- **The 282 px track column and 60 px cards.** They are fine at 1477 wide, but they take 21% of a 1366 px Chromebook.
- **Quick Actions tiles under existing tracks.** They are clipped by the canvas at small heights [a30] and compete with the music.
- **The first click after Escape is swallowed.** Menus and dialogs needed a second click after closing one. Our Radix menus had the same bug until B1.
- **Purple accent, the gradient CTA, colour-coded effect categories and the Matter font.** They break the owner rules: a neutral accent, colour only for musical meaning, and Glacial Indifference everywhere.
- **Video calls** (SD6) and **paywalled version history** (`research.md` lists it as a trap).

## 12. Side by side with the Studio

"Studio now" means the B3 build on `origin/aaron`, plus the B4a rails work-in-progress in the checkout on 2026-10-16. Paths are under `src/daw/`.

| Region             | Soundtrap                                                                                                | Studio now                                                                                                                                                                                   | Read                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Top bar            | 52; menubar · undo/redo · save icon · name · CTA · Invite · **Export**                                   | 44 (`shell/layout/layoutModel.ts:16`); Back · Project ▾ · name · save chip · undo/redo · **view tabs** · Share · ⋯ · avatar                                                                  | Ours is denser and carries the views. Export lives in Project ▾ (ST11)                        |
| Command palette    | ⌘K, every command, no shortcut hints                                                                     | None. The 1.6 registry (`commands/registry.ts`) already lists every command with its keys                                                                                                    | ST9                                                                                           |
| Lanes above tracks | comments 26 · sections 26 · ruler 48 (cycle behind the numbers); Snap and Grid at the ruler's end        | toolbar 32 · ruler 32 (loop strip 14 + numbers 18) · chord lane 24 (`shell/tracklist/rowLayout.ts:13-23`)                                                                                    | Our chord lane has no Soundtrap equivalent; keep it. ST4 for sections and comments            |
| Track column       | 282; 274 × 60 cards, 64 pitch                                                                            | 200 (`shell/tracklist/TrackArea.tsx:40`); 64 px rows                                                                                                                                         | Keep ours (width). Borrow the selected-row treatment and the icon-as-instrument button (ST10) |
| Row controls       | icon · name · ⋯ / M+S pill · R · automation · volume · **pan**                                           | grip with colour bar · name · presence · ⋯ / M · S · Arm · fader over meter                                                                                                                  | Ours has metering. A pan knob would need room (Mix has pan)                                   |
| Track menu         | Rename · **Duplicate** · Delete · Color · **Merge** · **Freeze** · Import MIDI · **Export track ▸**      | Rename · Colour · Role · Monitor input · Test sound · Show automation · Release · Delete (`shell/tracklist/TrackMenu.tsx`)                                                                   | ST10                                                                                          |
| Add track          | floating picker, 8 illustrated tiles, a second step for Drums, footer chips                              | Add-track sheet: Keys · Synth · Organ · Instruments · Drums · Sampler · Voice · Guitar · Bass · Import MIDI                                                                                  | ST12                                                                                          |
| Empty canvas       | Quick Actions tiles whenever the drawer is closed                                                        | Empty-project tiles only (Start with a beat · Play an instrument · Start from a genre · Add a track)                                                                                         | Keep ours                                                                                     |
| Clip chrome        | header + key · trims · fades · loop strip · **Edit** pill                                                | name; fades and split from the menu                                                                                                                                                          | ST1, ST2                                                                                      |
| Clip menu          | 14 items for MIDI, 16 for audio                                                                          | Audio: Fade In/Out · Split at Playhead · Duplicate · Delete. MIDI clip or empty lane: only "Prism — Suggest Chords" (`components/Timeline/Timeline.tsx:467-485, 3013-3135`)                  | ST1: the biggest gap a student hits                                                           |
| Clip click         | opens the drawer on the clip's editor                                                                    | Double-click a MIDI clip opens the piano-roll modal (`setEditingClip`, `Timeline.tsx:1970`); audio does nothing                                                                              | Plan 2.9 already moves this into the dock (ST3)                                               |
| Drawer / dock      | fixed 458 (245–857); tabs vary by type (2–4); Effects last; Master shares the slot                       | ChannelStrip: Controls · FX · Grooves · Parts · Prism · Piano Roll, hidden when they don't apply; height a share of the body (0.36/0.40), 120 px–85%, snap points                            | Keep our sizing. Tab order and Master: owner questions                                        |
| Side rail          | 4 icons in 2 groups; panels 391, fixed                                                                   | 6 icons (Insight · Library · Effects · Lessons · People · Chat; `shell/inspector/railPanels.ts`); Inspector 240–420, default 300 (`layoutModel.ts:51-53`)                                    | Ours already pushes, as Soundtrap's does. Comments becomes a 7th panel with 4.3               |
| Sound/loop browser | Sounds and Packs, 3 filters with counts, tags, rows ▶ ♡ +                                               | None: Library holds 4 templates; loop and sample drag payloads are half-built (plan F11)                                                                                                     | ST5                                                                                           |
| Effects library    | categories with purposes, carousels, armed slot                                                          | Effects panel: 10 effects, a click adds one and opens the dock's FX                                                                                                                          | ST6                                                                                           |
| Bottom rail        | Master ▾ │ time │ Rec · Play · Go to start · Rewind · FF · Cycle │ Key · Tempo · 4/4 · Click ▾ │ Support | 44 (`layoutModel.ts:18`): Master (fader, meter, FX → Mix, automation) │ Play · Rec │ readout · Loop · Click · count-in ▾ │ Key (circle of fifths) · Tempo + Tap · Metre (`shell/bottombar/`) | Ours is more musical (circle of fifths, Tap, 12 metres). ST7, ST8                             |
| Shortcuts          | Space · Ctrl+Space record · ←/→ · Enter to the start · ⌘E split · ⌘M mute region                         | Space · R (asks) · Esc stops · Home/End markers or ends · ⌘E **Export MIDI** (`commands/keymaps.ts:681`) · M click · L loop                                                                  | ⌘E and M clash with Soundtrap's habits (ST1)                                                  |
| Collab             | Private Solo/Mute switch; Invite = edit access only                                                      | Share pill, People and Chat panels, a Listen toggle on rows                                                                                                                                  | ST13                                                                                          |

## 13. Proposals (ST1–ST15; signed off as decision 16)

Each is a candidate change to the plan. "Where" names the milestone that would carry it. None is scheduled until the owner signs it off.

- **ST1 One clip menu, plus an Edit pill.** Every clip gets the same menu:

  - Cut · Copy · Paste · Delete;
  - Rename · Split at playhead · Mute clip · Add comment (4.3);
  - Transpose ▸ (± semitones and octaves; 4.6) · Quantize ▸ (MIDI) · Reverse (audio);
  - Prism ▸ (Premium) at the end.

  A selected clip shows an **Edit** pill that opens the same menu. Shortcut clashes to settle: Soundtrap users expect ⌘E to split (ours exports MIDI) and ⌘M to mute a clip (M is our click). _Where:_ 3.3 Timeline (P1).

- **ST2 Clip chrome.** A header carrying the name and, for pitched clips, the key (already 4.6's "Pitched clips show their key"). Visible trim zones, fade squares and a loop strip with ↻, as in [a22]. _Where:_ 3.3.
- **ST3 A click on a clip opens its editor in the dock.** Notes for MIDI, the drum grid for drums, the clip or effects for audio. The dock follows the selected track; a right-click selects too. This is plan 2.9's "Maximize replaces the modal", spelled out. _Where:_ B4 (2.9).
- **ST4 Lanes above the ruler.** Two lanes, both added above the ruler, which keeps the loop strip and numbers:

  - a **comment lane**, only while Comments is open, with an add-comment handle;
  - a **section lane**, with **+ Section** at its left end. Today 29-D puts "+ Section" next to "+ Marker" in the toolbar; the lane end costs no toolbar room.

  Sections seek on click and get Soundtrap's menu plus 29-D's "Duplicate with clips". _Where:_ 4.3, 4.4 (amends 29-D's placement).

- **ST5 A sound and loop browser modelled on the Sound library.**

  - One search, Instrument / Genre / Type filters with counts, tag chips, and rows with ▶ · ♡ · +, where + makes a new track.
  - Music Atlas can go further than Soundtrap: every row shows **key, tempo, length and chord function**, and a "Fits your song" block replaces Soundtrap's "Top picks".

  _Where:_ 2.8's Browser tab / 3.8, with F11.

- **ST6 The effects library and the chain as one state.** Add effect arms a slot; the side panel opens on Effects; every pick fills the slot and re-arms the next one; × cancels. Categories get one-line purposes, in neutral colours. _Where:_ B4 / 3.6.
- **ST7 Bottom-rail parity where it helps.**

  - Bring back **Go to start** as a button. Stop, Back and Forward left the top bar on 2026-10-16; Home and Esc remain.
  - Put a **metronome menu** on the Click caret: sound, volume, count-in.
  - Keep our circle-of-fifths key, Tap tempo and metres, which already beat Soundtrap's.

  _Where:_ the B4a rails work in progress / 2.5.

- **ST8 Master in the dock's slot.** The Master button opens Gain, the master chain and an Output peak meter in the dock, instead of jumping to Mix. The Mix view stays for full mixing. _Where:_ 2.10 (B5).
- **ST9 A command palette (⌘K / Ctrl+K)** built from the 1.6 registry: searchable, grouped by scope, **with the shortcuts shown**, which Soundtrap's lacks. Check Ctrl+K against `registry.test`'s reserved-key list. _Where:_ 2.11 (B5).
- **ST10 Track menu and row.**

  - Add Duplicate (B3 open issue 1), Export track ▸ (WAV, WAV dry, MIDI, MusicXML) and Freeze (CPU relief on Chromebooks; needs Stage C).
  - Right-click on a row opens ⋯.
  - Mark the selected row with a left edge in the track colour, and make the instrument icon open the dock.

  _Where:_ 2.6 follow-up / 3.x / C2.

- **ST11 Export as one dialog with an Audio | Notation switch.**

  - Audio: WAV or Opus, with mastering on or off.
  - Notation: MIDI and MusicXML (lead sheet).

  It stays in Project ▾. Whether it also gets its own top-bar button is the owner's call. _Where:_ 3.14.

- **ST12 Two-step add-track picker.** Categories first; a second step only where a category has more than one engine (Drums → Drum grid | Grooves). Import and the browser go in a chip row under the tiles. _Where:_ 2.6 follow-up.
- **ST13 Private solo/mute in collab rooms.** One switch over the track column makes M/S per user, not room-wide. It answers the open 1.2 sign-off ("Bypass per user vs room-wide"). _Where:_ C4 (1.14).
- **ST14 The save chip opens version history** once named checkpoints exist, and it stays free. _Where:_ later (research.md "must"); not scheduled.
- **ST15 Keep what Soundtrap gets wrong out:**

  - a fixed drawer height;
  - tiles under existing tracks;
  - a 282 px column;
  - colour-coded effect categories;
  - a paywalled history.

  This is a guard for B4/B5 reviews, not a feature.

## 14. The owner's answers (2026-10-16)

1. **Scope:** ST1–ST12 and ST15 make up the rest of Stage B. ST13 goes to 1.14, Freeze (part of ST10) to 1.12b, and ST14 stays with Versions (deferred).
2. **Dock tabs:** per track type, with Effects last.
   - Drums: Instrument · Grooves · Notes · Effects.
   - Melodic: Instrument · Prism · Notes · Effects.
   - Audio and live-input tracks: their chain only.
   - The Parts tab moves into the browser.
3. **Transport:** Go to start, Rewind and Fast-forward buttons in the bottom rail, plus a metronome menu.
4. **Master:** opens in the dock's slot. The Mix view stays.
5. **Export:** a top-bar pill, the bar's only white-pill action, opening one Audio | Notation dialog. It stays in Project ▾ too.
6. **Sections:** Create's toolbar row folds away. The sections lane takes its row, with "+ Section" at the lane's left end.
7. **Palette:** a ⌘K command palette, with shortcuts shown.
8. **Limits found while planning** (checked in the code):
   - Reverse and the clip loop strip wait: there's no reversed-buffer playback and no clip repeat model.
   - The metronome gains a volume and a choice of sounds. Neither exists today, and the click runs through the mastering chain.
   - The browser lists drum kits rather than one-shots, since no one-shot items exist.
