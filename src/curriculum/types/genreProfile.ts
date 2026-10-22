export interface GenreProfile {
  id: string;
  displayName: string;
  accentColor: string;
  tagline: string;

  // About tab
  history: string;
  primaryArtists: ArtistRef[];
  subGenres: string[];
  crossoverGenres: string[];
  characteristics: string[];

  // Theory + Technique tabs
  levels: {
    1: GenreLevelProfile;
    2: GenreLevelProfile;
    3: GenreLevelProfile;
  };
}

export interface ArtistRef {
  name: string;
  era: string;
  styleRef: string;
  role?: string;
  tracks?: string[];
  /**
   * The artist's name on the Globe when the card's differs — 'Parliament' for
   * 'Parliament-Funkadelic'. The card's Globe icon opens `?artist=` this (else
   * `name`), where the artist's featured hit plays (atlas/data/artistHits.ts).
   */
  globeArtist?: string;
}

export interface GenreLevelProfile {
  keyCenter: string;
  mode: string;
  keyMidi: number;
  scaleIntervals: number[];
  scaleNotes: string[];
  /**
   * Every scale the level teaches in its key, its own first, when there's
   * more than one: each is shown and colored on its own (Hip Hop L3's E
   * Phrygian, E Dorian and E harmonic minor). Without it the level shows the
   * one `mode` names.
   */
  scales?: LevelScale[];
  tempoRange: string;
  primaryVoicings: VoicingRef[];

  technique: {
    melody: TechniqueEntry;
    chords: TechniqueEntry;
    bass: TechniqueEntry;
    performance: TechniqueEntry;
  };

  entryLabel: string;
  locked: boolean;
}

/** One of a level's scales. */
export interface LevelScale {
  /** As a student reads it: 'Harmonic Minor'. */
  name: string;
  /** As the level's lesson steps name it: 'harmonic_minor'. */
  scaleId: string;
  intervals: number[];
  notes: string[];
}

export interface VoicingRef {
  label: string;
  symbol: string;
  midis: number[];
  description: string;
  /** The level's scale it comes from, when not its first: the card takes that scale's color. */
  scaleId?: string;
}

export interface TechniqueEntry {
  summary: string;
  details: string[];
}
