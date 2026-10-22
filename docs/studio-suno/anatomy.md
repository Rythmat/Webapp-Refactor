# Suno Studio: anatomy

Recorded on 2026-10-21 at the owner's request: "I want to copy as much of Suno studio's design as possible."

This is the reference the new Studio is built against. It records what Suno Studio looks like and how it behaves. It doesn't record how Suno's code is written: none of their code, assets, fonts, icons or wording go into Music Atlas.

UI labels are quoted below only so each surface can be identified. Our copy is written fresh, in Music Atlas's voice.

## How this was measured

- **Account:** the owner's Premier account, in the Chrome named "Marfizo M3 Max" (Chrome/152), project "Untitled Project".
- **Viewport:** 1477 × 978 CSS px, zoom 100%, dpr 1. It became 1477 × 922 after a second tab changed the window chrome.
- **Measurements:**
  - Sizes come from `getBoundingClientRect` and colours from computed styles.
  - Screenshots are 1353 × 896 or 1391 × 868, so multiply by 1.09 or 1.06 to get CSS px.
- **Evidence:**
  - Screenshots are in `~/Desktop/References/suno-studio-2026-10-21/shots/s00…s45`, cited as **[s01]**.
  - The raw notes are in `~/Desktop/References/suno-studio-2026-10-21/measurements.md`.

**Credits** (the owner allowed them "as needed"). The balance went from 10000 to 9926, so 74 credits were spent:

| #   | Flow                                                | Credits                |
| --- | --------------------------------------------------- | ---------------------- |
| 1   | MIDI bassline on a MIDI track                       | 4 for 1 and 2 together |
| 2   | Two-take drum loop on an audio track                | (in the 4 above)       |
| 3   | Get Stems, Auto split (10 stems)                    | 50                     |
| 4   | Get MIDI on a stem                                  | (in the 20 below)      |
| 5   | A full song from the prompt bar, which made 2 songs | 20, including 4        |

**Side effects in the owner's account:**

- Export › Full Song saved "Untitled Project" as a **private** song in the library. Export has no dialog.
- Two "One More Try" songs.
- The scratch project.

Nothing was published, shared or bought.

**Not exercised:**

- Upload, Version History, Share Project, Studio Settings;
- Create Custom Model, Create new plugin;
- Heal Edits, Remove FX;
- recording;
- automation drawing, Advanced split, Split from mix;
- Multitrack export.

## 1. The frame [s01, s03]

```
 y 8  ┌logo┐ [Project ⋯][↶ ↷]      [▥ ◀◀ ● ▶ ⟲][⇥ 00:00.000 001.1.1]      [120 BPM 4/4][Export][Library]
 y 52 ┌── stage card r12 ──────────────────────────────────────────────────────────────────────────┐
      │ track column 260 │ ruler (bars, loop range in pink, pink handles)                         │
      │  header row      │                                                                         │
      │  track 86 high   │ lanes 80 high · one WebGL canvas draws the timeline                     │
      │  …               │                       ┌ prompt bar 648×99 floats here ┐                 │
      │  + Add new track │                       └───────────────────────────────┘                 │
      │  Main (master)   │ overview strip 22 high (minimap, time labels)                          │
      ├──────────────────┴─────────────────────────────────────────────────────────────────────────┤
      │ docked panel(s): devices / automation / notes / takes (they stack)                         │
      └────────────────────────────────────────────────────────────────────────────────────────────┘
 y 934 [⫶ ∿ | ♪ ≡]                 [device-chain pill]                  [▤][− ⇔ +][Learn]
```

- **Page:** background `#101012`. Everything floats as **pills**: radius 999, background `#141417`, 36 px high, labels at 50% white, 12–13 px / 500.
- **Type:** a grotesk for UI text (11–14 px) and a monospace for numbers (time, BPM, knob values, model tags). We use **Glacial** for both, with tabular numbers.
- **Stage:** a card at x 8, y 52, radius 12. It ends above the bottom bar, and docked panels sit inside it under the timeline.
- **Library:** opening it shrinks the stage and **moves the top bar's right-hand pills left with it** [s20].

## 2. Top bar [s01]

| Region                   | Box (CSS px)  | Content                                                             |
| ------------------------ | ------------- | ------------------------------------------------------------------- |
| Logo                     | x 24          | wordmark                                                            |
| Project pill             | 113,8 130×36  | name (12/500) + ⋯ menu [s36]                                        |
| Undo/redo pill           | 251,8 78×36   | ↶ ↷                                                                 |
| Transport pill (centred) | 538,8 174×36  | metronome, rewind, record ●, play/pause, loop (pink when on)        |
| Time pill                | 720,8 217×36  | follow/snap icon · `00:00.000` · `001.1.1` (mono 10/500, 50% white) |
| Tempo pill               | 1157,8 126×36 | `120 BPM   4/4` → tempo popover [s37]                               |
| Export pill              | 1291,8 83×36  | menu: Full Song / Selected Time Range / Multitrack [s34]            |
| Library pill             | 1383,8 85×36  | toggles the right panel [s20]                                       |

**Project menu** [s36]:

- New Project, Open Project, Rename, Duplicate Project;
- Version History, Share Project, "Open a copy in v1";
- Studio Settings (⌘⇧,).

**Tempo popover** [s37]:

- a choice between **Follow Track (May Fluctuate)** and **Manual BPM** (with a check);
- Tap, −/120/+, and a tempo-curve button.

## 3. Track column [s03, s14, s31]

- **Size:** 260 px wide, background `rgba(20,20,22,.85)`, shadow `0 0 20px rgba(0,0,0,.4)`.
- **Header row:** at the top, "collapse all" and "collapse column" icons.
- **Track header:** 86 px high (the lane is 80), **tinted with the track colour** (dark mix) and with a 4 px colour bar at the left.
  - **Row 1:** number, name 11/500, mute (speaker), S, record-arm "A" circle 20 px, ▾.
  - **Row 2:** a volume pill 172×26 (`rgba(255,255,255,.04)`, handle tick) and a pan half-dial 12×40.
  - **On hover:** a collapse caret and a ⋯ menu [s39].
- **Colours by type:** MIDI tracks are yellow, audio tracks purple. Stems get one colour each: pink vocals, yellow drums, green bass, blue guitar, violet keys, and so on [s31].
- **"+ Add new track":** centred under the last track. Its menu offers Audio (A, blue), MIDI (M, green) and Upload (U, purple), each row 36 high with a keycap [s02].
- **Main:** pinned at the foot of the column, 78 high, with the same volume pill and pan dial, plus a speaker icon.
- **Scrolling:** the column scrolls with the lanes.

## 4. Timeline [s08, s09, s16]

- **Ruler:**
  - bar numbers, with beat subdivisions when zoomed in ("1.2, 1.3 …");
  - the loop range is a pink wash across all lanes, with pink square handles on the ruler;
  - the playhead is a blue triangle with a thin line.
- **Clips** fill the lane:
  - The body is **solid track colour**.
  - MIDI notes are darker bars drawn inside; audio waveforms are darker fills.
  - The name sits top-left at 10 px.
  - When selected, small white trim bars appear at both ends [s09].
- **Overview strip:** a minimap under the lanes with mono time labels (00:00, 00:20 …) and a viewport window (`rgba(255,255,255,.06)`, radius 3).
- **Library drop:** dragging a Library song onto empty space makes a new audio track at the drop point, with the clip named after the song [s23].
- **Clip menu** [s24]:
  - Copy ⌘C, Paste ⌘V, Duplicate ⌘D, Delete ⌫;
  - Heal Edits, Split ⌘E;
  - Rename;
  - Clip Color ▸;
  - **Get Stems**, Download .WAV, **Get MIDI**, **Remove FX**.

## 5. Bottom bar and docked panels [s10–s13]

- **Left: four view toggles in two pills.** The active one gets a 20% white fill.
  1. **Devices:** the instrument plus its effect chain [s03, s11].
  2. **Automation:** the empty state says lanes are added by right-clicking a knob › Automate [s12].
  3. **Notes:** for a MIDI track this is a ♪ piano roll; for an audio track it's a waveform editor. The piano roll has keys at the left, notes in the track colour and a velocity lane underneath. Its footer holds audition, Loop, Quantize 1/2, **Key** (it read "C Maj" next to an E-minor bassline, because it isn't linked to the music), Scale, View All, collapse and Parameters ▴ [s10].
  4. **Takes:** one row per take [s16].
- **Centre: the device-chain pill**, tinted with the track colour. For an instrument track it reads "Wavetable +"; for an audio track, "+ Add Track Effects".
- **Right:**
  - a browser/file icon;
  - a zoom pill (−, fit, +);
  - **Learn**, a white pill with black text.

**Devices panel** [s03]:

- The instrument card is 528×208, background `rgba(255,255,255,.04)`, radius 10.
  - Its title row has a colour dot, the instrument name, "‹ Default ›" for presets, expand and close.
  - Its controls are drawn in the track colour (3D wavetable plots, arc knobs with values in mono 8 px).
- Effect slots are dashed boxes (1 px `#2a2a2a`, radius 10) labelled "+ Add audio effect".

## 6. The prompt bar (Suno calls it the "Magic Bar") [s04–s07, s15–s19, s42–s45]

- **Box:** a floating card 648×99, centred low over the timeline. Background `rgba(20,20,22,.85)`, 1 px `rgba(255,255,255,.1)`, radius 20, shadow `0 8 28 rgba(0,0,0,.36)`, with a small "BETA" tag.
- **Row 1:**
  - **(+)**, a menu offering Styles, Lyrics and Controls [s43];
  - a **target chip** in the track's pale colour that names what the prompt acts on: "4 bars · MIDI Track", "Bass", "Audio Track", "New track";
  - split view, and close.
- **Row 2:**
  - the input, with a placeholder that **suggests an action for the current selection** ("write a bassline on this track", "make these notes swing", "transpose up an octave", "add a warm reverb");
  - a model picker [s42]: v6, v6-wild, v6-mini, and "Create Custom Model";
  - a round send button that turns orange once there's text.
- **Escape** collapses it to a 40 px round sparkle button floating over the timeline [s38].
- **While it works:**
  - A status card appears above the bar, the same width, with an animated icon and one rotating playful verb in gradient text [s05, s06, s15].
  - The plan is then shown in that card as it streams in [s16].
  - Send becomes **Stop**, and the input reads "Add a follow-up".
- **When it's done:** the card holds the reply plus **action buttons**. For audio these are "Commit Take 1" (orange, primary) and "Audition Take 2"; they swap when you audition the other take [s17, s18].
- **It edits the project:**
  - It renamed the MIDI track "Bass" and the clips "E Minor Funk Bassline" and "Drums" [s07, s08].
  - It decides the length from the loop range (4 bars by default).
- **Timing:**
  - MIDI parts take about 15 s.
  - Audio loops take about 25 s for 2 takes, **streamed**: the first take previews on its track while it's still rendering [s16].
  - Full songs make **two** library songs, shown as cards in the reply, and are **not** put on the timeline [s44, s45].

## 7. Takes: preview, then commit [s16–s19]

- **Uncommitted generations** show a floating strip under the clip: ✓ keep, ✕ discard, ▲▼ previous/next take.
- **The takes panel** (bottom view 4) lists takes newest first, one 30 px row each: number, ✕, the take's waveform at timeline scale, 👍, 👎, and ↑ "use this one". The take you're hearing gets the track-colour bar.

## 8. Library (right panel, about 345 px) [s20–s22]

- **Home:**
  - 2×2 tiles (All Songs, Liked, Stems, Uploads), each with a coloured 46 px icon square;
  - Workspaces;
  - Studio Projects, each with a thumbnail made of its stacked track colours.
- **All Songs:**
  - **Filters:** filter, sort "New", Liked, In Project, Stems.
  - **Rows:** 46 px cover, title, style line and model tag, grouped by day. On hover: a play overlay on the cover, like, and ⋯.

## 9. Stems and MIDI [s25–s33]

- **"Extract Stems and MIDI" modal:**
  - a song card and a "Full Song" preview row;
  - three modes:
    - **Auto split**, from a list of 12 instruments;
    - **Split from mix**, i.e. "Lead Vocal" plus "everything but Lead Vocal";
    - **Advanced split**, an instrument search.
  - Extract is a gradient pill.
- **Results** [s29, s30]:
  - a "Match project tempo" toggle and **Insert all**;
  - one row per stem, each with icon, name, version tabs, + Insert, 👍/👎, download, ⋯, and a coloured waveform bar with mute/solo;
  - empty stems drop out. 10 stems took about 70 s.
- **Insert all** makes one track per stem, each in its own colour, named "Song (Stem)" and lined up with the source [s31].
- **Get MIDI** shows a toast: "transcribing the selection, may take a few minutes" [s32]. The job ended but no MIDI track appeared during the session.

## 10. Effects [s40, s41]

- **"Add a track plugin" modal:**

  - search;
  - **My plugins**, with "Create new plugin" (AI-made) and saved ones such as "Grit Echo";
  - **Audio effects** cards, each with a live mini UI, name, a **Learn** pill and a two-line description.

  The eight effects are Compressor, Convolution, Delay, Distortion, EQ, Gate, Limiter and Reverb.

- **The Learn page for an effect:**
  - the plugin's real UI with a **step tour** (1/8, Next), where each step says what one control does and how to hear it;
  - **Preview** on the track, and Hide Tips;
  - a beginner-guide video card, a plain description and a list of key controls;
  - **Apply**.

## 11. Learn mode ("What's This?") [s01, s38, s39]

- **On by default.** A first-run card in the lower right explains it and offers Dismiss or Turn off.
- **Hover cards:** hovering any control shows a light card (about `#d2d0ce`, radius 16, about 240 px wide). It has:

  - a bold title;
  - **one plain sentence of purpose**;
  - the control's shortcut rows, each a label with a keycap.

  Examples:

  - Play / pause: SPACE, and play from selection ALT SPACE;
  - Solo: "hear this track on its own…", SHIFT S;
  - Add a track: SHIFT T.

- The **Learn** pill turns it off, and a toast says so.

## 12. Behaviour worth copying

1. **One surface with docked, stackable panels.** There are no separate modes; four bottom toggles open devices, automation, notes and takes under the same timeline.
2. **Colour is identity.** The track colour runs through the header tint, the clip body, the device controls, the chain pill and the prompt chip.
3. **The prompt bar is context-bound.** The chip says what will change, and the placeholder suggests the next sensible action.
4. **Preview, then commit.** Every generation arrives as takes you can audition before keeping one.
5. **Streaming results.** Audio starts playing on the track before it has finished.
6. **Learn everywhere.** Hover explanations plus guided plugin tours. For an education product this is the most important pattern on the page.
7. **Library as a drawer.** The tiles-then-list structure works, and it's drag-to-timeline.

## 13. Not worth copying

- Export saving a library song with no dialog. Students need to see where their file goes.
- The note editor's Key not following the music. Ours is driven by the harmony core.
- Full-song prompts that don't land on the timeline even when asked to.
- Get MIDI finishing silently, so you can't find the result.
- Playful status verbs ("Hallucinating…") for a classroom audience. Ours describe what's happening.
