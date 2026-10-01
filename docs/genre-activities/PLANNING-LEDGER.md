# Genre Activity Flows — Planning Ledger

The running record for the Genre activity-flow planning effort. Maintained by
`/genre-sync`; edit by hand freely — the command merges, it doesn't overwrite.

**Last synced:** 2026-09-30 20:58
**Current focus:** Hip-hop — flows built and committed (6 commits on Peter); Overview page + style DNA next

---

## Cross-genre principles

Decisions that apply to every genre. When a per-genre decision turns out to be
general, promote it here.

- **Build every genre in close alignment with the Pop and Funk activity flows.** (D-001)
- **Same well-researched foundation, stated on the genre's Overview page.** (D-002)
- **Three levels of activities per genre.** (D-003)
- **Play-alongs use genre-appropriate sound fonts.** (D-004)
- **Every flow ends with Practice Tracks — offered at the end of each section, as in Pop/Funk.** (D-005, D-021)
- **The play-along engine supports swing.** (D-035, supersedes D-019)
- **Melody sections interleave. Each scale gets exactly three activities, the "scale sequence": UP out of time → DOWN out of time → UP & DOWN in time (the test). Then contours/phrases in that scale, then the next scale. Never a long run of scale-only activities.** (D-043, D-044; supersedes D-038)
- **Hip Hop chords sit high: chord activities start in C5–C6 (registerRules exception).** (D-032, D-036)
- **Per genre, decide the musical content for target notes across all 3 levels: scales, progressions, chord voicings, bass patterns.** (D-006)
- **Existing style DNA is a starting point; flows may be restructured and must follow the rules set while refining Pop and Funk.** (D-009, D-010)
- **Per genre, confirm the generated play-along drum, bass and chord patterns are true to the genre.** (D-007)

## Genre status

| Genre | Status | Current focus / next step | Notes |
| ----- | ------ | ------------------------- | ----- |
| African | not reviewed | | |
| Blues | not reviewed | | |
| Electronic | not reviewed | | |
| Folk | not reviewed | | |
| Funk | planning | New blues melody for Funk L3 (Q-018) | Section A reordered; finger bass |
| Hip-hop | building | All 3 levels built and committed; next: Overview page (T-003) + style DNA (T-015), then republish (T-024) | 89 steps | chords, scales, bass and play-along specs agreed for L1–L3; flow, Overview, engine grooves still stubs |
| Jam band | not reviewed | | |
| Jazz | not reviewed | | |
| Latin | not reviewed | | |
| Neo-soul | not reviewed | | |
| Pop | planning | New melodies for Pop L2 Aeolian, L3 Dorian + Aeolian (Q-018) | Section A reordered; fretless bass |
| Reggae | not reviewed | | |
| R&B | not reviewed | | |
| Rock | not reviewed | | |

Status values: `not reviewed` → `planning` → `plan agreed` → `building` → `done`.

## Hip-hop play-along specs (agreed 2026-09-29)

Heard on /__hiphop-grooves; the page's progression presets in
`src/__qa/hipHopAudition/patterns.ts` hold the same settings.

| Level | Progression | BPM | Kit | Drums | Bass | Chords |
| ----- | ----------- | --- | --- | ----- | ---- | ------ |
| L1 | Cm vamp, whole notes (bass study) | 72 | 808 | Trap A | 808 Trap foundation / expansions | held (whole notes) |
| L1 | Cm vamp, 8th chunking (bass study) | 72 | 808 | Trap A | 808 Trap foundation / expansions | 8th chunking, staccato, up 1 octave (C5-E♭5-G5) |
| L1 | Cm – Fm (root) | 72 | 808 | Trap B | 808 sustain + slide | held |
| L1 | Cm – G (root) | 72 | 808 | Trap B | 808 Trap staccato | Trap 2-bar comping (bar 1 whole note, bar 2 syncopated) |
| L1 | Cm 1st inv. ↔ Fm | 72 | 808 | Trap A | 808, locks to kick | held |
| L1 | Cm ↔ G 1st inv. | 72 | 808 | Trap A | 808 sustain + slide | 8th chunking, staccato |
| L2 | Em 1st inv. → Dm 1st inv. | 90 | house | Boom Bap A* | Finger electric, locks to kick; E→D down | 8th chunking, staccato, up 1 octave |
| L2 | Dm \| Dm \| Am sus4 (1st inv.) \| Am | 87 | house | Boom Bap A* | Finger electric, locks to kick | 8th chunking, staccato*, up 2 octaves |
| L2 | Am sus2 Am \| Am sus2 Am \| Dm sus2 Dm \| Dm sus2 Dm | 90* | house | Boom Bap A | 808: R (q), 5 (dotted 8th), ♭7 (dotted 8th) | 8th chunking, staccato, up 2 octaves |
| L3 | Em → F (Phrygian) | 84 | 808 | Boom Bap A | 808, locks to kick | 8th chunking, staccato |
| L3 | Em9 → A/B (Dorian) | 81 | house | Boom Bap B | Upright, locks to kick | held; swing 66% |
| L3 | D♯dim7 → Em add2 (arps) | 77 | house | Laid back* | 808, locks to kick; D♯1 → E1 | ascending 8th arpeggios |
| L3 | Am7 → B7♭9 → Em9 | 81 | house | Boom Bap B | Upright, locks to kick | held; swing 66% |

`*` = not specified by Aaron; the audition default stands until he changes it.
All swing 50% except the two Em9 rows (step `swing: 66`). All 8th chunking is staccato (D-046).

## Decisions

Newest last. Never delete — if a decision is reversed, add a new one that
supersedes it and mark the old one `~~struck~~ → D-xxx`.

| ID | Date | Scope | Decision | Why |
| -- | ---- | ----- | -------- | --- |
| D-001 | 2026-09-29 | all | Build each genre in close alignment with the Pop and Funk activity flows | Pop & Funk are the proven model |
| D-002 | 2026-09-29 | all | Same well-researched foundation, articulated on the Overview page | consistency, credibility |
| D-003 | 2026-09-29 | all | Three levels of activities | matches Pop/Funk |
| D-004 | 2026-09-29 | all | Play-alongs use genre-appropriate sound fonts | authentic sound |
| D-005 | 2026-09-29 | all | Practice Tracks at the end of each flow | matches Pop/Funk |
| D-006 | 2026-09-29 | all | Decide target-note content per level: scales, progressions, chord voicings, bass patterns | core of each flow |
| D-007 | 2026-09-29 | all | Confirm generated drum, bass and chord patterns per genre | play-alongs must sound right |
| D-008 | 2026-09-29 | Hip-hop | Hip-hop is the first genre | user's choice |
| D-009 | 2026-09-29 | all | The existing style DNA (artists / level themes) is a relevant starting point | already researched |
| D-010 | 2026-09-29 | all | Existing flows/drafts may be restructured and resequenced, and must conform to the rules set while refining Pop and Funk | consistency across genres |
| D-011 | 2026-09-29 | Hip-hop | Levels: L1 Trap, L2 Boom Bap, L3 Conscious Hip Hop. Soul-sample style dropped | trap harmony is simplest |
| D-012 | 2026-09-29 | Hip-hop | L1 uses triads only; the L1 challenge is inversions | |
| D-013 | 2026-09-29 | Hip-hop | L1 chord order: root position first, then 1st-inversion triad pairs: Cm 1st inv ↔ Fm root; Cm root ↔ G 1st inv | common-tone voice leading |
| D-014 | 2026-09-29 | Hip-hop | L1 culminates in two-chord jams using inversions | |
| D-015 | 2026-09-29 | Hip-hop | L2 reviews triads and inversions, then adds sus2 and sus4 | |
| D-016 | 2026-09-29 | Hip-hop | L2, early: Em 1st inv → Dm 1st inv parallel jam, 8th-note chunking, one bar each | |
| D-017 | 2026-09-29 | Hip-hop | L2: Dm root position, then Am sus4 1st inversion (D-E-A) resolving to Am (C-E-A) | |
| D-018 | 2026-09-29 | Hip-hop | Keys: L1 C minor, L2 A minor (L3 key open) | fits the chord pairs |
| ~~D-019~~ | 2026-09-29 | all | ~~No swing in the play-along engine for now~~ → D-035 | not now |
| D-020 | 2026-09-29 | Hip-hop | Build the 808 sub-bass voice (synth, from the audition page) for Trap | no 808 sample in repo |
| D-021 | 2026-09-29 | all | Practice Tracks match Pop/Funk: offered at the end of every section + tab-bar button | existing behaviour |
| D-022 | 2026-09-29 | Hip-hop | L3 Conscious: chords turn jazzy; key E minor | |
| D-023 | 2026-09-29 | Hip-hop | L3 Phrygian, triads: Em → F | |
| D-024 | 2026-09-29 | Hip-hop | L3 Dorian: Em9 (LH E, RH G-B-D-F♯) → A/B (LH B, RH A-C♯-E) | |
| D-025 | 2026-09-29 | Hip-hop | L3 harmonic minor: D♯dim7 arpeggio pattern → Em add2 arpeggio pattern | |
| D-026 | 2026-09-29 | Hip-hop | L3: Am7 (A-C-E-G) → B7♭9 (A-C-D♯-F♯) → Em9 (G-B-D-F♯) | |
| D-027 | 2026-09-29 | Hip-hop | L3 artists: A Tribe Called Quest, Common, Mos Def, Lauryn Hill, Kendrick Lamar | Kendrick is a must |
| D-028 | 2026-09-29 | Hip-hop | L1 scales: C minor pentatonic, then C Aeolian | |
| ~~D-029~~ | 2026-09-29 | Hip-hop | ~~L1 melody order: … → pentatonic scale sequence → …~~ → D-043 | "scale sequence" was misread as an extra step |
| D-030 | 2026-09-29 | Hip-hop | L3 arpeggios: ascending 8ths, two times per bar: D♯-F♯-A-C ×2, then E-F♯-G-B ×2 | |
| D-031 | 2026-09-29 | Hip-hop | 808 bass: 1 s decay, resonance rolled off 25% | Aaron, by ear |
| D-032 | 2026-09-29 | Hip-hop | Chords sit high in Hip Hop: Boom Bap play-along chords in the C6–C8 range; chord activities start in C5–C6 | stylistic trait |
| D-033 | 2026-09-29 | Hip-hop | Bass moves by step between neighbouring roots (E→D down a whole step; D♯→E up a half step), never the 7th leap | |
| D-034 | 2026-09-29 | Hip-hop | Play-along settings per progression: see "Hip-hop play-along specs" below | Aaron, by ear |
| D-035 | 2026-09-29 | all | Add swing to the play-along engine (supersedes D-019) | Hip-hop L3 Em9 rows need 66% |
| D-036 | 2026-09-29 | Hip-hop | Make the Hip-hop register exception in registerRules.ts | chords sit high (D-032) |
| D-037 | 2026-09-29 | Hip-hop | L2 Em → Dm chords stay +1 octave | |
| ~~D-038~~ | 2026-09-29 | all | ~~Melody order with a separate scale-sequence step~~ → D-043 | 6+ scale-only activities in a row loses users |
| D-039 | 2026-09-29 | Hip-hop | Trap bass foundation: root on 1, 5 on the "and" of 3 (dotted quarter) | the Trap bass pattern |
| D-040 | 2026-09-29 | Hip-hop | Trap bass expansion: 5 on the "and" of 3 as a dotted 8th, then a dotted 8th on 7, ♭7 or ♭3 — in bar 1 OR bar 2 of the 2-bar loop, never both | |
| D-041 | 2026-09-29 | Hip-hop | Aeolian version of the expansion: ♭6 → 5 instead of 5 → 7 | |
| D-042 | 2026-09-29 | Hip-hop | L1 bass activities build on this pattern: one note in the rhythm first, then change to the 5, then add notes | |
| D-043 | 2026-09-29 | all | "Scale sequence" = the three activities for one scale: UP out of time → DOWN out of time → UP & DOWN in time. Then contours/phrases, then the next scale. No separate sequence step (supersedes D-029, D-038) | the in-time up & down is the test |
| D-044 | 2026-09-29 | Pop, Funk | Cut the extra scale steps: each scale keeps exactly those three activities | healthy sequence |
| D-045 | 2026-09-29 | Hip-hop | L1 melody: C minor pentatonic (3 scale activities) → pentatonic contours/phrases → C Aeolian (3) → Aeolian contours/phrases → Practice Track | D-028 + D-043 |
| D-046 | 2026-09-29 | Hip-hop | 8th-note chunking chords are always staccato — in chord activities (target notes) and play-alongs, anytime the technique appears | Hip Hop feel |
| D-047 | 2026-09-29 | Hip-hop | Trap 2-bar comping: whole note in bar 1 (no "and" of 4 pickup), syncopated stabs in bar 2 (1, "a" of 1, 3, "a" of 3) | pickup dropped |
| D-048 | 2026-09-29 | Hip-hop | L1 Cm vamp (Trap bass study) in two variations: whole-note chords, and 8th-note chunking (staccato) an octave higher | |
| D-049 | 2026-09-29 | Hip-hop | L3 D♯dim7 → Em add2 play-along uses the house kit | Aaron, by ear |
| D-050 | 2026-09-29 | Pop | Pop play-alongs use the Fretless bass (FluidR3), replacing the electric bass sampler | less nasal; Aaron, by ear |
| D-051 | 2026-09-29 | Funk | Funk play-alongs use the Finger electric bass (FluidR3) | Aaron, by ear |
| D-052 | 2026-09-29 | Hip-hop | L3 bass sounds: Em → F 808; Em9 → A/B Upright (FluidR3); D♯dim7 → Em add2 808; Am7 → B7♭9 → Em9 Upright | Aaron, by ear |
| D-053 | 2026-09-29 | Hip-hop | Hip Hop never uses the old electric bass: Finger electric (FluidR3) everywhere it was electric, and it is Hip Hop's engine default | better sound |
| D-054 | 2026-09-30 | Hip-hop | L1 outline signed off as written (hiphop-L1-outline.md): draft melodies, G root position as G4-B4-D5, Bass sequence (one note → foundation → 5→♭7 bar 2 → 5→♭3 bar 1 → Aeolian ♭6→5 → play-along), Performance steps | "seems good, let's proceed" |
| D-055 | 2026-09-30 | all | Practice Tracks use the same kit and bass as their lesson play-alongs (Pop, Funk, Hip Hop) | sound like the lesson |
| D-056 | 2026-09-30 | Hip-hop | L2 and L3 outlines signed off as written ("Let's go for it!") | |

## Open questions

Remove a question once it is answered (the answer becomes a decision).

| ID | Raised | Scope | Question | Blocking? | Who decides |
| -- | ------ | ----- | -------- | --------- | ----------- |
| Q-018 | 2026-09-29 | Pop, Funk | New melodies the reorder needs (Pop L2 Aeolian; Pop L3 Dorian + Aeolian; Funk L3 blues): Aaron writes them, or Claude drafts for review? | blocks T-023 | Aaron |
| Q-020 | 2026-09-29 | Hip-hop | Trap bass expansions only over the 1 min chord? (over Fm, ♭6→5 would be D♭→C, outside C Aeolian) | no | Aaron |
| Q-021 | 2026-09-29 | Hip-hop | 808 "1 s decay": built as a fade to silence over 1 s — or decay to a held level? | no | Aaron, by ear |
| Q-022 | 2026-09-29 | Hip-hop | L2 sus2 bass (R q, 5 d8th, ♭7 d8th): built as one bar with the last 1½ beats empty, root again next bar — right? | no | Aaron, by ear |

## To-do

| ID | Scope | Task | Status |
| -- | ----- | ---- | ------ |
| T-003 | Hip-hop | Write the Overview profile (genreProfiles/hiphop.ts is all [NOTE] placeholders) | todo |
| T-005 | all | Engine: per-genre kit + instrument choice in useBackingTrack and the Practice Track Studio seed | todo |
| T-007 | Pop | Bug: Pop L3 grooveIds groove_rnb_01 / groove_neosoul_01 silently play funk_01 | todo |
| T-008 | Funk | Tidy: funk_v2 L2/L3 section consts are swapped vs the shipped levels | todo |
| T-015 | Hip-hop | Rewrite styleDna/hipHop.ts: L1 Trap, L2 Boom Bap, L3 Conscious with the agreed artists | todo |
| T-025 | Pop, Funk | Until T-023's melodies exist, these scales end their block with no phrases: Pop L2 E Aeolian, Pop L3 Dorian + Aeolian, Funk L3 C minor blues | blocked |
| T-026 | all | Flaky tests: melodyPipeline.test.ts "the 4 over a major chord"; landing lissajous.test.ts "stays inside its box"; Games melodyPhrases.test.ts "builds the long phrase from new material" — all fail now and then, unrelated to flows | todo |
| T-028 | Pop, Funk, Hip-hop | Practice Tracks carry the lesson's kit + bass into the Studio: Track.bassVoice (saved + synced like drumKit), EightOhEightInstrument, GM bass sample sets; checked live (Hip Hop 808 kit + 808, Pop Fretless, Funk Finger) | done |
| T-023 | Pop, Funk | New melodies the reorder needs: Pop L2 Aeolian, Pop L3 Dorian + Aeolian, Funk L3 blues (no sequence steps needed after D-043) | blocked |
| T-033 | all | Committed 2026-09-30: 64bf9695 ledger/tools, 63f42ae8 engine, 98b5bbdf Pop/Funk reorder, b19640a7 Hip Hop flows, 5e103af1 Practice Track sounds, 2a5809e9 audition page. The other chat's Practice Track keyboard work left uncommitted for it | done |
| T-024 | all | Republish the CDN lesson bundle after flow edits (prod reads the CDN, not the TS files) | todo |
| T-030 | Hip-hop | L1 "Trap" authored in hipHop_v2.ts (32 steps, generated from the outline); tests mark Hip Hop L1 authored; walked in the app (808 kit, high chords, two-hand split) | done |
| T-031 | Hip-hop | L2 "Boom Bap" (28 steps) and L3 "Conscious" (29 steps) authored; per-step tempo/kit/bass checked in the app | done |
| T-032 | Hip-hop | Per-step tempo: ActivityStepV2.tempo; lesson switches to it on step change; Practice Track uses it | done |
| T-009 | Hip-hop | AUTHORED_GENRES includes hipHop; step-count floor skips still-stubbed levels; practiceTrackCoverage lists hip-hop L1 | done |

Status values: `todo`, `doing`, `blocked`, `done` (done items move to the
session log at the next sync).

## Session log

One short entry per sync, newest first.

- **2026-09-30 20:58** — Hip Hop engine support built (hipHopPatterns/hipHopBacking, per-step kit + bass voice, shared 808, nearest-step bass); L1 outline written and signed off (D-054). Done: T-004, T-006, T-011, T-017, T-021, T-029.
- **2026-09-30 11:51** — Pop/Funk Section A reordered (Pop L2 11→9, Pop L3 22→13, Funk L1/L3 interleaved); checked live. Lesson bass voices: Pop Fretless, Funk + Hip Hop Finger electric (genreBassVoices.ts). Hip Hop: all 8th chunking staccato, Trap 2-bar comp without pickup, Cm vamp in two variations, L3 bass sounds and house kit set. Done: T-022, T-027.
- **2026-09-29 20:06** — Hip-hop levels set (L1 Trap C min, L2 Boom Bap A min, L3 Conscious E min) with chords, scales, artists and per-progression play-along specs, chosen by ear on the new /__hiphop-grooves page. Engine: swing added (swing.ts, step/flow/Practice Track) and Hip-hop register exception (chords start ≤ C6); full suite green. Trap bass pattern defined. Melody rule adopted for all genres; Pop/Funk Section A audited (Pop L3 had 18 scale steps in a row). Done: T-001, T-002, T-010, T-012, T-013, T-014, T-016, T-018, T-019, T-020.
- **2026-09-29** — Ledger and `/genre-sync` command set up. No planning yet.
