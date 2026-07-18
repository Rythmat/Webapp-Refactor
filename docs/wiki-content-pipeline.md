# Wiki → Music Atlas content pipeline

A reusable, review-gated method for turning the **creator-wiki** (a curated, source-attributed
music-theory knowledge base at `~/Documents/creator-wiki`) into Music Atlas product content — without
hand-authoring facts from memory.

## Principle

The creator-wiki is a **sourcing layer**: every wiki claim traces to a creator's YouTube video. Product
data (Learn / Studio / Globe) is generated **from** the wiki, schema-conformant, and each entry cites
its source. Nothing is invented — if the wiki doesn't ground it, it isn't added (e.g. this first run
added no Persian instruments, because the wiki names none).

## How to run it

1. Pick a **wiki topic-cluster** + a **target section / data file**.
2. Run a Claude Code workflow that reads: the relevant `wiki/{topics,creators,videos}/*.md`, the target
   file's TS types + existing entries (to **dedup**), and the ingested-log below.
3. It appends **schema-conformant entries**, each preceded by a source comment:
   `// source: wiki/topics/<t>.md · <Creator> — https://youtu.be/<id>`
   (and populates the `videoId` field for map events).
4. `tsc -b`, `prettier`, and `eslint` must pass.
5. Land as **one clean commit** on a branch `wiki/<section>-<cluster>` → open a PR → review → merge.
   The commit needs `nvm use 20` first (husky `lint-staged`). Never touch unrelated WIP.
6. Append the ingested sources to the **log** below so re-runs dedup.

## Mapping (wiki cluster → section → data)

| Wiki cluster                                                                                                                                                 | Section    | Target file(s)                                                                                                                                                                                                     | Schema                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| microtonal / world-tuning — `persian-music`, `31-edo`, `xenharmonic`, `22-shruti`, `microtonal`, `andalusian-music`, `middle-eastern-music`, `music-history` | **Globe**  | `components/ClassroomLayout/globe/data/scales.ts` (`WorldScale`), `.../rootsAndRoutes.ts` (`RootsRoute`), `components/atlas/data/events/world.ts` (`HistoricalEvent` + `videoId`), `.../globe/data/instruments.ts` | typed TS arrays                                              |
| theory — `harmony`, `chords`, `voicings`, `modal-interchange`, `harmonic-major`, `diminished-chords`, `pentatonics`, `scales`, `modes`                       | **Learn**  | canonical source `~/Desktop/Music Atlas Curriculum` (CSV/MD) → `scripts/convert*.mjs` → `src/curriculum/data/`; theory `src/components/learn/*Content.ts`                                                          | `ModeChordScales`, `ActivityFlow`, `GenreProfile`, HarmonyKB |
| production/harmony — `modal-interchange`, `voicings`, `diminished-chords`, `pentatonics`, `reverb-fx`, `arpeggios`                                           | **Studio** | Prism `src/daw/prism-engine/data/{modes,chords,progressionGraph,…}.ts`; Oracle Synth `src/daw/oracle-synth/store/presets/factoryPresets.ts`                                                                        | `MODES`/`CHORDS`/patterns, `PresetData`                      |

Note: `globe/data/scales.ts` is also rendered by **Learn → `WorldHarmony.tsx`**, so Globe scale
additions surface in Learn automatically (both filter lists are data-driven off `SCALE_TRADITIONS`).

## Ingested log (dedup — one section per run)

### 2026-07-18 — Globe / world-tuning · branch `wiki/globe-world-tuning`

- `globe/data/scales.ts`: +traditions **Persian**, **Xenharmonic**; +scales `mahur`, `segah`, `homayoun`, `chahargah` (persian-music.md · Farzad Milani · PIlHb5GgjMI, \_QN_DG-OJ_4), `31edo-supermajor-hexatonic`, `31edo-overtone` (31-edo.md · Zheanna Erose · uH3ahBzDSrs, unuVHCZ2snE).
- `atlas/data/events/world.ts`: +`evt-ziryab-cordoba-822` (andalusian-music.md · Filip Holm · \_RoV2A4_FK4), +`evt-urmawi-baghdad-1250` (middle-eastern-music.md · Filip Holm · JIEmnNiXBCk).
- `globe/data/rootsAndRoutes.ts`: +`baghdad-to-al-andalus` "The Andalusian Road" (andalusian-music.md · Filip Holm · \_RoV2A4_FK4).
- `globe/data/instruments.ts`: none added — wiki names no specific Persian instrument; `ney` already present.
