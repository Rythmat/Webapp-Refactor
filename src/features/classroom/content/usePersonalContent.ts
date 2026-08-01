/**
 * usePersonalContent — teacher-authored content stored alongside the canonical
 * banks (`ma-teacher:{activities,clos,themes,seeds}:personal:v1`). Same
 * local-first + same-tab-broadcast idiom as useLocalPlan. The bank hooks merge
 * these in (badged `source:'personal'`), so authored items appear in every
 * picker/browser. Canonical content is never written here.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Activity, Clo, LessonSeed, Theme } from './types';

const KEYS = {
  activities: 'ma-teacher:activities:personal:v1',
  clos: 'ma-teacher:clos:personal:v1',
  themes: 'ma-teacher:themes:personal:v1',
  seeds: 'ma-teacher:seeds:personal:v1',
} as const;

const isBrowser = typeof window !== 'undefined';

// Shape guards — a hand-edited / foreign restore file can carry malformed items;
// drop anything missing the fields consumers dereference so a bad import can't
// white-screen a picker or the alignment summary.
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;
const hasLtTitle = (x: Record<string, unknown>): boolean =>
  isObj(x.title) && typeof (x.title as Record<string, unknown>).en === 'string';

const isActivity = (x: unknown): x is Activity =>
  isObj(x) && typeof x.id === 'string' && hasLtTitle(x) && Array.isArray(x.cloIds);
const isClo = (x: unknown): x is Clo =>
  isObj(x) &&
  typeof x.id === 'string' &&
  (x.type === 'learning' || x.type === 'content-language');
const isTheme = (x: unknown): x is Theme =>
  isObj(x) && typeof x.id === 'string' && hasLtTitle(x);
const isSeed = (x: unknown): x is LessonSeed =>
  isObj(x) &&
  typeof x.id === 'string' &&
  hasLtTitle(x) &&
  (x.kind === 'day' || x.kind === 'activity');

const readList = <T>(key: string, isValid: (x: unknown) => x is T): T[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
};

const writeList = <T>(key: string, items: T[]): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event(`${key}:changed`));
  } catch {
    // Quota / privacy mode — no-op.
  }
};

interface PersonalContent {
  activities: Activity[];
  clos: Clo[];
  themes: Theme[];
  seeds: LessonSeed[];
}

const readAll = (): PersonalContent => ({
  activities: readList(KEYS.activities, isActivity),
  clos: readList(KEYS.clos, isClo),
  themes: readList(KEYS.themes, isTheme),
  seeds: readList(KEYS.seeds, isSeed),
});

export interface UsePersonalContent extends PersonalContent {
  addActivity: (activity: Activity) => void;
  addClo: (clo: Clo) => void;
  addTheme: (theme: Theme) => void;
  addSeed: (seed: LessonSeed) => void;
  remove: (kind: keyof typeof KEYS, id: string) => void;
}

export const usePersonalContent = (): UsePersonalContent => {
  const [content, setContent] = useState<PersonalContent>(readAll);

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setContent(readAll());
    const changeEvents = Object.values(KEYS).map((k) => `${k}:changed`);
    changeEvents.forEach((e) => window.addEventListener(e, onChange));
    const onStorage = (e: StorageEvent) => {
      if (e.key && (Object.values(KEYS) as string[]).includes(e.key)) onChange();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      changeEvents.forEach((e) => window.removeEventListener(e, onChange));
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const addItem = useCallback(
    <T extends { id: string }>(
      key: string,
      item: T,
      isValid: (x: unknown) => x is T,
    ) => {
      const next = [
        ...readList<T>(key, isValid).filter((i) => i.id !== item.id),
        item,
      ];
      writeList(key, next);
      setContent(readAll());
    },
    [],
  );

  const addActivity = useCallback(
    (a: Activity) => addItem(KEYS.activities, a, isActivity),
    [addItem],
  );
  const addClo = useCallback(
    (c: Clo) => addItem(KEYS.clos, c, isClo),
    [addItem],
  );
  const addTheme = useCallback(
    (t: Theme) => addItem(KEYS.themes, t, isTheme),
    [addItem],
  );
  const addSeed = useCallback(
    (s: LessonSeed) => addItem(KEYS.seeds, s, isSeed),
    [addItem],
  );

  const remove = useCallback((kind: keyof typeof KEYS, id: string) => {
    const key = KEYS[kind];
    const hasId = (x: unknown): x is { id: string } =>
      isObj(x) && typeof x.id === 'string';
    writeList(
      key,
      readList<{ id: string }>(key, hasId).filter((i) => i.id !== id),
    );
    setContent(readAll());
  }, []);

  return {
    ...content,
    addActivity,
    addClo,
    addTheme,
    addSeed,
    remove,
  };
};
