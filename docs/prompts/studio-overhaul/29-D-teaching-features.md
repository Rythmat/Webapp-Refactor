# Stage D: teaching features from the Soundtrap and Soundation review

Added 2026-10-14 at the owner's request ([`reference/plan.md`](reference/plan.md) decision 15). Prompts 30–37 build it, one milestone each (see the README). **Proposed: the owner signs off decisions SD1–SD11 below before prompts 31–37 run.** Stages A–C keep their order; Stage D runs as a third track beside Stage C, each milestone starting once what it waits for has shipped.

## Why

On 2026-10-14 the owner reviewed three competitor videos, then had Soundtrap and Soundation tried hands-on in a browser:

- Andrew Huang's sponsored Soundtrap tour, "Web browser DAW has features the majors are missing!" (28 Sep 2026);
- Soundation's "Get started with Soundation Education" and "How to import classes from Google Classroom into Soundation Education";
- a signed-in Soundtrap studio session and a Soundation studio session in Chrome.

Both products wrap the editor in a classroom loop: a teacher hands out a project, every student gets their own copy, and the teacher opens, comments on and grades each copy. Music Atlas has most of the parts (live collab, the cloud document, assignments that accept a link to the student's work, the harmony core) but not the loop around Studio work. Soundtrap also ships song sections, one-key chords and key matching. Music Atlas can do those better by explaining the music: naming the interval, the chord's numeral and the song's form.

## What the review found

Each area lists what the competitors do, then what Music Atlas has today (checked in the code on 2026-10-14).

**Handing out a project.**

- Soundation Education: the teacher turns a project into a template and moves it into a class. Opening it makes the student's own copy with the teacher added as a collaborator, named like "1st assignment - Angela". Every project in the class is visible to the teacher. Plain Soundation has the same idea as a Share option: a template link lets "anyone with the link duplicate and make their own version".
- Music Atlas: a project belongs to one account. Opening someone else's project shows "… isn't shared with you" (`src/daw/session/openErrors.ts:124`). There's no Duplicate and no save-as-template (`src/daw/shell/projects/ProjectsDialog.tsx:48`); only Save As. `?template=` loads 4 built-in track shells (`src/daw/data/projectTemplates.ts`). Demos are the one full-copy pattern: `applyDemo` loads a bundle, then `setProjectId(null)` (`src/daw/data/demoSeed.ts:63-68`).

**The teacher seeing the work.**

- Soundation Education lists the class's projects on the class page.
- Music Atlas: assignments live on the API.
  - `kind:'atlas'` with `atlasRef.module:'studio'` is already in the server contract (`docs/classroom-v2/backend-directions.md:93-110, 273-285`) but switched off in the client (`ASSIGNMENT_KIND_ENABLED` in `src/features/classroom/assignments/useAssignments.ts:89-94`).
  - A progress row accepts `artifactRef {module, deepLink, preview}`, and the progress page already renders it as a link (`src/features/classroom/assignments/AssignmentProgressPage.tsx:168-180`). Nothing sends one; Studio only reports tutorial completion.
  - There's no list of student Studio projects, and the gradebook only counts.

**Listening without editing.**

- Soundtrap makes a mixdown automatically at the end of every session.
- Soundation's play-only link lets "anyone with the link play the project, without having to sign up".
- Music Atlas: export is a WAV/Opus download (`src/daw/audio/exportAudio.ts`), with no upload and no listen link. Offline render has gaps: SoundFont tracks render silent, guitar/bass/vocal effects render dry, and the ducker is missing (`src/daw/audio/renderProject.ts:22-42`).

**Comments.**

- Soundtrap: you comment on a clip at a time ("Comment or mention others with @"). Threads take replies, ✓ resolves them, and a Comments panel shows Active and Resolved with a filter.
- Soundation has project chat only.
- Music Atlas has no comments: plan.md listed "timeline comments (need an API)" as deferred. Chat lives in the live room's Y.Doc, as a session field that's never saved with the project.

**Song sections.**

- Soundtrap: a "+ Section" lane above the ruler.
  - Names: Intro, Verse, Chorus, Pre Chorus, Bridge, Outro, Interlude, Solo, Hook, Breakdown, Drop, Build Up, or a custom name.
  - Sections are grey 2-bar blocks placed end to end.
  - Right-click offers Rename, Delete, Resize, Copy, Loop, and Create section before/after. The tooltip says to drag a section to rearrange the song.
- Soundation: none seen.
- Music Atlas:
  - The Timeline has point markers only (`src/daw/store/markersSlice.ts`). You create one by double-clicking the ruler and rename it through `window.prompt`. Clicking a marker doesn't seek; the Skip buttons jump between markers.
  - The Lead Sheet has its own bar-indexed sections (`LeadSheetSection` in `src/daw/store/uiSlice.ts:125-128`). Song boots fill them with real names (`src/features/songs/seedStudioFromSong.ts`), but nothing links them to the Timeline.
  - UNISON already defines `SectionType` and `FormSection` (`src/unison/types/schema.ts:237-256`).

**Key and key matching.**

- Soundtrap: the key starts empty and the first loop with a key sets it; the first loop also set the tempo (120 → 134). Clips show their key. Changing the key asks "Do you want to adjust your audio data to match the new key?" and then moves every keyed loop, but never says by how much. Clips also have Change pitch (±semitones and octaves).
- Soundation: the library filters by key and can preview "synced to tempo". There's no project key.
- Music Atlas: the project key, mode and lock live in `src/daw/store/prismSlice.ts`. Parts are moved into the key when inserted (`transposePart`, `src/daw/components/Controls/PartsBrowser.tsx:80`). Changing the key re-derives the chord lane but leaves clips where they are, and clips have no transpose. Audio clips have no pitch or stretch fields (`AudioClip`, `src/daw/store/tracksSlice.ts:128-144`).

**One-key chords.**

- Soundtrap:
  - The keyboard's Auto-chords plays a full chord from one key. Its 7th and Add9 shapes and its strum are paid.
  - A Chords tab shows the key's chords as eight pads on Q W E R / A S D F (in G minor: Gm, Adim, Bb, Cm, D, Eb, F, Gm7).
  - Genre chord sets (Basic, EDM, Hip Hop, Rock) and rhythm "playing styles" sit alongside.
  - Adding a chord to the song is paid. The on-screen keyboard marks the key's notes.
  - Chords are named, never numbered.
- Soundation: 691 MIDI chord and melody clips, tagged with a key but no chord symbols.
- Music Atlas:
  - Musical typing (1.6) has no chord mode (`src/daw/commands/musicalTypingMap.ts`), and a disabled "Chord" MIDI effect placeholder sits in `src/daw/data/libraryItems.ts:177-203`.
  - Diatonic chord builders exist but are unused (`src/daw/prism-engine/engine/chordUtils.ts:9-36`, `src/unison/engine/diatonicChecker.ts`).
  - Roman numerals exist (`formatChord(…, 'roman', …)` in `src/lib/chordNotation/formatChord.ts`).

**Starting a project.**

- Soundtrap: an empty project shows six tiles: Browse loops, Patterns Beatmaker, Play the synth, Add new track, Import file, Invite a friend.
- Soundation:
  - A welcome picker offers five genre beats and five genre loop stacks, each labelled with key, genre and tempo ("Pájaros · Bm · Reggaeton · 90bpm"), plus Record audio, Import audio and Blank project.
  - The beat's melodic rows are chord one-shots (Keys_Bm, Keys_A, Keys_Em).
  - Its add toolbar is worded as goals: "Build a track with loops and samples", "Play or record an instrument", "Make a beat".
- Music Atlas: an empty project shows only "Add Track" (`src/daw/components/Timeline/TimelineWithHeaders.tsx:113-139`). `src/daw/ui/EmptyState.tsx` is unused, and 2.6 plans four tiles. Learn → Style has 14 genres.

**Effects.**

- Soundtrap groups its library by category, each with a one-line purpose ("Reverb: place sounds in a space"). "Instant Sidechain: rhythmic pumping shaped to your beat" is paid.
- Music Atlas: a keyed ducker ("Sidechain") with a key-track menu (`src/daw/components/Effects/EffectsPanel.tsx:1345-1462`). There are no effect presets.

**Roster.**

- Soundation Education: an invite link where the student requests access and the teacher approves, plus Google Classroom import (sign in, pick the class, untick students).
- Music Atlas already matches the first part: join by code, link or QR with pending approval (`src/features/teacher/components/InviteStudentDialog.tsx`, `src/features/teacher/components/RosterTabs.tsx`). There's no Google Classroom or CSV import. Google One Tap only picks the account (scopes openid, email, profile).

**Prices for context.**

- Soundtrap: US$9.59–16.59 a month. Chords, the extra auto-chord shapes and Instant Sidechain are paid.
- Soundation: MIDI and WAV exports say "Upgrade". Education charges per teacher seat.

## Decisions for the owner (SD1–SD11)

My recommendation comes first in each; each needs a yes or a change.

- **SD1 Placement.** Stage D is a third track beside Stage C. Each milestone starts once what it waits for has shipped. 4.0 is docs and a mock only, so it can run any time; running it before Stage B gives music-atlas-api lead time.
- **SD2 Sharing roles.** Each project has an owner plus editors, commenters and viewers. The teachers of an assignment are commenters on each student's copy, not editors. Co-editing stays a live room the student opens.
- **SD3 Comments are a server resource**, not part of the project document. A teacher can then comment without write access and without revision conflicts.
  - Everyone with access to the project sees them.
  - A teacher can delete any comment on an assignment copy.
  - There are no notifications or @mentions in v1.
  - Private grading feedback stays in the gradebook (Teacher Office P7).
- **SD4 Listening.**
  - v1 opens the project read-only in Studio: the live engine, so it sounds exactly right.
  - A turned-in mixdown comes after 1.11, when offline render matches playback.
  - No "anyone with the link" access to student work. Link sharing (play-only and template links) waits for your call on public links.
- **SD5 Chord keys are free** for every student. Prism stays Premium. Soundtrap charges for its chord tools.
- **SD6 No video calls in Studio**, because of minors, school bandwidth and Chromebook CPU. Revisit for teacher-led sessions only.
- **SD7 Sections.**
  - One model serves both the Timeline and the Lead Sheet.
  - The vocabulary is UNISON's `SectionType` plus tag, hook, breakdown, build-up and drop. That's a change to a shared UNISON type.
  - Sections are neutral blocks, since colour is only for meaning (decision 3).
  - New sections default to 8 bars.
- **SD8 Key changes.**
  - The first item with a key fills an empty key, per 1.16a's rule.
  - Changing the key offers to move MIDI clips and names each move ("up a half step, F♯m → Gm"). Drums stay put.
  - Audio clips don't move, because there's no pitch-shift engine. Adding one is a later decision.
- **SD9 Studio assignments use the existing `kind:'atlas'` with `atlasRef.module:'studio'`.** That needs no server migration and no new kind.
- **SD10 Google Classroom import and CSV roster import go to the Teacher Office program** (P9), not here.
- **SD11 Starter content:** you pick which Learn → Style genres get starters first.

## Milestones

| #   | Milestone                      | Waits for                                        | Size           |
| --- | ------------------------------ | ------------------------------------------------ | -------------- |
| 4.0 | Teaching API contract and mock | nothing (docs and mock; best before Stage B)     | 1 wk + API     |
| 4.1 | Read-only review               | 4.0, 2.5                                         | 1–1.5 wk       |
| 4.2 | Studio assignments             | 4.0, 4.1, 2.3, Teacher Office P6 (P7 for scores) | 2–3 wk + API   |
| 4.3 | Timeline comments              | 4.0, 4.1, 2.8                                    | 2 wk + API     |
| 4.4 | Song sections                  | 2.7, 3.3 (built inside 3.3 or right after it)    | 1.5–2 wk       |
| 4.5 | Chord keys                     | 1.16a, 2.11                                      | 1.5 wk         |
| 4.6 | Change key, move clips         | 1.16a, 2.5                                       | 1–1.5 wk       |
| 4.7 | Genre starters                 | 1.2b, 2.6 (4.4 helps)                            | 1 wk + content |

Total: about 11–14 developer-weeks in the plan's traditional estimates, plus music-atlas-api work and starter content.

**4.0 Teaching API contract and mock**

- `docs/studio-sharing-contract.md` for Ryan, written like `docs/studio-cloud-document-contract.md`:
  - **Access:** `GET`/`PUT /api/studio/projects/:id/access` returns the owner and members `{userId, role}`. Every project endpoint checks the caller's role. The list endpoint can show "shared with me".
  - **Assignment copies:** `POST /api/studio/assignments/:aid/copy` is idempotent for each student. It returns the student's existing copy or makes one from the template, named "<template> – <first name>". The classroom's teachers become commenters on it.
  - **Copies keep their audio.** A copy must keep playing after the original deletes a take. This answers the cloud contract's open question about copy semantics (`docs/studio-cloud-document-contract.md:134-145, 206-208`).
  - **Teacher list:** `GET /classrooms/:cid/assignments/:aid/studio-projects` returns each student's copy, last save, and turned-in time.
  - **Turn in:** `POST /api/studio/projects/:id/submissions {assignmentId}` stores a frozen copy of the saved document as a submission, with its audio kept alive. It also writes the progress row's `artifactRef` with `deepLink` pointing at the review link `?submission=<sid>`. A frozen copy avoids needing general version history, which stays deferred.
  - **Comments:** list, create, patch and delete under `/api/studio/projects/:id/comments`. Each comment carries `anchor {tick, clipId?, clipOffsetTicks?}`, `parentId`, `resolved`, `resolvedBy` and `createdAt`, with role checks.
  - **Retention:** what happens when a student leaves the class or a teacher deletes the assignment. Also size limits and an audit trail.
  - **Later:** a `bounce` asset kind on the existing asset pipeline (`src/lib/studio-assets/api.ts`) for SD4's turned-in mixdown.
- **Classroom side:**
  - Add rows to `docs/classroom-v2/CONTRACT-DELTAS.md` and `openapi.yaml` for `atlasRef {module:'studio', activityRef:'studio:project:<templateId>', expects:['artifact','completion']}`. The `studio:` refs already exist in `openapi.yaml:143`.
  - Add progress read-back of `artifactRef`; GET declares it `null` today.
  - Fix the stale `?collab=new&invite=` line in `docs/classroom-v2/ws-protocol.md:162`.
- **Flags:** `SERVER_STUDIO_SHARING_ENABLED` and `SERVER_STUDIO_COMMENTS_ENABLED` in `src/constants/serverEndpoints.ts`, kept in step with CONTRACT-DELTAS by `src/constants/serverEndpoints.test.ts`. They stay off until the API ships.
- **Mock:** sharing, copy, submission and comment modes in the 1.0 mock Studio API, with contract tests like `scripts/studio-perf/__tests__/mockStudioApi.test.mjs`.
- **Dev personas:** the bypass signs everyone in as `dev-bypass-user`. A dev-only `VITE_DEV_AUTH_BYPASS_USER` lets a teacher and two students run side by side (`src/auth/devBypass.ts`). `verify:prod` must still find nothing.

**4.1 Read-only review**

- **Two new boot intents**, validated like every other (`src/daw/session/parseBootIntent.ts`, `openSession`):
  - `?project=<id>&review=1` opens the latest saved copy.
  - `?submission=<sid>` opens a turned-in copy.
  - Neither writes a draft, autosaves, saves to the cloud, or joins a live room.
- **Edits are off:** a `readOnly` scope in the 1.6 command registry plus disabled controls. Play, Loop, Solo and Mute work but aren't saved.
- **A banner in the 2.5 top bar**, e.g. "Maya's project · turned in 14 Oct · read only", with Back to class.
- **Errors:** no access shows today's "isn't shared with you" panel. A missing submission falls back to the latest turned-in copy.

**4.2 Studio assignments**

- **The teacher starts in Studio:** Share ▸ "Assign to a class…" saves the project, pins a frozen copy of it as the template, and opens the Teacher Office composer already filled in (`kind:'atlas'`, module `studio`). From the Office, the composer's Studio option lists the teacher's projects instead.
  - The frozen copy means the teacher can keep editing the original and assign the same project to several classes. Soundation Education makes teachers duplicate a project by hand before turning it into a template.
- **Client switch-on** in Teacher Office files, coordinated with P6:
  - Turn on `ASSIGNMENT_KIND_ENABLED.atlas` and add `atlasRef` to `CreateAssignmentInput` and the POST body (`src/features/classroom/assignments/useAssignments.ts:89-104, 255-267`). Add Studio fields to `src/features/classroom/assignments/AssignmentComposer.tsx:100-176`.
  - Use one rule for where an assignment opens. Today `src/features/classroom/assignments/AssignmentsPage.tsx:145-155, 254-264` and `src/features/classroom/ClassroomHomePage.tsx:161-172` disagree, so a new kind would open differently from each page.
  - `src/features/classroom/assignments/assignmentsLoop.test.ts:180-192` asserts that `atlas` is rejected; update it.
- **Student:** the assignment opens `/studio/editor?assignment=<aid>&classroom=<cid>`. A new `assignment` boot intent fetches the student's copy through `copy`, keeps any open work as a draft (1.4), and posts `in_progress`.
- **In Studio:** an assignment strip in the 2.5 top bar shows the brief, the due date and **Turn in**.
  - Turn in saves, creates the submission and posts `done` with the `artifactRef`.
  - Edits made afterwards stay unseen until the student turns in again, and the strip says so.
- **Projects dialog (2.3):** an Assignments group showing each copy's status.
- **Teacher:**
  - For a Studio assignment, the assignment progress page is the student-work list. It's already routed (TeacherRoutes `assignmentProgress`), and P6 fixes names and not-started rows.
  - Its artifact column opens 4.1's review. 4.2 adds last saved, turned-in time and comment count (4.3).
  - A class-wide "Student work" tab next to People (`src/features/teacher/workspace/ClassroomTabBar.tsx:19-41`) can come later.
- **Grading stays in the Teacher Office:** turned-in Studio work enters P7's To-review queue, and scores and private feedback use `GradeRecord`.
- **Showcase:** an offer from a saved solo project gets an "Open" link through review. Today only live rooms get one (`src/features/classroom/live/slides/ShowcaseProjectorFrame.tsx:18-41`).

**4.3 Timeline comments**

- **Pins** are a DOM layer over the ruler, placed with `src/daw/components/Timeline/timelineGeometry.ts` (1.8), so 3.3's renderer split doesn't have to carry them.
  - A pin on a clip moves with the clip: its anchor is the clip plus an offset.
  - If the clip is deleted, the pin falls back to its bar.
- **Creating a comment:** "Add comment" in the clip and ruler menus, plus a registry command with no single-letter key. V, B and C are tools, and C changes velocity while typing.
- **Threads** open in a 2.2 popover with replies, ✓ Resolve, and edit/delete for the author. Teachers can delete any comment on an assignment copy (SD3).
- **Panel:** a Comments tab in the 2.8 Inspector with Active/Resolved and All/Teacher/Mine. Clicking a comment seeks to it and selects its clip.
- **Review mode** (4.1) lets commenters comment.
- **Freshness:** refetch on focus and every 30 s while the tab is visible. In a live room, the existing `studio:*` realtime channel sends a nudge.
  - Comments don't touch the Y.Doc, so `COLLAB_DOC_SCHEMA_VERSION` doesn't change.
- **plan.md:** its Deferred list loses "timeline comments".

**4.4 Song sections**

- **One section model (SD7):** a document field `sections: {id, type, label, startTick, endTick}[]`, placed end to end with no overlaps.
  - The Lead Sheet's bar-indexed `leadSheetSections` (`src/daw/store/uiSlice.ts:125-128`) migrates into it and reads it through the time model. 3.10 keeps one owner.
- **The full document-field routine** from the integration rules applies. Markers are the worked example to copy:
  - registry field (`document` scope, shared undo, a reason);
  - codec layout and cloud document;
  - a Y.Doc array with converters (`src/daw/collab/YjsDocManager.ts:60-62, 212-219, 386-393`);
  - the diff (`src/daw/collab/diffEngine.ts:410`), the observer (`src/daw/collab/yjsToZustand.ts:371-381`) and the undo scope (`src/daw/collab/undoScope.ts:41`);
  - bar edits shift sections the way they shift markers (`src/daw/time/measureEdits.ts:346`);
  - bump `SESSION_SCHEMA_VERSION`, the cloud `documentSchema` and `COLLAB_DOC_SCHEMA_VERSION`, with fixtures and the mixed-version collab check.
- **Song boots:** `src/features/songs/seedStudioFromSong.ts` writes `sections`, so a song opens with its form laid out. All 640 charts carry real section names.
- **UI on the Create canvas** (2.7 toolbar, 3.3 renderer):
  - A Sections lane above the bar ruler. "+ Section" lists the vocabulary plus a custom name.
  - Clicking a section seeks to its start, and dragging an edge resizes it on bar lines.
  - Right-click offers:
    - Rename, in an app dialog rather than `window.prompt`;
    - Change type;
    - Duplicate with its clips, as one undo step;
    - Loop this section, which sets the loop range;
    - Insert before/after;
    - Delete, which keeps the clips.
  - Moving a section together with its clips waits for 3.1's gesture controller.
- **Teaching:**
  - Each type gets a one-line purpose ("Chorus: the part everyone sings back; it usually repeats the same chords") with a link to Learn → Songs.
  - An optional "Suggest sections" uses UNISON's form analysis (`FormSection`, `deriveFormLabel` in `src/unison/converters/leadSheetConverters.ts`).
- **Markers stay** as cues. They gain click-to-seek and the in-app rename.

**4.5 Chord keys**

- **A Chords switch** in the typing chip's popover (2.11). While it's on, the home row plays the chords of the song's key:
  - A S D F G H J are degrees 1–7, and K is 1 an octave up.
  - They play triads, or sevenths while Shift is held.
  - Chords come from `effectiveKey` (1.16a) and the existing builders: `findTriadChords`/`findSeventhChords` in `src/daw/prism-engine/engine/chordUtils.ts`, or UNISON's `src/unison/engine/diatonicChecker.ts`.
- **A strip shows numerals and names in the key**, e.g. "I C · ii Dm · iii Em · IV F · V G · vi Am · vii° Bdim", using `formatChord(…, 'roman', {keyRootPc, mode})`. It uses key and chord colours (decision 3).
  - Minor keys follow the mode: i, ii°, III, iv, v, VI, VII.
  - Using a harmonic-minor V (D in G minor, as Soundtrap does) is your call.
- **Recording** writes the chord notes into the take. Afterwards it offers "Write the chord lane" as a preview, committed as one undo step.
- **Free for every student** (SD5). The disabled "Chord" MIDI effect placeholder (`src/daw/data/libraryItems.ts:177-203`) goes away.
- **Typing gets a Sustain toggle**, as Soundtrap's keyboard has. Today only a hardware pedal sustains (CC64 in `src/daw/hooks/useMidiInputRouting.ts:77-131`).
- **The typing overlay marks the key's notes**, as Soundtrap's on-screen keyboard does, so chromatic keys read as outside the key.
- **The Oracle Key/Scale lock follows the song key**, so typing, chords and the synth agree. Today it follows the detected key (`src/daw/hooks/useStoreBridge.ts:103-115`).
- **"Why these chords?"** links to the Learn → Theory lesson on the chords of a key.
- **Later, with 3.7:** genre chord sets from UNISON's Genre Voicing Taxonomy, as Soundtrap does with Basic, EDM, Hip Hop and Rock. Its rhythm "playing styles" (Full Chord, On One, and stabs like One and Three) map onto Prism's rhythms.

**4.6 Change key, move clips**

- **Changing the key** in the Song chip (2.5) asks once: "Move your clips to G minor?"
  - Each pitched MIDI clip gets a row, e.g. "Guitar riff: up a half step, F♯m → Gm".
  - The choices are Move, Keep, or per clip, and the result is one 'Change key' undo step.
  - Drum tracks never move (`trackRole`).
- **Each clip takes the nearest move** (up to 6 semitones either way), using `transposePart` (`src/curriculum/engine/parts/part.ts:273`). The chord lane follows, as `setRootNote` already re-derives it.
- **The clip menu** gains Transpose…, by semitones and octaves with the interval named, and Match song key.
- **An empty key** is filled by the first item with a key (1.16a).
  - Library items show their key and tempo.
  - The unused `midi-loop` drag payload's key and BPM (`src/daw/data/libraryItems.ts:12-31`) get used.
- **Pitched clips show their key** in the clip header, as Soundtrap's do ("Guitar Pattern 4 · F♯m"), so a key mismatch is visible before anything plays.
- **Interval names** link to Learn → Theory.
- **Audio clips don't move** (SD8). They don't follow tempo changes either; that's plan finding F7, owned by 1.11.

**4.7 Genre starters**

- **Starters per Learn → Style genre**, each built the way demos are: a full bundle opened as a copy, `setProjectId(null)` (`src/daw/data/demoSeed.ts:63-68`). Each one has:
  - a groove;
  - a progression from UNISON's library, voiced for the genre;
  - sections (4.4);
  - the key and tempo already set;
  - a label like "Reggaeton · B minor · 90 BPM" and a "Learn this style" link.
- **Where they appear:** 1.2b's launcher genre-pack tiles and the new-project flow. The 2.6 empty-project tiles link to them.

## Notes for existing milestones

Stage B leaves room for Stage D; Stage D builds into Stage B's files later.

- **2.3:** the Projects dialog has room for an Assignments group (4.2). The marker rename's `window.prompt` goes with 2.3's native-prompt removal.
- **2.5:** the Share menu has room for "Assign to a class…" (4.2). The top bar has room for the assignment strip and the review banner (4.1, 4.2).
- **2.6:**
  - The four empty-project tiles use goal wording, as Soundation does: Start with a beat (Grooves), Play an instrument (musical typing), Start from a genre (4.7), Add a track.
  - An assignment copy shows its brief instead of the tiles.
  - `AddTrackMenu`'s "Import" makes a MIDI track without opening a file (`src/daw/components/Mixer/AddTrackMenu.tsx`). Relabel it, or open Import MIDI.
- **2.7:** the toolbar's "+ Marker" leaves room for "+ Section" (4.4).
- **2.8:** the Inspector's tab strip has room for Comments (4.3).
- **3.3:** builds the Sections lane with 4.4.
- **3.6:** adds a "Duck to kick" one-click setting for the existing Sidechain, which picks the drum track with sensible amounts, plus a tempo-synced pump. The ducker stays missing from export until 1.11.
- **3.8:** Browser items show key, tempo and genre, with a key filter and "preview at song tempo". Each effect category gets a one-line purpose.
- **3.13:** no video calls (SD6). Remote cursors are optional here: their presence fields exist but are always `null` (`src/daw/collab/CollabProvider.tsx:572-584`).

## For the Teacher Office program (not built here)

- **P6** switches on the `atlas` kind; 4.2 adds module `studio` on top.
- **P7's** To-review queue includes turned-in Studio work.
- **P9** gains CSV roster import (none exists today), then Google Classroom import. Google Classroom needs:
  - the Classroom API scopes `classroom.courses.readonly`, `classroom.rosters.readonly` and `classroom.profile.emails`;
  - a server-side token exchange;
  - Google's sensitive-scope verification;
  - an under-13 policy;
  - students matched by email into pending or active enrollments.
- **Already at parity:** joining by code, link or QR with teacher approval.
- **Out of scope:** school accounts and per-teacher seats, which are a pricing decision.

## Stage D exit criteria

- **The loop, end to end** (on the mock API, then on staging once the API ships):
  - A teacher assigns a Studio template to part of a class.
  - Two student personas each open their own named copy, work in it and turn it in.
  - The teacher's list shows both with the right status, and opening one shows the turned-in copy read-only.
  - The teacher pins a comment on a clip at bar 9. The student sees it on the timeline and in the Comments tab, and resolves it.
  - The work appears in P7's To-review queue.
- **Safety:**
  - A student can't open another student's copy.
  - Review never writes a draft or a save.
  - Only project members see comments.
  - Leaving review keeps the teacher's own draft.
- **Sections:**
  - They survive refresh, cloud save and open, and two-client collab, with fixtures and the mixed-version collab check.
  - The Lead Sheet shows the same sections.
  - A song boot lays out its form.
- **Chords:**
  - In C major, A to J play I to vii° with the right labels.
  - In A minor they play the mode's chords.
  - A free student can use them, while Prism stays gated.
- **Key change:** going from F♯ minor to G minor lists each pitched MIDI clip as "up a half step", and one undo restores everything.
- **Nothing regresses:** the Stage A/B perf numbers hold, lessons pass with no new failures, and `verify:prod` passes.

## Verification

- **Every milestone:** the plan's fast tier: `npm run lint`, `npx vitest run`, `npm run studio:check`.
- **4.0, 4.2 and 4.3:**
  - contract tests against the mock;
  - two-persona browser runs: a teacher and two students, using `VITE_DEV_AUTH_BYPASS_ROLE` plus the new user override.
- **4.4:** the full tier, because it adds a document field. Add fixtures and the mixed-version collab run: the previous build on a second port plus `partykit dev`.
- **Teacher Office files:** that program's verification recipe and firewall suites (`docs/prompts/teacher-office-complete.md`).

## Risks

- **API dependency:** the contract comes first, then a mock and flags. The UI ships switched off until music-atlas-api lands.
- **Minors' data:**
  - Sharing is closed by default, with no public links to student work.
  - Teachers can moderate comments.
  - Retention when a student leaves needs a rule.
  - Google Classroom adds a data-processing review.
- **Two programs in the same files:** 4.2's classroom changes overlap Teacher Office P6/P7. Run 4.2 after P6, log in both STATUS files, and commit by pathspec.
- **Review must never write:** a test asserts that review saves nothing.
- **Collab rooms aren't ready for teachers** (plan findings F1–F3). A "viewer" connection can still edit, rejoining may duplicate tracks (unverified), and room storage is never cleaned up. 1.14 owns all three. They must close before any Stage D feature puts a teacher into a student's live room; 4.1's review never joins one.
- **Mixdown fidelity:** offline render misses SoundFont tracks, guitar/bass/vocal effects and the ducker until 1.11. That's why v1 reviews live (SD4).

## Sources

- Andrew Huang, "Web browser DAW has features the majors are missing!" — youtube.com/watch?v=GzA25xIl61M
- Soundation, "Get started with Soundation Education" — youtube.com/watch?v=eEDgKOzUjuA
- Soundation, "How to import classes from Google Classroom into Soundation Education" — youtube.com/watch?v=CWnjwdORALY
- Hands-on in Chrome, 2026-10-14: the Soundtrap studio (signed in) and the Soundation studio.
