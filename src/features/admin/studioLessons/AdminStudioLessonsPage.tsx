/* eslint-disable react/jsx-sort-props */
import { Eye, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import {
  blankStudioLesson,
  studioLessonId,
} from '@/content/studioLessons/template';
import {
  listStudioLessonFiles,
  useStudioLessonsVersion,
} from '@/curriculum/engine/studioLessons/registry';
import {
  TUTORIAL_CATALOG,
  TUTORIAL_COURSES,
  type TutorialCatalogEntry,
} from '@/daw/components/Tutorial/tutorialCatalog';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL } from '../ui/styles';
import { previewHref } from './studioLessonLinks';

/**
 * Studio lessons: every Production lesson, the code's and the console's, and
 * a new one started from the template under an id made from its title. A
 * code lesson opens in the editor as it ships; saving it makes the console's
 * copy, which replaces it, and Revert removes that copy again.
 */

type Source = 'code' | 'edited' | 'new';

interface Row {
  id: string;
  title: string;
  subtitle: string;
  source: Source;
  /** A console file's status; a code lesson is live. */
  status: 'draft' | 'live';
  steps: number | null;
  course?: string;
}

const SOURCE_BADGE: Record<Source, { label: string; title: string }> = {
  code: {
    label: 'Code',
    title:
      'Ships in the code. Saving it makes a console copy that replaces it.',
  },
  edited: {
    label: 'Edited',
    title: 'A code lesson, replaced by its console copy.',
  },
  new: { label: 'Console', title: 'Written in the console.' },
};

export const AdminStudioLessonsPage = () => {
  useStudioLessonsVersion();
  const files = listStudioLessonFiles();
  const store = useInstrumentStore();
  const canSave = store.canSave('studio_lesson');
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(files.map((f) => [f.id, f]));
    const fromCode = (TUTORIAL_CATALOG as readonly TutorialCatalogEntry[]).map(
      (entry): Row => {
        const file = byId.get(entry.id);
        return file
          ? {
              id: file.id,
              title: file.title,
              subtitle: file.subtitle,
              source: 'edited',
              status: file.status,
              steps: file.steps.length,
              course: file.course,
            }
          : {
              id: entry.id,
              title: entry.title,
              subtitle: entry.subtitle,
              source: 'code',
              status: 'live',
              steps: null,
              course: entry.course,
            };
      },
    );
    const added = files
      .filter((f) => !fromCode.some((r) => r.id === f.id))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(
        (f): Row => ({
          id: f.id,
          title: f.title,
          subtitle: f.subtitle,
          source: 'new',
          status: f.status,
          steps: f.steps.length,
          course: f.course,
        }),
      );
    return [...fromCode, ...added];
  }, [files]);

  const add = async (rawTitle: string) => {
    const lesson = blankStudioLesson(
      studioLessonId(rawTitle, new Set(rows.map((r) => r.id))),
      rawTitle,
    );
    setError(null);
    try {
      await store.save('studio_lesson', lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    navigate(AdminRoutes.studioLesson({ id: lesson.id }));
  };

  const remove = async (row: Row) => {
    const question =
      row.source === 'edited'
        ? `Revert "${row.title}" to the lesson in the code? The console's changes to it are lost.`
        : `Delete "${row.title}"? Students lose it.`;
    if (!window.confirm(question)) return;
    try {
      await store.remove('studio_lesson', row.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const groups = [
    ...TUTORIAL_COURSES.map((course) => ({
      title: course.title,
      rows: rows.filter((r) => r.course === course.id),
    })),
    { title: 'Lessons', rows: rows.filter((r) => !r.course) },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Studio Lessons"
        description={
          <>
            The Studio’s Production lessons. Each step spotlights a part of the
            Studio and passes when the student does what it asks. Open a lesson
            to change its steps, or start a new one. Students see Live lessons
            only; Preview runs one in the Studio, drafts included.
          </>
        }
      />

      {!canSave && (
        <ConsoleCallout tone="info">
          Lessons are saved as repo files, so creating and saving them works on
          the local dev server (npm run dev). Here you can open and export them.
        </ConsoleCallout>
      )}
      {error && (
        <ConsoleCallout tone="danger" title="Couldn’t Save">
          {error}
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) void add(title.trim());
          }}
          placeholder="New lesson title, e.g. Funk — Lock the groove"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New lesson title"
          disabled={!canSave}
        />
        <Button
          size="sm"
          onClick={() => void add(title.trim())}
          disabled={!canSave || !title.trim()}
        >
          <Plus /> New lesson
        </Button>
        <span className="text-xs text-white/40">
          Starts as a draft with one step to change.
        </span>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h2 className={CONSOLE_LABEL}>{group.title}</h2>
          <div className="overflow-hidden rounded-lg border border-white/[0.08]">
            {group.rows.map((row, i) => (
              <div
                key={row.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <Link
                  to={AdminRoutes.studioLesson({ id: row.id })}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline">
                      {row.title}
                    </span>
                    <ConsoleBadge
                      tone={row.source === 'code' ? 'neutral' : 'info'}
                      title={SOURCE_BADGE[row.source].title}
                    >
                      {SOURCE_BADGE[row.source].label}
                    </ConsoleBadge>
                    <ConsoleBadge
                      tone={row.status === 'live' ? 'success' : 'warning'}
                    >
                      {row.status === 'live' ? 'Live' : 'Draft'}
                    </ConsoleBadge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.steps !== null &&
                      `${row.steps} step${row.steps === 1 ? '' : 's'} · `}
                    <span className="tabular-nums">{row.id}</span>
                    {row.subtitle && ` · ${row.subtitle}`}
                  </div>
                </Link>
                <Button asChild size="sm" variant="ghost">
                  <Link
                    to={previewHref(row.id)}
                    title="Run it in the Studio, as last saved"
                  >
                    <Eye /> Preview
                  </Link>
                </Button>
                {canSave && row.source !== 'code' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={
                      row.source === 'edited'
                        ? `Revert ${row.title} to the code`
                        : `Delete ${row.title}`
                    }
                    title={
                      row.source === 'edited' ? 'Revert to the code' : 'Delete'
                    }
                    onClick={() => void remove(row)}
                  >
                    {row.source === 'edited' ? <RotateCcw /> : <Trash2 />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
