/**
 * usePersonalContent — teacher-authored content stored alongside the canonical
 * banks. Storage belongs to the curriculum repository (the personal library);
 * this module is the React binding plus the shape guards. The bank hooks merge
 * these in (badged `source:'personal'`), so authored items appear in every
 * picker/browser. Canonical content is never written here.
 */
import { useCallback, useEffect, useState } from 'react';
import { localCurriculumRepository as repo } from '../persistence/localCurriculumRepository';
import type { Activity, Clo, LessonSeed, Theme } from './types';

/**
 * The four personal banks. These used to carry localStorage keys; storage now
 * belongs to the curriculum repository, so only the bank NAMES survive here.
 */
const KEYS = {
  activities: 'activities',
  clos: 'clos',
  themes: 'themes',
  seeds: 'seeds',
} as const;

// Shape guards — a hand-edited / foreign restore file can carry malformed items;
// drop anything missing the fields consumers dereference so a bad import can't
// white-screen a picker or the alignment summary.
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;
const hasLtTitle = (x: Record<string, unknown>): boolean =>
  isObj(x.title) && typeof (x.title as Record<string, unknown>).en === 'string';

const isActivity = (x: unknown): x is Activity =>
  isObj(x) &&
  typeof x.id === 'string' &&
  hasLtTitle(x) &&
  Array.isArray(x.cloIds);
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

interface PersonalContent {
  activities: Activity[];
  clos: Clo[];
  themes: Theme[];
  seeds: LessonSeed[];
}

/**
 * Read through the repository, then re-validate. The shape guards stay: a
 * hand-edited or foreign restore file can carry malformed items, and dropping
 * them here is what stops a bad import white-screening a picker.
 */
const readAll = (): PersonalContent => {
  const lib = repo.getLibrary();
  return {
    activities: (lib.activities ?? []).filter(isActivity),
    clos: (lib.clos ?? []).filter(isClo),
    themes: (lib.themes ?? []).filter(isTheme),
    seeds: (lib.seeds ?? []).filter(isSeed),
  };
};

export interface UsePersonalContent extends PersonalContent {
  addActivity: (activity: Activity) => void;
  addClo: (clo: Clo) => void;
  addTheme: (theme: Theme) => void;
  addSeed: (seed: LessonSeed) => void;
  remove: (kind: keyof typeof KEYS, id: string) => void;
}

export const usePersonalContent = (): UsePersonalContent => {
  const [content, setContent] = useState<PersonalContent>(readAll);

  // One subscription, through the repository — replaces four `<key>:changed`
  // listeners plus a `storage` handler.
  useEffect(() => repo.subscribe(() => setContent(readAll())), []);

  const addItem = useCallback(
    <T extends { id: string }>(
      kind: keyof typeof KEYS,
      item: T,
      isValid: (x: unknown) => x is T,
    ) => {
      const lib = repo.getLibrary();
      const existing = (lib[kind] as unknown[]).filter(isValid) as T[];
      repo.putLibrary({
        ...lib,
        [kind]: [...existing.filter((i) => i.id !== item.id), item],
      });
      setContent(readAll());
    },
    [],
  );

  const addActivity = useCallback(
    (a: Activity) => addItem('activities', a, isActivity),
    [addItem],
  );
  const addClo = useCallback((c: Clo) => addItem('clos', c, isClo), [addItem]);
  const addTheme = useCallback(
    (t: Theme) => addItem('themes', t, isTheme),
    [addItem],
  );
  const addSeed = useCallback(
    (s: LessonSeed) => addItem('seeds', s, isSeed),
    [addItem],
  );

  const remove = useCallback((kind: keyof typeof KEYS, id: string) => {
    const lib = repo.getLibrary();
    const items = (lib[kind] as { id: string }[]) ?? [];
    repo.putLibrary({ ...lib, [kind]: items.filter((i) => i.id !== id) });
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
