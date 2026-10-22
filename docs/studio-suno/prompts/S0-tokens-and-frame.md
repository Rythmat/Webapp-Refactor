# S0: Tokens and frame skeleton

**Goal:** the Studio's page, stage card, pill system and type scale match Suno's frame [s01, s03]. Every later prompt builds on these tokens. No behaviour changes.

**Read first:**

- `../spec.md` "Target frame" (Page row) and "Motion";
- `../anatomy.md` §1;
- `src/daw/ui/tokens.ts` and `scripts/studio/gen-tokens.mjs`. `daw-tokens.css` is generated from them: never edit it by hand.

## Build

1. **Tokens** (in `ui/tokens.ts`; regenerate with `npm run studio:tokens`):
   - Page background about `#101012`.
   - Pill: radius 999, 36 px high, background about `#141417`, label at 50% white, 12–13 px / 500.
   - Stage card radius 12, 8 px gutters.
   - Translucent panel `rgba(20,20,22,.85)`.
   - Hairline `rgba(255,255,255,.1)`.
   - Radii 3/8/10/12/16/20/999.
   - Shadows: column `0 0 20px rgba(0,0,0,.4)`, floating card `0 8px 28px rgba(0,0,0,.36)`.
   - Type steps 8/10/11/12/13/14 in Glacial, with `font-variant-numeric: tabular-nums` for time, BPM and knob values.
   - Loop wash in pink and playhead in blue: map both to our accent and semantic tokens and propose the values to the owner.
2. **Shell geometry:** in `shell/layout/layoutModel.ts` + `shellGeometry.ts`, define the new regions:

   - top bar 52 (8 + 36 + 8);
   - stage card;
   - bottom bar 52;
   - track column 260;
   - Library drawer 345.

   Keep per-user prefs. Retire `SIDE_RAIL_PX` once S4 lands; behind a flag until then.

3. **`StudioShell.tsx` composition:** the top bar, then the stage card (track column | timeline, then docked panels inside the card), then the bottom bar, plus the right drawer slot. Use empty placeholders for regions later prompts fill. The old shell stays behind `localStorage['ma:daw:legacyShell']='1'` until S15.
4. **Primitives** in `src/daw/ui/` (generic, reused by S1–S14): `Pill`, `PillGroup`, `IconPill`, `FloatingCard`, `Keycap`, `ColorChip`.

## Don't

- Use Suno's fonts (Neue Montreal, Input Sans) or any Suno asset.
- Add a brand-yellow accent (owner rule: no brand yellow).
- Add a hex outside `tokens.ts`. `tokens.test` must keep passing.

## Verify

- vitest: the tokens test, layoutModel and shellGeometry tests, plus new primitive tests.
- Chrome on 5263, `/studio/editor?template=project-pop` (with `VITE_DEV_AUTH_BYPASS=1`), at 1477×978 and 1366×655. Compare the frame with [s01]; bars and pills should be within 4 px.
- The legacy flag still opens the old shell.
