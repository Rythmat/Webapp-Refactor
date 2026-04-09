import type { GenreProfile } from '../../types/genreProfile';
import { funkProfile } from './funk';

const GENRE_PROFILES: Record<string, GenreProfile> = {
  funk: funkProfile,
};

export function getGenreProfile(slug: string): GenreProfile | null {
  return GENRE_PROFILES[slug] ?? null;
}
