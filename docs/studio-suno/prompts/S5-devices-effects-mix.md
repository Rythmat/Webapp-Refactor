# S5: Devices panel, effect picker and Mix restyle

**Goal:**

- The Devices panel shows the instrument card plus effect slots [s03].
- Adding an effect opens a card picker with a **Learn** page [s40, s41].
- Mix is restyled to the new tokens.

**Read first:**

- `../anatomy.md` §5 and §10;
- `shell/dock/DockEffects.tsx`, `AddEffectSlot.tsx`;
- `shell/mix/*`;
- `components/Effects/`, `oracle-synth/`;
- `components/Tutorial/` (the spotlight + coach engine).

## Build

1. **Instrument card** (about 528×208, radius 10, a translucent surface):

   - title row: colour dot, name, preset ‹ ›, expand, close;
   - controls drawn in the track colour.

   Oracle, Sampler, Drum kit and SoundFont instruments each get the card frame; their internals keep their own views behind "expand". The legacy 7–10 px controls go: minimum 11 px text and 24 px targets.

2. **Effect slots:** dashed boxes in signal order, with drag-to-reorder and bypass.
3. **Effect picker modal:**
   - search;
   - "My presets";
   - a card per built-in effect, each with a **live mini UI** (render the real control at a small size, read-only), its name, Learn and a two-line description written by us.
4. **Learn page per effect:**

   - the real UI with a step tour (one step per control, written by us and checked for music-teaching accuracy);
   - **Preview**, which toggles the effect on the selected track while it plays;
   - Apply.

   Built on the tutorial engine (spotlight + coach card). Add a `lessonSteps` field to each effect's descriptor.

5. **Mix view:** same layout (strips 96 px, owner decision), new tokens and pills.

## Verify

- vitest: the effects rack, the picker model, Learn step definitions (each control has a step).
- Chrome: compare with [s03], [s40], [s41]. Preview toggles the effect audibly; the tour runs end to end.
