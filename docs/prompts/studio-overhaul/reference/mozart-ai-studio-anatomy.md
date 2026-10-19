# Mozart AI studio: editor anatomy

Recorded 2026-10-16 at the owner's request ("another web DAW that I want you to analyze"), alongside [`soundtrap-editor-anatomy.md`](soundtrap-editor-anatomy.md). Mozart AI is a browser studio built around AI generation.

**How to read this:**

- Sections 1–6 document the editor's layout and interaction, as was done for Soundtrap.
- Section 7 documents its **AI-generation features as facts only**. In keeping with the owner's 2026-10-14 rule on AI-generation research (no Suno-derived ideas in the plan), none of them is proposed for Music Atlas.
- Section 8 lists the **non-AI** patterns worth a look, for the owner to accept or drop.

## How this was measured

- The owner's signed-in Mozart AI account in Chrome, in the project "My First Song", at **1477 × 1065 CSS px** (Chrome zoom 110%). Sizes come from the DOM; colours from computed styles.
- Screenshots: `~/Desktop/References/mozart-ai-2026-10-16/m00`–`m27`, cited as **[m01]**.
- **Credits** (the owner allowed their use):
  - one track generation: Keys, two variants; variant 1 kept;
  - one piano-roll Generate: Chords, R&B.
  - The account counter read "555 actions" before and after.
- Also added: a PolySynth MIDI track and one MIDI clip.
- **Not done:** Publish, Share, invites, Copy link, Upgrade, Compose (the whole-project generation), recording, Scout (the desktop VST helper).

## 1. The frame

```
   0  70  92                                                         1466 1477
   +--+  +---- top bar: three pill groups (y 11-56) ------------------------+
   |n |  | [sidebar + "My First Song v" export share]  [No Key, click,      |
   |a |  |  120, 00:00.0, play stop rec loop]  [undo redo]  [vol Upgrade   |
   |v |  |  Invite avatar settings library]                                |
   |  |  +---- stage: one rounded card 1374 x 987, r24 --------------------+
   |r |  | track col 200 | ruler (numbers every 4 bars)  minimap - +       |
   |a |  | track cards   | clip canvas                                     |
   |i |  | ADD NEW TRACK | ghost clip on hover                             |
   |l |  | 2 x 2 tiles   |      [tools pill] [ prompt bar 750 wide ]       |
   |  |  |               |  drawer slot: piano roll 394 / mixer ~323       |
   +--+  +--------------------------------------------------------------- -+
```

- **Look:** everything floats. A 70 px **nav card** sits at the left (`#242424`, 24 px corners, white/6 hairline). The top bar is **pill groups** (`#242424` at 92%, fully rounded). The work area is one **stage** card (`#1c1c1c`, 24 px corners) on a `#202020` page.
- **Type and colour:** text is Inter, 16 px base, `#d9d9d9`. The accents are a purple track colour, a coral Create button and pink gradients for Upgrade.
- **Library sidebar:** a second card to the right of the stage (435 px). Opening it shrinks the stage [m05].
- **Interface size** in Settings scales the whole studio (85% here) [m09].

## 2. Left nav and top bar

**Left nav:**

- **Collapsed:** 48 × 41 icons, each with a two-part tooltip: Vibe "Make a song" · Layers "Stack loops into a track" · Studio "Produce your song" · Personas "Train a voice model" · Library "Your songs" · Home "Your feed" · Discover "What others made" · Amp "Get your song promoted". The account avatar sits at the bottom.
- **Expanded** (the sidebar button, or the Queue icon) [m25]: grouped headings — Create a song · Dive into studio · Make your own models · Where your songs live · Social · Release · Update (Queue) — then Upgrade to Creator and the account. It pushes the stage rather than covering it.
- **Queue** appears after the first generation, with a badge. It lists jobs ("My First Song · Stem · ✓ Finished").

**Top bar groups, left to right:**

1. **Project pill:** Expand sidebar · New project (+) · **"My First Song ▾"** · Export · Share.
   - The name opens a card with the song's cover art (Regenerate · Upload), then Recent (More ›) [m07].
   - Export: Audio files — Full mix ("All tracks in one audio file") ›, Multitrack ("One audio file per selected track") ›. Project files — Export to Ableton Live and to FL Studio, both "Coming soon" [m08].
   - Share: "Publish to share — Your song needs to be published before it can be shared" (Cancel · Publish) [m26].
2. **Transport pill (centred):**
   - **No Key ▾**: a 280 × 190 popover — Flat keys | Sharp keys spelling switch, a keyboard-shaped grid of roots, Major | Minor, Clear · Close.
   - metronome toggle (white when on) · tempo as an inline field ("120") · time "00:00.0" in a monospace face · Play · Stop · Record (red dot) · Loop.
3. **Undo · Redo pill.**
4. **Account pill:**
   - Listening volume · **Upgrade** (gradient) · Avatar ("555 actions", "Voice off" badge) · Settings · Show/Hide library sidebar.
   - **Invite** (popover 352 × 366): "email or @handle" with a role (Editor; Viewer "coming soon") and Invite, then the member list. Under it, a link setting — "Anyone with the link can view … no Mozart account needed" — with Copy Link.

**Settings** (a 340 × 357 popover; every row has a one-line explanation) [m09]:

- Minimap ("Bird's-eye overview of the arrangement");
- Manual snap override;
- **Hover to add clips** ✓ ("Show a ghost clip on empty lanes; click it to add");
- Suggestion lane ("Show 'next layer' suggestions in an extra track below your tracks");
- Metronome volume;
- **Interface size** ("Scale of the Studio interface; double-click to reset");
- Advanced ▾ (audio devices, MIDI, integrations).

## 3. Tracks

**Column:** 200 px (`#242424`). Each track card is 192 × 93 on white/4.

- **Line 1:** a colour strip with the track number (left) · name · "Change track icon" (on hover) · ⋮.
- **Line 2:** Mute · a volume slider ("Double-click to reset to unity") · S · arm dot.
- **MIDI tracks** add Open piano roll and Open plugin editor icons. A new MIDI track arrives **armed** (red).

**Track menu** (192 wide) [m02, m03]:

- An **inline rename field at the top**.
- TRACK: Color ▸ · Mixer ▸ (No channel, Channel 1–10) · Input ▸.
- CLIPBOARD: Cut · Copy · Paste · Duplicate.
- EXPORT: Export as WAV.
- Delete (Del).

Tracks route to numbered mixer channels, as in FL Studio.

**Add new track:** a 2 × 2 tile group sits **under the last track**, always visible — Add audio track · Add MIDI track · Add drum track · Upload files.

**Add MIDI track → Instrument Picker** ("Type: Instruments") [m17]:

- Tiles: Scout (VST badge; third-party plug-ins through a desktop app) · Rompler · Drum Machine · PolySynth.
- An **About card** explains the selected one ("PolySynth is the quickest built-in option for sketching chords, leads, and bass parts without any extra setup.").
- Confirm with **Load ↵**.

**Instruments open as floating plugin windows**, not in a dock [m18]. PolySynth is about 890 × 525, a light hardware-style panel:

- the preset bar;
- Oscillator, Envelope, Filter, Reverb and Delay sections, as knobs;
- a C1–C8 keyboard.

**Variant lanes** (after a generation) [m13–m15]: the track grows sub-lanes "Variant 1/2", each with a ✓ "Copy to main track". A chevron toggles them, and "Hide lanes" / "Hide all lanes" sit above the column.

## 4. Canvas and clips

- **Ruler:** numbers every 4 bars ("01 05 09 …"). Minimap · Zoom − · Zoom + (24 × 24) sit at its right end. Scrollbars are 12 px.
- **Clicks:**
  - Hovering an empty lane shows a **dashed ghost clip with a +**; a click adds a clip there [m19].
  - A click, or a double-click, on empty canvas or on an audio clip **seeks**. Audio clips have no editor.
- **Clip chrome:**
  - a name header with duplicate (⧉) and ⋮ icons;
  - MIDI clips show a mini note preview and an **"Open Piano Roll" pill** [m20];
  - audio clips get a "Split" pill.
- **Clip menu** (192 wide) [m16]:
  - AI ACTIONS: Convert to MIDI · Split Stems ▸ · Export MIDI;
  - CLIP: Rename · Duplicate ⌘D · Copy ⌘C · Paste ⌘V · Split at Playhead ⌘E · Mute · Warp ✓ (ⓘ ✎) · Reset Stretch · Export Audio · Settings · Delete.
- **Tools pill** (left of the prompt bar): Tool selector — Edit · Select ("Hold ⇧ or ⌘") · Mute · Slice — and Open mixer [m27].

## 5. Drawers inside the stage

**Piano roll** (a bottom drawer, 1372 × 394) [m21, m22]:

- **Header:** a track chip ("● PolySynth"); in the centre Draw · 1/2 (grid) · Q (quantize) · ✦ Suggest; on the right a ↔ zoom slider · ⛶ maximise · ×.
- **Body:** keys, with the roll's own ruler.
- **Notes are rounded blocks labelled with their pitch** (F#4, D#4 …). There are no chord symbols or numerals.
- **Right panel** (about 200 px): Genre ▾ · Pattern Chords | Melody · Color · Generate · Clear all.
- The prompt bar floats above the open drawer.

**Mixer** (a bottom drawer, about 323 tall) [m04]: ten channel strips (fader, PAN knob, M S; strip 1 carries the track's name), a Master strip, and a **Channel Effects** slot list on the right (+ and empty slots).

**Library sidebar** (right card) [m05, m06]:

- Samples | Songs tabs.
- Songs: search, then filter chips (Vibe · Studio · Layers · Drafts).
- Samples: Generate Samples (section 7), then My Samples — filter · search · upload — with "No samples yet … Upload" when empty.

## 6. Prompt bar (the "composer")

A floating 750 px bar centred over the stage, always visible. It moves up above an open drawer.

- **Row 1** (chips):
  - a context chip: "Select or draw a clip", or the target, e.g. "Keys - Empty", "PolySynth";
  - three suggestion chips that change with the context;
  - Shuffle.
- **Row 2:**
  - a persona dot ▾ ("Use personas");
  - an instrument selector "Custom ▾" (a grid: Drums · Bass · Guitar · Keyboard · Percussion · Strings · Synth · FX · Brass · Woodwinds · Vocals · Backing Vocals · Custom) [m23];
  - the prompt (its placeholder rotates — "Sub bass", "Warm chords", "Lead melody" — and **Tab accepts** the suggestion);
  - **Create**, with ▾ for more ("Compose — Arrange the whole project") [m24].
- **After a result**, the bar switches to edit mode: "Describe changes" and **Variate**, with refinement chips ("Add chord variations", "Make tremolo gentler", "Add jazzy extensions").

## 7. AI-generation features (documented, not proposed)

- **Suggestion clip:** an empty project opens with one purple clip offering + Drums · + Bass · + Keys [m01].
  - Picking one turns it into "Generate Keys".
  - It also writes a full prompt into the bar ("Rhodes with lush major seventh voicings, warm tremolo, and smooth neo-soul chord comping — keys only…") [m10].
- **Generation as a job:**
  - The clip becomes a glowing "AUDIO - Keys" placeholder.
  - A status pill counts ("Keys - Empty · Thinking… 3s", then "Generating…").
  - It took about 25 s. A promo modal ("Covers are here") opened during the wait [m11, m12].
- **Variant picker:** "Which variant do you like? Hover to preview", with Original · 1 · 2 · Regenerate · ×. The variants also land as lanes [m13, m14].
- **Piano-roll Suggest and Generate:** genre, Chords or Melody, and Color. Results are editable MIDI notes [m22].
- **Sample generation** (one-shot or loop, "Loops use the project's BPM and Key"); **Convert to MIDI**; **Split Stems**; **Personas** (trained voice models); **Covers** (hum or sing a recording into a song); **Compose** (a whole-project arrangement); AI **cover art** (Regenerate).
- Marketing promos fire on open and mid-generation. Escape does not close the first one.

## 8. Non-AI patterns worth a look (owner's call)

| Pattern                                                               | Fit for Music Atlas                                                                                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **An About card in pickers** (explains the selected instrument)       | Strong fit with the teaching mission: the Add-track sheet and the instrument views could say what each one is for. Ties to Soundtrap ST12 |
| **A one-line explanation under every setting**                        | Fits the Settings and ⋯ menus (2.11 help pass)                                                                                            |
| **Hover-to-add ghost clip** on empty lanes                            | Overlaps B3's Draw tool, which already makes a clip on click. A visible ghost could make it discoverable in the Pointer tool too          |
| **Add-track tiles always under the track list**                       | Cheaper to reach than a sheet. They would cost the 200 px column about 80 px of height; on Chromebooks that is more than one row          |
| **Note labels on notes**                                              | We can do better than pitch names: scale degree, or chord tone (R 3 5 7), coloured for musical meaning (Notes, 3.4)                       |
| **A variant picker** (Original · 1 · 2 · hover to preview)            | As a UI pattern only, for **Prism suggestions** and **recorded takes**, not for generation. Owner's call, given the rule above            |
| **An inline rename field at the top of the track menu**               | Small win (B3 renames with F2/N or double-click)                                                                                          |
| **Multitrack export** ("one file per selected track")                 | Stems for students: matches ST11's Audio side                                                                                             |
| **Interface size slider**                                             | **Conflicts** with the binding decision "ONE interface, no density toggle". Listed only so it isn't proposed by accident                  |
| **Floating plugin windows; tracks routed to numbered mixer channels** | **Don't copy.** Our dock and the per-track strip are simpler for students                                                                 |

## 9. Mozart against Soundtrap, in one line each

- **Frame:** both float cards on a dark page. Mozart puts the whole work area in one rounded stage; Soundtrap uses separate rails.
- **Transport:** Mozart's sits in a centred top pill; Soundtrap's is a bottom rail. The Studio is moving to a bottom rail.
- **Editing surface:** Soundtrap has a docked drawer per track type. Mozart docks only the piano roll and the mixer, and floats the instruments.
- **Browsing:** Soundtrap has a large loop and effects library. Mozart generates samples instead of browsing them.
- **Collaboration:** Soundtrap has comments, Private Solo/Mute and edit-only invites. Mozart has editor invites plus a view-only link that needs no account; that is relevant to Stage D 4.1 (read-only review).
