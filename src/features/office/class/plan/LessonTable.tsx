import type { Feature } from 'geojson';
import {
  BarChart3,
  Bookmark,
  Eye,
  MoreHorizontal,
  Pencil,
  Play,
  Radio,
  Trash2,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { LessonThumb } from '@/features/classroom/plan/LessonThumb';
import { StatusChip } from '@/features/classroom/plan/lessonStatus';
import type { Day } from '@/features/classroom/types';
import { withInspect } from '../../frame/useOfficeInspector';
import { OFFICE_CARD } from '../../ui/styles';
import { shortDate, type PlanEntry, type PlanGroup } from './planList';

const ROW_GRID =
  'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem_9.5rem_auto]';

/**
 * Plan's list: one dense row per lesson, grouped by month — its picture,
 * name, date and state, and its verbs at the end (save, Go Live, and the
 * rest under ⋯). The row itself opens the lesson in the Inspector; the
 * open one stays lit.
 */
export const LessonTable = ({
  classroomId,
  groups,
  selectedDayId,
  canEdit,
  isSaved,
  onToggleSaved,
  onGoLive,
  onDelete,
  countryFeatures,
  songsReady,
}: {
  classroomId: string;
  groups: PlanGroup[];
  selectedDayId: string | null;
  canEdit: boolean;
  isSaved: (dayId: string) => boolean;
  onToggleSaved: (dayId: string) => void;
  onGoLive: (day: Day) => void;
  onDelete: (day: Day) => void;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
}) => {
  const { pathname, search } = useLocation();
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section
          key={group.id}
          aria-label={group.title}
          className={cn(OFFICE_CARD, 'p-2')}
        >
          <header className="flex items-baseline gap-2 px-3 pb-2 pt-2">
            <h2 className="text-[1rem] font-semibold text-daw-text">
              {group.title}
            </h2>
            <span className="text-[0.8125rem] tabular-nums text-daw-text-3">
              {group.entries.length}
            </span>
          </header>
          <div
            role="row"
            aria-hidden
            className={cn(ROW_GRID, 'px-3 pb-1 max-md:hidden')}
          >
            <span />
            <MicroLabel>Lesson</MicroLabel>
            <MicroLabel>Date</MicroLabel>
            <MicroLabel>State</MicroLabel>
            <span className="w-[7.5rem]" />
          </div>
          <ul className="flex flex-col">
            {group.entries.map((entry) => (
              <LessonRow
                key={entry.day.id}
                entry={entry}
                classroomId={classroomId}
                to={`${pathname}${withInspect(search, {
                  kind: 'lesson',
                  classroomId,
                  id: entry.day.id,
                })}`}
                selected={entry.day.id === selectedDayId}
                canEdit={canEdit}
                saved={isSaved(entry.day.id)}
                onToggleSaved={() => onToggleSaved(entry.day.id)}
                onGoLive={() => onGoLive(entry.day)}
                onDelete={() => onDelete(entry.day)}
                countryFeatures={countryFeatures}
                songsReady={songsReady}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

const LessonRow = ({
  entry,
  classroomId,
  to,
  selected,
  canEdit,
  saved,
  onToggleSaved,
  onGoLive,
  onDelete,
  countryFeatures,
  songsReady,
}: {
  entry: PlanEntry;
  classroomId: string;
  to: string;
  selected: boolean;
  canEdit: boolean;
  saved: boolean;
  onToggleSaved: () => void;
  onGoLive: () => void;
  onDelete: () => void;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
}) => {
  const navigate = useNavigate();
  const { day, status, assignment } = entry;
  const dayId = day.id;
  const date = day.scheduledDate ? shortDate(day.scheduledDate) : 'No date';
  return (
    <li
      className={cn(
        ROW_GRID,
        'relative rounded-xl px-3 py-2',
        TRANSITION,
        selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]',
      )}
    >
      <div className="w-11">
        <LessonThumb
          day={day}
          countryFeatures={countryFeatures}
          songsReady={songsReady}
        />
      </div>
      <Link
        to={to}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'min-w-0 rounded-md after:absolute after:inset-0 after:content-[""]',
          FOCUS_RING,
        )}
      >
        <span className="block truncate text-[0.9375rem] font-medium text-daw-text">
          {day.label || 'Untitled lesson'}
        </span>
        <span className="block truncate text-[0.8125rem] text-daw-text-3 md:hidden">
          {date}
        </span>
      </Link>
      <span className="text-[0.8125rem] tabular-nums text-daw-text-2 max-md:hidden">
        {date}
      </span>
      <span className="max-md:hidden">
        <StatusChip status={status} dueAt={assignment?.dueAt} />
      </span>
      {/* Above the row's link, so the controls stay clickable. */}
      <div className="relative z-10 flex items-center justify-end gap-0.5 md:w-[7.5rem]">
        <IconButton
          className="max-sm:hidden"
          label={saved ? 'Unsave' : 'Save'}
          icon={<Bookmark fill={saved ? 'currentColor' : 'none'} />}
          aria-pressed={saved}
          onClick={onToggleSaved}
        />
        <IconButton
          className="max-sm:hidden"
          label={canEdit ? 'Go Live' : 'Viewers cannot start a live session'}
          icon={<Radio />}
          disabled={!canEdit}
          onClick={onGoLive}
        />
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={`${day.label}: more`}
              icon={<MoreHorizontal />}
            />
          </MenuTrigger>
          <MenuContent align="end" sideOffset={6} className="w-52">
            {/* A phone has no room for these beside the name. */}
            <MenuItem
              className="sm:hidden"
              icon={<Radio />}
              disabled={!canEdit}
              onSelect={onGoLive}
            >
              Go Live
            </MenuItem>
            <MenuItem
              className="sm:hidden"
              icon={<Bookmark />}
              onSelect={onToggleSaved}
            >
              {saved ? 'Unsave' : 'Save'}
            </MenuItem>
            <MenuItem
              icon={<Eye />}
              onSelect={() =>
                navigate(TeacherRoutes.dayPreview({ classroomId, dayId }))
              }
            >
              Preview as a student
            </MenuItem>
            <MenuItem
              icon={<Play />}
              onSelect={() =>
                navigate(TeacherRoutes.present({ classroomId, dayId }))
              }
            >
              Present
            </MenuItem>
            <MenuItem
              icon={<Pencil />}
              onSelect={() =>
                navigate(TeacherRoutes.dayEditor({ classroomId, dayId }))
              }
            >
              Edit slides
            </MenuItem>
            {assignment && (
              <MenuItem
                icon={<BarChart3 />}
                onSelect={() =>
                  navigate(
                    TeacherRoutes.assignmentProgress({
                      classroomId,
                      assignmentId: assignment.id,
                    }),
                  )
                }
              >
                Assignment progress
              </MenuItem>
            )}
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 />}
              danger
              disabled={!canEdit}
              onSelect={onDelete}
            >
              Delete lesson
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </li>
  );
};
