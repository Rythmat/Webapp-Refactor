import { useCallback, useEffect, useState } from 'react';
import type {
  ProfileVisibility,
  UserBioPreferences,
} from '@/types/userProfile';

const STORAGE_PREFIX = 'user_bio_';

const EMPTY_BIO: UserBioPreferences = {
  instruments: [],
  genres: [],
  focus: [],
};

function loadBio(userId: string): UserBioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return EMPTY_BIO;
    return JSON.parse(raw) as UserBioPreferences;
  } catch {
    return EMPTY_BIO;
  }
}

function saveBio(userId: string, bio: UserBioPreferences) {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(bio));
  } catch {
    // localStorage may be full or unavailable — non-critical.
  }
}

/** Read any user's bio preferences from localStorage (for discovery). */
export function readBioForUser(userId: string): UserBioPreferences {
  return loadBio(userId);
}

/**
 * Hook to manage the current user's bio preferences.
 * Persists to localStorage on change (mirrors useAvatarConfig pattern).
 */
export function useUserBioPreferences(userId: string | undefined) {
  const [instruments, setInstruments] = useState<Set<string>>(new Set());
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');

  // Load on mount
  useEffect(() => {
    if (!userId) return;
    const bio = loadBio(userId);
    setInstruments(new Set(bio.instruments));
    setGenres(new Set(bio.genres));
    setFocus(new Set(bio.focus));
    setVisibility(bio.visibility ?? 'public');
  }, [userId]);

  // Persist on change
  useEffect(() => {
    if (!userId) return;
    saveBio(userId, {
      instruments: [...instruments],
      genres: [...genres],
      focus: [...focus],
      visibility,
    });
  }, [userId, instruments, genres, focus, visibility]);

  const toggleInstrument = useCallback((value: string) => {
    setInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const toggleGenre = useCallback((value: string) => {
    setGenres((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const toggleFocus = useCallback((value: string) => {
    setFocus((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const toggleVisibility = useCallback(() => {
    setVisibility((prev) => (prev === 'public' ? 'private' : 'public'));
  }, []);

  return {
    instruments,
    genres,
    focus,
    visibility,
    toggleInstrument,
    toggleGenre,
    toggleFocus,
    toggleVisibility,
  };
}
