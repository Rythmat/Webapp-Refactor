# Phase 2 — what the API needs, for Ryan

Written 26 September 2026. Everything described as "done" is merged in
`Webapp-Refactor`; everything under **What we need** is `music-atlas-api` work.

> **Continued in `docs/console-content-api-contract.md` (29 September 2026).**
> That doc takes items 1–3 below further — the artist kind grows metadata, and
> release, studio and label kinds join it — and adds capabilities, lookup,
> export and reference validation. One decision below is amended there:
> artist-level influence is now a field on the artist record.

---

## The short version

We are turning the Atlas into a connected graph — songs, artists, chord
progressions, genres, places, labels — so that clicking any one of them on the
globe narrows what the others can be. The webapp half is built and tested. It
needs three things from the API, in this order:

1. **A `chord_progression` content kind.** The editor is already built and
   waiting; it is unregistered only because the API does not serve the kind.
2. **An `artist` content kind.** 912 artists are ready to import as a flat list.
3. **The song → globe event derivation carrying four new fields.**

Labels and studios can wait — they are captured on the song record already.

---

## What changed on our side

### `Song` gained three optional fields

`src/curriculum/types/songLibrary.ts`. All optional, so the other 636 songs are
untouched.

```ts
credits?: Credit[];              // who played what, and who produced it
session?: RecordingSession;      // studio, city, country, label, recordedYear
relatedRecordings?: RelatedRecording[];  // covers, originals, samples
```

```ts
interface Credit {
  name: string;
  role:
    | 'performer'
    | 'vocals'
    | 'producer'
    | 'engineer'
    | 'arranger'
    | 'conductor'
    | 'songwriter';
  instrument?: string; // a SESSION_INSTRUMENTS id, only for 'performer'
  ensemble?: boolean; // 'The Funk Brothers' — a group, not a person
  primary?: boolean; // billed on the label, not a sideman
  artistGlobeId?: string;
  unverified?: boolean; // could not be pinned to a reliable source
}

interface RecordingSession {
  studio?: string;
  city?: string;
  country?: string;
  label?: string;
  recordedYear?: number;
  unverified?: boolean;
}

interface RelatedRecording {
  songId?: string; // when that recording is charted here too
  artist: string;
  year?: number;
  relation: 'original' | 'cover' | 'sample' | 'interpolation' | 'collaboration';
  artistGlobeId?: string;
  unverified?: boolean;
}
```

The admin song editor already edits all of this — it is live in the console
today. Four songs are populated as a pilot; the rest is content work on our
side.

### `ChordProgressionEntry` gained `songIds`

`src/curriculum/data/chordProgressionLibrary.ts`, now **695 entries**.

```ts
songIds?: string[];   // `song` resolved to real song ids
```

### A graph vocabulary exists

`src/content/graph/` defines the node kinds, the edge kinds and the id scheme.
**Edges are derived from records, never stored separately** — see [Decisions
already made](#decisions-already-made).

---

## What we need

### 1. `chord_progression` content kind

The largest win and the smallest change. Add `chord_progression` to whatever
enumerates content kinds server-side, so the existing endpoints
(`/api/admin/content/items`, `/items/:id`, `/template/:kind`, `/validate/:kind`)
accept it.

Body shape — this is exactly what the editor reads and writes:

```ts
{
  id: number;
  progression: string;      // '1 major7 - 5 dominant7 - 1 major7'
  chords: string[];         // ['1 major7', '5 dominant7', '1 major7']
  chordCount: number;
  startingChord: string;    // chords[0]
  startingDegree: string;   // '1', 'b3', '#5'
  complexity: 'triad' | '7th' | 'extended';
  vibes: string[];          // 16-term vocabulary, see VIBE_ALGORITHMS
  styles: string[];         // 'jazz', 'r&b', 'neo-soul', 'hip hop', …
  artist: string;           // free text, legacy
  song: string;             // free text, legacy
  songIds?: string[];       // resolved song ids — the graph edge
}
```

`chordCount`, `startingChord`, `startingDegree` and `progression` are all
functions of `chords`. We have a guard test asserting they agree; a server-side
recompute on write would be better still.

**Seed data:** `src/curriculum/data/chordProgressionLibrary.ts` — 695 entries,
already normalised. Straight import.

### 2. `artist` content kind

Today the globe has **no artist entity**. It used to infer artists from event
title patterns and subtract a 60-name stop list of labels and festivals it
mistook for people. That is retired: `src/components/atlas/data/artistRegistry.ts`
now states who exists.

```ts
{
  slug: string;        // stable id — 'wes-montgomery'
  name: string;        // display casing and diacritics — 'Cesária Évora'
  aliases?: string[];  // other spellings that resolve here
}
```

**Seed data:** that file, **912 artists**. Flat, no relations.

Two things to preserve:

- **`slug` is the identity.** It is `artistSlug(name)` — accent-folded,
  apostrophes deleted, `&` folded to `and`. That last one matters: the song
  library writes "Hall & Oates" where the globe writes "Hall and Oates", and
  before we folded them those were two unconnected artists.
- **`aliases` is load-bearing.** The globe titles him "Andy Grammar"; the song
  library has "Andy Grammer", which is correct. One artist, alias carries the
  misspelling.

  > **Since 30 September 2026** no registry entry has an alias: the globe's
  > misspelling was corrected, and the registry holds 883 artists after the
  > duplicate merge. `aliases` stays for real alternate billings (see
  > `docs/console-content-api-contract.md`).

### 3. Song → globe event derivation: four new fields

`music-atlas-api/src/services/content/derive/song-to-globe-event.ts`.

A globe event currently carries `id, year, location, genre[], title,
description, tags[], videoId`. We need the derivation to also carry, from the
song:

| From the song          | Onto the event | Why                                                     |
| ---------------------- | -------------- | ------------------------------------------------------- |
| `session.label`        | label          | "Motown in Detroit" is a label and a place, not a genre |
| `session.studio`       | studio         | Hitsville, Abbey Road — a point on the map              |
| `session.recordedYear` | recordedYear   | Differs from release year more often than not           |
| `credits[]`            | credits        | The people pills, and the artist connections            |

Two existing behaviours worth keeping in view while you are in there:

- **`genre[]` is derived from the song's `genreTags`.** They drifted once: tags
  were normalised to the canonical set and 430 events kept the old vocabulary
  ("Straight Eighth Funk", "Classic Rock"). We resynced them on 26 September and
  added a guard test. Worth a server-side check too.
- **The event id is `song-<songId>`.** Both directions depend on it: the song
  page's globe icon and the globe card's lead-sheet icon. Renaming a song
  without renaming its event silently breaks the link — that is how 11 of them
  broke, and why `songEventLinks.test.ts` exists.

### Deferred

`label` and `studio` kinds. Both are captured as strings on `session` today,
which is enough for the graph. They only need records of their own when someone
wants to edit a label's story rather than just name it.

---

## Decisions already made

Please treat these as settled — each has a reason and a test behind it.

**Ids are namespaced: `<kind>:<slug>`.** `artist:chicago` and `place:chicago`
are different things, and this library contains both — Chicago is an artist on
one song and a city on forty-three events. New slugs are kebab-case. Song ids
keep their existing `snake_case` because globe event ids, set list entries and
content refs all reference them.

**Vocabularies stay in code, not in records.** Genres (29, of which 12 are
taught), instruments (59),
modes, keys and vibes are small, slow-moving taxonomies. They live in the webapp
repo where the type checker refuses a bad id and guard tests catch drift, and
they are visible read-only at `/console/vocabulary`. They do not need endpoints.
Songs, progressions and artists are content and do need them.

**Edges are derived from records, never authored separately.** A song's credits
already say who played; its session already says where. Restating those as a
separate edge table doubles the work and guarantees the two disagree. The one
exception is influence (`eventConnections.ts`), which no record implies and
which already has its own store.

**`unverified` is kept, not hidden.** Any credit, session or related recording
can be flagged. The UI renders those muted; nothing should filter them out
server-side.

---

## What happens on our side when each lands

- **Progressions:** add `'chord_progression'` to the `ContentKind` union in
  `src/hooks/data/admin/useAdminContent.ts`, add a `KindSpec` in
  `src/features/admin/content/kinds.ts` pointing at the existing
  `ProgressionEditor`, add it to `KIND_ORDER`. Roughly ten lines.
- **Artists:** the same three edits, plus pointing `artists.ts` at the served
  records instead of the bundled registry.
- **Derivation fields:** nothing — the webapp reads them as soon as they appear.

The kinds are deliberately unregistered until the API serves them, because a nav
link that 404s is worse than a missing one.

---

## Questions worth asking before you start

1. **Does a publish carry repo data into the server, or must content be entered
   through the console?** We could not determine this from the client. It
   decides whether the two seed files above are an import or a migration.
2. **Should `chordCount` and friends be recomputed server-side on write?** They
   are stored alongside `chords` and can disagree; we found four entries where
   they already did.
