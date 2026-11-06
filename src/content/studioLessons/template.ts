import type { StudioLesson, StudioLessonStep } from './schemas';

/**
 * Where a new Studio lesson and a new step start: what the console's "New
 * lesson" and "Add step" make. A new lesson is a draft with one step that
 * passes when the song plays, so it opens in the Studio and runs at once.
 */

export function blankStudioStep(id: string): StudioLessonStep {
  return {
    id,
    stage: 'STAGE 1',
    instruction: 'Press **Play** to hear the song.',
    target: 'transport-play',
    check: {
      kind: 'named',
      name: 'store.value',
      params: { field: 'isPlaying', op: '=', value: 'true', changed: false },
    },
  };
}

export function blankStudioLesson(id: string, title: string): StudioLesson {
  return {
    id,
    title,
    subtitle: '',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
    status: 'draft',
    steps: [blankStudioStep('play')],
  };
}

/** A kebab-case id from a title, unique among `taken`. */
export function studioLessonId(title: string, taken: ReadonlySet<string>) {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/, '') || 'lesson';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
