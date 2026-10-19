/* eslint-disable react/jsx-sort-props */
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import { blankLiteracyLesson } from '@/content/musicLiteracy/template';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { learnHrefFor, lessonIdFor, tonicLabel } from './literacyLesson';
import { useLiteracyList } from './literacySession';

/**
 * Music Literacy: every lesson in the series, drafts included, and a new
 * one started from the template (one step) under an id made from its name.
 */
export const AdminMusicLiteracyPage = () => {
  const lessons = useLiteracyList();
  const store = useInstrumentStore();
  const canSave = store.canSave('music_literacy');
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = async (rawName: string) => {
    const lesson = blankLiteracyLesson(
      lessonIdFor(rawName, lessons),
      rawName,
      Math.max(0, ...lessons.map((l) => l.part)) + 1,
    );
    setError(null);
    try {
      await store.save('music_literacy', lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    navigate(AdminRoutes.musicLiteracyLesson({ id: lesson.id }));
  };

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Music Literacy"
        description={
          <>
            The call-and-response series on scale degrees. In every step the
            teacher sings a line and plays a short figure, and the student plays
            it back. Open a lesson to change its words, notes and rhythms, or to
            add steps. Students see Live lessons only.
          </>
        }
      />

      {!canSave && (
        <ConsoleCallout tone="info">
          Lessons are saved as repo files, so creating and saving them works on
          the local dev server (npm run dev). Here you can open, play and export
          them.
        </ConsoleCallout>
      )}
      {error && (
        <ConsoleCallout tone="danger" title="Couldn’t make the lesson">
          {error}
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) void add(name.trim());
          }}
          placeholder="New lesson name, e.g. Music Literacy · Part 2"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New lesson name"
          disabled={!canSave}
        />
        <Button
          size="sm"
          onClick={() => void add(name.trim())}
          disabled={!canSave || !name.trim()}
        >
          <Plus /> New lesson
        </Button>
        <span className="text-xs text-white/40">
          Starts as a draft with one step to change.
        </span>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No lessons yet. Name one above to start.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {lessons.map((lesson, i) => (
            <div
              key={lesson.id}
              className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
            >
              <Link
                to={AdminRoutes.musicLiteracyLesson({ id: lesson.id })}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium hover:underline">
                    {lesson.name}
                  </span>
                  <ConsoleBadge
                    tone={lesson.status === 'live' ? 'success' : 'warning'}
                  >
                    {lesson.status === 'live' ? 'Live' : 'Draft'}
                  </ConsoleBadge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  Part {lesson.part} · {lesson.steps.length} step
                  {lesson.steps.length === 1 ? '' : 's'} ·{' '}
                  {tonicLabel(lesson.key.tonic)} {lesson.key.mode} ·{' '}
                  {lesson.tempo} BPM ·{' '}
                  <span className="tabular-nums">{lesson.id}</span>
                  {lesson.description && ` · ${lesson.description}`}
                </div>
              </Link>
              <Button asChild size="sm" variant="ghost">
                <Link
                  to={learnHrefFor(lesson.id)}
                  title="The student’s page, through the console"
                >
                  <ExternalLink /> Learn
                </Link>
              </Button>
              {canSave && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${lesson.name}`}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Delete "${lesson.name}"? Students lose it, and their progress on its steps.`,
                      )
                    )
                      return;
                    try {
                      await store.remove('music_literacy', lesson.id);
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : String(err),
                      );
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
