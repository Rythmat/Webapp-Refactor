# Studio editor bundle

2026-10-07T01:16:59.962Z · commit f96b3ecc (dirty) · Vite 8.0.2 · built in 33 s

Written by scripts/studio-perf/bundle.mjs from a production build. Sizes
in kB (1,000 bytes): gzip level 9, brotli quality 11.

| chunk                               | file                      | raw     | gzip   | brotli |
| ----------------------------------- | ------------------------- | ------- | ------ | ------ |
| DawApp (the editor)                 | assets/DawApp-BnLe4--M.js | 1125.8  | 284.9  | 220.0  |
| entry                               | assets/index-T7PuolGk.js  | 680.3   | 179.0  | 143.8  |
| initial JS (entry and 173 preloads) | –                         | 3442.0  | 957.9  | –      |
| all JS chunks (514 files)           | –                         | 19911.9 | 4969.5 | –      |

DawApp against the June figure (1130.0 kB raw, 286.0 kB gzip): −4.2 kB raw, −1.1 kB gzip. Stage A's boot chunk budget (1.12a) is 150.0 kB gzip, and this chunk is 134.9 kB over it. Vite's own log: 1125.8 kB raw, 288.6 kB gzip.

## What the DawApp chunk is made of

Rendered size, before minification.

| source       | kB     |
| ------------ | ------ |
| src/daw      | 1677.3 |
| src (other)  | 181.4  |
| node_modules | 124.8  |

Largest packages in it: webmidi 100.6 kB · lucide-react 9.8 kB · framer-motion 8.5 kB · y-indexeddb 3.6 kB · lib0 2.3 kB.

## Largest src/daw modules (402 in all)

Rendered size before minification; gzip of the module alone.

| module                                               | rendered kB | gzip kB | chunk                                |
| ---------------------------------------------------- | ----------- | ------- | ------------------------------------ |
| src/daw/components/Controls/VocalView.tsx            | 73.8        | 11.5    | DawApp-BnLe4--M.js                   |
| src/daw/components/Timeline/Timeline.tsx             | 72.7        | 14.8    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/CrystalIcons.ts          | 62.7        | 19.5    | DawApp-BnLe4--M.js                   |
| src/daw/components/Score/useScoreEditing.tsx         | 61.7        | 13.1    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/DrumMachineView.tsx      | 50.2        | 11.2    | DawApp-BnLe4--M.js                   |
| src/daw/components/PianoRoll/PianoRoll.tsx           | 45.9        | 10.4    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/GuitarBassView.tsx       | 43.6        | 8.2     | DawApp-BnLe4--M.js                   |
| src/daw/store/prismSlice.ts                          | 41.9        | 9.9     | store-DBQiZKJD.js                    |
| src/daw/components/Effects/EffectsPanel.tsx          | 41.8        | 6.7     | DawApp-BnLe4--M.js                   |
| src/daw/prism-engine/data/melodyContours.ts          | 39.6        | 3.8     | prism-engine-CkKWRN1o.js             |
| src/daw/prism-engine/data/progressionGraph.ts        | 37.0        | 4.0     | prism-engine-CkKWRN1o.js             |
| src/daw/components/Transport/TransportBar.tsx        | 32.6        | 6.4     | DawApp-BnLe4--M.js                   |
| src/daw/components/Studio/StudioView.tsx             | 32.4        | 6.6     | DawApp-BnLe4--M.js                   |
| src/daw/audio/EffectChain.ts                         | 31.3        | 6.3     | store-DBQiZKJD.js                    |
| src/daw/oracle-synth/store/presets/factoryPresets.ts | 27.4        | 3.2     | SessionSerializer-B2K5nRxb.js        |
| src/daw/components/LeadSheet/LeadSheetView.tsx       | 26.1        | 6.2     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/GroovesBrowser.tsx       | 25.9        | 5.1     | DawApp-BnLe4--M.js                   |
| src/daw/hooks/usePlaybackEngine.ts                   | 25.2        | 6.1     | DawApp-BnLe4--M.js                   |
| src/daw/components/Tutorial/tutorials.ts             | 23.1        | 5.6     | useTutorialProgressStore-BE5di4TO.js |
| src/daw/components/PitchEditor/PitchEditor.tsx       | 22.3        | 5.2     | DawApp-BnLe4--M.js                   |
| src/daw/instruments/TonewheelOrganEngine.ts          | 21.9        | 5.1     | DawApp-BnLe4--M.js                   |
| src/daw/components/Transport/SettingsModal.tsx       | 19.2        | 3.8     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/OrganView.tsx            | 18.2        | 3.9     | DawApp-BnLe4--M.js                   |
| src/daw/components/Effects/GraphicEQ.tsx             | 17.6        | 4.9     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/SamplerChopsView.tsx     | 17.3        | 4.3     | DawApp-BnLe4--M.js                   |
