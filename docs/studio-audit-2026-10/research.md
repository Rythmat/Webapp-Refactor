# Competitor research (2026-10)

## bandlab-soundtrap

### BandLab Studio (web; formerly 'Mix Editor', renamed Oct 2022)

**Layout.** Single-window arrange. Transport (play/stop/record/loop, metronome, tempo, time display) top-centre. Left: track list/headers with volume fader, pan, M/S; track menu has mute, solo, delete, duplicate, collapse, rename. Centre: timeline of audio/MIDI regions. Right: tabbed side panel holding the Effects panel for the selected track and the Loop library (BandLab Sounds) with preview. Bottom: editor panel. Double-clicking a MIDI region opens the Piano Roll docked at the bottom (keyboard left, note grid, velocity lane strip below, draw/select/erase tools, snap/quantize, zoom); it is not a separate modal. Add-track is one '+' that opens a typed picker: Voice/Audio, Virtual Instrument (drums, bass, synth, piano, strings...), Drum Machine, Sampler, Guitar, Bass, Import, BandLab Sounds. Lyrics pane opens from a pen icon in the top bar and syncs to collaborators and devices. Region right-click menu has Gain, Transpose, Stretch, Fade and, since Nov 2024, Splitter (stem separation into 2-7 stems, with stem-to-MIDI). Note: help.bandlab.com returned 403 to the fetch tool, so the panel placement comes from BandLab's own blog plus audeobox.com third-party guides (2025-26).

**Learning and onboarding.** Help-centre articles and blog guides. Getting-started is article based; no in-editor coach-mark tutorial system was found. EDU: classes with join codes. In the Education Studio, the Assignment Brief and Attachments were moved OUT of the Studio side tab 'to simplify the interface, allowing students to fully concentrate on their music creation'.

**Performance and tech.** Browser DAW on Web Audio. Desktop support is officially Chrome (and Brave) only. Recording latency through Chrome's audio stack is reported to vary by 10-50 ms per take. Limits: 16 audio/MIDI tracks and 15 minutes per project (mobile may be lower). In BandLab for Education 2.0 (June 18 2026) Studio was 'rebuilt and further optimized to run lighter and faster across the technology schools already use'. No performance figures were published, and no engineering blog on architecture (WASM, workers) was found.

**Persistence and reload.** Projects auto-save continuously to the cloud with no manual save step. BandLab's own help states it does NOT keep a local save on the device and advises saving revisions often. Revision history is on the Project Page (View Project History, Version History list). Third-party guides warn that because autosave captures every change, accidental deletions are saved instantly, and recommend forking before big changes. Projects are synced across web, iOS and Android.

**AI and theory features.** SongStarter generates ideas from genre, mood and lyrics/emoji (3 ideas per roll, mood toggle changes key/BPM). AutoPitch is real-time vocal tuning. Retune (Aug 2026) is note-level pitch editing. Splitter does AI stem separation and converts stems to MIDI. MIDI Humanize on web. There is no theory analysis (key/chord function) layer, which is the gap Music Atlas Insight fills.

**Visual style.** Dark DAW UI. In 2022 the web effect UIs were redesigned to include visualisations, and the Tuner 2.0 update improved visual contrast. No published design-system documentation was found, so the exact palette was not verified.

**Signature patterns**

- One '+' Add Track with a typed instrument picker. There is a single way to make a track.
- The MIDI editor docks in the bottom panel when you double-click a region. There is no modal editor.
- Right side panel tabs between FX for the selected track and Sounds/Loops browsing with preview.
- Drum Machine: each kit comes with 2 ready-made patterns, and you can save up to 8 patterns for variations.
- Sampler: 16-pad kit you can record into, import into, or fill from sample packs.
- Region context menu for quick edits: Gain, Transpose, Stretch, Fade, Splitter.
- Lyrics pane in the top bar, shared with collaborators.
- Revisions and forking: a fork is an independent copy for safe experiments.
- SongStarter (2022, built with Google/TensorFlow): a dice button generates 3 ideas by genre/mood, with a day/dusk/night toggle that changes key, instruments and BPM, then opens in Studio.
- Retune (Aug 13 2026): per-note pitch segments you drag up or down by up to an octave, with cent precision and manual slicing.

**Weaknesses**

- No local save. A network failure can lose work (BandLab's own help says so).
- Autosaving every change without auto-checkpoints means destructive edits stick. Users are told to fork manually as a backup.
- Real-time co-editing is limited. Collaboration is mostly asynchronous (add tracks, sync).
- Desktop is officially Chrome-only, and browser-path recording latency is inconsistent.
- Hard caps of 16 tracks and 15 minutes.
- Looper is mobile-only, so features differ between platforms.
- AI tools (SongStarter dice) generate ideas but do not explain the harmony.

**Sources**

- <https://blog.bandlab.com/studio-faq/>
- <https://blog.bandlab.com/bandlab-studio/>
- <https://help.bandlab.com/hc/en-us/articles/115002945193-Saving-Issues>
- <https://help.bandlab.com/hc/en-us/articles/4402292152857-Navigating-the-Project-Page>
- <https://help.bandlab.com/hc/en-us/articles/115002959894-Using-the-Drum-Machine>
- <https://help.bandlab.com/hc/en-us/articles/115004496573-Using-the-Looper>
- <https://help.bandlab.com/hc/en-us/articles/48010528581529-How-do-I-invite-other-users-to-collaborate>
- <https://blog.bandlab.com/splitter-updated-features/>
- <https://blog.bandlab.com/whats-new-on-bandlab-8-exciting-feature-updates-youll-want-to-try/>
- <https://sonicstate.com/news/2026/08/13/bandlab-introduces-more-precise-vocal-tuning/>
- <https://sonicstate.com/news/2022/03/08/-ai-powered-tool-aims-to-fix-writers-block/>
- <https://www.audeobox.com/learn/bandlab/bandlab-getting-started/>
- <https://www.audeobox.com/learn/bandlab/bandlab-midi-programming/>
- <https://www.audeobox.com/learn/bandlab/bandlab-collaboration-features/>
- <https://www.starryhope.com/chromebooks/music-production-on-chromebook/>

### BandLab for Education 2.0 (launched June 18 2026, separate platform from 1.0)

**Layout.** Classroom shell around BandLab Studio. Teachers create a class and share a join code. An Assignments page centralises Submit and Grade actions. Metronome and Tuner are standalone tools outside Studio. Studio itself has the same anatomy as BandLab Studio, with the assignment brief and attachments taken out of Studio's side tab.

**Learning and onboarding.** Join code class setup, assignments with attached reference material, and standalone practice tools (metronome, tuner). The design keeps instructions next to the project rather than inside the DAW chrome.

**Performance and tech.** Marketed as a Studio 'rebuilt and further optimized to run lighter and faster' on 'typical student laptops'. Runs on Mac, Windows, Linux and Chromebook. Supports COPPA/FERPA plus state and district data-privacy agreements. $2.50 per student per year, free for eligible Title I schools. Released June 2026, so it is recent and independent performance reviews are not yet available.

**Persistence and reload.** Not detailed in the launch material. The new portable file format suggests project and assignment state can live outside the cloud account. Offline and local-first support is not stated.

**Signature patterns**

- Portable assignment file: starting materials plus instructions packaged as one file you can send through LMS, Google Classroom, a shared drive or email.
- Teachers attach notes and reference materials directly to projects, so instructions and creative work stay together.
- Metronome and Tuner open standalone, without loading the DAW.
- Submit and Grade live on one Assignments page, not inside the editor.
- Join code onboarding with nothing to install.

**Weaknesses**

- Separate platform: existing 1.0 users are not upgraded automatically and need a migration.
- No published performance numbers to back the 'lighter and faster' claim.
- No theory-aware feedback or grading support. Grading is manual.

**Sources**

- <https://bandlabtechnologies.com/news/bandlab-for-education-2-0-launch/>
- <https://musictech.com/news/music/bandlab-for-education-2/>
- <https://sonicstate.com/news/2026/06/19/bandlab-for-education-20-launches/>
- <https://interspacemusic.com/blog/?p=6492>
- <https://help.edu.bandlab.com/hc/en-us/articles/37204004840473-Update-Enhancing-Your-BandLab-for-Education-Experience>
- <https://help.edu.bandlab.com/hc/en-us/categories/900000030343-Assignments-Personal-Projects>

### Soundtrap Studio (web; Soundtrap 2.0 redesign Feb-Mar 2026)

**Layout.** Pre-2.0 (documented Oct 2024): transport bar at the BOTTOM (play, record, restart, stop, master volume, tempo, KEY, metronome, count-in). Left track headers (add new track, record-enable, automation lanes, S/M). Centre arrange window with a loop bar. '+ Add New Track' opens an instrument chooser (e.g. Grand Piano, Drums & Machines > Patterns). 'Browse for Loops' opens the loop library (23,000+ Originals, filtered by instrument/genre, plus Freesound search). Editors: Piano Roll, Patterns Beatmaker (step grid), audio editor. Per-track FX section with effects colour-coded by function. Comments: a comment icon on the top timeline, or right-click a clip, with a Comments panel to reply and resolve. Sections for song structure. Soundtrap 2.0 (blog Feb 17 2026, launch Mar 4-11 2026) 'refreshed the entire studio interface' to be 'cleaner, faster', with 'all the most powerful tools immediately accessible'. It also added automation across nearly every effect, a Mac desktop app that syncs in real time with web, no track limits, and a rebuilt mobile app focused on listening back. Video scoring (Aug 2026) adds a floating video preview window over the tracks. Effects VST support in the desktop app was announced Sept 2026. Exact 2.0 panel placement is not documented in public text and may differ from the 2024 description.

**Learning and onboarding.** Mostly outside the studio: a Student course (Unit 1 Outside Studio, Unit 2 'beginner's tour of the studio... what all the buttons do', 'loops in 3 easy steps' activity), a lesson plans library, rubrics, a Teacher Certification Course (Young Producers Group), and demo projects in the top right of the dashboard. No in-editor spotlight tutorial engine was documented.

**Performance and tech.** Uses Web Audio, Web MIDI, MediaRecorder and MediaStream. Soundtrap's engineer told the W3C (2021) that round-trip latency was about 30 ms at best and that latency compensation needs exact timestamps, which MediaRecorder does not guarantee. AudioWorklet means 'you do everything yourself'. Soundtrap recommends Low Latency Mode and USB mics on Chromebook. Reports on Chromebooks are mixed: one school found 'works brilliantly, latency rarely an issue', while others note slow mixdown on weak connections. The 2.0 desktop app exists mainly for lower-latency recording and unlimited tracks.

**Persistence and reload.** Live autosave has been on since 2022, so every change syncs and there is no manual save. Time Restore keeps named, cloud-stored versions, but only on paid plans. Deleted projects can be restored for 30 days. The desktop app syncs in real time with the web studio. No offline mode.

**AI and theory features.** Chords (progression suggestions by set, style and key, inserted as editable track). Smart Drummer (generated, editable MIDI drums). Patterns Beatmaker. Vocal Panel with AI noise removal and real-time pitch. Automastering on export. Storyteller auto-transcription for podcasts. No live harmonic analysis of what the student wrote.

**Visual style.** Dark mode since 2021-22. Effects are colour-coded by function: distortion purple, modulation pink, space blue, EQ/compression yellow, utility green. Purple step squares in Patterns. 2.0 is described as 'cleaner' and 'not distracting', but no design-system specifics are published.

**Signature patterns**

- Tempo, KEY, metronome and count-in sit together in the transport. Key is a first-class project setting.
- Timeline comments anchored to time or a region, with a Comments panel and resolve. Used by teachers for feedback.
- Sections (song-structure blocks) in the arrange view.
- Chords tool (2023): 3 steps (set Basic/EDM/Hip Hop, playing style, key), then pick suggested progressions in order and insert them as an editable instrument track next to the piano roll.
- Smart Drummer (2023): genre-driven auto-generated drum patterns that land as EDITABLE MIDI, complementing Patterns Beatmaker.
- Time Restore (Mar 2023, paid plans): restore earlier saved versions and RENAME favourite versions.
- Project Restore: recover deleted projects within 30 days.
- Live collaboration with autosave and 'no sync button' (2022), plus built-in video calling.
- Demo projects by genre as learning templates.
- Low Latency Mode setting plus published latency guidance.
- Floating video preview for scoring, with the video's own audio as a muteable track.

**Weaknesses**

- Version history (Time Restore) is paywalled, though students need it most.
- Using colour for effect categories competes with colour that carries musical meaning.
- The Chords tool is marketed as 'without music theory'. It is a black box that does not explain its suggestions.
- A teacher guide (Midnight Music, Sept 2026) warns that loop browsing 'will take over' and squeeze out composing time.
- The 2.0 mobile app was rebuilt around listening back, which reduces creation on phones (reported Mar 2026, may change).
- Needs internet. There is no offline mode.

**Sources**

- <https://blog.soundtrap.com/new-soundtrap/>
- <https://musictech.com/news/gear/soundtrap-2/>
- <https://blog.soundtrap.com/how-to-make-music-in-soundtrap/>
- <https://blog.soundtrap.com/introducing-chords/>
- <https://soundtrap.com/content/news/smart-drummer>
- <https://blog.soundtrap.com/introducing-time-restore-in-soundtrap/>
- <https://www.soundtrap.com/content/product/patterns-beatmaker>
- <https://www.soundtrap.com/content/product/online-piano-roll>
- <https://www.hypebot.com/spotify-adds-live-collaboration-to-online-music-studio>
- <https://support.soundtrap.com/hc/en-us/articles/26663690434066-Latency>
- <https://support.soundtrap.com/hc/en-us/articles/4410664013586-How-to-Use-Patterns-Beatmaker-on-iPad-and-Tablet-in-Soundtrap>
- <https://w3.org/2021/03/media-production-workshop/talks/ulf-hammarqvist-audio-latency.html>
- <https://tutorialtactic.com/blog/soundtrap-shortcuts/>
- <https://rekkerd.org/plugin-and-play-soundtrap-transforms-remote-collaboration-with-third-party-vst-capability>

### Soundtrap for Education

**Layout.** Teacher dashboard outside Studio: classes, assignments, and (2025-26) subfolders for nested assignment and project folders. Teachers can check in remotely, comment on progress, see project status, and invite several students to one project, each recording on separate tracks. Studio feedback comes through timeline comments, chat and video calls. Video scoring inside Studio arrived Aug 2026.

**Learning and onboarding.** Student course units, lesson plans, rubrics, teacher certification, and demo projects. The Midnight Music teacher guide advises short 30-60 s projects and choosing 3-4 key moments BEFORE opening the loop browser.

**Performance and tech.** Same engine as Soundtrap. Soundtrap's latency article recommends Low Latency Mode and external USB mics on Chromebooks. Video scoring guidance recommends desktop or Chromebook over mobile browsers. Videos are capped at MP4, max 5 minutes, with export quality depending on plan.

**Persistence and reload.** Live autosave, Project Restore within 30 days, and Time Restore versions on paid tiers.

**Signature patterns**

- Assignments created in Soundtrap or pushed through Google Classroom, Microsoft Teams, Schoology, Canvas or MusicFirst.
- Rostering via Clever and ClassLink (2023-25).
- Subfolders for organising assignments (2025-26 school year).
- Project Restore within 30 days, so student deletions are not fatal.
- Culturally responsive instruments (sitar, tabla, taiko, xalam, timbales).
- Teacher comments anchored to the timeline instead of a separate feedback doc.

**Weaknesses**

- Feedback is free-text comments and chat, with no structured or theory-aware rubric inside Studio.
- Learning material lives in separate courses and videos, not step-by-step inside the editor.
- Plan tiers change what students can do (video export quality, custom uploads).

**Sources**

- <https://edu.soundtrap.com/product-updates-and-releases/>
- <https://edu.soundtrap.com/student-resources/>
- <https://edu.soundtrap.com/what-is-soundtrap-for-education/>
- <https://midnightmusic.com/2026/09/music-tech-soundtrap-video-scoring-guide-music-teachers/>
- <https://techlearning.com/how-to/soundtrap-how-to-use-it-to-teach>
- <https://SoundTrap.com/edu>

### Borrow

| Priority | Pattern                                                                                                                                                  | From                                                                                                                                                                  | Why for Music Atlas                                                                                                                                                                                                                                                                                                                                                                                                                                     | Changes                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| must     | Open the MIDI editor in one docked bottom panel when you double-click a region, and drop the modal version                                               | BandLab Studio (piano roll in the bottom panel); Soundtrap (piano roll and Patterns as in-studio editors)                                                             | Fixes the known 'modal piano roll alongside a dock tab' duplication. Students learn one place where notes are edited, and the timeline stays visible above for context, which matters when Insight is analysing the selection.                                                                                                                                                                                                                          | src/daw/components/PianoRoll/PianoRollModal.tsx (retire), PianoRoll.tsx (dock PIANO ROLL tab only); double-click handling in src/daw/components/Timeline/Timeline.tsx; the bottom dock in src/daw/components/Studio/StudioView.tsx                                 |
| must     | A single '+ Add track' entry that opens a typed picker (Instrument / Drums / Sampler / Audio-Voice / Guitar-Bass amp / Import / From Library)            | BandLab Studio '+' track-type picker; Soundtrap '+ Add New Track' to instrument or Patterns                                                                           | Cuts the 'many entry points' problem. Beginners get one predictable path, and teachers can say 'click + and choose Drums' in a lesson. Library drag-in can remain a power path.                                                                                                                                                                                                                                                                         | Track header add button in src/daw/components/Timeline/TimelineWithHeaders.tsx and TrackControls; Library drag targets in src/daw/components/Library/LibraryPanel.tsx; tutorial steps in src/daw/components/Tutorial/tutorials.ts that reference add-track targets |
| must     | Lighter studio for low-end student laptops and Chromebooks: an explicit performance budget, split loading, and standalone tools that do not load the DAW | BandLab for Education 2.0 (Studio 'rebuilt... lighter and faster'; Metronome and Tuner standalone outside Studio)                                                     | Our audience matches theirs (school Chromebooks). The monolithic lazy chunk and the 30 fps store-driven playhead are the matching weaknesses. Lazy-load each dock tab, view (Score, Lead Sheet, Master, Practice) and instrument UI. Drive the playhead from a requestAnimationFrame ref or CSS transform reading the AudioContext clock instead of the Zustand store. Let Practice tools (metronome, tuner, Practice Track) open without the full DAW. | src/daw/DawApp.tsx (route-level split), src/daw/components/Studio/StudioView.tsx (per-tab React.lazy), src/daw/components/Transport and Timeline playhead, src/daw/store (remove high-frequency position from the store), src/daw/components/Practice              |
| must     | Continuous autosave plus automatic and NAMED checkpoints (version history) that are free, with recover-deleted-project                                   | Soundtrap Time Restore (rename favourite versions) and Project Restore (30 days); BandLab Revisions and Fork                                                          | Students make destructive mistakes, and teachers need to see progress over time. Starting a lesson, template or demo currently discards unsaved work, so auto-checkpoint before those actions. BandLab shows the danger of autosave without checkpoints: accidental deletes persist.                                                                                                                                                                    | src/daw/persistence/SessionSerializer.ts (snapshot list in IndexedDB plus server), the File menu (Versions..., Restore), and the lesson/template/demo start path in src/daw/DawApp.tsx                                                                             |
| should   | Keep assignment and lesson instructions out of the studio chrome. Show only a slim, dismissible coach card or 'brief' chip.                              | BandLab for Education (moved the Assignment Brief and Attachments out of Studio's side tab 'so students can fully concentrate')                                       | Matches the move of Lessons to their own Studio tab. In the editor, the tutorial spotlight and coach card should be the only instructional surface, and the right panel stays Insight + Library.                                                                                                                                                                                                                                                        | src/daw/components/Tutorial/CoachCard.tsx, TutorialLayer.tsx, Spotlight.tsx; right panel in src/daw/components/Library/LibraryPanel.tsx                                                                                                                            |
| should   | Time- and region-anchored comments with a Comments panel (reply, resolve), used for teacher feedback                                                     | Soundtrap (comment icon on the timeline ruler, right-click a clip, Comments panel, live comments)                                                                     | Lets teachers say 'bar 9: this V should resolve to I' exactly where it happens, and links naturally with Insight's chord functions. Reuse the existing Yjs collab doc for storage.                                                                                                                                                                                                                                                                      | src/daw/collab (YjsDocManager.ts, presence.ts, ui), Timeline ruler in src/daw/components/Timeline/Timeline.tsx, a new right-panel tab next to Insight                                                                                                              |
| should   | Sections / song-form blocks on the arrange ruler                                                                                                         | Soundtrap Sections                                                                                                                                                    | Form (verse, chorus, bridge, AABA, 12-bar) is a core theory concept. Labelled sections give Insight and PRISM a scope ('analyse the chorus') and make lesson steps easier to target.                                                                                                                                                                                                                                                                    | Timeline ruler/markers in src/daw/components/Timeline; Insight scope in src/daw/components/Library/SelectionAnalysis.tsx; Lead Sheet sections                                                                                                                      |
| should   | Keep generators to a 3-step happy path (style, feel, key) with advanced controls behind disclosure, and always insert an EDITABLE result                 | Soundtrap Chords (set, playing style, key, then pick progressions in order); Soundtrap Smart Drummer (genre to editable MIDI); BandLab SongStarter (3 ideas per roll) | PRISM currently shows genre, key/mode, circle of fifths and rhythm all at once, which is dense. Lead with 3 choices and show 3 candidate progressions as Roman numerals plus chord names (our edge over Soundtrap's black box). Put circle of fifths and rhythm under 'More'. GROOVES output should open in the piano roll/drum grid as editable notes.                                                                                                 | src/daw/components/Prism and src/daw/prism-engine; GROOVES tab; PianoRoll dock                                                                                                                                                                                     |
| should   | Region context menu with quick, safe edits (Gain, Transpose, Stretch, Fade, Duplicate, Split, Open in editor, Analyse in Insight)                        | BandLab region actions (Gain/Transpose/Stretch/Fade) and right-click Splitter                                                                                         | Moves common actions to where the student is pointing, which reduces toolbar density and tiny controls. 'Analyse in Insight' and 'Show in Score' connect editing to theory.                                                                                                                                                                                                                                                                             | Timeline region interactions in src/daw/components/Timeline/Timeline.tsx; Insight hooks in src/daw/components/Library                                                                                                                                              |
| could    | Key, tempo, metronome and count-in grouped together in the transport                                                                                     | Soundtrap transport bar (tempo, key, metronome, count-in in one place)                                                                                                | Key is the project's central theory setting. Showing it next to tempo in the transport, and keeping it in sync with Insight's detected key, makes it obvious and editable with one click.                                                                                                                                                                                                                                                               | src/daw/components/Transport; Insight KeySection in src/daw/components/Library/KeySection.tsx                                                                                                                                                                      |
| could    | Recording latency setting and in-product guidance (Low Latency Mode, mic advice)                                                                         | Soundtrap Low Latency Mode and latency help article; Soundtrap W3C engineering notes                                                                                  | Vocal chain and NAM amp sim depend on monitoring latency. Chromebook students need a clear toggle and a calibration/offset step instead of silent drift.                                                                                                                                                                                                                                                                                                | Recording settings in src/daw/audio; vocal chain and amp-sim instrument UIs under src/daw/instruments                                                                                                                                                              |
| could    | Phone = review mode (listen, comment, see Insight and lead sheet), tablet/desktop = full editor                                                          | Soundtrap 2.0 rebuilt mobile app for listening back (Mar 2026); Soundtrap tablet Patterns guide                                                                       | Fitting the full dock and timeline onto phones creates the density problem. A read-mostly phone layout (playback, Lead Sheet/Score, comments) is achievable and useful for students practising.                                                                                                                                                                                                                                                         | src/daw/components/Studio/StudioView.tsx responsive layout; LeadSheet and Score views; Practice view                                                                                                                                                               |
| could    | Shareable assignment package = starting project + instructions + reference material as one file or link                                                  | BandLab for Education 2.0 portable assignment file                                                                                                                    | Teachers can distribute a lesson starter (template + tutorial steps + reference audio) through Google Classroom without account setup. It extends our existing template/demo/lesson start parameters.                                                                                                                                                                                                                                                   | src/daw/DawApp.tsx start params (template/demo/lesson), src/daw/persistence/SessionSerializer.ts export/import                                                                                                                                                     |

### Avoid

- **Cloud-only saving with no local copy** (BandLab (help centre: does not store a local save on device; save revisions often)): School Wi-Fi drops. Music Atlas should stay local-first (IndexedDB) with background cloud sync, so a reload or offline moment never loses work.
- **Autosaving every change with no automatic checkpoints, so destructive edits stick** (BandLab (guides recommend manual forking before big changes)): Beginners and lesson starts (which clear the session) need automatic restore points, not a fork habit.
- **Putting version history behind a paywall** (Soundtrap Time Restore (paid plans only)): Students need undo-across-sessions most, and teachers rely on history to assess process. It should be core.
- **Rainbow colour-coding UI categories (effect types)** (Soundtrap FX (distortion purple, modulation pink, space blue, EQ/comp yellow, utility green)): Breaks the Music Atlas rule that colour is reserved for musical meaning (chord function, scale degree, key). Use monochrome icons and labels on #101012 instead.
- **Black-box generators sold as 'no music theory needed'** (Soundtrap Chords; BandLab SongStarter dice): Music Atlas's value is explaining why. Every PRISM or GROOVES output should show Roman numerals, function and a lesson link through Insight.
- **Making the loop/sound browser the main path to creation** (Soundtrap (Midnight Music teacher guide: browsing 'will take over' and squeeze composing into the last five minutes)): Keep Library secondary and collapsible, and lead with key, chords and form so class time goes to composing.
- **Instructions and assignment panes competing inside the editor** (BandLab for Education 1.x Studio side tab (later removed for focus)): Adds yet another entry point and panel. Use one coach card and keep briefs outside Studio.
- **Hard, silent project caps (16 tracks, 15 min) and Chrome-only support** (BandLab Studio): If limits are needed, show them clearly and early. Students and teachers on Safari/iPad and Firefox should not hit undisclosed failure modes.
- **Splitting the education product into a separate platform that needs migration** (BandLab for Education 2.0 (existing users not upgraded automatically)): Music Atlas classroom and Studio already share one app. Evolve the editor in place and keep project formats backward-compatible, with SessionSerializer migrations.
- **Features that differ by platform (a tool exists on mobile but not web)** (BandLab Looper (mobile only); Splitter features on Android lagging): Tutorials and lessons have to work the same on every device, or the step-by-step spotlight breaks.

## pro-daws

### Ableton Live 12 (12.0 Mar 2024 to 12.4 May 2026; 12.x current as of Oct 2026)

**Layout.** Single window. Control bar across the top (transport, tempo, and in Live 12 a Scale Mode chooser for the selected clip). Browser on the left: labels/collections, plus a Filters section and Quick Tags panel added in the 12.2 browser overhaul. The main area switches between Session View (clip grid) and Arrangement View (linear timeline). The Detail area along the bottom holds Clip View (note editor, envelopes, Transform/Generate MIDI Tools panels) and Device View (device chain). Live 12 lets you STACK Clip View and Device View so both show at once. The Mixer can now be toggled inside Arrangement View, and each mixer section can be shown or hidden. Info View (context help) sits bottom-left. Learn View (12.4, replacing Help View) is a docked lesson pane that can also play video picture-in-picture. Navigate menu shortcuts: Opt/Alt+0 Control Bar, 1 Session, 2 Arrangement, 3 Clip, 4 Device, 5 Browser, 6 Groove Pool, 7 Learn View.

**Learning and onboarding.** Info View for hover help. Learn View (12.4) has video and text modules with progress checkoffs; Ableton says only a handful of modules exist so far and more will be added over time. Separate web resources: Learning Music (8 chapters: Beats, Notes and Scales, Chords, Basslines, Melodies, Song Structure, Advanced, Playground, built around a clickable grid) and Learning Synths. Ableton's classroom lessons teach Session View and Arrangement View one after the other because the two-view model confuses beginners.

**Performance and tech.** Native desktop app. Neither the manual nor the release notes describe the UI rendering pipeline, so there is no verified web-performance pattern to copy. The relevant UX lessons: stacked views remove view-switching, and the Learn View video floats picture-in-picture instead of covering the workspace. Sound On Sound notes that stacked views get cramped on laptop screens unless you change the zoom/scaling.

**Persistence and reload.** Custom Info Text is saved inside the Live Set. Learn View remembers the last page visited while Live stays open. Per-clip scale is stored with the clip, so scale context comes back with the material. Mixer section visibility is set separately for each context (Session vs Arrangement). Browser saved searches and tags persist, but Sound On Sound reports tags are lost if an item is renamed.

**AI and theory features.** Per-clip Scale Mode, with scale highlighting and folding in the note editor. Scale-aware MIDI Tools: Stacks generates chords and progressions inside the scale. Scale-aware devices, extended in 12.2 to transpose in scale degrees. Sound Similarity search (neural). Stem Separation (12.3). There is no harmonic-analysis or chord-detection display comparable to Logic's Chord ID.

**Visual style.** Flat, dense, grey-on-grey panels using a small set of consistent primitives (small rectangular buttons, sliders, knobs). Live 12 reduced outlining and reworked padding and corner radius to remove visual clutter. Colour mostly comes from user/auto track and clip colours and selection highlights. Themes can follow the OS light/dark setting.

**Signature patterns**

- Info View: a fixed help strip that describes whatever control is under the pointer. Toggled with '?'. Users can add their own 'Edit Info Text' to tracks, clips and devices, and it is saved with the Set.
- Learn View (12.4): structured modules mixing short video and text, filterable by topic, with a 'Complete Lesson' checkoff and progress tracking. It reopens on the last page you visited, video can play picture-in-picture while you work, and new modules ship without needing an app update.
- Stacked Detail Views: the clip editor and the instrument/effect chain are visible together, so you don't keep switching tabs.
- Scale awareness: each clip stores a scale, chosen in the control bar. The note editor highlights in-scale rows and can hide out-of-scale rows (fold to scale). MIDI Tools and scale-aware devices follow the active clip's scale. 12.2 let more devices transpose in scale degrees.
- MIDI Tools in Clip View. Transform tools: Arpeggiate, Chop, Connect, Glissando, LFO, Ornament, Quantize, Recombine, Span, Strum, Time Warp, Velocity Shaper. Generate tools: Rhythm, Seed, Shape, Stacks (chords/progressions in scale), Euclidean. Auto Apply previews changes live and is on by default; turn it off to commit with an explicit Apply. Users can add their own tools with Max for Live.
- Mixer inside the Arrangement view, with show/hide per section (sends, returns, I/O, etc.).
- Browser tags and filters, Quick Tags, saved searches, and Sound Similarity search (ML-based) for samples and presets.
- Keyboard-first: Navigate menu plus an optional 'Use Tab to Navigate Focus' mode. Notes can be moved, transposed, resized and given new velocities from the keyboard. Screen-reader support on macOS and Windows.
- Visual refresh in Live 12: cleaned-up outlines, corner radius, padding and scrollbars. Themes can follow the system light/dark setting. Flat, dense look, with colour carried mostly by track and clip colours.

**Weaknesses**

- Two working paradigms (Session clip grid vs Arrangement timeline) are a known source of beginner confusion. Ableton's own classroom material has to bridge them explicitly.
- MIDI Tools change the notes for real: Sound On Sound says that once you apply and deselect, 'you're committed', so you end up relying on undo.
- The scale follows the selected clip, not a song-wide key track. Sound On Sound flags this as awkward for modulations within a song.
- Stacked detail views are cramped on laptop screens unless you change the zoom.
- Info View only works on hover, so it doesn't help on touch devices, and its text is generic UI help, not musical meaning.
- Learn View launched with only a few lessons. Video lessons go stale when the UI changes.
- Dense small-text UI. Pro-level information density is hard for younger students.
- Browser tags are lost if an item is renamed (Sound On Sound).

**Sources**

- <https://www.ableton.com/en/live-manual/12/first-steps/>
- <https://www.ableton.com/en/live-manual/12/midi-tools/>
- <https://help.ableton.com/hc/articles/11425083250972>
- <https://help.ableton.com/hc/en-us/articles/11535349458588>
- <https://www.ableton.com/en/live-manual/12/accessibility-and-keyboard-navigation>
- <https://help.ableton.com/hc/en-us/articles/11550373507868>
- <https://help.ableton.com/hc/articles/11425042663708>
- <https://ableton.com/en/release-notes/live-12/>
- <https://www.ableton.com/en/blog/live-12-2/>
- <https://markmoshermusic.com/2025/11/25/ableton-live-12-3-push-standalone-12-3-move-1-8-whats-new/>
- <https://www.ableton.com/en/blog/live-12-4-is-out-now/>
- <https://help.ableton.com/hc/en-us/articles/26963870210076-What-s-new-in-Live-12-4>
- <https://www.musicradar.com/music-tech/ableton-live-12-4-is-out-now-with-link-audio-and-updated-erosion-delay-and-chorus-ensemble-devices>
- <https://cdm.link/ableton-live-12-everything-new/>
- <https://www.soundonsound.com/reviews/ableton-live-12>
- <https://sonicstate.com/news/2024/03/05/ableton-live-12-is-out/>
- <https://learningmusic.ableton.com/>
- <https://ableton.com/en/classroom/support/first-steps-ableton-live>

### Logic Pro 11 / 12 (11.0 May 2024 added Session Players and Chord Track; 12.0 Jan 28 2026 added Chord ID and Synth Player; 12.x current Oct 2026)

**Layout.** Single main window. The control bar along the top has transport, an LCD in the centre showing playhead, tempo, key and time signature, Master Volume, and buttons that toggle panes; the control bar can be customised. The Tracks area is central. The Inspector on the left shows region and track parameters that change with the focused area and selection, and hosts Quick Help at its top. The Library (patches, presets, sound packs, and the new Sound Library in 12) is a left-side browser. Editors open in a bottom area: Piano Roll, Score, Step, Audio Track, Session Player Editor. The Mixer and Smart Controls also open at the bottom. Browsers (Loops, Project Audio, All Files) open on the right. The Chord track is a global lane in the Tracks area. Panes are toggled with single-letter key commands (Inspector, Library, Editors, Mixer, Smart Controls). Screensets save and recall window layouts.

**Learning and onboarding.** Quick Help hover descriptions with links to the full user guide. Progressive disclosure through the Complete Features toggle. No built-in step-by-step lesson system comparable to Ableton's Learn View; learning is via the user guide and third parties. Reviewers and educators say beginners find the interface overwhelming: unclear which window does what, recording issues, and losing track of regions. Others praise that basics can be found while advanced features are ignored.

**Performance and tech.** Native macOS app, so there are no web rendering patterns to copy directly. 12.3 release notes mention performance improvements for track visibility operations. On interaction cost: single-key pane toggles and screensets avoid repeated re-layout. Smart Controls avoid opening heavy plugin windows. Pre-analysed library content means chord info is ready without analysing at load time.

**Persistence and reload.** Screensets (window and pane layout) are saved per project and can be locked or reverted to the saved version. Undo History is saved with the project (11.2). Chord track contents, Session Player settings and Smart Control mappings are stored in the project. The Inspector and Quick Help state follow whether panes are visible.

**AI and theory features.** Chord Track with progressions, chord groups and chord rhythm. Chord ID transcribes chords from audio or MIDI (12.0). Session Players (Drummer, Bass, Keyboard, Synth) generate parts that follow the Chord track, with complexity/intensity controls and Regenerate. Step Sequencer and Pattern regions follow chords (12.0). Stem Splitter, Mastering Assistant and ChromaGlow are 11.x-era features; not re-verified in this pass. The Chord track docs do not say whether chords can show as Roman numerals, so treat Roman-numeral display as unverified.

**Visual style.** Dark, flat macOS-native panels. Region colour follows track colour. A strong central LCD shows musical context (key, tempo, signature). Dense inspector text. Lots of floating plugin windows unless you work in the bottom-area editors.

**Signature patterns**

- Quick Help: describes whatever is under the pointer, shown at the top of the Inspector or in a floating window if the Inspector is closed. Some entries link to deeper help. Toggled from a control-bar button.
- Progressive disclosure: by default some advanced features are off. Turning on 'Complete Features' (formerly 'Show Advanced Tools') in Settings > Advanced reveals lists (Event/Marker/Tempo/Signature), Step Editor, Environment, advanced Score features, surround, control surfaces, and more.
- Chord Track (11.0): a global harmonic lane. You can add, select, move, resize, loop and transpose chords, use chord groups and progressions, change chord rhythm, and choose which chords a Session Player region follows. Pattern regions and the Step Sequencer can follow chords too (12.0).
- Chord ID (12.0): drag audio, MIDI, or a Voice Memo and Logic transcribes its chord progression onto the Chord track. CDM praises the accuracy, including the timing of chord changes. Apple Sound Library content comes pre-analysed.
- Session Players: Drummer, Bass, Keyboard, and (12.0) Synth Player (Simple Pad, Modulated Pad, Rhythmic Chords, 808/Pump/Sequenced Bass). The Session Player Editor has style presets, an XY complexity/intensity pad, and Regenerate. The players follow the Chord track. Gotcha from CDM: 'Use Default Chord Progression' must be switched off or the player ignores the Chord track.
- Smart Controls: a small curated set of on-screen controls mapped to the important instrument and effect parameters, with selectable layouts, so you rarely need the full plugin window.
- Screensets: numbered saved window layouts per project, which can be recalled, locked, copied, imported, and reverted.
- The LCD in the control bar always shows project key, tempo and time signature at the centre of the screen.
- Undo History is saved with each project (11.2). You can search for and select tracks by name or number (11.2).

**Weaknesses**

- Beginners report feeling overwhelmed: too many windows, editors and floating plugin UIs, and confusion over which window does what.
- Hidden-default gotcha: Session Players use a default chord progression unless you turn it off, so a student's Chord track appears to be ignored.
- Advanced features sit behind a Settings toggle that beginners don't know exists. Tutorials made with Complete Features on don't match a stock setup.
- Floating plugin windows and multiple windows break single-window focus.
- Quick Help depends on hover and is mostly about the interface, not music.
- Mac-only. Licensing changed in 2026 to an Apple Creator Studio subscription alongside existing owners (flag: recent change).
- Note: an Apple release-notes summary fetched on 2026-10-06 listed a 12.0 'published' date of Sept 29 2026 and a 12.4 entry. That conflicts with the Jan 28 2026 launch reported by CDM and Wikipedia, so treat exact 12.x point-release dates as unverified.

**Sources**

- <https://support.apple.com/en-us/109503>
- <https://support.apple.com/guide/logicpro/toc/12.3>
- <https://support.apple.com/guide/logicpro/main-window-interface-lgcpe9cc403a/12.3/mac/15.6>
- <https://support.apple.com/guide/logicpro/chords-overview-lgcp2633963f/12.3/mac/15.6>
- <https://support.apple.com/guide/logicpro/session-players-overview-lgcpbf624405/12.3/mac/15.6>
- <https://support.apple.com/guide/logicpro/smart-controls-interface-lgcp91601243/12.3/mac/15.6>
- <https://support.apple.com/en-asia/guide/logicpro/lgcp53689108/mac>
- <https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcpa0902aeb.html>
- <https://logicstudiotraining.com/wiki/index.php/Quick_Help>
- <https://cdm.link/logic-pro-12-hands-on/>
- <https://logicstudiotraining.com/logic-pro-12-update/>
- <https://rekkerd.org/apple-releases-logic-pro-12/>
- <https://www.businesswire.com/news/home/20260113468282/en/Apple-introduces-Apple-Creator-Studio-an-inspiring-collection-of-the-most-powerful-creative-apps>
- <https://www.logicprohelp.com/forums/topic/161100-logic-1122-released/>
- <https://en.wikipedia.org/wiki/Logic_Pro>
- <https://www.capterra.com/p/214597/logic-pro/reviews>

### Borrow

| Priority | Pattern                                                                                                                                                                                      | From                                                                                                                                                         | Why for Music Atlas                                                                                                                                                                                                                                                                                                                                                       | Changes                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| must     | Chord Track as a first-class global lane in the arrange timeline. Every generator and player reads from it, and analysis can write to it (Chord ID style).                                   | Logic Pro 11/12 (Chord Track, Chord ID, Session Players following chords)                                                                                    | This is the most on-brand pattern of all: harmony becomes something students can see on the timeline. PRISM output, GROOVES, Insight and the Lead Sheet would share one source of truth, so students see the progression they are hearing. Teachers can preset it for an assignment.                                                                                      | src/daw/components/Timeline/TimelineWithHeaders.tsx (new chord lane under the ruler). Prism/PrismPanel.tsx and ChordSequenceDisplay.tsx write to it instead of only to clips. Library/ChordSymbolsSection.tsx and SelectionAnalysis.tsx add an 'Analyse selection to chord lane' action (Chord ID). Controls/GroovesBrowser.tsx follows the lane. LeadSheet reads from it. |
| must     | One persistent context-help strip that explains what is under the pointer, or under keyboard focus or a tap. Toggled with '?'. Entries link to deeper help.                                  | Ableton Info View; Logic Quick Help (top of Inspector, or floating)                                                                                          | Lets us remove many 8-10px labels and duplicate tooltips: a control can stay minimal while the strip explains it at readable size. For Music Atlas the text should explain the musical meaning as well as the control (e.g. 'Swing: delays every 2nd 16th note') and link to the matching lesson. Must also work on tap and focus, not just hover.                        | src/daw/components/StatusBar.tsx becomes the help strip, driven by a data-help attribute registry. It links to lessons via the Insight panel (Library/InsightContent.tsx). Tutorial/CoachCard.tsx reuses the same help strings.                                                                                                                                            |
| must     | A single bottom detail dock that can stack two views (editor and instrument) instead of modal or tab switching.                                                                              | Ableton Live 12 Stacked Detail Views (Clip View + Device View); Logic bottom editors area                                                                    | Removes the confusing double entry point (modal piano roll plus PIANO ROLL dock tab). Students can play the instrument and see notes land in the piano roll at the same time. Stacking must be optional on small screens, because reviewers found it cramped on laptops.                                                                                                  | Delete or retire src/daw/components/PianoRoll/PianoRollModal.tsx. The dock in Studio/StudioView.tsx gains a 'stack' toggle (CONTROLS over PIANO ROLL, or PRISM over PIANO ROLL) with a draggable splitter. Persist the split ratio.                                                                                                                                        |
| must     | Project and per-region key/scale awareness: a Scale chooser in the control bar, in-scale row highlighting and 'fold to scale' in the piano roll, and scale-aware tools.                      | Ableton Live 12 Scale Mode / scale awareness                                                                                                                 | Directly teaches scales while composing. Highlighted rows show the mode's colour without extra UI. Fold to scale lowers the barrier for beginners. Insight already detects the key; this makes that key something you can act on. Use one project key plus optional region overrides, so modulation stays visible and you avoid Live's 'follows selected clip' ambiguity. | Transport/TransportBar.tsx (key/mode chip in an LCD-style centre readout). PianoRoll/PianoRoll.tsx (scale-row tint, fold toggle, Roman-numeral or degree gutter). Prism/RootNoteSelector.tsx and Library/KeySection.tsx share the same store field.                                                                                                                        |
| must     | Visible, mode-level progressive disclosure: 'Essentials' vs 'Complete' feature sets. Teachers can lock the mode per class or assignment.                                                     | Logic Pro Complete Features / Show Advanced Tools                                                                                                            | Directly addresses the 'dense UI, many entry points' problem. Essentials hides sends/returns, automation lanes, NAM, the mastering chain and the advanced synth matrix. Unlike Logic, show the mode as a pill in the toolbar so students and tutorials always know which feature set is active.                                                                           | New UI-mode store flag read by Mixer/, Timeline/AutomationLaneEditor.tsx, Controls/OracleSynthView.tsx, Controls/GuitarBassView.tsx (NAM) and Transport/SettingsModal.tsx. The tutorial definitions (Tutorial/tutorials.ts) declare the mode they need.                                                                                                                    |
| must     | Per-project workspace layouts (screensets) plus saved view state: dock tab, split sizes, side panel, zoom, scroll, selected track, open view (Arrange, Master, Score, Lead Sheet, Practice). | Logic Pro Screensets (saved per project, lockable, revertible); Logic 11.2 Undo History saved with the project; Ableton per-context mixer section visibility | Fixes the known problem that UI state is restored unevenly after reload. A student reopening homework lands exactly where they left off. Teachers can ship a locked layout with a template (e.g. 'Piano roll + Insight only').                                                                                                                                            | src/daw/persistence/ (add a versioned uiState slice saved with the project, plus a local fallback). Studio/StudioView.tsx, Timeline/Timeline.tsx (zoom/scroll), and Library/LibraryPanel.tsx (active tab) hydrate from it. Optionally persist the undo stack.                                                                                                              |
| should   | Generate/Transform panel inside the note editor, with live preview (Auto Apply) and an explicit Apply that commits as a single undo step.                                                    | Ableton Live 12 MIDI Tools (Stacks, Rhythm, Strum, Arpeggiate, Quantize)                                                                                     | PRISM and theory tools act where the notes are, instead of in a separate dock tab. Previewing before committing avoids the 'you're committed' destructive-edit problem Sound On Sound criticised. Strum, Arpeggiate and Span are teachable articulation concepts.                                                                                                         | PianoRoll/PianoRoll.tsx side rail hosting Prism/ChordBuilder.tsx and RhythmSelector.tsx in compact form, plus new transforms (strum, arpeggiate, quantize, voicing/inversion). Preview is shown as ghost notes. Apply goes through one store transaction.                                                                                                                  |
| should   | Smart Controls / macros: each instrument shows 4-8 curated, large controls first, and the full editor expands on demand.                                                                     | Logic Pro Smart Controls                                                                                                                                     | The CONTROLS tab gets calmer and readable for beginners (bigger text, fewer knobs), while advanced students can still reach the full Oracle Synth, sampler or amp UI. Fits the Essentials/Complete split.                                                                                                                                                                 | Controls/DawSynthLayout.tsx, OracleSynthInline.tsx vs OracleSynthView.tsx, DrumMachineView.tsx, OrganView.tsx, GuitarBassView.tsx and VocalView.tsx get a shared MacroStrip primitive using RotaryKnob.tsx, with an 'Open full editor' affordance.                                                                                                                         |
| should   | Session Player-style accompaniment editor: style presets, an XY pad for complexity/intensity, and Regenerate. The part follows the chord lane, with no hidden default progression.           | Logic Pro Session Players / Synth Player (12.0)                                                                                                              | Students can build a full band arrangement around their own progression and hear how functions drive bass and comping. Avoid Logic's gotcha by always following the project chord lane and showing what it is following.                                                                                                                                                  | Controls/GroovesBrowser.tsx (drums) extended to bass and comping players. Prism engine (src/daw/prism-engine) supplies voicings. A 'Following: Chord lane bars 1-8' label sits in the player header.                                                                                                                                                                       |
| should   | Teacher-authored notes attached to tracks, clips and devices, shown in the help strip when hovered or selected.                                                                              | Ableton Live 'Edit Info Text' (saved with the Set)                                                                                                           | Fits the classroom: a teacher can annotate a template ('Record your bassline here; stay on chord tones') and the note travels with the project without a separate lesson system.                                                                                                                                                                                          | Track and clip models in src/daw/store plus persistence. TrackControls/ and the Timeline clip context menu get 'Add note'. StatusBar help strip and the Insight panel display it.                                                                                                                                                                                          |
| should   | Learn pane with progress: lessons filterable by topic, completion checkmarks, resume to the last step, and picture-in-picture video/coach that doesn't cover the workspace.                  | Ableton Learn View (12.4) and Learning Music                                                                                                                 | Our lessons already have spotlight and coach steps. Ableton's model adds resume, progress, and an overlay that doesn't block the workspace. Keep lessons interactive rather than video-only so they don't go stale when the UI changes.                                                                                                                                   | Tutorial/TutorialLayer.tsx, CoachCard.tsx, Spotlight.tsx and useTutorialDetection.ts. Persist lesson step and progress per user. The dedicated Production tab (StudioProduction.tsx) shows completion state.                                                                                                                                                               |
| should   | Keyboard-first navigation: jump-to-area shortcuts (Opt+1..7 style), single-letter pane toggles, optional Tab focus traversal, and full keyboard note editing.                                | Ableton Live 12 Navigate menu and Tab focus; Logic single-key pane toggles                                                                                   | Power users and accessibility both benefit. It also gives tutorials a consistent vocabulary ('press E to open the editor'). Needs a visible focus ring that fits the white-hairline aesthetic.                                                                                                                                                                            | src/daw/hooks (central shortcut registry). Studio/StudioView.tsx (dock/panel toggles). PianoRoll/PianoRoll.tsx (arrows transpose/move, Shift resize, velocity keys). A shortcut cheat sheet is reachable from the help strip.                                                                                                                                              |
| should   | Centre LCD readout that always shows bar/beat, tempo, time signature AND key, and is directly editable.                                                                                      | Logic Pro control bar LCD                                                                                                                                    | The current key is the single most important theory context. Putting it next to tempo keeps it visible in every view and frees space in the Insight panel.                                                                                                                                                                                                                | Transport/TransportBar.tsx. Render the playhead time through a ref/rAF text node rather than store state, so the 30fps playhead stops re-rendering large components.                                                                                                                                                                                                       |
| could    | Show/hide sections of the mixer inside the arrange view, instead of only in a separate view.                                                                                                 | Ableton Live 12 Mixer in Arrangement View with section toggles                                                                                               | Students can balance levels without leaving the arrangement. The MASTER view can stay as the 'Complete' mastering surface.                                                                                                                                                                                                                                                | Timeline/TimelineWithHeaders.tsx track headers get optional volume, pan and sends columns. Mixer/ and ChannelStrip/ reuse the same primitives.                                                                                                                                                                                                                             |
| could    | Tag filters and quick tags in the browser (instrument family, genre, mood, lesson).                                                                                                          | Ableton Live 12 browser Filters and Quick Tags (12.2)                                                                                                        | The Library side panel stays short and scannable. Tagging items by lesson lets teachers point students at curated sounds.                                                                                                                                                                                                                                                 | Library/LibraryPanel.tsx, Controls/PresetBrowser.tsx and NamModelBrowser.tsx.                                                                                                                                                                                                                                                                                              |
| should   | Flat visual cleanup: fewer outlines and borders, consistent corner radius and padding, colour reserved for track/clip identity and selection.                                                | Ableton Live 12 UI refresh                                                                                                                                   | Matches the Music Atlas aesthetic (near-black, white hairlines, colour only for musical meaning). Pick one primitive set (pill button, hairline panel, knob, segmented tab) and apply it everywhere.                                                                                                                                                                      | src/daw/components/ui and common primitives, daw.css tokens. Raise the minimum text to around 11-12px and use the help strip for explanations instead of micro-labels.                                                                                                                                                                                                     |

### Avoid

- **Two parallel composition paradigms (clip-launcher grid vs timeline) shown as equal top-level modes** (Ableton Live Session View vs Arrangement View): Ableton's own classroom material has to teach Session and Arrangement one after the other because beginners find the split confusing. Music Atlas already has many views (Arrange, Master, Score, Lead Sheet, Practice). Don't add another way to compose; keep views as different lenses on the same arrangement.
- **Floating, modal or multi-window editors and plugin UIs** (Logic Pro plugin windows and separate editor windows; Music Atlas PianoRollModal): Logic beginners report confusion over 'which window does what'. Our modal piano roll, alongside a PIANO ROLL dock tab, repeats this. Use one dock with optional stacking instead.
- **Generators that silently use a hidden default instead of the user's harmony** (Logic Pro 12 Session/Synth Players): Logic Session Players ignore the Chord track unless 'Use Default Chord Progression' is turned off. For a theory product this teaches the wrong thing. Always show what a generator is following.
- **Destructive generate/transform with no preview or single-step undo** (Ableton Live 12 MIDI Tools): Sound On Sound: once Live 12 MIDI Tools are applied and deselected, 'you're committed'. Students experimenting with PRISM or transforms need ghost-note previews and one-step revert.
- **Advanced features hidden behind a buried settings checkbox** (Logic Pro Settings > Advanced > Complete Features): With Logic's Complete Features off, tutorials and teacher instructions can reference UI that students can't see. If Music Atlas adds Essentials/Complete, the active mode must be visible and lessons must declare and switch the mode they need.
- **Hover-only help and help text that only describes the interface** (Ableton Info View; Logic Quick Help): Info View and Quick Help depend on a mouse pointer, which fails on Chromebooks with touch and on tablets common in classrooms. Their text explains controls, not music. Our help strip should respond to focus and tap and explain musical meaning.
- **Copying pro-DAW information density (tiny text, every parameter on screen)** (Logic Pro inspector and mixer; Ableton device chains): Pro DAWs are built for expert throughput. Students and reviewers call Logic overwhelming. Music Atlas already suffers from 8-10px text; use Smart-Control-style curation and progressive disclosure instead.
- **Scale/key context that follows only the selected clip** (Ableton Live 12 scale awareness): Sound On Sound flags that Live 12's scale follows the selected clip, which makes song-level modulation awkward. Music Atlas should have one project key lane (with modulations as explicit events) so Insight, PRISM and the piano roll agree.
- **Forced side-by-side stacked panes on small screens** (Ableton Live 12 Stacked Detail Views): Reviewers found Live 12's stacked Clip and Device views cramped on laptops. Make stacking optional, collapse to tabs below a breakpoint, and persist the user's choice.
- **Video-only lessons that are separate from the live UI** (Ableton Learn View (12.4)): Ableton's Learn View launched with only a few modules, and video goes stale as the UI changes. Music Atlas's interactive spotlight and coach steps tied to real components are a strength to keep.
- **Lossy metadata tied to names** (Ableton Live 12 browser tags): Live 12 browser tags disappear when an item is renamed. Music Atlas tags, teacher notes and lesson links should be keyed by stable IDs.

## suno-ai

### Suno Studio (Suno's generative audio workstation)

**Layout.** Browser multitrack timeline in the middle. The library of past Suno songs opens on demand. A Details panel opens on the right when a song or clip is selected and shows its stems, with 'Insert All' or one track at a time. Since 2.0 (13 Aug 2026) the transport (metronome, play, loop, follow playhead, clock and tempo settings) sits above the timeline, which Suno calls 'a more conventional display hierarchy'. The bottom 'Context Bar' became a 'Chat Bar' in 2.0, and the piano roll is 'a full note editor in the bottom panel', not a modal. Tempo and time signature are in a bottom info panel. Edit actions like Remove FX are in the clip right-click menu. Warp markers appear in a per-clip Edit Mode.

**Learning and onboarding.** Help-centre articles for each release. The Context Bar adapts to the empty state and suggests next actions. Reviewers report a 'steep learning curve for effective prompting'.

**Performance and tech.** Runs in the browser and is Chrome-first. MusicTech (Jan 2026) says Safari 'performed poorly'. Third-party write-ups list Chrome, a 768px+ display, a SIMD-capable CPU and 4GB RAM as requirements (not confirmed from an official source). Release notes for 2 Sep 2026 cite 'faster audio playback and project loading' and less wavetable aliasing. Generation runs on the server and costs credits. Reviewers say heavy stem regeneration uses up credits quickly.

**Persistence and reload.** Projects autosave continuously, with no save button, and keep a time-stamped Versions history for rollback (help.suno.com 'Introduction to Studio'). Generated takes stay as preview lanes until committed, so an uncommitted suggestion never overwrites the arrangement.

**AI and theory features.** Generative stems (vocals, drums, synths and more) that fit the existing audio. Stem separation. MIDI-to-audio regeneration, made 'more accurate to the original' in the 17 Sep 2026 update. Chat-designed custom plugins ('make a warm tape saturation with a wobble'). Remove FX (dereverb/delay). There is no explicit theory layer: the docs say time signature 'only affects the editing interface, not generative model outputs', and the help pages we read don't describe key or chord display.

**Visual style.** Dark, minimal DAW chrome. 2.0 moved toward conventional DAW layout conventions (transport above the timeline, bottom editor panel).

**Signature patterns**

- Each generation gives two takes, shown as Take Lanes stacked under the target clip. You play each one with a speaker icon, cycle with up/down arrows, then 'commit clip to timeline' or 'dismiss preview' from controls at the bottom of the clip. Nothing lands on the main track until you commit.
- Comping: combine parts of several generated takes into one section before committing
- You can generate a part over a selected time range on a track, either by dragging a timeline region or from the Context/Chat Bar
- Chat Bar (2.0): plain-language edits such as adding instruments, generating sections, changing sounds or mixing, plus 'ask project questions'. A 2 Sep 2026 update made it aware of tempo and BPM.
- Context Bar changes with the state: on an empty timeline it offers create, open library or upload audio
- Autosave with no save button, plus time-stamped saves under Project menu > Versions
- Stems and MIDI export to other DAWs; Advanced Split can pull nearly 100 instrument types (Studio 2.0)
- Musical typing (computer keyboard as MIDI) with chord mode and arpeggiator

**Weaknesses**

- Unpredictable output quality, artefacts and smeared transients, and stems sometimes put on the wrong instrument (MusicTech review, Jan 2026)
- Prompting is the main control, so results are hard to steer precisely, and the docs don't explain why a suggestion sounds the way it does
- Credit cost discourages trying many variations
- Some power users call it 'pre-beta' (eesel review, 2026). Premier tier only.
- Licensing changes after the Warner settlement (Nov 2025) narrowed download and ownership rights. The legal landscape is still changing, so flag before borrowing anything that touches licensing.

**Sources**

- <https://about.suno.com/release-notes>
- <https://about.suno.com/release-notes/introducing-suno-studio>
- <https://help.suno.com/en/articles/13670529>
- <https://help.suno.com/en/articles/10625089>
- <https://help.suno.com/en/articles/7940161>
- <https://musictech.com/reviews/digital-audio-workstations/suno-studio-review/>
- <https://www.eesel.ai/blog/suno-review>

### Logic Pro 11/12 (Session Players, Chord Track, Chord ID, Mastering Assistant)

**Layout.** The Chord Track is a global track next to the Tempo track, running across the top of the arrangement. A Session Player region opens its editor in the bottom pane when double-clicked. The editor has a preset/performance browser at top left, a Chord menu at top left to choose 'Follow Chord Track' or the region's own chords, Complexity and Intensity sliders, fill and swing knobs, and Details and Manual tabs. Mastering Assistant is a plugin on the Stereo Out channel strip, i.e. in the mixer and not in a separate view.

**Learning and onboarding.** The Session Player editor opens automatically when you create a player track, so the controls appear at the moment of use. Presets are the starting point and you refine from there.

**Performance and tech.** Native Mac/iPad app. Some Mastering Assistant characters (Transparent/Punch/Valve) need Apple silicon. Logic 12 shipped in Jan 2026 as a $199.99 one-off purchase or through the Apple Creator Studio subscription. 12.3 (mid-2026) improved Chord ID accuracy for 7ths, maj7s, 6ths and inversions.

**Persistence and reload.** Chords are stored in the project, both on the global Chord Track and inside regions, and generated performances are worked out from them. That means harmonic intent survives reload and edits, and isn't saved as fixed baked notes.

**AI and theory features.** Session Players (Drummer, Bass, Keyboard, plus Synth Player in 12) are generative and follow the chords. Chord ID harmonic analysis. Chord Track. Mastering Assistant. Step Sequencer pitch can follow the key, region chords or the Chord Track.

**Visual style.** Dark pro-app chrome. The Chord Track shows chord symbols as blocks along the timeline. Assistant analysis is shown as an EQ curve plus loudness readouts.

**Signature patterns**

- One shared harmonic source of truth. Session Players, Synth Player (Logic 12) and the Step Sequencer follow the global Chord Track, local region chords, or just the key signature and mode. Editing a chord re-renders the generated parts straight away.
- Chord ID: drop audio, MIDI or a Voice Memo on the Chord Track and Logic transcribes the chords, including harmonic rhythm, as an editable chord group. Reviewers say it is 'definitely not perfect' on dense material but easy to fix.
- Chord groups can be copied or looped to reuse a progression in other sections
- Generated parts stay editable through a few human-scale controls (complexity, intensity, humanize, feel), and you can 'Convert to MIDI Region' to take full manual control
- Mastering Assistant analyses on insert, then exposes a short set of controls: Character (Clean/Valve/Punch/Transparent), a Loudness knob centred at about -14 LUFS-I, an Auto EQ amount, a 3-point Custom EQ (+/-6 dB), and Width (fully left = mono check)
- Bypass for A/B, Loudness Compensation for a fair comparison at matched level, and Reanalyse after the mix changes

**Weaknesses**

- Chord ID gets dense material wrong (CDM, Jan 2026)
- If the song plays past the last chord, the player 'will keep playing around the last chord indefinitely' (Sound On Sound)
- No automatic chord extraction from a live input or an already-played MIDI track (SOS 2024; Chord ID on regions partly fixes this in 12)
- Mac/iPad only and pro-oriented. There is no explanation layer for why a chord functions as it does.

**Sources**

- <https://support.apple.com/guide/logicpro-ipad/lpipc571513c/ipados>
- <https://support.apple.com/sl-si/guide/logicpro/lgcp2633963f/mac>
- <https://support.apple.com/en-gb/108294>
- <https://www.soundonsound.com/techniques/logic-pro-session-players>
- <https://cdm.link/logic-pro-12-hands-on/>
- <https://www.synthtopia.com/content/2026/01/30/apple-logic-pro-12-mainstage-4-now-available-heres-whats-new/>
- <https://synthanatomy.com/2026/06/apple-logic-pro-12.html>

### Ableton Live 12 (Scale awareness, MIDI Tools: Generators and Transformations)

**Layout.** The Scale Mode chooser is in the transport bar next to BPM. It sets the project-wide scale, which new MIDI clips inherit, and shows or sets the scale of the selected clips. MIDI Tools are Transform and Generate panels inside Clip View, docked next to the MIDI note editor, not modal. Each panel has a tool dropdown, the tool's parameters, an Auto Apply toggle and an Apply button.

**Learning and onboarding.** Built-in Lessons panel with dedicated 'What's New' lessons for MIDI Tools and Scale Awareness. The lessons sit next to the work, not on a separate website.

**Performance and tech.** Native desktop app. Live 12.3 (late 2025) added local stem separation (right-click a clip, choose high-quality or high-speed mode) and Splice 'Search with Sound' in the browser. 12.4 extended Link. MIDI Tools are also extensible through Max for Live.

**Persistence and reload.** Clip scale and global scale are saved with the Set. Generated notes are ordinary notes in the clip. Undo covers note changes 'and not changes made to a MIDI Tool's parameters'.

**AI and theory features.** Scale awareness across the note editor, tools and devices. Rule-based (non-ML) generators: Rhythm, Seed, Shape, Stacks, Euclidean. Transformations: Arpeggiate, Chop, Connect, Glissando, LFO, Ornament, Quantize, Recombine, Span, Strum, Time Warp, Velocity Shaper.

**Visual style.** Flat, low-chrome, small-type pro UI. Scale highlighting is a subtle tint on piano roll rows.

**Signature patterns**

- Scale as a global, always-visible state in the transport bar, with per-clip overrides
- Piano roll highlights scale notes and can fold to hide rows outside the scale. Scale mode vs Fold mode are separate display options.
- Once a clip scale is set, pitch parameters in MIDI tools are shown in scale degrees, not semitones
- Auto Apply is on by default, so changing a parameter regenerates live. Turn it off to adjust settings, then Apply (Cmd/Ctrl+Enter).
- Transformations act on the selected notes. Generators fill the loop or time selection. Both are in place and can be undone.
- Stacks generator: a Tonnetz-based Chord Selector Pad, chord roots locked to the clip scale, an Inversion knob, and user-defined chord banks as JSON .stacks files
- Scale-aware MIDI effects (Arpeggiator, Chord, Random, Auto Shift) stay in key
- Built-in Lessons cover MIDI Tools and Scale Awareness (Help > Built-in Lessons)

**Weaknesses**

- Tool parameter changes can't be undone, only the note results
- Dense, small-text panels with a steep learning curve for beginners
- The Tonnetz chord pad is powerful but hard to read without prior theory knowledge

**Sources**

- <https://www.ableton.com/en/live-manual/12/midi-tools/>
- <https://help.ableton.com/hc/en-us/articles/11535349458588>
- <https://help.ableton.com/hc/articles/11425083250972>
- <https://www.musicradar.com/how-to/live-12-5-things-you-need-to-know>
- <https://musictech.com/news/music/ableton-live-12-3/>

### BandLab (SongStarter, Mastering)

**Layout.** SongStarter is an idea-generator screen that comes before the Mix Editor (BandLab's browser DAW). It has Genre/Mood/Tempo/Key settings along the top, an optional text or lyric prompt, and 3 variations to audition. The user then chooses 'Save as Project' or 'Edit in Studio'. Mastering is a separate flow outside the editor: pick a preset, set intensity, then A/B the result with before/after waveforms and spectral analysis.

**Learning and onboarding.** Designed for beginners. Few inputs, everything can be auditioned, and you can regenerate as often as you like at no cost.

**Performance and tech.** Cloud and browser based. SongStarter was built with Google on TensorFlow (Gearnews). Output patterns are royalty-free and export straight into the Mix Editor.

**Persistence and reload.** SongStarter output is saved as a normal BandLab cloud project. Mastered versions sit next to the original.

**AI and theory features.** SongStarter idea generation (beats, melodies, progressions). AI mastering. Other tools include Splitter (stems) and AutoMix (third-party roundup).

**Visual style.** Consumer, colourful, card-based.

**Signature patterns**

- Roll-the-dice randomiser that returns 3 variations from the same sound palette
- Quick mood modifier (Day/Sunset/Night) on each variation
- Lyrics or keyword seed, up to 50 characters or emoji
- Visible, editable Genre/Mood/Tempo/Key constraints, a Regenerate button, then hand off to the full editor
- Mastering presets (Universal, Fire, Clarity, Tape and newer ones) with a plain-language description of each
- 11-level Intensity per mastering preset (update of Sept 2026: 'A preset can be the right general direction and still be too much at full strength')
- Original vs mastered A/B with waveforms and spectrum

**Weaknesses**

- SongStarter gives little theory transparency: key and genre are set, but the chord functions aren't explained
- Mastering is a separate destination, not part of the mixer

**Sources**

- <https://help.bandlab.com/hc/en-us/articles/24226593087001-Generate-Ideas-with-SongStarter-AI>
- <https://www.gearnews.com/?p=121268>
- <https://create.routenote.com/blog/what-is-bandlab-songstarter/>
- <https://help.bandlab.com/hc/en-us/articles/360001374513-How-do-I-master-my-music-on-BandLab>
- <https://help.bandlab.com/hc/en-us/articles/55678885417113-BandLab-Mastering-FAQ>
- <https://magneticmag.com/2026/09/bandlab-mastering-update-gives-artists-more-control-before-release/>
- <https://musictech.com/news/music/bandlabs-mastering-capabilities-just-got-an-upgrade-heres-whats-new/>

### Soundtrap (Chords instrument, Smart Drummer, Patterns Beatmaker)

**Layout.** Generators appear as instruments or tracks in the editor. Chords: choose a preset category (Basic/EDM/Hip Hop), then a playing style, then the key. Soundtrap generates chord suggestions and you insert the ones you want in order. Smart Drummer works alongside the Patterns Beatmaker step sequencer and outputs editable MIDI that you adjust in the MIDI editor.

**Learning and onboarding.** Weekly 'New Feature Friday' posts. Education edition for classrooms.

**Performance and tech.** Browser DAW (Spotify-owned) with a large education market (schools.soundtrap.com).

**Persistence and reload.** Cloud projects. Generated material is ordinary MIDI saved in the project.

**AI and theory features.** Chords instrument (Apr 2024), Smart Drummer (Apr 2024, Premium). Marketing explicitly targets people without theory knowledge: 'not anymore!'

**Visual style.** Friendly consumer UI with coloured tracks.

**Signature patterns**

- Simple 3-step setup for chords: category, playing style, key
- Pick suggested chords one by one in order, so the user builds the progression
- Smart Drummer controls: genre, complexity, loudness, halftime/full-time, fills at bar ends, humanize, regenerate
- Output is always editable MIDI, so the generator is a starting point and not a black box

**Weaknesses**

- Pitched as removing the need for theory, which is the opposite of an education goal
- Official posts give little detail on how chords are displayed or explained

**Sources**

- <http://blog.soundtrap.com/introducing-chords/>
- <http://blog.soundtrap.com/smart-drummer/>
- <https://schools.soundtrap.com/content/instruments>

### Borrow

| Priority | Pattern                                                                                                                                                                         | From                                                                                                                                                                                         | Why for Music Atlas                                                                                                                                                                                                                                                                                                                                                 | Changes                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| must     | A single global harmonic source of truth (a chord track) that every generator and analyser reads and writes                                                                     | Logic Pro Chord Track + Session Players/Step Sequencer follow modes; Ableton global/clip scale                                                                                               | Prism, Insight, the piano roll, Grooves, Score and Lead Sheet each work out harmony separately today. If Prism writes its progression to one chord lane, students can see the progression as a first-class object, and Insight can read and annotate it (functions, Roman numerals). Instruments and grooves could then follow it, which matches a theory platform. | Arrange timeline (new chord/key lane above the tracks), Prism output, Insight panel, Lead Sheet view, piano roll                         |
| must     | Key/scale chip always visible in the transport, with piano-roll scale highlighting, fold-to-scale and scale-degree labels                                                       | Ableton Live 12 Scale Mode chooser + piano roll highlight/fold; MIDI tools showing scale degrees                                                                                             | This makes the theory context visible at all times without opening a panel. Showing scale degrees (1-7) instead of raw note names teaches function. Colour can mark degree or function, which fits our rule that colour carries musical meaning.                                                                                                                    | Top transport bar, PIANO ROLL dock tab (and remove the separate modal piano roll), Insight key readout                                   |
| must     | Generated material arrives as auditionable takes and must be committed or dismissed. Nothing overwrites existing work without an explicit commit.                               | Suno Studio Take Lanes (two takes per generation, preview, cycle with up/down arrows, commit or dismiss, comping)                                                                            | Students can compare 2-3 Prism progressions in place before committing, which is a natural moment to explain why each one works. Their existing work stays safe, which also matters in real-time collaboration.                                                                                                                                                     | Prism (results as preview lanes or ghost clips on the timeline, not straight inserts), Grooves dock tab                                  |
| must     | Docked, non-modal generator panel with Auto Apply on by default, an option to switch it off and press Apply (Cmd+Enter), and in-place transforms on the selection or loop range | Ableton Live 12 MIDI Tools Transform/Generate panels in Clip View                                                                                                                            | Prism and Grooves become dock tools that act on the selected region or loop range, with an explicit Apply for students who want to think before they commit. This removes extra entry points and modals.                                                                                                                                                            | Bottom dock (PRISM, GROOVES, PIANO ROLL tabs); delete the modal piano roll                                                               |
| should   | Every suggestion explains itself and comes with a few human-scale controls, and you can always convert the result to plain editable notes                                       | Logic Session Players (Complexity/Intensity, Convert to MIDI Region); Soundtrap Smart Drummer (complexity, fills, humanize, editable MIDI)                                                   | Students keep control and can see what changed. Prism should expose 2-3 large controls (e.g. complexity/colour, rhythm density, voicing spread) instead of dense 8-10px parameter grids, and a 'make editable' step should turn the result into normal notes in the piano roll.                                                                                     | Prism UI, Grooves, CONTROLS tab                                                                                                          |
| should   | Analyse audio or MIDI into editable chords (drop a region onto the chord lane to transcribe it)                                                                                 | Logic Pro 12 Chord ID                                                                                                                                                                        | Insight already analyses live. Letting students drop a recording or region to get a chord lane they can correct turns analysis into an active, correctable exercise. Mark low-confidence chords and invite correction, because Chord ID is 'not perfect' on dense material.                                                                                         | Insight panel ('Send to chord lane' action), chord lane, Practice Track view                                                             |
| should   | Assistant flow of analyse, a few named characters, one amount slider, A/B at matched loudness, and re-analyse                                                                   | Logic Mastering Assistant (Character, Loudness ~-14 LUFS, Auto EQ amount, Bypass + Loudness Compensation, Reanalyse); BandLab Mastering presets + 11-level Intensity + before/after spectrum | This could become a clean, teachable first screen for the MASTER view's mastering chain: plain-language presets, one intensity control, and an honest A/B at matched loudness that teaches students loudness bias. The detailed chain can sit behind an 'Advanced' option.                                                                                          | MASTER view mastering chain, Audio export                                                                                                |
| should   | Few visible constraints (genre, mood, tempo, key) plus Regenerate and N variations, then 'Edit in Studio'                                                                       | BandLab SongStarter; Soundtrap Chords (category, style, key, pick chords in sequence)                                                                                                        | Prism already has genre, key/mode and rhythm. Present them as one compact row of chips, show 3 variations, and let students pick chords one by one in sequence (as Soundtrap does) instead of only accepting whole progressions. Picking one chord at a time is itself a teaching step.                                                                             | Prism header, project-start flow (Templates/Production tab)                                                                              |
| must     | Autosave with time-stamped Versions history and no save button                                                                                                                  | Suno Studio (Project menu > Versions)                                                                                                                                                        | This deals with uneven persistence across reloads and the 'starting a lesson clears unsaved work' risk. Teachers could also see how a student's work changed over time.                                                                                                                                                                                             | File menu / project persistence layer, DawApp startup (lesson/template/demo launches should create a version instead of discarding work) |
| could    | Empty-state context bar that suggests next actions (create, open library, upload) based on what is on the timeline                                                              | Suno Studio Context Bar                                                                                                                                                                      | One adaptive entry point cuts down the many entry points and helps beginners get started in an empty project, while staying quiet once the project has content.                                                                                                                                                                                                     | Arrange timeline empty state, Library panel, tutorial coach card                                                                         |
| could    | Lessons built into the app next to the features they teach                                                                                                                      | Ableton Built-in Lessons (What's New > MIDI Tools / Scale Awareness)                                                                                                                         | Insight already links to lessons. Its links could open the relevant lesson step or spotlight right next to the feature, instead of sending the student out of the editor.                                                                                                                                                                                           | Insight panel links, tutorial spotlight + coach card                                                                                     |
| could    | Natural-language command bar limited to explicit, previewable actions                                                                                                           | Suno Studio 2.0 Chat Bar                                                                                                                                                                     | Could later let students ask 'make this progression sadder' or 'why does this chord work?'. Only worth doing if the result goes through the same preview/commit lanes and comes with an Insight explanation.                                                                                                                                                        | Insight panel (question input), Prism                                                                                                    |

### Avoid

- **Black-box generation where prompting is the only control and nothing explains why the result sounds as it does** (Suno Studio (MusicTech: steep prompting learning curve, unpredictable output)): It works against the learning goal. Music Atlas students need to see the function and the reasoning (Insight), not just get a result.
- **Generators that write over existing notes the moment they are invoked, with parameter changes that can't be undone** (Ableton MIDI Tools (generators replace overlapping notes; undo covers notes but not tool parameters)): Students lose work and can't compare options. In real-time collaboration it overwrites a partner's edits. Use preview lanes and make tool settings part of undo and persisted state.
- **Marketing generators as a way to skip theory** (Soundtrap Chords ('Playing an instrument has traditionally required some knowledge of music theory... But not anymore!')): This conflicts with Music Atlas's education mission. Prism should present suggestions as theory examples that come with explanations.
- **Separate destinations for assistant features (a mastering page outside the editor, an idea generator before the editor)** (BandLab Mastering and SongStarter flows): It adds entry points and context switches, which is one of our known pain points. Keep assistance inside existing surfaces (dock, MASTER, Insight).
- **Harmony that silently runs out or goes stale, with players looping the last chord past the end of the chord data, or analysis not updating after edits** (Logic Session Players past the last chord (Sound On Sound); Mastering Assistant needs a manual Reanalyse): Students may take a silent fallback for musical intent. Show coverage of the chord lane and flag stale analysis in Insight.
- **Paid or metered regeneration that discourages exploring alternatives** (Suno Studio credit burn on stem regeneration): Exploring many alternatives is the point for learners. Keep Prism and Grooves deterministic or rule-based and local, so variations are free and instant.
- **Dense, small-type pro panels and theory-heavy controls (e.g. a Tonnetz pad) shown without scaffolding** (Ableton Live 12 MIDI Tools / Stacks): This repeats our existing 8-10px density problem. Show the core 2-3 controls by default and put advanced ones behind a reveal.
- **Depending on one browser and hiding heavy work behind long loads** (Suno Studio (Chrome-first, Safari performed poorly; release notes later targeted faster playback and project loading)): Students use school Chromebooks, iPads and Safari. Lazy-load each view or engine (Score, Master, NAM, Oracle Synth) instead of one monolithic chunk, and test Safari.

## web-native

### openDAW (André Michelle, open source, AGPL-3 / commercial dual licence)

**Layout.** Desktop-DAW layout built from declarative 'workspace screens' (packages/app/studio/src/ui/workspace/Default.ts). The Default screen is a Browser panel (fixed 300px) on the left, then a centre column of Timeline (flex 2), Editor (flex 1, starts minimised) and Devices strip (fixed 248px), with the Mixer (flex 0.25, starts minimised) on the right. Other named screens: Mixer (Browser + Mixer + Devices + 448px Analysis panel), Modulation, Piano Tutorial Mode (one full-screen MidiFall panel), Project Info (info + notepad), Shadertoy, Code (hidden), Match Tempo (tap tempo), and a hidden Dashboard. Each panel declares minSize/flex, minimizable and popoutable. The timeline stacks header, clips header, navigation, primary tracks (tempo/signature/markers), audio-unit tracks and footer. A 2026 review describes it as browser left, timeline centre, mixer right, piano roll plus device chain at the bottom.

**Learning and onboarding.** States a focus on education and data privacy: no sign-up, tracking, cookies or ads. Has a guided tour with spotlight ring and card, a Piano Tutorial (falling notes) screen, linked manuals (/manuals/latency) and a project NotePad panel.

**Performance and tech.** Three execution contexts (community architecture doc): (1) Main thread: UI, the Project 'BoxGraph' (a reactive typed object graph with pointer subscriptions), EngineFacade observables and SampleManager. (2) AudioWorklet: a WASM engine (@opendaw/studio-core-wasm, Rust) processing every 128 frames. It advances PPQN position, sequences clips, runs audio units in topological order and mixes to master. (3) Web Workers: peak generation, a high-resolution clock and ffmpeg.wasm. Commands such as play and set tempo, plus async fetches, go over MessagePort RPC. High-frequency state (playhead position, meters, performance data) goes from the worklet to the main thread through a SharedArrayBuffer, which the UI polls once per AnimationFrame, so React-style re-renders are never triggered. The project box graph is serialised to an ArrayBuffer and rebuilt inside the worklet, which isolates realtime audio from edits. Requires COOP/COEP cross-origin isolation (HTTPS + mkcert locally). UI uses its own JSX/DOM libraries (packages/lib: std, jsx, dom, box, box-forge, fusion, runtime, dsp, midi, dawproject, inference) with no React. Rendering: one <canvas> per region lane through a CanvasPainter. Redraws are requested by observable subscriptions (range, region changes, enabled, signature) and batched. An IntersectionObserver stops painting off-screen lanes, and RegionRenderer.iterateRange(unitMin, unitMax) draws only regions in view, using Canvas2D renderers for notes, audio and automation. Meters (VUMeter.tsx) are SVG updated by model.subscribe -> needle.setAttribute('transform', ...), bypassing reconciliation. Screens are built lazily and destroyed on switch through a lifecycle Terminator. Known engine issues to learn from: loudness meter totals carry over between projects (#428); a new subscriber's first meter packet can be all zeros (#429); recorded takes land 35-53 ms early (#374), now addressed by loopback input-latency calibration (PR #380). The review measured about 23 ms output latency at 48 kHz.

**Persistence and reload.** Local-first. Projects are kept in the browser (IndexedDB/OPFS) and not uploaded by default. Imported samples live in OPFS with metadata, and waveform peaks are generated in a worker and cached. A project can be exported as a single zip bundle (.odb) with its samples, and DAWproject import/export exists. The 'Blue Sky' SDK release (Sept 2025) added optional private cloud backup to the user's own Google Drive or Dropbox over OAuth, with automatic sync and delete/disconnect controls. A PWA for offline use is planned or in progress. Workspace PanelState (including 'minimized') is in memory only; PanelState.ts has no persistence. Collaboration uses a per-room Yjs document; samples and soundfonts travel peer-to-peer over WebRTC. A proposed shared transport keeps playback state in a separate Y.Map {playing, epoch, anchorPosition, bpm}, recomputes position locally, rejoins on bar/beat boundaries and corrects only when drift exceeds about 150-200 ms (issue #325, open).

**AI and theory features.** No theory analysis found. A 'Piano Tutorial Mode' falling-notes screen and an 'inference' lib package exist (purpose not documented in what I read). Apparat is a JavaScript-scriptable instrument.

**Visual style.** Dark, dense, utilitarian desktop-DAW look styled with Sass. Colours mark collaborators (presence dots) and regions (ColorMenu).

**Signature patterns**

- Panels are typed and declared as data (PanelType + flex/minSize/minimizable/popoutable), so whole screens are swapped instead of opening modals.
- The Editor (piano roll) is a bottom panel that starts minimised in the main screen, not a separate modal.
- Teaching screen: 'Piano Tutorial Mode' is one full-screen falling-notes panel.
- Built-in guided tour (ui/tour: Tour, TourAnchors, TourCard, TourRing, TourPlacement with tests). Anchors are registered against a component lifecycle and the tour subscribes until the target exists.
- Live Rooms (since March 2026): each collaborator has a name and a coloured dot on the panel header they are working in; RoomStatus shows the room name with copy-link and a TrafficWatch network meter.
- Contextual warnings anchored to the control they concern (LatencyWarning: 'High output latency', with a 'How to reduce it' manual link).
- 'Update available' banner whose button runs 'Save and reload'. It saves the project and only reloads if nothing is left unsaved.
- Follow-playhead moves the visible range only when the position leaves the viewport (an observable subscription, not polling).

**Weaknesses**

- Latency around 23 ms: fine for composing, weak for live recording (2026 review).
- No comping or elastic audio; few hardware controller integrations.
- 10 workspace screens, including developer-oriented ones (Shadertoy, Code), spread out the entry points.
- Panel minimise state is not persisted across reloads.
- Engine metering and recording-offset bugs were open in 2026 (#374, #428, #429).

**Sources**

- <https://github.com/andremichelle/openDAW>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/README.md>
- <https://github.com/andremichelle/openDAW/releases>
- <https://github.com/naomiaro/opendaw-test/blob/main/documentation/00-system-architecture.md>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/workspace/Default.ts>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/workspace/WorkspacePage.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/workspace/PanelState.ts>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/timeline/Timeline.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/timeline/tracks/audio-unit/regions/RegionLane.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/timeline/tracks/audio-unit/regions/RegionRenderer.ts>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/meter/VUMeter.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/tour/TourAnchors.ts>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/UpdateMessage.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/LatencyWarning.tsx>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/packages/app/studio/src/ui/RoomStatus.tsx>
- <https://github.com/andremichelle/openDAW/issues/325>
- <https://github.com/andremichelle/openDAW/issues/428>
- <https://github.com/andremichelle/openDAW/issues/429>
- <https://github.com/andremichelle/openDAW/issues/374>
- <https://github.com/andremichelle/openDAW/pull/380>
- <https://polarity.me/posts/polarity-music/2025-02-21-opendaw-sample-import-and-opfs-features/>
- <https://circuitsupply.io/blog/opendaw-review-browser-daw>
- <https://raw.githubusercontent.com/andremichelle/openDAW/main/CLAUDE.md>

### Audiotool (3.0, relaunched July/August 2026; NEXUS SDK)

**Layout.** From the help manual (2025): Global Controls at the top (transport, play/stop/loop/record, BPM, time signature, position, project management). The Timeline is the central workspace, with pointer/cut/time-stretch tools, snap-to-grid, adjustable track heights and Follow Playhead. The Library panel on the left holds synths, drum machines, effects and utilities, which can be dragged straight onto the timeline. A separate Studio View is a free canvas where devices are placed and patched with virtual cables. The Mixer sits on the right and has a dynamic mode that shows only the channels for the selected devices or timeline tracks. An on-screen piano lets users preview and play without MIDI hardware.

**Learning and onboarding.** Has an 'For Educators' programme page (no curriculum details), a basics manual and the 'Let's Build!' hackathons (through August 2026, with BBC R&D, Berklee AIMS). NEXUS is pitched as able to build educational content and music games that run inside the DAW.

**Performance and tech.** Started as Flash (2008, André Michelle), was rebuilt in HTML5 (2017/2018), and 3.0 (2026) is a ground-up rebuild that Wikipedia and launch coverage describe as written in Rust. It claims 'the lowest latency of any online music tool' (marketing claim, not benchmarked). I found no public material on its rendering stack (Canvas, WebGL or WebGPU); treat that as unknown. NEXUS defines entities and actions with Protocol Buffers. Every edit is sent to the backend, which forwards it to the other clients. The backend resolves consistency conflicts automatically. The SDK docs give typical latency of 150-300 ms to US-Central API servers. Before changing the document a client must take a document lock (modify(t => ...) / createTransaction()).

**Persistence and reload.** Cloud-first: projects are synced documents on Audiotool's backend (SyncedDocument.start()), so state survives reload because the server holds it. I found no public documentation of offline mode, local drafts, autosave or version history; treat as unknown.

**AI and theory features.** NEXUS is 'AI-enabled', connecting a creator's preferred LLM to the session through MCP and Context I/O. Launch partners include Splice, UJAM, BandM8 and Fraunhofer. No built-in theory analysis was documented.

**Visual style.** Skeuomorphic hardware-style devices patched with cables in the Studio View, next to a conventional timeline (from the help manual; 3.0 visuals not documented in text sources).

**Signature patterns**

- Dynamic mixer that shows only the channels relevant to the current selection.
- Drag a device from the library straight onto the timeline to create a track.
- On-screen piano for users without MIDI hardware.
- Real-time multiplayer as the main idea ('Google Docs for Music'), on browsers and tablets, with native mobile apps announced.
- NEXUS SDK: the project is a set of typed entities (notes, devices, cables, regions) changed through transactions, with event subscriptions for create, update and remove. Bots and external apps (including LLMs through MCP) join a session as peers.

**Weaknesses**

- Every edit makes a 150-300 ms server round trip (SDK docs), so the UI must apply edits optimistically to feel instant.
- The cable-patching Studio View adds a lot of concepts for beginners (my judgement, based on the manual's description).
- No published engineering details on rendering, offline use or recovery.
- The 3.0 rebuild is about two months old as of 2026-10-06, so expect fast change.

**Sources**

- <https://www.audiotool.com/help/manuals/get-started/basics.html>
- <https://developer.audiotool.com/js-package-documentation/documents/Overview.html>
- <https://developer.audiotool.com/js-package-documentation/types/index.SyncedDocument.html>
- <https://developer.audiotool.com/js-package-documentation/documents/Getting_Started.html>
- <https://www.audiotool.com/LetsBuild/what-is-audiotool>
- <https://en.wikipedia.org/wiki/Audiotool>
- <https://mixdownmag.com.au/news/audiotool-3-0-launches-with-multiplayer-daw-and-open-sdk/>
- <https://techplugged.com/audiotool-3-0-rebuilds-its-browser-daw-into-a-multiplayer-music-platform-with-an-open-sdk/>
- <https://weraveyou.com/2026/07/free-browser-daw-launches-with-real-time-multiplayer-and-custom-instrument-building>

### Soundation (Soundation AB)

**Layout.** Conventional browser DAW: a multitrack timeline with audio and MIDI clips, a MIDI editor (move/add/delete/resize notes, velocity, quantise, swing), an audio editor (split, fades, automation, time-stretch, pitch-shift, volume/pan), a sound library of 20,000+ loops and samples, templates, a Beatmaker and a Simple Sampler. Details come from the product site and review aggregators; I could not reach the official help centre, so panel-level anatomy is unverified.

**Learning and onboarding.** Learn hub with a basics guide, video tutorials, production and songwriting courses. Teacher dashboard and assignment templates (see above).

**Performance and tech.** First music-production product to ship on WebAssembly Threads (pthreads + SharedArrayBuffer), after more than a year working with Google's WASM and Chrome Audio teams (around late 2018, Chrome 70-72 era). It replaced PNaCl. Reported 100-300% performance gains on multicore machines: one extra thread doubled performance and five threads more than tripled it. Benchmark project: 10 audio tracks, 12 synths, 270 regions, 84 filter effects, rendered to file on an i7-6700HQ, compared with PNaCl and native. The engine is C++ compiled to WASM (implied by the PNaCl lineage). Education supports only Chrome and Edge. I found no public detail on UI rendering technology.

**Persistence and reload.** Cloud storage of projects and uploaded audio, with changes autosaved in collaborative projects (review aggregator wording). No official documentation found on local recovery, offline mode or version history; treat as unknown.

**AI and theory features.** Gennie text-to-sample AI. No theory analysis or harmonic guidance documented.

**Visual style.** Dark, modern, beginner-friendly consumer DAW (marketing site); no detailed design system published.

**Signature patterns**

- Templates as project starting points; teachers use custom templates as assignments.
- Gennie: AI text-to-sample generation (about 12-second clips).
- Real-time co-creation by invitation; projects, presets and samples shared by link.
- Uploaded audio stored in the account and reusable across projects and computers.
- Education dashboard (April 2023): teacher self-service sign-up, multiple classes, adding students, assignment management with custom templates, COPPA/FERPA/GDPR, priced per teacher rather than per student, Google Classroom integration announced as planned.

**Weaknesses**

- Restricted to Chrome and Edge (education announcement), which excludes Safari/iPad classrooms.
- Engineering details are old (2018-2019); the article URL now returns 404.
- No theory-aware features.

**Sources**

- <https://soundation.com/>
- <https://www.packtpub.com/en-ES/learning/tech-news/soundation-releases-its-first-music-studio-built-on-webassembly>
- <https://soundation.com/station/soundation-is-the-first-online-music-production-software-to-implement-webassembly-threads-gains-over-70-performance-improvement/>
- <https://soundation.rockpaperscissors.biz/>
- <https://www.g2.com/products/soundation/reviews>
- <https://softwarefinder.com/design-software/soundation>
- <https://web.dev/articles/wasm-threads>

### Borrow

| Priority | Pattern                                                                                                                                                                                                                                                                                                                                                              | From                                                                                                                                                  | Why for Music Atlas                                                                                                                                                                                                                                             | Changes                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| must     | Keep high-frequency engine state (playhead position, meters, CPU) out of the app store. The audio side publishes it to a shared buffer (SharedArrayBuffer, or MessagePort as a fallback), and one requestAnimationFrame loop on the main thread reads it and writes straight to the DOM or canvas (style.transform / setAttribute). No React state is set per frame. | openDAW (EngineFacade + SharedArrayBuffer polled per AnimationFrame; VUMeter subscribe -> setAttribute)                                               | Removes the known 30fps store-driven playhead that re-renders large components. Students on school Chromebooks get a smooth cursor, and the Insight, Prism and piano roll panels stop re-rendering during playback.                                             | Arrange timeline playhead, piano roll playhead, SCORE/LEAD SHEET follow cursor, transport time display, MASTER mixer meters, Oracle Synth/organ/amp meters, Practice Track cursor |
| must     | Draw clips, notes, waveforms and automation on one <canvas> per lane, not as DOM nodes per note. Repaint only when that lane's data or the visible range changes (batched through rAF), skip off-screen lanes with an IntersectionObserver, and draw only regions inside [visibleStart, visibleEnd].                                                                 | openDAW (RegionLane CanvasPainter + Html.watchIntersection + RegionRenderer.iterateRange)                                                             | Arrangements built from Prism progressions, grooves and templates produce many notes. Canvas lanes keep scroll and zoom fast and stop note-level DOM churn from slowing the rest of the page.                                                                   | Arrange timeline clip lanes, PIANO ROLL grid/notes, GROOVES step view, automation lanes                                                                                           |
| must     | Generate waveform peaks in a Web Worker at import or record time and cache them (IndexedDB/OPFS) under the sample's content hash. Reload then reads the cached peaks instead of decoding audio again.                                                                                                                                                                | openDAW (SampleManager -> Peaks Worker, cached in IndexedDB/OPFS)                                                                                     | Projects with recordings, vocal chain takes and sampler content reopen instantly after a reload, and decoding never freezes the UI during a lesson.                                                                                                             | Audio clips in the arrange view, sampler, vocal chain recordings, NAM amp-sim takes, Practice Track backing audio                                                                 |
| must     | Save the project and its samples locally first (IndexedDB/OPFS) on every change and sync to the cloud in the background. Offer a 'Save and reload' path that only reloads once nothing is unsaved. Show a non-blocking 'Update available' banner when a new build is deployed.                                                                                       | openDAW (local-first projects, OPFS samples, UpdateMessage 'Save and reload', Blue Sky cloud backup)                                                  | Fixes uneven reload behaviour and lost student work. A stale lazy chunk after a deploy becomes a safe save-and-reload instead of a crash, and work survives classroom Wi-Fi drops.                                                                              | DAW project persistence layer, crash/session recovery, lazy-chunk load error boundary, real-time collaboration sync                                                               |
| must     | Define each view as a named 'screen' of typed panels (flex/minSize/minimizable), built only when opened and fully cleaned up on switch. Persist screen choice, panel sizes and minimised state per user. The piano roll is one bottom 'Editor' panel that can be minimised, not a modal.                                                                             | openDAW (workspace/Default.ts screens; WorkspacePage Terminator lifecycle). Persistence is added by us because openDAW's PanelState does not persist. | Turns many entry points into a few predictable places. Removes the duplicate modal piano roll next to the dock tab. Splits the single large lazy chunk along screen lines (Arrange, MASTER, SCORE/LEAD SHEET, Practice). Restores the same layout after reload. | Studio editor shell/router, bottom dock (CONTROLS/FX/GROOVES/PRISM/PIANO ROLL), MASTER view, SCORE, LEAD SHEET, Practice Track view, right side panel (Insight/Library)           |
| should   | Keep the audio engine's copy of the project separate from the editing model. The engine receives a serialised snapshot plus incremental commands over MessagePort RPC and never reads UI state directly.                                                                                                                                                             | openDAW (box graph serialised to ArrayBuffer for the worklet; MessagePort RPC for play/tempo)                                                         | Stops UI edits (Prism generation, Insight re-analysis, collaboration patches) from causing audio glitches, and makes engine behaviour testable on its own.                                                                                                      | DAW engine/store boundary, Oracle Synth, drum machine, sampler, audio export                                                                                                      |
| should   | Tutorial anchors are registered by components when they mount (register(lifecycle, element, anchorId)), and the tour subscribes until the target exists, instead of searching the DOM by selector.                                                                                                                                                                   | openDAW (ui/tour TourAnchors registry, TourRing, TourCard, TourPlacement tests)                                                                       | The spotlight and coach card keep working when targets are lazy-mounted, inside minimised panels or on another screen. The tutorial can switch screens first, then highlight the control.                                                                       | Step-by-step tutorials (spotlight + coach card), lesson launch into editor                                                                                                        |
| should   | A dynamic mixer mode that shows only the channels for the selected tracks or devices.                                                                                                                                                                                                                                                                                | Audiotool (Mixer dynamic mode, help manual)                                                                                                           | Students see the one or two channels they are working on instead of a full console, which cuts density without removing features.                                                                                                                               | MASTER view mixer, CONTROLS/FX dock tabs (selected-track channel strip)                                                                                                           |
| should   | Keep shared playback (transport) state separate from the shared project document. Followers compute position locally from {playing, epoch, anchorPosition, bpm}, rejoin on a bar or beat, and correct only beyond a drift threshold. Show presence as coloured dots on the panel headers where each collaborator is working.                                         | openDAW (issue #325 shared transport; Live Rooms presence dots)                                                                                       | Lets a teacher press play and have the class hear the same passage without glitches. Presence dots show who is working where without extra UI. Collaboration colours fit 'colour reserved for meaning', because a person is meaningful.                         | Real-time collaboration layer, transport bar, dock tab headers, track headers                                                                                                     |
| should   | Apply edits locally first and reconcile with the server later, because a server round trip is 150-300 ms per edit.                                                                                                                                                                                                                                                   | Audiotool NEXUS (documented 150-300 ms latency; backend resolves conflicts)                                                                           | Note entry and drags during collaborative lessons should feel instant regardless of the school's network.                                                                                                                                                       | Real-time collaboration sync for piano roll, arrange edits, Prism inserts                                                                                                         |
| could    | Show warnings next to the control they concern and link to the matching manual or lesson (e.g. 'High output latency - How to reduce it').                                                                                                                                                                                                                            | openDAW (LatencyWarning anchored to its trigger, links to /manuals/latency)                                                                           | Matches Music Atlas's lesson links in Insight: problems become small teaching moments instead of modal errors.                                                                                                                                                  | Audio/MIDI settings, recording (vocal chain, amp sim), Insight lesson links                                                                                                       |
| could    | A dedicated full-screen practice view (falling-notes piano tutorial) as its own screen, not a panel competing with the arrange view.                                                                                                                                                                                                                                 | openDAW (Piano Tutorial Mode screen, MidiFall panel)                                                                                                  | Practice is a distinct student task; giving it a whole screen removes clutter and supports large, readable text.                                                                                                                                                | Practice Track view                                                                                                                                                               |
| could    | Expose the project as typed entities with transactions and change events so bots or AI agents can join a session as peers.                                                                                                                                                                                                                                           | Audiotool NEXUS SDK (entities, transactions, onCreate/onUpdate, MCP/LLM peers); openDAW Yjs rooms                                                     | Insight and Prism could work as 'theory peers' that react to edits and suggest or insert chords through the same transaction path as people, which also keeps undo and collaboration consistent.                                                                | Insight panel, PRISM generator, collaboration model                                                                                                                               |
| could    | Run offline mixdown and export in a worker or OfflineAudioContext, optionally using multi-threaded WASM for heavy rendering.                                                                                                                                                                                                                                         | Soundation (WebAssembly Threads: one extra thread doubled performance, five threads more than tripled it)                                             | Audio export and bounce stop freezing the editor. Only take on threads if cross-origin isolation is acceptable (see avoid).                                                                                                                                     | Audio export, mastering chain render, NAM amp sim offline processing                                                                                                              |
| could    | A single-file project bundle (zip containing the project plus its samples) for export and import.                                                                                                                                                                                                                                                                    | openDAW (.odb ProjectBundle via jszip; DAWproject import/export)                                                                                      | Students can submit a self-contained project to a teacher or back it up, and teachers can share starter kits that open offline.                                                                                                                                 | File menu export/import, templates, lesson starter projects                                                                                                                       |
| could    | Templates used as classroom assignments: the teacher sends a starter template to a class.                                                                                                                                                                                                                                                                            | Soundation Education (custom templates for assignments, multi-class dashboard)                                                                        | Fits Music Atlas's teacher workflow and the existing templates and lessons; the editor just needs a clean 'open assignment' entry.                                                                                                                              | Templates, lesson launch into editor, teacher classroom integration                                                                                                               |

### Avoid

- **Sending the playhead, meters or other per-frame engine values through the global app store or React state.** (Music Atlas today (30fps store-driven playhead); contrasted with openDAW): Every subscriber re-renders 30-60 times a second. openDAW deliberately polls a shared buffer once per animation frame and writes to the DOM directly.
- **Rendering each note, step or waveform segment as its own DOM or React element in the timeline and piano roll.** (General web-DAW pitfall; openDAW avoids it): Thousands of nodes make scroll, zoom and drag lag. openDAW uses one canvas per lane with viewport culling.
- **Turning on COOP/COEP cross-origin isolation for the whole app just to get SharedArrayBuffer or WASM threads without auditing third-party content.** (openDAW (requires COOP/COEP), Soundation (WASM threads)): openDAW and Soundation's threaded engine depend on cross-origin isolation. It blocks embeds and assets that lack CORP/CORS headers (lesson videos, CDN images, payment and auth popups). Limit it to the /studio route or use COEP 'credentialless', and keep a MessagePort fallback.
- **Supporting only Chrome and Edge.** (Soundation): Many students use iPads or Safari. Soundation Education's Chrome/Edge requirement excludes them, which conflicts with a classroom-wide platform.
- **Keeping panel and layout state only in memory.** (openDAW (PanelState.ts)): Minimised panels, dock tab and screen choice reset on reload. openDAW's PanelState has no persistence, which is the same uneven-reload problem Music Atlas has.
- **Many top-level screens or modes, including developer or experimental ones, at the same level as core views.** (openDAW (workspace/Default.ts)): openDAW has 10 workspace screens (Shadertoy, Code, Match Tempo...), which makes entry-point sprawl worse. Music Atlas should keep a small set of task screens and put tools inside them.
- **Waiting for the server before showing an edit in a collaborative session.** (Audiotool NEXUS (documented latency)): A 150-300 ms round trip makes note entry feel broken. Apply edits optimistically and reconcile afterwards.
- **Correcting collaborators' playback continuously with phase nudges.** (openDAW issue #325 (rejected alternative)): It sounds glitchy. openDAW's design rejects it in favour of rejoining on a bar or beat with a drift tolerance of about 150-200 ms.
- **Meter or analysis state that carries over across projects or transport stops, and first readings that show stale zeros.** (openDAW): It misleads students reading loudness or levels (openDAW #428/#429). Reset analysers on project load and transport start, and prime new subscribers with current values.
- **Shipping recording without input-latency compensation.** (openDAW): Takes land 35-53 ms early (openDAW #374), so students' timing looks wrong in exactly the lessons that grade timing. Add loopback calibration (as openDAW PR #380 does).
- **Making the cable-patching modular 'desktop' the main workspace for beginners.** (Audiotool (Studio View)): Signal-flow patching adds many concepts that are not about music theory. Keep routing inside MASTER sends/returns and device chains. (This is my judgement from Audiotool's Studio View description.)
