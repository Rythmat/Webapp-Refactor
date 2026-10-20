# Echo: the call-and-response creation game

Echo is the Arcade game at the end of the beginner Start Here path (stop 5, "Play Echo in the Arcade"). Atlas plays a short phrase and the student echoes it. Then the student beats the Echo Boss and builds a song of their own with a band. It is free, like the rest of the path.

It is made for two players at once:

- **The absolute beginner.** Simon-style color pads, lights, and theory learned without being taught.
- **The student finishing Music Literacy.** A piano keyboard with the roll, staff and cascade views they already know.

Design shaped with the owner on 2026-10-20.

## The flow

1. **Set up.** Pick a color (the key), major or minor, and a level.
2. **Melody Echo.** Atlas plays a 2-bar melody (the call) and the student echoes it (the response).
3. **Chord Echo.** The same with chords.
4. **The Final Boss.** Four calls back to back, alternating melody and chords, using the hardest rhythms (flashcard Tier 4).
   - It plays at the highest tempo the student reached in the game.
   - The boss has a health bar that drops with each good echo.
   - Three good echoes of four win. Losing retries only the Boss, not the level.
   - The fight is won at the third good echo and lost at the second miss.
5. **The gate.** "You beat the Echo Boss!" A celebration and a stats screen:
   - XP earned in the game;
   - the success rate for each section (Melody Echo, Chord Echo, Boss);
   - the best streak.
6. **Make Your Song.**
   - Choose a Band and its groove (the Band's L1, L2 and L3 variations).
   - A mini-Studio opens: the Melody and Chords tracks on top, the band's own tracks below, laid out vertically.
   - Record a take, hear it back with its notes shown, then **Use That Take** (it goes into its track's timeline) or **Try Another Take**.
   - Chords are recorded first by default, so the band can play them. The Melody and Chords tracks are clickable, so either can be recorded or re-recorded at any time.
   - The band follows the student's chords as soon as a chord take is used (the Practice with a Band engine).
7. **Listen, Edit, Finish.** Once both tracks have a take, a pop-up offers:
   - **Listen** plays the song again.
   - **Edit** re-records either track and changes the band or its groove.
   - **Finish** leads to the victory.
8. **Victory.** A celebration screen with **Play Again**, **Next Level!** and **Take Your Song To The Studio!** The last opens the full Studio on the song: Melody, Chords and the band's tracks, in the student's key and tempo.

Throughout the echo sections a **running streak** counts good echoes in a row. The best streak per level is the student's **High Score**.

## Levels

|                   | Level 1                          | Level 2    | Level 3    |
| ----------------- | -------------------------------- | ---------- | ---------- |
| Melody contours   | Tier 1                           | + Tier 2   | + Tier 3   |
| Zero points       | 1                                | 1, 3, 5    | 1, 3, 5    |
| Rhythm flashcards | Tier 1                           | + Tier 2   | + Tier 3   |
| Boss rhythms      | Tier 4                           | Tier 4     | Tier 4     |
| Calls             | 2 bars                           | 2 bars     | 2 bars     |
| Tempo             | 80 to 96                         | 90 to 106  | 100 to 116 |
| The song          | 2-bar melody and progression, ×4 | 4 bars, ×2 | 8 bars, ×1 |

- **Calls stay 2 bars long at every level**, so echoing stays doable.
- **Songs grow by putting phrases together.** That teaches repetition and structure: question and answer at Level 2, and AABA-style choices at Level 3.
- **Levels unlock in order.** Next Level! opens the following one.

### Tempo

- **Each level starts at its base:** 80, 90 and 100 (`echoLevel(level).tempo`).
- **It climbs as the student does well** (`nextEchoTempo`, in `tempo.ts`):
  - up 4 BPM after every 2 good echoes in a row;
  - down 4 after a miss;
  - never below the base, nor more than 16 above it.
- It changes only between calls, never during one. A call carries its tempo, and its run and grading are laid out at it.
- **The boss** plays all four calls at the highest tempo reached in the game (`echoBossTempo`). Its echoes don't move the ramp, so a retry plays at the same tempo.

## The calls

### Melody calls: contours × rhythm flashcards

**Contours.** From the Melody Contour Library (0-based; source: `Melody_Contour_Library_0based.csv`, 690 contours with note count, tier and tag).

- Echo uses a curated **starter set of about three dozen**, roughly 12 per level, favoring `common` shapes with a variety of motion: rising, falling, arches, valleys, repeated notes.
- The set lives as app data and gets a back-office page later.
  - It is `src/curriculum/data/echo/echoContours.json`, with its selection rules written in it.
  - Level 1 takes Tier 1 `common`, Level 2 Tier 2 `common`, Level 3 Tier 3 (`uncommon`: the tier has no `common`). Each level has four of 3 notes, five of 4 and three of 5, and every motion.
  - A contour's id is its values (`"0,-1,2"`), so re-importing the library keeps them (`scripts/echo/importContours.mjs`).
- **The pad window.** Every call stays between the 5 below the 1 and the 7 above it: scale positions −3 to 6, ten pads.
  - Each contour fits it at its level's zero points.
  - An earlier level's contour goes only on the zero points that keep it inside (Level 1's 1 2 3 4 5 run never goes on the 5).
  - A level's calls take one of its own contours half the time, an earlier level's the rest.
- **The zero point shifts every value, negatives included.** A contour value is a scale position counted from the zero point. In C major, `[-1, 0, 1]` is B C D on 1, D E F on 3, and F G A on 5.
- Zero points are only 1, 3 and 5 (scale positions 0, 2 and 4).
- **A position resolves through the scale** as `scale[p mod n] + 12 × floor(p / n)` above the tonic, for a scale of `n` notes. So −1 is the 7th below and 7 is the octave.
- **Register:** calls sit on the treble staff with the fewest ledger lines, following the Music Literacy register rule (`placeMelody`). It places everything a level's calls reach in the key at once, so the 1 stays in one octave for the whole level and a pad always plays the pitch Atlas played.
- With about 36 contours × 3 zero points × 24 keys, times the rhythms, there are thousands of distinct calls.

**Rhythms.** Built one beat at a time from the 25 one-beat rhythm flashcards (source: ICP Studio's `RHYTHM-FLASHCARDS.md`; each card is a quarter-note beat on a 16th grid).

| Tier | Cards                                  |
| ---- | -------------------------------------- |
| 1    | quarters and eighths, with their rests |
| 2    | sixteenths                             |
| 3    | sixteenth rests                        |
| 4    | dotted and syncopated                  |

- A melody call picks cards so its notes match the contour's note count.
- **Musical rules:** the first note on beat 1, and a breath (at least a beat of rest) before the response.
  - The call's last beat is a quarter rest, so nothing rings into the response.
  - Its last note starts in bar 2, and no more than two silent beats come between notes.
  - A silent beat is always the quarter rest: the three all-rest cards sound the same.
  - Rhythms that hold together are likelier. Each silent beat between notes halves a rhythm's chance, and a note on bar 2's downbeat doubles it.
  - Every boss call has a Tier 4 card.

### Chord calls

- **The chords.** The 6 diatonic chords of the mode, with no diminished chords:

  - in major: 1 maj, 2 min, 3 min, 4 maj, 5 maj, 6 min;
  - in minor: 1 min, ♭3 maj, 4 min, 5 min, ♭6 maj, ♭7 maj.

  No contours.

- **Which two.** Two different chords, a bar each. At Level 1 the call starts on the 1 chord, home; from Level 2 it may start on any of the six.
- **Voicing.** As in Music Literacy's Melodies and Chords: the fewest ledger lines, and roots never moving more than a 4th between chords (`voiceChords`).
- **Rhythm.** One flashcard rhythm per bar, repeated, as Melodies and Chords' chord progressions do.
  - The bar's card is struck on each of its beats.
  - The first bar's card starts on the beat, and the call's last beat is a breath, as in a melody call.
  - Any card with a note: no more than 4 strikes a beat. Chords a 16th apart are heard as two (see Grading), so the 16ths (Tier 2) come in from Level 2, and the boss's chord calls have all of Tier 4.

### Grading

- **Melody echoes** use Music Literacy's grading (`gradeResponse`): a pass is 70% overall with timing at least 50%.
- **Chord echoes** are graded as its chord grading grades them (`gradeChordResponse`: the same pairing, scores and pass rule), on the strikes Echo hears.
- **Fast chord recognition** (`strikes.ts`). Played notes are grouped into chord strikes by onset:
  - Notes within a short spread of a strike's first note are one strike: a rolled chord, uneven fingers.
  - Notes further apart are separate strikes, even a 16th apart.
  - The spread follows the tempo: the smaller of 60 ms and 40% of a 16th. That is 38 ticks at 80 BPM and 48 from 100 to 116, so a 16th (120 ticks) is always 2.5 spreads at least. (Music Literacy joins notes within 100 ticks, which would run 16th chords together.)
  - A roll slower than the spread still makes one chord when its pieces only make a chord together, within three quarters of a 16th. A strike that is a chord on its own is never joined to another.
  - A chord held while it is struck again is two strikes. A key pressed twice within the spread is one note. A key let go and pressed again later strikes again.
  - Notes still held from an earlier strike can complete a chord: a root and fifth held, the third struck again, is the chord struck again. A held note outside the chord costs nothing.
- A call's run is a bar of count-in, the call, then the response. The boss's four calls run back to back after one count-in.

## Input and views

- **Pads, the default at Level 1:**
  - **Melody pads** are the scale degrees the level's calls use, in the key's colors. They light as Atlas plays and as the student answers.
    - Level 1 has eight, from the 5 below the 1 to the 5 above. From Level 2 there are ten, the whole pad window.
    - Each pad wears its note's color on the circle in the key's mode, as Part 2's chooser colors a chord by its root. So the 1's pad is the key's own color.
  - **Chord pads** are the six diatonic chords. One tap plays the voiced chord.
    - Each is voiced on its own (the fewest ledger lines) and colored by its root.
  - Touch first.
- **Keyboard, the default from Level 2 and a switch at any level:**
  - an on-screen piano, the computer keys (Typing) or a MIDI keyboard;
  - the roll / staff / cascade view switch;
  - the Call band and the shining Response band, as in the Music Literacy player;
  - in chord sections, the student plays the chord and the game recognizes it.

## The play screens

What the screens do where the design left a choice (`src/components/Games/Echo/`).

- **Rounds.** Melody Echo is 8 rounds and Chord Echo 6 (`MELODY_ECHO_ROUNDS`, `CHORD_ECHO_ROUNDS` in `echoFlow.ts`). Each round is a bar of count-in, Atlas's call, then the student's bars. Its result shows for a moment (a good echo or a miss, what Atlas played and what the student played), then the next call comes.
- **The hub's cues, in an echo's order.** GET READY over the count-in, LISTEN over Atlas's call, GO! on its last beat and the answer's first, then YOUR TURN. A lesson says LISTEN first because it sings its words first; Echo has no words, and the call is the thing to hear.
- **Forgiving: after a miss, the next call is easier.**
  - A melody call takes a three-note contour from Level 1's set (its shortest shapes: 1 2 3, 3 2 1, 1 2 1, 1 7 1), on the 1, in Level 1's rhythms. It's placed in the level's own register, so it lands on the level's pads.
  - A chord call goes home to the 1 chord and out to the 4 or the 5, in Level 1's rhythms.
  - Only the one call after a miss is easier: a good echo brings the level's own calls back. The Final Boss is never made easier.
- **The tempo climbs.** A game starts at its level's tempo. It rises 4 BPM after every 2 good echoes in a row and falls 4 after a miss, from the level's tempo to 16 above it. It changes only between calls. The Boss plays at the highest tempo the game reached. A speed meter beside the streak shows the BPM and the climb.
- **The Boss ends when it's decided.** The fight stops at the third good echo (won) or the second miss (lost), without playing its last call. A loss offers **Try the Boss again**: four new calls, the Boss alone.
- **The streak** runs across all three sections, and the best streak is the level's High Score, saved as soon as it's beaten.
- **Pause.** The pause button, or opening Game Settings while the music plays, stops the run. Resume plays the same call again from its count-in; a paused Boss picks up at the call it was on.
- **The drum groove** is the one the student picked for Music Literacy (Settings → Play along), or Pop 01. Over the drums the click stops after the count-in, as in a lesson.
- **The gate** awards the existing Arcade XP once per game, and shows the XP the game earned (10 a good echo, 50 for the Boss).
- **Finishing the song** (Make Your Song's Finish) completes the level: the next level opens, Start Here's Echo stop is done, and the song's 25 XP is counted.

## Takes

- A take is quantized to 16th notes, as Music Literacy's create rounds are.
- Its length is the level's phrase: 2, 4 or 8 bars.
  - Notes outside the phrase are left out, and one ringing past its end stops there. So a take is always its phrase, with or without Auto Fill.
  - A melody note lasts no longer than the next one starts.
- A chords take hears its strikes as a chord echo does, at the take's tempo. It recognizes the key's six chords as the chord grader hears them: every note of the chord, in any octave or order. Of two (C E G A), it takes the one rooted on the lowest note. Anything else is left out, and the student is told.
- The song repeats it to fill: ×4, ×2 or ×1.
- **The band follows every chord change**, more than once a bar if the take does (`chordChanges`):
  - with Auto Fill, on the bar lines (the half bars at Level 3);
  - without it, where the take puts them, on its 16ths.
  - A chord sounds until the next change, held or not. A chord struck again changes nothing.
  - Each change has its degree, label and chord symbol in the student's key ("Bb", as `chordSymbolTones` reads it). `chordAtTick` finds the chord sounding at a tick.
  - Until there is a chords take, the band plays the 1 chord.
- **The chart** is still a chord a bar, for whatever needs one: the chord sounding longest in the bar.
  - A bar changing at its half bar gives its first chord.
  - A bar with no change keeps the chord sounding into it.

### Scaffolding (Game Settings, all OFF by default)

These help a beginner who wants to create and have fun. They are off by default because they can encourage random button pressing, which is the opposite of learning.

- **Auto-Tune Melody.** Played notes snap to the nearest note in the key.
  - Every note outside a major or minor scale sits between two of its notes. It goes to the one in the key's 1 chord (1, 3 or 5), else the lower.
  - In a chords take it tunes the notes before the chord is recognized.
- **Roots Only Chords.** Play one note and get its diatonic chord. With Auto-Tune Melody also on, that root is auto-tuned first.
  - The lowest note struck is the root.
  - The 7 in major and the 2 in minor make no chord, since theirs is diminished.
- **Auto Fill Bars.** Keeps a take "in the lines":
  - chord changes snap to the bar line (or the half bar at Level 3), and each chord lasts until the next one;
  - melody notes snap to the level's grid, and the take is trimmed or padded to the phrase length.
  - A change played late still lands in its bar. One in the last quarter before a bar line lands on that line.
  - The level's grid is an eighth at Level 1 and a 16th from Level 2.

## XP and High Scores: what the server needs (for Ryan)

Today the Arcade sends `POST /api/experience/arcade` with no body. The server awards a fixed amount under a daily cap (`remainingArcadeCapToday`). Echo needs two additions.

1. **XP by event.** Let the award take a body such as `{ game: 'echo', event, level, idempotencyKey }`.
   - The events are `echo_round_passed`, `echo_boss_defeated` and `echo_song_finished`.
   - The server decides how much each is worth and keeps the daily cap.
   - Until then, the stats screen shows the XP earned in the game, and the existing award fires once per finished game.
   - The stats screen counts 10 XP a good echo, 50 for beating the boss and 25 for finishing the song.
2. **High Scores per account.** Somewhere to save and read a student's best streak (and the stats screen's numbers) per game and level, for example `GET/PUT /api/arcade/scores?game=echo&level=1`. Until then, High Scores are kept on the device.

These sit beside the planned per-account Music Literacy progress (`docs/music-literacy-content-kind.md`).

## Later

- **Classroom: the teacher leads.** The teacher launches Echo from a slide; students join on their own logged-in devices.
  - The teacher plays the calls (or lets Atlas), and the class hears them from the room's speakers.
  - Each student's device grades their echo against the shared beat and the call's notes.
  - A live grid shows the teacher every student, round by round.
  - It builds on the classroom live sessions and slide launches the app already has.
- **Atlas answers.** When the student leads, Atlas replies with a musical answer instead of copying.
- **Singing** the echo into the microphone.
- **Chain mode.** Classic Simon: each call adds a note, until a miss.
