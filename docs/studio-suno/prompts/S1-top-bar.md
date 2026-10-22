# S1: Top bar and transport

**Goal:** the top bar matches [s01]:

- the logo;
- a project pill (name + ⋯);
- an undo/redo pill;
- a **centred transport pill**;
- a time pill;
- a tempo pill;
- Export;
- Library.

**Read first:**

- `../anatomy.md` §2, plus [s36] (project menu) and [s37] (tempo popover);
- `../spec.md` "Top bar";
- `shell/topbar/*`, `shell/bottombar/TransportControls.tsx`, `PositionReadout.tsx`, `SongControls.tsx`, `ClickToggle.tsx`, `song/tapTempo.ts`.

## Build

1. **`TopBar.tsx` layout:** left (logo, ProjectName + ProjectMenu as one pill, UndoRedoButtons pill), centre (transport + time), right (tempo pill, Export pill, Library pill).
   - The save status chip lives inside the project pill.
   - Avatar, Help and Share move into the project menu, or into a compact ⋯ when the width is tight (`useToolbarOverflow`).
2. **Transport pill:** click (metronome), rewind, record, play/pause, loop. Reuse `TransportControls` and `ClickToggle` logic; restyle only.
3. **Time pill:** follow toggle, `mm:ss.mmm`, then `bar.beat.tick` (`PositionReadout`), in tabular numbers.
4. **Tempo pill:** shows "120 BPM 4/4 C maj". It opens a popover with:
   - Manual (−/value/+, Tap);
   - **Follow audio**: disabled until S7, with a hint;
   - key and time signature.
5. **Project menu**, in this order:

   - New, Open, Rename, Duplicate;
   - Version history (S11);
   - Share;
   - Views (Create / Mix / Score / Practice);
   - Settings.

   Shortcuts come from the command registry.

6. **ViewTabs:** move them into a compact view pill next to the project pill, or into the project menu. Propose one to the owner with screenshots.

## Verify

- vitest: topbar suites, the saveChip model, transport.
- Every shortcut still works (`?` sheet).
- Chrome: compare with [s01], [s36], [s37] at 1477 and 1366. Play/stop and tap tempo work. No overflow at 1366.
