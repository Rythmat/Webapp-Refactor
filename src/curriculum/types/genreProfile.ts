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

export interface VoicingRef {
  label: string;
  symbol: string;
  midis: number[];
  description: string;
}

export interface TechniqueEntry {
  summary: string;
  details: string[];
}
