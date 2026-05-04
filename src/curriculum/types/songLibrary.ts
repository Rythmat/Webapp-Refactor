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
  | 'major' | 'minor'
  | 'dorian' | 'mixolydian' | 'phrygian'
  | 'lydian' | 'locrian' | 'aeolian' | 'ionian';

export type DifficultyLevel = 1 | 2 | 3;

export type AudioProvider = 'spotify' | 'youtube' | 'apple_music' | 'tidal';

export type ArtistImageSource = 'spotify' | 'youtube' | 'commissioned' | 'none';

export type ContentRefType =
  | 'key'             // Theory: this song's key
  | 'mode'            // Theory: this song's mode
  | 'progression'     // Genre lesson: chord progression pattern
  | 'technique'       // Genre lesson: a technique used
  | 'genre_overview'  // Genre profile entry point
  | 'globe_region'    // Globe geographic location
  | 'globe_era'       // Globe time period
  | 'globe_artist'    // Globe artist deep dive
  | 'globe_scene'     // Globe music scene/movement
  | 'studio_jam';     // Studio: open this song in Studio

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
}

/* ── Section-level types ────────────────────────────────────────────── */

export interface SongSection {
  /** Unique section identifier: 'verse_1', 'chorus_1', 'bridge' */
  id: string;
  /** Display label: 'Verse 1', 'Chorus', 'Bridge' */
  label: string;
  /** Ordered bars in this section. */
  bars: ChordBar[];
  /** How many times to repeat. Defaults to 1 if omitted. */
  repeatCount?: number;
  /** Pedagogical note shown to student. NEVER lyrics. */
  notes?: string;
  /** Override measures per row for this section. Defaults to 4. */
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
