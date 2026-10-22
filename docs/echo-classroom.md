# Echo in the Classroom

Echo (`docs/echo-game.md`) played by a whole class, led by Atlas or by the teacher. This spec covers what the teacher and students see, how grading works in class, the timing across devices, and what the server needs.

Decisions from the owner, 2026-10-21:

- **Classes vary, so there are three setups.** In the first, the teacher presents and the students aren't on the app; this covers internet trouble and classes playing their own instruments. In the other two, students are connected on Chromebooks or iPads, either without keyboards (pads, touch, computer keys) or with MIDI keyboards. All three work on computers and touch screens.
- **Leader toggle: Atlas leads, or the teacher leads.**
- **What students see is set in the teacher's settings.** Every option in this spec is wanted.
- **Grading checks notes and timing, quantized.** A note within 50% of the subdivision counts as a success.

## The setups

### 1. Presenter mode: the teacher's screen only

For any class, with no student devices. Once Echo has loaded, it needs no internet: Atlas, the pads and the roll all run on the teacher's computer.

- The teacher chooses **Present to My Class** on Echo's setup screen, and Echo runs on the projector.
- The class answers however the teacher likes: singing, clapping, classroom instruments, or one student at the teacher's keyboard.
- **The teacher judges each echo** when the result pops up:
  - **Got It!** counts as a good echo: the streak, the round pips, the tempo ramp, and a hit on the Boss.
  - **Missed It** counts as a miss, and the next call is easier, as in solo Echo.
  - **Again** plays the same call again and counts nothing.
  - Keyboard shortcuts, for a teacher at the keyboard: **Y** (Got It!), **N** (Missed It), **R** (Again). They're clear of the home row, which plays the pads.
- If someone plays the answer on the teacher's device (a student called up to the keyboard), Echo grades it itself and shows the result, as solo Echo does.
- **The Boss** plays one call at a time in Presenter mode, so the teacher can judge each one. The Boss reacts to each judgment. Three Got Its win the fight, and two Missed Its lose it.
- **Make Your Song** works as in solo Echo. The teacher records the class's ideas as takes.
- There is no XP in Presenter mode. Nobody is signed in as the players.

### 2. Connected: students on their devices

Students join the class's live session on their own accounts, and Echo opens on a slide (an `echo` interaction; see Messages). The teacher's computer runs the round. Each student's device plays along, hears its student's answer, and grades it.

- **Input.** Pads (touch, mouse, or the computer's home-row keys), the on-screen piano, or a MIDI keyboard. The teacher's settings say which (see Teacher Settings).
  - MIDI keyboards work in Chrome on computers and Chromebooks. **iPad Safari has no Web MIDI**, so on iPads students play the pads or the on-screen piano.
  - Touch is first-class. The pads are made for fingers, several at once.
- **Sound.**
  - **Headphones (the default).** Each device plays Atlas's call, the count-in, the count-off and the groove in its student's headphones, along with the student's own notes. This is the easy, reliable setup: each device grades against its own clock.
  - **Room speaker.** The teacher's computer plays the call for the room, and student devices play only the student's own notes, quietly. Each device then needs to know when the room's beat lands, which is what **Tune In** is for (see Timing).
- **Teacher leads in connected mode** needs the room speaker, since the class hears the teacher play. The teacher's call is sent to every device during the count-off bar (see The Leader Toggle).

## The leader toggle

A switch on the teacher's screen in both setups: **Atlas Leads** or **I Lead**.

### Atlas leads

Atlas makes the calls, exactly as in solo Echo: the level's contours and rhythms, the count-in, the call, the count-off bar ("1, 2, Ready, Go!"), the answer, the final downbeat, then the result.

### The teacher leads

The teacher plays the call live, on a MIDI keyboard, the on-screen piano, the pads or the computer keys.

- The run is the same: count-in, **YOUR CALL** over the call bars (one bar for a melody, two for chords), the count-off, then the class's answer.
- **The call is quantized** to the level's grid (16ths, or eighths at Level 1), as Make Your Song's takes are.
- **Snapped to the key, by default.** A note outside the key moves to the nearest key note (Auto-Tune Melody's rule), so the pads can always answer. A teacher whose class plays keyboards can turn this off.
- **Chords.** The teacher plays chords in the two bars. Echo recognizes the key's six chords as a chord take does (`processTake`) and strikes them in the teacher's own rhythm.
- **The count-off shows the call.** Its scale degrees (or its chords) appear in the hub, and the roll shows the notes to play.
- **If the teacher plays nothing**, the round says "No call heard" and runs again.
- **The Boss is always Atlas.** It plays its own calls.

## Grading in class: quantized

Every note is right or wrong. A played note answers a note of the call when:

1. its pitch is right (for a chord, every note of the chord, in any octave); and
2. it lands **within half the call's subdivision** of the call's note, so it would round to that note's grid point.

**The call's subdivision** is the smallest step its rhythm needs: a quarter, an eighth or a 16th.

| The call's rhythm  | Subdivision | On time within | At 80 BPM | At 116 BPM |
| ------------------ | ----------- | -------------- | --------- | ---------- |
| Quarters only      | Quarter     | ± an eighth    | ±375 ms   | ±259 ms    |
| Eighths            | Eighth      | ± a 16th       | ±188 ms   | ±129 ms    |
| 16ths (Levels 2–3) | 16th        | ± a 32nd       | ±94 ms    | ±65 ms     |

- **The score** is the notes answered, less one for each extra note that answers nothing, over the notes asked. Mashing every pad doesn't pass.
- **A good echo** scores 70% or more, the series' mark. A 3-note call needs all three, a 4-note call three of four, and a 5-note call four of five.
- **Chords** are graded the same way, strike by strike, on the strikes Echo hears (`chordStrikes`).
- Solo Echo keeps its own grading (Music Literacy's 70% overall with timing at least 50%) unless the owner wants the quantized rule there too.

## Teacher settings: what students see

These live in the teacher's settings for the class's Echo, as a sheet opened from the teacher's screen. Defaults are in bold.

| Setting                            | Options                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Students play on                   | **Their choice** · Pads only · Keyboard only                                              |
| Sound                              | **Headphones** (each device plays the call) · Room speaker                                |
| After each round, students see     | **Their own result** · Nothing                                                            |
| On their screens during the call   | **The pads light** (Simon) · No lights (ears only)                                        |
| Students see the class's progress  | **On** (the Boss's health, the class score) · Off                                         |
| The projector shows                | **The class only** (no names) · A first-name leaderboard · The live grid with first names |
| Snap the teacher's call to the key | **On** · Off                                                                              |
| Grading                            | **Quantized** (above) · Off (just for fun: every echo counts)                             |

- **Names on the projector are always the teacher's deliberate choice.** The projector shows no names by default, matching the classroom's existing no-names rule for the projector, like a featured showcase.
- The settings are saved per classroom on the teacher's account, and Presenter mode uses the same sheet (the options that apply to it).

## The teacher's screen (connected)

- **The control strip.**
  - Start and Pause/Play.
  - Next Round, and Again (the same call once more).
  - The leader toggle.
  - Melody, Chords or the Boss.
  - The level, the key and the tempo.
  - Students joined: 24 of 27.
- **The live grid.** A row per student and a column per round: ✓ good, ✗ missed, – no answer, ○ not joined. The row ends with the student's percentage and best streak. A student's row opens their last answer: what Atlas asked and what they played, early or late note by note.
- **The class result**, after each round: "21 of 24 echoed it!", with the notes the class missed most.
- **The Boss, as a class.** Each call, the class's share of good echoes hits the Boss: 70% of the class or more is a hit. Three hits win.

## The projector (connected)

- The circle and hub (Get Ready, Listen, the count-off, Your Turn) at full size, lighting as Atlas or the teacher plays.
- After each round: the class result ("21 of 24!") and, from the Boss on, the Boss and its health.
- Names only if the teacher allows them (Teacher Settings).

## The student's screen (connected)

- Echo's play screen in the session's frame. The circle, the hub's cues, and their pads or keys.
- Waiting for the teacher: "Waiting for your teacher…" between rounds.
- After each round, their own result if the teacher allows it.
- The class's progress (the Boss, the class score) if the teacher allows it.
- Locked or paused by the teacher: the session's lock screen.

## Timing across devices

**With headphones, nothing needs to be exact.** Each device runs its own round, call and answer, on its own audio clock, so its grading is exact. The rounds only need to start together, within about a tenth of a second, so the class plays as one.

- **The start.** The teacher's computer sends each round with a start time on the server's clock, about two seconds ahead, so slow devices are ready in time.
- **The clock check.** Each device learns its offset from the server's clock: the session's `ping`/`pong` already returns the server's time. It pings five times on joining (the median offset) and again every 30 seconds. With the round's start converted to its own clock, the device schedules the run on its audio transport.

**With the room speaker, each device must hear the room's beat.** Network clocks are good to about 20–50 ms, but the teacher's speaker adds its own delay (Bluetooth: 150–250 ms), which no clock can know. **Tune In** measures it:

- At the start of the session, the teacher's computer plays eight clicks through the room speaker, and every student taps along on a pad or key.
- Each device takes the median of its taps against when the clicks were sent, and keeps that as its offset. It covers the speaker, the network and the student's own reaction.
- "You're tuned in!" A device whose taps scatter too widely asks its student to try again.
- The teacher can run Tune In again at any time, for example after changing speakers.

**The teacher's live call** reaches students during the count-off bar. That bar is 2.5 s at 96 BPM, and the call has to arrive before the class's answer starts. A call that arrives late cancels the round on that device ("Missed the call — next one!") rather than grading against a guess.

## Messages (for Ryan and Aaron)

All of these ride the session's existing envelope (`sessionsStore.ts` `SessionMessage`, `v: 1`) and the PartyKit `classroom_session` party (`src/daw/collab/server/classroom_session/party.ts`).

1. **`SessionState.echo`: the round, for all roles.** Teacher-authored, carried through the merged state PATCH like `timer` and `media`, and fanned out to teacher, students and projector. It carries no identifiers.

   ```ts
   interface SessionEcho {
     slideId: string;
     run: number; // goes up by one each round
     section: 'melodyEcho' | 'chordEcho' | 'boss';
     leader: 'atlas' | 'teacher';
     level: 1 | 2 | 3;
     key: { tonic: string; mode: 'major' | 'minor' };
     tempo: number; // BPM
     startsAt: number; // the round's count-in, epoch ms, server clock
     call: EchoCallWire | null; // Atlas's call; null while the teacher is to play one
     paused: boolean;
     settings: EchoClassSettings; // Teacher Settings, above
     classResult?: {
       run: number;
       good: number;
       answered: number;
       joined: number;
       boss?: { hits: number; misses: number };
     };
   }
   ```

   - `EchoCallWire` is the call as data: its notes (or chord strikes) in ticks, degrees and labels, small enough to send whole, so every device plays exactly the same call. A seed would also work, but would tie every device to the same app version.
   - `classResult` is computed on the teacher's computer from the identified results it receives, and published as counts only. That is how the projector gets the class's numbers without names.

2. **The teacher's call: `echoCall`, teacher → all, fast.** `{ type: 'echoCall', run, call }`, sent the moment the teacher's call bars end. It has to reach students within a second.

   - **Proposed:** the party accepts this one message type over the socket from the **teacher role only**, and fans it out to all roles. That mirrors how `position` is accepted from students. We can write the party side here; the API needs no part in it.
   - Alternatively, the API relays the state PATCH within ~300 ms.

3. **A student's result: a `response` with `payload.kind: 'echo'`, teacher only.** One payload per student per Echo interaction, upserted (the existing rule), holding every round so far:

   ```ts
   { kind: 'echo'; slideId: string; rounds: { run: number; passed: boolean; score: number; asked: string[]; played: string[]; timing?: (number | null)[] }[]; bestStreak: number; tunedInMs?: number }
   ```

   - `timing` (added in step 2) is each asked note's ms early (−) or late (+), null where it was missed.

   - It's written once a round, about every 10 seconds, well inside the 100-a-minute limit.
   - It's never sent to the projector or to other students (Rule 2: `shareable: false`).

4. **The `echo` interaction type.** It joins `InteractionType` and its slide kind, so a deck can hold "Echo (class)". It's set up with the starting level, key, leader and the Teacher Settings, and renders inside the live session page on student devices. It doesn't open a new tab, so the round stays on the session's socket.

## What we need from the server (Ryan)

1. **Live sessions on, cross-device.** Turn on session discovery, session join and session state v2 (`SERVER_LIVE_SESSIONS_ENABLED`, `SERVER_SESSION_JOIN_ENABLED`, `SERVER_SESSION_STATE_V2_ENABLED` in `src/constants/serverEndpoints.ts`). Deploy the `classroom_session` party (`VITE_PARTYKIT_HOST`) with the API → party webhook. Echo rides on all of this.
2. **`SessionState.echo`** in the state contract, persisted and relayed like `timer` and `media`. The party's side is written: its `route()` relays `{ type: 'echo', echo }` to every role. The client sends `echo` in the merged state PATCH once a session has one.
3. **`payload.kind: 'echo'`** accepted by `POST …/responses`, upserted per student and interaction. Also kept per account for the student's record.
4. **`echoCall`** accepted from the teacher's socket and fanned out to all roles: a party change, written here, deployed with the party.
5. **Nothing new for the clock.** The party's `pong` already returns the server's time.
6. **XP.** The class rounds use the Arcade XP events already asked for (`echo_round_passed`, …), once a round per student, under the daily cap.

## Build order

1. **Presenter mode.** Client only, so it works now. It covers the leader toggle and the teacher's judging, and it's the setup for classes without devices or internet. **Built.**
2. **Connected, Atlas leading, with headphones.** **Built on the client** (2026-10-21; see Step 2, As Built). This adds:
   - the `echo` interaction;
   - the teacher's strip and grid;
   - the student's screen and the projector;
   - quantized grading;
   - the Teacher Settings;
   - the clock check.
     It's built and tested against the session's local mock, plus a dev page that simulates a class of students on one computer. It goes live across devices when the server pieces above land.
3. **The teacher leads when connected, and the room speaker.** The `echoCall` fast path, and Tune In.

## Step 2, As Built

Connected, Atlas leading, with headphones, built against the session's local mock and a dev page that runs a class on one computer. It goes live across devices when the server pieces above land; nothing in `serverEndpoints.ts` was turned on.

### Where It Lives

| Piece                         | Where                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The call as wire data         | `src/curriculum/engine/echo/wire.ts` (`toEchoCallWire`, `fromEchoCallWire`)                                                                                          |
| The shapes                    | `src/features/classroom/echo/types.ts` (`SessionEcho`, `EchoClassSettings`, `EchoResponsePayload`, `EchoInteractionConfig`)                                          |
| The rules of a class's rounds | `src/features/classroom/echo/classRound.ts`                                                                                                                          |
| The teacher's computer        | `useEchoClassTeacher.ts`, `EchoTeacherPanel.tsx`, `EchoTeacherSettingsSheet.tsx`, `classSettings.ts`                                                                 |
| A student's device            | `useEchoClassStudent.ts`, `EchoClassStudent.tsx`                                                                                                                     |
| The projector                 | `EchoProjectorView.tsx`; the round drawn off the clock by `src/components/Games/Echo/useClockRun.ts`                                                                 |
| The clock check               | `src/features/classroom/live/serverClock.ts`, `useServerClock.ts`, run by `useSessionSync.ts`                                                                        |
| The protocol                  | `sessionsStore.ts` (`SessionState.echo`, the `echo` body and socket message), `sessionSocketController.ts` (`sendEcho`, `sendPing`, `onPong`), the party's `route()` |
| The dev page                  | `/dev/echo/classroom`: `src/features/classroom/echo/dev/` (the in-memory bus, the pretend class, the page)                                                           |

The Echo files above without a path are in `src/features/classroom/echo/`. The teacher's panel, the student's screen and the projector's view load in their own chunks, only when an Echo slide is shown.

### How It Runs

- **The slide.** An Echo slide is an `interaction` slide holding one `echo` interaction; no new slide kind was needed. The deck editor's Responses picker and the interaction editor offer **Echo (class)**, set up with its level and key. Publishing copies its setup field by field, and it's never shareable.
- **The lobby.** When the teacher opens the slide, their computer publishes the setup (run 0, no call), so every device shows the right pads and settings before the first round.
- **A round.** One call: count-in, Atlas's call, the count-off, the answer, the final downbeat. The Boss plays one call a round too, so the class's result hits it after each. Atlas makes the calls with the engine (`roundCall`, `bossCalls`) from a seed per session and slide, each round from its own run number, so a reloaded teacher's page makes the same calls.
- **The start.** Two seconds ahead on the server's clock. Each device turns it into its own time with the clock check and schedules its run for then (`useEchoRun`'s `at`, `startLiteracyRun`'s `startsAtMs`, Tone's look-ahead taken off). A device more than half a second late sits the round out: "Join in on the next round."
- **The student's tap.** The first tap, **Join In**, turns the sound on. iPad Safari plays nothing without one.
- **The grade.** Each device grades its own echo, quantized (`gradeQuantizedEcho`), and posts its cumulative `echo` response once its run ends. Grading Off counts every echo with notes in it.
- **The class's result.** The teacher's computer counts it 1.5 seconds after the round's end (time for answers to arrive), publishes the counts, and counts again if late answers change them. A Boss verdict stands as it was called.
- **What comes next.** After the result has shown 3.5 seconds, the next round, unless paused. A section stops after its rounds (Melody Echo 8, Chord Echo 6, as solo Echo) for the teacher to pick what's next or keep going. The Boss stops when it's decided.
- **Pause and Play.** Pause stops every device. Play plays the same call again from its count-in, as a new round; a round already counted goes on to the next.
- **The projector and the teacher's circle** are drawn off the clock, silent: the same cues as a student's run, with no sound and no tap needed.

### Decisions Where the Spec Was Open

- **"21 of 24 echoed it!" is good echoes of the students who played anything.** That's also the Boss's rule: 70% of those who answered, or more, is a hit. Three hits win and two misses lose, so the four calls always decide it.
- **Who's joined** is the session's presence (teacher-only). A practice session has none, so there a student who has played counts as joined.
- **No easier call after a miss in class.** Solo Echo's forgiving rule stays solo; the teacher sets the level.
- **First names on the projector** ride `SessionEcho.names`, first names only and no ids, and only when the teacher picks the leaderboard or the live grid. Like a featured showcase, it's a deliberate share: it fans out to every role, students included, as the projector shows it to the room.
- **The response's note-by-note timing.** A round carries an optional `timing`: each asked note's ms early or late, null where missed (a chord call by bar, its first strike answered). The teacher's grid opens a student's last answer with it, and the class result names the notes the class missed most.
- **The state PATCH carries `echo` only once a session has one.** A session that never plays Echo sends the PATCH it always has, so a server without `echo` in its contract yet takes every other send.
- **The Teacher Settings are saved on the teacher's computer, per classroom,** in localStorage (`echo_class_settings:v1:<classroomId>`), until the account has a place for them. A classroom's saved settings win over an Echo slide's own.
- **Waiting for step 3:** the Room Speaker sound (it needs Tune In) and I Lead show in the strip and the sheet but can't be chosen yet. Snap My Calls is saved for when the teacher leads.
- **The wire format** sends the call whole: a melody's notes, contour and rhythm; a chord call's strikes, its chords by bar and each voicing once. It carries `wire: 1`, and a device reads anything malformed as no call.

### The Dev Page

`/dev/echo/classroom` (development only) puts the teacher's panel, the projector, a student (you, in this browser's audio) and a pretend class side by side on an in-memory bus, in the session's own message shapes through the store's own gate and reducer. The pretend students answer every call with their own timing spread and slips, sit a round out now and then, and run the clock check against their own skewed clocks. `?students=8&level=1&tonic=C&mode=major&projector=class&you=1` sets the class.

### Still to Come

- **Present mode** shows the slide, not the Echo circle. The teacher's panel keeps running behind it, so the rounds go on.
- **Locking devices** unmounts the student's screen, so after Unlock each student taps Join In again.
- **XP** for class rounds isn't sent (see What we need from the server, 6).
- **The teacher's settings** live on the teacher's computer until the account can keep them.

## Open questions

- Should solo Echo use the quantized grading too, so class and solo agree?
- Should students earn XP for class rounds, and how much, next to solo Echo's 10 a good echo?
- Should a teacher's own calls be kept, to replay, to reuse next class, or to share with other teachers?
