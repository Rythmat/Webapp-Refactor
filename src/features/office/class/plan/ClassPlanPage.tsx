import { CalendarDays, List, Plus, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { ConfirmDialog } from '@/daw/ui/ConfirmDialog';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/daw/ui/Menu';
import { Segmented } from '@/daw/ui/Segmented';
import { Toggle } from '@/daw/ui/Toggle';
import {
  CalendarView,
  type CalendarMode,
} from '@/features/classroom/annual/CalendarView';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useGoLive } from '@/features/classroom/live/useGoLive';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { NewLessonDialog } from '@/features/classroom/plan/NewLessonDialog';
import { UnassignedDaysTray } from '@/features/classroom/plan/UnassignedDaysTray';
import { deriveLessonStatus } from '@/features/classroom/plan/lessonStatus';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { useSavedLessons } from '@/features/classroom/plan/useSavedLessons';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { usePublishedDays } from '@/features/classroom/publish/usePublishedDays';
import type { Day } from '@/features/classroom/types';
import { useCanEditClassroom } from '@/hooks/data';
import { OfficeRailSlot } from '../../frame/railSlot';
import { useOfficeInspector } from '../../frame/useOfficeInspector';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../../ui/styles';
import { ClassSettings } from '../ClassSettings';
import { LessonTable } from './LessonTable';
import { groupPlan, type PlanEntry, type StatusFilter } from './planList';

export type PlanView = 'list' | CalendarMode;

const VIEWS = [
  { value: 'list', label: 'List', icon: <List /> },
  { value: 'week', label: 'Week', icon: <CalendarDays /> },
  { value: 'month', label: 'Month', icon: <CalendarDays /> },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'live', label: 'Live' },
] as const;

export const planView = (value: string | null): PlanView =>
  value === 'week' || value === 'month' ? value : 'list';

/**
 * A class's Plan (owner, 2026-11-09): every lesson, as a list or on the
 * calendar — one page with List · Week · Month on the bottom rail, the way
 * Common Planner shows the same lessons in every view. A lesson opens in the
 * Inspector beside it; New makes a lesson or builds a live deck. `?view=`
 * keeps the view; `?new=1` opens New lesson.
 */
export const ClassPlanPage = () => {
  const { classroomId: cid = '' } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = planView(params.get('view'));
  const canEdit = useCanEditClassroom(cid);
  const { target } = useOfficeInspector();

  const { listDays, deleteDay, saveDay, listUnassignedDays, isHydrated } =
    useLocalPlan(cid);
  const { publishedDays } = usePublishedDays(cid);
  const { assignments } = useAssignments(cid);
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const { nonSchoolMap } = useAnnualPlan(cid);
  const saved = useSavedLessons();
  const goLive = useGoLive(cid);
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Day | null>(null);

  // Today, ⌘K and Overview link here with ?new=1; consume it so Back and a
  // reload don't reopen the dialog.
  useEffect(() => {
    if (params.get('new') !== '1') return;
    setNewOpen(true);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const setView = (next: PlanView) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'list') p.delete('view');
        else p.set('view', next);
        return p;
      },
      { replace: true },
    );

  const days = listDays(cid);
  const activeSession = getActiveSessionForClassroom(cid);
  const entries: PlanEntry[] = days.map((day) => ({
    day,
    ...deriveLessonStatus(day, { publishedDays, assignments, activeSession }),
  }));
  const groups = useMemo(
    () =>
      groupPlan(entries, { status, savedOnly, query }, (id) =>
        saved.saved.has(id),
      ),
    // `entries` is rebuilt each render from the stores; its inputs are below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      days,
      publishedDays,
      assignments,
      activeSession,
      status,
      savedOnly,
      query,
      saved.saved,
    ],
  );
  const selectedDayId =
    target?.kind === 'lesson' && target.classroomId === cid ? target.id : null;

  const viewSwitch = (className?: string) => (
    <Segmented
      label="Plan view"
      options={VIEWS}
      value={view}
      onValueChange={setView}
      className={className}
    />
  );

  return (
    <div className={OFFICE_PAGE}>
      <OfficeRailSlot>{viewSwitch()}</OfficeRailSlot>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>
            {days.length} {days.length === 1 ? 'lesson' : 'lessons'}
          </MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Plan</h1>
        </div>
        <div className="flex items-center gap-2">
          {viewSwitch('sm:hidden')}
          <Menu>
            <MenuTrigger asChild disabled={!canEdit}>
              <Button
                variant="primary"
                size="lg"
                title={canEdit ? undefined : 'Viewers cannot create lessons'}
              >
                <Plus aria-hidden />
                New
              </Button>
            </MenuTrigger>
            <MenuContent align="end" sideOffset={6} className="w-60">
              <MenuItem
                icon={<Plus />}
                description="A blank lesson, or one from a seed"
                onSelect={() => setNewOpen(true)}
              >
                New lesson
              </MenuItem>
              <MenuItem
                icon={<Sparkles />}
                description="Cortex builds the slides from a focus"
                onSelect={() =>
                  navigate(TeacherRoutes.deckWizard({ classroomId: cid }))
                }
              >
                Build a live deck
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      <UnassignedDaysTray
        days={listUnassignedDays()}
        classroomId={cid}
        onAdopt={saveDay}
        canEdit={canEdit}
      />

      {view !== 'list' ? (
        <CalendarView
          classroomId={cid}
          nonSchoolMap={nonSchoolMap}
          mode={view}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : !isHydrated && days.length === 0 ? (
        // Lessons live in IndexedDB, and a read before it hydrates is EMPTY:
        // "No lessons yet" there would tell a teacher their work is gone.
        <div
          className={cn(
            OFFICE_CARD,
            'p-8 text-center text-[0.875rem] text-daw-text-3',
          )}
        >
          Loading lessons…
        </div>
      ) : days.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<CalendarDays />}
            title="No lessons yet"
            description="Start a blank lesson, or have Cortex build a live deck, then give it a date to see it here and on Today."
            actions={
              canEdit && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setNewOpen(true)}
                  >
                    <Plus aria-hidden />
                    New lesson
                  </Button>
                  <Button
                    size="lg"
                    onClick={() =>
                      navigate(TeacherRoutes.deckWizard({ classroomId: cid }))
                    }
                  >
                    <Sparkles aria-hidden />
                    Build a live deck
                  </Button>
                </>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<StatusFilter>
              label="Show lessons"
              options={STATUS_OPTIONS}
              value={status}
              onValueChange={setStatus}
            />
            <Toggle
              label="Saved only"
              pressed={savedOnly}
              onPressedChange={setSavedOnly}
            >
              Saved
            </Toggle>
            <label className="relative ml-auto flex h-8 w-full items-center sm:w-64">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 size-4 text-daw-text-3"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons"
                aria-label="Search lessons"
                className="h-8 w-full rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-8 text-[0.8125rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/25 focus:outline-none"
              />
              {query && (
                <IconButton
                  label="Clear search"
                  icon={<X />}
                  size="sm"
                  className="absolute right-1"
                  onClick={() => setQuery('')}
                />
              )}
            </label>
          </div>

          {groups.length === 0 ? (
            <p
              className={cn(
                OFFICE_CARD,
                'px-6 py-10 text-center text-[0.875rem] text-daw-text-3',
              )}
            >
              No lessons match. Clear the filters to see them all.
            </p>
          ) : (
            <LessonTable
              classroomId={cid}
              groups={groups}
              selectedDayId={selectedDayId}
              canEdit={canEdit}
              isSaved={(id) => saved.saved.has(id)}
              onToggleSaved={saved.toggle}
              onGoLive={(day) => void goLive(day)}
              onDelete={setToDelete}
              countryFeatures={countryFeatures}
              songsReady={songsReady}
            />
          )}
        </>
      )}

      <NewLessonDialog
        classroomId={cid}
        isOpen={newOpen}
        onOpenChange={setNewOpen}
      />
      <ClassSettings
        classroomId={cid}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={`Delete “${toDelete?.label ?? ''}”?`}
        description="Its slides and notes go with it. This can't be undone."
        confirmLabel="Delete lesson"
        danger
        onConfirm={() => {
          if (!toDelete) return;
          deleteDay(toDelete.id);
          saved.remove(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
};
