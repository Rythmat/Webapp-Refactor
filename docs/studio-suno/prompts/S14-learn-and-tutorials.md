# S14: Learn mode, tutorials and courses

**Goal:**

- **Learn mode** hover cards on every control [s38, s39], on by default for students.
- The Studio tutorials re-anchored to the new frame.
- The courses rebuilt.

**Read first:**

- `../anatomy.md` §11;
- `shell/help/HintLine.tsx`, `hintSource.ts`, `ShortcutSheet.tsx`;
- `components/Tutorial/` (`tutorials.ts`, the engine, `check(s, armed)`);
- the lessons-v2 design in git at `487930ff` (`docs/prompts/studio-overhaul/reference/lessons-v2.md`), as a candidate source.

## Build

1. **Learn cards:**
   - Each card has a title, **one plain sentence of purpose** (our copy, written for students) and shortcut rows taken from the command registry.
   - On by default for students; the Learn pill toggles it; a first-run card explains it.
   - Every interactive control gets a `learn` entry. A test fails if one is missing.
2. **Tutorials:**
   - Re-anchor the 8 lessons to the new regions; anchors stay on containers only.
   - Fix every anchor failure listed in S2–S12 STATUS entries.
   - The coach card docks to the Learn system.
3. **Courses:**
   - Rebuild the beats and sound-design courses on the new surfaces, using prompt-bar steps where they teach (for example "ask for a bass line, then fix one note yourself").
   - Effect Learn pages (S5) are linked from the lessons.

## Verify

- vitest: Learn coverage test (every control), tutorial definitions.
- Harness: all lessons pass on chromebook, small and laptop profiles.
- Chrome: run the first lesson and one course end to end.
