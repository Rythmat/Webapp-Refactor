import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import type {
  ProfileVisibility,
  UserBioPreferences,
} from '@/types/userProfile';

const STORAGE_PREFIX = 'user_bio_';
const SAVE_DEBOUNCE_MS = 600;

const EMPTY_BIO: UserBioPreferences = {
  instruments: [],
  genres: [],
  focus: [],
  visibility: 'public',
};

// ── localStorage mirror (instant + offline/dev fallback) ──────────────────

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

/**
 * Read any user's bio from localStorage — a dev/offline fallback for discovery
 * when the /api/bio serverless route isn't reachable (see useDiscoverUsers).
 */
export function readBioForUser(userId: string): UserBioPreferences {
  return loadBio(userId);
}

// ── Server (Upstash-backed serverless /api/bio) ───────────────────────────

async function fetchMyBio(
  token: string | null,
  userId: string,
): Promise<UserBioPreferences> {
  // No token or no serverless route (e.g. plain Vite dev) → localStorage.
  if (!token) return loadBio(userId);
  try {
    const res = await fetch('/api/bio', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`bio GET ${res.status}`);
    const bio = (await res.json()) as UserBioPreferences;
    saveBio(userId, bio); // refresh the local mirror
    return bio;
  } catch {
    return loadBio(userId);
  }
}

async function putMyBio(token: string, bio: UserBioPreferences): Promise<void> {
  await fetch('/api/bio', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bio),
  });
}

/**
 * The current user's bio preferences, backed by the `/api/bio` serverless route
 * (Upstash Redis) with a react-query cache as the single source of truth.
 *
 * Edits are applied optimistically to the `['bio', userId]` cache (instant, and
 * shared across every mounted instance) + mirrored to localStorage, then written
 * to the server on a short debounce. When the serverless route isn't reachable
 * (plain Vite dev / offline) it transparently falls back to localStorage, so the
 * hook works everywhere. This replaces the old dueling load/save effects, which
 * raced on `userId` resolving and could clobber selections.
 *
 * The return shape is unchanged (Sets + toggles) so existing callers are intact.
 */
export function useUserBioPreferences(userId: string | undefined) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const key = useMemo(() => ['bio', userId] as const, [userId]);

  const { data } = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: () => fetchMyBio(token, userId!),
    placeholderData: (prev) => prev ?? (userId ? loadBio(userId) : EMPTY_BIO),
    staleTime: 30_000,
  });

  const bio = data ?? (userId ? loadBio(userId) : EMPTY_BIO);

  // Debounced server write of the latest committed bio.
  const pendingRef = useRef<UserBioPreferences | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = pendingRef.current;
    pendingRef.current = null;
    if (!next || !token) return;
    // Non-fatal on failure: the optimistic cache + localStorage already hold it.
    void putMyBio(token, next).catch(() => {});
  }, [token]);

  const commit = useCallback(
    (next: UserBioPreferences) => {
      if (!userId) return;
      // Prevent an in-flight GET from clobbering the optimistic value.
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData(key, next);
      saveBio(userId, next);
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [queryClient, key, userId, flush],
  );

  // Flush any pending write on unmount so a quick edit + navigate still saves.
  useEffect(() => flush, [flush]);

  const current = useCallback((): UserBioPreferences => {
    if (!userId) return EMPTY_BIO;
    return queryClient.getQueryData<UserBioPreferences>(key) ?? loadBio(userId);
  }, [queryClient, key, userId]);

  const toggleField = useCallback(
    (field: 'instruments' | 'genres' | 'focus', value: string) => {
      const cur = current();
      const set = new Set(cur[field] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      commit({ ...cur, [field]: [...set] });
    },
    [current, commit],
  );

  const toggleInstrument = useCallback(
    (v: string) => toggleField('instruments', v),
    [toggleField],
  );
  const toggleGenre = useCallback(
    (v: string) => toggleField('genres', v),
    [toggleField],
  );
  const toggleFocus = useCallback(
    (v: string) => toggleField('focus', v),
    [toggleField],
  );
  const toggleVisibility = useCallback(() => {
    const cur = current();
    commit({
      ...cur,
      visibility: cur.visibility === 'private' ? 'public' : 'private',
    });
  }, [current, commit]);

  return {
    instruments: useMemo(() => new Set(bio.instruments), [bio.instruments]),
    genres: useMemo(() => new Set(bio.genres), [bio.genres]),
    focus: useMemo(() => new Set(bio.focus), [bio.focus]),
    visibility: (bio.visibility ?? 'public') as ProfileVisibility,
    toggleInstrument,
    toggleGenre,
    toggleFocus,
    toggleVisibility,
  };
}
