# S4: Bottom bar, docked panels and the Library drawer

**Goal:**

- Four bottom toggles open **stackable** panels under the timeline [s10–s13].
- The device-chain pill sits in the bottom centre.
- Zoom and **Learn** sit at the bottom right.
- The Library becomes a right drawer that pushes the stage [s20–s23].

**Read first:**

- `../anatomy.md` §5 and §8;
- `../spec.md` "Bottom bar", "Docked panels" and "Library drawer";
- `shell/dock/*`, `shell/bottombar/BottomRail.tsx`;
- `shell/inspector/*` (InspectorPanel, SideRail, `browser/`);
- `shell/layout/layoutModel.ts`.

## Build

1. **Bottom bar:**
   - left: toggles for Devices, Automation, Notes/Audio editor and Takes (Takes is empty until S8);
   - centre: the device-chain pill (track colour; "‹instrument› +" or "+ Add effects");
   - right: Library/browser, zoom (− fit +), Learn.
2. **Dock → panel stack.** `Dock.tsx` keeps an ordered set of open panels, each with its own height pref and one shared resizer, and they stack.
   - The old tabs map onto panels: Instrument and Effects → Devices; Notes → Notes.
   - Prism and Grooves move to the Library (Grooves tile) and to the prompt bar in S9. Until S9, keep Prism reachable from the clip menu.
3. **Automation panel:**
   - Lanes for the selected track.
   - Empty state: "No automation yet. Right-click a knob › Automate."
   - Reuse the existing automation model (inline automation is milestone 3.3 in the old plan; port what exists).
4. **Library drawer**, about 345 px, toggled by the top-bar Library pill.
   - Home is a 2×2 grid of tiles: Parts, Grooves, Sounds, My uploads, plus Songs and Assignments for students.
   - Lists have filter chips and rows with 46 px art, title, a style/metadata line and a tag.
   - Grouped by day where it makes sense.
   - Drag a row to the timeline (existing `libraryDrop.ts`).
   - Keep key, tempo, length, favourites and "Fits your song" from 2.14.
5. **Retire** SideRail + InspectorPanel. Any panels that still matter (Insight, Song) become Library tiles.

## Verify

- vitest: dock and layout suites (rewrite them for the stack), browser/library suites.
- Harness lessons: tutorial anchors may break; record them for S14.
- Chrome: compare with [s10–s13] and [s20–s23]. Open 2 panels together. At Chromebook size, 3 or more track rows show with one panel open.
