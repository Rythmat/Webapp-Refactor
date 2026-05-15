# UNISON

**U**niversal **N**eural **I**ntelligent **S**ound **O**ntology **N**etwork

UNISON is Music Atlas's universal music intelligence engine. It is a hub-and-spoke format translator — every supported input format (audio, MIDI, MusicXML, lead sheets) is converted _into_ a single internal representation (`UnisonDocument`), enriched with a musical-intelligence layer (key, harmony, rhythm, melody, voice leading, modal interchange, progression matching), and converted _from_ that representation back out to playback formats. The intelligence layer — not the format conversion — is what distinguishes UNISON from off-the-shelf tools like Basic Pitch or MusPy.

## Hub-and-spoke

```
        INGEST (to UNISON)              REALIZE (from UNISON)
        ──────────────────              ─────────────────────
Audio WAV/MP3 ──────→ ┐            ┌→ MIDI files
MIDI files ─────────→ │            ├→ Lead sheet output
MusicXML ───────────→ ├→ UNISON ──→├→ Piano roll / Learn module
Lead sheets ────────→ ┘            └→ Studio (synth + effects)
DAW session ────────→
```

Sheet-music PDF/PNG ingest (Phase 3) and audio synthesis out (Phase 7) are not yet wired up — see the phase table below.

## Folder layout

```
src/unison/
├── index.ts                — public API surface
├── types/
│   ├── schema.ts           — UnisonDocument and all sub-types
│   └── index.ts
├── engine/                 — analysis (key, harmony, rhythm, melody,
│                             voice leading, timbre, mix, BPM, progression
│                             matching, modal interchange, secondary dominants)
├── converters/             — ingest/realize (MIDI, audio, MusicXML,
│                             lead sheet, DAW session)
└── __tests__/              — unit tests
```

## The UNISON Document

Every piece of music in UNISON is a `UnisonDocument`. Top-level shape (see [types/schema.ts](types/schema.ts) for full types):

| Field      | Nullable | Description                                                                                                                               |
| ---------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `version`  |    —     | Schema version, currently `'1.0.0'`                                                                                                       |
| `metadata` |    —     | Title, source (`midi-import` \| `daw-session` \| `lead-sheet` \| `audio` \| `sheet-music` \| `manual`), timestamps, `ticksPerQuarterNote` |
| `tracks[]` |    —     | Note events, CC events, optional lyrics. Each track has a `TrackRole`: `chords` \| `melody` \| `bass` \| `drums` \| `pad` \| `unknown`    |
| `analysis` |    —     | `key`, `chordTimeline`, `progressionMatches`, `vibes`, `styles`, `tonalRegions`, `modalInterchangeSummary`, `voiceLeading`                |
| `rhythm`   |    —     | `bpm`, time signature, subdivision (`straight` \| `triplet` \| `mixed`), swing amount                                                     |
| `melody`   |   yes    | Contour, pitch range, scale-degree timeline, interval histogram                                                                           |
| `form`     |   yes    | Sections, repeats, form label, total measures                                                                                             |
| `timbre`   |   yes    | Instrument guesses, spectral fingerprint, amplitude envelope (Phase 5)                                                                    |
| `mix`      |   yes    | Stereo field, dynamic range, spectral balance, loudness profile (Phase 6)                                                                 |

The three nullable bottom rows (`form`, `timbre`, `mix`) are additive: a document from Phase 1 (MIDI ingest only) is fully valid with those fields set to `null`.

## Seven-phase architecture

Status reflects code currently on disk in this folder, not the external spec doc.

| Phase | Purpose                          | Status                                                                                                | Repo location                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----: | -------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | MIDI ↔ UNISON                   | Built                                                                                                 | [converters/midiToUnison.ts](converters/midiToUnison.ts), [converters/unisonToMidi.ts](converters/unisonToMidi.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|     2 | Audio → UNISON                   | Built (initial)                                                                                       | [converters/audioToUnison.ts](converters/audioToUnison.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|     3 | Sheet music → UNISON             | Partial — chord-chart route built                                                                     | PDF → Song chord chart: [scripts/visionExtract.mjs](../scripts/visionExtract.mjs), [scripts/ocrAudit.mjs](../scripts/ocrAudit.mjs), [scripts/parseSongPdfs.mjs](../scripts/parseSongPdfs.mjs) → 664 entries in [curriculum/data/songs/](../curriculum/data/songs/). Song → UNISON: [converters/songToUnison.ts](converters/songToUnison.ts). Full-notation OMR (melody + voicings) not yet built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     4 | Lead sheet ↔ UNISON             | Built (conversion + voicing + comping + bass + drum + melody rendering + natural-language dispatcher) | Conversion: [converters/leadSheetConverters.ts](converters/leadSheetConverters.ts). Voicing rendering: [engine/voicingRenderer.ts](engine/voicingRenderer.ts) (Genre Voicing Taxonomy, Voicing Algorithm Library, Chord Quality Library). Comping rendering: [engine/compingRenderer.ts](engine/compingRenderer.ts) (183-entry Comping Pattern Library). Bass rendering: [engine/bassRenderer.ts](engine/bassRenderer.ts) (113 contour + 113 rhythm entries, mode-aware via chord quality). Drum rendering: [engine/drumRenderer.ts](engine/drumRenderer.ts) (thin adapter over the Studio's 19-genre `DRUM_PATTERNS` + `generateDrumMidi`). Melody rendering: [engine/melodyRenderer.ts](engine/melodyRenderer.ts) (690 contours × 146 phrase rhythms, deterministic seeded selection, key-relative scale mapping). GCM dispatcher with NL parsing: [engine/styleParser.ts](engine/styleParser.ts) + [engine/arrangeForStyle.ts](engine/arrangeForStyle.ts) — accepts phrases like `"advanced funk"`, `"pop jazz"`, `"smooth jazz"`; compound genres blend (primary = harmonic core, modifier = rhythm section). Drum events excluded from pitch-aware analysis in [converters/sessionToUnison.ts](converters/sessionToUnison.ts). |
|     5 | Timbre analysis                  | Schema + analyzer in place                                                                            | [engine/timbreAnalyzer.ts](engine/timbreAnalyzer.ts), `TimbreAnalysis` in schema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     6 | Mix analysis                     | Schema + analyzer in place                                                                            | [engine/mixAnalyzer.ts](engine/mixAnalyzer.ts), `MixAnalysis` in schema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|     7 | Audio synthesis (UNISON → Audio) | Not started                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Public API

Re-exported from [index.ts](index.ts).

**Top-level entry points**:

- `arrangeForStyle(doc, "advanced funk")` — one-call arrangement: parse a natural-language style phrase, look up the GCM entry, apply all five Phase-4 renderers. Returns `{ doc, parsed }`. Accepts compound phrases ("pop jazz" → JAZZ voicings/melody + POP rhythm section), level keywords ("advanced", "beginner"), genre synonyms ("rhythm and blues" → R&B), and vibe descriptors ("smooth", "dark").
- `parseStyle("smooth advanced pop jazz")` — pure parser, returns `ParsedStyle | null` (`{ primaryGenre, modifierGenre?, level, vibes }`).
- `songToUnison(song, { applyStyle?, applyGenreVoicings?, applyComping?, applyBass?, applyDrums?, applyMelody? })` — convert a Song dictionary entry (chord chart) into a `UnisonDocument`, optionally with per-chord genre voicings populated and comping + bass + drum + melody tracks rendered. `applyStyle` is the natural-language shortcut.
- `renderVoicing(rootPc, engineQuality, genre, level)` — return a single chord's MIDI pitches for a (genre, level) — uses the 157-entry Genre Voicing Taxonomy
- `applyVoicingsToTimeline(timeline, genre, level, { voiceLeading? })` — attach `voicingNotes` + `voicingId` to every covered region in a `UnisonDocument.analysis.chordTimeline`. With `voiceLeading: true` (default), when the taxonomy lists multiple inversion variants at the lowest tier (the curriculum tags these "choose closest inversion"), the picker minimises greedy nearest-pair RH motion from the previous chord — so a I–V–vi–IV at L2+ smooths through inversions instead of slamming root-pos each chord.
- `renderComping(timeline, patternId)` — emit `UnisonNoteEvent[]` that play each chord using a comping rhythm
- `applyComping(doc, patternId)` — return a new `UnisonDocument` with a chords track of rendered comping events appended
- `renderBass(timeline, contourId, rhythmId)` — compose a Bass Contour (pitch sequence — 'R', 'P5', '2', '-1', etc.) with a Bass Rhythm (timing) to produce a melodic bass line; chord quality picks the mode (ionian / aeolian / mixolydian / locrian)
- `applyBass(doc, contourId, rhythmId)` — return a new `UnisonDocument` with a bass track appended
- `renderDrums({ genreName, swing?, bars? })` — render Studio drum patterns (Pop, Rock, Jazz, Funk, …) as GM drum-channel `UnisonNoteEvent[]`
- `applyDrums(doc, { genreName, swing? })` — append a drums track; bar count auto-derived from doc duration
- `renderMelody(timeline, keyRootPc, { scale, contourNotes, contourTiers, zeroPoint?, phraseRhythmGenre, phraseRhythmBars, directionFilter? })` — generate a melodic line: per-chord pick of contour + phrase rhythm, mapped through a key-relative scale (e.g. major pentatonic `[0,2,4,7,9]`), deterministic via `seed`. `directionFilter` restricts contour selection to a given set of `direction` tags (`'static' | 'ascending' | 'descending' | 'mixed'`) and is how `arrangeForStyle` translates vibes into melodic mood: "dark" → descending, "happy" → ascending, "smooth / chill" → static + mixed, etc.
- `applyMelody(doc, config)` — append a melody track using the doc's key

**Engine functions** (analysis):

- `detectKey`, `analyzeHarmony`, `matchProgressions`
- `analyzeRhythm`, `analyzeMelody`, `analyzeVoiceLeading`
- `estimateBpm`
- `analyzeTimbre`, `analyzeMix`
- `renderVoicing`, `applyVoicingsToTimeline`, `listAvailableGenreLevels`
- `renderComping`, `applyComping`, `listCompingPatternsForGenre`
- `renderBass`, `applyBass`, `listBassContours`, `listBassRhythmsForGenre`
- `renderDrums`, `applyDrums`, `listDrumGenres`
- `renderMelody`, `applyMelody`
- `parseStyle`, `arrangeForStyle`

**Converters** (ingest / realize):

- Ingest: `midiToUnison`, `importMidiFileAsUnison`, `audioToUnison`, `musicXmlToUnison`, `importMusicXmlFileAsUnison`, `leadSheetToUnison`, `songToUnison`, `sessionToUnison`
- Realize: `unisonToMidi`, `unisonToEvents`, `unisonToLeadSheet`

`unisonToMidi` exports every UnisonTrack to its own MIDI channel. If two tracks request the same channel, the renderer bumps the second one to the next free slot (1–16) rather than silently dropping it. An end-to-end test exercises `arrangeForStyle` → `unisonToMidi` → `Blob.arrayBuffer()` → `importMidiFile` to verify the four arranged tracks survive serialization with their event counts intact.

**Types**: `UnisonDocument` and its sub-types (`UnisonMetadata`, `UnisonTrack`, `UnisonAnalysis`, `UnisonChordRegion`, `KeyDetection`, `RhythmAnalysis`, `MelodyAnalysis`, `FormAnalysis`, `TimbreAnalysis`, `MixAnalysis`, and the event/option types) are all exported from `index.ts`.

## Further reading

Full external spec lives in `/Users/marfizo/Downloads/UNISON/`:

- `UNISON_Comprehensive_Summary.md`
- `UNISON_Schema_and_Roadmap.md`
- `UNISON_Open_Source_Integration_Plan.md`
- `UNISON_ML_Model_Architecture.md`

When that spec disagrees with this README or the code, **the code is authoritative**. The external spec is older and uses an earlier schema shape (e.g. a top-level `global` block and `analysis.chords`); the implementation has since moved to top-level `rhythm`/`melody`/`form` siblings and `analysis.chordTimeline`.
