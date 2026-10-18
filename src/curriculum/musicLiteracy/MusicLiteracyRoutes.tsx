import { Link, Navigate, useParams } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { useUserRole } from '@/contexts/AuthContext/hooks/useUserRole';
import {
  getLiveMusicLiteracy,
  getMusicLiteracy,
  listLiveMusicLiteracy,
  listMusicLiteracy,
} from '@/curriculum/engine/musicLiteracy/registry';
import { isConsoleRole } from '@/features/admin/consoleRoles';
import { MusicLiteracyPlayer } from './MusicLiteracyPlayer';
import { startHereRoute } from './literacyPath';

// ── Music Literacy's pages ─────────────────────────────────────────────────
// /curriculum/music-literacy        the series: straight into its one lesson,
//                                   or the list once there are more
// /curriculum/music-literacy/:id    a lesson, in the player (`?step=<tag>`
//                                   opens it on that step)
//
// Free (no RequirePremium): the series is Learn → Start Here. Students see
// published lessons only. A console role sees drafts too: they reach the app
// only through the console's mirror (/console/content/curriculum/…), where
// the Music Literacy editor's "Open in Learn" previews a lesson before it
// goes live.

function useLessons() {
  const drafts = isConsoleRole(useUserRole());
  return {
    lessons: drafts ? listMusicLiteracy() : listLiveMusicLiteracy(),
    get: (id: string) =>
      drafts ? getMusicLiteracy(id) : getLiveMusicLiteracy(id),
  };
}

const lessonRoute = (lesson: MusicLiteracyLesson) =>
  CurriculumRoutes.musicLiteracyLesson({ id: lesson.id });

export const MusicLiteracyIndexRoute = () => {
  const { lessons } = useLessons();
  if (lessons.length === 1) {
    return <Navigate replace to={lessonRoute(lessons[0])} />;
  }
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-6 pb-8 pt-6 text-[#e8e8f0]">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
        <Link to={startHereRoute()} className="hover:text-[#e8e8f0]">
          Start Here
        </Link>
      </p>
      <h1 className="text-2xl font-normal leading-8">Music Literacy</h1>
      {lessons.length === 0 ? (
        <p className="text-[15px] text-white/55">
          No lessons yet. They arrive here as they’re published.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                to={lessonRoute(lesson)}
                className="flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <span className="text-base">
                  {lesson.name}
                  {lesson.status === 'draft' && (
                    <span className="ml-2 text-xs uppercase tracking-[0.14em] text-white/45">
                      Draft
                    </span>
                  )}
                </span>
                {lesson.description && (
                  <span className="text-sm text-white/55">
                    {lesson.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const MusicLiteracyLessonRoute = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { get } = useLessons();
  const lesson = get(id);
  if (!lesson) {
    return (
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 px-6 pt-6 text-[#e8e8f0]">
        <h1 className="text-2xl font-normal leading-8">
          This Lesson Isn’t Here
        </h1>
        <p className="text-[15px] text-white/55">
          It may not be published yet.{' '}
          <Link
            to={CurriculumRoutes.musicLiteracy()}
            className="underline decoration-white/30 underline-offset-4 hover:decoration-white/70"
          >
            See the Music Literacy lessons
          </Link>
        </p>
      </div>
    );
  }
  // A new lesson starts the player afresh.
  return <MusicLiteracyPlayer key={lesson.id} lesson={lesson} />;
};
