# S3: Clip editing and the clip menu

**Goal:** clip selection, trim, split, duplicate and colour behave like [s09, s24], with our extra AI and theory actions slotted in.

**Read first:**

- `../anatomy.md` §4 (clip menu);
- `shell/canvas/clipMenu/`, `components/Timeline/splitAudioClipAt.ts`;
- `audio/audioClipCuts.ts`, `time/arrangementEdits.ts`, `commands/`.

## Build

1. **Clip menu, grouped as in [s24]:**

   - Copy ⌘C, Paste ⌘V, Duplicate ⌘D, Delete ⌫;
   - **Heal edits** (join adjacent split pieces of the same source), Split ⌘E;
   - Rename;
   - Clip colour ▸ (the token palette);
   - **AI/theory group:** Split into stems (S10), Convert to notes (S10), Find the chords (our analysis → chord lane), Download WAV.

   Items for unbuilt prompts are hidden, not greyed out.

2. **Heal edits:** a new undoable command. It merges clips that share an asset and have contiguous windows. Write unit tests for its edges.
3. **Interaction:**

   - Trim handles appear on selection.
   - Drag-to-move snaps to the grid.
   - Alt-drag duplicates.

   Everything is undoable as one transaction (1.9 edit transactions).

4. **Clip colour override:** stored per clip. This bumps the schema (migration + round-trip test).

## Verify

- vitest: the clip menu, heal-edits command tests, the schema migration.
- Harness round trips.
- Chrome: right-click a clip and compare the menu with [s24]; split, heal, undo, redo.
