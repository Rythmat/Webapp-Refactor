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
   - The boss has a health bar that drops with each good echo.
   - Three good echoes of four win. Losing retries only the Boss, not the level.
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
| The song          | 2-bar melody and progression, ×4 | 4 bars, ×2 | 8 bars, ×1 |

- **Calls stay 2 bars long at every level**, so echoing stays doable.
- **Songs grow by putting phrases together.** That teaches repetition and structure: question and answer at Level 2, and AABA-style choices at Level 3.
- **Levels unlock in order.** Next Level! opens the following one.

## The calls

### Melody calls: contours × rhythm flashcards

**Contours.** From the Melody Contour Library (0-based; source: `Melody_Contour_Library_0based.csv`, 690 contours with note count, tier and tag).

- Echo uses a curated **starter set of about three dozen**, roughly 12 per level, favoring `common` shapes with a variety of motion: rising, falling, arches, valleys, repeated notes.
- The set lives as app data and gets a back-office page later.
- **The zero point shifts every value, negatives included.** A contour value is a scale position counted from the zero point. In C major, `[-1, 0, 1]` is B C D on 1, D E F on 3, and F G A on 5.
- Zero points are only 1, 3 and 5 (scale positions 0, 2 and 4).
- **A position resolves through the scale** as `scale[p mod n] + 12 × floor(p / n)` above the tonic, for a scale of `n` notes. So −1 is the 7th below and 7 is the octave.
- **Register:** calls sit on the treble staff with the fewest ledger lines, following the Music Literacy register rule (`placeMelody`).
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

### Chord calls

- **The chords.** The 6 diatonic chords of the mode, with no diminished chords:

  - in major: 1 maj, 2 min, 3 min, 4 maj, 5 maj, 6 min;
  - in minor: 1 min, ♭3 maj, 4 min, 5 min, ♭6 maj, ♭7 maj.

  No contours.

- **Voicing.** As in Music Literacy's Melodies and Chords: the fewest ledger lines, and roots never moving more than a 4th between chords (`voiceChords`).
- **Rhythm.** One flashcard rhythm per bar, repeated, as Melodies and Chords' chord progressions do.

### Grading

- **Melody echoes** use Music Literacy's grading (`gradeResponse`): a pass is 70% overall with timing at least 50%.
- **Chord echoes** use its chord grading (`gradeChordResponse`).

## Input and views

- **Pads, the default at Level 1:**
  - **Melody pads** are the scale degrees the level's calls use, in the key's colors. They light as Atlas plays and as the student answers.
  - **Chord pads** are the six diatonic chords. One tap plays the voiced chord.
  - Touch first.
- **Keyboard, the default from Level 2 and a switch at any level:**
  - an on-screen piano, the computer keys (Typing) or a MIDI keyboard;
  - the roll / staff / cascade view switch;
  - the Call band and the shining Response band, as in the Music Literacy player;
  - in chord sections, the student plays the chord and the game recognizes it.

## Takes

- A take is quantized to 16th notes, as Music Literacy's create rounds are.
- Its length is the level's phrase: 2, 4 or 8 bars.
- The song repeats it to fill: ×4, ×2 or ×1.

### Scaffolding (Game Settings, all OFF by default)

These help a beginner who wants to create and have fun. They are off by default because they can encourage random button pressing, which is the opposite of learning.

- **Auto-Tune Melody.** Played notes snap to the nearest note in the key.
- **Roots Only Chords.** Play one note and get its diatonic chord. With Auto-Tune Melody also on, that root is auto-tuned first.
- **Auto Fill Bars.** Keeps a take "in the lines":
  - chord changes snap to the bar line (or the half bar at Level 3), and each chord lasts until the next one;
  - melody notes snap to the level's grid, and the take is trimmed or padded to the phrase length.

## XP and High Scores: what the server needs (for Ryan)

Today the Arcade sends `POST /api/experience/arcade` with no body. The server awards a fixed amount under a daily cap (`remainingArcadeCapToday`). Echo needs two additions.

1. **XP by event.** Let the award take a body such as `{ game: 'echo', event, level, idempotencyKey }`.
   - The events are `echo_round_passed`, `echo_boss_defeated` and `echo_song_finished`.
   - The server decides how much each is worth and keeps the daily cap.
   - Until then, the stats screen shows the XP earned in the game, and the existing award fires once per finished game.
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
