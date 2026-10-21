# S13: Teaching features

**Goal:** the classroom loop works on the new frame: hand out, own copy, review/comment, grade. The owner kept these on 2026-10-21. The old plan is `29-D-teaching-features.md` in git at `487930ff`; treat its decisions as candidates, not as settled.

**Owner gate:** the sharing/comments API contract with Ryan's backend (old 4.0).

## Build

1. **Assignments:**
   - Teachers start from a project.
   - Each student gets their own copy (`kind:'atlas'`, `atlasRef.module:'studio'`).
   - An **Assignment pill** in the top bar shows the brief, the due date and Turn in.
2. **Review:**
   - Teachers open a student's copy read-only.
   - A **comments lane** under the ruler holds timeline-anchored comments (a server resource, not in the Y.Doc), and the **Review pill** in the top bar opens it.
3. **Class controls:** generation on/off per tool family, uploads on/off and quotas (S6, S8, S9), set from Teacher Office.
4. **Chord keys:** musical typing plays chords in the key. Free.
5. **Key change moves clips:** MIDI, plus audio after S7.
6. **Genre starters:** templates whose "Fits your song" Library rows are tuned for lessons.

## Verify

- vitest: the assignment model, comment anchors, class flags.
- Chrome with two profiles (teacher, student): hand out, edit, turn in, review with comments, generation turned off for the class.
