/**
 * useSavedLessons — a teacher's "saved" (bookmarked) lessons, as a Set of Day
 * ids. Local-first, mirroring `useLocalPlan`: one localStorage blob under
 * `ma-teacher:saved-lessons:v1`, a same-tab `<key>:changed` broadcast (the
 * native `storage` event does not fire in the writing tab) plus the cross-tab
 * `storage` event, and a `schemaVersion` guard with a `.bak` on mismatch.
 * Global to the teacher (like `listDays`), not classroom-scoped.
 */
import { useCallback, useEffect, useState } from 'react';

export const SAVED_LESSONS_KEY = 'ma-teacher:saved-lessons:v1';
export const SCHEMA_VERSION = 1;

interface SavedBlob {
  schemaVersion: number;
  ids: string[];
}

const isBrowser = typeof window !== 'undefined';

const read = (): Set<string> => {
  if (!isBrowser) return new Set();
  try {
    const raw = window.localStorage.getItem(SAVED_LESSONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SavedBlob;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${SAVED_LESSONS_KEY}.bak`, raw);
      return new Set();
    }
    return new Set(Array.isArray(parsed.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
};

const write = (ids: Set<string>): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(
      SAVED_LESSONS_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, ids: [...ids] }),
    );
    window.dispatchEvent(new Event(`${SAVED_LESSONS_KEY}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op.
  }
};

export interface UseSavedLessons {
  saved: Set<string>;
  has: (dayId: string) => boolean;
  toggle: (dayId: string) => void;
  remove: (dayId: string) => void;
}

export const useSavedLessons = (): UseSavedLessons => {
  const [saved, setSaved] = useState<Set<string>>(read);

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setSaved(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_LESSONS_KEY) onChange();
    };
    window.addEventListener(`${SAVED_LESSONS_KEY}:changed`, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(`${SAVED_LESSONS_KEY}:changed`, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Mutators re-read before writing so concurrent toggles don't clobber via a
  // stale closure (same discipline as useLocalPlan).
  const toggle = useCallback((dayId: string) => {
    const next = read();
    if (next.has(dayId)) next.delete(dayId);
    else next.add(dayId);
    write(next);
    setSaved(next);
  }, []);

  const remove = useCallback((dayId: string) => {
    const next = read();
    if (next.delete(dayId)) {
      write(next);
      setSaved(next);
    }
  }, []);

  const has = useCallback((dayId: string) => saved.has(dayId), [saved]);

  return { saved, has, toggle, remove };
};
