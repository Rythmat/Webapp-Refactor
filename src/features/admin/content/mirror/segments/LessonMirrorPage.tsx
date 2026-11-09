import { lazy, Suspense, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivitySectionId } from '@/curriculum/types/activity';

/** The editor brings the Parts editor and the Studio's roll: loaded on Edit. */
const LessonEditor = lazy(() =>
  import('../../lessons/LessonEditor').then((m) => ({
    default: m.LessonEditor,
  })),
);

const SECTIONS: readonly ActivitySectionId[] = ['A', 'B', 'C', 'D'];

/**
 * `/learn/keyboard/genre/:genre/:level` in the mirror: the app's lesson, or — with
 * `?edit=1` — the same lesson beside its editor, in place
 * (lessons/LessonEditor.tsx), as a song page opens in its editor.
 */
export const LessonMirrorPage = ({ preview }: { preview: ReactNode }) => {
  const [params] = useSearchParams();
  const { genre, level } = useParams();
  const levelNumber = Number(level);
  if (params.get('edit') !== '1' || !genre || !levelNumber)
    return <>{preview}</>;
  const asked = params.get('section') as ActivitySectionId | null;
  return (
    <Suspense
      fallback={
        <div className="flex h-full gap-2 p-2">
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-[44%]" />
        </div>
      }
    >
      <LessonEditor
        // Another lesson is another session.
        key={`${genre}:${levelNumber}`}
        genre={genre}
        level={levelNumber}
        initialSection={asked && SECTIONS.includes(asked) ? asked : 'A'}
      />
    </Suspense>
  );
};
