import { getNoteSpelling } from '@/components/learn/noteSpellingLookup';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import type { GuidedChapter } from '../types';
import { ionianGuitarChapters, type IonianKey } from './ionian';
import { POP_LEVEL_1 } from './popLevel1';

// ── The lessons that have gone guided ──────────────────────────────────────
// Each is a function of what the engine has: the routes hand it to the container.

export interface GuidedLessonContext {
  flow: ActivityFlowV2;
  /** A chord as the student has chosen to read them: Hybrid or Jazz. */
  chordName: (symbol: string) => string;
}

export const popLevel1Lesson = (): readonly GuidedChapter[] => POP_LEVEL_1;

/** A key's scale, as the lesson spells it. */
export function ionianKey(key: string): IonianKey {
  const label = formatAccidentalsForDisplay(key);
  return {
    key: label,
    notes: getNoteSpelling('ionian', label) ?? [],
    lydian: getNoteSpelling('lydian', label),
    mixolydian: getNoteSpelling('mixolydian', label),
  };
}

export function ionianGuitarLesson({
  flow,
  chordName,
}: GuidedLessonContext): readonly GuidedChapter[] {
  const steps = flow.sections.flatMap((section) => section.steps);
  return ionianGuitarChapters(ionianKey(flow.params.defaultKey.split(' ')[0]), {
    of: (code) => {
      const step = steps.find((s) => s.activity.startsWith(`${code}:`));
      const symbol =
        step?.chordSymbols?.[0] ??
        /Fret the (\S+) shape/.exec(step?.direction ?? '')?.[1];
      return symbol ? chordName(symbol) : code;
    },
  });
}

/** The first chapter not yet finished, else the first. */
export function firstOpenChapter(
  chapters: readonly GuidedChapter[],
  isDone: (id: string) => boolean,
): string | undefined {
  return (chapters.find((c) => !isDone(c.id)) ?? chapters[0])?.id;
}
