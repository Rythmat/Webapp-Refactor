/**
 * Style DNA types.
 */

export interface ArtistReference {
  name: string;
  description: string;
  tags: string[];
}

export interface VocabularyEntry {
  category: string;
  description: string;
}

export interface StyleDnaLevel {
  level: number;
  subtitle: string;
  artists: ArtistReference[];
  vocabulary: VocabularyEntry[];
}
