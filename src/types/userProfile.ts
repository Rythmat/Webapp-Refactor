// ── User Profile Types for Connect / Discovery ──────────────────────────

export const ALL_INSTRUMENTS = [
  'Vocals',
  'Piano',
  'Guitar',
  'Drums',
  'Bass',
  'Strings',
  'Synth',
  'Percussion',
] as const;

export const ALL_GENRES = [
  'African',
  'Blues',
  'Electronic',
  'Folk',
  'Funk',
  'Hip-Hop',
  'Jam Band',
  'Jazz',
  'Latin',
  'Neo Soul',
  'Pop',
  'R&B',
  'Reggae',
  'Rock',
] as const;

export const ALL_FOCUS = [
  'Producing',
  'Songwriting',
  'Performing',
  'Education',
  'Audio',
] as const;

export type ProfileVisibility = 'public' | 'private';

export interface UserBioPreferences {
  instruments: string[];
  genres: string[];
  focus: string[];
  visibility?: ProfileVisibility;
}

export interface DiscoverableUser {
  id: string;
  nickname: string;
  avatarSeed: string;
  bio: UserBioPreferences;
}

export interface ConnectionMatch {
  user: DiscoverableUser;
  commonGenres: string[];
  complementarySkills: { label: string; yours: string; theirs: string }[];
  matchScore: number;
}
