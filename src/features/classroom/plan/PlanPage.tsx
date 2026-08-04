import {
  Bookmark,
  BookOpen,
  Play,
  PlusCircle,
  Radio,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  FilterDropdown,
  type FilterOption,
} from '@/components/songLibrary/FilterDropdown';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { TeacherRoutes } from '@/constants/routes';
import { useAnnualPlan } from '../annual/useAnnualPlan';
import { useAssignments } from '../assignments/useAssignments';
import { useThemeBank } from '../content/hooks';
import { topicOf, type ThemeTopic } from '../content/themeTopic';
import { useLocalSessionStore } from '../live/useLocalSessionStore';
import { useStartClassroomSession } from '../live/useStartClassroomSession';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Day, Unit } from '../types';
import { NewLessonDialog } from './NewLessonDialog';
import { useEnsureLessonUnits } from './useEnsureLessonUnits';
import { useLocalPlan } from './useLocalPlan';
import { useSavedLessons } from './useSavedLessons';

/** A lesson's single derived state, shared by the status chip and the filter. */
type LessonStatus = 'draft' | 'published' | 'assigned' | 'live';

type SavedFilter = 'all' | 'saved' | 'unsaved';

const STATUS_OPTIONS: FilterOption<LessonStatus | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'live', label: 'Live now' },
];

const TOPIC_OPTIONS: FilterOption<ThemeTopic | 'all'>[] = [
  { value: 'all', label: 'All topics' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'genre', label: 'Genre' },
  { value: 'location', label: 'Location' },
];

const SAVED_OPTIONS: FilterOption<SavedFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved only' },
  { value: 'unsaved', label: 'Unsaved only' },
];

const NO_UNIT_ID = '__no-unit';

/** A day paired with the assignment (for the Progress link + due date) and its
 *  derived status, so grouping/filtering/rendering share one computation. */
interface LessonEntry {
  day: Day;
  assignment: { id: string; dueAt?: string | null } | undefined;
  status: LessonStatus;
}

interface LessonSection {
  id: string;
  /** Unit title; null renders an unheaded section (no annual plan). */
  title: string | null;
  items: LessonEntry[];
}

/**
 * Lessons — the merged lesson-plan list for a classroom (the workspace "Lessons"
 * tab). Lists the teacher's authored Days grouped by their curriculum Unit (with
 * the Unit title as each section header), filterable by Status / Topic
 * (Seasonal · Genre · Location) / Saved plus a search box — reusing the Learn
 * page's `FilterDropdown` + `SearchInput`. Lessons can be bookmarked from the
 * card (`useSavedLessons`). Editing + assigning happen in the lesson editor.
 */
export const PlanPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { listDays, deleteDay } = useLocalPlan();
  const cid = classroomId ?? '';
  const { publishedDays, publishDayToClassroom } = usePublishedDays(cid);
  const { assignments } = useAssignments(cid);
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const startClassroomSession = useStartClassroomSession();
  const { plan } = useAnnualPlan(cid);
  const { byId } = useThemeBank();
  const {
    saved: savedSet,
    toggle: toggleSaved,
    remove: removeSaved,
  } = useSavedLessons();

  // Guarantee the canonical Units exist + adopt any orphan Lessons into a Unit.
  useEnsureLessonUnits(cid);

  const [status, setStatus] = useState<LessonStatus | 'all'>('all');
  const [topic, setTopic] = useState<ThemeTopic | 'all'>('all');
  const [saved, setSaved] = useState<SavedFilter>('all');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  // The Overview "Create" tile links here with ?new=1 to open the New Lesson
  // dialog; consume the param so a refresh/back doesn't re-open it.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const days = listDays();
  const activeSession = getActiveSessionForClassroom(cid);

  // Resolve a Day's published record → open assignment → live state into a
  // single entry, so the chip, the filter, and the Progress link all agree.
  const entryFor = (day: Day): LessonEntry => {
    const pd = publishedDays.find((p) => p.sourceRef === day.id);
    const assignment = pd
      ? assignments.find(
          (a) => a.publishedDayId === pd.id && a.status === 'open',
        )
      : undefined;
    const status: LessonStatus =
      pd && activeSession && activeSession.publishedDayId === pd.id
        ? 'live'
        : assignment
          ? 'assigned'
          : pd
            ? 'published'
            : 'draft';
    return { day, assignment, status };
  };

  const handleDelete = (dayId: string, dayLabel: string) => {
    if (window.confirm(`Delete “${dayLabel}”? This cannot be undone.`)) {
      deleteDay(dayId);
      removeSaved(dayId);
    }
  };

  const handleStartSession = async (day: Day) => {
    try {
      const existing = publishedDays.find((pd) => pd.sourceRef === day.id);
      const pd =
        existing ?? (await publishDayToClassroom({ classroomId: cid, day }));
      const started = await startClassroomSession({
        classroomId: cid,
        publishedDayId: pd.id,
      });
      navigate(
        TeacherRoutes.session({
          classroomId: cid,
          sessionId: started.sessionId,
        }),
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Start session failed');
    }
  };

  // Units for this classroom, autumn→spring (already chronological / monthIndex).
  const allUnits = useMemo<Unit[]>(
    () =>
      plan
        ? [...plan.year.semesters.autumn, ...plan.year.semesters.spring]
        : [],
    [plan],
  );
  // Reverse-lookup: dayId → owning unit id (see CalendarView).
  const unitByDayId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUnits)
      for (const id of u.dayIds ?? []) map.set(id, u.id);
    return map;
  }, [allUnits]);
  const unitTitle = (u: Unit): string =>
    byId(u.theme?.themeId ?? '')?.title.en ?? u.label;
  // dayId → its unit's theme topic (seasonal / genre / location), for the Topic
  // filter. Days with no unit or a non-canonical theme have no topic.
  const topicByDayId = useMemo(() => {
    const map = new Map<string, ThemeTopic>();
    for (const u of allUnits) {
      const t = topicOf(u.theme?.themeId);
      if (!t) continue;
      for (const id of u.dayIds ?? []) map.set(id, t);
    }
    return map;
  }, [allUnits]);

  // Derive status once per day, then apply every active filter (AND).
  const query = search.trim().toLowerCase();
  const visible: LessonEntry[] = days.map(entryFor).filter((entry) => {
    const isSavedItem = savedSet.has(entry.day.id);
    const matchesStatus = status === 'all' || entry.status === status;
    const matchesTopic =
      topic === 'all' || topicByDayId.get(entry.day.id) === topic;
    const matchesSaved =
      saved === 'all' || (saved === 'saved' ? isSavedItem : !isSavedItem);
    const matchesSearch =
      !query || entry.day.label.toLowerCase().includes(query);
    return matchesStatus && matchesTopic && matchesSaved && matchesSearch;
  });

  // Group into Unit sections (+ a "No unit" bucket). With no annual plan, fall
  // back to a single unheaded section so the flat list doesn't regress.
  const sections: LessonSection[] = [];
  if (allUnits.length === 0) {
    sections.push({ id: '__all', title: null, items: visible });
  } else {
    for (const u of allUnits) {
      const items = visible.filter((e) => unitByDayId.get(e.day.id) === u.id);
      if (items.length) sections.push({ id: u.id, title: unitTitle(u), items });
    }
    const noUnit = visible.filter((e) => !unitByDayId.has(e.day.id));
    if (noUnit.length)
      sections.push({ id: NO_UNIT_ID, title: 'No unit', items: noUnit });
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          <BookOpen className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h1 className="text-xl font-medium text-white md:text-2xl">
            Lessons
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <PlusCircle className="h-4 w-4" />
          New Lesson
        </button>
      </header>

      {days.length === 0 ? (
        <EmptyState onNew={() => setNewOpen(true)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterDropdown
              label="Status"
              ariaLabel="Filter lessons by status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
            <FilterDropdown
              label="Topic"
              ariaLabel="Filter lessons by topic"
              value={topic}
              options={TOPIC_OPTIONS}
              onChange={setTopic}
            />
            <FilterDropdown
              label="Saved"
              ariaLabel="Filter lessons by saved"
              value={saved}
              options={SAVED_OPTIONS}
              onChange={setSaved}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search lessons"
            />
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
              <p className="text-base text-white/60">
                No lessons match this filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {sections.map((section) => (
                <section key={section.id} className="flex flex-col gap-4">
                  {section.title && (
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-medium text-white">
                        {section.title}
                      </h2>
                      <span className="text-xs text-white/40">
                        {section.items.length} lesson
                        {section.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((entry) => (
                      <LessonCard
                        key={entry.day.id}
                        day={entry.day}
                        cid={cid}
                        assignment={entry.assignment}
                        status={entry.status}
                        saved={savedSet.has(entry.day.id)}
                        onToggleSaved={() => toggleSaved(entry.day.id)}
                        onDelete={handleDelete}
                        onStartSession={handleStartSession}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <NewLessonDialog
        classroomId={cid}
        isOpen={newOpen}
        onOpenChange={setNewOpen}
      />
    </div>
  );
};

interface LessonCardProps {
  day: Day;
  cid: string;
  assignment: { id: string; dueAt?: string | null } | undefined;
  status: LessonStatus;
  saved: boolean;
  onToggleSaved: () => void;
  onDelete: (dayId: string, dayLabel: string) => void;
  onStartSession: (day: Day) => void;
}

const LessonCard = ({
  day,
  cid,
  assignment,
  status,
  saved,
  onToggleSaved,
  onDelete,
  onStartSession,
}: LessonCardProps) => (
  <li className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
    <div className="flex items-start justify-between gap-2">
      <Link
        to={TeacherRoutes.dayEditor({ classroomId: cid, dayId: day.id })}
        className="text-lg font-medium text-white hover:underline"
      >
        {day.label}
      </Link>
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleSaved}
          aria-label={saved ? `Unsave ${day.label}` : `Save ${day.label}`}
          aria-pressed={saved}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.04] ${
            saved ? 'text-amber-300' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Bookmark
            className="h-4 w-4"
            fill={saved ? 'currentColor' : 'none'}
          />
        </button>
        <button
          type="button"
          onClick={() => onDelete(day.id, day.label)}
          aria-label={`Delete ${day.label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <StatusChip status={status} dueAt={assignment?.dueAt} />
      <span className="text-xs text-white/40">
        {countFilledPhases(day)} of 5 phases
      </span>
    </div>

    <div className="mt-auto flex flex-wrap gap-2">
      <Link
        to={TeacherRoutes.present({ classroomId: cid, dayId: day.id })}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
      >
        <Play className="h-4 w-4" />
        Preview
      </Link>
      <Link
        to={TeacherRoutes.dayEditor({ classroomId: cid, dayId: day.id })}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        Edit
      </Link>
      {assignment && (
        <Link
          to={TeacherRoutes.assignmentProgress({
            classroomId: cid,
            assignmentId: assignment.id,
          })}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          Progress
        </Link>
      )}
      <button
        type="button"
        onClick={() => onStartSession(day)}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.06] px-4 py-2 text-sm text-emerald-200 transition-colors hover:border-emerald-400 hover:text-emerald-100"
      >
        <Radio className="h-4 w-4" />
        Present
      </button>
    </div>
  </li>
);

const formatDue = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

interface StatusChipProps {
  status: LessonStatus;
  dueAt?: string | null;
}

const StatusChip = ({ status, dueAt }: StatusChipProps) => {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Live now
      </span>
    );
  }
  if (status === 'assigned') {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-emerald-200">
        Assigned
        {dueAt ? ` · due ${formatDue(dueAt)}` : ''}
      </span>
    );
  }
  if (status === 'published') {
    return (
      <span className="rounded-full border border-sky-400/30 bg-sky-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-sky-200">
        Published
      </span>
    );
  }
  return (
    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/50">
      Draft
    </span>
  );
};

interface EmptyStateProps {
  onNew: () => void;
}

const EmptyState = ({ onNew }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <BookOpen className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No lessons yet</h2>
    <p className="max-w-md text-base text-white/60">
      Create your first lesson and drop in the five phases — Connect, Practice,
      Create, Share, Reflect — then present it, assign it, or go live.
    </p>
    <button
      type="button"
      onClick={onNew}
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      New Lesson
    </button>
  </div>
);

const countFilledPhases = (day: Day): number => {
  let filled = 0;
  for (const cell of Object.values(day.cells)) {
    if (
      cell.presentation.title.en.trim() ||
      cell.presentation.prompt.en.trim()
    ) {
      filled += 1;
    }
  }
  return filled;
};
