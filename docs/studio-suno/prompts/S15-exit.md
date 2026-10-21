# S15: Accessibility, performance and exit

**Goal:** the new Studio is accessible, fast on a Chromebook and ready for the owner's exit review. The legacy shell flag is removed.

## Build

1. **Accessibility:**
   - Every pill, toggle and panel can be reached and used from the keyboard.
   - Focus order: top bar → track column → timeline → panels → bottom bar → drawer.
   - Prompt-bar and agent status is announced through a live region.
   - Learn cards are reachable with the keyboard (focus shows the card).
   - Contrast passes on the 50%-white pill labels; raise them if they don't.
   - Reduced motion is honoured.
2. **Performance:** run the perf harness (playback writes/s, commits/s, long tasks on the Chromebook profile) and keep Stage B numbers or better. Hold the bundle budget for DawApp. The prompt bar, generation and stems load lazily.
3. **Exit report** in `docs/studio-perf/suno-frame-exit.md`:
   - side-by-side screenshot pairs for every [sNN] region;
   - acceptance from spec.md;
   - open items;
   - owner sign-offs.
4. **Remove** `ma:daw:legacyShell` and the dead shell code (SideRail, old Dock tabs, BottomRail transport), with a knip pass.

## Verify

- Full harness (lessons, round trips, goldens, perf).
- vitest full run.
- Chrome on all three sizes.
- Owner exit review.
