/**
 * Song Library — Chord Chart Schema
 *
 * Rules:
 * - NO lyrics field, anywhere. Structurally impossible to store lyrics.
 * - NO melody field, anywhere.
 * - Hybrid Number System (`degree`) is the source of truth.
 * - `chordName` is derived for display only.
 * - Voicing hints follow bottom-to-top stack (e.g. '3-5-1' for first inversion).
 * - All accidentals use ♭ and ♯ symbols, never b or #.
 * - GlobeOrigin is metadata only — the resolver uses it to generate Globe ContentRefs.
 */

/* ── Enums & Unions ─────────────────────────────────────────────────── */

export type SongMode =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'mixolydian'
  | 'phrygian'
  | 'lydian'
  | 'locrian'
  | 'aeolian'
  | 'ionian';

export type DifficultyLevel = 1 | 2 | 3;

export type AudioProvider = 'spotify' | 'youtube' | 'apple_music' | 'tidal';

export type ArtistImageSource =
  | 'spotify'
  | 'youtube'
  | 'commissioned'
  | 'wikipedia'
  | 'manual'
  | 'none';

export type ContentRefType =
  | 'key' // Theory: this song's key
  | 'mode' // Theory: this song's mode
  | 'progression' // Genre lesson: chord progression pattern
  | 'technique' // Genre lesson: a technique used
  | 'genre_overview' // Genre profile entry point
  | 'globe_region' // Globe geographic location
  | 'globe_era' // Globe time period
  | 'globe_artist' // Globe artist deep dive
  | 'globe_scene' // Globe music scene/movement
  | 'studio_jam'; // Studio: open this song in Studio

/* ── Chord-level types ──────────────────────────────────────────────── */

export interface ChordHit {
  /** Hybrid Number System — primary. e.g. '1 maj', '♭7 maj', '5 dom7' */
  degree: string;
  /** Concrete chord name in the song's key — secondary. e.g. 'E', 'B/D♯' */
  chordName: string;
  /** Beat position (1-indexed). Supports decimals for pickups (e.g. 1.5). */
  beat: number;
  /** Duration in beats. 4 = full bar, 2 = half, 1 = quarter. */
  duration: number;
  /** Voicing hint for piano roll + Studio export. Bottom-to-top stack. */
  voicingHint?: string;
}

export interface ChordBar {
  /** Typically 1–2 chords per bar, max 4 (one per beat). */
  chords: ChordHit[];
  /** If true, draw a fermata (hold) symbol above this bar. */
  fermata?: boolean;
  /** If set, this bar represents a multi-bar rest. Renders as a thick
   *  horizontal block with the number above. `chords` should be empty. */
  restBars?: number;

  // ── Roadmap ──
  // How the written chart is read. `performedBars` in songLibrary/performance
  // turns these into the order the song is played, which playback, timing and
  // the Studio export all follow.

  /** A start-repeat barline opens this bar. */
  repeatStart?: boolean;
  /** An end-repeat barline closes this bar. */
  repeatEnd?: boolean;
  /** Times the repeated passage is played in all. Defaults to the highest
   *  ending number in the passage, or 2. */
  repeatTimes?: number;
  /** Volta bracket over this bar: the passes that play it (`[1]`, `[2]`,
   *  `[1, 2]`). Neighbouring bars with the same passes share one bracket. */
  ending?: number[];
  /** The segno a D.S. jumps back to. */
  segno?: boolean;
  /** The coda sign: where "To Coda" lands on the pass after an al Coda jump. */
  coda?: boolean;
  /** "To Coda" at the end of this bar, taken on the pass after the jump. */
  toCoda?: boolean;
  /** Jump written at the end of this bar. */
  jump?: RoadmapJump;
  /** Fine: the song ends here on the pass after an al Fine jump. */
  fine?: boolean;
  /** Performance cue above the bar: 'Riff', 'Drum Fill', 'Piano Solo',
   *  'Break', 'Repeat and Fade'. Never lyrics. */
  cue?: string;
  /** The key changes at this bar, e.g. 'A♭ major'. Degrees from here on
   *  count from the new tonic. The song's own `key` stays the home key. */
  keyChange?: string;
  /**
   * The metre changes at this bar, e.g. `[5, 4]`. Bars from here on are read
   * in it until another bar says otherwise; the song's own `timeSignature`
   * stays the home metre, the way `key` stays the home key.
   *
   * Read it with `writtenBarMeters` — never off a single bar, since most bars
   * in a mixed-metre song carry no mark and inherit the one before.
   */
  timeSignature?: [number, number];
}

export type RoadmapJump =
  | 'D.C.'
  | 'D.S.'
  | 'D.C. al Coda'
  | 'D.S. al Coda'
  | 'D.C. al Fine'
  | 'D.S. al Fine';

/* ── Section-level types ────────────────────────────────────────────── */

export interface SongSection {
  /** Unique section identifier: 'verse_1', 'chorus_1', 'bridge' */
  id: string;
  /** Display label, one of SECTION_NAMES with an optional number: 'Verse',
   *  'Verse 2', 'Pre-Chorus', 'Chorus'. Never a rehearsal letter. */
  label: string;
  /** Played without vocals: a small "Instrumental" beside the label.
   *  'first-time' when only the first pass is instrumental (a D.S. back to a
   *  verse that is sung the second time). */
  instrumental?: boolean | 'first-time';
  /** Ordered bars in this section. */
  bars: ChordBar[];
  /** How many times to repeat. Defaults to 1 if omitted. */
  repeatCount?: number;
  /** Pedagogical note shown to student. NEVER lyrics. */
  notes?: string;
  /** Override measures per row for this section. Defaults to 4; leave unset
   *  unless a phrase genuinely reads better another way. */
  measuresPerRow?: number;
}

/* ── Globe origin ───────────────────────────────────────────────────── */

export interface GlobeOrigin {
  /** Geographic region: 'San Francisco Bay Area', 'Detroit', 'New Orleans' */
  region?: string;
  /** Country: 'USA', 'UK', 'Jamaica' */
  country?: string;
  /** Era: '1970s', 'late_1970s_arena_rock' */
  era?: string;
  /** Scene/movement: 'arena_rock', 'motown', 'manchester_post_punk' */
  scene?: string;
  /** Stable Globe artist ID if the artist exists in the Globe data. */
  artistGlobeId?: string;
}

/* ── Content cross-reference ────────────────────────────────────────── */

export interface ContentRef {
  /** Which Music Atlas module this points to. */
  module: 'theory' | 'genre' | 'globe' | 'studio';

  // ── Theory destinations ──
  topicId?: string;

  // ── Genre destinations ──
  genre?: string;
  level?: DifficultyLevel;
  stepNumber?: number;

  // ── Globe destinations ──
  globeRegion?: string;
  globeEra?: string;
  globeArtistId?: string;
  globeSceneId?: string;

  // ── Studio destinations ──
  studioPreset?: string;

  // ── Display ──
  /** Human-readable label: 'Learn E Major', 'Explore Detroit' */
  displayLabel: string;
  /** Categorizes the chip for ordering and styling. */
  refType: ContentRefType;
}

/* ── Audio source ───────────────────────────────────────────────────── */

export interface AudioSource {
  provider: AudioProvider;
  /** 'spotify:track:abc123' or 'https://youtube.com/watch?v=xyz' */
  uri: string;
  /** Seconds into the recording where bar 1 begins. Defaults to 0. */
  startOffsetSec?: number;
}

/* ── Song (top-level) ───────────────────────────────────────────────── */

export interface Song {
  // ── Identity ──
  id: string;
  title: string;
  artist: string;
  /** Songwriter credit when it isn't the performing artist ('Prince' for
   *  Sinéad O'Connor's Nothing Compares 2 U). */
  composer?: string;
  year?: number;

  // ── Musical metadata ──
  key: string;
  keyRoot: number;
  mode: SongMode;
  tempo: number;
  timeSignature: [number, number];

  // ── Pedagogical metadata ──
  difficulty: DifficultyLevel;
  genreTags: string[];
  techniques: string[];

  // ── Globe metadata ──
  origin?: GlobeOrigin;
  /** Curated 2-3 sentence narrative for the Globe event card. Auto-generated
   *  by enrichSongDescriptions.mjs and round-tripped through this file so
   *  buildGlobeData.mjs can pick it up on regeneration. */
  historicalDescription?: string;

  // ── Content cross-references ──
  /** Explicit overrides; resolver fills in the rest from metadata. */
  contentRefs?: ContentRef[];

  // ── Structure ──
  sections: SongSection[];

  // ── External audio ──
  audioSources: AudioSource[];

  // ── Display ──
  artistImageSource: ArtistImageSource;
  artistImageRef?: string;

  // ── Browse/sort ──
  /** 0-100, optional. Manually set per song. Higher = more prominent in browse. */
  popularity?: number;
}
